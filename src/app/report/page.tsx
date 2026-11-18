'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { MetricCards } from '@/components/claim/MetricCards';
import { CoverageMeters } from '@/components/claim/CoverageMeters';
import { FindingsTable } from '@/components/claim/FindingsTable';
import { NotCheckedList } from '@/components/claim/NotCheckedList';
import { DisputePack } from '@/components/claim/DisputePack';
import { useClaimStore } from '@/store/claimStore';
import {
  FileText,
  ShieldAlert,
  Printer,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Building,
} from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const bill = useClaimStore((state) => state.bill);
  const report = useClaimStore((state) => state.report);
  const reportTimestamp = useClaimStore((state) => state.reportTimestamp);
  const selectedSampleKey = useClaimStore((state) => state.selectedSampleKey);

  const [activeSection, setActiveSection] = useState<'report' | 'dispute'>('report');

  if (!bill || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">No Audit Report Available</h2>
          <p className="text-sm text-slate-600">
            Please verify your hospital bill line items and run the audit first.
          </p>
          <button
            type="button"
            onClick={() => router.push('/upload')}
            className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl"
          >
            Go to Upload
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // Format timestamp purely at presentation time
  const formattedTimestamp = reportTimestamp
    ? new Date(reportTimestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Report Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                Step 3 of 3: Audit Report
              </span>
              {(selectedSampleKey || bill.isSynthetic) && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  SYNTHETIC FIXTURE
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hospital Bill Statutory & Arithmetic Audit Report
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
              <span>Bill No: <strong className="text-slate-800 font-mono">{report.billId}</strong></span>
              <span>&bull;</span>
              <span>Hospital: <strong className="text-slate-800">{bill.hospital.name}</strong></span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Generated: {formattedTimestamp} IST</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto print:hidden">
            <button
              type="button"
              onClick={() => router.push('/verify')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Edit Items</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-surface hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-300 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* View Switcher: Report vs Dispute Pack */}
        <div className="flex items-center gap-2 border-b border-border pb-2 print:hidden">
          <button
            type="button"
            onClick={() => setActiveSection('report')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSection === 'report'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Audit Findings & Coverage
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('dispute')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSection === 'dispute'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispute Notice Pack (4 Drafts)</span>
          </button>
        </div>

        {/* SECTION 1: Report Overview & Metrics */}
        {activeSection === 'report' && (
          <div className="space-y-6">
            {/* 5 Financial Metric Cards */}
            <section aria-label="Financial Breakdown Metrics">
              <MetricCards totals={report.totals} />
            </section>

            {/* Coverage Meters */}
            <section aria-label="Coverage Breakdown">
              <CoverageMeters coverage={report.coverage} />
            </section>

            {/* Findings Table */}
            <section aria-label="Audit Findings List" className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Statutory & Arithmetic Findings ({report.findings.length})
                  </h2>
                  <p className="text-xs text-muted">
                    Expand each item to review government gazette citations, S.O. numbers, and bilingual explanations.
                  </p>
                </div>
              </div>

              <FindingsTable findings={report.findings} />
            </section>

            {/* Separate Not Checked List */}
            {report.notCheckedItems && report.notCheckedItems.length > 0 && (
              <section aria-label="Not Checked Items">
                <NotCheckedList items={report.notCheckedItems} />
              </section>
            )}

            {/* Bottom Call to Action for Dispute Pack */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <div className="space-y-1">
                <span className="font-bold text-sm text-emerald-950 block">
                  Ready to dispute overcharges or arbitrary deductions?
                </span>
                <p className="text-xs text-emerald-800">
                  ClaimKavach pre-fills formal notices for hospital billing clarification, insurance company GRO representations, Bima Bharosa submissions, and Insurance Ombudsman complaints.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('dispute')}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shrink-0 shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open Dispute Notice Pack</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: Dispute Notice Pack */}
        {activeSection === 'dispute' && (
          <section aria-label="Patient Dispute Pack">
            <DisputePack bill={bill} report={report} />
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
