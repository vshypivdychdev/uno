/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { uk } from './uk';
import { en } from './en';
import type { Translations } from './uk';

type LangCode = 'uk' | 'en';

const LANGS: Record<LangCode, Translations> = { uk, en };
const STORAGE_KEY = 'uno-lang';

function getInitialLang(): LangCode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'uk' || saved === 'en') return saved;
  return 'uk';
}

interface LanguageContextValue {
  lang: Translations;
  langCode: LangCode;
  setLang: (code: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [langCode, setLangCode] = useState<LangCode>(getInitialLang);

  function setLang(code: LangCode) {
    setLangCode(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  return (
    <LanguageContext.Provider value={{ lang: LANGS[langCode], langCode, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
