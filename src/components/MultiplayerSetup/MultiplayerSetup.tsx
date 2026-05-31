import React, { useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import './MultiplayerSetup.css';

type Tab = 'create' | 'join';

interface MultiplayerSetupProps {
  status: string;
  error: string | null;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
  onBack: () => void;
}

const MultiplayerSetup: React.FC<MultiplayerSetupProps> = ({
  status,
  error,
  onCreateRoom,
  onJoinRoom,
  onBack,
}) => {
  const { lang } = useTranslation();
  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const isBusy = status === 'creating-room' || status === 'joining-room';

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreateRoom(trimmed);
  }

  function handleJoin() {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName || trimmedCode.length !== 4) return;
    onJoinRoom(trimmedCode, trimmedName);
  }

  function handleCodeInput(value: string) {
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4));
  }

  return (
    <div className="mp-setup-screen">
      <div className="mp-setup-card">
        <button className="mp-back-btn" onClick={onBack}>{lang.setup.back}</button>

        <h1 className="mp-setup-title">{lang.setup.title}</h1>

        <div className="mp-switcher">
          <button
            className={`mp-switcher-btn ${tab === 'create' ? 'mp-switcher-btn--active' : ''}`}
            onClick={() => setTab('create')}
          >
            {lang.setup.createTab}
          </button>
          <button
            className={`mp-switcher-btn ${tab === 'join' ? 'mp-switcher-btn--active' : ''}`}
            onClick={() => setTab('join')}
          >
            {lang.setup.joinTab}
          </button>
        </div>

        <div className="mp-setup-form">
          <label className="mp-label">
            {lang.setup.nameLabel}
            <input
              className="mp-input"
              type="text"
              value={name}
              maxLength={20}
              placeholder={lang.setup.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { if (tab === 'create') handleCreate(); else handleJoin(); }
              }}
            />
          </label>

          {tab === 'join' && (
            <label className="mp-label">
              {lang.setup.codeLabel}
              <input
                className="mp-input mp-input--code"
                type="text"
                value={code}
                placeholder="ABCD"
                onChange={(e) => handleCodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
              />
            </label>
          )}

          {error && <p className="mp-error">{error}</p>}

          {tab === 'create' ? (
            <button
              className="mp-submit-btn"
              onClick={handleCreate}
              disabled={isBusy || !name.trim()}
            >
              {isBusy ? lang.setup.creating : lang.setup.createBtn}
            </button>
          ) : (
            <button
              className="mp-submit-btn"
              onClick={handleJoin}
              disabled={isBusy || !name.trim() || code.length !== 4}
            >
              {isBusy ? lang.setup.joining : lang.setup.joinBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerSetup;
