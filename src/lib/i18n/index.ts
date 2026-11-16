'use client';

import { useAppStore, Language } from '../store';
import { en, TranslationKey } from './en';
import { hi } from './hi';
import { mr } from './mr';

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  hi,
  mr,
};

/**
 * Returns translation for a key in the given language, falling back to English.
 */
export function getTranslation(key: string, lang: Language): string {
  const dict = dictionaries[lang] || en;
  const translation = (dict as any)[key] || (en as any)[key];
  if (!translation) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing key: "${key}" for lang: "${lang}"`);
    }
    return key;
  }
  return translation;
}

/**
 * React hook to access translations in current language.
 */
export function useTranslation() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const t = (key: string): string => {
    return getTranslation(key, language);
  };

  return { t, language, setLanguage };
}
