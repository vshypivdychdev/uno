import type { Card, CardColor, CardValue } from '../types/game';

const COLORS: readonly CardColor[] = ['red', 'green', 'blue', 'yellow'];
const NUMBER_VALUES: readonly CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_VALUES: readonly CardValue[] = ['skip', 'reverse', 'draw2'];
const WILD_VALUES: readonly CardValue[] = ['wild', 'wild4'];

let idCounter = 0;

function makeCard(color: CardColor, value: CardValue): Card {
  return { id: `${color}-${value}-${idCounter++}`, color, value };
}

/**
 * Creates a standard 108-card UNO deck (unshuffled).
 *
 * Composition per color: one 0, two each of 1-9, Skip, Reverse, Draw Two.
 * Wild cards: four Wild, four Wild Draw Four.
 */
export function createDeck(): Card[] {
  idCounter = 0;
  const cards: Card[] = [];

  for (const color of COLORS) {
    // One 0 per color
    cards.push(makeCard(color, '0'));

    // Two copies of 1-9 and action cards per color
    for (const value of [...NUMBER_VALUES.slice(1), ...ACTION_VALUES]) {
      cards.push(makeCard(color, value));
      cards.push(makeCard(color, value));
    }
  }

  // Four of each wild type
  for (const value of WILD_VALUES) {
    for (let i = 0; i < 4; i++) {
      cards.push(makeCard('wild', value));
    }
  }

  return cards; // 108 cards total
}

/** Fisher-Yates shuffle — returns a new array, does not mutate the input. */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createShuffledDeck(): Card[] {
  return shuffle(createDeck());
}
