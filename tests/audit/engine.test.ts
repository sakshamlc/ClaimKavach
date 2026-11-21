import { describe, it, expect } from 'vitest';
import { runAudit } from '../../src/lib/audit/engine';
import { MedicalBill, AuditFinding, getReferenceDataBadge } from '../../src/lib/audit/types';
import { ImplantCeilingRecord } from '../../src/lib/audit/regulatory';
import { getDemoReferenceData } from '../fixtures/regulatory';

const demoRefData = getDemoReferenceData();
function runAuditWithDemo(bill: MedicalBill) {
  return runAudit(bill, demoRefData);
}

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
        userEdited: true, // User verified => allows CONFIRMED_OVERCHARGE
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
        billedPriceIncludesGst: false,
        confidence: 0.98,
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
        verified: true,
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
        userEdited: true,
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
        userEdited: true,
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
        userEdited: true,
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
        userEdited: true,
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
        userEdited: true,
      },
    ],
    totalBilledPaise: 200000,
  };

  describe('1. Banned Words & Remembered Claims Scanner', () => {
    // Prohibited words and unverified remembered claims
    const bannedPatterns = [
      'illegal',
      'fraud',
      'cheating',
      'cannot add margin except',
      'legal metrology',
      'dpco',
      'standard healthcare billing guidelines',
    ];

    function scanFindingsForBannedPatterns(findings: AuditFinding[]) {
      for (const finding of findings) {
        const textToScan = [
          finding.title || '',
          finding.explanation.en,
          finding.explanation.hi,
          finding.suggestedAction,
        ].join(' ').toLowerCase();

        for (const pattern of bannedPatterns) {
          expect(
            textToScan.includes(pattern),
            `Banned or remembered pattern "${pattern}" found in finding ${finding.ruleId}: "${textToScan}"`
          ).toBe(false);
        }
      }
    }

    it('scans all golden-file audit runs and asserts zero occurrences of banned words or remembered claims', () => {
      const report1 = runAuditWithDemo(goldenBillOvercharge);
      const report2 = runAuditWithDemo(goldenBillBundlingAndTpa);
      const report3 = runAuditWithDemo(goldenBillClean);

      scanFindingsForBannedPatterns(report1.findings);
      scanFindingsForBannedPatterns(report2.findings);
      scanFindingsForBannedPatterns(report3.findings);
    });
  });

  describe('2. Golden-File Bills Audit Executions', () => {
    it('Golden Bill 1 (Overcharge Case): runs on synthetic fixture dataset (getDemoReferenceData()) and produces expected totals and arithmetic findings', () => {
      const report = runAuditWithDemo(goldenBillOvercharge);

      expect(report.billId).toBe('GOLDEN-SYN-01-OVERCHARGE');
      expect(report.totals.billed).toBe(250000);
      expect(report.totals.confirmed).toBe(20000); // Arithmetic (10000) + MRP (10000) confirmed
      expect(report.totals.likely).toBe(50000); // DEMO drug capped at likely
      expect(report.totals.fair).toBe(230000); // Billed - confirmed (250000 - 20000)
      expect(report.totals.ifLikelyUpheld).toBe(180000); // Fair - likely (230000 - 50000)

      // Check R-MATH-01 is confirmed
      const mathFinding = report.findings.find((f) => f.ruleId === 'R-MATH-01');
      expect(mathFinding).toBeDefined();
      expect(mathFinding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(mathFinding?.amount).toBe(10000);

      // Check R-NPPA-02 (MRP) is confirmed
      const mrpFinding = report.findings.find((f) => f.ruleId === 'R-NPPA-02');
      expect(mrpFinding).toBeDefined();
      expect(mrpFinding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(mrpFinding?.amount).toBe(10000);

      // Check coverage
      expect(report.coverage.arithmeticChecked).toBe(3);
      expect(report.coverage.regulatoryChecked).toBe(1);
      expect(report.coverage.total).toBe(3);
    });

    it('Golden Bill 2 (Bundling & TPA Case): runs on synthetic fixture dataset (getDemoReferenceData()) and handles bundling and valid exclusions', () => {
      const report = runAuditWithDemo(goldenBillBundlingAndTpa);

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
      expect(report.totals.fair).toBe(925000); // Billed - confirmed (925000 - 0)
      expect(report.totals.ifLikelyUpheld).toBe(825000); // Fair - likely (925000 - 100000)
    });

    it('Golden Bill 3 (Clean Bill): runs on synthetic fixture dataset (getDemoReferenceData()) and results in zero confirmed and zero likely issues', () => {
      const report = runAuditWithDemo(goldenBillClean);

      expect(report.billId).toBe('GOLDEN-SYN-03-CLEAN');
      expect(report.totals.billed).toBe(200000);
      expect(report.totals.confirmed).toBe(0);
      expect(report.totals.likely).toBe(0);
      expect(report.totals.fair).toBe(200000);
      expect(report.totals.ifLikelyUpheld).toBe(200000);
      expect(report.findings.length).toBe(0);
      expect(report.coverage.arithmeticChecked).toBe(2);
      expect(report.coverage.regulatoryChecked).toBe(1);
      expect(report.coverage.total).toBe(2);
    });
  });

  describe('3. Engine Determinism & Pure Functional Guarantees', () => {
    it('runs runAudit twice on the same bill and produces an exact deep-equal match', () => {
      const run1 = runAuditWithDemo(goldenBillOvercharge);
      const run2 = runAuditWithDemo(goldenBillOvercharge);

      expect(run1).toEqual(run2);
      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });

    it('never emits timestamps (generatedAt) in the report object', () => {
      const report = runAuditWithDemo(goldenBillOvercharge);
      expect('generatedAt' in report).toBe(false);
      expect(Object.keys(report)).not.toContain('generatedAt');
    });
  });

  describe('4. Central Integrity Guards: DEMO Data Capping & Date Validity', () => {
    it('guarantees that DEMO (verified: false) reference data can NEVER produce CONFIRMED_OVERCHARGE', () => {
      const report = runAuditWithDemo(goldenBillOvercharge);

      const drugFinding = report.findings.find(
        (f) => f.ruleId === 'R-NPPA-01' && f.itemId === 'GB1-ITEM-02'
      );
      expect(drugFinding).toBeDefined();
      expect(drugFinding?.citation.kind).toBe('REGULATORY');
      if (drugFinding?.citation.kind === 'REGULATORY') {
        expect(drugFinding.citation.verified).toBe(false);
      }
      expect(drugFinding?.verdict).toBe('LIKELY_ISSUE');
    });

    it('caps arithmetic findings at LIKELY_ISSUE if bill has unextracted discount/tax columns', () => {
      const billWithUnextractedCols: MedicalBill = {
        ...goldenBillOvercharge,
        id: 'BILL-UNEXTRACTED-COLS',
        hasUnextractedDiscountOrTax: true,
      };

      const report = runAuditWithDemo(billWithUnextractedCols);
      const mathFinding = report.findings.find((f) => f.ruleId === 'R-MATH-01');
      expect(mathFinding).toBeDefined();
      expect(mathFinding?.verdict).toBe('LIKELY_ISSUE');
    });

    it('downgrades regulatory finding to NEEDS_REVIEW when bill date is missing or expired', () => {
      const billWithoutDate: MedicalBill = {
        ...goldenBillOvercharge,
        id: 'BILL-NO-DATE',
        billDate: null,
        items: goldenBillOvercharge.items.map((i) => ({ ...i, date: null })),
      };

      const report = runAuditWithDemo(billWithoutDate);
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
          // Item 1: Complete money fields -> arithmetic checked, but matches no reference data -> in notCheckedItems
          { id: 'I1', description: 'Item 1', category: 'other', quantity: 1, unitRatePaise: 1000, totalBilledPaise: 1000 },
          // Item 2: Unpriced pharmacy -> arithmetic NOT checked, but matches DEMO drug -> regulatory checked
          { id: 'I2', description: 'DEMO Drug Alpha 100mg Tablet', category: 'pharmacy', quantity: null, unitRatePaise: null, totalBilledPaise: null },
          // Item 3: Unpriced unknown consumable -> matches no reference data -> in notCheckedItems
          { id: 'I3', description: 'Mystery Unpriced Tube', category: 'other', quantity: null, unitRatePaise: null, totalBilledPaise: null },
        ],
        totalBilledPaise: 1000,
      };

      const report = runAuditWithDemo(partialBill);

      expect(report.coverage.arithmeticChecked).toBe(1); // I1
      expect(report.coverage.regulatoryChecked).toBe(1); // I2
      expect(report.coverage.notCheckedCount).toBe(2);   // I1 and I3
      expect(report.coverage.total).toBe(3);
      expect(report.notCheckedItems).toBeDefined();
      expect(report.notCheckedItems?.length).toBe(2);
      expect(report.notCheckedItems?.map((i) => i.id)).toEqual(['I1', 'I3']);
    });

    it('runs runAudit with default production datasets against a real formulation bill', () => {
      const realBill: MedicalBill = {
        id: 'REAL-BILL-01',
        isSynthetic: false,
        billDate: '2026-05-10',
        hospital: { name: 'Apollo Health' },
        stay: { admissionDate: '2026-05-09', dischargeDate: '2026-05-10', lengthOfStayNights: 1 },
        items: [
          {
            id: 'R1',
            description: 'Aceclofenac 100mg + Paracetamol 325mg Tablets (Shiva Biogenetic / Softdeal Pharmaceutical)',
            category: 'pharmacy',
            quantity: 10,
            unitRatePaise: 800, // 8.00 vs ceiling 5.46 (546 paise)
            totalBilledPaise: 8000,
            date: '2026-05-10',
            billedPriceIncludesGst: false,
          },
        ],
        totalBilledPaise: 8000,
      };

      const report = runAudit(realBill);
      expect(report.billId).toBe('REAL-BILL-01');
      expect(report.findings.length).toBeGreaterThan(0);
      const nppaFinding = report.findings.find((f) => f.ruleId === 'R-NPPA-01');
      expect(nppaFinding).toBeDefined();
      expect(nppaFinding?.verdict).toBe('LIKELY_ISSUE'); // unverified official record & RETAIL => LIKELY_ISSUE
      expect(nppaFinding?.amount).toBe(2540); // (800 - 546) * 10 = 2540
    });

    it('7. Honest Coverage Reporting: with real data and empty knee/annexure/bundling data, verifies that unrepresented categories produce NOT_CHECKED and coverage numbers reflect it honestly', () => {
      const multiCategoryBill: MedicalBill = {
        id: 'HONEST-COVERAGE-BILL',
        billDate: '2026-05-15',
        hospital: { name: 'City Hospital' },
        stay: {
          admissionDate: '2026-05-10',
          dischargeDate: '2026-05-15',
          lengthOfStayNights: 5,
        },
        billedPriceIncludesGst: false,
        items: [
          {
            id: 'PHARM-01',
            description: 'Acetyl Salicylic Acid 300mg Tablet',
            category: 'pharmacy',
            quantity: 10,
            unitRatePaise: 50, // Ceiling is 28 paise
            totalBilledPaise: 500,
            date: '2026-05-11',
          },
          {
            id: 'STENT-01',
            description: 'Bare Metal Stents',
            category: 'implant',
            quantity: 1,
            unitRatePaise: 1500000, // Ceiling is 1076215 paise
            totalBilledPaise: 1500000,
            date: '2026-05-12',
          },
          {
            id: 'KNEE-01',
            description: 'Total Knee Replacement Femoral Component',
            category: 'implant',
            quantity: 1,
            unitRatePaise: 6000000,
            totalBilledPaise: 6000000,
            date: '2026-05-12',
          },
          {
            id: 'NURSE-01',
            description: 'Routine Nursing Charges',
            category: 'nursing',
            quantity: 5,
            unitRatePaise: 100000,
            totalBilledPaise: 500000,
            date: '2026-05-13',
          },
          {
            id: 'DEDUCT-01',
            description: 'Digital Clinical Thermometer',
            category: 'consumable',
            quantity: 1,
            unitRatePaise: 25000,
            totalBilledPaise: 25000,
            deductedPaise: 25000,
            date: '2026-05-13',
          },
          {
            id: 'ADMIN-01',
            description: 'Hospital Registration Fee',
            category: 'admin_fee',
            quantity: null,
            unitRatePaise: null,
            totalBilledPaise: null,
          },
        ],
        totalBilledPaise: 8025500,
      };

      const report = runAudit(multiCategoryBill);

      expect(report.coverage.total).toBe(6);
      expect(report.coverage.arithmeticChecked).toBe(5);
      // Strictly 2 items checked against loaded regulatory data (PHARM-01 and STENT-01)
      expect(report.coverage.regulatoryChecked).toBe(2);

      // Knee implant produces no regulatory finding because knee data is unsourced
      const kneeFinding = report.findings.find((f) => f.itemId === 'KNEE-01' && f.ruleId === 'R-NPPA-01');
      expect(kneeFinding).toBeUndefined();

      // Nursing charge produces no bundling finding because bundling data is unsourced
      const bundlingFinding = report.findings.find((f) => f.itemId === 'NURSE-01');
      expect(bundlingFinding).toBeUndefined();

      // Deducted item produces NEEDS_REVIEW ("No reference data loaded...")
      const deductionFinding = report.findings.find((f) => f.itemId === 'DEDUCT-01');
      expect(deductionFinding).toBeDefined();
      expect(deductionFinding?.verdict).toBe('NEEDS_REVIEW');
      expect(deductionFinding?.explanation.en).toContain('No reference data loaded');

      // Unpriced admin fee is in notCheckedItems
      expect(report.notCheckedItems).toBeDefined();
      const unpricedItem = report.notCheckedItems?.find((i) => i.id === 'ADMIN-01');
      expect(unpricedItem).toBeDefined();

      // Knee implant is in notCheckedItems with note citing S.O. 6222(E) and 2027-01-15 validity
      const kneeNotChecked = report.notCheckedItems?.find((i) => i.id === 'KNEE-01');
      expect(kneeNotChecked).toBeDefined();
      expect(kneeNotChecked?.notes).toContain('S.O. 6222(E)');
      expect(kneeNotChecked?.notes).toContain('2027-01-15');
      expect(kneeNotChecked?.notes).toContain('NOT_CHECKED');
    });

    it('8. Stent Test: synthetic bill with coronary stent billed above ceiling yields LIKELY_ISSUE while records are verified:false, and CONFIRMED_OVERCHARGE only when fixture copy has verified:true and valid date', () => {
      const stentBill: MedicalBill = {
        id: 'SYNTHETIC-STENT-BILL',
        isSynthetic: true,
        billDate: '2026-05-15',
        billedPriceIncludesGst: false,
        hospital: { name: 'Metro Cardiac Care' },
        stay: {
          admissionDate: '2026-05-14',
          dischargeDate: '2026-05-16',
          lengthOfStayNights: 2,
        },
        items: [
          {
            id: 'STENT-ITEM-01',
            description: 'Drug Eluting Stents (DES) including metallic DES and Bioresorbable Vascular Scaffold (BVS)/ Biodegradable Stents',
            category: 'implant',
            quantity: 1,
            unitRatePaise: 4500000, // ₹45,000 (above ₹39,186.03 ceiling)
            totalBilledPaise: 4500000,
            date: '2026-05-15',
            verified: true,
          },
        ],
        totalBilledPaise: 4500000,
      };

      // 1. Audit against default production data (where verified is false)
      const unverifiedReport = runAudit(stentBill);
      const unverifiedFinding = unverifiedReport.findings.find(
        (f) => f.ruleId === 'R-NPPA-01' && f.itemId === 'STENT-ITEM-01'
      );
      expect(unverifiedFinding).toBeDefined();
      // Engine guard caps at LIKELY_ISSUE because record.verified is false!
      expect(unverifiedFinding?.verdict).toBe('LIKELY_ISSUE');
      expect(unverifiedFinding?.amount).toBe(4500000 - 3918603);
      expect(unverifiedFinding?.citation.kind).toBe('REGULATORY');
      if (unverifiedFinding?.citation.kind === 'REGULATORY') {
        expect(unverifiedFinding.citation.verified).toBe(false);
      }
      expect(getReferenceDataBadge(unverifiedFinding!)).toBe('Unverified reference data');
      expect(unverifiedReport.totals.confirmed).toBe(0);
      expect(unverifiedReport.totals.likely).toBe(4500000 - 3918603);

      // 2. Audit against a test fixture copy where verified: true
      const verifiedStentRecords: ImplantCeilingRecord[] = [
        {
          id: 'NPPA-STENT-1587-02',
          name: 'Drug Eluting Stents (DES) including metallic DES and Bioresorbable Vascular Scaffold (BVS)/ Biodegradable Stents',
          normalizedName: 'drug eluting stents des including metallic des and bioresorbable vascular scaffold bvs biodegradable stents',
          ceilingPaise: 3918603,
          implantType: 'coronary_stent',
          subtype: 'drug_eluting',
          specification: 'Drug Eluting Stents (DES) including metallic DES and Bioresorbable Vascular Scaffold (BVS) / Biodegradable Stents',
          effectiveDate: '2026-04-01',
          validUntil: null,
          instrumentNumber: 'S.O. 1587(E)',
          instrumentDate: '2026-03-25',
          gstTreatment: 'EXCLUDED',
          source: 'NPPA S.O. 1587(E)',
          sourceFile: 'Drugceiling3.pdf',
          sourceUrl: 'https://www.nppa.gov.in',
          version: '1.0.0',
          verified: true, // VERIFIED: TRUE!
          sourceRef: 'Page 3, Sl. No. 2',
        },
      ];

      const verifiedReport = runAudit(stentBill, { implantCeilings: verifiedStentRecords });
      const verifiedFinding = verifiedReport.findings.find(
        (f) => f.ruleId === 'R-NPPA-01' && f.itemId === 'STENT-ITEM-01'
      );
      expect(verifiedFinding).toBeDefined();
      // Exact match + verified:true + valid date => CONFIRMED_OVERCHARGE!
      expect(verifiedFinding?.verdict).toBe('CONFIRMED_OVERCHARGE');
      expect(verifiedFinding?.amount).toBe(4500000 - 3918603);
      if (verifiedFinding?.citation.kind === 'REGULATORY') {
        expect(verifiedFinding.citation.verified).toBe(true);
      }
      expect(getReferenceDataBadge(verifiedFinding!)).toBeNull();
      expect(verifiedReport.totals.confirmed).toBe(4500000 - 3918603);
      expect(verifiedReport.totals.likely).toBe(0);
    });

    it('A8 Date Test: a stent bill dated before 2026-04-01 yields NEEDS_REVIEW', () => {
      const earlyStentBill: MedicalBill = {
        id: 'EARLY-STENT-BILL',
        isSynthetic: true,
        billDate: '2026-03-15', // Prior to 2026-04-01 effectiveDate
        billedPriceIncludesGst: false,
        hospital: { name: 'Metro Hospital' },
        stay: { admissionDate: '2026-03-14', dischargeDate: '2026-03-15', lengthOfStayNights: 1 },
        items: [
          {
            id: 'STENT-EARLY',
            description: 'Bare Metal Stents',
            category: 'implant',
            quantity: 1,
            unitRatePaise: 1500000,
            totalBilledPaise: 1500000,
            date: '2026-03-15',
          },
        ],
        totalBilledPaise: 1500000,
      };

      const report = runAudit(earlyStentBill);
      const stentFinding = report.findings.find((f) => f.itemId === 'STENT-EARLY');
      expect(stentFinding).toBeDefined();
      expect(stentFinding?.verdict).toBe('NEEDS_REVIEW');
      expect(stentFinding?.explanation.en).toContain('prior to regulatory effectiveDate');
    });

    it('Knee Implant Expiration Guard: items after 2027-01-15 note expired extension order in notCheckedItems', () => {
      const activeKneeBill: MedicalBill = {
        id: 'KNEE-ACTIVE',
        isSynthetic: true,
        billDate: '2026-12-01',
        billedPriceIncludesGst: false,
        hospital: { name: 'Orthopaedic Centre' },
        stay: { admissionDate: '2026-11-29', dischargeDate: '2026-12-01', lengthOfStayNights: 2 },
        items: [
          {
            id: 'KNEE-01',
            description: 'Total Knee Replacement Femoral Component',
            category: 'implant',
            quantity: 1,
            unitRatePaise: 4500000,
            totalBilledPaise: 4500000,
          },
        ],
        totalBilledPaise: 4500000,
      };

      const activeReport = runAudit(activeKneeBill);
      const activeKneeItem = activeReport.notCheckedItems?.find((i) => i.id === 'KNEE-01');
      expect(activeKneeItem).toBeDefined();
      expect(activeKneeItem?.notes).toContain('valid until 2027-01-15');

      const expiredKneeBill: MedicalBill = {
        ...activeKneeBill,
        id: 'KNEE-EXPIRED',
        billDate: '2027-02-10', // After 2027-01-15
      };

      const expiredReport = runAudit(expiredKneeBill);
      const expiredKneeItem = expiredReport.notCheckedItems?.find((i) => i.id === 'KNEE-01');
      expect(expiredKneeItem).toBeDefined();
      expect(expiredKneeItem?.notes).toContain('expired on 2027-01-15 unless renewed');
    });
  });
});
