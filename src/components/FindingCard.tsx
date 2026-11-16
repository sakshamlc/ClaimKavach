import React from 'react';
import { Finding, DocType } from '../lib/rules/types';
import { SeverityChip } from './SeverityChip';
import { SideBySideDiff } from './SideBySideDiff';
import { VerifyBadge } from './VerifyBadge';
import { Info } from 'lucide-react';

interface FindingCardProps {
  finding: Finding;
  t: (key: string) => string;
  currentChoice?: DocType;
  onToggleCorrectVersion?: (findingId: string, doc: DocType) => void;
}

export function FindingCard({
  finding,
  t,
  currentChoice,
  onToggleCorrectVersion,
}: FindingCardProps) {
  // Info findings (R-DBT-1 and any severity === 'info')
  // Must NOT use side-by-side diff or word-chips or red/green styling.
  // Render a neutral blue callout with translated title, one explanatory sentence, and a "What to do" line.
  if (finding.severity === 'info') {
    return (
      <div
        id={finding.id}
        className="bg-blue-50/80 border border-blue-200 rounded-card p-5 shadow-xs text-blue-950"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
            <h3 className="font-bold text-base text-blue-900">
              {t(finding.titleKey)}
            </h3>
          </div>
          <SeverityChip severity="info" />
        </div>

        <p className="text-sm text-blue-800 leading-relaxed mb-3">
          {t(finding.explanationKey)}
        </p>

        <div className="mt-3 pt-3 border-t border-blue-200/80 text-xs text-blue-900 flex items-start gap-1.5">
          <strong className="shrink-0">{t('whatToDo')}</strong>
          <span>
            {finding.ruleId === 'R-DBT-1'
              ? t('finding_dbt_what_to_do')
              : t(finding.explanationKey)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <VerifyBadge />
          <a
            href="#fix-plan"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 underline"
          >
            {t('jumpToFix')}
          </a>
        </div>
      </div>
    );
  }

  // Standard finding cards (Blocker, High, Medium, Low)
  return (
    <div
      key={finding.id}
      id={finding.id}
      className="bg-surface rounded-card border border-border p-5 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-base text-text-main">
          {t(finding.titleKey)}
        </h3>
        <SeverityChip severity={finding.severity} />
      </div>

      {/* Side-by-Side Diff */}
      <SideBySideDiff
        left={finding.left}
        right={finding.right}
        verdict={finding.verdict}
        ruleId={finding.ruleId}
      />

      {/* Why this matters */}
      <p className="text-xs text-muted mt-2 leading-relaxed">
        <strong className="text-text-main">{t('whyThisMatters')}</strong>{' '}
        {t(finding.explanationKey)}
      </p>

      {/* Which version is correct toggle */}
      {finding.left.doc !== finding.right.doc && onToggleCorrectVersion && (
        <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-text-main">
            {t('correctVersionLabel')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleCorrectVersion(finding.id, finding.left.doc)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border min-h-[36px] transition-all ${
                currentChoice === finding.left.doc
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-background text-text-main border-border hover:bg-slate-100'
              }`}
            >
              {t(`doc_${finding.left.doc}`)}
            </button>
            <button
              type="button"
              onClick={() => onToggleCorrectVersion(finding.id, finding.right.doc)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border min-h-[36px] transition-all ${
                currentChoice === finding.right.doc
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-background text-text-main border-border hover:bg-slate-100'
              }`}
            >
              {t(`doc_${finding.right.doc}`)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
