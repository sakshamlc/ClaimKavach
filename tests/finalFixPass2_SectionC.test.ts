import { describe, it, expect } from 'vitest';
import { analyze } from '../src/lib/rules/analyze';
import { buildFixStepForFinding, buildFixPlan } from '../src/lib/rules/fixplan';
import { en } from '../src/lib/i18n/en';
import { hi } from '../src/lib/i18n/hi';
import { mr } from '../src/lib/i18n/mr';

describe('Final Fix Pass 2 - Section C: Fix Plan Logic & Deduplication', () => {
  it('1. R-DBT-1 gets its own step with action dbt_seeding and needsVerification true', () => {
    const result = analyze({
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.95 },
            aadhaarRedacted: { value: 'XXXX XXXX 1234', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'Kumar Ramesh', confidence: 0.95 },
            ifsc: { value: 'SBIN0001234', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    });

    const dbtStep = result.fixPlan.find((s) => s.action === 'dbt_seeding');
    expect(dbtStep).toBeDefined();
    expect(dbtStep?.stepKeys).toContain('step_bank_dbt_seeding_request');
    expect(dbtStep?.documentsToCarryKeys).toEqual(['carry_aadhaar_original', 'carry_bank_passbook']);
    expect(dbtStep?.needsVerification).toBe(true);

    // Bank name correction step must be distinct from DBT step
    const nameStep = result.fixPlan.find((s) => s.action === 'name_correction');
    expect(nameStep).toBeDefined();
    expect(result.fixPlan.length).toBe(2);
  });

  it('2. IFSC Blocker fix step has recheck step, passbook only, and no passport photos or branch visit', () => {
    const finding = {
      id: 'f-ifsc',
      ruleId: 'R-IFSC-1',
      severity: 'blocker' as const,
      titleKey: 'finding_ifsc_invalid_title',
      explanationKey: 'finding_ifsc_invalid_desc',
      left: { doc: 'bank' as const, labelKey: 'field_ifsc', value: 'SBIN1000123' },
      right: { doc: 'bank' as const, labelKey: 'expected', value: 'hint_expected_ifsc' },
    };

    const step = buildFixStepForFinding(finding);
    expect(step.stepKeys).toEqual(['step_ifsc_recheck']);
    expect(step.documentsToCarryKeys).toEqual(['carry_bank_passbook']);
    expect(step.documentsToCarryKeys).not.toContain('carry_passport_photos');
    expect(step.needsVerification).toBe(false);
  });

  it('3. Aadhaar update limit note: not targeted vs targeted', () => {
    // When Bank is targeted in PM-Kisan (Aadhaar is compared but NOT targeted)
    const resultBankTarget = analyze({
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.95 },
            aadhaarRedacted: { value: 'XXXX XXXX 1234', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'Kumar Ramesh', confidence: 0.95 },
            ifsc: { value: 'SBIN0001234', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
      },
      confirmedFields: [],
      correctVersionChoice: {},
    });

    const bankNameStep = resultBankTarget.fixPlan.find((s) => s.action === 'name_correction');
    expect(bankNameStep?.targetDoc).toBe('bank');
    expect(bankNameStep?.lifetimeLimitNoteKey).toBe('aadhaar_not_targeted_limit_note');
    expect(en[bankNameStep?.lifetimeLimitNoteKey as keyof typeof en]).toContain('does not use any of your Aadhaar updates');

    // When Bank is marked correct by user, target switches to Aadhaar
    const nameFindingId = resultBankTarget.findings.find((f) => f.ruleId.startsWith('R-NAME'))?.id!;
    const resultAadhaarTarget = analyze({
      goalId: 'pm_kisan_payment',
      documents: {
        aadhaar: {
          docType: 'aadhaar',
          detectedDocType: 'aadhaar',
          fields: {
            fullName: { value: 'Ramesh Kumar', confidence: 0.95 },
            aadhaarRedacted: { value: 'XXXX XXXX 1234', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
        bank: {
          docType: 'bank',
          detectedDocType: 'bank',
          fields: {
            accountHolderName: { value: 'Kumar Ramesh', confidence: 0.95 },
            ifsc: { value: 'SBIN0001234', confidence: 0.95 },
          },
          overallConfidence: 0.95,
        },
      },
      confirmedFields: [],
      correctVersionChoice: { [nameFindingId]: 'bank' },
    });

    const aadhaarNameStep = resultAadhaarTarget.fixPlan.find((s) => s.action === 'name_correction');
    expect(aadhaarNameStep?.targetDoc).toBe('aadhaar');
    expect(aadhaarNameStep?.lifetimeLimitNoteKey).toBe('aadhaar_name_target_limit_note');
    expect(en[aadhaarNameStep?.lifetimeLimitNoteKey as keyof typeof en]).toContain('uses 1 of your 2 lifetime Aadhaar name updates');
  });

  it('4. Toggle Which version is correct works in both directions for DOB', () => {
    // Scenario 2: Scholarship with DOB swap
    const baseDocs = {
      aadhaar: {
        docType: 'aadhaar' as const,
        detectedDocType: 'aadhaar' as const,
        fields: {
          fullName: { value: 'Rahul Suresh Patil', confidence: 0.95 },
          dob: { value: '03/05/2005', confidence: 0.95 },
          aadhaarRedacted: { value: 'XXXX XXXX 1234', confidence: 0.95 },
        },
        overallConfidence: 0.95,
      },
      certificate: {
        docType: 'certificate' as const,
        detectedDocType: 'certificate' as const,
        fields: {
          certificateName: { value: 'Rahul Patil', confidence: 0.95 },
          dob: { value: '05/03/2005', confidence: 0.95 },
        },
        overallConfidence: 0.95,
      },
    };

    const initial = analyze({
      goalId: 'scholarship_application',
      documents: baseDocs,
      confirmedFields: [],
      correctVersionChoice: {},
    });

    const dobFinding = initial.findings.find((f) => f.ruleId === 'R-DOB-1')!;
    expect(dobFinding).toBeDefined();

    // Direction A: User marks certificate as correct -> targets Aadhaar
    const planCertCorrect = analyze({
      goalId: 'scholarship_application',
      documents: baseDocs,
      confirmedFields: [],
      correctVersionChoice: { [dobFinding.id]: 'certificate' },
    });
    const aadhaarDobStep = planCertCorrect.fixPlan.find((s) => s.action === 'dob_correction');
    expect(aadhaarDobStep?.targetDoc).toBe('aadhaar');
    expect(aadhaarDobStep?.lifetimeLimitNoteKey).toBe('aadhaar_dob_target_limit_note');
    expect(en[aadhaarDobStep?.lifetimeLimitNoteKey as keyof typeof en]).toContain('uses your only lifetime DOB update');
    expect(aadhaarDobStep?.exceptionPathNoteKey).toBe('aadhaar_exception_path_note');

    // Direction B: User marks Aadhaar as correct -> targets Certificate
    const planAadhaarCorrect = analyze({
      goalId: 'scholarship_application',
      documents: baseDocs,
      confirmedFields: [],
      correctVersionChoice: { [dobFinding.id]: 'aadhaar' },
    });
    const certDobStep = planAadhaarCorrect.fixPlan.find((s) => s.action === 'dob_correction');
    expect(certDobStep?.targetDoc).toBe('certificate');
    expect(certDobStep?.whereKey).toBe('where_education_board');
    expect(certDobStep?.needsVerification).toBe(true);
    expect(certDobStep?.documentsToCarryKeys).toContain('carry_original_marksheet');
  });

  it('5. Advisory findings (R-PAN-3) include step_pan_check_name_first as the first step', () => {
    const finding = {
      id: 'f-pan-3',
      ruleId: 'R-PAN-3',
      severity: 'medium' as const,
      titleKey: 'finding_pan_surname_title',
      explanationKey: 'finding_pan_surname_desc',
      left: { doc: 'pan' as const, labelKey: 'field_panNumber', value: 'AAAPK0000A' },
      right: { doc: 'aadhaar' as const, labelKey: 'doc_aadhaar', value: 'Amit Joshi' },
      fixTarget: 'pan' as const,
    };

    const step = buildFixStepForFinding(finding);
    expect(step.stepKeys[0]).toBe('step_pan_check_name_first');
    expect(en[step.stepKeys[0] as keyof typeof en]).toContain('Check the name printed on your PAN');
  });
});
