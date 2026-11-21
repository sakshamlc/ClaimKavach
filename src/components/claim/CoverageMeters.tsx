'use client';

import React from 'react';
import type { ReportCoverage } from '@/lib/audit/types';
import { Meter } from '@/components/ui';
import { Calculator, BookOpen, MinusCircle } from 'lucide-react';

interface CoverageMetersProps {
  coverage: ReportCoverage;
}

export function CoverageMeters({ coverage }: CoverageMetersProps) {
  const notChecked =
    coverage.notCheckedCount !== undefined
      ? coverage.notCheckedCount
      : Math.max(0, coverage.total - coverage.regulatoryChecked);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Arithmetic & Duplicate Coverage Meter */}
      <Meter
        label="Arithmetic Coverage"
        checkedCount={coverage.arithmeticChecked}
        totalCount={coverage.total}
        description={`Arithmetic and duplicate checks: ${coverage.arithmeticChecked} of ${coverage.total}. Line items verified for quantity × unit price multiplication, grand total, and duplicate charges.`}
        variant="primary"
        icon={<Calculator className="w-4 h-4 text-teal-700" aria-hidden="true" />}
      />

      {/* 2. Regulatory Reference Coverage Meter */}
      <Meter
        label="Regulatory Coverage"
        checkedCount={coverage.regulatoryChecked}
        totalCount={coverage.total}
        description={`Checked against reference data: ${coverage.regulatoryChecked} of ${coverage.total}. Line items checked against statutory NPPA drug/stent price schedules.`}
        variant="primary"
        icon={<BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />}
      />

      {/* 3. Not Checked Against Any Reference Card */}
      <div className="bg-surface rounded-card p-4 border border-border shadow-card space-y-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-small font-semibold text-text">
          <div className="flex items-center gap-2">
            <MinusCircle className="w-4 h-4 text-unverified-fg" aria-hidden="true" />
            <span>Not Checked Reference</span>
          </div>
          <span className="font-mono text-caption px-2 py-0.5 rounded-chip border bg-unverified-bg text-unverified-fg border-unverified-border font-bold">
            {notChecked} of {coverage.total} items
          </span>
        </div>

        <div className="text-body font-bold text-text">
          Not checked against any reference: {notChecked}
        </div>

        <p className="text-caption text-text-muted">
          Line items in categories without ingested price orders or reference benchmarks. See full breakdown below.
        </p>
      </div>
    </div>
  );
}
