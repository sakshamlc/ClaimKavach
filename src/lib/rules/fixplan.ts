import correctionCostsData from '../../data/correction-costs.json';
import { DocType, Finding, FixStep, GoalConfig, CorrectionCostEntry } from './types';

const costMap = new Map<DocType, CorrectionCostEntry>();
for (const entry of correctionCostsData) {
  costMap.set(entry.doc as DocType, entry as CorrectionCostEntry);
}

/**
 * Determines which document to target for correction between docX and docY:
 * 1. If user explicitly toggled "Which version is correct?", the OTHER document is targeted.
 * 2. If goal has an authoritativeDoc among them, change the other one (never target Aadhaar when
 *    a cheaper compatible option exists).
 * 3. Else choose the document with the lower correction cost (cheapest/easiest first).
 */
export function selectFixTarget(
  docX: DocType,
  docY: DocType,
  goal?: GoalConfig,
  userChoiceDoc?: DocType
): DocType {
  // 1. User toggle: if user marks docX as correct, fix docY and vice versa
  if (userChoiceDoc) {
    if (userChoiceDoc === docX) return docY;
    if (userChoiceDoc === docY) return docX;
  }

  // 2. Authoritative document: target the OTHER one
  if (goal?.authoritativeDoc) {
    if (goal.authoritativeDoc === docX && docX !== docY) return docY;
    if (goal.authoritativeDoc === docY && docX !== docY) return docX;
  }

  // 3. Lower correction cost (never prefer Aadhaar when a cheaper compatible doc exists)
  const costX = costMap.get(docX)?.cost ?? 99;
  const costY = costMap.get(docY)?.cost ?? 99;

  return costX <= costY ? docX : docY;
}

/**
 * Builds a FixStep for a finding given the target document and user overrides.
 * R-DBT-1 always gets its own unique action ('dbt_seeding') and never shares a step with
 * bank name/IFSC corrections.
 */
