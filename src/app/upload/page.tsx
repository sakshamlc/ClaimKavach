'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { DocType } from '@/lib/rules/types';
import goalsData from '@/data/goals.json';
import { checkCanvasBlur } from '@/lib/blurGate';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';

/**
 * Compresses raster images using client-side HTML5 canvas to max 1600px and JPEG quality 0.8.
 * PDFs pass through directly.
 */
async function processClientFile(file: File): Promise<{ blob: Blob; fileName: string }> {
  // If PDF, pass through directly
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return { blob: file, fileName: file.name };
  }

  // Raster image compression via HTML5 canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ blob: file, fileName: file.name });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Client-side Blur Detection Gate (variance threshold 40)
        const blurCheck = checkCanvasBlur(canvas, 40);
        if (blurCheck.isBlurry) {
          reject(new Error('PHOTO_BLURRY'));
          return;
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                fileName: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
              });
            } else {
              resolve({ blob: file, fileName: file.name });
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve({ blob: file, fileName: file.name });
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const goalId = useAppStore((state) => state.goalId);
  const consentAccepted = useAppStore((state) => state.consentAccepted);
  const documents = useAppStore((state) => state.documents);
  const setDocumentFile = useAppStore((state) => state.setDocumentFile);
  const setDocumentReading = useAppStore((state) => state.setDocumentReading);
  const setDocumentExtracted = useAppStore((state) => state.setDocumentExtracted);
  const setDocumentError = useAppStore((state) => state.setDocumentError);
  const removeDocument = useAppStore((state) => state.removeDocument);

  const [activeSlot, setActiveSlot] = useState<DocType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mismatchSuggestion, setMismatchSuggestion] = useState<{
    from: DocType;
    to: DocType;
    data: any;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const goal = goalsData.find((g) => g.id === goalId);
  const requiredDocs = (goal?.required as DocType[]) || [];

  useEffect(() => {
    if (!goalId) {
      router.push('/goal');
    } else if (!consentAccepted) {
      router.push('/consent');
    }
  }, [goalId, consentAccepted, router]);

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlot) return;

    setErrorMessage(null);

    // Size check (4 MB)
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage(t('fileSizeError'));
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      setDocumentFile(activeSlot, file, objectUrl);
      setDocumentReading(activeSlot);

      // Process & compress client-side
      const { blob, fileName } = await processClientFile(file);

      // Post to /api/extract
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('docType', activeSlot);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Extraction failed');
      }

      if (res.headers.get('x-is-mock') === '1') {
        useAppStore.getState().setMockDataUsed(true);
      }

      // Check if uploaded document belongs to another required slot
      if (
        data.detectedDocType &&
        data.detectedDocType !== 'unknown' &&
        data.detectedDocType !== activeSlot &&
        requiredDocs.includes(data.detectedDocType)
      ) {
        setMismatchSuggestion({
          from: activeSlot,
          to: data.detectedDocType,
          data,
        });
      } else {
        setDocumentExtracted(activeSlot, data);
      }
    } catch (err: any) {
      if (err?.message === 'PHOTO_BLURRY') {
        setErrorMessage(t('photoBlurryError'));
        setDocumentError(activeSlot, t('photoBlurryError'));
      } else {
        setErrorMessage(err?.message || 'Failed to read document');
        setDocumentError(activeSlot, err?.message || 'Failed to read document');
      }
    } finally {
      // Clear inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const triggerUpload = (docType: DocType, isCamera: boolean) => {
    setActiveSlot(docType);
    if (isCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Check if all required documents are extracted
  const allRequiredDone =
    requiredDocs.length > 0 &&
    requiredDocs.every((d) => documents[d]?.status === 'done');

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFilePicked}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFilePicked}
      />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push('/consent')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text-main mb-6 min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-text-main">
            {t('uploadTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('uploadSubtitle')}</p>
          <p className="mt-1 text-xs text-info-fg bg-info-bg px-2.5 py-1 rounded-md inline-block">
            {t('cameraHint')}
          </p>
        </div>

        {/* Mismatch Move Suggestion Dialog */}
        {mismatchSuggestion && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl shadow-xs">
            <h4 className="font-bold text-sm text-amber-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {t('mismatchedSlotAlert')
                  .replace('{0}', t(`doc_${mismatchSuggestion.to}`))
                  .replace('{1}', t(`doc_${mismatchSuggestion.from}`))}
              </span>
            </h4>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setDocumentExtracted(mismatchSuggestion.to, mismatchSuggestion.data);
                  removeDocument(mismatchSuggestion.from);
                  setMismatchSuggestion(null);
                }}
                className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-xs hover:bg-primary-hover min-h-[40px]"
              >
                {t('moveToCorrectSlot').replace('{0}', t(`doc_${mismatchSuggestion.to}`))}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocumentExtracted(mismatchSuggestion.from, mismatchSuggestion.data);
                  setMismatchSuggestion(null);
                }}
                className="px-3 py-2 bg-background border border-border text-text-main text-xs font-bold rounded-lg hover:bg-slate-100 min-h-[40px]"
              >
                {t('keepInCurrentSlot').replace('{0}', t(`doc_${mismatchSuggestion.from}`))}
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-danger-bg text-danger-fg border border-rose-300 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload Slots */}
        <div className="space-y-4">
          {requiredDocs.map((docType) => {
            const docState = documents[docType];
            const status = docState?.status || 'empty';

            return (
              <div
                key={docType}
                className="p-5 bg-surface rounded-card border border-border shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-primary">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-base text-text-main">
                      {t(`doc_${docType}`)}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {status === 'done' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success-fg bg-success-bg px-2.5 py-1 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('slot_done')}</span>
                    </span>
                  )}
                  {status === 'reading' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-info-bg px-2.5 py-1 rounded-full border border-sky-200">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('slot_reading')}</span>
                    </span>
                  )}
                  {status === 'failed' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-danger-fg bg-danger-bg px-2.5 py-1 rounded-full border border-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{t('slot_failed')}</span>
                    </span>
                  )}
                  {status === 'empty' && (
                    <span className="text-xs text-muted font-medium">
                      {t('slot_empty')}
                    </span>
                  )}
                </div>

                {/* Specific Slot Error Message */}
                {docState?.error && (
                  <div className="mt-2 mb-3 p-2.5 bg-rose-50 border border-rose-200 text-danger-fg text-xs rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{docState.error}</span>
                  </div>
                )}

                {/* Slot Action Buttons (Min 48px tap targets) */}
                {status === 'failed' ? (
                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="button"
                      onClick={() => triggerUpload(docType, true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-primary-hover min-h-[48px] focus:ring-4 focus:ring-primary/20"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{t('retake')}</span>
                    </button>
                  </div>
                ) : status === 'empty' ? (
                  <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
                    <button
                      type="button"
                      onClick={() => triggerUpload(docType, true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-primary-hover min-h-[48px] focus:ring-4 focus:ring-primary/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{t('takePhoto')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerUpload(docType, false)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-background border border-border text-text-main text-xs font-bold rounded-xl shadow-xs hover:bg-slate-100 min-h-[48px] focus:ring-4 focus:ring-slate-200"
                    >
                      <Upload className="w-4 h-4 text-muted" />
                      <span>{t('chooseFile')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-border mt-3">
                    <div className="text-xs text-muted truncate max-w-[200px]">
                      {docState?.file?.name || 'Uploaded Document'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerUpload(docType, false)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary p-2 hover:underline min-h-[36px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t('retry')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDocument(docType)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-danger-fg p-2 hover:underline min-h-[36px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('remove')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Continue Button to S5 Review */}
        <div className="mt-8">
          <button
            type="button"
            disabled={!allRequiredDone}
            onClick={() => router.push('/review')}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold rounded-xl shadow-md transition-all min-h-[48px] ${
              allRequiredDone
                ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer focus:ring-4 focus:ring-primary/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span>{t('continue')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {!allRequiredDone && (
            <p className="text-center text-xs text-muted mt-2">
              {t('allRequiredWarning')}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
