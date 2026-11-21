'use client';

import React from 'react';

export interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyActionBar({ children, className = '' }: StickyActionBarProps) {
  return (
    <div
      className={`fixed bottom-0 inset-x-0 sm:hidden z-30 p-3 bg-surface/95 backdrop-blur-xs border-t border-border shadow-popover flex items-center justify-between gap-3 ${className}`}
    >
      {children}
    </div>
  );
}
