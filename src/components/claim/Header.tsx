'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';
import { ShieldAlert, Trash2, Sparkles, Languages } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const clearAllData = useClaimStore((state) => state.clearAllData);
  const bill = useClaimStore((state) => state.bill) ?? useClaimStore.getState().bill;
  const selectedSampleKey = useClaimStore((state) => state.selectedSampleKey) ?? useClaimStore.getState().selectedSampleKey;
  const language = useClaimStore((state) => state.language);
  const setLanguage = useClaimStore((state) => state.setLanguage);

  const t = claimTranslations[language] || claimTranslations.en;

  const handleClear = () => {
    if (confirm(t.clearConfirm)) {
      clearAllData();
      router.push('/');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  return (
    <header className="border-b border-border bg-surface/95 backdrop-blur-xs sticky top-0 z-40 shadow-card">
      {/* Top Disclaimer Banner */}
      <div className="bg-primary-subtle text-primary text-caption px-4 py-1.5 text-center font-medium border-b border-border-subtle flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-tier-valid-exclusion-fg animate-pulse" />
        <span>{t.bannerMemory}</span>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-chip"
        >
          <div className="w-10 h-10 rounded-card bg-primary flex items-center justify-center text-primary-contrast shadow-card shrink-0">
            <ShieldAlert className="w-6 h-6 text-primary-contrast" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-h3 text-primary leading-tight font-sans tracking-tight">
                ClaimKavach
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-chip bg-surface-subtle text-text-muted border border-border">
                {t.badgeStatutory}
              </span>
              {(selectedSampleKey || bill?.isSynthetic) && (
                <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-chip flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                  {t.badgeSynthetic}
                </span>
              )}
            </div>
            <p className="text-text-muted text-caption hidden sm:block leading-tight mt-0.5">
              {t.appTagline}
            </p>
          </div>
        </Link>

        {/* Right Controls: Language Switcher & Clear Data */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-small font-semibold bg-surface-subtle hover:bg-surface text-text rounded-chip border border-border shadow-card transition-all duration-150 ease-out min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden cursor-pointer"
            title="Toggle English / हिंदी"
            aria-label="Toggle language between English and Hindi"
          >
            <Languages className="w-4 h-4 text-text-muted" />
            <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
          </button>

          {/* Clear Data Action */}
          {bill && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-small font-semibold text-tier-confirmed-fg hover:bg-tier-confirmed-bg bg-tier-confirmed-bg/50 border border-tier-confirmed-border rounded-chip transition-all duration-150 ease-out min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-tier-confirmed-fg focus-visible:ring-offset-2 focus-visible:outline-hidden cursor-pointer"
              title="Wipe in-memory bill data immediately"
              aria-label="Clear all bill data from memory"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.clearData}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}