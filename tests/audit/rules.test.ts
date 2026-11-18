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
  describe('1. R-MATH-01 (Line Item Arithmetic Reconciliation & Confirmation)', () => {
    it('positive: flags CONFIRMED_OVERCHARGE when item is userEdited/verified or confidence >= threshold', () => {
      const item: LineItem = {
        id: 'ITEM-01',
        description: 'Test Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 500, // 10 * 500 = 5000 expected
        totalBilledPaise: 6000,
        userEdited: true, // Marked userEdited!
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

    it('caps at LIKELY_ISSUE when line item confidence is below threshold and not userEdited/verified', () => {
      const item: LineItem = {
        id: 'ITEM-LOW-CONF',
        description: 'Unverified OCR Line',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 500,
        totalBilledPaise: 6000,
        confidence: 0.65, // Below 0.90 threshold
        userEdited: false,
        verified: false,
      };
      const finding = evaluateMathRule(item, { confidenceThreshold: 0.9 });
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('LIKELY_ISSUE'); // Capped at LIKELY_ISSUE
      expect(finding?.explanation.en).toContain('confidence below confirmation threshold');
    });

    it('caps at LIKELY_ISSUE when bill has unextracted discount or tax columns', () => {
      const item: LineItem = {
        id: 'ITEM-UNEXTRACTED',
        description: 'Line on Complex Bill',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 500,
        totalBilledPaise: 6000,
        userEdited: true,
      };
      const finding = evaluateMathRule(item, { hasUnextractedDiscountOrTax: true });
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('LIKELY_ISSUE');
      expect(finding?.explanation.en).toContain('Unextracted discount or tax columns detected');
    });

    it('accounts for extracted item-level discount and tax in arithmetic check', () => {
      // 10 * 500 = 5000 subtotal, - 500 discount + 200 tax = 4700 expected
      const itemWithDiscounts: LineItem = {
        id: 'ITEM-DISC',
        description: 'Discounted Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 500,
        discountPaise: 500,
        taxPaise: 200,
        totalBilledPaise: 4700, // Matches exactly!
      };
      expect(evaluateMathRule(itemWithDiscounts)).toBeNull();

      // If billed 5000 instead of 4700 => 300 overcharge
      const itemWithOvercharge: LineItem = {
        ...itemWithDiscounts,
        totalBilledPaise: 5000,
        userEdited: true,
      };
      const finding = evaluateMathRule(itemWithOvercharge);
      expect(finding).not.toBeNull();
      expect(finding?.expected).toBe(4700);
      expect(finding?.actual).toBe(5000);
      expect(finding?.amount).toBe(300);
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

    it('null contract: returns null (NOT_CHECKED) if qty, unitRate, or totalBilled is null or undefined', () => {
      expect(evaluateMathRule({ id: 'N1', description: 'N', category: 'other', quantity: null, unitRatePaise: 100, totalBilledPaise: 100 })).toBeNull();
      expect(evaluateMathRule({ id: 'N2', description: 'N', category: 'other', quantity: 2, unitRatePaise: null, totalBilledPaise: 100 })).toBeNull();
      expect(evaluateMathRule({ id: 'N3', description: 'N', category: 'other', quantity: 2, unitRatePaise: 100, totalBilledPaise: null })).toBeNull();
    });
  });

  describe('2. R-TOTAL-01 (Grand Total Summation & Confirmation)', () => {
    it('positive: flags CONFIRMED_OVERCHARGE when all items are verified/high-confidence', () => {
      const bill: MedicalBill = {
        id: 'BILL-01',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'A', category: 'other', quantity: 1, unitRatePaise: 1000, totalBilledPaise: 1000, userEdited: true },
          { id: 'I2', description: 'B', category: 'other', quantity: 1, unitRatePaise: 2000, totalBilledPaise: 2000, verified: true },
        ],
        totalBilledPaise: 3500, // Sum is 3000, billed 3500
      };
      const finding = evaluateTotalRule(bill, { confidenceThreshold: 0.9 });
      expect(finding).not.toBeNull();
      expect(finding?.ruleId).toBe('R-TOTAL-01');
      expect(finding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(finding?.expected).toBe(3000);
      expect(finding?.actual).toBe(3500);
      expect(finding?.amount).toBe(500);
    });

    it('caps at LIKELY_ISSUE when any line item is low-confidence or bill has unextracted columns', () => {
      const billLowConf: MedicalBill = {
        id: 'BILL-LOW-CONF',
        hospital: { name: 'Hospital A' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          { id: 'I1', description: 'A', category: 'other', quantity: 1, unitRatePaise: 1000, totalBilledPaise: 1000, confidence: 0.5 },
        ],
        totalBilledPaise: 1500,
      };
      const finding = evaluateTotalRule(billLowConf);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('LIKELY_ISSUE');
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
      expect(findings[0].verdict).toBe('LIKELY_ISSUE');
      expect(findings[0].itemId).toBe('I2');
      expect(findings[0].amount).toBe(40000);
    });
  });

  describe('4. R-NPPA-01 (Statutory Price Ceilings & Strict Specification Matching)', () => {
    const demoRecord: NppaCeilingRecord = {
      id: 'REC-01',
      name: 'DEMO Drug Alpha 100mg',
      normalizedName: 'demo drug alpha 100mg',
      ceilingPaise: 10000, // ₹100
      unit: '1 Tablet',
      dosageForm: 'Tablet',
      strength: '100mg',
      priceUnit: 'per tablet',
      priceType: 'CEILING',
      manufacturer: null,
      marketer: null,
      rawComposition: 'DEMO Composition 100mg',
      ingredients: [{ name: 'DEMO Drug Alpha', strength: '100mg' }],
      effectiveDate: '2024-01-01',
      validUntil: null,
      instrumentNumber: null,
      instrumentDate: null,
      gstTreatment: 'EXCLUDED',
      source: 'NPPA Drug Schedule',
      sourceFile: 'demo.pdf',
      sourceUrl: 'https://example.gov.in',
      version: 'DEMO.1',
      verified: false,
      sourceRef: 'Table A, Row 1',
    };

    const retailDemoRecord: NppaCeilingRecord = {
      ...demoRecord,
      id: 'REC-RETAIL-01',
      name: 'DEMO Retail Drug 100mg',
      normalizedName: 'demo retail drug 100mg',
      priceType: 'RETAIL',
      ceilingPaise: undefined,
      pricePaise: 10000,
      manufacturer: 'M/s Akums Drugs & Pharmaceuticals Ltd.',
      marketer: 'M/s Emcure Pharmaceuticals Ltd.',
      source: 'NPPA Retail Price Order',
      sourceRef: 'Page 8, Sl. No. 1',
    };

    it('positive: flags overcharge when name, strength, dosageForm and priceUnit match (GST excluded)', () => {
      const item: LineItem = {
        id: 'MED-01',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        billedPriceIncludesGst: false, // Explicitly excludes GST
      };
      const finding = evaluateNppaCeilingRule(item, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.ruleId).toBe('R-NPPA-01');
      expect(finding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(finding?.amount).toBe(50000); // (15000 - 10000) * 10 = 50000
      expect(finding?.explanation.en).toContain('directly compared to GST-exclusive regulatory benchmark');
      expect(finding?.explanation.en).not.toContain('cannot add margin except');
    });

    it('GST handling: unstated billedPriceIncludesGst (null) caps potential overcharge at NEEDS_REVIEW', () => {
      const itemNullGst: LineItem = {
        id: 'MED-NULL-GST',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        billedPriceIncludesGst: null, // Unstated
      };
      const finding = evaluateNppaCeilingRule(itemNullGst, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
      expect(finding?.explanation.en).toContain('GST status of billed unit rate is unstated');
    });

    it('GST handling: billedPriceIncludesGst true without gstRatePct caps at NEEDS_REVIEW', () => {
      const itemNoRate: LineItem = {
        id: 'MED-NO-RATE',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        billedPriceIncludesGst: true,
        gstRatePct: null, // Missing rate
      };
      const finding = evaluateNppaCeilingRule(itemNoRate, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
      expect(finding?.explanation.en).toContain('cannot compute pre-tax rate without rate. Specify GST percentage');
    });

    it('GST handling: billedPriceIncludesGst true with gstRatePct incorporates GST into benchmark', () => {
      // Ceiling is 10000 (Rs 100). 5% GST on ceiling gives 10500 paise (Rs 105).
      // Billed rate is 12000 paise (Rs 120).
      // Overcharge per unit = 12000 - 10500 = 1500 paise. Total (qty 5) = 7500 paise.
      const itemWithGst: LineItem = {
        id: 'MED-WITH-GST',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 5,
        unitRatePaise: 12000,
        totalBilledPaise: 60000,
        billedPriceIncludesGst: true,
        gstRatePct: 5,
      };
      const finding = evaluateNppaCeilingRule(itemWithGst, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(finding?.amount).toBe(7500); // (12000 - 10500) * 5
      expect(finding?.explanation.en).toContain('Billed price includes GST at 5%');
      expect(finding?.explanation.en).toContain('inclusive of 5% GST');
    });

    it('GST edge test: confirms adjusted ceiling = ceiling x (1 + rate/100) with integer paise half-up rounding', () => {
      // 1. Edge test for half-up (fractional .50 rounds up):
      // Ceiling = 1010 paise, GST rate = 5%. 1010 * 1.05 = 1060.50 => rounds up to 1061 paise.
      const halfUpRecord: NppaCeilingRecord = {
        ...demoRecord,
        ceilingPaise: 1010,
      };
      // Billed at exactly 1061 paise => compliant (no overcharge)
      const itemCompliant: LineItem = {
        id: 'MED-GST-ROUND-1',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 1,
        unitRatePaise: 1061,
        totalBilledPaise: 1061,
        billedPriceIncludesGst: true,
        gstRatePct: 5,
      };
      expect(evaluateNppaCeilingRule(itemCompliant, halfUpRecord, true)).toBeNull();

      // Billed at 1062 paise => 1 paise overcharge
      const itemOvercharge: LineItem = {
        ...itemCompliant,
        unitRatePaise: 1062,
        totalBilledPaise: 1062,
      };
      const findingHalfUp = evaluateNppaCeilingRule(itemOvercharge, halfUpRecord, true);
      expect(findingHalfUp).not.toBeNull();
      expect(findingHalfUp?.amount).toBe(1); // 1062 - 1061 = 1 paise
      expect(findingHalfUp?.expected).toBe(1061);

      // 2. Edge test for round-down (fractional .45 rounds down):
      // Ceiling = 1009 paise, GST rate = 5%. 1009 * 1.05 = 1059.45 => rounds down to 1059 paise.
      const roundDownRecord: NppaCeilingRecord = {
        ...demoRecord,
        ceilingPaise: 1009,
      };
      const itemRoundDownCompliant: LineItem = {
        ...itemCompliant,
        unitRatePaise: 1059,
        totalBilledPaise: 1059,
      };
      expect(evaluateNppaCeilingRule(itemRoundDownCompliant, roundDownRecord, true)).toBeNull();

      // Billed at 1060 paise => 1 paise overcharge against rounded down benchmark 1059
      const itemRoundDownOvercharge: LineItem = {
        ...itemCompliant,
        unitRatePaise: 1060,
        totalBilledPaise: 1060,
      };
      const findingRoundDown = evaluateNppaCeilingRule(itemRoundDownOvercharge, roundDownRecord, true);
      expect(findingRoundDown).not.toBeNull();
      expect(findingRoundDown?.amount).toBe(1); // 1060 - 1059 = 1 paise
      expect(findingRoundDown?.expected).toBe(1059);
    });

    it('A5 Amount check: NPPA finding amount = (billed unit price - ceiling) x qty in integer paise', () => {
      const itemCalc: LineItem = {
        id: 'MED-CALC',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 7,
        unitRatePaise: 13500, // 135.00
        totalBilledPaise: 94500,
        billedPriceIncludesGst: false,
      };
      // Ceiling is 10000 paise. Overcharge = (13500 - 10000) * 7 = 3500 * 7 = 24500 paise.
      const finding = evaluateNppaCeilingRule(itemCalc, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.amount).toBe(24500);
      expect(Number.isInteger(finding?.amount)).toBe(true);
    });

    it('specification mismatch test: "DEMO Drug Alpha 500mg" must not match the 100mg record', () => {
      const item500mg: LineItem = {
        id: 'MED-500MG',
        description: 'DEMO Drug Alpha 500mg Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 25000,
        totalBilledPaise: 250000,
      };
      // Must yield null (NOT_CHECKED) because strength differs (500mg vs 100mg)
      const finding = evaluateNppaCeilingRule(item500mg, demoRecord, false);
      expect(finding).toBeNull();
    });

    it('dosage form mismatch test: differing form (Capsule vs Tablet) yields null', () => {
      const itemCapsule: LineItem = {
        id: 'MED-CAP',
        description: 'DEMO Drug Alpha 100mg Capsule',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 25000,
        totalBilledPaise: 250000,
      };
      const finding = evaluateNppaCeilingRule(itemCapsule, demoRecord, false);
      expect(finding).toBeNull();
    });

    it('name-only match test: missing strength yields NEEDS_REVIEW ("possible match, confirm product")', () => {
      const itemNameOnly: LineItem = {
        id: 'MED-NAME-ONLY',
        description: 'DEMO Drug Alpha Tablet', // No strength specified
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        billedPriceIncludesGst: false,
      };
      const finding = evaluateNppaCeilingRule(itemNameOnly, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
      expect(finding?.explanation.en).toContain('possible match, confirm product');
    });

    it('retail priceType: yields NEEDS_REVIEW when manufacturer does not match', () => {
      const itemWrongMfr: LineItem = {
        id: 'MED-RETAIL-WRONG',
        description: 'DEMO Retail Drug 100mg Tablet (Cipla Ltd)',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        billedPriceIncludesGst: false,
      };
      const finding = evaluateNppaCeilingRule(itemWrongMfr, retailDemoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
      expect(finding?.title).toBe('Manufacturer-Specific Retail Price Review');
      expect(finding?.explanation.en).toContain('applies specifically to manufacturer');
    });

    it('retail priceType: yields LIKELY_ISSUE (never CONFIRMED_OVERCHARGE) when both manufacturer and marketer match', () => {
      const itemMatchingMfr: LineItem = {
        id: 'MED-RETAIL-MATCH',
        description: 'DEMO Retail Drug 100mg Tablet (Akums / Emcure)',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        billedPriceIncludesGst: false,
      };
      // Even with isExactMatch = true, RETAIL records can NEVER produce CONFIRMED_OVERCHARGE
      const finding = evaluateNppaCeilingRule(itemMatchingMfr, retailDemoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('LIKELY_ISSUE');
      expect(finding?.amount).toBe(50000);
    });

    it('retail priceType: yields NEEDS_REVIEW when only marketer matches but manufacturer is missing', () => {
      const itemPartialMfr: LineItem = {
        id: 'MED-RETAIL-PARTIAL',
        description: 'DEMO Retail Drug 100mg Tablet (Emcure)',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        billedPriceIncludesGst: false,
      };
      const finding = evaluateNppaCeilingRule(itemPartialMfr, retailDemoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
      expect(finding?.title).toBe('Manufacturer-Specific Retail Price Review');
    });

    it('unit mismatch test: unconfirmed billing unit yields NEEDS_REVIEW', () => {
      const itemStripUnit: LineItem = {
        id: 'MED-STRIP',
        description: 'DEMO Drug Alpha 100mg Tablet Strip', // Dosage form is tablet, but billed unit is Strip vs per tablet
        category: 'pharmacy',
        quantity: 1,
        unitRatePaise: 15000,
        totalBilledPaise: 15000,
      };
      const finding = evaluateNppaCeilingRule(itemStripUnit, demoRecord, true);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
      expect(finding?.title).toBe('Ceiling Price Unit Verification Required');
    });
  });

  describe('5. R-NPPA-02 (Printed MRP Neutral Wording)', () => {
    it('uses neutral wording without remembered legal claims', () => {
      const item: LineItem = {
        id: 'MRP-01',
        description: 'Saline Solution',
        category: 'consumable',
        quantity: 2,
        unitRatePaise: 12000,
        mrpPaise: 9000,
        totalBilledPaise: 24000,
      };
      const finding = evaluateMrpRule(item);
      expect(finding).not.toBeNull();
      expect(finding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(finding?.explanation.en).toContain('exceeds the MRP');
      expect(finding?.explanation.en).not.toContain('DPCO');
      expect(finding?.explanation.en).not.toContain('Legal Metrology');
    });
  });

  describe('6. R-ANX-01 (TPA Deductions: Exact Treatment Mapping)', () => {
    const nonPayableRecord: Annexure1Record = {
      id: 'ANX-01',
      name: 'DEMO Luxury Toiletry Kit',
      normalizedName: 'demo luxury toiletry kit',
      treatment: 'NON_PAYABLE',
      listId: 'LIST_1',
      listName: 'Excluded Items',
      source: 'IRDAI Annexure-I',
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

    const optionalRecord: Annexure1Record = {
      ...nonPayableRecord,
      id: 'ANX-OPT',
      name: 'Special Post-Op Kit',
      treatment: 'OPTIONAL',
    };

    const subsumedRecord: Annexure1Record = {
      ...nonPayableRecord,
      id: 'ANX-SUB',
      name: 'Routine IV Set',
      treatment: 'SUBSUMED',
    };

    it('NON_PAYABLE => VALID_EXCLUSION', () => {
      const item: LineItem = {
        id: 'DED-01',
        description: 'DEMO Luxury Toiletry Kit',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 50000,
        totalBilledPaise: 50000,
        deductedPaise: 50000,
      };
      const finding = evaluateAnnexureDeductionRule(item, nonPayableRecord, true);
      expect(finding?.verdict).toBe('VALID_EXCLUSION');
    });

    it('OPTIONAL => NEEDS_REVIEW ("payable only if the policy includes the optional cover; check policy")', () => {
      const item: LineItem = {
        id: 'DED-02',
        description: 'Special Post-Op Kit',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 20000,
        totalBilledPaise: 20000,
        deductedPaise: 20000,
      };
      const finding = evaluateAnnexureDeductionRule(item, optionalRecord, true);
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
      expect(finding?.explanation.en).toContain('Payable only if the policy includes the optional cover; check policy');
    });

    it('SUBSUMED => returns null (no insurer-deduction finding)', () => {
      const item: LineItem = {
        id: 'DED-03',
        description: 'Routine IV Set',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 10000,
        totalBilledPaise: 10000,
        deductedPaise: 10000,
      };
      const finding = evaluateAnnexureDeductionRule(item, subsumedRecord, true);
      expect(finding).toBeNull(); // No insurer deduction finding!
    });

    it('Not in reference data => LIKELY_ISSUE with exact wording when reference data is loaded', () => {
      const item: LineItem = {
        id: 'DED-04',
        description: 'Unlisted Suture Kit',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 15000,
        totalBilledPaise: 15000,
        deductedPaise: 15000,
      };
      const finding = evaluateAnnexureDeductionRule(item, null, true);
      expect(finding?.verdict).toBe('LIKELY_ISSUE');
      expect(finding?.explanation.en).toContain('Insurer deduction not supported by Annexure-I (a policy exclusion may still apply)');
    });

    it('Not in reference data => capped at NEEDS_REVIEW when no reference data is loaded', () => {
      const item: LineItem = {
        id: 'DED-05',
        description: 'Unlisted Item',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 15000,
        totalBilledPaise: 15000,
        deductedPaise: 15000,
      };
      const finding = evaluateAnnexureDeductionRule(item, null, false); // no reference data
      expect(finding?.verdict).toBe('NEEDS_REVIEW');
    });
  });

  describe('7. R-BUNDLE-01 (Neutral Wording)', () => {
    const bundlingRecord: RoomBundlingRecord = {
      id: 'BND-01',
      name: 'DEMO Routine Nursing',
      normalizedName: 'demo routine nursing',
      bundledWith: 'room_rent',
      description: 'Routine nursing care included in bed tariff',
      source: 'Room Bundling Schedule',
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

    it('uses neutral data-derived wording and avoids remembered legal claims', () => {
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
      expect(finding?.verdict).toBe('LIKELY_ISSUE');
      expect(finding?.explanation.en).toContain('likely subsumed under room/ICU charges');
      expect(finding?.explanation.en).not.toContain('illegal');
      expect(finding?.explanation.en).not.toContain('standard healthcare billing guidelines');
    });
  });

  describe('8. R-POLICY-01 (Proportionate Deductions are NEEDS_REVIEW)', () => {
    it('generates NEEDS_REVIEW finding showing formula and inputs', () => {
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
          { id: 'I2', description: 'Essential Injection', category: 'pharmacy', quantity: 1, unitRatePaise: 100000, totalBilledPaise: 100000, deductedPaise: 50000 },
        ],
        totalBilledPaise: 1100000,
      };

      const findings = evaluatePolicyRule(bill);
      expect(findings.length).toBe(1);
      expect(findings[0].ruleId).toBe('R-POLICY-01');
      expect(findings[0].verdict).toBe('NEEDS_REVIEW'); // Proportionate deduction on medicine is NEEDS_REVIEW
      expect(findings[0].explanation.en).toContain('Formula: Associated Charges × (1 - Room Rent Cap / Actual Room Rent)');
      expect(findings[0].explanation.en).toContain('Inputs: Room Rent Cap =');
      expect(findings[0].explanation.en).not.toContain('Under IRDAI guidelines');
    });
  });
});
