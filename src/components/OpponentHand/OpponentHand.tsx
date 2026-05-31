import React from 'react';
import type { Player } from '../../types/game';
import { useTranslation } from '../../i18n/LanguageContext';
import './OpponentHand.css';

interface OpponentHandProps {
  player: Player;
  isCurrentPlayer: boolean;
}

const OpponentHand: React.FC<OpponentHandProps> = ({ player, isCurrentPlayer }) => {
  const { lang } = useTranslation();
  const cardCount = player.hand.length;

  return (
    <div className={`opponent-hand ${isCurrentPlayer ? 'opponent-hand-active' : ''}`}>
      <div className="opponent-info">
        <span className="opponent-name">
          {player.type === 'ai' ? '🤖 ' : '👤 '}
          {player.name}
        </span>
        <span className="opponent-card-count">{lang.game.cards(cardCount)}</span>
        {isCurrentPlayer && <span className="opponent-turn-badge">{lang.game.thinking}</span>}
        {player.hasCalledUno && cardCount === 1 && (
          <span className="opponent-uno-badge">{lang.game.uno}</span>
        )}
      </div>

      <div className="opponent-cards">
        {Array.from({ length: Math.min(cardCount, 12) }).map((_, i) => (
          <div
            key={i}
            className="opponent-card-back"
            style={{ '--card-index': i } as React.CSSProperties}
          />
        ))}
        {cardCount > 12 && (
          <span className="opponent-overflow">+{cardCount - 12}</span>
        )}
      </div>
    </div>
  );
};

export default OpponentHand;
