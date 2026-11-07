/**
 * ClaimKavach — Text Normalizer, Similarity Matcher & Paise Math
 * Pure TypeScript utilities for deterministic auditing.
 */

const NOISE_WORDS = new Set([
  "charges",
  "charge",
  "fee",
  "fees",
  "hosp",
  "hospital",
  "ward",
  "rate",
  "tariff",
  "cost",
  "pkg",
  "package",
  "daily",
  "routine",
  "dept",
  "department",
  "dr",
  "service",
]);

/**
 * Strips punctuation, excess whitespace, and administrative noise words.
 */
export function cleanLabel(raw: string): string {
  if (!raw) return "";
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned
    .split(" ")
    .filter((token) => token.length > 0 && !NOISE_WORDS.has(token));

  return tokens.join(" ");
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      }
      prev = temp;
    }
  }

  return dp[n];
}

/**
 * Normalized Levenshtein similarity between 0 and 1.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Token Jaccard overlap between 0 and 1.
 */
export function tokenJaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  });

  const unionSet = new Set<string>();
  tokensA.forEach((t) => unionSet.add(t));
  tokensB.forEach((t) => unionSet.add(t));
  const unionCount = unionSet.size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Hybrid match score (0.6 * Jaccard + 0.4 * Levenshtein).
 * Compares query against candidateName and all aliases.
 * Returns the highest score found in [0, 1].
 */
export function computeMatchScore(
  query: string,
  candidateName: string,
  aliases: string[] = []
): number {
  const cleanedQuery = cleanLabel(query);
  if (!cleanedQuery) return 0;

  const candidates = [candidateName, ...aliases];
  let maxScore = 0;

  for (const candidate of candidates) {
    const cleanedCandidate = cleanLabel(candidate);
    if (!cleanedCandidate) continue;

    // Exact cleaned match
    if (cleanedQuery === cleanedCandidate) {
      return 1.0;
    }

    const jaccard = tokenJaccardSimilarity(cleanedQuery, cleanedCandidate);
    const lev = levenshteinSimilarity(cleanedQuery, cleanedCandidate);
    let combined = 0.6 * jaccard + 0.4 * lev;

    // If candidate tokens are a complete subset of query tokens with high length
    const queryTokens = new Set(cleanedQuery.split(" ").filter(Boolean));
    const candTokens = cleanedCandidate.split(" ").filter(Boolean);
    const allCandTokensPresent = candTokens.length > 0 && candTokens.every((t) => queryTokens.has(t));
    if (allCandTokensPresent && candTokens.length >= 2) {
      combined = Math.max(combined, 0.90);
    }

    if (combined > maxScore) {
      maxScore = combined;
    }
  }

  return Math.min(1.0, Math.max(0.0, Number(maxScore.toFixed(3))));
}

/**
 * Unit Normalization & Mismatch Detection
 */
export type NormalizedUnit =
  | "UNIT"
  | "TABLET"
  | "VIAL"
  | "ML"
  | "STRIP"
  | "DAY"
  | "VISIT"
  | "TEST"
  | "PACK";

export function normalizeUnit(rawUnit: string): NormalizedUnit {
  const u = (rawUnit || "").toLowerCase().trim();
  if (["nos", "no", "pc", "pcs", "ea", "each", "unit", "units"].includes(u)) {
    return "UNIT";
  }
  if (["tab", "tabs", "tablet", "tablets", "cap", "caps", "capsule", "capsules"].includes(u)) {
    return "TABLET";
  }
  if (["amp", "ampoule", "ampoules", "vial", "vials", "bot", "bottle", "bottles", "infusion"].includes(u)) {
    return "VIAL";
  }
  if (["ml", "milliliter", "milliliters"].includes(u)) {
    return "ML";
  }
  if (["strip", "strips"].includes(u)) {
    return "STRIP";
  }
  if (["day", "days", "dy", "per day"].includes(u)) {
    return "DAY";
  }
  if (["visit", "vis", "consult", "consultation"].includes(u)) {
    return "VISIT";
  }
  if (["test", "tests", "investigation"].includes(u)) {
    return "TEST";
  }
  if (["pack", "kit", "box", "set", "packet"].includes(u)) {
    return "PACK";
  }
  return "UNIT";
}

/**
 * Pure integer paise math helpers to eliminate floating-point errors.
 */
export function toPaise(inr: number): number {
  return Math.round(inr * 100);
}

export function toRupees(paise: number): number {
  return paise / 100;
}
