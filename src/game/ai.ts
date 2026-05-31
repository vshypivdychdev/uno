import type { Card, CardColor, GameState, Player } from '../types/game';
import { getPlayableCards } from './rules';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Returns the color most represented in the hand (excluding wild cards). */
function getMostFrequentColor(hand: Card[]): CardColor {
  const counts: Partial<Record<CardColor, number>> = {};

  for (const card of hand) {
    if (card.color !== 'wild') {
      counts[card.color] = (counts[card.color] ?? 0) + 1;
    }
  }

  const entries = Object.entries(counts) as [CardColor, number][];
  if (entries.length === 0) return 'red';
  return entries.reduce((best, curr) => (curr[1] > best[1] ? curr : best))[0];
}

// ---------------------------------------------------------------------------
// Easy AI — plays the first valid card it finds; no strategy
// ---------------------------------------------------------------------------

function easyPickCard(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
): Card | null {
  const playable = getPlayableCards(hand, topCard, currentColor);
  return playable[0] ?? null;
}

// ---------------------------------------------------------------------------
// Medium AI — prioritizes action cards, avoids wasting Wild Draw Four early
// ---------------------------------------------------------------------------

function cardPriority(card: Card): number {
  if (card.value === 'wild4') return 0;  // save for last resort
  if (card.value === 'wild') return 1;
  if (['skip', 'reverse', 'draw2'].includes(card.value)) return 3; // prefer action
  return 2; // numbers
}

function mediumPickCard(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
): Card | null {
  const playable = getPlayableCards(hand, topCard, currentColor);
  if (playable.length === 0) return null;

  return [...playable].sort((a, b) => cardPriority(b) - cardPriority(a))[0];
}

// ---------------------------------------------------------------------------
// Public API used by the game engine
// ---------------------------------------------------------------------------

/** Choose which card to play. Returns null if no playable card (must draw). */
export function aiPickCard(state: GameState, player: Player): Card | null {
  const topCard = state.discardPile[state.discardPile.length - 1];

  if (player.difficulty === 'medium') {
    return mediumPickCard(player.hand, topCard, state.currentColor);
  }

  return easyPickCard(player.hand, topCard, state.currentColor);
}

/** Choose a color after playing a wild card. */
export function aiPickColor(player: Player): CardColor {
  return getMostFrequentColor(player.hand);
}
