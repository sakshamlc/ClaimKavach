import bankCodesData from '../../data/bank-codes.json';
import mergedBanksData from '../../data/merged-banks.json';
import { Severity, MergedBankEntry } from './types';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const activeBankPrefixes = new Set<string>(
  bankCodesData.map((b: { prefix: string }) => b.prefix.toUpperCase())
);

const mergedBankMap = new Map<string, MergedBankEntry>();
for (const entry of mergedBanksData) {
  mergedBankMap.set(entry.oldPrefix.toUpperCase(), entry as MergedBankEntry);
}

export interface IfscValidationResult {
  valid: boolean;
  severity: Severity;
  prefix: string;
  explanationKey: string;
  mergedBankInfo?: MergedBankEntry;
}

/**
 * Validates IFSC format (R-IFSC-1) and checks against active/merged banks (R-IFSC-2).
 */
export function validateIfsc(ifsc: string): IfscValidationResult {
  if (!ifsc) {
    return {
      valid: false,
      severity: 'blocker',
      prefix: '',
      explanationKey: 'ifsc_missing',
    };
  }

  const clean = ifsc.trim().toUpperCase();

  // R-IFSC-1: Format check ^[A-Z]{4}0[A-Z0-9]{6}$
  if (!IFSC_REGEX.test(clean)) {
    return {
      valid: false,
      severity: 'blocker',
      prefix: clean.substring(0, 4),
      explanationKey: 'ifsc_invalid_format',
    };
  }

  const prefix = clean.substring(0, 4);

  // R-IFSC-2: Check merged banks first
  if (mergedBankMap.has(prefix)) {
    const merged = mergedBankMap.get(prefix)!;
    return {
      valid: true,
      severity: 'high',
      prefix,
      explanationKey: 'ifsc_merged_bank',
      mergedBankInfo: merged,
    };
  }

  // Check active bank codes
  if (activeBankPrefixes.has(prefix)) {
    return {
      valid: true,
      severity: 'low',
      prefix,
      explanationKey: 'ifsc_valid',
    };
  }

  // Prefix unknown in bank-codes.json -> Low warning
  return {
    valid: true,
    severity: 'low',
    prefix,
    explanationKey: 'ifsc_unknown_bank',
  };
}
