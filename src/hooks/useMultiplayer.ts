import { useEffect, useReducer, useRef, useState } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { Card, CardColor, GameState } from '../types/game';
import type { PlayerConfig } from '../game/gameEngine';
import {
  initGame,
  playCard,
  drawCard,
  passTurn,
  callUno,
  chooseColor,
} from '../game/gameEngine';
import type {
  MultiplayerStatus,
  LobbyPlayer,
  MultiplayerGameState,
  GuestToHostMessage,
  HostToGuestMessage,
  OpponentView,
} from '../types/multiplayer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PEER_ID_PREFIX = 'uno-room-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 confusion

function generateCode(): string {
  return Array.from(
    { length: 4 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
}

function peerIdFromCode(code: string): string {
  return PEER_ID_PREFIX + code.toUpperCase();
}

function normalizeForPlayer(
  state: GameState,
  playerId: string,
  disconnectedIds: Set<string>,
): MultiplayerGameState {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) throw new Error(`Player ${playerId} not found in state`);

  const opponents: OpponentView[] = state.players
    .filter((p) => p.id !== playerId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      handSize: p.hand.length,
      hasCalledUno: p.hasCalledUno,
      isConnected: !disconnectedIds.has(p.id),
    }));

  const currentPlayer = state.players[state.currentPlayerIndex];

  return {
    myId: playerId,
    myName: me.name,
    myHand: me.hand,
    myHasCalledUno: me.hasCalledUno,
    opponents,
    currentPlayerId: currentPlayer.id,
    discardPile: state.discardPile,
    currentColor: state.currentColor,
    phase: state.phase,
    direction: state.direction,
    winner: state.winner ? { id: state.winner.id, name: state.winner.name } : null,
    drawnCard: state.drawnCard,
    log: state.log,
    drawPileSize: state.drawPile.length,
    playerOrder: state.players.map((p) => p.id),
  };
}

// ---------------------------------------------------------------------------
// Host-side game reducer (same actions as single-player)
// ---------------------------------------------------------------------------

type HostAction =
  | { type: 'INIT'; configs: PlayerConfig[] }
  | { type: 'PLAY_CARD'; card: Card }
  | { type: 'DRAW_CARD' }
  | { type: 'PASS' }
  | { type: 'CALL_UNO'; playerId: string }
  | { type: 'CHOOSE_COLOR'; color: CardColor };

