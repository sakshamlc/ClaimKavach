'use client';

import React, { useState } from 'react';
import type { AuditFinding, Verdict } from '@/lib/audit/types';
import { getReferenceDataBadge } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
import { Badge, Card, Tabs, type BadgeVariant } from '@/components/ui';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Info,
  Scale,
  Building,
  CheckCircle2,
  FileCheck,
  Volume2,
} from 'lucide-react';

interface FindingsTableProps {
  findings: AuditFinding[];
  language?: 'en' | 'hi';
  activePlayingFindingId?: string | null;
  onPlayFinding?: (index: number) => void;
}

export function FindingsTable({
  findings,
  language = 'en',
  activePlayingFindingId,
  onPlayFinding,
}: FindingsTableProps) {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | Verdict>('ALL');
  const [selectedFindingIndex, setSelectedFindingIndex] = useState<number>(0);
  const [expandedMobileKey, setExpandedMobileKey] = useState<string | null>(null);

  const filteredFindings = findings.filter((f) => {
    if (selectedFilter === 'ALL') return true;
    return f.verdict === selectedFilter;
  });

  // Ensure selected index is within bounds of filtered list
  const activeFinding = filteredFindings[selectedFindingIndex] || filteredFindings[0] || null;

  const counts: Record<string, number> = {
    ALL: findings.length,
    CONFIRMED_OVERCHARGE: findings.filter((f) => f.verdict === 'CONFIRMED_OVERCHARGE').length,
    LIKELY_ISSUE: findings.filter((f) => f.verdict === 'LIKELY_ISSUE').length,
    NEEDS_REVIEW: findings.filter((f) => f.verdict === 'NEEDS_REVIEW').length,
    VALID_EXCLUSION: findings.filter((f) => f.verdict === 'VALID_EXCLUSION').length,
  };

  const getBadgeVariant = (verdict: Verdict): BadgeVariant => {
    switch (verdict) {
      case 'CONFIRMED_OVERCHARGE':
        return 'confirmed';
      case 'LIKELY_ISSUE':
        return 'likely';
      case 'NEEDS_REVIEW':
        return 'needs-review';
      case 'VALID_EXCLUSION':
        return 'valid-exclusion';
      case 'NOT_CHECKED':
      default:
        return 'not-checked';
    }
  };

  const formatVerdictLabel = (verdict: Verdict) => {
    switch (verdict) {
      case 'CONFIRMED_OVERCHARGE':
        return 'Confirmed Overcharge';
      case 'LIKELY_ISSUE':
        return 'Likely Issue';
      case 'NEEDS_REVIEW':
        return 'Needs Review';
      case 'VALID_EXCLUSION':
        return 'Valid Exclusion';
      case 'NOT_CHECKED':
        return 'Not Checked';
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Findings', count: counts.ALL },
    { id: 'CONFIRMED_OVERCHARGE', label: 'Confirmed', count: counts.CONFIRMED_OVERCHARGE },
    { id: 'LIKELY_ISSUE', label: 'Likely Issues', count: counts.LIKELY_ISSUE },
    { id: 'NEEDS_REVIEW', label: 'Needs Review', count: counts.NEEDS_REVIEW },
    { id: 'VALID_EXCLUSION', label: 'Valid Exclusions', count: counts.VALID_EXCLUSION },
  ];

  return (
    <div className="space-y-4">
      {/* Horizontally scrollable filter tabs */}
      <Tabs
        tabs={tabs}
        activeTab={selectedFilter}
        onChange={(id) => {
          setSelectedFilter(id as any);
          setSelectedFindingIndex(0);
        }}
        ariaLabel="Filter audit findings by verdict tier"
      />

      {filteredFindings.length === 0 ? (
        <Card className="p-8 text-center border-dashed text-text-muted text-small">
          No findings in this category.
        </Card>
      ) : (
        <>
          {/* DESKTOP TWO-PANE LAYOUT (>= 1024px) */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Pane: Line Items List (Scrollable, 5 cols) */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredFindings.map((finding, idx) => {
                const isSelected = activeFinding === finding;
                const findingKey = `${finding.ruleId}-${finding.itemId}`;
                const isActivePlaying = activePlayingFindingId === findingKey;
                const refBadge = getReferenceDataBadge(finding);
                const badgeVariant = getBadgeVariant(finding.verdict);

                return (
                  <div
                    key={`${finding.ruleId}-${finding.itemId}-${idx}`}
                    id={`finding-row-${findingKey}`}
                    onClick={() => setSelectedFindingIndex(idx)}
                    className={`p-4 rounded-card border transition-all duration-150 cursor-pointer text-left select-none ${
                      isActivePlaying
                        ? 'border-teal-700 bg-soft-teal/50 shadow-popover ring-2 ring-teal-700'
                        : isSelected
                        ? 'border-teal-700 bg-soft-teal/30 shadow-card ring-2 ring-teal-700/20'
                        : 'border-border bg-card hover:bg-bg-secondary shadow-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={badgeVariant} size="sm">
                        {formatVerdictLabel(finding.verdict)}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayFinding?.(idx);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-teal-800 bg-soft-teal hover:bg-teal-700 hover:text-white rounded-chip border border-teal/30 transition-colors cursor-pointer min-h-[28px] focus-visible:ring-2 focus-visible:ring-teal-700"
                          title="Listen to this finding"
                          aria-label="Listen to this finding"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{language === 'hi' ? 'सुनें' : 'Listen'}</span>
                        </button>
                        <span className="font-mono text-caption text-text-muted font-semibold">
                          {finding.ruleId}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-small font-bold text-text truncate">
                      {finding.title || finding.explanation.en}
                    </h4>

                    <div className="flex items-center justify-between text-caption text-text-muted mt-2 pt-2 border-t border-border-subtle">
                      <span>Item: <strong className="font-mono text-text">{finding.itemId}</strong></span>
                      {finding.amount > 0 && (
                        <span className="font-bold text-tier-confirmed-fg font-mono text-small">
                          {formatINR(finding.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Pane: Evidence Panel for Selected Finding (7 cols) */}
            <div className="lg:col-span-7">
              {activeFinding && (
                <Card className="p-6 space-y-5 shadow-card sticky top-24">
                  {/* Header Row */}
                  <div className="space-y-2 pb-4 border-b border-border">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getBadgeVariant(activeFinding.verdict)}>
                        {formatVerdictLabel(activeFinding.verdict)}
                      </Badge>
                      <span className="font-mono text-caption px-2 py-0.5 rounded-chip bg-surface-subtle border border-border text-text-muted font-bold">
                        {activeFinding.ruleId}
                      </span>
                      {getReferenceDataBadge(activeFinding) ? (
                        <Badge variant="unverified">
                          {getReferenceDataBadge(activeFinding)}
                        </Badge>
                      ) : activeFinding.citation.kind === 'REGULATORY' && activeFinding.citation.verified ? (
                        <Badge variant="valid-exclusion">Verified Reference Data</Badge>
                      ) : null}
                    </div>

                    <h3 className="text-h3 font-bold text-text">
                      {activeFinding.title || activeFinding.explanation.en}
                    </h3>

                    <div className="text-caption text-text-muted">
                      Line Item ID: <span className="font-mono text-text font-bold">{activeFinding.itemId}</span>
                    </div>
                  </div>

                  {/* Billed vs Benchmark Two-Column Comparison Table */}
                  <div className="bg-surface-subtle rounded-card p-4 border border-border space-y-3">
                    <span className="text-caption font-bold text-text uppercase tracking-wider block">
                      Financial Comparison
                    </span>
                    <div className="grid grid-cols-2 gap-4 text-small">
                      <div className="p-3 bg-surface rounded-chip border border-border space-y-1">
                        <span className="text-caption text-text-muted block">Billed Charge</span>
                        <span className="text-h3 font-bold text-text font-mono">
                          {activeFinding.actual !== undefined ? formatINR(activeFinding.actual) : 'As stated'}
                        </span>
                      </div>
                      <div className="p-3 bg-surface rounded-chip border border-border space-y-1">
                        <span className="text-caption text-text-muted block">Reference Benchmark / Ceiling</span>
                        <span className="text-h3 font-bold text-navy font-mono">
                          {activeFinding.expected !== undefined ? formatINR(activeFinding.expected) : '0'}
                        </span>
                      </div>
                    </div>

                    {activeFinding.amount > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-small">
                        <span className="font-semibold text-text">Questioned Discrepancy Amount:</span>
                        <span className="font-bold text-tier-confirmed-fg font-mono text-body">
                          {formatINR(activeFinding.amount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bilingual Detailed Explanation */}
                  <div className="space-y-2">
                    <span className="text-caption font-bold text-text uppercase tracking-wider block">
                      Rule Explanation
                    </span>
                    <p className="text-small text-text leading-relaxed bg-surface p-3.5 rounded-chip border border-border">
                      {activeFinding.explanation.en}
                    </p>
                    {activeFinding.explanation.hi && (
                      <p className="text-small text-text-muted leading-relaxed bg-surface p-3.5 rounded-chip border border-border font-devanagari">
                        {activeFinding.explanation.hi}
                      </p>
                    )}
                  </div>

                  {/* Source Citation as printed */}
                  <div className="p-3.5 bg-surface-subtle/50 rounded-chip border border-border text-caption space-y-1">
                    <span className="font-bold text-text block">Official Regulatory Citation:</span>
                    <div className="text-text-muted leading-relaxed font-mono">
                      {activeFinding.citation.kind === 'REGULATORY' ? (
                        <>
                          <div>Instrument: {activeFinding.citation.instrument || 'Government Gazette'}</div>
                          {activeFinding.citation.instrumentNumber && <div>S.O. Number: {activeFinding.citation.instrumentNumber}</div>}
                          {activeFinding.citation.sourceRef && <div>Source Ref: {activeFinding.citation.sourceRef}</div>}
                        </>
                      ) : (
                        <div>Arithmetic rule: {activeFinding.citation.instrument || activeFinding.citation.section || 'Bill arithmetic reconciliation'}</div>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* MOBILE LIST OF CARDS VIEW (< 1024px) */}
          <div className="lg:hidden space-y-3">
            {filteredFindings.map((finding, idx) => {
              const uniqueKey = `${finding.ruleId}-${finding.itemId}-${idx}`;
              const findingKey = `${finding.ruleId}-${finding.itemId}`;
              const isActivePlaying = activePlayingFindingId === findingKey;
              const isExpanded = expandedMobileKey === uniqueKey;
              const refBadge = getReferenceDataBadge(finding);

              return (
                <Card
                  key={uniqueKey}
                  id={`finding-row-${findingKey}`}
                  className={`p-4 space-y-3 transition-all ${
                    isActivePlaying
                      ? 'border-teal-700 bg-soft-teal/50 shadow-popover ring-2 ring-teal-700'
                      : ''
                  }`}
                >
                  <div
                    onClick={() => setExpandedMobileKey(isExpanded ? null : uniqueKey)}
                    className="cursor-pointer space-y-2 select-none"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={getBadgeVariant(finding.verdict)} size="sm">
                        {formatVerdictLabel(finding.verdict)}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayFinding?.(idx);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-teal-800 bg-soft-teal hover:bg-teal-700 hover:text-white rounded-chip border border-teal/30 transition-colors cursor-pointer min-h-[28px] focus-visible:ring-2 focus-visible:ring-teal-700"
                          title="Listen to this finding"
                          aria-label="Listen to this finding"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{language === 'hi' ? 'सुनें' : 'Listen'}</span>
                        </button>
                        <span className="font-mono text-caption text-text-muted font-semibold">
                          {finding.ruleId}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-small font-bold text-text">
                      {finding.title || finding.explanation.en}
                    </h4>

                    <div className="flex items-center justify-between text-caption text-text-muted pt-1">
                      <span>Item: <strong className="font-mono text-text">{finding.itemId}</strong></span>
                      {finding.amount > 0 && (
                        <span className="font-bold text-tier-confirmed-fg font-mono text-small">
                          {formatINR(finding.amount)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-caption text-primary font-semibold">
                      <span>{isExpanded ? 'Hide Evidence' : 'View Evidence &amp; Citation'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Evidence on Mobile */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-border space-y-3 text-small">
                      {refBadge && (
                        <Badge variant="unverified" size="sm">
                          {refBadge}
                        </Badge>
                      )}

                      <div className="p-3 bg-surface-subtle rounded-chip border border-border space-y-2">
                        <div className="flex justify-between text-caption">
                          <span className="text-text-muted">Billed Amount:</span>
                          <span className="font-bold font-mono text-text">
                            {finding.actual !== undefined ? formatINR(finding.actual) : 'As stated'}
                          </span>
                        </div>
                        <div className="flex justify-between text-caption">
                          <span className="text-text-muted">Benchmark / Ceiling:</span>
                          <span className="font-bold font-mono text-navy">
                            {finding.expected !== undefined ? formatINR(finding.expected) : '0'}
                          </span>
                        </div>
                        {finding.amount > 0 && (
                          <div className="flex justify-between text-caption pt-1 border-t border-border-subtle">
                            <span className="font-semibold text-text">Questioned Amount:</span>
                            <span className="font-bold font-mono text-tier-confirmed-fg">
                              {formatINR(finding.amount)}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-caption text-text leading-relaxed">
                        {finding.explanation.en}
                      </p>

                      <div className="text-[11px] text-text-subtle font-mono p-2 bg-surface-subtle rounded border border-border">
                        Citation: {finding.citation.kind === 'REGULATORY' ? finding.citation.instrument : 'Arithmetic verification'}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
