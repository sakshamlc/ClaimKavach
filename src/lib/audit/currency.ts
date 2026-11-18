/**
 * Trust Zone Currency & Monetary Arithmetic
 *
 * All financial amounts are strictly represented and calculated in integer paise.
 * ₹1.00 = 100 paise.
 *
 * Design Guarantees & Specification Policies:
 * 1. String-based parsing with ZERO float multiplication:
 *    - "12.5"   -> 1 decimal digit; expanded to 50 paise -> 1250 paise (₹12.50).
 *    - ".50"    -> leading dot with no integer part -> 50 paise (₹0.50).
 *    - "(100.00)" -> accounting parentheses syntax indicating negative -> -10000 paise (-₹100.00).
 *    - "12.345" -> more than 2 decimal places is rejected with CurrencyError (sub-paise fractions not allowed on bills).
 *    - "1e3"    -> scientific notation in currency strings is rejected with CurrencyError.
 *    - "" / null / "   " / "N/A" -> returns NULL (missing/unbilled; rules treat as NOT_CHECKED, NEVER as 0).
 * 2. Integer-only round-half-up policy:
 *    - Ties (0.5) round away from zero (+0.5 -> +1, -0.5 -> -1).
 * 3. Fractional quantity handling:
 *    - Quantities like 1.5 days or 0.25 hours are converted to exact integer ratios
 *      (e.g. 1.5 -> 15/10, 0.25 -> 25/100) and scaled with roundHalfUp(unitPaise * num, den).
 *      No float multiplication is performed.
 * 4. Bounds checking:
 *    - Rejects NaN, Infinity, and values exceeding Number.MAX_SAFE_INTEGER.
 */

export class CurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyError';
  }
}

/**
 * Validates that an integer paise value is safe, finite, and within JavaScript integer limits.
 */
export function assertSafePaise(paise: number): void {
  if (typeof paise !== 'number' || isNaN(paise) || !isFinite(paise)) {
    throw new CurrencyError(`Invalid paise value: ${paise}. Must be a finite number.`);
  }
  if (!Number.isInteger(paise)) {
    throw new CurrencyError(`Paise value must be an integer, got: ${paise}`);
  }
  if (Math.abs(paise) > Number.MAX_SAFE_INTEGER) {
    throw new CurrencyError(`Paise value ${paise} exceeds Number.MAX_SAFE_INTEGER.`);
  }
}

/**
 * Integer round-half-up: rounds (numerator / denominator) to nearest integer.
 * Ties (e.g. 0.5) round away from zero (+0.5 -> +1, -0.5 -> -1).
 */
export function roundHalfUp(numerator: number, denominator: number): number {
  if (denominator === 0) {
    throw new CurrencyError('Division by zero in roundHalfUp.');
  }
  const isNegative = (numerator < 0) !== (denominator < 0);
  const absNum = Math.abs(numerator);
  const absDen = Math.abs(denominator);

  // Integer division with round-half-up: Math.floor((2 * absNum + absDen) / (2 * absDen))
  const quotient = Math.floor((2 * absNum + absDen) / (2 * absDen));
  return isNegative ? -quotient : quotient;
}

/**
 * Parses a rupee currency string directly into integer paise WITHOUT float multiplication.
 * Returns null for missing, empty, or unparseable non-numeric values like "N/A".
 * Throws CurrencyError for malformed strings, scientific notation, or > 2 decimal places.
 */
export function parseCurrencyToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      throw new CurrencyError(`Invalid numeric input: ${input}`);
    }
    if (Math.abs(input) * 100 > Number.MAX_SAFE_INTEGER) {
      throw new CurrencyError(`Amount exceeds MAX_SAFE_INTEGER: ${input}`);
    }
    const numStr = input.toString();
    const dotIdx = numStr.indexOf('.');
    if (dotIdx !== -1 && numStr.length - dotIdx - 1 > 2) {
      throw new CurrencyError(`Currency amount cannot have more than 2 decimal places, got: ${input}`);
    }
    return parseCurrencyToPaise(input.toFixed(2));
  }

  const raw = String(input).trim();
  if (raw === '' || raw.toUpperCase() === 'N/A' || raw.toUpperCase() === 'NULL' || raw === '-') {
    return null;
  }

  // Reject scientific notation in string currency inputs (e.g. "1e3", "2.5e4")
  if (/[eE]/.test(raw)) {
    throw new CurrencyError(`Scientific notation is not permitted in currency strings: "${raw}"`);
  }

  // Check for accounting parentheses indicating negative numbers: (100.00) or (₹ 100.00)
  let isNegative = false;
  let clean = raw;
  if (clean.startsWith('(') && clean.endsWith(')')) {
    isNegative = true;
    clean = clean.slice(1, -1).trim();
  } else if (clean.startsWith('-')) {
    isNegative = true;
    clean = clean.slice(1).trim();
  }

  // Strip currency prefixes (Rs., INR, ₹)
  clean = clean.replace(/^(?:Rs\.?|INR|₹)\s*/i, '').trim();

  // Match: optional integer digits with commas, followed by optional dot and decimal digits
  const regex = /^([0-9,]*)(?:\.([0-9]*))?$/;
  const match = clean.match(regex);

  if (!match) {
    throw new CurrencyError(`Malformed currency string: "${raw}"`);
  }

  const rupeeStr = match[1] || '';
  const decimalStr = match[2] || '';

  if (rupeeStr === '' && decimalStr === '') {
    return null;
  }

  // Reject more than 2 decimal digits (sub-paise fractions not allowed on bills)
  if (decimalStr.length > 2) {
    throw new CurrencyError(
      `Currency amount cannot have more than 2 decimal places, got: "${raw}"`
    );
  }

  return parseCurrencyToPaiseParts(isNegative, rupeeStr, decimalStr);
}

