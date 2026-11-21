'use client';

import React from 'react';
import Link from 'next/link';
import { Upload, CheckSquare, FileText, Check } from 'lucide-react';
import { useClaimStore } from '@/store/claimStore';

export interface StepperProps {
  currentStep: 1 | 2 | 3;
}

export function Stepper({ currentStep }: StepperProps) {
  const language = useClaimStore((state) => state.language);
  const bill = useClaimStore((state) => state.bill);
  const report = useClaimStore((state) => state.report);

  const steps = [
    {
      id: 1,
      title: language === 'hi' ? 'दस्तावेज़ अपलोड' : 'Upload Bill',
      href: '/upload',
      icon: Upload,
      isAccessible: true,
    },
    {
      id: 2,
      title: language === 'hi' ? 'सत्यापन एवं सुधार' : 'Verify & Edit',
      href: '/verify',
      icon: CheckSquare,
      isAccessible: !!bill,
    },
    {
      id: 3,
      title: language === 'hi' ? 'ऑडिट रिपोर्ट' : 'Audit Report',
      href: '/report',
      icon: FileText,
      isAccessible: !!report,
    },
  ];

  return (
    <nav
      aria-label="Audit Progress"
      className="w-full bg-surface border-b border-border py-2.5 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-content mx-auto">
        {/* Mobile View: Compact "Step X of 3" */}
        <div className="flex sm:hidden items-center justify-between text-small">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-contrast flex items-center justify-center text-caption font-bold">
              {currentStep}
            </span>
            <span className="font-bold text-text">
              {steps[currentStep - 1].title}
            </span>
          </div>
          <span className="text-caption text-text-muted font-medium">
            {language === 'hi' ? `चरण ${currentStep} / 3` : `Step ${currentStep} of 3`}
          </span>
        </div>

        {/* Desktop / Tablet View: Horizontal 3-Step Stepper */}
        <ol className="hidden sm:flex items-center justify-between w-full max-w-2xl mx-auto">
          {steps.map((step, idx) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const StepIcon = step.icon;

            const content = (
              <div className="flex items-center gap-2.5 group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 ${
                    isCompleted
                      ? 'bg-tier-valid-exclusion-bg text-tier-valid-exclusion-fg border border-tier-valid-exclusion-border'
                      : isCurrent
                      ? 'bg-primary text-primary-contrast font-bold shadow-card ring-2 ring-primary/20'
                      : 'bg-surface-subtle text-text-subtle border border-border'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <StepIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span
                    className={`text-caption uppercase tracking-wider ${
                      isCurrent
                        ? 'font-bold text-primary'
                        : isCompleted
                        ? 'font-medium text-text-muted'
                        : 'text-text-subtle'
                    }`}
                  >
                    {language === 'hi' ? `चरण ${step.id}` : `Step ${step.id}`}
                  </span>
                  <span
                    className={`text-small leading-tight ${
                      isCurrent
                        ? 'font-bold text-text'
                        : isCompleted
                        ? 'font-semibold text-text hover:text-primary'
                        : 'text-text-muted'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>
            );

            return (
              <li key={step.id} className="flex items-center gap-4 flex-1 last:flex-none">
                {step.isAccessible && !isCurrent ? (
                  <Link
                    href={step.href}
                    className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-chip"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}

                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      step.id < currentStep ? 'bg-primary/40' : 'bg-border'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
