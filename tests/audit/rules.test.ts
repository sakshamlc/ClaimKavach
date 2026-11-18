import { describe, it, expect } from 'vitest';
import { evaluateMathRule } from '../../src/lib/audit/rules/mathRule';
import { evaluateTotalRule } from '../../src/lib/audit/rules/totalRule';
import { evaluateDuplicateRule } from '../../src/lib/audit/rules/duplicateRule';
import { evaluateNppaCeilingRule } from '../../src/lib/audit/rules/nppaCeilingRule';
import { evaluateMrpRule } from '../../src/lib/audit/rules/mrpRule';
import { evaluateAnnexureDeductionRule } from '../../src/lib/audit/rules/annexureDeductionRule';
import { evaluateBundlingRule } from '../../src/lib/audit/rules/bundlingRule';
import { evaluatePolicyRule } from '../../src/lib/audit/rules/policyRule';

import { LineItem, MedicalBill } from '../../src/lib/audit/types';
import { NppaCeilingRecord, Annexure1Record, RoomBundlingRecord } from '../../src/lib/audit/regulatory';

describe('Phase 3 Unit Tests: Pure Audit Rules', () => {
  describe('1. R-MATH-01 (Line Item Arithmetic Reconciliation)', () => {
    it('positive: flags arithmetic overcharge when qty * unitRate != totalBilled', () => {
      const item: LineItem = {
        id: 'ITEM-01',
        description: 'Test Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 500, // 10 * 500 = 5000 expected
        totalBilledPaise: 6000, // billed 6000 (1000 overcharge)
      };
      const finding = evaluateMathRule(item);
      expect(finding).not.toBeNull();
      expect(finding?.ruleId).toBe('R-MATH-01');
      expect(finding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(finding?.amount).toBe(1000);
      expect(finding?.expected).toBe(5000);
      expect(finding?.actual).toBe(6000);
      expect(finding?.citation.kind).toBe('ARITHMETIC');
    });

    it('negative: returns null when qty * unitRate == totalBilled', () => {
      const item: LineItem = {
        id: 'ITEM-02',
        description: 'Test Correct Math',
        category: 'pharmacy',
        quantity: 5,
        unitRatePaise: 200,
        totalBilledPaise: 1000,
      };
      expect(evaluateMathRule(item)).toBeNull();
    });

    it('edge: handles fractional quantities with deterministic round-half-up', () => {
      const item: LineItem = {
        id: 'ITEM-03',
        description: 'Fractional Dosage',
        category: 'pharmacy',
        quantity: 2.5,
        unitRatePaise: 333, // 2.5 * 333 = 832.5 => rounds to 833 paise
        totalBilledPaise: 833,
      };
      expect(evaluateMathRule(item)).toBeNull();
    });

    it('null contract: returns null (NOT_CHECKED) if qty, unitRate, or totalBilled is null', () => {
      expect(evaluateMathRule({ id: 'N1', description: 'N', category: 'other', quantity: null, unitRatePaise: 100, totalBilledPaise: 100 })).toBeNull();
      expect(evaluateMathRule({ id: 'N2', description: 'N', category: 'other', quantity: 2, unitRatePaise: null, totalBilledPaise: 100 })).toBeNull();
      expect(evaluateMathRule({ id: 'N3', description: 'N', category: 'other', quantity: 2, unitRatePaise: 100, totalBilledPaise: null })).toBeNull();
    });
  });

  describe('2. R-TOTAL-01 (Grand Total Summation)', () => {
    it('positive: flags when stated grand total exceeds sum of line items', () => {
      const bill: MedicalBill = {
        id: 'BILL-01',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'A', category: 'other', quantity: 1, unitRatePaise: 1000, totalBilledPaise: 1000 },
          { id: 'I2', description: 'B', category: 'other', quantity: 1, unitRatePaise: 2000, totalBilledPaise: 2000 },
        ],
        totalBilledPaise: 3500, // Sum is 3000, billed 3500 (500 overcharge)
      };
      const finding = evaluateTotalRule(bill);
      expect(finding).not.toBeNull();
      expect(finding?.ruleId).toBe('R-TOTAL-01');
      expect(finding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(finding?.expected).toBe(3000);
      expect(finding?.actual).toBe(3500);
      expect(finding?.amount).toBe(500);
    });

    it('negative: returns null when stated grand total equals sum', () => {
      const bill: MedicalBill = {
        id: 'BILL-02',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'A', category: 'other', quantity: 1, unitRatePaise: 1000, totalBilledPaise: 1000 },
          { id: 'I2', description: 'B', category: 'other', quantity: 1, unitRatePaise: 2000, totalBilledPaise: 2000 },
        ],
        totalBilledPaise: 3000,
      };
      expect(evaluateTotalRule(bill)).toBeNull();
    });

    it('null contract: returns null if any item total is null', () => {
      const bill: MedicalBill = {
        id: 'BILL-03',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'A', category: 'other', quantity: 1, unitRatePaise: 1000, totalBilledPaise: null },
        ],
        totalBilledPaise: 1000,
      };
      expect(evaluateTotalRule(bill)).toBeNull();
    });
  });

  describe('3. R-DUP-01 (Duplicate Line Identification)', () => {
    it('positive: flags duplicate line items strictly as LIKELY_ISSUE', () => {
      const bill: MedicalBill = {
        id: 'BILL-DUP',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'CBC Blood Test', category: 'investigation', quantity: 1, unitRatePaise: 40000, totalBilledPaise: 40000, date: '2024-01-01' },
          { id: 'I2', description: 'CBC Blood Test', category: 'investigation', quantity: 1, unitRatePaise: 40000, totalBilledPaise: 40000, date: '2024-01-01' },
        ],
        totalBilledPaise: 80000,
      };
      const findings = evaluateDuplicateRule(bill);
      expect(findings.length).toBe(1);
      expect(findings[0].verdict).toBe('LIKELY_ISSUE'); // Strictly LIKELY_ISSUE, never CONFIRMED
      expect(findings[0].itemId).toBe('I2');
      expect(findings[0].amount).toBe(40000);
    });

    it('negative: does not flag different items or items on different dates', () => {
      const bill: MedicalBill = {
        id: 'BILL-NODUP',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-03', lengthOfStayNights: 2 },
        items: [
          { id: 'I1', description: 'CBC Blood Test', category: 'investigation', quantity: 1, unitRatePaise: 40000, totalBilledPaise: 40000, date: '2024-01-01' },
          { id: 'I2', description: 'CBC Blood Test', category: 'investigation', quantity: 1, unitRatePaise: 40000, totalBilledPaise: 40000, date: '2024-01-02' }, // different date
        ],
        totalBilledPaise: 80000,
      };
      expect(evaluateDuplicateRule(bill).length).toBe(0);
    });

    it('null contract: skips items with null amounts or zero billed', () => {
      const bill: MedicalBill = {
        id: 'BILL-NULLDUP',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'Item A', category: 'other', quantity: 1, unitRatePaise: null, totalBilledPaise: null },
          { id: 'I2', description: 'Item A', category: 'other', quantity: 1, unitRatePaise: null, totalBilledPaise: null },
        ],
        totalBilledPaise: 0,
      };
      expect(evaluateDuplicateRule(bill).length).toBe(0);
    });
  });

  describe('4. R-NPPA-01 (Statutory Price Ceilings)', () => {
    const demoRecord: NppaCeilingRecord = {
      id: 'REC-01',
      name: 'DEMO Drug Alpha 100mg',
      normalizedName: 'demo drug alpha 100mg',
      ceilingPaise: 10000, // ₹100
      unit: '1 Tablet',
      dosageForm: 'Tablet',
      strength: '100mg',
      priceUnit: 'per tablet',
      effectiveDate: '2024-01-01',
      validUntil: null,
      instrumentNumber: null,
      instrumentDate: null,
      gstTreatment: 'EXCLUDED',
      source: 'DEMO Gazette',
      sourceFile: 'demo.pdf',
      sourceUrl: 'https://example.gov.in',
      version: 'DEMO.1',
      verified: false,
      sourceRef: 'TODO',
    };

    it('positive: flags when unit rate exceeds ceiling and priceUnit matches', () => {
      const item: LineItem = {
        id: 'MED-01',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000, // ₹150 vs ₹100 ceiling
        totalBilledPaise: 150000,
      };
      const finding = evaluateNppaCeilingRule(item, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.ruleId).toBe('R-NPPA-01');
      expect(finding?.actual).toBe(15000);
      expect(finding?.expected).toBe(10000);
      expect(finding?.amount).toBe(50000); // (15000 - 10000) * 10
      expect(finding?.explanation.en).toContain('GST treatment: EXCLUDED');
    });

    it('edge: returns NEEDS_REVIEW when billing unit is unknown or incompatible', () => {
      const item: LineItem = {
        id: 'MED-02',
        description: 'DEMO Drug Alpha 100mg Pack', // Unit not detected as tablet
        category: 'pharmacy',
        quantity: 1,
        unitRatePaise: 15000,
        totalBilledPaise: 15000,
      };
      const finding = evaluateNppaCeilingRule(item, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
    });

    it('negative: returns null when unit rate is below or equal to ceiling', () => {
      const item: LineItem = {
        id: 'MED-03',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 8000, // ₹80 vs ₹100 ceiling
        totalBilledPaise: 80000,
      };
      expect(evaluateNppaCeilingRule(item, demoRecord, true)).toBeNull();
    });

    it('null contract: returns null when unitRatePaise or quantity is null', () => {
      const item: LineItem = {
        id: 'MED-04',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: null,
        unitRatePaise: 15000,
        totalBilledPaise: null,
      };
      expect(evaluateNppaCeilingRule(item, demoRecord, true)).toBeNull();
    });
  });

  describe('5. R-NPPA-02 (Printed MRP Enforcement)', () => {
    it('positive: flags when unit rate exceeds printed MRP', () => {
      const item: LineItem = {
        id: 'MRP-01',
        description: 'Saline Solution',
        category: 'consumable',
        quantity: 2,
        unitRatePaise: 12000, // ₹120 billed
        mrpPaise: 9000,       // ₹90 MRP
        totalBilledPaise: 24000,
      };
      const finding = evaluateMrpRule(item);
      expect(finding).not.toBeNull();
      expect(finding?.ruleId).toBe('R-NPPA-02');
      expect(finding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(finding?.expected).toBe(9000);
      expect(finding?.actual).toBe(12000);
      expect(finding?.amount).toBe(6000); // (12000 - 9000) * 2
    });

    it('negative: returns null when unit rate is at or below MRP', () => {
      const item: LineItem = {
        id: 'MRP-02',
        description: 'Saline Solution',
        category: 'consumable',
        quantity: 2,
        unitRatePaise: 9000,
        mrpPaise: 9000,
        totalBilledPaise: 18000,
      };
      expect(evaluateMrpRule(item)).toBeNull();
    });

    it('null contract: returns null when mrpPaise or unitRatePaise is null', () => {
      const item: LineItem = {
        id: 'MRP-03',
        description: 'No MRP item',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 5000,
        mrpPaise: null,
        totalBilledPaise: 5000,
      };
      expect(evaluateMrpRule(item)).toBeNull();
    });
  });

  describe('6. R-ANX-01 (TPA Deductions vs Annexure-I)', () => {
    const nonPayableRecord: Annexure1Record = {
      id: 'ANX-01',
      name: 'DEMO Luxury Toiletry Kit',
      normalizedName: 'demo luxury toiletry kit',
      treatment: 'NON_PAYABLE',
      listId: 'LIST_1',
      listName: 'Excluded Items',
      source: 'IRDAI Master Circular',
      sourceFile: 'irdai.pdf',
      sourceUrl: 'https://irdai.gov.in',
      effectiveDate: '2024-01-01',
      validUntil: null,
      instrumentNumber: null,
      instrumentDate: null,
      gstTreatment: 'UNKNOWN',
      version: '1.0',
      verified: false,
      sourceDocument: 'TODO',
      sourceRef: 'TODO',
    };

    const subsumedRecord: Annexure1Record = {
      ...nonPayableRecord,
      treatment: 'SUBSUMED',
      subsumedUnder: 'room_tariff',
    };

    it('returns VALID_EXCLUSION when deducted item matches NON_PAYABLE', () => {
      const item: LineItem = {
        id: 'DED-01',
        description: 'DEMO Luxury Toiletry Kit',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 50000,
        totalBilledPaise: 50000,
        deductedPaise: 50000,
      };
      const finding = evaluateAnnexureDeductionRule(item, nonPayableRecord);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('VALID_EXCLUSION');
      expect(finding?.amount).toBe(50000);
    });

    it('returns LIKELY_ISSUE with specific wording when deducted item is SUBSUMED', () => {
      const item: LineItem = {
        id: 'DED-02',
        description: 'Cotton Swabs',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 10000,
        totalBilledPaise: 10000,
        deductedPaise: 10000,
      };
      const finding = evaluateAnnexureDeductionRule(item, subsumedRecord);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('LIKELY_ISSUE');
      expect(finding?.explanation.en).toContain('Insurer deduction not supported by Annexure-I');
    });

    it('returns NEEDS_REVIEW when deducted item is not in reference data', () => {
      const item: LineItem = {
        id: 'DED-03',
        description: 'Unknown Item Deducted',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 15000,
        totalBilledPaise: 15000,
        deductedPaise: 15000,
      };
      const finding = evaluateAnnexureDeductionRule(item, null);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
    });

    it('null contract: returns null when deductedPaise is null or 0', () => {
      const item: LineItem = {
        id: 'DED-04',
        description: 'No Deduction Item',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 1000,
        totalBilledPaise: 1000,
        deductedPaise: null,
      };
      expect(evaluateAnnexureDeductionRule(item, nonPayableRecord)).toBeNull();
    });
  });

  describe('7. R-BUNDLE-01 (Room Rent & ICU Bundling)', () => {
    const bundlingRecord: RoomBundlingRecord = {
      id: 'BND-01',
      name: 'DEMO Routine Nursing',
      normalizedName: 'demo routine nursing',
      bundledWith: 'room_rent',
      description: 'Routine nursing care included in bed tariff',
      source: 'Standard Guidelines',
      sourceFile: 'guidelines.pdf',
      sourceUrl: 'https://example.gov.in',
      effectiveDate: '2024-01-01',
      validUntil: null,
      instrumentNumber: null,
      instrumentDate: null,
      gstTreatment: 'UNKNOWN',
      version: '1.0',
      verified: false,
      sourceRef: 'TODO',
    };

    it('positive: flags bundled service when room rent is billed on the bill', () => {
      const bill: MedicalBill = {
        id: 'BILL-BND',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'Single Private Room', category: 'room_rent', quantity: 1, unitRatePaise: 500000, totalBilledPaise: 500000 },
          { id: 'I2', description: 'DEMO Routine Nursing', category: 'nursing', quantity: 1, unitRatePaise: 100000, totalBilledPaise: 100000 },
        ],
        totalBilledPaise: 600000,
      };
      const finding = evaluateBundlingRule(bill.items[1], bill, bundlingRecord);
      expect(finding).not.toBeNull();
      expect(finding?.ruleId).toBe('R-BUNDLE-01');
      expect(finding?.verdict).toBe('LIKELY_ISSUE');
      expect(finding?.amount).toBe(100000);
      expect(finding?.explanation.en).toContain('likely subsumed under room/ICU charges');
      expect(finding?.explanation.en).not.toContain('illegal');
    });

    it('negative: returns null when bill does not contain room rent or ICU charges', () => {
      const bill: MedicalBill = {
        id: 'BILL-NO-ROOM',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-01', lengthOfStayNights: 0 },
        items: [
          { id: 'I1', description: 'DEMO Routine Nursing', category: 'nursing', quantity: 1, unitRatePaise: 100000, totalBilledPaise: 100000 },
        ],
        totalBilledPaise: 100000,
      };
      expect(evaluateBundlingRule(bill.items[0], bill, bundlingRecord)).toBeNull();
    });
  });

  describe('8. R-POLICY-01 (Proportionate Deductions)', () => {
    it('positive: flags improper proportionate deduction applied to pharmacy item', () => {
      // Room rent limit = ₹5,000, actual = ₹10,000 => ratio = 0.5, deduction = 50%
      const bill: MedicalBill = {
        id: 'BILL-PROP',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        policyContext: {
          sumInsuredPaise: 50000000,
          roomRentLimitPaise: 500000, // ₹5,000 limit
        },
        items: [
          { id: 'I1', description: 'Deluxe Room', category: 'room_rent', quantity: 1, unitRatePaise: 1000000, totalBilledPaise: 1000000 },
          { id: 'I2', description: 'Essential Injection', category: 'pharmacy', quantity: 1, unitRatePaise: 100000, totalBilledPaise: 100000, deductedPaise: 50000 }, // 50% deducted
        ],
        totalBilledPaise: 1100000,
      };

      const findings = evaluatePolicyRule(bill);
      expect(findings.length).toBe(1);
      expect(findings[0].ruleId).toBe('R-POLICY-01');
      expect(findings[0].verdict).toBe('LIKELY_ISSUE');
      expect(findings[0].amount).toBe(50000);
      expect(findings[0].explanation.en).toContain('Formula:');
    });

    it('negative: returns empty when room rent is within policy limit', () => {
      const bill: MedicalBill = {
        id: 'BILL-PROP-WITHIN',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        policyContext: {
          roomRentLimitPaise: 1000000, // ₹10,000 limit
        },
        items: [
          { id: 'I1', description: 'Standard Room', category: 'room_rent', quantity: 1, unitRatePaise: 800000, totalBilledPaise: 800000 },
          { id: 'I2', description: 'Injection', category: 'pharmacy', quantity: 1, unitRatePaise: 100000, totalBilledPaise: 100000, deductedPaise: 10000 },
        ],
        totalBilledPaise: 900000,
      };
      expect(evaluatePolicyRule(bill).length).toBe(0);
    });
  });
});
