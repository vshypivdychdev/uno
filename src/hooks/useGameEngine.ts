import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Card, CardColor, GameState } from '../types/game';
import {
  initGame,
  playCard,
  drawCard,
  passTurn,
  callUno,
  chooseColor,
  processAiTurn,
} from '../game/gameEngine';
import type { PlayerConfig } from '../game/gameEngine';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'INIT'; players: PlayerConfig[] }
  | { type: 'PLAY_CARD'; card: Card }
  | { type: 'DRAW_CARD' }
  | { type: 'PASS' }
  | { type: 'CALL_UNO'; playerId: string }
  | { type: 'CHOOSE_COLOR'; color: CardColor }
  | { type: 'AI_TURN' };

function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  if (action.type === 'INIT') return initGame(action.players);
  if (!state) return null;

  switch (action.type) {
    case 'PLAY_CARD':     return playCard(state, action.card);
    case 'DRAW_CARD':     return drawCard(state);
    case 'PASS':          return passTurn(state);
    case 'CALL_UNO':      return callUno(state, action.playerId);
    case 'CHOOSE_COLOR':  return chooseColor(state, action.color);
    case 'AI_TURN':       return processAiTurn(state);
    default:              return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the full game lifecycle.
 *
 * AI turns are automatically scheduled with an 800 ms delay to give players
 * time to see what's happening before the AI acts.
 */
export function useGameEngine() {
  const [state, dispatch] = useReducer(gameReducer, null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startGame = useCallback((players: PlayerConfig[]) => {
    dispatch({ type: 'INIT', players });
  }, []);

  // Schedule AI turns automatically whenever the state changes and it's an AI's turn
  useEffect(() => {
    if (!state || state.phase === 'game-over') return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.type !== 'ai') return;

    aiTimerRef.current = setTimeout(() => {
      dispatch({ type: 'AI_TURN' });
    }, 800);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [state]);

  return {
    state,
    startGame,
    playCard:    (card: Card)    => dispatch({ type: 'PLAY_CARD', card }),
    drawCard:    ()              => dispatch({ type: 'DRAW_CARD' }),
    passTurn:    ()              => dispatch({ type: 'PASS' }),
    callUno:     (id: string)    => dispatch({ type: 'CALL_UNO', playerId: id }),
    chooseColor: (color: CardColor) => dispatch({ type: 'CHOOSE_COLOR', color }),
  };
}
