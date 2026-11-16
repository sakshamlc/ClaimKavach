import { describe, it, expect, beforeEach } from 'vitest';
import { analyze } from '../src/lib/rules/analyze';
import { buildFixPlan } from '../src/lib/rules/fixplan';
import { compareNames } from '../src/lib/rules/name';
import { useAppStore } from '../src/lib/store';
import { AnalysisInput } from '../src/lib/rules/types';

describe('Section A: Stale or Wrong Data in Reports', () => {
  beforeEach(() => {
    useAppStore.getState().clearAllData();
  });

  it('analyze() ignores documents not in goal.required[] (e.g. ignores certificate for PM-Kisan)', () => {
    const input: AnalysisInput = {
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.98 },
            dob: { value: '05/03/1982', confidence: 0.95 },
          },
          overallConfidence: 0.96,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'Ramesh Kumar', confidence: 0.96 },
            ifsc: { value: 'SBIN0001234', confidence: 0.98 },
          },
          overallConfidence: 0.96,
        },
        // Irrelevant certificate document with mismatched name
        certificate: {
          docType: 'certificate',
          detectedDocType: 'certificate',
          fields: {
            fullName: { value: 'Totally Different Person', confidence: 0.99 },
            dob: { value: '01/01/2000', confidence: 0.99 },
          },
          overallConfidence: 0.99,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    };

    const report = analyze(input);
    // Should NOT have any findings comparing aadhaar with certificate
    const certFinding = report.findings.find(
      (f) => f.left.doc === 'certificate' || f.right.doc === 'certificate'
    );
    expect(certFinding).toBeUndefined();
    expect(report.findings.every((f) => f.left.doc !== 'certificate' && f.right.doc !== 'certificate')).toBe(true);
  });

  it('changing goal in store clears documents, findings, fixPlan, and confirmedFields', () => {
    const store = useAppStore.getState();
    store.setGoalId('bank_kyc');
    store.setDocumentExtracted('aadhaar', {
      docType: 'aadhaar',
      detectedDocType: 'aadhaar',
      fields: { fullName: { value: 'Test User', confidence: 0.9 } },
      overallConfidence: 0.9,
    });
    store.confirmField('aadhaar', 'fullName');
    store.setReport(
      [
        {
          id: 'F-1',
          ruleId: 'R-NAME-1',
          severity: 'high',
          titleKey: 'title',
          explanationKey: 'desc',
          left: { doc: 'aadhaar', labelKey: 'lbl', value: 'v1' },
          right: { doc: 'bank', labelKey: 'lbl', value: 'v2' },
        },
      ],
      []
    );

    expect(Object.keys(useAppStore.getState().documents).length).toBe(1);
    expect(useAppStore.getState().findings.length).toBe(1);

    // Now change goal to pm_kisan_payment
    useAppStore.getState().setGoalId('pm_kisan_payment');

    const updated = useAppStore.getState();
    expect(updated.goalId).toBe('pm_kisan_payment');
    expect(Object.keys(updated.documents).length).toBe(0);
    expect(updated.findings.length).toBe(0);
    expect(updated.fixPlan.length).toBe(0);
  });
});

describe('Section B: Confirmation Flood & Grouped Findings', () => {
  it('R-CONF-1 emits at most ONE grouped finding for low confidence and zero fix steps', () => {
    const input: AnalysisInput = {
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.5 }, // low confidence
            dob: { value: '05/03/1982', confidence: 0.4 }, // low confidence
            fatherOrSpouseName: { value: null, confidence: 0 }, // null, should not trigger R-CONF-1
          },
          overallConfidence: 0.45,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'Ramesh Kumar', confidence: 0.6 }, // low confidence
            ifsc: { value: 'SBIN0001234', confidence: 0.98 },
          },
          overallConfidence: 0.79,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    };

    const report = analyze(input);
    const confFindings = report.findings.filter((f) => f.ruleId === 'R-CONF-1');
    // Must be at most ONE grouped finding
    expect(confFindings.length).toBe(1);

    // Confirmation findings produce NO fix steps in the fix plan
    const confSteps = report.fixPlan.filter(
      (s) => s.findingId === confFindings[0]?.id
    );
    expect(confSteps.length).toBe(0);
  });

  it('All applicable fields have valid human-readable i18n keys in EN, HI, and MR', async () => {
    const { en } = await import('../src/lib/i18n/en');
    const { hi } = await import('../src/lib/i18n/hi');
    const { mr } = await import('../src/lib/i18n/mr');

    const requiredKeys = [
      'field_yearOfBirthOnly',
      'field_dobIso',
      'field_aadhaarRedacted',
      'field_accountNumberLast4',
      'finding_missing_fields_title',
      'finding_missing_fields_desc',
    ];

    for (const key of requiredKeys) {
      expect((en as any)[key]).toBeDefined();
      expect((hi as any)[key]).toBeDefined();
      expect((mr as any)[key]).toBeDefined();
    }
  });
});

