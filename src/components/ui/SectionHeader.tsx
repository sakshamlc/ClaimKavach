'use client';

import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  level?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  badge,
  level = 'h1',
  className = '',
}: SectionHeaderProps) {
  const HeadingTag = level;

  const headingClasses = {
    h1: 'text-h1 tracking-tight font-bold text-text',
    h2: 'text-h2 tracking-tight font-bold text-text',
    h3: 'text-h3 font-semibold text-text',
  };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border ${className}`}
    >
      <div className="space-y-1">
        {badge && <div className="mb-1">{badge}</div>}
        <HeadingTag className={headingClasses[level]}>{title}</HeadingTag>
        {description && (
          <p className="text-small text-text-muted max-w-prose leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">{action}</div>}
    </div>
  );
}
