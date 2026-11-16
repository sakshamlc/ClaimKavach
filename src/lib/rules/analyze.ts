import goalsData from '../../data/goals.json';
import {
  AnalysisInput,
  DocType,
  Finding,
  GoalConfig,
  Report,
  Severity,
} from './types';
import { compareNames } from './name';
import { compareDob } from './dob';
import { compareGender } from './gender';
import { validatePan, checkPanSurnameMatch } from './pan';
import { validateIfsc } from './ifsc';
import { buildFixPlan } from './fixplan';

const goalsMap = new Map<string, GoalConfig>();
for (const g of goalsData) {
  goalsMap.set(g.id, g as GoalConfig);
}

// Severity weight for sorting findings (Blocker first)
const SEVERITY_ORDER: Record<Severity, number> = {
  blocker: 1,
  high: 2,
  medium: 3,
  low: 4,
  info: 5,
};

/**
 * Per-docType list of applicable fields.
 * R-CONF-1 only evaluates fields in this list (non-null, applicable, low-confidence, unconfirmed).
 */
export const APPLICABLE_FIELDS: Record<DocType, string[]> = {
  aadhaar: ['fullName', 'fatherOrSpouseName', 'dob', 'dobIso', 'yearOfBirthOnly', 'gender', 'aadhaarRedacted'],
  pan: ['fullName', 'fatherOrSpouseName', 'dob', 'panNumber'],
  bank: ['accountHolderName', 'accountNumberLast4', 'ifsc', 'bankName'],
  certificate: ['certificateName', 'fatherOrSpouseName', 'dob', 'institutionName'],
};

const GOAL_REQUIRED_FIELDS: Record<string, Partial<Record<DocType, string[]>>> = {
  pm_kisan_payment: {
    aadhaar: ['fullName'],
    bank: ['accountHolderName', 'ifsc'],
  },
  scholarship_application: {
    aadhaar: ['fullName', 'dob'],
    certificate: ['fullName', 'dob'],
  },
  pan_aadhaar_link: {
    aadhaar: ['fullName', 'dob', 'gender'],
    pan: ['fullName', 'dob', 'gender', 'panNumber'],
  },
  bank_kyc: {
    aadhaar: ['fullName'],
    pan: ['fullName', 'panNumber'],
    bank: ['accountHolderName', 'ifsc'],
  },
};

/**
 * Pure deterministic analysis function for PechanSetu.
 * Evaluates extracted documents against goal requirements and rules.
 * No network calls, no AI.
 *
 * Section A: analyze() uses ONLY the documents in goal.required[] for the chosen goal.
 * Section B: R-CONF-1 is grouped (at most 2 findings: missing-required + low-confidence),
 *            only evaluates non-null, applicable, goal-relevant, low-confidence, unconfirmed fields.
 */
