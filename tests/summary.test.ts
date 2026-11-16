import { describe, it, expect } from 'vitest';
import { generateSummaryText, getFixStepTitle } from '../src/lib/summary';
import { analyze } from '../src/lib/rules/analyze';
import { buildFixPlan } from '../src/lib/rules/fixplan';
import goalsData from '../src/data/goals.json';
import { GoalConfig, ExtractedDocument } from '../src/lib/rules/types';
import { en } from '../src/lib/i18n/en';
import { hi } from '../src/lib/i18n/hi';
import { mr } from '../src/lib/i18n/mr';
import scenario1Fixture from '../src/fixtures/scenario-1.json';
import scenario2Fixture from '../src/fixtures/scenario-2.json';
import scenario3Fixture from '../src/fixtures/scenario-3.json';

const tEn = (key: string) => (en as any)[key] || key;
const tHi = (key: string) => (hi as any)[key] || key;
const tMr = (key: string) => (mr as any)[key] || key;

describe('Summary Generation Follow-up Tests (Test-First)', () => {
  it('1. Scenario 1: DBT step title is "Link your account to the NPCI DBT Mapper" and no two steps share the same title', () => {
    const report = analyze(scenario1Fixture as any);
    const goal = (goalsData as GoalConfig[]).find((g) => g.id === scenario1Fixture.goalId);
    const fixPlan = buildFixPlan(report.findings, goal);

    const summaryEn = generateSummaryText({
      status: report.status,
      findings: report.findings,
      fixPlan,
    }, tEn);

    console.log('--- SCENARIO 1 SUMMARY OUTPUT ---');
    console.log(summaryEn);
    console.log('----------------------------------');

    // Verify DBT step title
    expect(summaryEn).toContain('Link your account to the NPCI DBT Mapper');
    expect(summaryEn).not.toContain('Bank Passbook / Cheque: Your Home Bank Branch');

    // Extract fix steps section
    const fixStepsSection = summaryEn.split('*Recommended Fix Steps:*')[1]?.split('*Disclaimer:*')[0] || '';
    const stepTitleLines = fixStepsSection
      .split('\n')
      .filter((line) => /^\d+\.\s+/.test(line.trim()))
      .map((line) => line.trim().replace(/^\d+\.\s+/, ''));

    expect(stepTitleLines.length).toBeGreaterThanOrEqual(2);

    // Verify no two steps share the same title
    const uniqueTitles = new Set(stepTitleLines);
    expect(uniqueTitles.size).toBe(stepTitleLines.length);

    // Verify every step has a "For:" line naming the finding it addresses
    const forLines = fixStepsSection
      .split('\n')
      .filter((line) => /^\s*For:\s+/.test(line.trim()));
    expect(forLines.length).toBe(stepTitleLines.length);

    expect(summaryEn).toContain('For: Name Word Order Differs');
    expect(summaryEn).toContain('For: NPCI DBT Seeding Required');
  });

  it('2. Name-correction step: documents to carry has only Aadhaar and passbook, while passport photos and PAN are under "The branch may also ask for"', () => {
    const report = analyze(scenario1Fixture as any);
    const goal = (goalsData as GoalConfig[]).find((g) => g.id === scenario1Fixture.goalId);
    const fixPlan = buildFixPlan(report.findings, goal);

    const summaryEn = generateSummaryText({
      status: report.status,
      findings: report.findings,
      fixPlan,
    }, tEn);

    // In the section for Step 1 (name correction)
    // Documents to carry line
    const carryLineMatch = summaryEn.match(/\*Documents to carry:\*\s*([^\n]+)/);
    expect(carryLineMatch).not.toBeNull();
    const carryLine = carryLineMatch![1];

    // Must show ONLY Aadhaar and passbook
    expect(carryLine).toContain('Original Aadhaar Card');
    expect(carryLine).toContain('Passbook');
    expect(carryLine).not.toContain('Passport Photos');
    expect(carryLine).not.toContain('PAN Card');

    // Must put passport photos and PAN under "The branch may also ask for", marked verify
    expect(summaryEn).toContain('The branch may also ask for:');
    const askForMatch = summaryEn.match(/The branch may also ask for:\s*([^\n]+)/);
    expect(askForMatch).not.toBeNull();
    const askForLine = askForMatch![1];
    expect(askForLine).toContain('Photograph');
    expect(askForLine).toContain('PAN Card');
    expect(askForLine.toLowerCase()).toContain('verify');
  });

  it('3. Across all demo scenarios and languages, no two steps in a summary share the same title', () => {
    const scenarios = [
      { fixture: scenario1Fixture, goalId: 'pm_kisan_payment' },
      { fixture: scenario2Fixture, goalId: 'scholarship_application' },
      { fixture: scenario3Fixture, goalId: 'bank_kyc' },
    ];

    const languages = [
      { name: 'English', t: tEn },
      { name: 'Hindi', t: tHi },
      { name: 'Marathi', t: tMr },
    ];

    for (const sc of scenarios) {
      const report = analyze(sc.fixture as any);
      const goal = (goalsData as GoalConfig[]).find((g) => g.id === sc.goalId);
      const fixPlan = buildFixPlan(report.findings, goal);

      for (const lang of languages) {
        const summary = generateSummaryText({
          status: report.status,
          findings: report.findings,
          fixPlan,
        }, lang.t);

        const fixStepsSection = summary.split('*Recommended Fix Steps:*')[1]?.split('*Disclaimer:*')[0] ||
          summary.split('सिफारिश किए गए सुधार कदम:')[1]?.split('अस्वीकरण:')[0] ||
          summary.split('शिफारस केलेल्या दुरुस्तीच्या पायऱ्या:')[1]?.split('जबाबदारी नाकारणे:')[0] || '';

        const stepTitleLines = fixStepsSection
          .split('\n')
          .filter((line) => /^\d+\.\s+/.test(line.trim()))
          .map((line) => line.trim().replace(/^\d+\.\s+/, ''));

        const uniqueTitles = new Set(stepTitleLines);
        expect(uniqueTitles.size, `Duplicate step title found in ${sc.goalId} (${lang.name})`).toBe(stepTitleLines.length);

        // Ensure no raw untranslated keys
        expect(summary).not.toContain('step_title_');
        expect(summary).not.toContain('doc_');
        expect(summary).not.toContain('where_');
      }
    }
  });
});
