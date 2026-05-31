import type { Card, CardColor } from '../types/game';

/**
 * Determines whether a card can legally be played on the current discard pile.
 *
 * Official rules:
 * - Wild always playable.
 * - Wild Draw Four only playable when the player has no cards matching the current color.
 * - Any other card must match the current color OR the top card's value/type.
 */
export function canPlayCard(
  card: Card,
  topCard: Card,
  currentColor: CardColor,
  playerHand: Card[],
): boolean {
  if (card.value === 'wild4') {
    // Legal only if no other card in hand matches the current color
    const hasMatchingColor = playerHand.some(
      (c) => c.id !== card.id && c.color === currentColor,
    );
    return !hasMatchingColor;
  }

  if (card.color === 'wild') return true;

  return card.color === currentColor || card.value === topCard.value;
}

/** Returns all cards in a hand that can legally be played. */
export function getPlayableCards(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
): Card[] {
  return hand.filter((card) => canPlayCard(card, topCard, currentColor, hand));
}

/**
 * Calculates the next player's index given the current direction.
 * @param skip - If true, advances by 2 steps (skipping one player).
 */
export function getNextPlayerIndex(
  currentIndex: number,
  direction: 1 | -1,
  playerCount: number,
  skip = false,
): number {
  const steps = skip ? 2 : 1;
  return ((currentIndex + direction * steps) % playerCount + playerCount) % playerCount;
}

/** Point value of a card for end-of-game scoring. */
export function getCardPoints(card: Card): number {
  if (card.value === 'wild4') return 50;
  if (card.value === 'wild') return 20;
  if (['skip', 'reverse', 'draw2'].includes(card.value)) return 20;
  return parseInt(card.value, 10);
}
