'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { SeverityChip } from '@/components/SeverityChip';
import { SideBySideDiff } from '@/components/SideBySideDiff';
import { VerifyBadge } from '@/components/VerifyBadge';
import { FindingCard } from '@/components/FindingCard';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { DocType } from '@/lib/rules/types';
import { analyze } from '@/lib/rules/analyze';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info as InfoIcon,
  Copy,
  Volume2,
  VolumeX,
  FileDown,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  MapPin,
  FileCheck,
} from 'lucide-react';

export default function ReportPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const goalId = useAppStore((state) => state.goalId);
  const documents = useAppStore((state) => state.documents);
  const findings = useAppStore((state) => state.findings);
  const fixPlan = useAppStore((state) => state.fixPlan);
  const correctVersionChoice = useAppStore((state) => state.correctVersionChoice);
  const setCorrectVersionChoice = useAppStore((state) => state.setCorrectVersionChoice);
  const setReport = useAppStore((state) => state.setReport);

  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [checkedCarryDocs, setCheckedCarryDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!goalId) {
      router.push('/goal');
    }
  }, [goalId, router]);

  // Handle "Which version is correct?" toggle
  const handleToggleCorrectVersion = (findingId: string, chosenDoc: DocType) => {
    setCorrectVersionChoice(findingId, chosenDoc);

    // Re-run pure analysis with the user's toggle choice
    if (!goalId) return;
    const docsForAnalysis: any = {};
    for (const [k, d] of Object.entries(documents)) {
      if (d?.extracted) docsForAnalysis[k] = d.extracted;
    }

    const updatedReport = analyze({
      goalId,
      documents: docsForAnalysis,
      confirmedFields: [],
      correctVersionChoice: {
        ...correctVersionChoice,
        [findingId]: chosenDoc,
      },
    });

    setReport(updatedReport.findings, updatedReport.fixPlan);
  };

  const toggleCheckDoc = (key: string) => {
    setCheckedCarryDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Status Banner calculation
  const hasBlocker = findings.some((f) => f.severity === 'blocker');
  const hasHigh = findings.some((f) => f.severity === 'high');
  const statusType = hasBlocker
    ? 'blocked'
    : hasHigh
    ? 'fix_needed'
    : findings.length > 0
    ? 'ready_with_notes'
    : 'ready';

  const isAadhaarInvolved =
    findings.some(
      (f) =>
        f.left.doc === 'aadhaar' ||
        f.right.doc === 'aadhaar' ||
        f.fixTarget === 'aadhaar'
    ) || fixPlan.some((s) => s.targetDoc === 'aadhaar');

  // Copy plain text summary for WhatsApp (no sensitive ID digits)
  const handleCopySummary = () => {
    let summaryText = `*PechanSetu - Document Check Summary*\n`;
    summaryText += `Status: ${statusType === 'ready' ? t('status_ready_banner') : t(`status_${statusType}`)}\n\n`;

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
        summaryText += `${idx + 1}. ${t(`doc_${step.targetDoc}`)}: ${t(step.whereKey)}\n`;
        if (step.documentsToCarryKeys && step.documentsToCarryKeys.length > 0) {
          const carryList = step.documentsToCarryKeys.map((k) => t(k)).join(', ');
          summaryText += `   *Documents to carry:* ${carryList}\n`;
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

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Browser speech synthesis read-aloud
  const handleReadAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let speechText = `${t('reportTitle')}. ${t(`status_${statusType}`)}. `;
    findings.forEach((f) => {
      speechText += `${t(f.titleKey)}. ${t(f.explanationKey)}. `;
    });
    fixPlan.forEach((step) => {
      speechText += `${t('fixStepChange')} ${t(`doc_${step.targetDoc}`)} at ${t(step.whereKey)}. `;
    });

    const utterance = new SpeechSynthesisUtterance(speechText);
    const langCode = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    utterance.lang = langCode;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        {/* Navigation / Back */}
        <button
          type="button"
          onClick={() => router.push('/review')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text-main mb-6 min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        {/* Status Banner */}
        <div
          className={`p-5 rounded-card border shadow-xs mb-8 flex items-start gap-4 ${
            statusType === 'blocked'
              ? 'bg-danger-bg border-rose-300 text-danger-fg'
              : statusType === 'fix_needed'
              ? 'bg-warning-bg border-amber-300 text-warning-fg'
              : statusType === 'ready_with_notes'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-success-bg border-emerald-300 text-success-fg'
          }`}
          role="status"
        >
          <div className="shrink-0 mt-0.5">
            {statusType === 'blocked' ? (
              <AlertCircle className="w-7 h-7 text-danger-fg" />
            ) : statusType === 'fix_needed' ? (
              <AlertTriangle className="w-7 h-7 text-warning-fg" />
            ) : statusType === 'ready_with_notes' ? (
              <AlertTriangle className="w-7 h-7 text-amber-700" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-success-fg" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-extrabold">
              {statusType === 'ready' ? t('status_ready_banner') : t(`status_${statusType}`)}
            </h1>
            <p className="text-sm mt-1 leading-relaxed">
              {t(`status_${statusType}_desc`)}
            </p>
          </div>
        </div>

        {/* Global Action Bar (Copy WhatsApp, Read Aloud) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface rounded-card border border-border mb-8 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-background hover:bg-slate-100 text-text-main border border-border rounded-xl shadow-xs min-h-[44px] transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">{t('copiedToClipboard')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-muted" />
                  <span>{t('copyAsText')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReadAloud}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-background hover:bg-slate-100 text-text-main border border-border rounded-xl shadow-xs min-h-[44px] transition-all"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4 text-danger-fg" />
                  <span>{t('stopReading')}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span>{t('readAloud')}</span>
                </>
              )}
            </button>
          </div>

          <span className="text-xs text-muted font-medium">
            {findings.length} issue{findings.length === 1 ? '' : 's'} identified
          </span>
        </div>

        {/* SECTION A: Findings */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
            <span>{t('findingsHeading')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              {findings.length}
            </span>
          </h2>

          <div className="space-y-4">
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                t={t}
                currentChoice={correctVersionChoice[finding.id]}
                onToggleCorrectVersion={handleToggleCorrectVersion}
              />
            ))}
          </div>
        </section>

        {/* SECTION B: Ranked Fix Plan */}
        <section id="fix-plan" className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-text-main">
              {t('fixPlanHeading')}
            </h2>
            <p className="text-xs text-muted mt-1">
              {isAadhaarInvolved
                ? t('fixPlanSubtitleWithAadhaar')
                : t('fixPlanSubtitleStandard')}
            </p>
          </div>

          <div className="space-y-6">
            {fixPlan.map((step, idx) => (
              <div
                key={`${step.findingId}-${step.targetDoc}-${idx}`}
                className="bg-surface rounded-card border border-border p-5 shadow-xs"
              >
                {/* Header: Rank + Effort Chip */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-text-main">
                      {t('fixStepChange')} {t(`doc_${step.targetDoc}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-info-bg text-info-fg border border-sky-200">
                      {t(step.effortLabelKey)}
                    </span>
                    {step.needsVerification && <VerifyBadge />}
                  </div>
                </div>

                {/* Where to go */}
                <div className="flex items-center gap-2 text-xs text-text-main mb-3 font-semibold">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    {t('fixStepWhere')} {t(step.whereKey)}
                  </span>
                </div>

                {/* UIDAI Lifetime Limit Warning Guardrail */}
                {step.lifetimeLimitNoteKey && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 mb-3 leading-relaxed">
                    <strong>⚠️ {t(step.lifetimeLimitNoteKey)}</strong>
                    {step.exceptionPathNoteKey && (
                      <p className="mt-1 text-[11px] text-amber-800">
                        {t(step.exceptionPathNoteKey)}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Steps */}
                <div className="mb-4">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                    {t('fixStepSteps')}
                  </span>
                  <ol className="space-y-1.5 list-decimal list-inside text-xs text-text-main">
                    {step.stepKeys.map((sKey) => {
                      if (sKey === 'step_pan_check_name_first') {
                        return (
                          <li key={sKey} className="leading-relaxed list-none mb-2">
                            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-medium">
                              {t(sKey)}
                            </div>
                            <div className="text-[11px] font-bold text-muted uppercase tracking-wider mt-3 mb-1">
                              {t('onlyIfNeeded')}
                            </div>
                          </li>
                        );
                      }
                      return (
                        <li key={sKey} className="leading-relaxed">
                          {t(sKey)}
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Documents to Carry Checklist */}
                {step.documentsToCarryKeys.length > 0 && (
                  <div className="mb-5 p-3.5 bg-background rounded-xl border border-border">
                    <span className="text-xs font-bold text-text-main block mb-2 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-primary" />
                      <span>{t('fixStepCarry')}</span>
                    </span>
                    <div className="space-y-1.5">
                      {step.documentsToCarryKeys.map((cKey) => {
                        const isChecked = !!checkedCarryDocs[cKey];
                        return (
                          <label
                            key={cKey}
                            className="flex items-center gap-2 text-xs text-text-main cursor-pointer hover:text-primary transition-colors min-h-[32px]"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCheckDoc(cKey)}
                              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                            />
                            <span className={isChecked ? 'line-through text-muted' : ''}>
                              {t(cKey)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Create Sample Letter Button */}
                {step.letterTemplateId && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/letter/${step.findingId}`)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all min-h-[44px]"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>{t('createSampleLetter')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer Disclaimer */}
        <div className="text-center p-4 border-t border-border text-xs text-muted">
          <p>{t('disclaimer')}</p>
        </div>
      </main>
    </div>
  );
}
