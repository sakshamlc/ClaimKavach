import { describe, it, expect } from 'vitest';
import { evaluatePharmacyLumpSumRule } from '../../src/lib/audit/rules/pharmacyLumpSumRule';
import { LineItem } from '../../src/lib/audit/types';

describe('R-STRUCT-01: Pharmacy Lump Sum Rule Tests', () => {
  const baseBillTotal = 34200000; // ₹3,42,000.00 (same as synthetic demo)

  it('1. Positive test: single pharmacy line > 20% of bill with qty 1 and lump sum rate yields NEEDS_REVIEW', () => {
    const item: LineItem = {
      id: 'PHARM-01',
      description: 'Pharmacy - general medicines',
      category: 'pharmacy',
      quantity: 1,
      unitRatePaise: 8510000, // ₹85,100 (24.88% of bill)
      totalBilledPaise: 8510000,
      userEdited: false,
      verified: false,
    };

    const finding = evaluatePharmacyLumpSumRule(item, baseBillTotal);
    expect(finding).not.toBeNull();
    expect(finding?.ruleId).toBe('R-STRUCT-01');
    expect(finding?.verdict).toBe('NEEDS_REVIEW');
    expect(finding?.citation.kind).toBe('ARITHMETIC');
    expect(finding?.explanation.en).toBe(
      'This line has no item breakdown. You can ask the hospital for an itemised pharmacy list.'
    );
    expect(finding?.amount).toBe(0);
  });

  it('2. Negative test: pharmacy line with detailed unit pricing and qty > 1 does not flag', () => {
    const item: LineItem = {
      id: 'PHARM-02',
      description: 'Paracetamol IV infusion 100 ml',
      category: 'pharmacy',
      quantity: 10,
      unitRatePaise: 12000, // ₹120.00 each
      totalBilledPaise: 120000, // ₹1,200.00 (0.35% of bill)
      userEdited: false,
      verified: false,
    };

    const finding = evaluatePharmacyLumpSumRule(item, baseBillTotal);
    expect(finding).toBeNull();
  });

  it('3. Negative test: non-pharmacy category exceeding 20% does not flag', () => {
    const procedureItem: LineItem = {
      id: 'PROC-01',
      description: 'Coronary angioplasty procedure (cath lab)',
      category: 'procedure',
      quantity: 1,
      unitRatePaise: 8500000, // ₹85,000 (24.85% of bill)
      totalBilledPaise: 8500000,
      userEdited: false,
      verified: false,
    };

    const finding = evaluatePharmacyLumpSumRule(procedureItem, baseBillTotal);
    expect(finding).toBeNull();
  });

  it('4. Null safety tests: handles null totalBilledPaise, zero bill total, null bill total gracefully', () => {
    const nullPricedItem: LineItem = {
      id: 'PHARM-NULL',
      description: 'Pharmacy Unpriced',
      category: 'pharmacy',
      quantity: 1,
      unitRatePaise: null,
      totalBilledPaise: null,
      userEdited: false,
      verified: false,
    };

    expect(evaluatePharmacyLumpSumRule(nullPricedItem, baseBillTotal)).toBeNull();
    expect(evaluatePharmacyLumpSumRule(nullPricedItem, 0)).toBeNull();
    expect(evaluatePharmacyLumpSumRule(nullPricedItem, null)).toBeNull();
    expect(evaluatePharmacyLumpSumRule(nullPricedItem, undefined)).toBeNull();
  });

  it('5. Threshold edge tests: exactly 20.00% vs 20.01% boundary', () => {
    const billTotal = 10000000; // ₹1,00,000.00

    // Exactly 20% (₹20,000.00): should NOT flag (must be strictly larger than threshold)
    const exactThresholdItem: LineItem = {
      id: 'PHARM-EXACT',
      description: 'Pharmacy Medicines Lump Sum',
      category: 'pharmacy',
      quantity: 1,
      unitRatePaise: 2000000, // 20.00%
      totalBilledPaise: 2000000,
      userEdited: false,
      verified: false,
    };
    expect(evaluatePharmacyLumpSumRule(exactThresholdItem, billTotal, { thresholdShare: 0.20 })).toBeNull();

    // Just above threshold: 20.01% (₹20,010.00): should flag
    const aboveThresholdItem: LineItem = {
      id: 'PHARM-ABOVE',
      description: 'Pharmacy Medicines Lump Sum',
      category: 'pharmacy',
      quantity: 1,
      unitRatePaise: 2001000, // 20.01%
      totalBilledPaise: 2001000,
      userEdited: false,
      verified: false,
    };
    const finding = evaluatePharmacyLumpSumRule(aboveThresholdItem, billTotal, { thresholdShare: 0.20 });
    expect(finding).not.toBeNull();
    expect(finding?.verdict).toBe('NEEDS_REVIEW');
  });
});
