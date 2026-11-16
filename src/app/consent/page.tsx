'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { Shield, Lock, EyeOff, Trash2, ArrowLeft, ArrowRight, Edit3 } from 'lucide-react';

export default function ConsentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const goalId = useAppStore((state) => state.goalId);
  const consentAccepted = useAppStore((state) => state.consentAccepted);
  const setConsentAccepted = useAppStore((state) => state.setConsentAccepted);

  const [agreed, setAgreed] = useState(consentAccepted);

  useEffect(() => {
    if (!goalId) {
      router.push('/goal');
    }
  }, [goalId, router]);

  const handleContinue = () => {
    if (!agreed) return;
    setConsentAccepted(true);
    router.push('/upload');
  };

  const handleManualEntry = () => {
    setConsentAccepted(true);
    router.push('/review');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-xl mx-auto px-4 py-8 w-full">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push('/goal')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text-main mb-6 min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        <div className="p-6 bg-surface rounded-card border border-border shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Shield className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-extrabold text-text-main">
            {t('consentTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {t('consentLead')}
          </p>

          {/* 3 Clear Points */}
          <div className="mt-5 space-y-3.5">
            <div className="flex items-start gap-3 p-3 bg-background rounded-xl border border-border text-xs text-text-main">
              <EyeOff className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{t('consentPoint1')}</span>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background rounded-xl border border-border text-xs text-text-main">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{t('consentPoint2')}</span>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background rounded-xl border border-border text-xs text-text-main">
              <Trash2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{t('consentPoint3')}</span>
            </div>
          </div>

          {/* Consent Checkbox (48px tap container) */}
          <label className="mt-6 flex items-start gap-3 p-3 rounded-xl border border-border bg-slate-50 cursor-pointer select-none hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer shrink-0"
            />
            <span className="text-xs font-semibold text-text-main leading-snug">
              {t('consentCheckbox')}
            </span>
          </label>

          {/* Primary Continue Button (Min 48px tap target) */}
          <button
            type="button"
            disabled={!agreed}
            onClick={handleContinue}
            className={`mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold rounded-xl shadow-md transition-all min-h-[48px] ${
              agreed
                ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer focus:ring-4 focus:ring-primary/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span>{t('continue')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Skip / Manual Entry fallback */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleManualEntry}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline p-2 min-h-[44px]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('manualEntryLink')}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
