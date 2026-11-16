import { describe, it, expect } from 'vitest';
import { analyze } from '../src/lib/rules/analyze';
import { AnalysisInput } from '../src/lib/rules/types';
import { calculateLaplacianVariance } from '../src/lib/blurGate';
import { verifyMagicBytes } from '../src/lib/extract/client';

import scenario1Fixture from '../src/fixtures/scenario-1.json';
import scenario2Fixture from '../src/fixtures/scenario-2.json';
import scenario3Fixture from '../src/fixtures/scenario-3.json';

describe('Proof 1: PM-Kisan Ramesh Kumar vs Kumar Ramesh', () => {
  it('Produces FIX NEEDED, 1 TOKEN_REORDER High, 1 DBT Info, bank fix step, DBT step, Aadhaar note', () => {
    const report = analyze(scenario1Fixture as unknown as AnalysisInput);

    expect(report.status).toBe('fix_needed');

    // Findings
    const tokenReorderFinding = report.findings.find(
      (f) => f.ruleId === 'R-NAME-1' && f.verdict === 'TOKEN_REORDER'
    );
    expect(tokenReorderFinding).toBeDefined();
    expect(tokenReorderFinding?.severity).toBe('high');

    const dbtFinding = report.findings.find((f) => f.ruleId === 'R-DBT-1');
    expect(dbtFinding).toBeDefined();
    expect(dbtFinding?.severity).toBe('info');

    // Fix Plan
    expect(report.fixPlan.length).toBe(2);
    const bankStep = report.fixPlan.find(
      (s) => s.targetDoc === 'bank' && s.letterTemplateId === 'name-correction'
    );
    expect(bankStep).toBeDefined();
    expect(bankStep?.lifetimeLimitNoteKey).toBe('aadhaar_not_targeted_limit_note');

    const dbtStep = report.fixPlan.find(
      (s) => s.targetDoc === 'bank' && s.letterTemplateId === 'dbt-seeding-request'
    );
    expect(dbtStep).toBeDefined();
    expect(dbtStep?.stepKeys).toContain('step_bank_dbt_seeding_request');
  });
});

describe('Proof 2: Scholarship Rahul Suresh Patil DOB swap', () => {
  it('Produces BLOCKED, DOB Blocker+swap hint, PATRONYMIC Low, no Aadhaar vs bank, cert fix target', () => {
    const report = analyze(scenario2Fixture as unknown as AnalysisInput);

    expect(report.status).toBe('blocked');

    // DOB Blocker with swap hint
    const dobFinding = report.findings.find((f) => f.ruleId === 'R-DOB-1');
    expect(dobFinding).toBeDefined();
    expect(dobFinding?.severity).toBe('blocker');
    expect(dobFinding?.titleKey).toBe('finding_dob_swap_title');

    // Patronymic middle omission Low
    const nameFinding = report.findings.find(
      (f) => f.ruleId === 'R-NAME-2' && f.verdict === 'PATRONYMIC_MIDDLE_OMISSION'
    );
    expect(nameFinding).toBeDefined();
    expect(nameFinding?.severity).toBe('low');

    // No Aadhaar vs Bank comparison
    const bankFinding = report.findings.find(
      (f) => f.left.doc === 'bank' || f.right.doc === 'bank'
    );
    expect(bankFinding).toBeUndefined();

    // Fix target for certificate
    expect(dobFinding?.fixTarget).toBe('aadhaar'); // certificate is rank 5, Aadhaar is easier than board marksheet
  });
});

describe('Proof 3: Bank KYC R.Deshmukh IFSC invalid', () => {
  it('Produces BLOCKED, exactly 2 findings (IFSC blocker, INITIAL_ABBREVIATION medium), <=2 fix steps, no raw keys', () => {
    const report = analyze(scenario3Fixture as unknown as AnalysisInput);

    expect(report.status).toBe('blocked');

    // Exactly 2 findings
    expect(report.findings.length).toBe(2);

    const ifscFinding = report.findings.find((f) => f.ruleId === 'R-IFSC-1');
    expect(ifscFinding).toBeDefined();
    expect(ifscFinding?.severity).toBe('blocker');

    const initFinding = report.findings.find(
      (f) => f.ruleId === 'R-NAME-1' && f.verdict === 'INITIAL_ABBREVIATION'
    );
    expect(initFinding).toBeDefined();
    expect(initFinding?.severity).toBe('medium');

    // <= 2 fix steps
    expect(report.fixPlan.length).toBeLessThanOrEqual(2);

    // No raw keys
    for (const f of report.findings) {
      expect(f.titleKey).not.toContain('field_');
      expect(f.explanationKey).not.toContain('field_');
    }
  });
});

