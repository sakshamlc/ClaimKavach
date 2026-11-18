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
  parseGstRateToBasisPoints,
  calculateGstAdjustedPaise,
  roundHalfUp,
  assertSafePaise,
  CurrencyError,
} from '../../src/lib/audit/currency';

describe('Trust Zone Currency & Integer Paise Arithmetic', () => {
  describe('1. Policy Specification Parsing Tests', () => {
    it('rejects "12.345" with more than 2 decimal places with CurrencyError', () => {
      expect(() => parseCurrencyToPaise('12.345')).toThrow(CurrencyError);
      expect(() => parseCurrencyToPaise('100.505')).toThrow(CurrencyError);
      expect(() => parseCurrencyToPaise(12.345)).toThrow(CurrencyError);
    });

    it('parses "12.5" by expanding 1 decimal place to 50 paise -> 1250 paise (₹12.50)', () => {
      expect(parseCurrencyToPaise('12.5')).toBe(1250);
      expect(fromPaise(parseCurrencyToPaise('12.5')!)).toBe(12.5);
    });

    it('parses ".50" with leading dot and no integer part -> 50 paise (₹0.50)', () => {
      expect(parseCurrencyToPaise('.50')).toBe(50);
      expect(fromPaise(parseCurrencyToPaise('.50')!)).toBe(0.5);
    });

    it('rejects scientific notation strings like "1e3" with CurrencyError', () => {
      expect(() => parseCurrencyToPaise('1e3')).toThrow(CurrencyError);
      expect(() => parseCurrencyToPaise('2.5e4')).toThrow(CurrencyError);
      expect(() => parseCurrencyToPaise('1E6')).toThrow(CurrencyError);
    });

    it('parses accounting parentheses "(100.00)" as negative amount -> -10000 paise (-₹100.00)', () => {
      expect(parseCurrencyToPaise('(100.00)')).toBe(-10000);
      expect(parseCurrencyToPaise('(₹ 100.00)')).toBe(-10000);
      expect(parseCurrencyToPaise('(Rs. 1,450.50)')).toBe(-145050);
      expect(fromPaise(parseCurrencyToPaise('(100.00)')!)).toBe(-100);
    });

    it('returns NULL for empty strings, whitespace, null, undefined, or "N/A" (treated as NOT_CHECKED, never 0)', () => {
      expect(parseCurrencyToPaise('')).toBeNull();
      expect(parseCurrencyToPaise('   ')).toBeNull();
      expect(parseCurrencyToPaise(null)).toBeNull();
      expect(parseCurrencyToPaise(undefined)).toBeNull();
      expect(parseCurrencyToPaise('N/A')).toBeNull();
      expect(parseCurrencyToPaise('NULL')).toBeNull();
      expect(parseCurrencyToPaise('-')).toBeNull();
    });
  });

  describe('2. String-Based Parsing with ZERO Float Multiplication', () => {
    it('parses formatted Indian currency strings with no float drift', () => {
      // 1,23,456.50 should parse to 12345650 paise exactly
      expect(parseCurrencyToPaise('1,23,456.50')).toBe(12345650);
      expect(parseCurrencyToPaise('₹ 1,23,456.50')).toBe(12345650);
      expect(parseCurrencyToPaise('Rs. 1,23,456.50')).toBe(12345650);
      expect(parseCurrencyToPaise('INR 99,99,999.99')).toBe(999999999);
      expect(parseCurrencyToPaise('500')).toBe(50000);
      expect(parseCurrencyToPaise('500.05')).toBe(50005);
      expect(parseCurrencyToPaise('-Rs. 1,450.75')).toBe(-145075);
    });
  });

  describe('3. Integer Round-Half-Up Policy', () => {
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

  describe('4. Fractional Quantity Handling (Scaled via Decimal String, Zero Float Math)', () => {
    it('scales fractional quantities (1.5 days, 0.25 units) using exact integer ratio', () => {
      // 1.5 days of room rent at ₹5,600.00 (560000 paise)
      // Quantity "1.5" -> numerator 15, denominator 10 -> roundHalfUp(560000 * 15, 10) = 840000 paise
      const roomRate = toPaise(5600)!;
      expect(multiplyPaiseByQuantity(roomRate, 1.5)).toBe(840000);
      expect(multiplyPaiseByQuantity(roomRate, '1.5')).toBe(840000);
      expect(fromPaise(multiplyPaiseByQuantity(roomRate, 1.5))).toBe(8400);

      // 0.25 hours of anesthesia at ₹10,000.00 (1000000 paise) -> 250000 paise
      const anesthesiaRate = toPaise(10000)!;
      expect(multiplyPaiseByQuantity(anesthesiaRate, 0.25)).toBe(250000);
      expect(multiplyPaiseByQuantity(anesthesiaRate, '0.25')).toBe(250000);

      // Sub-paise rounds half-up: ₹10.33 (1033 paise) * 1.5 = 1549.5 -> 1550 paise
      expect(multiplyPaiseByQuantity(1033, 1.5)).toBe(1550);
    });

    it('handles zero quantity and zero rate', () => {
      expect(multiplyPaiseByQuantity(50000, 0)).toBe(0);
      expect(multiplyPaiseByQuantity(0, 10)).toBe(0);
    });
  });

  describe('5. Rejection of NaN, Infinity, and Unsafe Integers', () => {
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

  describe('6. Formatting and Arithmetic Integrity', () => {
    it('formats into Indian Rupee notation (lakhs & crores)', () => {
      expect(formatINR(0)).toBe('₹0.00');
      expect(formatINR(50050)).toBe('₹500.50');
      expect(formatINR(12345678)).toBe('₹1,23,456.78'); // 1.23 lakh
      expect(formatINR(1234567800)).toBe('₹1,23,45,678.00'); // 1.23 crore
      expect(formatINR(-50000)).toBe('-₹500.00');
      expect(formatINR(50050, false)).toBe('500.50');
    });

    it('performs pure integer addition and subtraction', () => {
      const sum = addPaise(toPaise(100.5)!, toPaise(200.25)!, toPaise(300.25)!);
      expect(sum).toBe(60100);
      expect(fromPaise(sum)).toBe(601.0);

      const diff = subtractPaise(toPaise(1000)!, toPaise(250.75)!);
      expect(diff).toBe(74925);
    });

    it('calculates percentages in integer paise', () => {
      // 18% GST on ₹5,000.00
      expect(calculatePercentagePaise(toPaise(5000)!, 18)).toBe(90000);
      // 1% of ₹5,00,000
      expect(calculatePercentagePaise(toPaise(500000)!, 1)).toBe(500000);
      // Decimal percentage: 2.5% on ₹1,000.00 = ₹25.00
      expect(calculatePercentagePaise(toPaise(1000)!, 2.5)).toBe(2500);
    });
  });

  describe('7. GST Basis Points and Integer Adjustment (Zero Float Math)', () => {
    it('parses GST rates into basis points integers', () => {
      expect(parseGstRateToBasisPoints(5)).toBe(500);
      expect(parseGstRateToBasisPoints(12)).toBe(1200);
      expect(parseGstRateToBasisPoints(18)).toBe(1800);
      expect(parseGstRateToBasisPoints(0.25)).toBe(25);
      expect(parseGstRateToBasisPoints('18%')).toBe(1800);
      expect(parseGstRateToBasisPoints('0.25%')).toBe(25);
      expect(parseGstRateToBasisPoints(null)).toBeNull();
      expect(parseGstRateToBasisPoints(undefined)).toBeNull();
    });

    it('computes GST adjusted benchmark using integer half-up on 1010p edge cases', () => {
      // 1010p at 5% (500 bps): 1010 * 10500 / 10000 = 10605000 / 10000 = 1060.5 -> 1061p
      expect(calculateGstAdjustedPaise(1010, 500)).toBe(1061);

      // 1010p at 12% (1200 bps): 1010 * 11200 / 10000 = 11312000 / 10000 = 1131.2 -> 1131p
      expect(calculateGstAdjustedPaise(1010, 1200)).toBe(1131);

      // 1010p at 18% (1800 bps): 1010 * 11800 / 10000 = 11918000 / 10000 = 1191.8 -> 1192p
      expect(calculateGstAdjustedPaise(1010, 1800)).toBe(1192);

      // 1010p at 0.25% (25 bps): 1010 * 10025 / 10000 = 10125250 / 10000 = 1012.525 -> 1013p
      expect(calculateGstAdjustedPaise(1010, 25)).toBe(1013);
    });
  });
});