function hostReducer(state: GameState | null, action: HostAction): GameState | null {
  if (action.type === 'INIT') return initGame(action.configs);
  if (!state) return null;
  switch (action.type) {
    case 'PLAY_CARD':    return playCard(state, action.card);
    case 'DRAW_CARD':    return drawCard(state);
    case 'PASS':         return passTurn(state);
    case 'CALL_UNO':     return callUno(state, action.playerId);
    case 'CHOOSE_COLOR': return chooseColor(state, action.color);
    default:             return state;
  }
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseMultiplayerResult {
  // Setup
  createRoom: (hostName: string) => void;
  joinRoom: (code: string, name: string) => void;
  startGame: () => void;
  leaveRoom: () => void;

  // In-game actions (work for both host and guest)
  sendPlayCard: (card: Card) => void;
  sendDrawCard: () => void;
  sendPassTurn: () => void;
  sendCallUno: () => void;
  sendChooseColor: (color: CardColor) => void;

  // State
  status: MultiplayerStatus;
  roomCode: string | null;
  lobbyPlayers: LobbyPlayer[];
  gameState: MultiplayerGameState | null;
  myPlayerId: string | null;
  isHost: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMultiplayer(): UseMultiplayerResult {
  const [status, setStatus] = useState<MultiplayerStatus>('idle');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  // Incremented on each disconnect so the auto-handle effect re-fires even if hostState hasn't changed
  const [disconnectedCount, setDisconnectedCount] = useState(0);

  // Host-only: full game state managed by useReducer
  const [hostState, dispatchHost] = useReducer(hostReducer, null);

  // Stable refs so event handler callbacks don't go stale
  const peerRef = useRef<Peer | null>(null);
  const hostConnRef = useRef<DataConnection | null>(null); // guest → host connection
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map()); // host: peerId → conn
  const peerToPlayerRef = useRef<Map<string, string>>(new Map()); // host: peerId → playerId
  const disconnectedRef = useRef<Set<string>>(new Set());
  const myPlayerIdRef = useRef<string | null>(null);
  const lobbyRef = useRef<LobbyPlayer[]>([]);
  const isHostRef = useRef(false);

  // Keep refs in sync with state for use inside PeerJS event handler callbacks
  useEffect(() => { lobbyRef.current = lobbyPlayers; }, [lobbyPlayers]);
  useEffect(() => { myPlayerIdRef.current = myPlayerId; }, [myPlayerId]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // ── Cleanup ──────────────────────────────────────────────────────────────

  function cleanup() {
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
    hostConnRef.current = null;
    connectionsRef.current.clear();
    peerToPlayerRef.current.clear();
    disconnectedRef.current.clear();
    setStatus('idle');
    setRoomCode(null);
    setLobbyPlayers([]);
    setMyPlayerId(null);
    setIsHost(false);
    setError(null);
    setGameState(null);
  }

  // ── Host: broadcast helpers ───────────────────────────────────────────────

  function broadcastLobby(players: LobbyPlayer[]) {
    const msg: HostToGuestMessage = { type: 'LOBBY_UPDATE', players };
    for (const conn of connectionsRef.current.values()) conn.send(msg);
  }

  // ── Host: react to game state changes and broadcast ───────────────────────

  useEffect(() => {
    if (!isHostRef.current || !hostState) return;
    // Send each peer their personalised filtered view
    for (const [peerId, conn] of connectionsRef.current) {
      const pid = peerToPlayerRef.current.get(peerId);
      if (pid) {
        conn.send({
          type: 'STATE_UPDATE',
          state: normalizeForPlayer(hostState, pid, disconnectedRef.current),
        } as HostToGuestMessage);
      }
    }
    // Update the host's own local view
    const myId = myPlayerIdRef.current;
    if (myId) setGameState(normalizeForPlayer(hostState, myId, disconnectedRef.current));
  }, [hostState]);

  // ── Host: auto-handle disconnected players' turns ─────────────────────────

  useEffect(() => {
    if (!isHost || !hostState || hostState.phase === 'game-over') return;
    const current = hostState.players[hostState.currentPlayerIndex];
    if (!disconnectedRef.current.has(current.id)) return;

    const timer = setTimeout(() => {
      if (hostState.phase === 'choosing-color') {
        dispatchHost({ type: 'CHOOSE_COLOR', color: 'red' });
      } else if (hostState.phase === 'drawn-card') {
        dispatchHost({ type: 'PASS' });
      } else {
        dispatchHost({ type: 'DRAW_CARD' });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isHost, hostState, disconnectedCount]);

  // ── Host: 60-second turn timer ────────────────────────────────────────────

  useEffect(() => {
    if (!isHost || !hostState || hostState.phase === 'game-over') return;

    const timer = setTimeout(() => {
      if (hostState.phase === 'choosing-color') {
        dispatchHost({ type: 'CHOOSE_COLOR', color: 'red' });
      } else if (hostState.phase === 'drawn-card') {
        dispatchHost({ type: 'PASS' });
      } else {
        dispatchHost({ type: 'DRAW_CARD' });
      }
    }, 60_000);

    return () => clearTimeout(timer);
  }, [isHost, hostState]);

  // ── Host: handle an incoming guest message ────────────────────────────────

  function handleGuestDisconnect(peerId: string) {
    const playerId = peerToPlayerRef.current.get(peerId);
    if (!playerId) return;
    disconnectedRef.current.add(playerId);
    connectionsRef.current.delete(peerId);
    setDisconnectedCount((c) => c + 1);
    setLobbyPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, isConnected: false } : p)),
    );
  }

  function handleGuestMessage(peerId: string, data: GuestToHostMessage) {
    const playerId = peerToPlayerRef.current.get(peerId);

    switch (data.type) {
      case 'JOIN': {
        const current = lobbyRef.current;
        if (current.length >= 6) return;
        const newId = `player-${current.length}`;
        peerToPlayerRef.current.set(peerId, newId);

        const conn = connectionsRef.current.get(peerId);
        conn?.send({ type: 'JOINED', playerId: newId } as HostToGuestMessage);

        const updated: LobbyPlayer[] = [
          ...current,
          { id: newId, name: data.name, isHost: false, isConnected: true },
        ];
        setLobbyPlayers(updated);
        broadcastLobby(updated);
        break;
      }
      case 'PLAY_CARD':
        if (playerId) dispatchHost({ type: 'PLAY_CARD', card: data.card });
        break;
      case 'DRAW_CARD':
        dispatchHost({ type: 'DRAW_CARD' });
        break;
      case 'PASS':
        dispatchHost({ type: 'PASS' });
        break;
      case 'CALL_UNO':
        if (playerId) dispatchHost({ type: 'CALL_UNO', playerId });
        break;
      case 'CHOOSE_COLOR':
        dispatchHost({ type: 'CHOOSE_COLOR', color: data.color });
        break;
      case 'LEAVE':
        handleGuestDisconnect(peerId);
        break;
    }
  }

  // ── Public: createRoom ────────────────────────────────────────────────────

  function createRoom(hostName: string) {
    setStatus('creating-room');
    setError(null);
    const code = generateCode();
    const peer = new Peer(peerIdFromCode(code));
    peerRef.current = peer;

    peer.on('open', () => {
      const hostId = 'player-0';
      myPlayerIdRef.current = hostId;
      setMyPlayerId(hostId);
      setRoomCode(code);
      setIsHost(true);

      const initial: LobbyPlayer[] = [
        { id: hostId, name: hostName, isHost: true, isConnected: true },
      ];
      setLobbyPlayers(initial);
      setStatus('hosting-lobby');

      peer.on('connection', (conn: DataConnection) => {
        connectionsRef.current.set(conn.peer, conn);
        conn.on('data', (raw) => handleGuestMessage(conn.peer, raw as GuestToHostMessage));
        conn.on('close', () => handleGuestDisconnect(conn.peer));
        conn.on('error', () => handleGuestDisconnect(conn.peer));
      });
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Code collision — retry silently with a new code
        peer.destroy();
        peerRef.current = null;
        createRoom(hostName);
      } else {
        setStatus('error');
        setError(`Could not create room: ${err.message}`);
      }
    });
  }

  // ── Public: joinRoom ──────────────────────────────────────────────────────

  function joinRoom(code: string, name: string) {
    setStatus('joining-room');
    setError(null);
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(peerIdFromCode(code), { reliable: true });
      hostConnRef.current = conn;

      conn.on('open', () => {
        conn.send({ type: 'JOIN', name } as GuestToHostMessage);
        setStatus('joining-lobby');
        setRoomCode(code.toUpperCase());
      });

      conn.on('data', (raw) => {
        const msg = raw as HostToGuestMessage;
        switch (msg.type) {
          case 'JOINED':
            setMyPlayerId(msg.playerId);
            break;
          case 'LOBBY_UPDATE':
            setLobbyPlayers(msg.players);
            break;
          case 'GAME_STARTED':
            setStatus('playing');
            break;
          case 'STATE_UPDATE':
            setGameState(msg.state);
            setStatus('playing');
            break;
          case 'ERROR':
            setStatus('error');
            setError(msg.message);
            break;
        }
      });

      conn.on('close', () => {
        setStatus('disconnected');
        setError('Connection to host was lost.');
      });
      conn.on('error', () => {
        setStatus('error');
        setError('Connection to host failed.');
      });
    });

    peer.on('error', (err) => {
      setStatus('error');
      setError(
        err.type === 'peer-unavailable'
          ? `Room "${code.toUpperCase()}" not found. Check the code and try again.`
          : `Connection error: ${err.message}`,
      );
    });
  }

  // ── Public: startGame ─────────────────────────────────────────────────────

  function startGame() {
    if (!isHostRef.current) return;
    const configs: PlayerConfig[] = lobbyRef.current.map((p) => ({
      name: p.name,
      type: 'human' as const,
    }));
    dispatchHost({ type: 'INIT', configs });
    for (const conn of connectionsRef.current.values()) {
      conn.send({ type: 'GAME_STARTED' } as HostToGuestMessage);
    }
    setStatus('playing');
  }

  // ── Public: leaveRoom ─────────────────────────────────────────────────────

  function leaveRoom() {
    hostConnRef.current?.send({ type: 'LEAVE' } as GuestToHostMessage);
    cleanup();
  }

  // ── In-game actions ───────────────────────────────────────────────────────

  function sendAction(msg: GuestToHostMessage) {
    if (isHostRef.current) {
      // Host dispatches directly
      const myId = myPlayerIdRef.current;
      switch (msg.type) {
        case 'PLAY_CARD':    dispatchHost({ type: 'PLAY_CARD', card: msg.card }); break;
        case 'DRAW_CARD':    dispatchHost({ type: 'DRAW_CARD' }); break;
        case 'PASS':         dispatchHost({ type: 'PASS' }); break;
        case 'CALL_UNO':     if (myId) dispatchHost({ type: 'CALL_UNO', playerId: myId }); break;
        case 'CHOOSE_COLOR': dispatchHost({ type: 'CHOOSE_COLOR', color: msg.color }); break;
      }
    } else {
      hostConnRef.current?.send(msg);
    }
  }

  return {
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    sendPlayCard:   (card)  => sendAction({ type: 'PLAY_CARD', card }),
    sendDrawCard:   ()      => sendAction({ type: 'DRAW_CARD' }),
    sendPassTurn:   ()      => sendAction({ type: 'PASS' }),
    sendCallUno:    ()      => sendAction({ type: 'CALL_UNO' }),
    sendChooseColor:(color) => sendAction({ type: 'CHOOSE_COLOR', color }),
    status,
    roomCode,
    lobbyPlayers,
    gameState,
    myPlayerId,
    isHost,
    error,
  };
}
