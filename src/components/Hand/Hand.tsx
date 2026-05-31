import React from 'react';
import type { Card as CardType } from '../../types/game';
import Card from '../Card/Card';
import './Hand.css';

interface HandProps {
  cards: CardType[];
  playableCardIds: Set<string>;
  /** ID of the drawn card (in drawn-card phase — only this card can be played). */
  drawnCardId?: string | null;
  onPlayCard: (card: CardType) => void;
}

/**
 * Renders the current human player's full hand of cards.
 *
 * During the drawn-card phase, only the drawn card is highlighted as playable;
 * all other cards are dimmed to signal they cannot be played.
 */
const Hand: React.FC<HandProps> = ({ cards, playableCardIds, drawnCardId, onPlayCard }) => {
  const isDrawnCardPhase = drawnCardId != null;

  return (
    <div className="hand" role="list" aria-label="Your hand">
      {cards.map((card) => {
        // In drawn-card phase: only the drawn card is playable
        const isPlayable = isDrawnCardPhase
          ? card.id === drawnCardId
          : playableCardIds.has(card.id);

        const isSelected = card.id === drawnCardId;

        return (
          <div key={card.id} className="hand-card-wrapper" role="listitem">
            <Card
              card={card}
              isPlayable={isPlayable}
              isSelected={isSelected}
              onClick={isPlayable ? () => onPlayCard(card) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Hand;
