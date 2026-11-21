'use client';

import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  MinusCircle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export type BadgeVariant =
  | 'confirmed'
  | 'likely'
  | 'needs-review'
  | 'valid-exclusion'
  | 'not-checked'
  | 'unverified'
  | 'synthetic'
  | 'neutral'
  | 'primary';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'neutral',
  showIcon = true,
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-semibold leading-tight',
    md: 'text-caption px-2.5 py-1 gap-1.5 font-bold leading-normal',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    confirmed: 'bg-tier-confirmed-bg text-tier-confirmed-fg border border-tier-confirmed-border',
    likely: 'bg-tier-likely-bg text-tier-likely-fg border border-tier-likely-border',
    'needs-review':
      'bg-tier-needs-review-bg text-tier-needs-review-fg border border-tier-needs-review-border',
    'valid-exclusion':
      'bg-tier-valid-exclusion-bg text-tier-valid-exclusion-fg border border-tier-valid-exclusion-border',
    'not-checked':
      'bg-tier-not-checked-bg text-tier-not-checked-fg border border-tier-not-checked-border',
    unverified: 'bg-unverified-bg text-unverified-fg border border-unverified-border',
    synthetic: 'bg-amber-50 text-amber-900 border border-amber-200',
    neutral: 'bg-surface-subtle text-text-muted border border-border',
    primary: 'bg-primary-subtle text-primary border border-primary/20',
  };

  const getIcon = () => {
    if (!showIcon) return null;
    const iconClass = size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';

    switch (variant) {
      case 'confirmed':
        return <AlertOctagon className={iconClass} aria-hidden="true" />;
      case 'likely':
        return <AlertTriangle className={iconClass} aria-hidden="true" />;
      case 'needs-review':
        return <HelpCircle className={iconClass} aria-hidden="true" />;
      case 'valid-exclusion':
        return <CheckCircle2 className={iconClass} aria-hidden="true" />;
      case 'not-checked':
        return <MinusCircle className={iconClass} aria-hidden="true" />;
      case 'unverified':
        return <ShieldAlert className={iconClass} aria-hidden="true" />;
      case 'synthetic':
        return <Sparkles className={iconClass} aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-chip select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {getIcon()}
      <span>{children}</span>
    </span>
  );
}
