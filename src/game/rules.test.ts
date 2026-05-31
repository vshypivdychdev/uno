import { describe, it, expect } from 'vitest';
import { canPlayCard, getPlayableCards, getNextPlayerIndex, getCardPoints } from './rules';
import type { Card } from '../types/game';

// ── Helpers ───────────────────────────────────────────────────────────────────

function card(id: string, color: Card['color'], value: Card['value']): Card {
  return { id, color, value };
}

const RED_5    = card('r5',    'red',    '5');
const RED_3    = card('r3',    'red',    '3');
const BLUE_5   = card('b5',    'blue',   '5');
const GREEN_7  = card('g7',    'green',  '7');
const WILD     = card('w1',    'wild',   'wild');
const WILD4    = card('w4',    'wild',   'wild4');

// ── canPlayCard ───────────────────────────────────────────────────────────────

describe('canPlayCard', () => {
  it('matches by color', () => {
    expect(canPlayCard(RED_5, RED_3, 'red', [RED_5])).toBe(true);
  });

  it('matches by value', () => {
    expect(canPlayCard(BLUE_5, RED_5, 'red', [BLUE_5])).toBe(true);
  });

  it('rejects mismatched color and value', () => {
    expect(canPlayCard(GREEN_7, RED_5, 'red', [GREEN_7])).toBe(false);
  });

  it('wild is always playable', () => {
    expect(canPlayCard(WILD, GREEN_7, 'green', [WILD])).toBe(true);
  });

  it('wild4 is legal when hand has no matching color', () => {
    expect(canPlayCard(WILD4, RED_5, 'red', [WILD4, BLUE_5])).toBe(true);
  });

  it('wild4 is illegal when hand has a card matching current color', () => {
    expect(canPlayCard(WILD4, RED_5, 'red', [WILD4, RED_3])).toBe(false);
  });
});

// ── getPlayableCards ──────────────────────────────────────────────────────────

describe('getPlayableCards', () => {
  it('returns only legally playable cards from a hand', () => {
    const hand = [RED_5, BLUE_5, GREEN_7, WILD];
    const playable = getPlayableCards(hand, RED_5, 'red');
    expect(playable.map(c => c.id)).toEqual(
      expect.arrayContaining(['r5', 'b5', 'w1'])
    );
    expect(playable.find(c => c.id === 'g7')).toBeUndefined();
  });

  it('returns empty array when nothing can be played', () => {
    const hand = [GREEN_7];
    expect(getPlayableCards(hand, RED_5, 'red')).toHaveLength(0);
  });
});

// ── getNextPlayerIndex ────────────────────────────────────────────────────────

describe('getNextPlayerIndex', () => {
  it('advances clockwise', () => {
    expect(getNextPlayerIndex(0, 1, 4)).toBe(1);
  });

  it('wraps around at the end', () => {
    expect(getNextPlayerIndex(3, 1, 4)).toBe(0);
  });

  it('advances counter-clockwise', () => {
    expect(getNextPlayerIndex(0, -1, 4)).toBe(3);
  });

  it('skips one player when skip=true', () => {
    expect(getNextPlayerIndex(0, 1, 4, true)).toBe(2);
  });
});

// ── getCardPoints ─────────────────────────────────────────────────────────────

describe('getCardPoints', () => {
  it('number cards are worth face value', () => {
    expect(getCardPoints(RED_5)).toBe(5);
  });

  it('wild4 is worth 50', () => {
    expect(getCardPoints(WILD4)).toBe(50);
  });

  it('wild is worth 20', () => {
    expect(getCardPoints(WILD)).toBe(20);
  });

  it('action cards are worth 20', () => {
    expect(getCardPoints(card('s1', 'red', 'skip'))).toBe(20);
    expect(getCardPoints(card('d1', 'blue', 'draw2'))).toBe(20);
    expect(getCardPoints(card('rv', 'green', 'reverse'))).toBe(20);
  });

  it('number card 0 is worth 0 points', () => {
    expect(getCardPoints(card('r0', 'red', '0'))).toBe(0);
  });
});
