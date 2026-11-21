import { describe, it, expect } from 'vitest';
import sample1Data from '../../src/data/samples/sample1-stent.json';
import sample1bData from '../../src/data/samples/sample1b-stent-post-april.json';
import sample2Data from '../../src/data/samples/sample2-bundling-tpa.json';
import sample3Data from '../../src/data/samples/sample3-clean.json';
import { toMedicalBill } from '../../src/lib/extract/toMedicalBill';
import { runAudit } from '../../src/lib/audit/engine';

describe('Sample 1 & Sample 1b Golden Statutory Audit Tests', () => {
  it('1. March variant (before 1 April 2026): stent is NEEDS_REVIEW (date rule), duplicate CBC is LIKELY_ISSUE, and pharmacy lump sum is NEEDS_REVIEW (amount 0)', () => {
    const domainBill = toMedicalBill(sample1Data as any);
    const report = runAudit(domainBill);

    console.log('--- Sample 1 (March) Report ---');
    console.log('Findings count:', report.findings.length);
    console.log('Findings:', report.findings.map(f => ({ ruleId: f.ruleId, verdict: f.verdict, amount: f.amount, title: f.title, note: f.explanation.en })));
    console.log('Totals:', report.totals);
    console.log('Coverage:', report.coverage);
    console.log('NotChecked count:', report.notCheckedItems?.length);

    expect(report.totals.billed).toBe(34200000); // ₹3,42,000.00
    expect(report.totals.confirmed).toBe(0); // Capped because unverified data
    expect(report.totals.likely).toBe(45000); // Duplicate CBC is ₹450
    expect(report.totals.needsReview).toBe(7081397); // Stent before April 2026 is 7081397; pharmacy lump sum adds 0
    expect(report.totals.fair).toBe(34200000);
    expect(report.totals.ifLikelyUpheld).toBe(34155000);

    // Exactly 3 findings
    expect(report.findings).toHaveLength(3);

    // 1. Stent:
    const stentFinding = report.findings.find(f => f.ruleId === 'R-NPPA-01');
    expect(stentFinding).toBeDefined();
    expect(stentFinding!.verdict).toBe('NEEDS_REVIEW');
    expect(stentFinding!.explanation.en).toContain('prior to regulatory effectiveDate');

    // 2. Duplicate CBC:
    const dupFinding = report.findings.find(f => f.ruleId === 'R-DUP-01');
    expect(dupFinding).toBeDefined();
    expect(dupFinding!.verdict).toBe('LIKELY_ISSUE');

    // 3. Pharmacy lump sum:
    const structFinding = report.findings.find(f => f.ruleId === 'R-STRUCT-01');
    expect(structFinding).toBeDefined();
    expect(structFinding!.verdict).toBe('NEEDS_REVIEW');
    expect(structFinding!.amount).toBe(0);

    // Coverage
    expect(report.coverage.arithmeticChecked).toBe(16);
    expect(report.coverage.regulatoryChecked).toBe(1);
    expect(report.coverage.notCheckedCount).toBe(15);
    expect(report.coverage.total).toBe(16);

    // No arithmetic findings (R-MATH-01, R-TOTAL-01)
    const mathFindings = report.findings.filter(f => f.ruleId === 'R-MATH-01' || f.ruleId === 'R-TOTAL-01');
    expect(mathFindings).toHaveLength(0);
  });

  it('2. May variant (after 1 April 2026): stent is LIKELY_ISSUE (unverified cap), duplicate CBC is LIKELY_ISSUE, and pharmacy lump sum is NEEDS_REVIEW (amount 0)', () => {
    const domainBill = toMedicalBill(sample1bData as any);
    const report = runAudit(domainBill);

    console.log('--- Sample 1b (May) Report ---');
    console.log('Findings count:', report.findings.length);
    console.log('Findings:', report.findings.map(f => ({ ruleId: f.ruleId, verdict: f.verdict, amount: f.amount, title: f.title })));
    console.log('Totals:', report.totals);
    console.log('Coverage:', report.coverage);
    console.log('NotChecked count:', report.notCheckedItems?.length);
    console.log('NotChecked items details:');
    report.notCheckedItems?.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.id}] ${item.description} (${item.category}): "${item.reason}" ${item.findingId ? `[Finding: ${item.findingId}]` : ''}`);
    });

    expect(report.totals.billed).toBe(34200000);
    expect(report.totals.confirmed).toBe(0);
    expect(report.totals.likely).toBe(7126397);
    expect(report.totals.needsReview).toBe(0); // Pharmacy lump sum adds 0 to needsReview
    expect(report.totals.fair).toBe(34200000);
    expect(report.totals.ifLikelyUpheld).toBe(27073603);

    // Exactly 3 findings
    expect(report.findings).toHaveLength(3);

    // 1. Stent finding:
    const stentFinding = report.findings.find(f => f.ruleId === 'R-NPPA-01');
    expect(stentFinding).toBeDefined();
    expect(stentFinding!.verdict).toBe('LIKELY_ISSUE');
    // Amount = (11000000 - 3918603) * 1 = 7081397 paise
    expect(stentFinding!.amount).toBe(7081397);

    // 2. Duplicate CBC:
    const dupFinding = report.findings.find(f => f.ruleId === 'R-DUP-01');
    expect(dupFinding).toBeDefined();
    expect(dupFinding!.verdict).toBe('LIKELY_ISSUE');
    expect(dupFinding!.amount).toBe(45000); // ₹450.00

    // 3. Pharmacy lump sum:
    const structFinding = report.findings.find(f => f.ruleId === 'R-STRUCT-01');
    expect(structFinding).toBeDefined();
    expect(structFinding!.verdict).toBe('NEEDS_REVIEW');
    expect(structFinding!.amount).toBe(0);
    expect(structFinding!.citation.instrument).toBe('Bill structure (no reference data)');
    expect(structFinding!.explanation.en).toBe('This line has no item breakdown. You can ask the hospital for an itemised pharmacy list.');

    // Coverage assertions
    expect(report.coverage.arithmeticChecked).toBe(16);
    expect(report.coverage.regulatoryChecked).toBe(1);
    expect(report.coverage.notCheckedCount).toBe(15);
    expect(report.coverage.total).toBe(16);

    // Not checked items assertions
    expect(report.notCheckedItems).toHaveLength(15);
    for (const item of report.notCheckedItems!) {
      expect(item.reason).toBeDefined();
      expect(item.reason.length).toBeGreaterThan(10);
      expect(item.reason).not.toContain('No statutory reference data available for this category.');
    }

    // Items with findings have finding links
    const dupNotChecked = report.notCheckedItems!.find(i => i.id === 'item-9');
    expect(dupNotChecked?.findingId).toBe('R-DUP-01');

    const structNotChecked = report.notCheckedItems!.find(i => i.id === 'item-16');
    expect(structNotChecked?.findingId).toBe('R-STRUCT-01');

    // No arithmetic findings
    const mathFindings = report.findings.filter(f => f.ruleId === 'R-MATH-01' || f.ruleId === 'R-TOTAL-01');
    expect(mathFindings).toHaveLength(0);
  });

  it('3. Sample 2 (Bundling & TPA deductions): shows findings and coverage', () => {
    const domainBill = toMedicalBill(sample2Data as any);
    const report = runAudit(domainBill);

    console.log('--- Sample 2 (Bundling & TPA) Report ---');
    console.log('Findings count:', report.findings.length);
    console.log('Findings:', report.findings.map(f => ({ ruleId: f.ruleId, verdict: f.verdict, amount: f.amount, title: f.title })));
    console.log('Totals:', report.totals);
    console.log('Coverage:', report.coverage);
    console.log('NotChecked count:', report.notCheckedItems?.length);

    expect(report.totals.billed).toBe(1835000); // ₹18,350.00
    expect(report.coverage.total).toBe(3);
    // Pharmacy lump sum must NOT fire on Sample 2
    const structFinding = report.findings.find(f => f.ruleId === 'R-STRUCT-01');
    expect(structFinding).toBeUndefined();
  });

  it('4. Sample 3 (Clean Bill): strictly 0 confirmed and 0 likely findings, all fair', () => {
    const domainBill = toMedicalBill(sample3Data as any);
    const report = runAudit(domainBill);

    console.log('--- Sample 3 (Clean) Report ---');
    console.log('Findings count:', report.findings.length);
    console.log('Findings:', report.findings.map(f => ({ ruleId: f.ruleId, verdict: f.verdict, amount: f.amount, title: f.title })));
    console.log('Totals:', report.totals);
    console.log('Coverage:', report.coverage);
    console.log('NotChecked count:', report.notCheckedItems?.length);

    expect(report.totals.billed).toBe(270000); // ₹2,700.00
    expect(report.totals.confirmed).toBe(0);
    expect(report.totals.likely).toBe(0);
    expect(report.totals.fair).toBe(270000);
    expect(report.findings.filter(f => f.verdict === 'CONFIRMED_OVERCHARGE')).toHaveLength(0);
    expect(report.findings.filter(f => f.verdict === 'LIKELY_ISSUE')).toHaveLength(0);
    expect(report.coverage.total).toBe(3);
    expect(report.coverage.arithmeticChecked).toBe(3);
    expect(report.coverage.regulatoryChecked).toBe(0);
    expect(report.coverage.notCheckedCount).toBe(3);
  });
});
