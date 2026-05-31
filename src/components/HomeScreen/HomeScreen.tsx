import React from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useTranslation } from '../../i18n/LanguageContext';
import './HomeScreen.css';

interface HomeScreenProps {
  onSolo: () => void;
  onMultiplayer: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onSolo, onMultiplayer }) => {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();
  const { lang, langCode, setLang } = useTranslation();

  return (
    <div className="home-screen">
      <div className="home-card">
        <button
          className="home-lang-toggle"
          onClick={() => setLang(langCode === 'uk' ? 'en' : 'uk')}
        >
          {langCode === 'uk' ? 'EN' : 'УК'}
        </button>

        <div className="home-logo">
          <span className="uno-logo">UNO</span>
        </div>

        <div className="home-actions">
          <button className="home-btn home-btn--solo" onClick={onSolo}>
            {lang.home.solo}
            <span className="home-btn-sub">{lang.home.soloSub}</span>
          </button>

          <button className="home-btn home-btn--multi" onClick={onMultiplayer}>
            {lang.home.together}
            <span className="home-btn-sub">{lang.home.togetherSub}</span>
          </button>
        </div>

        {canInstall && (
          <button className="install-btn" onClick={triggerInstall}>
            {lang.home.install}
          </button>
        )}
        {isInstalled && <p className="install-badge">{lang.home.installed}</p>}
      </div>
    </div>
  );
};

export default HomeScreen;
