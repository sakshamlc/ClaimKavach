'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { ShieldCheck, ArrowRight, Play, CheckCircle2, Lock, EyeOff, Smartphone } from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const setDemoMode = useAppStore((state) => state.setDemoMode);

  const handleStart = () => {
    setDemoMode(false);
    router.push('/goal');
  };

  const handleDemo = () => {
    router.push('/demo');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mt-4 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info-bg text-info-fg text-xs font-semibold mb-4 border border-sky-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Private • Stateless • No Login Required</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight leading-tight">
            {t('heroTitle')}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            {t('heroSubtitle')}
          </p>

          {/* Primary Action Buttons (Min 48px tap targets) */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto">
            <button
              type="button"
              onClick={handleStart}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white text-base font-bold rounded-xl shadow-md transition-all min-h-[48px] focus:ring-4 focus:ring-primary/20"
            >
              <span>{t('start')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleDemo}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-surface hover:bg-slate-50 text-text-main border border-border text-base font-bold rounded-xl shadow-xs transition-all min-h-[48px] focus:ring-4 focus:ring-slate-200"
            >
              <Play className="w-4 h-4 text-primary" />
              <span>{t('demo')}</span>
            </button>
          </div>
        </div>

        {/* 3 Privacy Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6 mb-12">
          <div className="p-5 bg-surface rounded-card border border-border flex flex-col gap-2 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-info-bg text-info-fg flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text-main text-sm mt-1">100% Stateless</h3>
            <p className="text-muted text-xs leading-relaxed">{t('privacyBullet1')}</p>
          </div>

          <div className="p-5 bg-surface rounded-card border border-border flex flex-col gap-2 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-success-bg text-success-fg flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text-main text-sm mt-1">Aadhaar Redaction</h3>
            <p className="text-muted text-xs leading-relaxed">{t('privacyBullet2')}</p>
          </div>

          <div className="p-5 bg-surface rounded-card border border-border flex flex-col gap-2 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text-main text-sm mt-1">Browser Memory Only</h3>
            <p className="text-muted text-xs leading-relaxed">{t('privacyBullet3')}</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="w-full bg-surface rounded-card border border-border p-6 shadow-xs mb-8">
          <h2 className="text-lg font-bold text-text-main mb-4">{t('howItWorksTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="font-bold text-primary text-sm">{t('step1Title')}</span>
              <p className="text-muted text-xs">{t('step1Desc')}</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-primary text-sm">{t('step2Title')}</span>
              <p className="text-muted text-xs">{t('step2Desc')}</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-primary text-sm">{t('step3Title')}</span>
              <p className="text-muted text-xs">{t('step3Desc')}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-4 text-center text-xs text-muted">
        <p>{t('disclaimer')}</p>
      </footer>
    </div>
  );
}
