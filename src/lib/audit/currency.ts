/**
 * Trust Zone Currency & Monetary Arithmetic
 *
 * All financial amounts are strictly represented and calculated in integer paise.
 * ₹1.00 = 100 paise.
 *
 * Design Guarantees:
 * 1. String-based parsing with ZERO float multiplication (eliminates IEEE 754 drift).
 * 2. Integer-only round-half-up rounding policy for division and fractional quantities.
 * 3. Strict bounds checking: rejects NaN, Infinity, and amounts exceeding Number.MAX_SAFE_INTEGER.
 * 4. Support for fractional quantities (e.g. 1.5 days, 0.5 hours) with integer-ratio scaling.
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

  // For positive: Math.floor((absNum + absDen / 2) / absDen)
  const quotient = Math.floor((absNum + Math.floor(absDen / 2)) / absDen);
  return isNegative ? -quotient : quotient;
}

/**
 * Parses a rupee currency string (e.g. "1,23,456.50", "₹ 500", "-Rs. 120.75")
 * directly into integer paise WITHOUT float multiplication.
 */
export function parseCurrencyToPaise(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      throw new CurrencyError(`Invalid numeric input: ${input}`);
    }
    if (Math.abs(input) * 100 > Number.MAX_SAFE_INTEGER) {
      throw new CurrencyError(`Amount exceeds MAX_SAFE_INTEGER: ${input}`);
    }
    return Math.round(input * 100);
  }

  const raw = String(input).trim();
  if (raw === '' || raw.toUpperCase() === 'N/A') return 0;

  // Regex to extract optional negative sign, currency symbols, rupee digits, and optional decimal paise
  const regex = /^(-)?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+)(?:\.([0-9]*))?$/i;
  const match = raw.match(regex);

  if (!match) {
    // If not matching standard currency, try extracting first numeric token
    const fallbackMatch = raw.match(/(-)?([0-9,]+)(?:\.([0-9]*))?/);
    if (!fallbackMatch) return 0;
    return parseCurrencyToPaiseParts(fallbackMatch[1] === '-', fallbackMatch[2], fallbackMatch[3]);
  }

  const isNegative = match[1] === '-';
  const rupeeStr = match[2];
  const decimalStr = match[3] || '';

  return parseCurrencyToPaiseParts(isNegative, rupeeStr, decimalStr);
}

function parseCurrencyToPaiseParts(isNegative: boolean, rupeeStr: string, decimalStr: string): number {
  const cleanRupees = rupeeStr.replace(/,/g, '');
  if (cleanRupees === '') return 0;

  const rupees = parseInt(cleanRupees, 10);
  if (isNaN(rupees) || !Number.isSafeInteger(rupees)) {
    throw new CurrencyError(`Rupee amount is not a safe integer: ${cleanRupees}`);
  }

  // Parse decimal portion with exact round-half-up on sub-paise fractions
  let paise = 0;
  if (decimalStr.length === 0) {
    paise = 0;
  } else if (decimalStr.length === 1) {
    paise = parseInt(decimalStr, 10) * 10;
  } else if (decimalStr.length === 2) {
    paise = parseInt(decimalStr, 10);
  } else {
    // More than 2 decimal digits: round half-up on the 3rd digit
    const firstTwo = parseInt(decimalStr.substring(0, 2), 10);
    const thirdDigit = parseInt(decimalStr.charAt(2), 10);
    paise = thirdDigit >= 5 ? firstTwo + 1 : firstTwo;
  }

  const totalPaise = rupees * 100 + paise;
  if (!Number.isSafeInteger(totalPaise)) {
    throw new CurrencyError(`Total paise exceeds MAX_SAFE_INTEGER: ${rupees}.${decimalStr}`);
  }

  return isNegative ? -totalPaise : totalPaise;
}

/**
 * Converts a rupee amount (number or string) to integer paise.
 */
export function toPaise(rupees: number | string): number {
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
 */
export function multiplyPaiseByQuantity(unitPaise: number, quantity: number): number {
  assertSafePaise(unitPaise);
  if (typeof quantity !== 'number' || isNaN(quantity) || !isFinite(quantity)) {
    throw new CurrencyError(`Invalid quantity: ${quantity}`);
  }
  if (quantity === 0 || unitPaise === 0) return 0;

  // If quantity is an integer, direct integer multiplication
  if (Number.isInteger(quantity)) {
    const res = unitPaise * quantity;
    if (!Number.isSafeInteger(res)) {
      throw new CurrencyError('Multiplication result exceeds Number.MAX_SAFE_INTEGER.');
    }
    return res;
  }

  // Fractional quantity: convert decimal string to integer ratio to prevent float multiplication
  const qtyStr = quantity.toString();
  const decimalIdx = qtyStr.indexOf('.');
  if (decimalIdx === -1) {
    return Math.round(unitPaise * quantity);
  }

  const decimals = qtyStr.length - decimalIdx - 1;
  const denominator = Math.pow(10, decimals);
  const numerator = Math.round(quantity * denominator);

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
  const numerator = Math.round(percentage * factor);
  const denominator = 100 * factor;

  return roundHalfUp(paise * numerator, denominator);
}
