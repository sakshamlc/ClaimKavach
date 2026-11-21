import { describe, it, expect } from 'vitest';
import {
  formatPaiseForSpeech,
  integerRupeesToEnglishWords,
  integerRupeesToHindiWords,
} from '@/lib/listen/numberToWords';

describe('numberToWords: Integer Currency Speech Formatter', () => {
  describe('English Spoken Currency', () => {
    it('1. Formats zero paise correctly', () => {
      expect(formatPaiseForSpeech(0, 'en')).toBe('zero rupees');
    });

    it('2. Formats pure paise fractions without rupees', () => {
      expect(formatPaiseForSpeech(50, 'en')).toBe('fifty paise');
      expect(formatPaiseForSpeech(1, 'en')).toBe('one paisa');
      expect(formatPaiseForSpeech(25, 'en')).toBe('twenty-five paise');
      expect(formatPaiseForSpeech(99, 'en')).toBe('ninety-nine paise');
    });

    it('3. Formats exact single rupee and plural rupees', () => {
      expect(formatPaiseForSpeech(100, 'en')).toBe('one rupee');
      expect(formatPaiseForSpeech(200, 'en')).toBe('two rupees');
      expect(formatPaiseForSpeech(1500, 'en')).toBe('fifteen rupees');
    });

    it('4. Formats rupees and paise combinations', () => {
      expect(formatPaiseForSpeech(1050, 'en')).toBe('ten rupees and fifty paise');
      expect(formatPaiseForSpeech(101, 'en')).toBe('one rupee and one paisa');
      expect(formatPaiseForSpeech(125025, 'en')).toBe('one thousand two hundred fifty rupees and twenty-five paise');
    });

    it('5. Formats thousands, lakhs, and crores accurately', () => {
      // 12,500 rupees = 1250000 paise
      expect(formatPaiseForSpeech(1250000, 'en')).toBe('twelve thousand five hundred rupees');

      // 1 Lakh rupees = 10,000,000 paise
      expect(formatPaiseForSpeech(10000000, 'en')).toBe('one lakh rupees');

      // 5 Lakh 40 Thousand rupees = 54,000,000 paise
      expect(formatPaiseForSpeech(54000000, 'en')).toBe('five lakh forty thousand rupees');

      // 1 Crore rupees = 1,000,000,000 paise
      expect(formatPaiseForSpeech(1000000000, 'en')).toBe('one crore rupees');
    });

    it('6. Handles negative amounts safely', () => {
      expect(formatPaiseForSpeech(-5000, 'en')).toBe('negative fifty rupees');
    });
  });

  describe('Hindi Spoken Currency', () => {
    it('1. Formats zero paise in Hindi', () => {
      expect(formatPaiseForSpeech(0, 'hi')).toBe('शून्य रुपये');
    });

    it('2. Formats pure paise in Hindi', () => {
      expect(formatPaiseForSpeech(50, 'hi')).toBe('पचास पैसे');
      expect(formatPaiseForSpeech(1, 'hi')).toBe('एक पैसा');
      expect(formatPaiseForSpeech(25, 'hi')).toBe('पच्चीस पैसे');
    });

    it('3. Formats single and multiple rupees in Hindi', () => {
      expect(formatPaiseForSpeech(100, 'hi')).toBe('एक रुपया');
      expect(formatPaiseForSpeech(500, 'hi')).toBe('पाँच रुपये');
      expect(formatPaiseForSpeech(100000, 'hi')).toBe('एक हज़ार रुपये');
    });

    it('4. Formats combinations of rupees and paise in Hindi', () => {
      expect(formatPaiseForSpeech(1050, 'hi')).toBe('दस रुपये पचास पैसे');
      expect(formatPaiseForSpeech(101, 'hi')).toBe('एक रुपया एक पैसा');
      expect(formatPaiseForSpeech(1250000, 'hi')).toBe('बारह हज़ार पाँच सौ रुपये');
    });

    it('5. Formats Lakhs and Crores in Hindi', () => {
      // 1 Lakh rupees = 10,000,000 paise
      expect(formatPaiseForSpeech(10000000, 'hi')).toBe('एक लाख रुपये');

      // 1 Crore rupees = 1,000,000,000 paise
      expect(formatPaiseForSpeech(1000000000, 'hi')).toBe('एक करोड़ रुपये');
    });
  });
});
