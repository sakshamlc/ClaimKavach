'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'interactive' | 'outline';
}

export function Card({
  children,
  variant = 'default',
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'rounded-card border transition-all duration-150 ease-out';

  const variantStyles = {
    default: 'bg-surface border-border shadow-card',
    muted: 'bg-surface-muted border-border-subtle shadow-none',
    outline: 'bg-transparent border-border shadow-none',
    interactive:
      'bg-surface border-border shadow-card hover:border-primary/50 hover:shadow-popover cursor-pointer active:scale-[0.99]',
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