export function analyze(input: AnalysisInput): Report {
  const goal = goalsMap.get(input.goalId);
  const findings: Finding[] = [];
  let findingCounter = 1;

  const addFinding = (
    ruleId: string,
    severity: Severity,
    titleKey: string,
    explanationKey: string,
    left: { doc: DocType; labelKey: string; value: string },
    right: { doc: DocType; labelKey: string; value: string },
    verdict?: any,
    fixTarget?: DocType
  ) => {
    findings.push({
      id: `F-${findingCounter++}`,
      ruleId,
      severity,
      titleKey,
      explanationKey,
      left,
      right,
      verdict,
      fixTarget,
    });
  };

  // A: Filter documents to only those required for the chosen goal.
  // All subsequent comparisons ONLY use docs from this filtered set.
  const requiredDocTypes: DocType[] = goal?.required as DocType[] || [];
  const docs: Partial<Record<DocType, (typeof input.documents)[DocType]>> = {};
  for (const reqDoc of requiredDocTypes) {
    if (input.documents[reqDoc]) {
      docs[reqDoc] = input.documents[reqDoc];
    }
  }

  const confirmed = new Set(input.confirmedFields || []);
  const strictness = goal?.nameStrictness || 'standard';

  // 1. R-REQ-1: Required documents check
  if (goal) {
    for (const reqDoc of goal.required) {
      if (!docs[reqDoc]) {
        addFinding(
          'R-REQ-1',
          'blocker',
          'finding_required_doc_missing_title',
          'finding_required_doc_missing_desc',
          { doc: reqDoc as DocType, labelKey: `doc_${reqDoc}`, value: 'Missing' },
          { doc: reqDoc as DocType, labelKey: 'status', value: 'Required' }
        );
      }
    }
  }

  // 2. R-CONF-1 (B): Grouped low-confidence and missing-required field findings.
  // Rules:
  //   - Only evaluate fields that are: in APPLICABLE_FIELDS[docType], non-null, confidence < 0.75, not user-confirmed
  //   - If a required field is truly null/missing, group into ONE "We could not read..." finding (R-REQ-FIELD)
  //   - Remaining low-confidence fields: group into ONE finding (R-CONF-1) with NO fix step
  {
    const missingRequiredFieldLabels: string[] = [];
    const lowConfidenceFieldLabels: string[] = [];

    const goalReqs = GOAL_REQUIRED_FIELDS[input.goalId] || {};

    for (const docType of requiredDocTypes) {
      const doc = docs[docType];
      if (!doc?.fields) continue;

      const applicableFields = APPLICABLE_FIELDS[docType] || [];
      const requiredForDoc = goalReqs[docType] || [];

      for (const fieldName of applicableFields) {
        const field = (doc.fields as any)[fieldName];
        const fieldKey = `${docType}.${fieldName}`;
        const isConfirmed = confirmed.has(fieldKey);
        const hasValue = field && field.value !== null && field.value !== undefined && field.value !== '';

        if (!hasValue) {
          // If a field REQUIRED by a rule for this goal is truly empty:
          if (requiredForDoc.includes(fieldName)) {
            missingRequiredFieldLabels.push(`field_${fieldName}`);
          }
        } else if (
          typeof field === 'object' &&
          'confidence' in field &&
          field.confidence < 0.75 &&
          !isConfirmed
        ) {
          lowConfidenceFieldLabels.push(`field_${fieldName}`);
        }
      }
    }

    // Grouped "could not read" finding — ONE finding, no fix step
    if (missingRequiredFieldLabels.length > 0) {
      const uniqueLabels = [...new Set(missingRequiredFieldLabels)];
      addFinding(
        'R-REQ-FIELD',
        'medium',
        'finding_missing_fields_title',
        'finding_missing_fields_desc',
        { doc: requiredDocTypes[0] || 'aadhaar', labelKey: 'missing_fields', value: uniqueLabels.join(',') },
        { doc: requiredDocTypes[0] || 'aadhaar', labelKey: 'action', value: 'review_screen' }
      );
    }

    // Grouped low-confidence finding — ONE finding, no fix step
    if (lowConfidenceFieldLabels.length > 0) {
      const uniqueLabels = [...new Set(lowConfidenceFieldLabels)];
      addFinding(
        'R-CONF-1',
        'medium',
        'finding_unconfirmed_confidence_title',
        'finding_unconfirmed_confidence_desc',
        { doc: requiredDocTypes[0] || 'aadhaar', labelKey: 'low_confidence_fields', value: uniqueLabels.join(',') },
        { doc: requiredDocTypes[0] || 'aadhaar', labelKey: 'action', value: 'review_screen' }
      );
    }
  }

  // Helper getters for document values
  const aadhaarName = docs.aadhaar?.fields?.fullName?.value;
  const panName = docs.pan?.fields?.fullName?.value;
  const bankName = docs.bank?.fields?.accountHolderName?.value;
  const certName = docs.certificate?.fields?.fullName?.value || docs.certificate?.fields?.certificateName?.value;

  const aadhaarFather = docs.aadhaar?.fields?.fatherOrSpouseName?.value;
  const certFather = docs.certificate?.fields?.fatherOrSpouseName?.value;

  const aadhaarDob = docs.aadhaar?.fields?.dob?.value || (docs.aadhaar?.fields?.yearOfBirthOnly?.value ? String(docs.aadhaar.fields.yearOfBirthOnly.value) : undefined);
  const panDob = docs.pan?.fields?.dob?.value;
  const certDob = docs.certificate?.fields?.dob?.value;

  const aadhaarGender = docs.aadhaar?.fields?.gender?.value;
  const panGender = docs.pan?.fields?.gender?.value;

  // 3. Name comparisons across pairs
  // Pair: Aadhaar vs Bank
  if (aadhaarName && bankName) {
    const res = compareNames(aadhaarName, bankName, strictness, {
      fatherOrSpouseNameA: aadhaarFather,
    });
    if (res.verdict !== 'NORMALIZED_EXACT') {
      const isPanAlsoMatchingAadhaar =
        panName &&
        compareNames(aadhaarName, panName, strictness).verdict === 'NORMALIZED_EXACT';

      if (isPanAlsoMatchingAadhaar && res.verdict === 'INITIAL_ABBREVIATION') {
        addFinding(
          'R-NAME-1',
          res.severity,
          'finding_name_initial_abbreviation_title',
          'finding_name_initial_abbreviation_desc',
          { doc: 'bank', labelKey: 'doc_bank', value: bankName },
          { doc: 'aadhaar', labelKey: 'docs_aadhaar_pan', value: `${aadhaarName} (Aadhaar & PAN)` },
          'INITIAL_ABBREVIATION',
          'bank'
        );
      } else {
        addFinding(
          'R-NAME-1',
          res.severity,
          `finding_name_${res.verdict.toLowerCase()}_title`,
          `finding_name_${res.verdict.toLowerCase()}_desc`,
          { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarName },
          { doc: 'bank', labelKey: 'doc_bank', value: bankName },
          res.verdict,
          'bank' // Bank is cheaper to change than Aadhaar
        );
      }
    }
  }

  // Pair: Aadhaar vs School Certificate
  if (aadhaarName && certName) {
    const res = compareNames(aadhaarName, certName, strictness, {
      fatherOrSpouseNameA: aadhaarFather,
      fatherOrSpouseNameB: certFather,
    });
    if (res.verdict !== 'NORMALIZED_EXACT') {
      addFinding(
        'R-NAME-2',
        res.severity,
        `finding_name_${res.verdict.toLowerCase()}_title`,
        `finding_name_${res.verdict.toLowerCase()}_desc`,
        { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarName },
        { doc: 'certificate', labelKey: 'doc_certificate', value: certName },
        res.verdict,
        'aadhaar' // Aadhaar is easier to update than School Board Certificate
      );
    }
  }

  // Pair: Aadhaar vs PAN
  if (aadhaarName && panName) {
    const res = compareNames(aadhaarName, panName, strictness, {
      fatherOrSpouseNameA: aadhaarFather,
    });
    if (res.verdict !== 'NORMALIZED_EXACT') {
      addFinding(
        'R-NAME-3',
        res.severity,
        `finding_name_${res.verdict.toLowerCase()}_title`,
        `finding_name_${res.verdict.toLowerCase()}_desc`,
        { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarName },
        { doc: 'pan', labelKey: 'doc_pan', value: panName },
        res.verdict,
        'pan' // PAN online correction (rank 2) is cheaper than Aadhaar centre (rank 4)
      );
    }
  }

  // Pair: Bank vs PAN (when both present and Aadhaar missing or for bank KYC)
  if (!aadhaarName && bankName && panName) {
    const res = compareNames(panName, bankName, strictness);
    if (res.verdict !== 'NORMALIZED_EXACT') {
      addFinding(
        'R-NAME-4',
        res.severity,
        `finding_name_${res.verdict.toLowerCase()}_title`,
        `finding_name_${res.verdict.toLowerCase()}_desc`,
        { doc: 'pan', labelKey: 'doc_pan', value: panName },
        { doc: 'bank', labelKey: 'doc_bank', value: bankName },
        res.verdict,
        'bank'
      );
    }
  }

  // 4. Date of Birth comparisons
  // Aadhaar vs Certificate DOB
  if (aadhaarDob && certDob) {
    const res = compareDob(aadhaarDob, certDob, strictness);
    if (!res.matches) {
      addFinding(
        'R-DOB-1',
        res.severity,
        res.isSwapHint ? 'finding_dob_swap_title' : 'finding_dob_mismatch_title',
        res.isSwapHint ? 'finding_dob_swap_desc' : 'finding_dob_mismatch_desc',
        { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarDob },
        { doc: 'certificate', labelKey: 'doc_certificate', value: certDob },
        undefined,
        'aadhaar'
      );
    } else if (res.severity === 'medium') {
      // R-DOB-2 Year-only match in strict mode
      addFinding(
        'R-DOB-2',
        'medium',
        'finding_dob_year_only_title',
        'finding_dob_year_only_desc',
        { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarDob },
        { doc: 'certificate', labelKey: 'doc_certificate', value: certDob }
      );
    }
  }

  // Aadhaar vs PAN DOB
  if (aadhaarDob && panDob) {
    const res = compareDob(aadhaarDob, panDob, strictness);
    if (!res.matches) {
      addFinding(
        'R-DOB-1',
        res.severity,
        res.isSwapHint ? 'finding_dob_swap_title' : 'finding_dob_mismatch_title',
        res.isSwapHint ? 'finding_dob_swap_desc' : 'finding_dob_mismatch_desc',
        { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarDob },
        { doc: 'pan', labelKey: 'doc_pan', value: panDob },
        undefined,
        'pan'
      );
    } else if (res.severity === 'medium') {
      addFinding(
        'R-DOB-2',
        'medium',
        'finding_dob_year_only_title',
        'finding_dob_year_only_desc',
        { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarDob },
        { doc: 'pan', labelKey: 'doc_pan', value: panDob }
      );
    }
  }

  // 5. Gender comparisons (R-GEN-1)
  if (aadhaarGender && panGender) {
    const res = compareGender(aadhaarGender, panGender);
    if (!res.matches) {
      addFinding(
        'R-GEN-1',
        res.severity,
        'finding_gender_mismatch_title',
        'finding_gender_mismatch_desc',
        { doc: 'aadhaar', labelKey: 'doc_aadhaar', value: aadhaarGender },
        { doc: 'pan', labelKey: 'doc_pan', value: panGender },
        undefined,
        'pan'
      );
    }
  }

  // 6. PAN specific rules
  if (docs.pan?.fields?.panNumber?.value) {
    const panVal = docs.pan.fields.panNumber.value;
    const vRes = validatePan(panVal, true);

    if (!vRes.valid) {
      addFinding(
        vRes.severity === 'blocker' ? 'R-PAN-1' : 'R-PAN-2',
        vRes.severity,
        vRes.severity === 'blocker' ? 'finding_pan_invalid_title' : 'finding_pan_not_individual_title',
        vRes.severity === 'blocker' ? 'finding_pan_invalid_desc' : 'finding_pan_not_individual_desc',
        { doc: 'pan', labelKey: 'field_panNumber', value: panVal },
        {
          doc: 'pan',
          labelKey: 'expected',
          value: vRes.severity === 'blocker' ? 'hint_expected_pan' : 'hint_expected_pan_individual',
        },
        undefined,
        'pan'
      );
    } else if (panName) {
      // R-PAN-3: Check surname initial against 5th letter
      const sRes = checkPanSurnameMatch(panVal, panName, aadhaarName || undefined);
      if (!sRes.matches) {
        addFinding(
          'R-PAN-3',
          sRes.severity,
          'finding_pan_surname_title',
          'finding_pan_surname_desc',
          { doc: 'pan', labelKey: 'field_panNumber', value: panVal },
          { doc: 'pan', labelKey: 'field_fullName', value: panName },
          undefined,
          'pan'
        );
      }
    }
  }

  // 7. Bank specific rules
  if (docs.bank?.fields?.ifsc?.value) {
    const ifscVal = docs.bank.fields.ifsc.value;
    const ifscRes = validateIfsc(ifscVal);

    if (!ifscRes.valid) {
      addFinding(
        'R-IFSC-1',
        'blocker',
        'finding_ifsc_invalid_title',
        'finding_ifsc_invalid_desc',
        { doc: 'bank', labelKey: 'field_ifsc', value: ifscVal },
        { doc: 'bank', labelKey: 'expected', value: 'hint_expected_ifsc' },
        undefined,
        'bank'
      );
    } else if (ifscRes.severity === 'high') {
      // Merged bank (R-IFSC-2)
      addFinding(
        'R-IFSC-2',
        'high',
        'finding_ifsc_merged_bank_title',
        'finding_ifsc_merged_bank_desc',
        { doc: 'bank', labelKey: 'field_ifsc', value: ifscVal },
        {
          doc: 'bank',
          labelKey: 'merged_into',
          value: `${ifscRes.mergedBankInfo?.oldBankName} -> ${ifscRes.mergedBankInfo?.mergedIntoBank}`,
        },
        undefined,
        'bank'
      );
    } else if (ifscRes.explanationKey === 'ifsc_unknown_bank') {
      addFinding(
        'R-IFSC-2',
        'low',
        'finding_ifsc_unknown_title',
        'finding_ifsc_unknown_desc',
        { doc: 'bank', labelKey: 'field_ifsc', value: ifscVal },
        { doc: 'bank', labelKey: 'status', value: 'Unverified Branch Code' },
        undefined,
        'bank'
      );
    }
  }

  // R-ACC-1: Account number check
  if (docs.bank?.fields?.accountNumberLast4?.value) {
    const accVal = String(docs.bank.fields.accountNumberLast4.value).trim();
    // In UI/fixtures, last4 might be 4 digits or full account. Check digits only.
    if (!/^\d+$/.test(accVal)) {
      addFinding(
        'R-ACC-1',
        'medium',
        'finding_acc_invalid_title',
        'finding_acc_invalid_desc',
        { doc: 'bank', labelKey: 'field_accountNumber', value: accVal },
        { doc: 'bank', labelKey: 'expected', value: 'hint_expected_acc' },
        undefined,
        'bank'
      );
    }
  }

  // 8. Aadhaar presence (R-AADH-1)
  if (docs.aadhaar && !docs.aadhaar.fields?.aadhaarRedacted?.value) {
    addFinding(
      'R-AADH-1',
      'info',
      'finding_aadhaar_indicator_missing_title',
      'finding_aadhaar_indicator_missing_desc',
      { doc: 'aadhaar', labelKey: 'field_aadhaar', value: 'Not detected' },
      { doc: 'aadhaar', labelKey: 'status', value: 'Present' }
    );
  }

  // 9. R-DBT-1: NPCI DBT Seeding Checklist for PM-Kisan & Scholarships
  if ((input.goalId === 'pm_kisan_payment' || input.goalId === 'scholarship_application') && docs.bank) {
    addFinding(
      'R-DBT-1',
      'info',
      'finding_dbt_seeding_title',
      'finding_dbt_seeding_desc',
      { doc: 'bank', labelKey: 'dbt_status', value: 'NPCI DBT Mapper' },
      { doc: 'bank', labelKey: 'action', value: 'Check & Seed' },
      undefined,
      'bank'
    );
  }

  // Sort findings by severity (Blocker first)
  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  // Status banner logic:
  // any Blocker = Blocked; else any High = Fix needed; else Medium or lower only = Ready with notes; none = Ready
  let status: Report['status'] = 'ready';
  if (findings.some((f) => f.severity === 'blocker')) {
    status = 'blocked';
  } else if (findings.some((f) => f.severity === 'high')) {
    status = 'fix_needed';
  } else if (findings.some((f) => f.severity === 'medium' || f.severity === 'low' || f.severity === 'info')) {
    status = 'ready_with_notes';
  }

  // Build ranked fix plan
  const fixPlan = buildFixPlan(findings, goal, input.correctVersionChoice);

  return {
    status,
    findings,
    fixPlan,
    generatedAt: new Date().toISOString(),
  };
}
