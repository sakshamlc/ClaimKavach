import { normalizeName } from './normalize';
import { Severity } from './types';

export interface PanValidationResult {
  valid: boolean;
  severity: Severity;
  explanationKey?: string;
  holderType?: string;
  fifthChar?: string;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Validates PAN structure (R-PAN-1 and R-PAN-2).
 */
export function validatePan(
  pan: string,
  requiresIndividual: boolean = true
): PanValidationResult {
  if (!pan) {
    return {
      valid: false,
      severity: 'blocker',
      explanationKey: 'pan_missing',
    };
  }

  const clean = pan.trim().toUpperCase();

  // R-PAN-1: Structure check
  if (!PAN_REGEX.test(clean)) {
    return {
      valid: false,
      severity: 'blocker',
      explanationKey: 'pan_invalid_format',
    };
  }

  const holderType = clean[3];
  const fifthChar = clean[4];

  // R-PAN-2: Individual check ('P')
  if (requiresIndividual && holderType !== 'P') {
    return {
      valid: false,
      severity: 'high',
      explanationKey: 'pan_not_individual',
      holderType,
      fifthChar,
    };
  }

  return {
    valid: true,
    severity: 'low',
    holderType,
    fifthChar,
  };
}

export interface PanSurnameMatchResult {
  matches: boolean;
  severity: Severity;
  explanationKey: string;
}

/**
 * Checks R-PAN-3: 5th character matches the first letter of the surname.
 * Checks the last token first; if PAN name is reordered, also checks the first token.
 */
export function checkPanSurnameMatch(
  pan: string,
  holderName: string,
  referenceName?: string
): PanSurnameMatchResult {
  const cleanPan = pan.trim().toUpperCase();
  if (!PAN_REGEX.test(cleanPan)) {
    return {
      matches: false,
      severity: 'blocker',
      explanationKey: 'pan_invalid_format',
    };
  }

  const fifthChar = cleanPan[4];
  const normName = normalizeName(holderName);
  const tokens = normName.split(' ').filter(Boolean);

  if (tokens.length === 0) {
    return {
      matches: false,
      severity: 'medium',
      explanationKey: 'pan_surname_unverified',
    };
  }

  // Check last token
  const lastTokenInitial = tokens[tokens.length - 1][0].toUpperCase();
  if (lastTokenInitial === fifthChar) {
    return {
      matches: true,
      severity: 'low',
      explanationKey: 'pan_surname_matches',
    };
  }

  // Check first token (in case name is written Surname First / TOKEN_REORDER)
  const firstTokenInitial = tokens[0][0].toUpperCase();
  if (firstTokenInitial === fifthChar) {
    return {
      matches: true,
      severity: 'low',
      explanationKey: 'pan_surname_matches',
    };
  }

  // Also check referenceName (e.g. Aadhaar name) if provided
  if (referenceName) {
    const normRef = normalizeName(referenceName);
    const refTokens = normRef.split(' ').filter(Boolean);
    if (refTokens.length > 0) {
      const refLastInitial = refTokens[refTokens.length - 1][0].toUpperCase();
      const refFirstInitial = refTokens[0][0].toUpperCase();
      if (refLastInitial === fifthChar || refFirstInitial === fifthChar) {
        return {
          matches: true,
          severity: 'low',
          explanationKey: 'pan_surname_matches',
        };
      }
    }
  }

  // R-PAN-3 fires Medium if surname doesn't match 5th letter
  return {
    matches: false,
    severity: 'medium',
    explanationKey: 'pan_surname_mismatch',
  };
}
