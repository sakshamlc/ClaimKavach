'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Navigation Tabs',
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-1.5 p-1 bg-surface-subtle border border-border rounded-card overflow-x-auto no-scrollbar scroll-smooth"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-small font-semibold rounded-chip whitespace-nowrap transition-all duration-150 ease-out min-h-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-hidden ${
              isActive
                ? 'bg-surface text-text shadow-card font-bold border border-border'
                : 'text-text-muted hover:text-text hover:bg-surface/50 border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-caption px-1.5 py-0.5 rounded-full font-mono ${
                  isActive
                    ? 'bg-primary text-primary-contrast'
                    : 'bg-border text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
