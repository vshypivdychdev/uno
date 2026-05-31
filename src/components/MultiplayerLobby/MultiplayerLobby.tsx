import React from 'react';
import type { LobbyPlayer } from '../../types/multiplayer';
import { useTranslation } from '../../i18n/LanguageContext';
import './MultiplayerLobby.css';

interface MultiplayerLobbyProps {
  roomCode: string;
  players: LobbyPlayer[];
  isHost: boolean;
  onStartGame: () => void;
  onLeave: () => void;
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  roomCode,
  players,
  isHost,
  onStartGame,
  onLeave,
}) => {
  const { lang } = useTranslation();
  const canStart = isHost && players.length >= 2;

  return (
    <div className="mp-lobby-screen">
      <div className="mp-lobby-card">
        <div className="mp-lobby-header">
          <h1 className="mp-lobby-title">{lang.lobby.title}</h1>
          <div className="mp-room-code">
            <span className="mp-room-code-label">{lang.lobby.roomCode}</span>
            <span className="mp-room-code-value">{roomCode}</span>
            <span className="mp-room-code-hint">{lang.lobby.shareHint}</span>
          </div>
        </div>

        <div className="mp-player-list">
          <h2 className="mp-player-list-title">
            {lang.lobby.players} ({players.length}/6)
          </h2>
          {players.map((p) => (
            <div key={p.id} className="mp-player-row">
              <span className="mp-player-name">
                {p.isHost ? '👑' : '👤'} {p.name}
              </span>
              <span className={`mp-player-status ${p.isConnected ? '' : 'mp-player-status--lost'}`}>
                {p.isConnected ? lang.lobby.ready : lang.lobby.disconnected}
              </span>
            </div>
          ))}
        </div>

        {!isHost && (
          <p className="mp-lobby-waiting">{lang.lobby.waitingForHost}</p>
        )}

        <div className="mp-lobby-actions">
          {isHost && (
            <button
              className="mp-start-btn"
              onClick={onStartGame}
              disabled={!canStart}
              title={!canStart ? 'Need at least 2 players' : undefined}
            >
              {lang.lobby.startGame}
            </button>
          )}
          <button className="mp-leave-btn" onClick={onLeave}>
            {lang.lobby.leave}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;
