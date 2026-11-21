'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({
  variant = 'rect',
  className = '',
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full rounded-chip',
    rect: 'h-12 w-full rounded-card',
    circle: 'h-10 w-10 rounded-full',
  };

  return (
    <div
      className={`animate-pulse bg-border/60 ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
