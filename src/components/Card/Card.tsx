import React from 'react';
import type { Card as CardType, CardColor } from '../../types/game';
import './Card.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALUE_SYMBOL: Partial<Record<string, string>> = {
  skip:    '⊘',
  reverse: '↺',
  draw2:   '+2',
  wild:    '★',
  wild4:   '+4★',
};

function getSymbol(value: string): string {
  return VALUE_SYMBOL[value] ?? value;
}

const COLOR_BG: Record<CardColor, string> = {
  red:    '#dc2626',
  green:  '#16a34a',
  blue:   '#2563eb',
  yellow: '#ca8a04',
  wild:   'linear-gradient(135deg, #dc2626 25%, #2563eb 25% 50%, #16a34a 50% 75%, #ca8a04 75%)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CardProps {
  card: CardType;
  /** Highlights the card as a legal play. */
  isPlayable?: boolean;
  /** Visual selection state (e.g. the drawn card in drawn-card phase). */
  isSelected?: boolean;
  /** Renders the card face-down (for opponents). */
  faceDown?: boolean;
  /** Smaller size variant used for opponent hands. */
  small?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  card,
  isPlayable = false,
  isSelected = false,
  faceDown = false,
  small = false,
  onClick,
}) => {
  if (faceDown) {
    return (
      <div className={`card card-back ${small ? 'card-small' : ''}`} onClick={onClick}>
        <span className="card-back-text">UNO</span>
      </div>
    );
  }

  const symbol = getSymbol(card.value);
  const bg = COLOR_BG[card.color];
  const isBackground = card.color === 'wild';

  const classes = [
    'card',
    isPlayable  ? 'card-playable'     : '',
    isSelected  ? 'card-selected'     : '',
    !isPlayable && onClick ? 'card-disabled' : '',
    small       ? 'card-small'        : '',
  ].filter(Boolean).join(' ');

  const style: React.CSSProperties = isBackground
    ? { background: bg }
    : { backgroundColor: bg };

  return (
    <div
      className={classes}
      style={style}
      onClick={isPlayable ? onClick : undefined}
      role={isPlayable ? 'button' : undefined}
      aria-label={`${card.color} ${card.value}`}
      tabIndex={isPlayable ? 0 : undefined}
      onKeyDown={isPlayable && onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span className="card-corner card-corner-tl">{symbol}</span>
      <div className="card-oval">
        <span className="card-center-symbol">{symbol}</span>
      </div>
      <span className="card-corner card-corner-br">{symbol}</span>
    </div>
  );
};

export default Card;
