import { describe, it, expect } from 'vitest';
import { claimTranslations } from '../src/lib/claimI18n';

describe('Final Fix Pass 2 - Section E: Honest Wording Scanner', () => {
  const BANNED_PATTERNS = [
    /\bwill reject\b/i,
    /\bwill be rejected\b/i,
    /\bguaranteed\b/i,
    /\billegal\b/i,
    /\bAll documents match\b/i,
    /\bReady to Apply\b/i,
    /\bNOT enough\b/,
    /निश्चित रूप से/i,
    /निश्चितपणे/i,
  ];

  it('1. ensures no banned phrases exist in claimTranslations.en or claimTranslations.hi', () => {
    const dictionaries = {
      en: claimTranslations.en,
      hi: claimTranslations.hi,
    };

    for (const [lang, dict] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dict as Record<string, string>)) {
        for (const pattern of BANNED_PATTERNS) {
          const match = pattern.test(value);
          expect(
            match,
            `Banned phrase matching ${pattern} found in ${lang}.${key}: "${value}"`
          ).toBe(false);
        }
      }
    }
  });

  it('2. verifies ClaimKavach strings conform to honest wording requirements', () => {
    // EN
    expect(claimTranslations.en.consentText).toContain('consumer awareness, not legal or insurance advice');
    expect(claimTranslations.en.bannerMemory).toContain('runs purely in browser memory');

    // HI
    expect(claimTranslations.hi.consentText).toContain('उपभोक्ता जागरूकता');
    expect(claimTranslations.hi.bannerMemory).toContain('पूरी तरह से ब्राउज़र मेमोरी में चलता है');
  });
});
