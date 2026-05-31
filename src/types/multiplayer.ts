import type { Card, CardColor, Direction, GamePhase, LogEntry } from './game';

export type MultiplayerStatus =
  | 'idle'
  | 'creating-room'
  | 'hosting-lobby'
  | 'joining-room'
  | 'joining-lobby'
  | 'playing'
  | 'disconnected'
  | 'error';

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
}

export interface OpponentView {
  id: string;
  name: string;
  handSize: number;
  hasCalledUno: boolean;
  isConnected: boolean;
}

/** The game state as seen by one specific player. Opponents' cards are hidden. */
export interface MultiplayerGameState {
  myId: string;
  myName: string;
  myHand: Card[];
  myHasCalledUno: boolean;
  opponents: OpponentView[];
  /** ID of the player whose turn it currently is. */
  currentPlayerId: string;
  discardPile: Card[];
  currentColor: CardColor;
  phase: GamePhase;
  direction: Direction;
  winner: { id: string; name: string } | null;
  /** Non-null only when it's my turn and I'm in drawn-card phase. */
  drawnCard: Card | null;
  log: LogEntry[];
  drawPileSize: number;
  /** All player IDs in index order — used to compute turn sequence and visual ordering */
  playerOrder: string[];
}

// ── Messages: Guest → Host ──────────────────────────────────────────────────

export type GuestToHostMessage =
  | { type: 'JOIN'; name: string }
  | { type: 'PLAY_CARD'; card: Card }
  | { type: 'DRAW_CARD' }
  | { type: 'PASS' }
  | { type: 'CALL_UNO' }
  | { type: 'CHOOSE_COLOR'; color: CardColor }
  | { type: 'LEAVE' };

// ── Messages: Host → Guest ──────────────────────────────────────────────────

export type HostToGuestMessage =
  | { type: 'JOINED'; playerId: string }
  | { type: 'LOBBY_UPDATE'; players: LobbyPlayer[] }
  | { type: 'GAME_STARTED' }
  | { type: 'STATE_UPDATE'; state: MultiplayerGameState }
  | { type: 'ERROR'; message: string };
