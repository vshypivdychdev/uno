import React, { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../../types/game';
import type { Translations } from '../../i18n/uk';
import { useTranslation } from '../../i18n/LanguageContext';
import './ActionLog.css';

interface ActionLogProps {
  entries: LogEntry[];
}

function renderEntry(lang: Translations, entry: LogEntry): string {
  switch (entry.type) {
    case 'game-started':           return lang.log.gameStarted(lang.cardLabel(entry.card));
    case 'starting-skip':          return lang.log.startingSkip(entry.playerName);
    case 'starting-reverse-skip':  return lang.log.startingReverseSkip;
    case 'direction-reversed-first': return lang.log.directionReversedFirst(entry.playerName);
    case 'starting-draw2':         return lang.log.startingDraw2(entry.playerName);
    case 'uno-penalty':            return lang.log.unoPenalty(entry.playerName);
    case 'card-played':            return lang.log.cardPlayed(entry.playerName, lang.cardLabel(entry.card));
    case 'player-wins':            return lang.log.playerWins(entry.playerName);
    case 'player-skipped':         return lang.log.playerSkipped(entry.playerName);
    case 'direction-reversed':     return lang.log.directionReversed;
    case 'plays-again':            return lang.log.playsAgain(entry.playerName);
    case 'player-draws-skipped':   return lang.log.playerDrawsSkipped(entry.playerName, entry.count);
    case 'color-chosen':           return lang.log.colorChosen(entry.playerName, lang.log.colorName(entry.color));
    case 'draw-pile-reshuffled':   return lang.log.drawPileReshuffled;
    case 'player-draws-card':      return lang.log.playerDrawsCard(entry.playerName);
    case 'player-cannot-play':     return lang.log.playerCannotPlay(entry.playerName);
    case 'player-passes':          return lang.log.playerPasses(entry.playerName);
    case 'uno-called':             return lang.log.unoCalled(entry.playerName);
    case 'draw-pile-empty':        return lang.log.drawPileEmpty;
  }
}

const ActionLog: React.FC<ActionLogProps> = ({ entries }) => {
  const { lang } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const modalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAll) {
      setTimeout(() => modalBottomRef.current?.scrollIntoView({ behavior: 'instant' }), 30);
    }
  }, [showAll]);

  const visible = entries.slice(-4);
  const hasMore = entries.length > 4;

  return (
    <>
      <div className="action-log" aria-live="polite" aria-label="Game log">
        {hasMore && (
          <button
            className="action-log-more"
            onClick={() => setShowAll(true)}
            aria-label="Show full game log"
          >
            ···
          </button>
        )}
        {visible.map((entry, i) => (
          <div key={entries.length - visible.length + i} className="action-log-entry">
            {renderEntry(lang, entry)}
          </div>
        ))}
      </div>

      {showAll && (
        <div className="action-log-overlay" onClick={() => setShowAll(false)}>
          <div className="action-log-modal" onClick={(e) => e.stopPropagation()}>
            <div className="action-log-modal-header">
              <button className="action-log-modal-close" onClick={() => setShowAll(false)}>×</button>
            </div>
            <div className="action-log-modal-entries">
              {entries.map((entry, i) => (
                <div key={i} className="action-log-entry">
                  {renderEntry(lang, entry)}
                </div>
              ))}
              <div ref={modalBottomRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActionLog;
