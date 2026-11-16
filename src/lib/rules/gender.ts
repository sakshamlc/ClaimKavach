import { Severity } from './types';

export interface GenderComparisonResult {
  matches: boolean;
  severity: Severity;
  explanationKey: string;
}

/**
 * Compares gender across documents (R-GEN-1).
 * Gender differs = High severity.
 */
export function compareGender(
  genderA?: string | null,
  genderB?: string | null
): GenderComparisonResult {
  if (!genderA || !genderB) {
    return {
      matches: true,
      severity: 'low',
      explanationKey: 'gender_not_specified',
    };
  }

  const cleanA = genderA.trim().toUpperCase()[0];
  const cleanB = genderB.trim().toUpperCase()[0];

  if (cleanA === cleanB) {
    return {
      matches: true,
      severity: 'low',
      explanationKey: 'gender_matches',
    };
  }

  return {
    matches: false,
    severity: 'high',
    explanationKey: 'gender_mismatch',
  };
}
