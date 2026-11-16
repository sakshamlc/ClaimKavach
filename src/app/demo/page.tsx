'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { DocType, ExtractedDocument } from '@/lib/rules/types';
import { ArrowLeft, Play, Sparkles, Tractor, GraduationCap, Building2 } from 'lucide-react';

import scenario1 from '@/fixtures/scenario-1.json';
import scenario2 from '@/fixtures/scenario-2.json';
import scenario3 from '@/fixtures/scenario-3.json';

const scenarios = [
  {
    id: 'scenario_1',
    titleKey: 'scenario1Title',
    descKey: 'scenario1Desc',
    data: scenario1,
    icon: <Tractor className="w-6 h-6 text-emerald-600" />,
  },
  {
    id: 'scenario_2',
    titleKey: 'scenario2Title',
    descKey: 'scenario2Desc',
    data: scenario2,
    icon: <GraduationCap className="w-6 h-6 text-primary" />,
  },
  {
    id: 'scenario_3',
    titleKey: 'scenario3Title',
    descKey: 'scenario3Desc',
    data: scenario3,
    icon: <Building2 className="w-6 h-6 text-indigo-600" />,
  },
];

export default function DemoPickerPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const setGoalId = useAppStore((state) => state.setGoalId);
  const setConsentAccepted = useAppStore((state) => state.setConsentAccepted);
  const setDemoMode = useAppStore((state) => state.setDemoMode);
  const setDocumentExtracted = useAppStore((state) => state.setDocumentExtracted);

  const handleSelectScenario = (sc: typeof scenarios[0]) => {
    const data = sc.data;
    setDemoMode(true, sc.id);
    setConsentAccepted(true);
    setGoalId(data.goalId as any);

    // Populate Zustand documents with pre-extracted fixture data
    for (const [docKey, docData] of Object.entries(data.documents)) {
      setDocumentExtracted(docKey as DocType, docData as unknown as ExtractedDocument);
    }

    // Direct to S5 Review (pre-filled) per demo flow
    router.push('/review');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text-main mb-6 min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        {/* Heading */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-bg text-warning-fg text-xs font-bold mb-3 border border-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Offline Demo Mode</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main">
            {t('demoPageTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {t('demoPageSubtitle')}
          </p>
        </div>

        {/* Scenarios List */}
        <div className="space-y-4">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className="p-5 bg-surface rounded-card border border-border hover:border-slate-400 transition-all shadow-xs"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-background border border-border shrink-0 mt-0.5">
                  {sc.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-text-main">
                    {t(sc.titleKey)}
                  </h2>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {t(sc.descKey)}
                  </p>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleSelectScenario(sc)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all min-h-[44px]"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{t('loadScenario')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
