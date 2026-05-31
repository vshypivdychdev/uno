import React from 'react';
import type { CardColor } from '../../types/game';
import './ColorPicker.css';

const COLORS: { color: CardColor; label: string; emoji: string }[] = [
  { color: 'red',    label: 'Red',    emoji: '🔴' },
  { color: 'green',  label: 'Green',  emoji: '🟢' },
  { color: 'blue',   label: 'Blue',   emoji: '🔵' },
  { color: 'yellow', label: 'Yellow', emoji: '🟡' },
];

interface ColorPickerProps {
  onChoose: (color: CardColor) => void;
  playerName: string;
}

/**
 * Modal overlay prompting the current player to choose a color after
 * playing a Wild or Wild Draw Four card.
 */
const ColorPicker: React.FC<ColorPickerProps> = ({ onChoose, playerName }) => {
  return (
    <div className="color-picker-overlay" role="dialog" aria-modal="true" aria-label="Choose a color">
      <div className="color-picker-box">
        <h2 className="color-picker-title">{playerName}, choose a color</h2>
        <div className="color-picker-grid">
          {COLORS.map(({ color, label, emoji }) => (
            <button
              key={color}
              className={`color-btn color-btn-${color}`}
              onClick={() => onChoose(color)}
              aria-label={label}
            >
              <span className="color-btn-emoji">{emoji}</span>
              <span className="color-btn-label">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
