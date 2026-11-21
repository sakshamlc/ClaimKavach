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
    expect(claimTranslations.en.consentText).toContain("ClaimKavach doesn't store your bill");
    expect(claimTranslations.en.consentText).toContain('the file is sent to Google Gemini for reading');
    expect(claimTranslations.en.consentText).toContain('the audit runs on your device');
    expect(claimTranslations.en.consentText).toContain(
      "A Gemini key you type passes through the ClaimKavach server to Google and isn't stored or logged"
    );
    expect(claimTranslations.en.bannerMemory).toBe("We don't store your bill. Reading uses Google Gemini.");

    // HI
    expect(claimTranslations.hi.consentText).toContain('उपभोक्ता जागरूकता');
    expect(claimTranslations.hi.consentText).toContain('क्लेमकवच आपके बिल को संग्रहीत नहीं करता है');
    expect(claimTranslations.hi.consentText).toContain('फ़ाइल पढ़ने के लिए Google Gemini को भेजी जाती है');
    expect(claimTranslations.hi.consentText).toContain('ऑडिट आपके डिवाइस पर चलता है');
    expect(claimTranslations.hi.consentText).toContain('ClaimKavach सर्वर के माध्यम से Google को भेजी जाती है और इसे संग्रहीत या लॉग नहीं किया जाता है');
    expect(claimTranslations.hi.bannerMemory).toBe('हम आपका बिल सहेजते नहीं हैं। पढ़ने के लिए Google Gemini का उपयोग होता है।');
  });
});
