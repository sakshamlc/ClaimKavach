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
        <div className="bg-card rounded-card p-4 border border-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider">Total Billed</span>
            <FileText className="w-4 h-4 text-text-muted" />
          </div>
          <div className="text-h2 font-extrabold text-navy font-mono tracking-tight mt-1">
            {formatINR(totals.billed)}
          </div>
          <div className="text-caption text-text-muted mt-2">
            Gross stated hospital charges
          </div>
        </div>

        {/* 2. Fair Amount (Neutral card with navy figure - NOT green/emerald) */}
        <div className="bg-card rounded-card p-4 border border-border shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider">Fair Amount</span>
            <CheckCircle className="w-4 h-4 text-text-muted" />
          </div>
          <div className="text-h2 font-extrabold text-navy font-mono tracking-tight mt-1">
            {formatINR(totals.fair)}
          </div>
          <div className="text-caption text-text-muted mt-2 font-medium">
            Billed minus confirmed overcharges only
          </div>
        </div>

        {/* 3. Confirmed Overcharge */}
        <div className="bg-card rounded-card p-4 border border-border shadow-card flex flex-col justify-between border-l-4 border-l-red-600">
          <div className="flex items-center justify-between text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider text-red-700">Confirmed Overcharge</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-h2 font-extrabold text-navy font-mono tracking-tight mt-1">
            {formatINR(totals.confirmed)}
          </div>
          <div className="text-caption text-text-muted mt-2">
            Verified ceilings &amp; arithmetic errors
          </div>
        </div>

        {/* 4. Likely Issues */}
        <div className="bg-card rounded-card p-4 border border-border shadow-card flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider text-amber-700">Likely Issues</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-h2 font-extrabold text-navy font-mono tracking-tight mt-1">
            {formatINR(totals.likely)}
          </div>
          <div className="text-caption text-text-muted mt-2">
            Unverified ceilings, duplicate items, bundling
          </div>
        </div>

        {/* 5. Needs Review */}
        <div className="bg-card rounded-card p-4 border border-border shadow-card flex flex-col justify-between border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between text-caption font-semibold mb-1">
            <span className="uppercase tracking-wider text-sky-700">Needs Review</span>
            <HelpCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-h2 font-extrabold text-navy font-mono tracking-tight mt-1">
            {formatINR(totals.needsReview)}
          </div>
          <div className="text-caption text-text-muted mt-2">
            Unconfirmed specifications &amp; policy clauses
          </div>
        </div>
      </div>

      {/* Secondary Scenario Line: If Likely Upheld */}
      <div className="bg-bg-secondary border border-border rounded-card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-small text-text-muted">
        <div className="flex items-center gap-2 text-navy">
          <ArrowDownRight className="w-4 h-4 text-text-muted shrink-0" />
          <span className="font-semibold">Scenario Note:</span>
          <span>
            If all likely issues are upheld upon official verification or hospital dispute:
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-text-muted text-caption">Adjusted Fair Amount:</span>
          <span className="font-bold text-navy bg-card px-2.5 py-1 rounded-chip border border-border font-mono text-small shadow-none">
            {formatINR(totals.ifLikelyUpheld)}
          </span>
        </div>
      </div>
    </div>
  );
}