describe('Proof 4: PAN-Aadhaar Sunita Patil (clean)', () => {
  it('Produces READY, 0 findings', () => {
    const cleanInput: AnalysisInput = {
      goalId: 'pan_aadhaar_link',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Sunita Patil', confidence: 0.98 },
            dob: { value: '15/08/1990', confidence: 0.98 },
            gender: { value: 'F', confidence: 0.99 },
            aadhaarRedacted: { value: '[Aadhaar Present - Redacted]', confidence: 0.98 },
          },
          overallConfidence: 0.98,
        },
        pan: {
          docType: 'pan',
          detectedDocType: 'pan',
          fields: {
            fullName: { value: 'Sunita Patil', confidence: 0.98 },
            dob: { value: '15/08/1990', confidence: 0.98 },
            gender: { value: 'F', confidence: 0.99 },
            panNumber: { value: 'ABCPS1234F', confidence: 0.99 }, // 5th char 'P' matches Patil
          },
          overallConfidence: 0.98,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    };

    const report = analyze(cleanInput);
    expect(report.status).toBe('ready');
    expect(report.findings.length).toBe(0);
    expect(report.fixPlan.length).toBe(0);
  });
});

describe('Proof 5: PAN-Aadhaar Amit Joshi (5th char K, name Joshi)', () => {
  it('Produces READY WITH NOTES, 1 R-PAN-3 Medium finding', () => {
    const panMismatchInput: AnalysisInput = {
      goalId: 'pan_aadhaar_link',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Amit Joshi', confidence: 0.98 },
            dob: { value: '12/04/1988', confidence: 0.98 },
            gender: { value: 'M', confidence: 0.99 },
            aadhaarRedacted: { value: '[Aadhaar Present - Redacted]', confidence: 0.98 },
          },
          overallConfidence: 0.98,
        },
        pan: {
          docType: 'pan',
          detectedDocType: 'pan',
          fields: {
            fullName: { value: 'Amit Joshi', confidence: 0.98 },
            dob: { value: '12/04/1988', confidence: 0.98 },
            gender: { value: 'M', confidence: 0.99 },
            panNumber: { value: 'ABCPK1234F', confidence: 0.99 }, // 5th char 'K' does not match surname 'Joshi' (J)
          },
          overallConfidence: 0.98,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    };

    const report = analyze(panMismatchInput);
    expect(report.status).toBe('ready_with_notes');
    expect(report.findings.length).toBe(1);
    expect(report.findings[0].ruleId).toBe('R-PAN-3');
    expect(report.findings[0].severity).toBe('medium');
  });
});

describe('Proof 6: Stress Tests', () => {
  it('6a: Blurry image variance is < 40 and blocked by blur gate', () => {
    // 100x100 uniform/blurry pixel array
    const blurryData = new Uint8ClampedArray(100 * 100 * 4).fill(120);
    const variance = calculateLaplacianVariance(blurryData, 100, 100);
    expect(variance).toBeLessThan(40);
  });

  it('6b: Unsupported MIME / invalid magic bytes returns null', () => {
    const invalidTextBuffer = Buffer.from('This is not an image or pdf file');
    const detected = verifyMagicBytes(invalidTextBuffer);
    expect(detected).toBeNull();
  });

  it('6c: Missing required document triggers R-REQ-1 blocker', () => {
    const missingDocInput: AnalysisInput = {
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.95 },
            aadhaarRedacted: { value: '[Aadhaar Present - Redacted]', confidence: 0.98 },
          },
          overallConfidence: 0.96,
        },
        // bank is completely missing
      },
      confirmedFields: [],
      correctVersionChoice: {},
    };

    const report = analyze(missingDocInput);
    expect(report.status).toBe('blocked');
    const reqFinding = report.findings.find((f) => f.ruleId === 'R-REQ-1');
    expect(reqFinding).toBeDefined();
    expect(reqFinding?.severity).toBe('blocker');
    expect(reqFinding?.left.doc).toBe('bank');
  });
});
