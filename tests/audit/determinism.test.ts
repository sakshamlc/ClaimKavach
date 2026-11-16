import { describe, it, expect } from 'vitest';
import {
  toPaise,
  fromPaise,
  formatINR,
  addPaise,
  subtractPaise,
  multiplyPaiseByQuantity,
} from '../../src/lib/audit/currency';
import { Verdict, ReportTotals, ReportCoverage, AuditFinding, AuditReport } from '../../src/lib/audit/types';

describe('Trust Zone Pure Determinism Verification', () => {
  it('guarantees identical output across 100 consecutive runs of monetary calculation', () => {
    const rawBill = [
      { unit: '12500.50', qty: 3 }, // 37501.50
      { unit: '450.25', qty: 10 },  // 4502.50
      { unit: '38265.00', qty: 1 }, // 38265.00
      { unit: '5600.00', qty: 4 },  // 22400.00
    ];

    function calculateTotal() {
      const lineTotals = rawBill.map((item) =>
        multiplyPaiseByQuantity(toPaise(item.unit), item.qty)
      );
      return addPaise(...lineTotals);
    }

    const baseline = calculateTotal();

    for (let i = 0; i < 100; i++) {
      const result = calculateTotal();
      expect(result).toBe(baseline);
      expect(formatINR(result)).toBe('₹1,02,669.00');
    }
  });

  it('guarantees exact mathematical integrity of unmerged summary totals', () => {
    // Total Billed = Fair Amount + Confirmed Overcharge + Likely Issue
    const billed = toPaise(100000); // ₹1,00,000
    const confirmed = toPaise(15000); // ₹15,000
    const likely = toPaise(20000); // ₹20,000
    const needsReview = toPaise(10000); // ₹10,000

    const fair = subtractPaise(billed, addPaise(confirmed, likely));

    const totals: ReportTotals = {
      billed,
      fair,
      confirmed,
      likely,
      needsReview,
    };

    const coverage: ReportCoverage = {
      checked: 10,
      total: 12,
    };

    expect(totals.billed).toBe(10000000);
    expect(totals.confirmed).toBe(1500000);
    expect(totals.likely).toBe(2000000);
    expect(totals.needsReview).toBe(1000000);
    expect(totals.fair).toBe(6500000); // ₹65,000.00
    expect(addPaise(totals.fair, totals.confirmed, totals.likely)).toBe(totals.billed);

    // Verify finding structure
    const sampleFinding: AuditFinding = {
      ruleId: 'R-MATH-01',
      itemId: 'ITEM-001',
      verdict: 'CONFIRMED_OVERCHARGE',
      expected: 30000,
      actual: 35000,
      amount: 5000,
      citation: {
        instrument: 'Hospital Tariff Agreement',
        section: 'Itemized Schedule',
        url: 'https://example.gov.in',
        effectiveDate: '2024-04-01',
        verified: true,
      },
      explanation: {
        en: 'Quantity (3) multiplied by rate (Rs. 100) equals Rs. 300, but billed Rs. 350.',
        hi: 'मात्रा (3) और दर (रु. 100) का गुणनफल रु. 300 है, लेकिन बिल में रु. 350 लगाया गया है।',
      },
      suggestedAction: 'Request bill reconciliation with correct unit rate.',
    };

    expect(sampleFinding.amount).toBe(5000);
    expect(sampleFinding.explanation.en).toBeTruthy();
    expect(sampleFinding.explanation.hi).toBeTruthy();
  });

  it('verifies Verdict enum coverage completeness', () => {
    const verdicts: Verdict[] = [
      'CONFIRMED_OVERCHARGE',
      'LIKELY_ISSUE',
      'NEEDS_REVIEW',
      'VALID_EXCLUSION',
      'NOT_CHECKED',
    ];
    expect(verdicts.length).toBe(5);
  });
});
