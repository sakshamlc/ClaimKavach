'use client';

import React, { useState } from 'react';
import type { AuditFinding, Verdict } from '@/lib/audit/types';
import { getReferenceDataBadge } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
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
} from 'lucide-react';

interface FindingsTableProps {
  findings: AuditFinding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | Verdict>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFindings = findings.filter((f) => {
    if (selectedFilter === 'ALL') return true;
    return f.verdict === selectedFilter;
  });

  const getVerdictStyle = (verdict: Verdict) => {
    switch (verdict) {
      case 'CONFIRMED_OVERCHARGE':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Confirmed Overcharge',
        };
      case 'LIKELY_ISSUE':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Likely Issue',
        };
      case 'NEEDS_REVIEW':
        return {
          bg: 'bg-sky-50 border-sky-200 text-sky-800',
          icon: <HelpCircle className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Needs Review',
        };
      case 'VALID_EXCLUSION':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Valid Exclusion',
        };
      case 'NOT_CHECKED':
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          icon: <Info className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Not Checked',
        };
    }
  };

  const counts: Record<string, number> = {
    ALL: findings.length,
    CONFIRMED_OVERCHARGE: findings.filter((f) => f.verdict === 'CONFIRMED_OVERCHARGE').length,
    LIKELY_ISSUE: findings.filter((f) => f.verdict === 'LIKELY_ISSUE').length,
    NEEDS_REVIEW: findings.filter((f) => f.verdict === 'NEEDS_REVIEW').length,
    VALID_EXCLUSION: findings.filter((f) => f.verdict === 'VALID_EXCLUSION').length,
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
        {(['ALL', 'CONFIRMED_OVERCHARGE', 'LIKELY_ISSUE', 'NEEDS_REVIEW', 'VALID_EXCLUSION'] as const).map(
          (tab) => {
            const count = counts[tab] || 0;
            const active = selectedFilter === tab;
            let label = tab === 'ALL' ? 'All Findings' : tab.replace(/_/g, ' ');

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="bg-surface rounded-xl p-8 text-center border border-dashed border-border text-muted text-sm">
          No findings in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding, idx) => {
            const uniqueKey = `${finding.ruleId}-${finding.itemId}-${idx}`;
            const isExpanded = !!expandedIds[uniqueKey];
            const verdictInfo = getVerdictStyle(finding.verdict);
            const refBadge = getReferenceDataBadge(finding);

            return (
              <div
                key={uniqueKey}
                className="bg-surface rounded-xl border border-border shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Finding Header Card */}
                <div
                  onClick={() => toggleExpand(uniqueKey)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Verdict Pill */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${verdictInfo.bg}`}
                      >
                        {verdictInfo.icon}
                        <span>{verdictInfo.label}</span>
                      </span>

                      {/* Rule ID */}
                      <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {finding.ruleId}
                      </span>

                      {/* Reference Verification Status Badge */}
                      {refBadge ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          <span>{refBadge}</span>
                        </span>
                      ) : finding.citation.kind === 'REGULATORY' && finding.citation.verified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Verified Reference Data</span>
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {finding.title || finding.explanation.en}
                    </h4>

                    <div className="text-xs text-muted">
                      Item ID: <span className="font-mono text-slate-700">{finding.itemId}</span>
                    </div>
                  </div>

                  {/* Amounts & Expand Toggle */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0">
                    <div className="text-right">
                      {finding.amount > 0 && (
                        <div>
                          <span className="text-[10px] text-muted uppercase font-semibold block">
                            Questioned Excess
                          </span>
                          <span className="text-base font-extrabold text-rose-600">
                            {formatINR(finding.amount)}
                          </span>
                        </div>
                      )}
                      {finding.actual !== undefined && finding.expected !== undefined && (
                        <div className="text-[11px] text-slate-500">
                          Billed: {formatINR(finding.actual)} vs Benchmark: {formatINR(finding.expected)}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Citation Drawer */}
                {isExpanded && (
                  <div className="border-t border-border bg-slate-50/70 p-4 space-y-4 text-xs text-slate-700">
                    {/* Bilingual Explanations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-900 block mb-1">
                          English Explanation:
                        </span>
                        <p className="leading-relaxed text-slate-700">{finding.explanation.en}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block mb-1">
                          हिंदी व्याख्या (Hindi Explanation):
                        </span>
                        <p className="leading-relaxed text-slate-700">{finding.explanation.hi}</p>
                      </div>
                    </div>

                    {/* Statutory Citation Details */}
                    <div className="space-y-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>Statutory Citation & Benchmark Reference</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-muted block text-[10px]">Citation Kind</span>
                          <span className="font-semibold text-slate-800">{finding.citation.kind}</span>
                        </div>

                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-muted block text-[10px]">Instrument / Gazette</span>
                          <span className="font-semibold text-slate-800">
                            {finding.citation.instrument}
                            {finding.citation.kind === 'REGULATORY' && finding.citation.instrumentNumber
                              ? ` (${finding.citation.instrumentNumber})`
                              : ''}
                          </span>
                        </div>

                        {finding.citation.kind === 'REGULATORY' && (
                          <>
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-muted block text-[10px]">Source Document</span>
                              <span className="font-mono text-slate-800">
                                {finding.citation.sourceFile || 'N/A'}
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-muted block text-[10px]">Document Reference</span>
                              <span className="text-slate-800">
                                {finding.citation.sourceRef || finding.citation.section || 'N/A'}
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-muted block text-[10px]">Effective Date</span>
                              <span className="text-slate-800">{finding.citation.effectiveDate}</span>
                            </div>

                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-muted block text-[10px]">Valid Until</span>
                              <span className="text-slate-800">
                                {finding.citation.validUntil || 'Indefinite / Current'}
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-muted block text-[10px]">GST Treatment</span>
                              <span className="text-slate-800">
                                {finding.citation.gstTreatment || 'N/A'}
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-muted block text-[10px]">Verified Status</span>
                              <span className="text-slate-800">
                                {finding.citation.verified ? 'Verified (PASS)' : 'Unverified reference data'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Suggested Dispute Action */}
                    {finding.suggestedAction && (
                      <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-lg text-emerald-900">
                        <span className="font-bold block mb-0.5">Recommended Next Step:</span>
                        <p>{finding.suggestedAction}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
