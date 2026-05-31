import React, { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useMultiplayer } from './hooks/useMultiplayer';
import type { PlayerConfig } from './game/gameEngine';
import HomeScreen from './components/HomeScreen/HomeScreen';
import PlayerSetup from './components/PlayerSetup/PlayerSetup';
import GameBoard from './components/GameBoard/GameBoard';
import MultiplayerSetup from './components/MultiplayerSetup/MultiplayerSetup';
import MultiplayerLobby from './components/MultiplayerLobby/MultiplayerLobby';
import MultiplayerGame from './components/MultiplayerGame/MultiplayerGame';
import './App.css';

type AppScreen =
  | 'home'
  | 'solo-setup'
  | 'solo-game'
  | 'mp-setup'
  | 'mp-lobby'
  | 'mp-game';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('home');

  // ── Solo / local game ─────────────────────────────────────────────────────
  const { state, startGame, playCard, drawCard, passTurn, callUno, chooseColor } =
    useGameEngine();

  function handleSoloStart(players: PlayerConfig[]) {
    startGame(players);
    setScreen('solo-game');
  }

  // ── Multiplayer ───────────────────────────────────────────────────────────
  const mp = useMultiplayer();

  // When the multiplayer status advances to lobby/game, sync the screen
  React.useEffect(() => {
    if (mp.status === 'hosting-lobby' || mp.status === 'joining-lobby') {
      setScreen('mp-lobby');
    } else if (mp.status === 'playing') {
      setScreen('mp-game');
    } else if (mp.status === 'idle') {
      setScreen('home');
    }
  }, [mp.status]);

  function handleLeaveMultiplayer() {
    mp.leaveRoom();
    setScreen('home');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === 'home') {
    return (
      <HomeScreen
        onSolo={() => setScreen('solo-setup')}
        onMultiplayer={() => setScreen('mp-setup')}
      />
    );
  }

  if (screen === 'solo-setup') {
    return <PlayerSetup onStartGame={handleSoloStart} />;
  }

  if (screen === 'solo-game' && state) {
    return (
      <GameBoard
        state={state}
        onPlayCard={playCard}
        onDrawCard={drawCard}
        onPassTurn={passTurn}
        onCallUno={callUno}
        onChooseColor={chooseColor}
        onNewGame={() => setScreen('home')}
      />
    );
  }

  if (screen === 'mp-setup') {
    return (
      <MultiplayerSetup
        status={mp.status}
        error={mp.error}
        onCreateRoom={mp.createRoom}
        onJoinRoom={mp.joinRoom}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'mp-lobby' && mp.roomCode) {
    return (
      <MultiplayerLobby
        roomCode={mp.roomCode}
        players={mp.lobbyPlayers}
        isHost={mp.isHost}
        onStartGame={mp.startGame}
        onLeave={handleLeaveMultiplayer}
      />
    );
  }

  if (screen === 'mp-game' && mp.gameState) {
    return (
      <MultiplayerGame
        state={mp.gameState}
        onPlayCard={mp.sendPlayCard}
        onDrawCard={mp.sendDrawCard}
        onPassTurn={mp.sendPassTurn}
        onCallUno={mp.sendCallUno}
        onChooseColor={mp.sendChooseColor}
        onLeave={handleLeaveMultiplayer}
      />
    );
  }

  // Fallback — connection error or unexpected state
  if (mp.status === 'error' || mp.status === 'disconnected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '1rem', padding: '1rem' }}>
        <p style={{ color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>{mp.error ?? 'Connection lost.'}</p>
        <button onClick={handleLeaveMultiplayer} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return null;
};

export default App;
