import type {
  Card,
  CardColor,
  Direction,
  GameState,
  LogEntry,
  Player,
  PlayerType,
  AiDifficulty,
} from '../types/game';
import { createShuffledDeck, shuffle } from './deck';
import { canPlayCard, getNextPlayerIndex } from './rules';
import { aiPickCard, aiPickColor } from './ai';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PlayerConfig {
  name: string;
  type: PlayerType;
  difficulty?: AiDifficulty;
}

// ---------------------------------------------------------------------------
// Utility helpers (pure, operate on GameState immutably)
// ---------------------------------------------------------------------------

function addLog(state: GameState, entry: LogEntry): GameState {
  return { ...state, log: [...state.log, entry] };
}

/** Returns a human-readable label for a card (e.g. "red Skip", "Wild Draw Four"). */
export function cardLabel(card: Card): string {
  const colorStr = card.color !== 'wild' ? `${card.color} ` : '';
  const valueLabels: Partial<Record<string, string>> = {
    skip: 'Skip',
    reverse: 'Reverse',
    draw2: 'Draw Two',
    wild: 'Wild',
    wild4: 'Wild Draw Four',
  };
  return `${colorStr}${valueLabels[card.value] ?? card.value}`;
}

/** Updates one player's fields immutably. */
function updatePlayer(
  state: GameState,
  index: number,
  update: Partial<Player>,
): GameState {
  return {
    ...state,
    players: state.players.map((p, i) => (i === index ? { ...p, ...update } : p)),
  };
}

/**
 * Pops the top card from the draw pile.
 * If the pile is empty, reshuffles the discard pile (keeping the top card) into it.
 */
function popFromDrawPile(state: GameState): { state: GameState; card: Card | null } {
  let s = state;

  if (s.drawPile.length === 0) {
    const topCard = s.discardPile[s.discardPile.length - 1];
    const reshuffled = shuffle(s.discardPile.slice(0, -1));
    s = { ...s, drawPile: reshuffled, discardPile: [topCard] };
    s = addLog(s, { type: 'draw-pile-reshuffled' });
  }

  if (s.drawPile.length === 0) return { state: s, card: null };

  const card = s.drawPile[s.drawPile.length - 1];
  return { state: { ...s, drawPile: s.drawPile.slice(0, -1) }, card };
}

/** Draws `count` cards and adds them to the specified player's hand. */
function drawCardsForPlayer(
  state: GameState,
  playerIndex: number,
  count: number,
): GameState {
  let s = state;
  const drawn: Card[] = [];

  for (let i = 0; i < count; i++) {
    const { state: s2, card } = popFromDrawPile(s);
    s = s2;
    if (card) drawn.push(card);
  }

  const player = s.players[playerIndex];
  return updatePlayer(s, playerIndex, { hand: [...player.hand, ...drawn] });
}

// ---------------------------------------------------------------------------
// Game initialization
// ---------------------------------------------------------------------------

export function initGame(configs: PlayerConfig[]): GameState {
  const deck = createShuffledDeck();

  const players: Player[] = configs.map((c, i) => ({
    id: `player-${i}`,
    name: c.name,
    type: c.type,
    difficulty: c.difficulty,
    hand: [],
    hasCalledUno: false,
  }));

  // Deal 7 cards to each player (deal round-robin style).
  // A full 108-card deck is always enough for up to 10 players × 7 cards.
  for (let round = 0; round < 7; round++) {
    for (const player of players) {
      const card = deck.pop();
      if (!card) throw new Error('Deck ran out of cards during deal — this should never happen');
      player.hand.push(card);
    }
  }

  // The first discard card must not be a wild card (per official rules).
  // A standard deck has 8 wild cards out of 108, so this loop terminates quickly.
  let startCard: Card | undefined;
  do {
    startCard = deck.pop();
    if (!startCard) throw new Error('Deck ran out of cards while finding a start card');
    if (startCard.color === 'wild') {
      deck.unshift(startCard); // put it back at the bottom and try again
    }
  } while (startCard.color === 'wild');

  const state: GameState = {
    players,
    drawPile: deck,
    discardPile: [startCard],
    currentPlayerIndex: 0,
    direction: 1,
    phase: 'playing',
    currentColor: startCard.color,
    winner: null,
    drawnCard: null,
    log: [{ type: 'game-started', card: startCard }],
  };

  return applyStartingCardEffect(state, startCard);
}

/**
 * Applies the effect of the very first card placed on the discard pile.
 * Wild Draw Four cannot appear here (filtered above), but Skip/Reverse/Draw Two can.
 */
