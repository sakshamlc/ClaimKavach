import React from 'react';
import type { ReportCoverage } from '@/lib/audit/types';
import { Calculator, BookOpen, AlertCircle } from 'lucide-react';

interface CoverageMetersProps {
  coverage: ReportCoverage;
}

export function CoverageMeters({ coverage }: CoverageMetersProps) {
  const arithmeticPct =
    coverage.total > 0 ? Math.round((coverage.arithmeticChecked / coverage.total) * 100) : 0;
  const regulatoryPct =
    coverage.total > 0 ? Math.round((coverage.regulatoryChecked / coverage.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-border shadow-xs">
      {/* 1. Arithmetic Coverage Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
          <div className="flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>Arithmetic Coverage</span>
          </div>
          <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {coverage.arithmeticChecked} of {coverage.total} items ({arithmeticPct}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${arithmeticPct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted">
          Line items verified for quantity &times; unit price multiplication and grand total summation.
        </p>
      </div>

      {/* 2. Regulatory Reference Coverage Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Regulatory Coverage</span>
          </div>
          <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            {coverage.regulatoryChecked} of {coverage.total} items ({regulatoryPct}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${regulatoryPct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted">
          Line items checked against statutory NPPA drug/stent price schedules. Items in unsourced categories remain honestly unrepresented.
        </p>
      </div>
    </div>
  );
}