function parseCurrencyToPaiseParts(isNegative: boolean, rupeeStr: string, decimalStr: string): number {
  const cleanRupees = rupeeStr.replace(/,/g, '');
  let rupees = 0;
  if (cleanRupees !== '') {
    rupees = parseInt(cleanRupees, 10);
    if (isNaN(rupees) || !Number.isSafeInteger(rupees)) {
      throw new CurrencyError(`Rupee amount is not a safe integer: ${cleanRupees}`);
    }
  }

  // Parse decimal portion
  let paise = 0;
  if (decimalStr.length === 1) {
    paise = parseInt(decimalStr, 10) * 10;
  } else if (decimalStr.length === 2) {
    paise = parseInt(decimalStr, 10);
  }

  const totalPaise = rupees * 100 + paise;
  if (!Number.isSafeInteger(totalPaise)) {
    throw new CurrencyError(`Total paise exceeds MAX_SAFE_INTEGER: ${rupees}.${decimalStr}`);
  }

  return isNegative ? -totalPaise : totalPaise;
}

/**
 * Converts a rupee amount (number or string) to integer paise.
 * Returns null if the input is null, undefined, empty, or "N/A".
 */
export function toPaise(rupees: number | string | null | undefined): number | null {
  return parseCurrencyToPaise(rupees);
}

/**
 * Converts integer paise back to rupees as a standard number.
 */
export function fromPaise(paise: number): number {
  assertSafePaise(paise);
  return paise / 100;
}

/**
 * Formats integer paise into a human-readable Indian Rupee string (e.g. ₹1,23,456.78).
 * Uses the Indian numbering system grouping (lakhs, crores).
 */
