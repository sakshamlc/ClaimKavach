import React from 'react';
import type { ReportTotals } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
import {
  FileText,
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  ArrowDownRight,
  Info,
} from 'lucide-react';

interface MetricCardsProps {
  totals: ReportTotals;
}

export function MetricCards({ totals }: MetricCardsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Total Billed */}
        <div className="bg-surface rounded-xl p-4 border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs font-semibold mb-1">
            <span className="uppercase tracking-wider">Total Billed</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatINR(totals.billed)}
          </div>
          <div className="text-[11px] text-muted mt-2">
            Gross stated hospital charges
          </div>
        </div>

        {/* 2. Fair Amount */}
        <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
            <span className="uppercase tracking-wider">Fair Amount</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-950 tracking-tight">
            {formatINR(totals.fair)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-2 font-medium">
            Billed minus confirmed overcharges only
          </div>
        </div>

        {/* 3. Confirmed Overcharge */}
        <div className="bg-rose-50/70 rounded-xl p-4 border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold mb-1">
            <span className="uppercase tracking-wider">Confirmed Overcharge</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-950 tracking-tight">
            {formatINR(totals.confirmed)}
          </div>
          <div className="text-[11px] text-rose-700 mt-2">
            Verified ceilings & arithmetic discrepancies
          </div>
        </div>

        {/* 4. Likely Issues */}
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
            <span className="uppercase tracking-wider">Likely Issues</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-950 tracking-tight">
            {formatINR(totals.likely)}
          </div>
          <div className="text-[11px] text-amber-700 mt-2">
            Unverified ceilings, duplicate items, bundling
          </div>
        </div>

        {/* 5. Needs Review */}
        <div className="bg-sky-50/70 rounded-xl p-4 border border-sky-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-800 text-xs font-semibold mb-1">
            <span className="uppercase tracking-wider">Needs Review</span>
            <HelpCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-950 tracking-tight">
            {formatINR(totals.needsReview)}
          </div>
          <div className="text-[11px] text-sky-700 mt-2">
            Unconfirmed specifications & policy clauses
          </div>
        </div>
      </div>

      {/* Secondary Scenario Line: If Likely Upheld */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <ArrowDownRight className="w-4 h-4 text-slate-500" />
          <span className="font-semibold">Scenario Note:</span>
          <span>
            If all likely issues are upheld upon official verification or hospital dispute:
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted">Adjusted Fair Amount:</span>
          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
            {formatINR(totals.ifLikelyUpheld)}
          </span>
        </div>
      </div>
    </div>
  );
}
