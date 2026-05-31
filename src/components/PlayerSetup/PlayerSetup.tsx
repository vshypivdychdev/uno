import React, { useState } from 'react';
import type { PlayerConfig } from '../../game/gameEngine';
import type { AiDifficulty, PlayerType } from '../../types/game';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import './PlayerSetup.css';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

interface PlayerRow {
  name: string;
  type: PlayerType;
  difficulty: AiDifficulty;
}

function defaultRow(index: number): PlayerRow {
  return {
    name: `Player ${index + 1}`,
    type: index === 0 ? 'human' : 'ai',
    difficulty: 'medium',
  };
}

interface PlayerSetupProps {
  onStartGame: (players: PlayerConfig[]) => void;
}

/**
 * Pre-game lobby screen where players configure names and roles (human / AI).
 * Supports 2–6 players.  At least one human player is required.
 */
const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
  const [rows, setRows] = useState<PlayerRow[]>([defaultRow(0), defaultRow(1)]);
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();

  function updateRow(index: number, update: Partial<PlayerRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...update } : r)));
  }

  function addPlayer() {
    if (rows.length < MAX_PLAYERS) {
      setRows((prev) => [...prev, defaultRow(prev.length)]);
    }
  }

  function removePlayer(index: number) {
    if (rows.length > MIN_PLAYERS) {
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function handleStart() {
    const configs: PlayerConfig[] = rows.map((r) => ({
      name: r.name.trim() || `Player ${rows.indexOf(r) + 1}`,
      type: r.type,
      difficulty: r.type === 'ai' ? r.difficulty : undefined,
    }));
    onStartGame(configs);
  }

  const hasHuman = rows.some((r) => r.type === 'human');

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">
          <span className="uno-logo">UNO</span>
        </div>

        {canInstall && (
          <button className="install-btn" onClick={triggerInstall}>
            📲 Install app
          </button>
        )}
        {isInstalled && (
          <p className="install-badge">✅ App installed</p>
        )}

        <h1 className="setup-title">Set up your game</h1>

        <div className="setup-player-list">
          {rows.map((row, i) => (
            <div key={i} className="setup-player-row">
              <span className="setup-player-number">{i + 1}</span>

              <input
                className="setup-name-input"
                type="text"
                value={row.name}
                maxLength={20}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                aria-label={`Player ${i + 1} name`}
              />

              <select
                className="setup-type-select"
                value={row.type}
                onChange={(e) => updateRow(i, { type: e.target.value as PlayerType })}
                aria-label={`Player ${i + 1} type`}
              >
                <option value="human">👤 Human</option>
                <option value="ai">🤖 AI</option>
              </select>

              {row.type === 'ai' && (
                <select
                  className="setup-difficulty-select"
                  value={row.difficulty}
                  onChange={(e) => updateRow(i, { difficulty: e.target.value as AiDifficulty })}
                  aria-label={`Player ${i + 1} AI difficulty`}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                </select>
              )}

              {rows.length > MIN_PLAYERS && (
                <button
                  className="setup-remove-btn"
                  onClick={() => removePlayer(i)}
                  aria-label={`Remove player ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="setup-actions">
          {rows.length < MAX_PLAYERS && (
            <button className="setup-add-btn" onClick={addPlayer}>
              + Add player
            </button>
          )}

          <button
            className="setup-start-btn"
            onClick={handleStart}
            disabled={!hasHuman}
            title={!hasHuman ? 'At least one human player is required' : undefined}
          >
            Start game
          </button>

          {!hasHuman && (
            <p className="setup-warning">At least one human player is required.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerSetup;
