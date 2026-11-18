'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  EyeOff,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const consentAccepted = useClaimStore((state) => state.consentAccepted);
  const setConsentAccepted = useClaimStore((state) => state.setConsentAccepted);
  const loadSample = useClaimStore((state) => state.loadSample);
  const language = useClaimStore((state) => state.language);

  const t = claimTranslations[language] || claimTranslations.en;

  const handleStart = () => {
    if (!consentAccepted) return;
    router.push('/upload');
  };

  const handleTryDemo = () => {
    setConsentAccepted(true);
    loadSample('sample1');
    router.push('/verify');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full flex flex-col items-center">
        {/* Live Reference Data Status Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-6 border border-slate-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{t.statusChipPrefix} 45 {t.statusChipSuffix}</span>
          <span className="text-slate-400">|</span>
          <span className="text-[11px] text-slate-600 font-mono">
            NPPA S.O. 5975(E), 1582(E), 1587(E), 6222(E)
          </span>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mt-2 mb-8 space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t.heroTitle}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {t.heroSubtitle}
          </p>

          {/* Consent Checkbox */}
          <div className="pt-4 max-w-lg mx-auto text-left">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-surface hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                <strong>{t.consentLabel}</strong> {t.consentText}
              </span>
            </label>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
            <button
              type="button"
              onClick={handleStart}
              disabled={!consentAccepted}
              className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold rounded-xl shadow-md transition-all min-h-[48px] ${
                consentAccepted
                  ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer focus:ring-4 focus:ring-primary/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <span>{t.startAuditBtn}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleTryDemo}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-surface hover:bg-slate-50 text-slate-800 border border-slate-300 text-base font-bold rounded-xl shadow-2xs transition-all min-h-[48px] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t.tryDemoBtn}</span>
            </button>
          </div>
        </div>

        {/* 3 Privacy & Trust Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full my-6">
          <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t.pillar1Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.pillar1Desc}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t.pillar2Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.pillar2Desc}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <EyeOff className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t.pillar3Title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.pillar3Desc}
            </p>
          </div>
        </div>

        {/* How It Works Flow */}
        <div className="w-full mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 text-center">
            {t.howItWorksTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-primary block">{t.step1Title}</span>
              <p className="text-slate-600 leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-primary block">{t.step2Title}</span>
              <p className="text-slate-600 leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-primary block">{t.step3Title}</span>
              <p className="text-slate-600 leading-relaxed">
                {t.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}