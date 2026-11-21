import React from 'react';
import type { ReportTotals } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
import { Card } from '@/components/ui';
import {
  FileText,
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  ArrowDownRight,
} from 'lucide-react';

interface MetricCardsProps {
  totals: ReportTotals;
}

export function MetricCards({ totals }: MetricCardsProps) {
  return (
    <div className="space-y-4">
      {/* 5 Metric Cards Responsive Grid: 5 columns on >=1100px, 2-3 on tablet, 1-2 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Billed */}
        <div className="bg-surface rounded-card p-4 border border-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider">Total Billed</span>
            <FileText className="w-4 h-4 text-text-subtle" />
          </div>
          <div className="text-h2 font-extrabold text-text tracking-tight mt-1">
            {formatINR(totals.billed)}
          </div>
          <div className="text-caption text-text-muted mt-2">
            Gross stated hospital charges
          </div>
        </div>

        {/* 2. Fair Amount */}
        <div className="bg-tier-valid-exclusion-bg/40 rounded-card p-4 border border-tier-valid-exclusion-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-tier-valid-exclusion-fg text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider">Fair Amount</span>
            <CheckCircle className="w-4 h-4 text-tier-valid-exclusion-fg" />
          </div>
          <div className="text-h2 font-extrabold text-tier-valid-exclusion-fg tracking-tight mt-1">
            {formatINR(totals.fair)}
          </div>
          <div className="text-caption text-tier-valid-exclusion-fg mt-2 font-medium">
            Billed minus confirmed overcharges only
          </div>
        </div>

        {/* 3. Confirmed Overcharge */}
        <div className="bg-tier-confirmed-bg/40 rounded-card p-4 border border-tier-confirmed-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-tier-confirmed-fg text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider">Confirmed Overcharge</span>
            <AlertOctagon className="w-4 h-4 text-tier-confirmed-fg" />
          </div>
          <div className="text-h2 font-extrabold text-tier-confirmed-fg tracking-tight mt-1">
            {formatINR(totals.confirmed)}
          </div>
          <div className="text-caption text-tier-confirmed-fg mt-2">
            Verified ceilings &amp; arithmetic errors
          </div>
        </div>

        {/* 4. Likely Issues */}
        <div className="bg-tier-likely-bg/40 rounded-card p-4 border border-tier-likely-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-tier-likely-fg text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider">Likely Issues</span>
            <AlertTriangle className="w-4 h-4 text-tier-likely-fg" />
          </div>
          <div className="text-h2 font-extrabold text-tier-likely-fg tracking-tight mt-1">
            {formatINR(totals.likely)}
          </div>
          <div className="text-caption text-tier-likely-fg mt-2">
            Unverified ceilings, duplicate items, bundling
          </div>
        </div>

        {/* 5. Needs Review */}
        <div className="bg-tier-needs-review-bg/40 rounded-card p-4 border border-tier-needs-review-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-tier-needs-review-fg text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider">Needs Review</span>
            <HelpCircle className="w-4 h-4 text-tier-needs-review-fg" />
          </div>
          <div className="text-h2 font-extrabold text-tier-needs-review-fg tracking-tight mt-1">
            {formatINR(totals.needsReview)}
          </div>
          <div className="text-caption text-tier-needs-review-fg mt-2">
            Unconfirmed specifications &amp; policy clauses
          </div>
        </div>
      </div>

      {/* Secondary Scenario Line: If Likely Upheld */}
      <div className="bg-surface-subtle border border-border rounded-card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-small text-text-muted">
        <div className="flex items-center gap-2 text-text">
          <ArrowDownRight className="w-4 h-4 text-text-muted shrink-0" />
          <span className="font-semibold">Scenario Note:</span>
          <span>
            If all likely issues are upheld upon official verification or hospital dispute:
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-text-muted text-caption">Adjusted Fair Amount:</span>
          <span className="font-bold text-text bg-surface px-2.5 py-1 rounded-chip border border-border font-mono text-small shadow-none">
            {formatINR(totals.ifLikelyUpheld)}
          </span>
        </div>
      </div>
    </div>
  );
}
