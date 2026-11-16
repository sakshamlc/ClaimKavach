import { Finding, FixStep } from './rules/types';

export function getFixStepTitle(step: FixStep, t: (key: string) => string): string {
  if (step.action === 'dbt_seeding') {
    return t('step_title_dbt_seeding');
  }
  if (step.action === 'name_correction') {
    return `${t('step_title_name_correction')} ${t('doc_' + step.targetDoc)}`;
  }
  if (step.action === 'dob_correction') {
    return `${t('step_title_dob_correction')} ${t('doc_' + step.targetDoc)}`;
  }
  if (step.action === 'ifsc_correction') {
    return t('step_title_ifsc_correction');
  }
  if (step.action === 'pan_correction') {
    return t('step_title_pan_correction');
  }
  if (step.action === 'gender_correction') {
    return `${t('step_title_gender_correction')} ${t('doc_' + step.targetDoc)}`;
  }
  return `${t('fixStepChange')} ${t('doc_' + step.targetDoc)}`;
}

export function generateSummaryText(
  report: {
    status: string;
    findings: Finding[];
    fixPlan: FixStep[];
  },
  t: (key: string) => string
): string {
  const { status, findings, fixPlan } = report;
  let summaryText = `*PechanSetu - Document Check Summary*\n`;
  summaryText += `Status: ${status === 'ready' ? t('status_ready_banner') : t(`status_${status}`)}\n\n`;

  if (findings.length > 0) {
    summaryText += `*Issues Found:*\n`;
    findings.forEach((f, idx) => {
      summaryText += `${idx + 1}. ${t(f.titleKey)} (${f.severity.toUpperCase()})\n`;
    });

    // DOB swap hint where applicable
    const swapFinding = findings.find((f) => f.titleKey === 'finding_dob_swap_title');
    if (swapFinding) {
      summaryText += `\n*Note on Date of Birth:* The day and month appear reversed between documents (e.g. DD/MM vs MM/DD). Fix on your school/board certificate or Aadhaar.\n`;
    }

    summaryText += `\n*Recommended Fix Steps:*\n`;
    fixPlan.forEach((step, idx) => {
      const title = getFixStepTitle(step, t);
      summaryText += `${idx + 1}. ${title}\n`;

      // Naming the finding it addresses
      const matchingFinding = findings.find((f) => f.id === step.findingId);
      if (matchingFinding) {
        summaryText += `   ${t('forFinding')} ${t(matchingFinding.titleKey)}\n`;
      }

      summaryText += `   ${t('fixStepWhere')} ${t(step.whereKey)}\n`;

      if (step.documentsToCarryKeys && step.documentsToCarryKeys.length > 0) {
        const carryList = step.documentsToCarryKeys.map((k) => t(k)).join(', ');
        summaryText += `   *${t('fixStepCarry')}* ${carryList}\n`;
      }

      if (step.optionalDocumentsKeys && step.optionalDocumentsKeys.length > 0) {
        const optList = step.optionalDocumentsKeys.map((k) => t(k)).join(', ');
        summaryText += `   ${t('branchMayAlsoAskFor')}: ${optList} (${t('verifyOnOfficialSite')})\n`;
      }

      if (step.lifetimeLimitNoteKey) {
        const rawNote = t(step.lifetimeLimitNoteKey);
        const cleanNote = rawNote.replace(/^(Important|Notice|महत्वपूर्ण|महत्त्वाचे|सूचना):\s*/i, '');
        summaryText += `   *Important:* ${cleanNote}\n`;
      }
    });
  } else {
    summaryText += `${t('status_ready_banner')}\n${t('status_ready_desc')}\n`;
  }

  summaryText += `\n${t('disclaimer')}`;
  return summaryText;
}