function applyStartingCardEffect(state: GameState, card: Card): GameState {
  let s = state;
  const count = s.players.length;

  switch (card.value) {
    case 'skip': {
      s = addLog(s, { type: 'starting-skip', playerName: s.players[0].name });
      s = { ...s, currentPlayerIndex: getNextPlayerIndex(0, s.direction, count, true) };
      break;
    }

    case 'reverse': {
      const newDirection: Direction = -1;
      if (count === 2) {
        s = addLog(s, { type: 'starting-reverse-skip' });
        s = {
          ...s,
          direction: newDirection,
          currentPlayerIndex: getNextPlayerIndex(0, newDirection, count, true),
        };
      } else {
        s = {
          ...s,
          direction: newDirection,
          currentPlayerIndex: getNextPlayerIndex(0, newDirection, count),
        };
        s = addLog(s, { type: 'direction-reversed-first', playerName: s.players[s.currentPlayerIndex].name });
      }
      break;
    }

    case 'draw2': {
      s = drawCardsForPlayer(s, 0, 2);
      s = addLog(s, { type: 'starting-draw2', playerName: s.players[0].name });
      s = { ...s, currentPlayerIndex: getNextPlayerIndex(0, s.direction, count, true) };
      break;
    }
  }

  return s;
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

/**
 * Plays a card from the current player's hand.
 *
 * Enforces the UNO rule: if a player plays their second-to-last card without
 * having pressed the UNO button first (hasCalledUno), they draw 2 as a penalty.
 */
export function playCard(state: GameState, card: Card): GameState {
  let s = { ...state };
  const playerIndex = s.currentPlayerIndex;
  const player = s.players[playerIndex];
  const topCard = s.discardPile[s.discardPile.length - 1];

  if (!canPlayCard(card, topCard, s.currentColor, player.hand)) {
    return s; // Silently ignore illegal moves (shouldn't happen through normal UI)
  }

  const handAfterPlay = player.hand.filter((c) => c.id !== card.id);

  // UNO penalty: playing second-to-last card without calling UNO → draw 2
  if (handAfterPlay.length === 1 && !player.hasCalledUno) {
    s = addLog(s, { type: 'uno-penalty', playerName: player.name });
    s = drawCardsForPlayer(s, playerIndex, 2);
  }

  // Place the card on the discard pile and clear the drawn-card state
  const finalHand = s.players[playerIndex].hand.filter((c) => c.id !== card.id);
  s = updatePlayer(s, playerIndex, { hand: finalHand, hasCalledUno: false });
  s = { ...s, discardPile: [...s.discardPile, card], drawnCard: null };
  s = addLog(s, { type: 'card-played', playerName: player.name, card });

  // Check win condition
  if (finalHand.length === 0) {
    s.phase = 'game-over';
    s.winner = s.players[playerIndex];
    return addLog(s, { type: 'player-wins', playerName: player.name });
  }

  return applyCardEffect(s, card, playerIndex);
}

/** Applies the mechanical effect of a card after it has been placed on the discard pile. */
function applyCardEffect(
  state: GameState,
  card: Card,
  playedByIndex: number,
): GameState {
  let s = { ...state };
  const count = s.players.length;

  switch (card.value) {
    case 'skip': {
      const skippedIndex = getNextPlayerIndex(playedByIndex, s.direction, count);
      s = addLog(s, { type: 'player-skipped', playerName: s.players[skippedIndex].name });
      s = {
        ...s,
        currentColor: card.color,
        currentPlayerIndex: getNextPlayerIndex(playedByIndex, s.direction, count, true),
      };
      break;
    }

    case 'reverse': {
      const newDirection = (s.direction * -1) as Direction;
      s = { ...s, direction: newDirection };

      if (count === 2) {
        s = addLog(s, { type: 'plays-again', playerName: s.players[playedByIndex].name });
        s = {
          ...s,
          currentColor: card.color,
          currentPlayerIndex: getNextPlayerIndex(playedByIndex, newDirection, count, true),
        };
      } else {
        s = addLog(s, { type: 'direction-reversed' });
        s = {
          ...s,
          currentColor: card.color,
          currentPlayerIndex: getNextPlayerIndex(playedByIndex, newDirection, count),
        };
      }
      break;
    }

    case 'draw2': {
      const targetIndex = getNextPlayerIndex(playedByIndex, s.direction, count);
      s = drawCardsForPlayer(s, targetIndex, 2);
      s = addLog(s, { type: 'player-draws-skipped', playerName: s.players[targetIndex].name, count: 2 });
      s = {
        ...s,
        currentColor: card.color,
        currentPlayerIndex: getNextPlayerIndex(playedByIndex, s.direction, count, true),
      };
      break;
    }

    case 'wild':
    case 'wild4': {
      // Current player must choose a color — phase changes, index stays the same
      s = { ...s, phase: 'choosing-color' };
      break;
    }

    default: {
      // Number card — just advance to next player
      s = {
        ...s,
        currentColor: card.color,
        currentPlayerIndex: getNextPlayerIndex(playedByIndex, s.direction, count),
      };
      break;
    }
  }

  return s;
}

/**
 * Finalizes the color choice after playing a Wild or Wild Draw Four.
 * Also applies the draw-4 penalty to the next player.
 */
export function chooseColor(state: GameState, color: CardColor): GameState {
  let s = { ...state };
  const playedByIndex = s.currentPlayerIndex;
  const topCard = s.discardPile[s.discardPile.length - 1];
  const count = s.players.length;

  s = addLog(s, { type: 'color-chosen', playerName: s.players[playedByIndex].name, color });
  s = { ...s, currentColor: color, phase: 'playing' };

  if (topCard.value === 'wild4') {
    const targetIndex = getNextPlayerIndex(playedByIndex, s.direction, count);
    s = drawCardsForPlayer(s, targetIndex, 4);
    s = addLog(s, { type: 'player-draws-skipped', playerName: s.players[targetIndex].name, count: 4 });
    s = { ...s, currentPlayerIndex: getNextPlayerIndex(playedByIndex, s.direction, count, true) };
  } else {
    s = { ...s, currentPlayerIndex: getNextPlayerIndex(playedByIndex, s.direction, count) };
  }

  return s;
}

/**
 * Draws one card from the draw pile for the current player.
 *
 * If the drawn card is playable, the game enters the drawn-card phase so the
 * player can decide whether to play it or pass.  If it is not playable, the
 * turn passes automatically.
 */
export function drawCard(state: GameState): GameState {
  let s = { ...state };
  const playerIndex = s.currentPlayerIndex;
  const topCard = s.discardPile[s.discardPile.length - 1];

  const { state: s2, card } = popFromDrawPile(s);
  s = s2;

  if (!card) {
    return addLog(s, { type: 'draw-pile-empty' });
  }

  s = updatePlayer(s, playerIndex, {
    hand: [...s.players[playerIndex].hand, card],
  });
  s = addLog(s, { type: 'player-draws-card', playerName: s.players[playerIndex].name });

  const playable = canPlayCard(card, topCard, s.currentColor, s.players[playerIndex].hand);

  if (playable) {
    return { ...s, drawnCard: card, phase: 'drawn-card' };
  } else {
    s = addLog(s, { type: 'player-cannot-play', playerName: s.players[playerIndex].name });
    return {
      ...s,
      drawnCard: null,
      currentPlayerIndex: getNextPlayerIndex(playerIndex, s.direction, s.players.length),
    };
  }
}

/**
 * Passes the turn without playing the drawn card.
 * Only valid during the drawn-card phase.
 */
export function passTurn(state: GameState): GameState {
  const s = addLog(state, { type: 'player-passes', playerName: state.players[state.currentPlayerIndex].name });
  return {
    ...s,
    drawnCard: null,
    phase: 'playing',
    currentPlayerIndex: getNextPlayerIndex(
      s.currentPlayerIndex,
      s.direction,
      s.players.length,
    ),
  };
}

/**
 * Marks a player as having called UNO.
 * Must be called before playing the second-to-last card to avoid the draw-2 penalty.
 */
export function callUno(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state; // unknown player — ignore
  const player = state.players[playerIndex];
  const s = updatePlayer(state, playerIndex, { hasCalledUno: true });
  return addLog(s, { type: 'uno-called', playerName: player.name });
}

// ---------------------------------------------------------------------------
// AI turn processing
// ---------------------------------------------------------------------------

/**
 * Processes a single AI turn step.  Called repeatedly (with a delay between
 * calls) by the hook to simulate the AI "thinking" before acting.
 */
export function processAiTurn(state: GameState): GameState {
  let s = { ...state };
  const player = s.players[s.currentPlayerIndex];

  if (player.type !== 'ai') return s;

  // Handle color choice after playing a wild
  if (s.phase === 'choosing-color') {
    return chooseColor(s, aiPickColor(player));
  }

  // Handle the drawn-card decision
  if (s.phase === 'drawn-card' && s.drawnCard) {
    const drawn = s.drawnCard;
    s = { ...s, drawnCard: null, phase: 'playing' };

    const handAfterPlay = s.players[s.currentPlayerIndex].hand.filter(
      (c) => c.id !== drawn.id,
    );
    if (handAfterPlay.length === 1) {
      s = callUno(s, player.id);
    }

    return playCard(s, drawn);
  }

  // Normal turn: pick a card to play or draw
  const chosenCard = aiPickCard(s, player);

  if (chosenCard) {
    const handAfterPlay = player.hand.filter((c) => c.id !== chosenCard.id);
    if (handAfterPlay.length === 1) {
      // AI always calls UNO when it should
      s = callUno(s, player.id);
    }
    return playCard(s, chosenCard);
  }

  // No playable card — draw
  return drawCard(s);
}
