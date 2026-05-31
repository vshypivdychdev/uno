import React from 'react';
import type { OpponentView } from '../../types/multiplayer';
import { useTranslation } from '../../i18n/LanguageContext';
import './OpponentCard.css';

interface OpponentCardProps {
  opponent: OpponentView;
  isCurrent: boolean;
  isNext: boolean;
  isPrev: boolean;
}

const OpponentCard: React.FC<OpponentCardProps> = ({ opponent, isCurrent, isNext, isPrev }) => {
  const { lang } = useTranslation();
  const isOut = !opponent.isConnected;

  const classes = [
    'mp-opponent',
    isCurrent ? 'mp-opponent--current' : '',
    isNext && !isCurrent ? 'mp-opponent--next' : '',
    isPrev && !isCurrent ? 'mp-opponent--prev' : '',
    isOut ? 'mp-opponent--out' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <span className="mp-opponent-name">
        {isCurrent && !isOut ? '▶ ' : ''}
        {opponent.name}
        {isOut && ` ${lang.game.left}`}
        {opponent.hasCalledUno && !isOut && ' 🔔'}
      </span>
      <span className="mp-opponent-count">
        {lang.game.cards(opponent.handSize)}
      </span>
    </div>
  );
};

export default OpponentCard;
