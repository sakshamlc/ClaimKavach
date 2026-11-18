import { describe, it, expect } from 'vitest';
import { runAudit, AuditReferenceData } from '../../src/lib/audit/engine';
import { MedicalBill, AuditFinding } from '../../src/lib/audit/types';

describe('Phase 3 Audit Engine: Determinism, Golden-File Synthetic Bills & Central Guards', () => {
  // Golden Bill 1: Overcharge Case (Arithmetic + Statutory Ceiling + MRP)
  const goldenBillOvercharge: MedicalBill = {
    id: 'GOLDEN-SYN-01-OVERCHARGE',
    isSynthetic: true,
    billDate: '2024-06-15',
    hospital: {
      name: 'Synthetic Demo Care Hospital',
      city: 'Demo City',
      state: 'Demo State',
    },
    stay: {
      admissionDate: '2024-06-10',
      dischargeDate: '2024-06-15',
      lengthOfStayNights: 5,
      roomType: 'Twin Sharing',
    },
    items: [
      {
        // R-MATH-01: 5 * 10000 = 50000, billed 60000 (10000 arithmetic overcharge)
        id: 'GB1-ITEM-01',
        description: 'Doctor Visit Regular',
        category: 'doctor_visit',
        quantity: 5,
        unitRatePaise: 10000,
        totalBilledPaise: 60000,
        date: '2024-06-11',
      },
      {
        // R-NPPA-01: DEMO Drug Alpha 100mg ceiling is ₹100 (10000 paise). Billed at ₹150 (15000 paise).
        // Since demo data is verified: false, engine central guard MUST cap this at LIKELY_ISSUE!
        id: 'GB1-ITEM-02',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 10,
        unitRatePaise: 15000,
        totalBilledPaise: 150000,
        date: '2024-06-12',
      },
      {
        // R-NPPA-02: Billed ₹200 (20000 paise) vs printed MRP ₹150 (15000 paise) -> CONFIRMED_OVERCHARGE
        id: 'GB1-ITEM-03',
        description: 'Surgical Gauze Pack',
        category: 'consumable',
        quantity: 2,
        unitRatePaise: 20000,
        mrpPaise: 15000,
        totalBilledPaise: 40000,
        date: '2024-06-13',
      },
    ],
    totalBilledPaise: 250000, // 60000 + 150000 + 40000 = 250000
  };

  // Golden Bill 2: Bundling + TPA Deduction Case
  const goldenBillBundlingAndTpa: MedicalBill = {
    id: 'GOLDEN-SYN-02-BUNDLING-TPA',
    isSynthetic: true,
    billDate: '2024-07-20',
    hospital: {
      name: 'Synthetic Metro Hospital',
    },
    stay: {
      admissionDate: '2024-07-18',
      dischargeDate: '2024-07-20',
      lengthOfStayNights: 2,
      roomType: 'Single Private Room',
    },
    items: [
      {
        id: 'GB2-ITEM-01',
        description: 'Single Private Room Rent',
        category: 'room_rent',
        quantity: 2,
        unitRatePaise: 400000,
        totalBilledPaise: 800000,
        date: '2024-07-18',
      },
      {
        // R-BUNDLE-01: Routine Nursing billed separately when room rent is active -> LIKELY_ISSUE
        id: 'GB2-ITEM-02',
        description: 'DEMO Bundled Service Alpha',
        category: 'nursing',
        quantity: 2,
        unitRatePaise: 50000,
        totalBilledPaise: 100000,
        date: '2024-07-19',
      },
      {
        // R-ANX-01: Deducted luxury item matching NON_PAYABLE -> VALID_EXCLUSION
        id: 'GB2-ITEM-03',
        description: 'DEMO Item Gamma',
        category: 'consumable',
        quantity: 1,
        unitRatePaise: 25000,
        totalBilledPaise: 25000,
        deductedPaise: 25000,
        date: '2024-07-19',
      },
    ],
    totalBilledPaise: 925000,
  };

  // Golden Bill 3: Clean Bill => Zero Confirmed, Zero Likely Issues
  const goldenBillClean: MedicalBill = {
    id: 'GOLDEN-SYN-03-CLEAN',
    isSynthetic: true,
    billDate: '2024-08-01',
    hospital: {
      name: 'Synthetic Ideal Care Center',
    },
    stay: {
      admissionDate: '2024-08-01',
      dischargeDate: '2024-08-02',
      lengthOfStayNights: 1,
      roomType: 'General Ward',
    },
    items: [
      {
        id: 'GB3-ITEM-01',
        description: 'General Ward Bed Charges',
        category: 'room_rent',
        quantity: 1,
        unitRatePaise: 150000,
        totalBilledPaise: 150000,
        date: '2024-08-01',
      },
      {
        // Correct math, at ceiling (₹100 ceiling, billed ₹100)
        id: 'GB3-ITEM-02',
        description: 'DEMO Drug Alpha 100mg Tablet',
        category: 'pharmacy',
        quantity: 5,
        unitRatePaise: 10000,
        totalBilledPaise: 50000,
        date: '2024-08-01',
      },
    ],
    totalBilledPaise: 200000,
  };

  describe('1. Banned Words Scanner (Honest Language Guarantee)', () => {
    const bannedWords = ['illegal', 'fraud', 'cheating'];

    function scanFindingsForBannedWords(findings: AuditFinding[]) {
      for (const finding of findings) {
        const textToScan = [
          finding.title || '',
          finding.explanation.en,
          finding.explanation.hi,
          finding.suggestedAction,
        ].join(' ').toLowerCase();

        for (const word of bannedWords) {
          expect(
            textToScan.includes(word),
            `Banned word "${word}" found in finding ${finding.ruleId}: "${textToScan}"`
          ).toBe(false);
        }
      }
    }

    it('scans all golden-file audit runs and asserts zero occurrences of banned words', () => {
      const report1 = runAudit(goldenBillOvercharge);
      const report2 = runAudit(goldenBillBundlingAndTpa);
      const report3 = runAudit(goldenBillClean);

      scanFindingsForBannedWords(report1.findings);
      scanFindingsForBannedWords(report2.findings);
      scanFindingsForBannedWords(report3.findings);
    });
  });

  describe('2. Golden-File Bills Audit Executions', () => {
    it('Golden Bill 1 (Overcharge Case): produces expected totals and arithmetic findings', () => {
      const report = runAudit(goldenBillOvercharge);

      expect(report.billId).toBe('GOLDEN-SYN-01-OVERCHARGE');
      expect(report.totals.billed).toBe(250000);
      expect(report.totals.confirmed).toBeGreaterThan(0); // Arithmetic + MRP confirmed
      expect(report.totals.likely).toBeGreaterThan(0); // DEMO drug capped at likely

      // Check R-MATH-01 is present
      const mathFinding = report.findings.find((f) => f.ruleId === 'R-MATH-01');
      expect(mathFinding).toBeDefined();
      expect(mathFinding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(mathFinding?.amount).toBe(10000);

      // Check R-NPPA-02 (MRP) is present
      const mrpFinding = report.findings.find((f) => f.ruleId === 'R-NPPA-02');
      expect(mrpFinding).toBeDefined();
      expect(mrpFinding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(mrpFinding?.amount).toBe(10000);

      // Check coverage: arithmetic checked for all 3 items, regulatory checked for 1 item
      expect(report.coverage.arithmeticChecked).toBe(3);
      expect(report.coverage.regulatoryChecked).toBe(1);
      expect(report.coverage.total).toBe(3);
    });

    it('Golden Bill 2 (Bundling & TPA Case): handles bundling and valid exclusions', () => {
      const report = runAudit(goldenBillBundlingAndTpa);

      expect(report.billId).toBe('GOLDEN-SYN-02-BUNDLING-TPA');
      expect(report.totals.billed).toBe(925000);

      // R-BUNDLE-01 should be LIKELY_ISSUE
      const bundleFinding = report.findings.find((f) => f.ruleId === 'R-BUNDLE-01');
      expect(bundleFinding).toBeDefined();
      expect(bundleFinding?.verdict).toBe('LIKELY_ISSUE');
      expect(bundleFinding?.amount).toBe(100000);
      expect(bundleFinding?.explanation.en).toContain('likely subsumed under room/ICU charges');

      // R-ANX-01 should be VALID_EXCLUSION
      const anxFinding = report.findings.find((f) => f.ruleId === 'R-ANX-01');
      expect(anxFinding).toBeDefined();
      expect(anxFinding?.verdict).toBe('VALID_EXCLUSION');
      expect(anxFinding?.amount).toBe(25000);

      // Valid exclusions do NOT reduce fair amount or inflate confirmed/likely
      expect(report.totals.confirmed).toBe(0);
      expect(report.totals.likely).toBe(100000);
      expect(report.totals.fair).toBe(825000); // 925000 - 100000
    });

    it('Golden Bill 3 (Clean Bill): results in zero confirmed and zero likely issues', () => {
      const report = runAudit(goldenBillClean);

      expect(report.billId).toBe('GOLDEN-SYN-03-CLEAN');
      expect(report.totals.billed).toBe(200000);
      expect(report.totals.confirmed).toBe(0);
      expect(report.totals.likely).toBe(0);
      expect(report.totals.fair).toBe(200000);
      expect(report.findings.length).toBe(0);
      expect(report.coverage.arithmeticChecked).toBe(2);
      expect(report.coverage.regulatoryChecked).toBe(1);
      expect(report.coverage.total).toBe(2);
    });
  });

  describe('3. Engine Determinism & Pure Functional Guarantees', () => {
    it('runs runAudit twice on the same bill and produces an exact deep-equal match', () => {
      const run1 = runAudit(goldenBillOvercharge);
      const run2 = runAudit(goldenBillOvercharge);

      expect(run1).toEqual(run2);
      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });

    it('never emits timestamps (generatedAt) in the report object', () => {
      const report = runAudit(goldenBillOvercharge);
      expect('generatedAt' in report).toBe(false);
      expect(Object.keys(report)).not.toContain('generatedAt');
    });
  });

  describe('4. Central Integrity Guards: DEMO Data Capping & Date Validity', () => {
    it('guarantees that DEMO (verified: false) reference data can NEVER produce CONFIRMED_OVERCHARGE', () => {
      const report = runAudit(goldenBillOvercharge);

      // Look at the finding derived from DEMO Drug Alpha
      const drugFinding = report.findings.find(
        (f) => f.ruleId === 'R-NPPA-01' && f.itemId === 'GB1-ITEM-02'
      );
      expect(drugFinding).toBeDefined();
      expect(drugFinding?.citation.kind).toBe('REGULATORY');
      if (drugFinding?.citation.kind === 'REGULATORY') {
        expect(drugFinding.citation.verified).toBe(false);
      }
      // Engine MUST have capped this finding at LIKELY_ISSUE because verified is false!
      expect(drugFinding?.verdict).toBe('LIKELY_ISSUE');
    });

    it('downgrades regulatory finding to NEEDS_REVIEW when bill date is missing or expired', () => {
      // Bill with missing billDate
      const billWithoutDate: MedicalBill = {
        ...goldenBillOvercharge,
        id: 'BILL-NO-DATE',
        billDate: null,
        items: goldenBillOvercharge.items.map((i) => ({ ...i, date: null })),
      };

      const report = runAudit(billWithoutDate);
      const drugFinding = report.findings.find(
        (f) => f.ruleId === 'R-NPPA-01' && f.itemId === 'GB1-ITEM-02'
      );
      expect(drugFinding).toBeDefined();
      expect(drugFinding?.verdict).toBe('NEEDS_REVIEW');
      expect(drugFinding?.explanation.en).toContain('missing');
    });
  });

  describe('5. Dual Coverage & notCheckedItems Tracking', () => {
    it('correctly tracks items checked for arithmetic, regulatory, and notCheckedItems', () => {
      const partialBill: MedicalBill = {
        id: 'BILL-PARTIAL',
        isSynthetic: true,
        hospital: { name: 'Hospital' },
        stay: { admissionDate: '2024-01-01', dischargeDate: '2024-01-02', lengthOfStayNights: 1 },
        items: [
          // Item 1: Complete money fields -> arithmetic checked
          { id: 'I1', description: 'Item 1', category: 'other', quantity: 1, unitRatePaise: 1000, totalBilledPaise: 1000 },
          // Item 2: Unpriced pharmacy -> arithmetic NOT checked, but matches DEMO drug -> regulatory checked
          { id: 'I2', description: 'DEMO Drug Alpha 100mg Tablet', category: 'pharmacy', quantity: null, unitRatePaise: null, totalBilledPaise: null },
          // Item 3: Unpriced unknown consumable -> neither arithmetic nor regulatory checked -> in notCheckedItems
          { id: 'I3', description: 'Mystery Unpriced Tube', category: 'other', quantity: null, unitRatePaise: null, totalBilledPaise: null },
        ],
        totalBilledPaise: 1000,
      };

      const report = runAudit(partialBill);

      expect(report.coverage.arithmeticChecked).toBe(1); // I1
      expect(report.coverage.regulatoryChecked).toBe(1); // I2
      expect(report.coverage.total).toBe(3);
      expect(report.notCheckedItems).toBeDefined();
      expect(report.notCheckedItems?.length).toBe(1);
      expect(report.notCheckedItems?.[0].id).toBe('I3');
    });
  });
});
