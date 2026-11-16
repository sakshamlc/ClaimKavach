'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAppStore, Language } from '@/lib/store';
import { ShieldCheck, Trash2, Sparkles } from 'lucide-react';

export function Header() {
  const { t, language, setLanguage } = useTranslation();
  const clearAllData = useAppStore((state) => state.clearAllData);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const isMockDataUsed = useAppStore((state) => state.isMockDataUsed);
  const router = useRouter();

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data and start over?')) {
      clearAllData();
      router.push('/');
    }
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'mr', label: 'मराठी' },
  ];

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-40 shadow-xs">
      {/* Top Disclaimer Banner */}
      <div className="bg-info-bg text-info-fg text-xs px-4 py-1.5 text-center font-medium border-b border-border">
        {t('disclaimer')}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-primary leading-tight font-sans">
                {t('appName')}
              </span>
              {(isDemoMode || isMockDataUsed) && (
                <span className="bg-warning-bg text-warning-fg border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('sampleDataBadge')}
                </span>
              )}
            </div>
            <p className="text-muted text-[11px] hidden sm:block leading-tight">
              {t('appTagline')}
            </p>
          </div>
        </Link>

        {/* Controls: Language Chips & Clear Data */}
        <div className="flex items-center gap-2">
          {/* Language Switcher Chips */}
          <div className="flex items-center bg-background p-1 rounded-xl border border-border">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all min-h-[32px] ${
                  language === l.code
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-main hover:bg-surface/80'
                }`}
                aria-label={`Switch to ${l.label}`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Clear Data Button (min 48px tap target accessible) */}
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger-fg bg-danger-bg hover:bg-rose-100 border border-rose-200 rounded-xl transition-all min-h-[40px] focus:ring-2 focus:ring-danger-fg"
            title={t('clearData')}
            aria-label={t('clearData')}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('clearData')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
