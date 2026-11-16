'use client';

import React from 'react';
import { Severity } from '@/lib/rules/types';
import { AlertCircle, AlertTriangle, Info as InfoIcon, CheckCircle2 } from 'lucide-react';

interface SeverityChipProps {
  severity: Severity;
}

export function SeverityChip({ severity }: SeverityChipProps) {
  switch (severity) {
    case 'blocker':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-danger-bg text-danger-fg border border-rose-300">
          <AlertCircle className="w-3.5 h-3.5 text-danger-fg" />
          <span>BLOCKER</span>
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-warning-bg text-warning-fg border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-warning-fg" />
          <span>HIGH</span>
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          <span>MEDIUM</span>
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
          <span>LOW</span>
        </span>
      );
    case 'info':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-info-bg text-info-fg border border-sky-200">
          <InfoIcon className="w-3.5 h-3.5 text-info-fg" />
          <span>INFO</span>
        </span>
      );
  }
}
