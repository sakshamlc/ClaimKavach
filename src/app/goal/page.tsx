'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { GoalId } from '@/lib/rules/types';
import goalsData from '@/data/goals.json';
import {
  Tractor,
  GraduationCap,
  CreditCard,
  Building2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const iconMap: Record<GoalId, React.ReactNode> = {
  pm_kisan_payment: <Tractor className="w-6 h-6 text-emerald-600" />,
  scholarship_application: <GraduationCap className="w-6 h-6 text-primary" />,
  pan_aadhaar_link: <CreditCard className="w-6 h-6 text-amber-600" />,
  bank_kyc: <Building2 className="w-6 h-6 text-indigo-600" />,
};

export default function GoalSelectPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const setGoalId = useAppStore((state) => state.setGoalId);
  const selectedGoalId = useAppStore((state) => state.goalId);

  const handleSelectGoal = (id: GoalId) => {
    setGoalId(id);
    router.push('/consent');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        {/* Navigation / Back */}
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main">
            {t('goalSelectTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted">{t('goalSelectSubtitle')}</p>
        </div>

        {/* 4 Goal Cards (Min 48px tap targets, accessible) */}
        <div className="space-y-3.5">
          {goalsData.map((goal) => {
            const isSelected = selectedGoalId === goal.id;
            const icon = iconMap[goal.id as GoalId];

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => handleSelectGoal(goal.id as GoalId)}
                className={`w-full text-left p-4 sm:p-5 rounded-card border transition-all flex items-start gap-4 min-h-[72px] focus:ring-4 focus:ring-primary/20 ${
                  isSelected
                    ? 'bg-surface border-primary shadow-md ring-2 ring-primary/10'
                    : 'bg-surface border-border hover:border-slate-400 hover:shadow-xs'
                }`}
                aria-label={t(goal.labelKey)}
              >
                <div className="p-3 rounded-xl bg-background border border-border shrink-0 mt-0.5">
                  {icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-text-main">
                      {t(goal.labelKey)}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {t(goal.descKey)}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {goal.required.map((doc) => (
                      <span
                        key={doc}
                        className="text-[10px] font-semibold bg-background border border-border text-slate-600 px-2 py-0.5 rounded-md"
                      >
                        {t(`doc_${doc}`)}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