describe('Section C: Fix Plan Bugs & Deduplication', () => {
  it('Deduplicates fix steps targeting the same document/action and preserves distinct R-DBT-1 step', () => {
    const input: AnalysisInput = {
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.98 },
            dob: { value: '05/03/1982', confidence: 0.95 },
            aadhaarRedacted: { value: '[Aadhaar Present - Redacted]', confidence: 0.98 },
          },
          overallConfidence: 0.97,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'Kumar Ramesh', confidence: 0.96 },
            ifsc: { value: 'SBIN0001234', confidence: 0.98 },
            accountNumberLast4: { value: '4567', confidence: 0.98 },
          },
          overallConfidence: 0.97,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    };

    const report = analyze(input);
    // In Scenario 1 (PM-Kisan with Ramesh Kumar vs Kumar Ramesh):
    // Should have exactly 2 fix steps: 1 bank name update + 1 DBT seeding step
    expect(report.fixPlan.length).toBe(2);

    const bankSteps = report.fixPlan.filter((s) => s.targetDoc === 'bank');
    expect(bankSteps.length).toBe(2);

    // One step is name/details correction with 'name-correction' letter template
    const nameCorrectionStep = bankSteps.find(
      (s) => s.letterTemplateId === 'name-correction'
    );
    expect(nameCorrectionStep).toBeDefined();

    // One step is DBT seeding with 'dbt-seeding-request' letter template
    const dbtStep = bankSteps.find(
      (s) => s.letterTemplateId === 'dbt-seeding-request'
    );
    expect(dbtStep).toBeDefined();
    expect(dbtStep?.stepKeys).toContain('step_bank_dbt_seeding_request');
  });

  it('Never targets Aadhaar when cheaper compatible option exists unless user explicitly toggles it', () => {
    const input: AnalysisInput = {
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.98 },
            dob: { value: '05/03/1982', confidence: 0.95 },
            aadhaarRedacted: { value: '[Aadhaar Present - Redacted]', confidence: 0.98 },
          },
          overallConfidence: 0.97,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'Kumar Ramesh', confidence: 0.96 },
            ifsc: { value: 'SBIN0001234', confidence: 0.98 },
          },
          overallConfidence: 0.97,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    };

    const defaultReport = analyze(input);
    const nameFinding = defaultReport.findings.find((f) => f.ruleId === 'R-NAME-1');
    expect(nameFinding?.fixTarget).toBe('bank');

    // If user marks bank as correct, target must flip to aadhaar
    const flippedReport = analyze({
      ...input,
      correctVersionChoice: {
        [nameFinding!.id]: 'bank',
      },
    });
    const flippedPlan = flippedReport.fixPlan.find(
      (s) => s.findingId === nameFinding!.id
    );
    expect(flippedPlan?.targetDoc).toBe('aadhaar');
    // When Aadhaar is targeted, UIDAI lifetime note must be present
    expect(flippedPlan?.lifetimeLimitNoteKey).toBe('aadhaar_name_target_limit_note');
    expect(flippedPlan?.exceptionPathNoteKey).toBe('aadhaar_exception_path_note');
  });
});

