import React from 'react';
import type { Player } from '../../types/game';
import { useTranslation } from '../../i18n/LanguageContext';
import './PassDevice.css';

interface PassDeviceProps {
  player: Player;
  onReveal: () => void;
}

const PassDevice: React.FC<PassDeviceProps> = ({ player, onReveal }) => {
  const { lang } = useTranslation();
  return (
    <div className="pass-device-overlay" onClick={onReveal}>
      <div className="pass-device-content">
        <div className="pass-device-icon">👤</div>
        <h2 className="pass-device-name">{lang.passDevice.title(player.name)}</h2>
        <p className="pass-device-instruction">
          {lang.passDevice.instruction(player.name)}
        </p>
        <button className="pass-device-btn" onClick={onReveal}>
          {lang.passDevice.reveal}
        </button>
      </div>
    </div>
  );
};

export default PassDevice;