export function formatINR(paise: number, includeSymbol = true): string {
  assertSafePaise(paise);
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const paiseStr = remainderPaise.toString().padStart(2, '0');

  // Format integer rupee part with Indian numbering system (xx,xx,xxx)
  const rupeeStr = rupees.toString();
  let formattedRupees = '';
  if (rupeeStr.length <= 3) {
    formattedRupees = rupeeStr;
  } else {
    const lastThree = rupeeStr.substring(rupeeStr.length - 3);
    const otherNumbers = rupeeStr.substring(0, rupeeStr.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${withCommas},${lastThree}`;
  }

  const sign = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₹' : '';
  return `${sign}${symbol}${formattedRupees}.${paiseStr}`;
}

/**
 * Sums an array of paise amounts with integer precision.
 */
export function addPaise(...amounts: number[]): number {
  let total = 0;
  for (const amt of amounts) {
    assertSafePaise(amt);
    total += amt;
    if (!Number.isSafeInteger(total)) {
      throw new CurrencyError('Sum exceeds Number.MAX_SAFE_INTEGER.');
    }
  }
  return total;
}

/**
 * Subtracts b from a in integer paise (a - b).
 */
export function subtractPaise(a: number, b: number): number {
  assertSafePaise(a);
  assertSafePaise(b);
  const diff = a - b;
  if (!Number.isSafeInteger(diff)) {
    throw new CurrencyError('Difference exceeds Number.MAX_SAFE_INTEGER.');
  }
  return diff;
}

/**
 * Multiplies unit price in paise by quantity.
 * Handles fractional quantities (e.g. 1.5 days, 0.25 units) with exact integer-ratio scaling
 * and integer-only round-half-up rounding.
 *
 * Example: 1.5 is represented as 15 / 10.
 * Calculation: roundHalfUp(unitPaise * 15, 10). Zero float multiplication.
 */
export function multiplyPaiseByQuantity(unitPaise: number, quantity: number | string): number {
  assertSafePaise(unitPaise);
  const qty = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (typeof qty !== 'number' || isNaN(qty) || !isFinite(qty)) {
    throw new CurrencyError(`Invalid quantity: ${quantity}`);
  }
  if (qty === 0 || unitPaise === 0) return 0;

  // If quantity is an integer, direct integer multiplication
  if (Number.isInteger(qty)) {
    const res = unitPaise * qty;
    if (!Number.isSafeInteger(res)) {
      throw new CurrencyError('Multiplication result exceeds Number.MAX_SAFE_INTEGER.');
    }
    return res;
  }

  // Fractional quantity: scale from decimal string representation to integer ratio
  const qtyStr = typeof quantity === 'string' ? quantity.trim() : qty.toString();
  const decimalIdx = qtyStr.indexOf('.');
  if (decimalIdx === -1) {
    const intVal = parseInt(qtyStr, 10);
    return unitPaise * intVal;
  }

  const decimals = qtyStr.length - decimalIdx - 1;
  const denominator = Math.pow(10, decimals);
  // Pure string-based integer parsing without float multiplication
  const numerator = parseInt(qtyStr.replace('.', ''), 10);

  return roundHalfUp(unitPaise * numerator, denominator);
}

/**
 * Calculates a percentage of an amount in paise using integer round-half-up.
 */
export function calculatePercentagePaise(paise: number, percentage: number): number {
  assertSafePaise(paise);
  if (typeof percentage !== 'number' || isNaN(percentage) || !isFinite(percentage)) {
    throw new CurrencyError(`Invalid percentage: ${percentage}`);
  }
  if (paise === 0 || percentage === 0) return 0;

  // Scale percentage to integer if decimal (e.g. 2.5% -> 25 / 1000)
  const pctStr = percentage.toString();
  const decimalIdx = pctStr.indexOf('.');
  if (decimalIdx === -1) {
    return roundHalfUp(paise * percentage, 100);
  }
  const decimals = pctStr.length - decimalIdx - 1;
  const factor = Math.pow(10, decimals);
  const numerator = parseInt(pctStr.replace('.', ''), 10);
  const denominator = 100 * factor;

  return roundHalfUp(paise * numerator, denominator);
}

/**
 * Parses a GST rate (percentage number or string e.g. 5, "18", "0.25") into integer basis points.
 * 1 basis point = 0.01% (1/10000). E.g. 5% = 500 bps, 18% = 1800 bps, 0.25% = 25 bps.
 * Guarantees zero floating point operations.
 */
export function parseGstRateToBasisPoints(rate: number | string | null | undefined): number | null {
  if (rate === null || rate === undefined || rate === '') {
    return null;
  }
  if (typeof rate === 'number') {
    if (isNaN(rate) || !isFinite(rate) || rate < 0) {
      throw new CurrencyError(`Invalid GST rate: ${rate}`);
    }
    return parseDecimalPercentageToBasisPoints(rate.toString());
  }
  return parseDecimalPercentageToBasisPoints(rate);
}

function parseDecimalPercentageToBasisPoints(rateStr: string): number {
  const clean = rateStr.trim().replace(/%/g, '');
  if (!clean || clean.toUpperCase() === 'N/A' || clean === '-') {
    throw new CurrencyError(`Invalid GST rate string: ${rateStr}`);
  }
  const parts = clean.split('.');
  if (parts.length > 2) {
    throw new CurrencyError(`Invalid GST percentage format: ${rateStr}`);
  }
  const whole = parseInt(parts[0], 10);
  if (isNaN(whole) || whole < 0) {
    throw new CurrencyError(`Invalid whole part in GST percentage: ${rateStr}`);
  }
  let frac = 0;
  if (parts.length === 2) {
    const fracStr = parts[1];
    if (fracStr.length > 2) {
      throw new CurrencyError(`GST rate cannot have more than 2 decimal places (basis point limit): ${rateStr}`);
    }
    frac = parseInt(fracStr.padEnd(2, '0'), 10);
  }
  return whole * 100 + frac;
}

/**
 * Computes GST-adjusted regulatory benchmark price in integer paise.
 * Formula: adjustedCeilingPaise = roundHalfUp(targetPricePaise * (10000 + gstBasisPoints), 10000)
 * Uses integer round-half-up policy from roundHalfUp. Zero floats, zero Math.round on money.
 */
export function calculateGstAdjustedPaise(basePaise: number, gstRateBasisPoints: number): number {
  assertSafePaise(basePaise);
  if (!Number.isInteger(gstRateBasisPoints) || gstRateBasisPoints < 0) {
    throw new CurrencyError(`GST rate basis points must be a non-negative integer, got: ${gstRateBasisPoints}`);
  }
  if (gstRateBasisPoints === 0) return basePaise;

  const numerator = basePaise * (10000 + gstRateBasisPoints);
  return roundHalfUp(numerator, 10000);
}