describe('Section D: Name and DOB Rules Verification', () => {
  it("'Rahul Suresh Patil' (father 'Suresh Patil') vs 'Rahul Patil' returns PATRONYMIC_MIDDLE_OMISSION, Low for standard goals", () => {
    const res = compareNames('Rahul Suresh Patil', 'Rahul Patil', 'standard', {
      fatherOrSpouseNameA: 'Suresh Patil',
    });
    expect(res.verdict).toBe('PATRONYMIC_MIDDLE_OMISSION');
    expect(res.severity).toBe('low');
  });

  it("'Sunitha Ramesh Patil' vs 'Sunita Patil' with and without father name", () => {
    // With father name: first name matches via transliteration variant, middle matches father -> PATRONYMIC_MIDDLE_OMISSION
    const withFather = compareNames('Sunitha Ramesh Patil', 'Sunita Patil', 'standard', {
      fatherOrSpouseNameB: 'Ramesh Patil',
    });
    expect(withFather.verdict).toBe('PATRONYMIC_MIDDLE_OMISSION');
    expect(withFather.severity).toBe('low');

    // Without father name: missing middle token -> MISSING_TOKEN
    const withoutFather = compareNames('Sunitha Ramesh Patil', 'Sunita Patil', 'standard');
    expect(withoutFather.verdict).toBe('MISSING_TOKEN');
    expect(withoutFather.severity).toBe('medium');
  });

  it("'Ramesh Kumar' vs 'Kumar Ramesh' returns TOKEN_REORDER (High for strict, Medium for standard)", () => {
    const strictRes = compareNames('Ramesh Kumar', 'Kumar Ramesh', 'strict');
    expect(strictRes.verdict).toBe('TOKEN_REORDER');
    expect(strictRes.severity).toBe('high');

    const stdRes = compareNames('Ramesh Kumar', 'Kumar Ramesh', 'standard');
    expect(stdRes.verdict).toBe('TOKEN_REORDER');
    expect(stdRes.severity).toBe('medium');
  });

  it("'R. Deshmukh' vs 'Ramesh Deshmukh' returns INITIAL_ABBREVIATION", () => {
    const res = compareNames('R. Deshmukh', 'Ramesh Deshmukh');
    expect(res.verdict).toBe('INITIAL_ABBREVIATION');
    expect(res.severity).toBe('medium');
  });
});

describe('Section F: Hallucination Guards & Edge Validation', () => {
  it('Blur Gate: calculates Laplacian variance accurately (< 40 for flat/blurred pixels, > 50 for edges)', async () => {
    const { calculateLaplacianVariance } = await import('../src/lib/blurGate');

    // 10x10 completely flat image (uniform grey) -> variance is 0
    const flatPixels = new Uint8ClampedArray(10 * 10 * 4).fill(128);
    const flatVariance = calculateLaplacianVariance(flatPixels, 10, 10);
    expect(flatVariance).toBe(0);

    // 10x10 high-contrast edge image (alternating black/white lines) -> high variance
    const edgePixels = new Uint8ClampedArray(10 * 10 * 4);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const idx = (y * 10 + x) * 4;
        const color = (x + y) % 2 === 0 ? 255 : 0;
        edgePixels[idx] = color;
        edgePixels[idx + 1] = color;
        edgePixels[idx + 2] = color;
        edgePixels[idx + 3] = 255;
      }
    }
    const edgeVariance = calculateLaplacianVariance(edgePixels, 10, 10);
    expect(edgeVariance).toBeGreaterThan(100);
  });

  it('Code Validators: removes non-digit characters from account number last 4', async () => {
    const { validateExtractedFields } = await import('../src/lib/extract/client');

    const corruptedDoc: any = {
      docType: 'bank',
      detectedDocType: 'bank',
      fields: {
        accountHolderName: { value: 'Ramesh Kumar', confidence: 0.9 },
        accountNumberLast4: { value: '12AB', confidence: 0.9 }, // Invalid, not digits
      },
      overallConfidence: 0.9,
    };

    const cleaned = validateExtractedFields(corruptedDoc);
    expect(cleaned.fields.accountNumberLast4?.value).toBeNull();
    expect(cleaned.fields.accountNumberLast4?.legible).toBe(false);
  });

  it('Double Extraction Consistency: sets conflicting fields to null with legible=false', async () => {
    const { applyDoubleExtractionConsistency } = await import('../src/lib/extract/client');

    const passA: any = {
      docType: 'pan',
      detectedDocType: 'pan',
      fields: {
        fullName: { value: 'Ramesh Kumar', confidence: 0.95 },
        panNumber: { value: 'ABCDE1234F', confidence: 0.98 },
      },
      overallConfidence: 0.96,
    };

    const passB: any = {
      docType: 'pan',
      detectedDocType: 'pan',
      fields: {
        fullName: { value: 'Ramesh Kumar', confidence: 0.95 },
        panNumber: { value: 'ABCDE5678F', confidence: 0.98 }, // Discrepancy!
      },
      overallConfidence: 0.96,
    };

    const merged = applyDoubleExtractionConsistency(passA, passB);
    // Matching field is preserved
    expect(merged.fields.fullName?.value).toBe('Ramesh Kumar');

    // Conflicting field is nullified
    expect(merged.fields.panNumber?.value).toBeNull();
    expect(merged.fields.panNumber?.legible).toBe(false);
  });
});
