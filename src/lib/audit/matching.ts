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

import { normalizeItemName } from './regulatory';

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
