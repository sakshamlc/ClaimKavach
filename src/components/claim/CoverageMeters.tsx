'use client';

import React from 'react';
import type { ReportCoverage } from '@/lib/audit/types';
import { Meter } from '@/components/ui';
import { Calculator, BookOpen } from 'lucide-react';

interface CoverageMetersProps {
  coverage: ReportCoverage;
}

export function CoverageMeters({ coverage }: CoverageMetersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Arithmetic Coverage Meter */}
      <Meter
        label="Arithmetic Coverage"
        checkedCount={coverage.arithmeticChecked}
        totalCount={coverage.total}
        description="Line items verified for quantity × unit price multiplication and grand total summation."
        variant="success"
        icon={<Calculator className="w-4 h-4 text-tier-valid-exclusion-fg" aria-hidden="true" />}
      />

      {/* 2. Regulatory Reference Coverage Meter */}
      <Meter
        label="Regulatory Coverage"
        checkedCount={coverage.regulatoryChecked}
        totalCount={coverage.total}
        description="Line items checked against statutory NPPA drug/stent price schedules. Items in unsourced categories remain honestly unrepresented."
        variant="primary"
        icon={<BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />}
      />
    </div>
  );
}
