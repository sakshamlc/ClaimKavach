'use client';

import React from 'react';

export interface MeterProps {
  label: string;
  checkedCount: number;
  totalCount: number;
  description?: string;
  variant?: 'primary' | 'success';
  icon?: React.ReactNode;
}

export function Meter({
  label,
  checkedCount,
  totalCount,
  description,
  variant = 'primary',
  icon,
}: MeterProps) {
  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const barColor =
    variant === 'success'
      ? 'bg-tier-valid-exclusion-fg'
      : 'bg-primary';

  const badgeColor =
    variant === 'success'
      ? 'bg-tier-valid-exclusion-bg text-tier-valid-exclusion-fg border-tier-valid-exclusion-border'
      : 'bg-primary-subtle text-primary border-primary/20';

  return (
    <div className="bg-surface rounded-card p-4 border border-border shadow-card space-y-2.5">
      <div className="flex items-center justify-between text-small font-semibold text-text">
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={`font-mono text-caption px-2 py-0.5 rounded-chip border ${badgeColor}`}
        >
          {checkedCount} of {totalCount} items ({percentage}%)
        </span>
      </div>

      <div
        className="w-full h-2.5 bg-surface-subtle rounded-full overflow-hidden border border-border"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percentage}%`}
      >
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-200 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && <p className="text-caption text-text-muted">{description}</p>}
    </div>
  );
}
