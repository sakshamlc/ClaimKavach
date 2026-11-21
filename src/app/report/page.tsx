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
import { claimTranslations } from '@/lib/claimI18n';
import {
  Stepper,
  Button,
  Card,
  Badge,
  Alert,
  SectionHeader,
  StickyActionBar,
  Tabs,
} from '@/components/ui';
import { AudioPlayer } from '@/components/claim/AudioPlayer';
import {
  FileText,
  Printer,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Building,
  ShieldAlert,
} from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const bill = useClaimStore((state) => state.bill);
  const report = useClaimStore((state) => state.report);
  const reportTimestamp = useClaimStore((state) => state.reportTimestamp);
  const selectedSampleKey = useClaimStore((state) => state.selectedSampleKey);
  const language = useClaimStore((state) => state.language);

  const t = claimTranslations[language] || claimTranslations.en;

  const [activeSection, setActiveSection] = useState<'report' | 'dispute'>('report');
  const [targetAudioFindingIndex, setTargetAudioFindingIndex] = useState<number | null>(null);
  const [activePlayingFindingId, setActivePlayingFindingId] = useState<string | null>(null);

  if (!bill || !report) {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col font-sans text-text">
        <Header />
        <main className="flex-1 max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-text-subtle mx-auto" />
          <h2 className="text-h2 font-bold text-text">No Audit Report Available</h2>
          <p className="text-small text-text-muted">
            Please verify your hospital bill line items and run the audit first.
          </p>
          <Button onClick={() => router.push('/upload')}>
            Go to Upload
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Format timestamp purely at presentation time
  const formattedTimestamp = reportTimestamp
    ? new Date(reportTimestamp).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col font-sans text-text pb-28 sm:pb-12">
      <Header />
      <Stepper currentStep={3} />

      <main className="flex-1 max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Print-Only Audit Header & Statutory Disclaimer */}
        <div className="hidden print:block border-b-2 border-text pb-4 mb-4 text-small space-y-2">
          <div className="flex justify-between items-center">
            <h1 className="text-h2 font-bold text-text">ClaimKavach — Medical Bill Statutory Audit Report</h1>
            <span className="text-caption font-mono">Date: {formattedTimestamp}</span>
          </div>
          <p className="text-caption text-text-muted">
            <strong>Statutory Disclaimer:</strong> ClaimKavach is an independent, open-source informational audit assistant and does not constitute legal, medical, or financial advice. Regulatory reference data has not been human-verified (docs/sources/REVIEW.json). All findings are mathematical computations derived from government gazette notifications.
          </p>
          <div className="text-[10px] text-text-subtle flex flex-wrap gap-x-4 pt-1 font-mono">
            <span>DPCO Ceilings: {report.dataVersions.nppaCeilings}</span>
            <span>Implants: {report.dataVersions.implants}</span>
            <span>IRDAI Non-Payables: {report.dataVersions.annexure1}</span>
            <span>Bundling: {report.dataVersions.roomBundling}</span>
          </div>
        </div>

        {/* Report Page Header with Action Buttons */}
        <SectionHeader
          title={t.reportTitle}
          description={`Comprehensive statutory audit for invoice #${report.billId} issued by ${bill.hospital.name || 'Hospital'}. Verified on ${formattedTimestamp} IST.`}
          badge={
            (selectedSampleKey || bill.isSynthetic) ? (
              <Badge variant="synthetic">
                {t.badgeSynthetic}
              </Badge>
            ) : undefined
          }
          action={
            <div className="flex items-center gap-2.5 print:hidden">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/verify')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                <span>{t.editItemsBtn}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                <span>{t.printReportBtn}</span>
              </Button>
            </div>
          }
        />

        {/* Audio Findings Read-Aloud Player */}
        <div className="print:hidden">
          <AudioPlayer
            report={report}
            language={language}
            targetFindingIndex={targetAudioFindingIndex}
            onClearTargetFindingIndex={() => setTargetAudioFindingIndex(null)}
            onHighlightFinding={setActivePlayingFindingId}
          />
        </div>

        {/* Top View Switcher Tabs: Report vs Dispute Pack */}
        <div className="print:hidden">
          <Tabs
            tabs={[
              { id: 'report', label: t.tabFindings, icon: <FileText className="w-4 h-4" /> },
              { id: 'dispute', label: t.tabDisputePack, icon: <Send className="w-4 h-4" /> },
            ]}
            activeTab={activeSection}
            onChange={(id) => setActiveSection(id as any)}
            ariaLabel="Switch between Audit Report and Dispute Notice Pack"
          />
        </div>

        {/* SECTION 1: Report Overview & Metrics */}
        {activeSection === 'report' && (
          <div className="space-y-6">
            {/* Unverified Reference Data Warning Callout */}
            <Alert variant="warning" title="Unverified Regulatory Reference Data Notice">
              All statutory reference data currently loaded has <code className="font-mono bg-tier-likely-bg px-1 py-0.5 rounded text-[11px]">verified: false</code> pending formal human sign-off in <code className="font-mono bg-tier-likely-bg px-1 py-0.5 rounded text-[11px]">docs/sources/REVIEW.json</code>. Under ClaimKavach Trust Zone policy, findings based on unverified regulatory datasets are strictly capped at <strong>LIKELY_ISSUE</strong> or <strong>NEEDS_REVIEW</strong> and can never produce Confirmed Overcharges.
            </Alert>

            {/* 5 Financial Metric Cards */}
            <section aria-label="Financial Breakdown Metrics">
              <MetricCards totals={report.totals} />
            </section>

            {/* 2 Coverage Breakdown Meters (Side by side desktop, stacked mobile) */}
            <section aria-label="Coverage Breakdown">
              <CoverageMeters coverage={report.coverage} />
            </section>

            {/* Statutory & Arithmetic Findings Area (Two-pane desktop, card list mobile) */}
            <section aria-label="Audit Findings List" className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-h3 font-bold text-text">
                  Statutory &amp; Arithmetic Findings ({report.findings.length})
                </h2>
                <p className="text-small text-text-muted">
                  Select each line item to review official government gazette citations, S.O. numbers, and bilingual legal explanations.
                </p>
              </div>

              <FindingsTable
                findings={report.findings}
                language={language}
                activePlayingFindingId={activePlayingFindingId}
                onPlayFinding={(idx) => {
                  setTargetAudioFindingIndex(idx);
                  setActiveSection('report');
                }}
              />
            </section>

            {/* Separate Not Checked List */}
            {report.notCheckedItems && report.notCheckedItems.length > 0 && (
              <section aria-label="Not Checked Items">
                <NotCheckedList items={report.notCheckedItems} />
              </section>
            )}

            {/* Regulatory Reference Versions Loaded Card */}
            <Card variant="muted" className="p-5 space-y-3">
              <span className="font-bold text-text block text-caption uppercase tracking-wider">
                Regulatory Reference Versions Loaded
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-caption">
                <div className="p-3 bg-surface rounded-card border border-border">
                  <span className="text-text-muted block text-[11px]">DPCO / NPPA Drugs</span>
                  <strong className="text-text font-mono text-small block mt-0.5">{report.dataVersions.nppaCeilings}</strong>
                </div>
                <div className="p-3 bg-surface rounded-card border border-border">
                  <span className="text-text-muted block text-[11px]">Coronary &amp; Knee Implants</span>
                  <strong className="text-text font-mono text-small block mt-0.5">{report.dataVersions.implants}</strong>
                </div>
                <div className="p-3 bg-surface rounded-card border border-border">
                  <span className="text-text-muted block text-[11px]">IRDAI Non-Payables</span>
                  <strong className="text-text font-mono text-small block mt-0.5">{report.dataVersions.annexure1}</strong>
                </div>
                <div className="p-3 bg-surface rounded-card border border-border">
                  <span className="text-text-muted block text-[11px]">Room Bundling Norms</span>
                  <strong className="text-text font-mono text-small block mt-0.5">{report.dataVersions.roomBundling}</strong>
                </div>
              </div>
            </Card>

            {/* Bottom Call to Action for Dispute Pack */}
            <div className="bg-soft-teal/40 border border-teal/20 rounded-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <div className="space-y-1">
                <span className="font-bold text-body text-text block">
                  {t.readyToDisputeTitle}
                </span>
                <p className="text-small text-text-muted">
                  {t.readyToDisputeDesc}
                </p>
              </div>

              <Button
                onClick={() => setActiveSection('dispute')}
                rightIcon={<Send className="w-4 h-4" />}
                className="shrink-0"
              >
                <span>{t.openDisputeBtn}</span>
              </Button>
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

      {/* MOBILE STICKY ACTION BAR */}
      <StickyActionBar>
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrint}
          leftIcon={<Printer className="w-4 h-4" />}
        >
          Print
        </Button>

        <Button
          size="sm"
          onClick={() => setActiveSection(activeSection === 'report' ? 'dispute' : 'report')}
          rightIcon={<Send className="w-4 h-4" />}
        >
          {activeSection === 'report' ? 'Dispute Pack' : 'View Report'}
        </Button>
      </StickyActionBar>

      <Footer />
    </div>
  );
}
