'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  action?: React.ReactNode;
}

export function Alert({
  variant = 'info',
  title,
  children,
  action,
  className = '',
  ...props
}: AlertProps) {
  const variantStyles = {
    info: 'bg-primary-subtle/60 text-primary border-primary/20',
    warning: 'bg-tier-likely-bg text-tier-likely-fg border-tier-likely-border',
    error: 'bg-tier-confirmed-bg text-tier-confirmed-fg border-tier-confirmed-border',
    success: 'bg-tier-valid-exclusion-bg text-tier-valid-exclusion-fg border-tier-valid-exclusion-border',
  };

  const getIcon = () => {
    const iconClass = 'w-5 h-5 shrink-0 mt-0.5';
    switch (variant) {
      case 'info':
        return <Info className={iconClass} aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className={iconClass} aria-hidden="true" />;
      case 'error':
        return <AlertCircle className={iconClass} aria-hidden="true" />;
      case 'success':
        return <CheckCircle2 className={iconClass} aria-hidden="true" />;
    }
  };

  return (
    <div
      role="alert"
      className={`p-4 rounded-card border flex items-start gap-3 text-small leading-relaxed ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {getIcon()}
      <div className="flex-1 space-y-1">
        {title && <strong className="font-bold block text-text">{title}</strong>}
        <div className="text-small opacity-95">{children}</div>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
}
