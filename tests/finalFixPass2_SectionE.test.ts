import { describe, it, expect } from 'vitest';
import { en } from '../src/lib/i18n/en';
import { hi } from '../src/lib/i18n/hi';
import { mr } from '../src/lib/i18n/mr';

describe('Final Fix Pass 2 - Section E: Honest Wording Scanner', () => {
  const BANNED_PATTERNS = [
    /\bwill reject\b/i,
    /\bwill be rejected\b/i,
    /\bguaranteed\b/i,
    /\billegal\b/i,
    /\bAll documents match\b/i,
    /\bReady to Apply\b/i,
    /\bNOT enough\b/, // Case-sensitive or insensitive
    /निश्चित रूप से/i,
    /निश्चितपणे/i,
  ];

  it('1. ensures no banned phrases exist in en.ts, hi.ts, or mr.ts', () => {
    const dictionaries = { en, hi, mr };

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

  it('2. verifies zero-findings strings conform to honest wording requirements', () => {
    // EN
    expect(en.status_ready).toBe('Ready');
    expect(en.status_ready_desc).toBe('We checked name, date of birth and PAN details across your documents.');
    expect(en.disclaimer).toContain('This is a check and guide, not an official verification');

    // HI
    expect(hi.status_ready).toBe('तैयार');
    expect(hi.status_ready_desc).toContain('जांच की');

    // MR
    expect(mr.status_ready).toBe('सज्ज');
    expect(mr.status_ready_desc).toContain('तपासले');
  });
});