export function buildFixStepForFinding(
  finding: Finding,
  goal?: GoalConfig,
  userChoiceDoc?: DocType
): FixStep {
  // R-DBT-1 always targets bank with its own DBT seeding step
  if (finding.ruleId === 'R-DBT-1') {
    return {
      findingId: finding.id,
      targetDoc: 'bank',
      action: 'dbt_seeding',
      whereKey: 'where_bank_branch',
      stepKeys: ['step_bank_dbt_seeding_request'],
      documentsToCarryKeys: ['carry_aadhaar_original', 'carry_bank_passbook'],
      lifetimeLimitNoteKey: undefined,
      exceptionPathNoteKey: undefined,
      effortRank: 1,
      effortLabelKey: 'effort_bank',
      needsVerification: true,
      letterTemplateId: 'dbt-seeding-request',
    };
  }

  // R-IFSC-1: Blocker fix step - check IFSC on passbook or bank website and re-enter
  if (finding.ruleId === 'R-IFSC-1') {
    return {
      findingId: finding.id,
      targetDoc: 'bank',
      action: 'ifsc_correction',
      whereKey: 'where_bank_branch',
      stepKeys: ['step_ifsc_recheck'],
      documentsToCarryKeys: ['carry_bank_passbook'],
      lifetimeLimitNoteKey: undefined,
      exceptionPathNoteKey: undefined,
      effortRank: 1,
      effortLabelKey: 'effort_bank',
      needsVerification: false,
    };
  }

  // R-CONF-1 and R-REQ-FIELD: no fix steps (review screen only)
  if (finding.ruleId === 'R-CONF-1' || finding.ruleId === 'R-REQ-FIELD') {
    return {
      findingId: finding.id,
      targetDoc: finding.left.doc,
      action: 'review_confirm',
      whereKey: 'where_official_office',
      stepKeys: [],
      documentsToCarryKeys: [],
      effortRank: 99, // Never show in fix plan
      effortLabelKey: 'effort_moderate',
      needsVerification: false,
    };
  }

  const targetDoc = userChoiceDoc
    ? selectFixTarget(finding.left.doc, finding.right.doc, goal, userChoiceDoc)
    : finding.fixTarget || selectFixTarget(finding.left.doc, finding.right.doc, goal);

  const costEntry = costMap.get(targetDoc);

  // Determine action category
  let action = 'general_correction';
  if (finding.ruleId.startsWith('R-NAME')) action = 'name_correction';
  else if (finding.ruleId.startsWith('R-DOB')) action = 'dob_correction';
  else if (finding.ruleId.startsWith('R-PAN')) action = 'pan_correction';
  else if (finding.ruleId.startsWith('R-IFSC')) action = 'ifsc_correction';
  else if (finding.ruleId.startsWith('R-GEN')) action = 'gender_correction';

  // Advisory findings (Medium or lower, e.g. R-PAN-3):
  // First step is a check, correction steps under "Only if needed"
  let stepKeys = costEntry?.stepKeys ? [...costEntry.stepKeys] : [];
  if (finding.ruleId === 'R-PAN-3') {
    stepKeys = ['step_pan_check_name_first', ...stepKeys];
  }

  // Determine if letter template applies
  let letterTemplateId: 'name-correction' | 'dbt-seeding-request' | undefined;
  if (finding.ruleId.startsWith('R-NAME') || finding.ruleId.startsWith('R-IFSC')) {
    if (targetDoc === 'bank') {
      letterTemplateId = 'name-correction';
    }
  }

  const isAadhaarInvolved =
    targetDoc === 'aadhaar' ||
    finding.left.doc === 'aadhaar' ||
    finding.right.doc === 'aadhaar';

  let lifetimeLimitNoteKey: string | undefined;
  let exceptionPathNoteKey: string | undefined;

  if (targetDoc === 'aadhaar') {
    if (finding.ruleId.startsWith('R-DOB')) {
      lifetimeLimitNoteKey = 'aadhaar_dob_target_limit_note';
    } else {
      lifetimeLimitNoteKey = 'aadhaar_name_target_limit_note';
    }
    exceptionPathNoteKey = 'aadhaar_exception_path_note';
  } else if (isAadhaarInvolved) {
    lifetimeLimitNoteKey = 'aadhaar_not_targeted_limit_note';
  }

  return {
    findingId: finding.id,
    targetDoc,
    action,
    whereKey: costEntry?.whereKey || 'where_official_office',
    stepKeys,
    documentsToCarryKeys: costEntry?.documentsToCarryKeys || [],
    lifetimeLimitNoteKey,
    exceptionPathNoteKey,
    effortRank: costEntry?.effortRank || 3,
    effortLabelKey: costEntry?.effortLabelKey || 'effort_moderate',
    needsVerification: costEntry ? !costEntry.verified : true,
    letterTemplateId,
  };
}

/**
 * Builds the complete ranked fix plan.
 * Section C fixes:
 *  - R-CONF-1 and R-REQ-FIELD findings are excluded from fix plan (review screen only).
 *  - Deduplication: steps sharing (targetDoc, whereKey) are merged; findingIds concatenated.
 *  - Sorted by effortRank (cheapest first).
 */
export function buildFixPlan(
  findings: Finding[],
  goal?: GoalConfig,
  correctVersionChoice: Record<string, DocType> = {}
): FixStep[] {
  // Build all steps, excluding review-only findings
  const rawSteps: FixStep[] = [];
  for (const finding of findings) {
    if (finding.ruleId === 'R-CONF-1' || finding.ruleId === 'R-REQ-FIELD') continue;
    const userChoice = correctVersionChoice[finding.id];
    rawSteps.push(buildFixStepForFinding(finding, goal, userChoice));
  }

  // Dedup by (targetDoc, action): merge findings sharing the same target and action under one step.
  const dedupMap = new Map<string, FixStep>();
  for (const step of rawSteps) {
    const dedupeKey = `${step.targetDoc}|${step.action || step.whereKey}`;

    const existing = dedupMap.get(dedupeKey);
    if (!existing) {
      dedupMap.set(dedupeKey, step);
    }
  }

  const steps = Array.from(dedupMap.values());

  // Sort cheapest first (effortRank 1 before 2, 4, 5)
  return steps.sort((a, b) => a.effortRank - b.effortRank);
}
