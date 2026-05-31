import React, { useEffect, useMemo, useState } from 'react';
import type { MultiplayerGameState } from '../../types/multiplayer';
import type { CardColor } from '../../types/game';
import { getPlayableCards } from '../../game/rules';
import { useTranslation } from '../../i18n/LanguageContext';
import Card from '../Card/Card';
import Hand from '../Hand/Hand';
import ColorPicker from '../ColorPicker/ColorPicker';
import ActionLog from '../ActionLog/ActionLog';
import OpponentCard from '../OpponentCard/OpponentCard';
import './MultiplayerGame.css';

const TURN_SECONDS = 60;

const COLOR_HEX: Record<string, string> = {
  red: '#dc2626',
  green: '#16a34a',
  blue: '#2563eb',
  yellow: '#ca8a04',
  wild: '#6b7280',
};

interface MultiplayerGameProps {
  state: MultiplayerGameState;
  onPlayCard: (card: import('../../types/game').Card) => void;
  onDrawCard: () => void;
  onPassTurn: () => void;
  onCallUno: () => void;
  onChooseColor: (color: CardColor) => void;
  onLeave: () => void;
}

const MultiplayerGame: React.FC<MultiplayerGameProps> = ({
  state,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onChooseColor,
  onLeave,
}) => {
  const { lang } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const turnStartRef = React.useRef<number | null>(null);

  // Track who just played
  const prevPlayerIdRef = React.useRef<string>(state.currentPlayerId);
  const [prevPlayerId, setPrevPlayerId] = useState<string | null>(null);

  // Track disconnected players — hide after one full round (all remaining players acted once)
  const [disconnectedRound, setDisconnectedRound] = useState<Map<string, Set<string>>>(new Map());

  const isMyTurn = state.currentPlayerId === state.myId;
  const topCard = state.discardPile[state.discardPile.length - 1];

  const playableCards =
    isMyTurn && state.phase === 'playing'
      ? getPlayableCards(state.myHand, topCard, state.currentColor)
      : [];
  const playableCardIds = new Set(playableCards.map((c) => c.id));
  const hasPlayableCard = playableCards.length > 0;

  const currentOpponent = state.opponents.find((o) => o.id === state.currentPlayerId);
  const currentPlayerName = isMyTurn
    ? lang.game.yourTurn
    : lang.game.sTurn(currentOpponent?.name ?? '?');

  // ── Compute turn order ────────────────────────────────────────────────────

  const { sortedOpponents, nextPlayerId } = useMemo(() => {
    const order = state.playerOrder;
    const n = order.length;
    const currentIdx = order.indexOf(state.currentPlayerId);

    if (n === 0 || currentIdx < 0) {
      return { sortedOpponents: state.opponents, nextPlayerId: null };
    }

    const nextIdx = ((currentIdx + state.direction) % n + n) % n;
    const next = order[nextIdx];

    const opMap = new Map(state.opponents.map((o) => [o.id, o]));
    const sorted = [];
    for (let step = 1; step < n; step++) {
      const idx = ((currentIdx + step * state.direction) % n + n) % n;
      const id = order[idx];
      if (id !== state.myId) {
        const opp = opMap.get(id);
        if (opp) sorted.push(opp);
      }
    }

    return { sortedOpponents: sorted, nextPlayerId: next };
  }, [state.opponents, state.currentPlayerId, state.myId, state.playerOrder, state.direction]);

  // ── Detect newly disconnected opponents ───────────────────────────────────

  useEffect(() => {
    state.opponents.forEach((opp) => {
      if (!opp.isConnected) {
        setDisconnectedRound((old) => {
          if (old.has(opp.id)) return old;
          return new Map([...old, [opp.id, new Set<string>()]]);
        });
      }
    });
  }, [state.opponents]);

  // ── Turn countdown + prev-player + disconnection round tracking ───────────

  useEffect(() => {
    if (state.phase === 'game-over') return;
    const prev = prevPlayerIdRef.current;
    if (prev !== state.currentPlayerId) {
      setPrevPlayerId(prev);
      prevPlayerIdRef.current = state.currentPlayerId;
      // Record that `prev` has acted since each disconnection
      setDisconnectedRound((old) => {
        if (old.size === 0) return old;
        const next = new Map(old);
        for (const [id, set] of next) {
          next.set(id, new Set([...set, prev]));
        }
        return next;
      });
    }
    turnStartRef.current = Date.now();
    const interval = setInterval(() => {
      if (turnStartRef.current !== null) {
        const elapsed = Math.floor((Date.now() - turnStartRef.current) / 1000);
        setTimeLeft(Math.max(0, TURN_SECONDS - elapsed));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.currentPlayerId, state.phase]);

  // ── Filter out disconnected players after one full round ──────────────────

  const connectedCount = state.opponents.filter((o) => o.isConnected).length + 1; // +1 for me
  const visibleOpponents = sortedOpponents.filter((opp) => {
    if (opp.isConnected) return true;
    const acters = disconnectedRound.get(opp.id);
    if (acters === undefined) return true;
    return acters.size < connectedCount;
  });

  // ── Game over ─────────────────────────────────────────────────────────────

  if (state.phase === 'game-over' && state.winner) {
    const iWon = state.winner.id === state.myId;
    return (
      <div className="mp-game-over">
        <div className="mp-game-over-card">
          <div className="mp-game-over-trophy">{iWon ? '🏆' : '😅'}</div>
          <h1 className="mp-game-over-title">
            {iWon ? lang.game.youWin : lang.game.winsTitle(state.winner.name)}
          </h1>
          <p className="mp-game-over-sub">
            {iWon ? lang.game.congrats : lang.game.betterLuck}
          </p>
          <div className="mp-game-over-scores">
            <h3>{lang.game.cardsRemaining}</h3>
            {state.opponents
              .filter((o) => o.id !== state.winner!.id)
              .map((o) => (
                <div key={o.id} className="mp-score-row">
                  <span>{o.name}</span>
                  <span>{lang.game.cards(o.handSize)}</span>
                </div>
              ))}
            {state.winner.id !== state.myId && (
              <div className="mp-score-row">
                <span>{lang.game.you}</span>
                <span>{lang.game.cards(state.myHand.length)}</span>
              </div>
            )}
          </div>
          <ActionLog entries={state.log} />
          <button className="mp-leave-game-btn" onClick={onLeave}>
            {lang.game.backHome}
          </button>
        </div>
      </div>
    );
  }

  // ── Color picker ──────────────────────────────────────────────────────────

  const showColorPicker = isMyTurn && state.phase === 'choosing-color';

  // ── Leave confirmation ────────────────────────────────────────────────────

  function handleLeaveClick() {
    setShowConfirm(true);
  }

  function handleConfirmLeave() {
    setShowConfirm(false);
    onLeave();
  }

  // ── Main board ────────────────────────────────────────────────────────────

  const timerWarning = timeLeft <= 10;

  return (
    <div className="mp-game-board">
      {showColorPicker && (
        <ColorPicker playerName={lang.game.you} onChoose={onChooseColor} />
      )}

      {showConfirm && (
        <div className="mp-confirm-overlay">
          <div className="mp-confirm-modal">
            <h2 className="mp-confirm-title">{lang.confirm.leaveTitle}</h2>
            <p className="mp-confirm-body">{lang.confirm.leaveBody}</p>
            <div className="mp-confirm-actions">
              <button className="mp-confirm-cancel" onClick={() => setShowConfirm(false)}>
                {lang.confirm.cancel}
              </button>
              <button className="mp-confirm-leave" onClick={handleConfirmLeave}>
                {lang.confirm.leave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header: leave + my name + timer */}
      <div className="mp-game-header">
        <button className="mp-header-leave" onClick={handleLeaveClick}>{lang.game.leave}</button>
        <span className="mp-header-name">{state.myName}</span>
        <span className={`mp-timer ${timerWarning ? 'mp-timer--warning' : ''}`}>
          {lang.game.timer(timeLeft)}
        </span>
      </div>

      {/* Opponents — sorted in current turn order, disconnected hidden after one round */}
      <div className="mp-opponents-area">
        {visibleOpponents.map((opp) => (
          <OpponentCard
            key={opp.id}
            opponent={opp}
            isCurrent={opp.id === state.currentPlayerId}
            isNext={opp.id === nextPlayerId && opp.id !== state.currentPlayerId}
            isPrev={opp.id === prevPlayerId && opp.id !== state.currentPlayerId}
          />
        ))}
      </div>

      {/* Center */}
      <div className="mp-center-area">
        <div className="mp-pile-row">
          <div
            className={`mp-pile mp-draw-pile ${isMyTurn && state.phase === 'playing' && !hasPlayableCard ? 'mp-draw-pile--active' : ''}`}
            onClick={isMyTurn && state.phase === 'playing' && !hasPlayableCard ? onDrawCard : undefined}
          >
            <div className="card card-back pile-card">
              <span className="card-back-text">UNO</span>
            </div>
            <span className="mp-pile-label">{lang.game.drawPile(state.drawPileSize)}</span>
          </div>

          <div
            className="mp-color-dot"
            style={{ backgroundColor: COLOR_HEX[state.currentColor] }}
            title={`Current color: ${state.currentColor}`}
          />

          <div className="mp-pile mp-discard-pile">
            <Card card={topCard} />
            <span className="mp-pile-label">{lang.game.discard}</span>
          </div>
        </div>

        <ActionLog entries={state.log} />
      </div>

      {/* My hand */}
      <div className="mp-my-area">
        <div className="mp-my-header">
          <span className="mp-my-label">{lang.game.yourHand(state.myHand.length)}</span>
          <span className={`mp-my-turn-status ${isMyTurn ? 'mp-my-turn-status--mine' : 'mp-my-turn-status--waiting'}`}>
            {currentPlayerName}
          </span>
          <span className="mp-my-header-end">
            {state.myHasCalledUno && <span className="mp-uno-called">🔔 UNO</span>}
          </span>
        </div>

        <Hand
          cards={state.myHand}
          playableCardIds={isMyTurn ? playableCardIds : new Set()}
          drawnCardId={isMyTurn ? state.drawnCard?.id : undefined}
          onPlayCard={isMyTurn ? onPlayCard : () => {}}
        />

        <div className="mp-controls">
          {state.myHand.length === 2 && !state.myHasCalledUno && isMyTurn && (
            <button className="mp-uno-btn" onClick={onCallUno}>{lang.game.uno}</button>
          )}

          {isMyTurn && state.phase === 'drawn-card' && (
            <button className="mp-pass-btn" onClick={onPassTurn}>
              {lang.game.pass}
            </button>
          )}

          {isMyTurn && state.phase === 'playing' && (
            <button
              className="mp-draw-btn"
              onClick={onDrawCard}
              disabled={state.drawPileSize === 0 || hasPlayableCard}
              title={hasPlayableCard ? lang.game.noPlayableCard : undefined}
            >
              {lang.game.drawCard}
            </button>
          )}

          {isMyTurn && state.phase === 'drawn-card' && state.drawnCard && (
            <p className="mp-drawn-hint">
              {lang.game.drawnHint(lang.cardLabel(state.drawnCard))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerGame;
