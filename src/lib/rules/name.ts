import { normalizeName, normalizeIndianPhonetics, jaroWinkler } from './normalize';
import { NameVerdict, Severity } from './types';

export interface NameComparisonContext {
  fatherOrSpouseNameA?: string | null;
  fatherOrSpouseNameB?: string | null;
}

export interface NameComparisonResult {
  verdict: NameVerdict;
  severity: Severity;
  normalizedA: string;
  normalizedB: string;
  explanationKey: string;
}

/**
 * Checks if two individual tokens match either exactly, via Indian phonetics,
 * or via Jaro-Winkler similarity (guarding with token length >= 4).
 */
export function tokensMatch(t1: string, t2: string): boolean {
  if (t1 === t2) return true;
  if (normalizeIndianPhonetics(t1) === normalizeIndianPhonetics(t2)) return true;
  if (t1.length >= 4 && t2.length >= 4 && jaroWinkler(t1, t2) >= 0.88) return true;
  return false;
}

/**
 * Compares two names deterministically evaluated in strict order (1 to 7).
 */
export function compareNames(
  a: string,
  b: string,
  strictness: 'strict' | 'standard' = 'standard',
  context?: NameComparisonContext
): NameComparisonResult {
  const normA = normalizeName(a);
  const normB = normalizeName(b);

  const isStrict = strictness === 'strict';

  // 1. NORMALIZED_EXACT
  if (normA === normB) {
    return {
      verdict: 'NORMALIZED_EXACT',
      severity: 'low', // Handled as OK / no finding in analysis
      normalizedA: normA,
      normalizedB: normB,
      explanationKey: 'name_match_exact',
    };
  }

  const tokensA = normA.split(' ').filter(Boolean);
  const tokensB = normB.split(' ').filter(Boolean);

  // 2. TOKEN_REORDER: Same multiset of tokens in different order
  if (tokensA.length === tokensB.length && tokensA.length > 1) {
    const sortedA = [...tokensA].sort().join(' ');
    const sortedB = [...tokensB].sort().join(' ');
    if (sortedA === sortedB) {
      return {
        verdict: 'TOKEN_REORDER',
        severity: isStrict ? 'high' : 'medium',
        normalizedA: normA,
        normalizedB: normB,
        explanationKey: 'name_reorder',
      };
    }
  }

  // Helper to test patronymic middle omission:
  // Long has 3 tokens [First, Middle, Last], Short has 2 tokens [First, Last] or [First, Initial, Last]
  const checkPatronymic = (
    longTokens: string[],
    shortTokens: string[]
  ): { matched: boolean; middleToken?: string } => {
    if (longTokens.length === 3 && (shortTokens.length === 2 || shortTokens.length === 3)) {
      const [firstLong, middleLong, lastLong] = longTokens;

      // Check first and last tokens match
      const firstMatches = tokensMatch(firstLong, shortTokens[0]);
      const lastMatches = tokensMatch(lastLong, shortTokens[shortTokens.length - 1]);

      if (firstMatches && lastMatches) {
        // If short has 3 tokens, check if middle is an initial
        if (shortTokens.length === 3) {
          const midShort = shortTokens[1];
          if (midShort.length === 1 && middleLong.startsWith(midShort)) {
            return { matched: true, middleToken: middleLong };
          }
        } else {
          return { matched: true, middleToken: middleLong };
        }
      }
    }
    return { matched: false };
  };

  // 3. PATRONYMIC_MIDDLE_OMISSION check
  const patronymicCandidate =
    tokensA.length >= tokensB.length
      ? checkPatronymic(tokensA, tokensB)
      : checkPatronymic(tokensB, tokensA);

  if (patronymicCandidate.matched && patronymicCandidate.middleToken) {
    // Check against fatherOrSpouseName from either document
    const fatherNames = [
      context?.fatherOrSpouseNameA,
      context?.fatherOrSpouseNameB,
    ].filter(Boolean) as string[];

    let middleMatchesFather = false;
    for (const fatherName of fatherNames) {
      const fatherTokens = normalizeName(fatherName).split(' ').filter(Boolean);
      if (fatherTokens.length > 0) {
        const fatherFirst = fatherTokens[0];
        if (tokensMatch(patronymicCandidate.middleToken, fatherFirst)) {
          middleMatchesFather = true;
          break;
        }
      }
    }

    if (middleMatchesFather) {
      return {
        verdict: 'PATRONYMIC_MIDDLE_OMISSION',
        severity: isStrict ? 'high' : 'low',
        normalizedA: normA,
        normalizedB: normB,
        explanationKey: 'patronymic_omission',
      };
    }
  }

  // 4. INITIAL_ABBREVIATION
  // One side has one or more single-letter tokens matching the first letter of unmatched tokens
  const checkInitialAbbreviation = (
    shorter: string[],
    longer: string[]
  ): boolean => {
    if (shorter.length !== longer.length) return false;
    let hasInitials = false;
    const usedLonger = new Set<number>();

    for (let i = 0; i < shorter.length; i++) {
      const sTok = shorter[i];
      let matchedIndex = -1;

      for (let j = 0; j < longer.length; j++) {
        if (usedLonger.has(j)) continue;
        const lTok = longer[j];

        if (sTok === lTok || tokensMatch(sTok, lTok)) {
          matchedIndex = j;
          break;
        } else if (sTok.length === 1 && lTok.length > 1 && lTok.startsWith(sTok)) {
          hasInitials = true;
          matchedIndex = j;
          break;
        }
      }

      if (matchedIndex === -1) return false;
      usedLonger.add(matchedIndex);
    }

    return hasInitials;
  };

  if (tokensA.length === tokensB.length) {
    if (
      checkInitialAbbreviation(tokensA, tokensB) ||
      checkInitialAbbreviation(tokensB, tokensA)
    ) {
      return {
        verdict: 'INITIAL_ABBREVIATION',
        severity: isStrict ? 'high' : 'medium',
        normalizedA: normA,
        normalizedB: normB,
        explanationKey: 'initial_abbreviation',
      };
    }
  }

  // 5. TRANSLITERATION_VARIANT
  // Same token count (after optional reorder), every paired token matches via phonetics or JW >= 0.88 (len >= 4)
  if (tokensA.length === tokensB.length && tokensA.length > 0) {
    const matchedB = new Set<number>();
    let allTokensMatched = true;

    for (let i = 0; i < tokensA.length; i++) {
      let foundPair = false;
      for (let j = 0; j < tokensB.length; j++) {
        if (matchedB.has(j)) continue;
        if (tokensMatch(tokensA[i], tokensB[j])) {
          matchedB.add(j);
          foundPair = true;
          break;
        }
      }
      if (!foundPair) {
        allTokensMatched = false;
        break;
      }
    }

    if (allTokensMatched) {
      return {
        verdict: 'TRANSLITERATION_VARIANT',
        severity: isStrict ? 'high' : 'medium',
        normalizedA: normA,
        normalizedB: normB,
        explanationKey: 'transliteration_variant',
      };
    }
  }

  // 6. MISSING_TOKEN
  // All tokens of the shorter name match tokens of the longer name
  const checkMissingToken = (shorter: string[], longer: string[]): boolean => {
    if (shorter.length >= longer.length) return false;
    const usedLonger = new Set<number>();

    for (const sTok of shorter) {
      let found = false;
      for (let j = 0; j < longer.length; j++) {
        if (usedLonger.has(j)) continue;
        if (tokensMatch(sTok, longer[j])) {
          usedLonger.add(j);
          found = true;
          break;
        }
      }
      if (!found) return false;
    }

    return true;
  };

  const isMissingToken =
    tokensA.length < tokensB.length
      ? checkMissingToken(tokensA, tokensB)
      : checkMissingToken(tokensB, tokensA);

  if (isMissingToken) {
    return {
      verdict: 'MISSING_TOKEN',
      severity: isStrict ? 'high' : 'medium',
      normalizedA: normA,
      normalizedB: normB,
      explanationKey: 'missing_token',
    };
  }

  // 7. MISMATCH
  return {
    verdict: 'MISMATCH',
    severity: 'blocker',
    normalizedA: normA,
    normalizedB: normB,
    explanationKey: 'name_mismatch',
  };
}
