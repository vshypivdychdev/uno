import React, { useState } from 'react';
import type { CardColor, GameState, Player } from '../../types/game';
import { getPlayableCards } from '../../game/rules';
import { useTranslation } from '../../i18n/LanguageContext';
import Card from '../Card/Card';
import Hand from '../Hand/Hand';
import OpponentHand from '../OpponentHand/OpponentHand';
import ColorPicker from '../ColorPicker/ColorPicker';
import PassDevice from '../PassDevice/PassDevice';
import ActionLog from '../ActionLog/ActionLog';
import './GameBoard.css';

interface GameBoardProps {
  state: GameState;
  onPlayCard: (card: import('../../types/game').Card) => void;
  onDrawCard: () => void;
  onPassTurn: () => void;
  onCallUno: (playerId: string) => void;
  onChooseColor: (color: CardColor) => void;
  onNewGame: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  state,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onChooseColor,
  onNewGame,
}) => {
  const { lang } = useTranslation();
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isHumanTurn = currentPlayer.type === 'human';

  // ── Pass-device logic ──────────────────────────────────────────────────
  const hasMultipleHumans = state.players.filter((p) => p.type === 'human').length > 1;
  const [handRevealed, setHandRevealed] = useState(true);
  const [prevPlayerIndex, setPrevPlayerIndex] = useState(state.currentPlayerIndex);

  if (prevPlayerIndex !== state.currentPlayerIndex) {
    setPrevPlayerIndex(state.currentPlayerIndex);
    if (state.phase !== 'game-over' && currentPlayer.type === 'human' && hasMultipleHumans) {
      setHandRevealed(false);
    } else {
      setHandRevealed(true);
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────
  const topCard = state.discardPile[state.discardPile.length - 1];

  const playableCards = isHumanTurn && state.phase === 'playing'
    ? getPlayableCards(currentPlayer.hand, topCard, state.currentColor)
    : [];

  const playableCardIds = new Set(playableCards.map((c) => c.id));

  const currentColorDisplay: Record<string, string> = {
    red: '#dc2626',
    green: '#16a34a',
    blue: '#2563eb',
    yellow: '#ca8a04',
    wild: '#6b7280',
  };

  const directionLabel = state.direction === 1 ? lang.game.clockwise : lang.game.counterClockwise;

  const opponents = state.players.filter((_, i) => i !== state.currentPlayerIndex);

  // ── Render helpers ─────────────────────────────────────────────────────

  function renderCurrentPlayerControls(player: Player) {
    const isDrawnCardPhase = state.phase === 'drawn-card';
    const canCallUno = player.hand.length === 2 && !player.hasCalledUno;

    return (
      <div className="controls">
        {canCallUno && (
          <button
            className="uno-btn"
            onClick={() => onCallUno(player.id)}
            title="Call UNO before playing your second-to-last card!"
          >
            {lang.game.uno}
          </button>
        )}

        {isDrawnCardPhase && (
          <button className="pass-btn" onClick={onPassTurn}>
            {lang.game.pass}
          </button>
        )}

        {state.phase === 'playing' && (
          <button
            className="draw-btn"
            onClick={onDrawCard}
            disabled={state.drawPile.length === 0 || playableCards.length > 0}
            title={playableCards.length > 0 ? lang.game.noPlayableCard : undefined}
          >
            {lang.game.drawCard}
          </button>
        )}
      </div>
    );
  }

  // ── Game over screen ───────────────────────────────────────────────────
  if (state.phase === 'game-over' && state.winner) {
    return (
      <div className="game-over-screen">
        <div className="game-over-card">
          <div className="game-over-trophy">🏆</div>
          <h1 className="game-over-title">{lang.game.winsTitle(state.winner.name)}</h1>
          <p className="game-over-sub">{lang.game.congrats}</p>
          <div className="game-over-scores">
            <h3>{lang.game.cardsRemaining}</h3>
            {state.players
              .filter((p) => p.id !== state.winner!.id)
              .map((p) => (
                <div key={p.id} className="score-row">
                  <span>{p.name}</span>
                  <span>{lang.game.cards(p.hand.length)}</span>
                </div>
              ))}
          </div>
          <div className="game-over-log">
            <ActionLog entries={state.log} />
          </div>
          <button className="new-game-btn" onClick={onNewGame}>
            {lang.game.newGame}
          </button>
        </div>
      </div>
    );
  }

  // ── Main board ─────────────────────────────────────────────────────────
  return (
    <div className="game-board">
      {state.phase === 'choosing-color' && currentPlayer.type === 'human' && (
        <ColorPicker playerName={currentPlayer.name} onChoose={onChooseColor} />
      )}

      {isHumanTurn && !handRevealed && (
        <PassDevice player={currentPlayer} onReveal={() => setHandRevealed(true)} />
      )}

      {/* ── Opponents ── */}
      <div className="opponents-area">
        {opponents.map((opponent) => (
          <OpponentHand
            key={opponent.id}
            player={opponent}
            isCurrentPlayer={opponent.id === currentPlayer.id}
          />
        ))}
      </div>

      {/* ── Center: piles + status ── */}
      <div className="center-area">
        <div className="pile-row">
          <div
            className="pile draw-pile"
            onClick={isHumanTurn && state.phase === 'playing' && playableCards.length === 0 ? onDrawCard : undefined}
          >
            <div className="card card-back pile-card">
              <span className="card-back-text">UNO</span>
            </div>
            <span className="pile-label">{lang.game.drawPile(state.drawPile.length)}</span>
          </div>

          <div className="color-indicator">
            <div
              className="color-dot"
              style={{ backgroundColor: currentColorDisplay[state.currentColor] }}
              title={`Current color: ${state.currentColor}`}
            />
            <span className="direction-label">{directionLabel}</span>
          </div>

          <div className="pile discard-pile">
            <Card card={topCard} />
            <span className="pile-label">{lang.game.discard}</span>
          </div>
        </div>

        <ActionLog entries={state.log} />
      </div>

      {/* ── Current player's area ── */}
      <div className="current-player-area">
        <div className="current-player-header">
          <span className="current-player-name">
            {isHumanTurn ? '👤' : '🤖'} {currentPlayer.name}
            {currentPlayer.type === 'ai' && ` — ${lang.game.thinking}`}
          </span>
          <span className="current-player-card-count">
            {lang.game.cards(currentPlayer.hand.length)}
          </span>
        </div>

        {isHumanTurn && handRevealed ? (
          <>
            <Hand
              cards={currentPlayer.hand}
              playableCardIds={playableCardIds}
              drawnCardId={state.drawnCard?.id}
              onPlayCard={onPlayCard}
            />
            {renderCurrentPlayerControls(currentPlayer)}
            {state.phase === 'drawn-card' && state.drawnCard && (
              <p className="drawn-card-hint">
                {lang.game.drawnHint(lang.cardLabel(state.drawnCard))}
              </p>
            )}
          </>
        ) : (
          <div className="ai-thinking">
            <div className="ai-thinking-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
