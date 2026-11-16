'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { DocType, ExtractedDocument } from '@/lib/rules/types';
import { analyze, APPLICABLE_FIELDS } from '@/lib/rules/analyze';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

export default function ReviewPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const goalId = useAppStore((state) => state.goalId);
  const documents = useAppStore((state) => state.documents);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const updateExtractedField = useAppStore((state) => state.updateExtractedField);
  const confirmField = useAppStore((state) => state.confirmField);
  const setReport = useAppStore((state) => state.setReport);

  const handleFieldChange = (docType: DocType, fieldName: string, val: string) => {
    updateExtractedField(docType, fieldName, val);
  };

  const handleConfirm = (docType: DocType, fieldName: string) => {
    confirmField(docType, fieldName);
  };

  const handleProceed = () => {
    if (!goalId) return;

    // Build documents map for analyze()
    const docsForAnalysis: Partial<Record<DocType, ExtractedDocument>> = {};
    const confirmedFieldsList: string[] = [];

    for (const [key, docState] of Object.entries(documents)) {
      if (docState?.extracted) {
        docsForAnalysis[key as DocType] = docState.extracted;
        confirmedFieldsList.push(...(docState.userConfirmedFields || []));
      }
    }

    // Run deterministic analysis pure function!
    const report = analyze({
      goalId,
      documents: docsForAnalysis,
      confirmedFields: confirmedFieldsList,
      correctVersionChoice: {},
    });

    setReport(report.findings, report.fixPlan);
    router.push('/report');
  };

  const docEntries = Object.entries(documents) as [DocType, any][];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push(isDemoMode ? '/demo' : '/upload')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text-main mb-6 min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-text-main">
            {t('reviewTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('reviewSubtitle')}</p>
        </div>

        {/* Document Sections */}
        <div className="space-y-6">
          {docEntries.map(([docType, docState]) => {
            const extracted = docState?.extracted as ExtractedDocument | undefined;
            if (!extracted) return null;

            const fields = extracted.fields || {};
            const confirmedSet = new Set(docState?.userConfirmedFields || []);

            return (
              <div
                key={docType}
                className="bg-surface rounded-card border border-border p-5 shadow-xs"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-primary">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="font-bold text-base text-text-main">
                      {t(`doc_${docType}`)}
                    </h2>
                  </div>
                  {docState?.fileObjectUrl && (
                    <a
                      href={docState.fileObjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-md"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>View original</span>
                    </a>
                  )}
                </div>

                {/* Optional Image Thumbnail Preview */}
                {docState?.fileObjectUrl && (
                  <div className="mb-4 p-2 bg-background rounded-lg border border-border flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={docState.fileObjectUrl}
                      alt={t(`doc_${docType}`)}
                      className="w-16 h-16 object-cover rounded border border-border shrink-0 cursor-pointer hover:opacity-90"
                      onClick={() => window.open(docState.fileObjectUrl, '_blank')}
                      title="Click to view full image"
                    />
                    <div className="text-xs text-muted">
                      <p className="font-semibold text-text-main">Original Document Photo</p>
                      <p>Tap thumbnail to zoom and inspect printed text.</p>
                    </div>
                  </div>
                )}

                {/* Editable Fields (strictly applicable per docType) */}
                <div className="space-y-3.5">
                  {(APPLICABLE_FIELDS[docType] || Object.keys(fields)).map((fieldName: string) => {
                    const field = (fields as any)[fieldName] || { value: '', confidence: 0 };

                    const fieldKey = `${docType}.${fieldName}`;
                    const isConfirmed = confirmedSet.has(fieldKey);
                    const confidence = field.confidence ?? 1.0;
                    const isLowConfidence = confidence < 0.75 && !isConfirmed;

                    // Aadhaar redaction display rule: never show full digits
                    const isAadhaarNumberField = fieldName === 'aadhaarRedacted';
                    const displayValue = isAadhaarNumberField
                      ? '[Aadhaar Present - Redacted]'
                      : field.value ?? '';

                    return (
                      <div
                        key={fieldName}
                        className={`p-3 rounded-xl border transition-all ${
                          isLowConfidence
                            ? 'bg-amber-50/60 border-amber-300'
                            : 'bg-background border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-text-main block">
                            {t(`field_${fieldName}`)}
                          </label>

                          {/* Confidence Chip */}
                          {isLowConfidence ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>{t('confidenceLow')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t('confidenceHigh')}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly={isAadhaarNumberField}
                            value={displayValue}
                            onChange={(e) =>
                              handleFieldChange(docType, fieldName, e.target.value)
                            }
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border bg-surface text-text-main font-medium focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px] ${
                              isAadhaarNumberField ? 'bg-slate-100 text-muted cursor-not-allowed' : ''
                            }`}
                            placeholder={t('addMissingValue')}
                          />

                          {/* "Looks right" button for low-confidence fields */}
                          {isLowConfidence && (
                            <button
                              type="button"
                              onClick={() => handleConfirm(docType, fieldName)}
                              className="px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs min-h-[44px] shrink-0"
                            >
                              {t('looksRight')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Proceed Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleProceed}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-hover text-white text-base font-bold rounded-xl shadow-md transition-all min-h-[48px] focus:ring-4 focus:ring-primary/20"
          >
            <Sparkles className="w-5 h-5" />
            <span>{t('proceedToAnalysis')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
