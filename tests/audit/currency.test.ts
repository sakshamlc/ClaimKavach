import { describe, it, expect } from 'vitest';
import {
  toPaise,
  fromPaise,
  formatINR,
  addPaise,
  subtractPaise,
  multiplyPaiseByQuantity,
  calculatePercentagePaise,
  parseCurrencyToPaise,
  roundHalfUp,
  assertSafePaise,
  CurrencyError,
} from '../../src/lib/audit/currency';

describe('Trust Zone Currency & Integer Paise Arithmetic', () => {
  describe('1. String-Based Parsing with ZERO Float Multiplication', () => {
    it('parses formatted Indian currency strings with no float drift', () => {
      // 1,23,456.50 should parse to 12345650 paise exactly
      expect(parseCurrencyToPaise('1,23,456.50')).toBe(12345650);
      expect(parseCurrencyToPaise('₹ 1,23,456.50')).toBe(12345650);
      expect(parseCurrencyToPaise('Rs. 1,23,456.50')).toBe(12345650);
      expect(parseCurrencyToPaise('INR 99,99,999.99')).toBe(999999999);
      expect(parseCurrencyToPaise('500')).toBe(50000);
      expect(parseCurrencyToPaise('500.5')).toBe(50050);
      expect(parseCurrencyToPaise('500.05')).toBe(50005);
      expect(parseCurrencyToPaise('-Rs. 1,450.75')).toBe(-145075);
    });

    it('handles decimal fractions with integer round-half-up on sub-paise values', () => {
      // 3 decimal places: .505 -> 51 paise, .504 -> 50 paise
      expect(parseCurrencyToPaise('100.505')).toBe(10051);
      expect(parseCurrencyToPaise('100.504')).toBe(10050);
    });

    it('handles empty and dirty strings gracefully', () => {
      expect(parseCurrencyToPaise(null)).toBe(0);
      expect(parseCurrencyToPaise(undefined)).toBe(0);
      expect(parseCurrencyToPaise('')).toBe(0);
      expect(parseCurrencyToPaise('   ')).toBe(0);
      expect(parseCurrencyToPaise('N/A')).toBe(0);
    });
  });

  describe('2. Integer Round-Half-Up Policy', () => {
    it('rounds exact halves away from zero', () => {
      // 1 / 2 = 0.5 -> 1
      expect(roundHalfUp(1, 2)).toBe(1);
      // 3 / 2 = 1.5 -> 2
      expect(roundHalfUp(3, 2)).toBe(2);
      // -1 / 2 = -0.5 -> -1
      expect(roundHalfUp(-1, 2)).toBe(-1);
      // -3 / 2 = -1.5 -> -2
      expect(roundHalfUp(-3, 2)).toBe(-2);
      // 4 / 2 = 2
      expect(roundHalfUp(4, 2)).toBe(2);
      // 1 / 3 = 0.333 -> 0
      expect(roundHalfUp(1, 3)).toBe(0);
      // 2 / 3 = 0.666 -> 1
      expect(roundHalfUp(2, 3)).toBe(1);
    });

    it('throws CurrencyError on division by zero', () => {
      expect(() => roundHalfUp(100, 0)).toThrow(CurrencyError);
    });
  });

  describe('3. Fractional Quantity Handling', () => {
    it('scales fractional quantities (e.g. 1.5 days, 0.25 units) with exact integer ratio', () => {
      // 1.5 days of room rent at ₹5,600.00 (560000 paise) = ₹8,400.00 (840000 paise)
      const roomRate = toPaise(5600);
      expect(multiplyPaiseByQuantity(roomRate, 1.5)).toBe(840000);
      expect(fromPaise(multiplyPaiseByQuantity(roomRate, 1.5))).toBe(8400);

      // 0.25 hours of anesthesia at ₹10,000.00 (1000000 paise) = ₹2,500.00 (250000 paise)
      const anesthesiaRate = toPaise(10000);
      expect(multiplyPaiseByQuantity(anesthesiaRate, 0.25)).toBe(250000);

      // Fractional sub-paise rounds half-up: ₹10.33 (1033 paise) * 1.5 = 1549.5 -> 1550 paise
      expect(multiplyPaiseByQuantity(1033, 1.5)).toBe(1550);
    });

    it('handles zero quantity and zero rate', () => {
      expect(multiplyPaiseByQuantity(50000, 0)).toBe(0);
      expect(multiplyPaiseByQuantity(0, 10)).toBe(0);
    });
  });

  describe('4. Rejection of NaN, Infinity, and Unsafe Integers', () => {
    it('throws CurrencyError on NaN or Infinity in paise assertions', () => {
      expect(() => assertSafePaise(NaN)).toThrow(CurrencyError);
      expect(() => assertSafePaise(Infinity)).toThrow(CurrencyError);
      expect(() => assertSafePaise(-Infinity)).toThrow(CurrencyError);
      expect(() => assertSafePaise(100.5)).toThrow(CurrencyError); // Non-integer paise
    });

    it('throws CurrencyError on numbers exceeding MAX_SAFE_INTEGER', () => {
      const unsafe = Number.MAX_SAFE_INTEGER + 1000;
      expect(() => assertSafePaise(unsafe)).toThrow(CurrencyError);
      expect(() => addPaise(Number.MAX_SAFE_INTEGER, 1)).toThrow(CurrencyError);
    });

    it('throws CurrencyError on NaN/Infinity in operations', () => {
      expect(() => multiplyPaiseByQuantity(500, NaN)).toThrow(CurrencyError);
      expect(() => calculatePercentagePaise(500, NaN)).toThrow(CurrencyError);
      expect(() => parseCurrencyToPaise(NaN)).toThrow(CurrencyError);
      expect(() => parseCurrencyToPaise(Infinity)).toThrow(CurrencyError);
    });
  });

  describe('5. Formatting and Arithmetic Integrity', () => {
    it('formats into Indian Rupee notation (lakhs & crores)', () => {
      expect(formatINR(0)).toBe('₹0.00');
      expect(formatINR(50050)).toBe('₹500.50');
      expect(formatINR(12345678)).toBe('₹1,23,456.78'); // 1.23 lakh
      expect(formatINR(1234567800)).toBe('₹1,23,45,678.00'); // 1.23 crore
      expect(formatINR(-50000)).toBe('-₹500.00');
      expect(formatINR(50050, false)).toBe('500.50');
    });

    it('performs pure integer addition and subtraction', () => {
      const sum = addPaise(toPaise(100.5), toPaise(200.25), toPaise(300.25));
      expect(sum).toBe(60100);
      expect(fromPaise(sum)).toBe(601.0);

      const diff = subtractPaise(toPaise(1000), toPaise(250.75));
      expect(diff).toBe(74925);
    });

    it('calculates percentages in integer paise', () => {
      // 18% GST on ₹5,000.00
      expect(calculatePercentagePaise(toPaise(5000), 18)).toBe(90000);
      // 1% of ₹5,00,000
      expect(calculatePercentagePaise(toPaise(500000), 1)).toBe(500000);
      // Decimal percentage: 2.5% on ₹1,000.00 = ₹25.00
      expect(calculatePercentagePaise(toPaise(1000), 2.5)).toBe(2500);
    });
  });
});
