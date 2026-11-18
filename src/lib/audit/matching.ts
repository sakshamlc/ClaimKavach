/**
 * ClaimKavach — Pure Deterministic String & Token Matching
 *
 * Provides exact and token-based string similarity matching for medical line items
 * against regulatory reference records.
 *
 * Rules:
 * - 100% deterministic (no Math.random, no external API, no AI).
 * - Exact match: normalized string equality.
 * - Non-exact token match: token overlap ratio >= 0.75.
 * - Non-exact matches MUST be capped at LIKELY_ISSUE by the engine.
 */

import { normalizeItemName, NppaCeilingRecord } from './regulatory';

export interface MatchResult<T> {
  record: T | null;
  isExact: boolean;
  score: number; // 0 to 1
}

/**
 * Extracts alphanumeric word tokens of length >= 2.
 */
export function tokenize(str: string): string[] {
  const normalized = normalizeItemName(str);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Extracts strength descriptor (e.g. "100mg", "500mg", "1g", "5ml").
 */
export function extractStrength(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|%))\b/i);
  return match ? match[1].toLowerCase().replace(/\s+/g, '') : null;
}

/**
 * Extracts all strength descriptors (e.g. ["100mg", "325mg"]).
 */
export function extractAllStrengths(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|%))\b/gi);
  if (!matches) return [];
  return matches.map((m) => m.toLowerCase().replace(/\s+/g, ''));
}

/**
 * Extracts dosage form (e.g. tablet, capsule, injection, suspension).
 */
export function extractDosageForm(text: string): string | null {
  if (!text) return null;
  const forms = [
    'tablets', 'tablet', 'tabs', 'tab',
    'capsules', 'capsule', 'caps', 'cap',
    'injections', 'injection', 'inj',
    'syrup', 'suspension', 'drops', 'ointment', 'gel', 'cream'
  ];
  const lower = text.toLowerCase();
  for (const f of forms) {
    if (new RegExp(`\\b${f}\\b`, 'i').test(lower)) {
      if (f === 'tab' || f === 'tabs' || f === 'tablets') return 'tablet';
      if (f === 'cap' || f === 'caps' || f === 'capsules') return 'capsule';
      if (f === 'inj' || f === 'injections') return 'injection';
      return f;
    }
  }
  return null;
}

/**
 * Computes deterministic Jaccard similarity between two token sets.
 */
export function calculateTokenSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setB = new Set(tokensB);
  let intersectionCount = 0;

  for (const token of tokensA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  if (unionSize === 0) return 0;

  return intersectionCount / unionSize;
}

/**
 * Matches a drug line item description against drug ceiling records,
 * taking into account structured strength and dosage form matching.
 */
export function findBestDrugMatch(
  query: string,
  records: NppaCeilingRecord[],
  threshold: number = 0.65
): MatchResult<NppaCeilingRecord> {
  const normQuery = normalizeItemName(query);
  if (!normQuery || records.length === 0) {
    return { record: null, isExact: false, score: 0 };
  }

  // 1. Check if there's an exact match on normalizedName
  for (const record of records) {
    if (record.normalizedName === normQuery) {
      return { record, isExact: true, score: 1.0 };
    }
  }

  // 2. Token-based matching considering dosage form and strength
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return { record: null, isExact: false, score: 0 };
  }

  const queryStrength = extractStrength(query);
  const queryForm = extractDosageForm(query);

  let bestMatch: NppaCeilingRecord | null = null;
  let bestScore = 0;

  for (const record of records) {
    const recordTokens = tokenize(record.name);
    if (recordTokens.length === 0) continue;

    const setQuery = new Set(queryTokens);
    let intersectionCount = 0;
    for (const t of recordTokens) {
      if (setQuery.has(t)) {
        intersectionCount++;
      }
    }

    const unionSize = new Set([...queryTokens, ...recordTokens]).size;
    const jaccard = unionSize > 0 ? intersectionCount / unionSize : 0;
    const recordCoverage = intersectionCount / recordTokens.length;
    let score = Math.max(jaccard, recordCoverage * 0.85);

    // If query specifies strength, check compatibility
    if (queryStrength && record.strength) {
      const recordStrength = extractStrength(record.strength);
      if (recordStrength && recordStrength === queryStrength) {
        score += 0.2; // Boost candidate with matching strength
      } else if (recordStrength && recordStrength !== queryStrength) {
        // Different strength! Penalize candidate so it doesn't shadow a matching one
        score -= 0.3;
      }
    }

    // If query specifies dosage form, check compatibility
    if (queryForm && record.dosageForm) {
      const recordForm = extractDosageForm(record.dosageForm);
      if (recordForm && recordForm === queryForm) {
        score += 0.1;
      } else if (recordForm && recordForm !== queryForm) {
        score -= 0.3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = record;
    }
  }

  if (bestScore >= threshold && bestMatch !== null) {
    return {
      record: bestMatch,
      isExact: false,
      score: Math.min(1.0, Math.max(0, bestScore)),
    };
  }

  return { record: null, isExact: false, score: 0 };
}

/**
 * Matches a query string against a list of reference records having `name` and `normalizedName`.
 */
export function findBestMatch<T extends { name: string; normalizedName: string }>(
  query: string,
  records: T[],
  threshold: number = 0.6
): MatchResult<T> {
  const normQuery = normalizeItemName(query);
  if (!normQuery || records.length === 0) {
    return { record: null, isExact: false, score: 0 };
  }

  // 1. Check exact match
  for (const record of records) {
    if (record.normalizedName === normQuery) {
      return { record, isExact: true, score: 1.0 };
    }
  }

  // 2. Token-based matching
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return { record: null, isExact: false, score: 0 };
  }

  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const record of records) {
    const recordTokens = tokenize(record.name);
    const score = calculateTokenSimilarity(queryTokens, recordTokens);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = record;
    }
  }

  if (bestScore >= threshold && bestMatch !== null) {
    return {
      record: bestMatch,
      isExact: false,
      score: bestScore,
    };
  }

  return { record: null, isExact: false, score: 0 };
}
