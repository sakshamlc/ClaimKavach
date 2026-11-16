import { Severity } from './types';

export interface ParsedDate {
  raw: string;
  day?: number;
  month?: number;
  year: number;
  iso?: string; // YYYY-MM-DD
  isYearOnly: boolean;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Parses dates in formats:
 * DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, DD Mon YYYY, or YYYY.
 */
export function parseDate(dateStr: string): ParsedDate | null {
  if (!dateStr) return null;
  const str = dateStr.trim();

  // 4-digit year only
  if (/^\d{4}$/.test(str)) {
    const year = parseInt(str, 10);
    return { raw: str, year, isYearOnly: true };
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { raw: str, year, month, day, iso, isYearOnly: false };
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { raw: str, year, month, day, iso, isYearOnly: false };
  }

  // DD Mon YYYY (e.g. 05 Mar 2001, 5 March 2001)
  const textMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monStr = textMatch[2].toLowerCase();
    const month = MONTH_NAMES[monStr];
    const year = parseInt(textMatch[3], 10);
    if (month) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { raw: str, year, month, day, iso, isYearOnly: false };
    }
  }

  return null;
}

export interface DobComparisonResult {
  matches: boolean;
  severity: Severity;
  isSwapHint: boolean;
  explanationKey: string;
}

/**
 * Compares two date strings according to rules R-DOB-1 and R-DOB-2.
 */
export function compareDob(
  dobA: string,
  dobB: string,
  strictness: 'strict' | 'standard' = 'standard'
): DobComparisonResult {
  const pA = parseDate(dobA);
  const pB = parseDate(dobB);

  // If unparseable
  if (!pA || !pB) {
    return {
      matches: false,
      severity: 'blocker',
      isSwapHint: false,
      explanationKey: 'dob_unparseable',
    };
  }

  // R-DOB-2: One or both is year only
  if (pA.isYearOnly || pB.isYearOnly) {
    if (pA.year !== pB.year) {
      return {
        matches: false,
        severity: 'blocker',
        isSwapHint: false,
        explanationKey: 'dob_year_mismatch',
      };
    }
    // Year matches
    return {
      matches: true,
      severity: strictness === 'strict' ? 'medium' : 'info',
      isSwapHint: false,
      explanationKey: 'dob_year_only_matches',
    };
  }

  // Both have full date
  if (pA.iso === pB.iso) {
    return {
      matches: true,
      severity: 'low',
      isSwapHint: false,
      explanationKey: 'dob_match_exact',
    };
  }

  // R-DOB-1: Check day/month swap hint
  // If day <= 12 and pA.day === pB.month && pA.month === pB.day
  const isSwap =
    pA.year === pB.year &&
    pA.day !== undefined &&
    pA.month !== undefined &&
    pB.day !== undefined &&
    pB.month !== undefined &&
    pA.day <= 12 &&
    pB.day <= 12 &&
    pA.day === pB.month &&
    pA.month === pB.day;

  return {
    matches: false,
    severity: 'blocker',
    isSwapHint: isSwap,
    explanationKey: isSwap ? 'dob_possible_swap' : 'dob_mismatch',
  };
}
