'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Check,
  X,
  Server,
  Layers,
  FileCheck,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import nppaCeilings from '@/data/regulatory/nppaCeilings.json';
import implants from '@/data/regulatory/implants.json';
import annexure1 from '@/data/regulatory/annexure1.json';
import roomBundling from '@/data/regulatory/roomBundling.json';

const PRODUCTION_RECORD_COUNT =
  nppaCeilings.length + implants.length + annexure1.length + roomBundling.length;

export default function LandingPage() {
  const router = useRouter();
  const consentAccepted = useClaimStore((state) => state.consentAccepted);
  const setConsentAccepted = useClaimStore((state) => state.setConsentAccepted);
  const loadSample = useClaimStore((state) => state.loadSample);
  const language = useClaimStore((state) => state.language);

  const t = claimTranslations[language] || claimTranslations.en;

  const handleStart = () => {
    if (!consentAccepted) return;
    router.push('/upload');
  };

  const handleTryDemo = () => {
    setConsentAccepted(true);
    loadSample('sample1');
    router.push('/verify');
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col font-sans text-text">
      <Header />

      <main className="flex-1 w-full flex flex-col">
        {/* SECTION 1: HERO (Two-column desktop, single column mobile) */}
        <section className="bg-surface border-b border-border py-12 sm:py-16">
          <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
            {/* Status Chip (wraps cleanly on mobile, never overflows) */}
            <div className="flex justify-center lg:justify-start mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-chip bg-surface-subtle text-text text-caption font-semibold border border-border shadow-card max-w-full flex-wrap">
                <span className="w-2 h-2 rounded-full bg-unverified-fg shrink-0" />
                <span className="truncate">
                  {t.statusChipPrefix} {PRODUCTION_RECORD_COUNT} {t.statusChipSuffix}
                </span>
                <span className="text-border-strong hidden sm:inline">|</span>
                <span className="text-[11px] text-text-muted font-mono truncate">
                  NPPA S.O. 5975(E), 1582(E), 1587(E), 6222(E)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Copy & Actions */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <h1 className="text-display-mobile sm:text-display font-extrabold tracking-tight text-text leading-tight">
                  {t.heroTitle}
                </h1>

                <p className="text-body text-text-muted leading-relaxed max-w-prose mx-auto lg:mx-0">
                  {t.heroSubtitle}
                </p>

                {/* Consent Card sits directly above Primary CTA */}
                <div className="pt-2 text-left">
                  <label
                    htmlFor="landing-consent-checkbox"
                    className="flex items-start gap-3 p-4 rounded-card border border-border bg-surface-subtle/50 hover:bg-surface-subtle cursor-pointer transition-all duration-150 shadow-card"
                  >
                    <input
                      id="landing-consent-checkbox"
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded-chip border-border text-primary focus:ring-primary shrink-0"
                    />
                    <span className="text-small text-text leading-relaxed select-none">
                      <strong className="font-bold text-text">{t.consentLabel}</strong>{' '}
                      {t.consentText}
                    </span>
                  </label>
                </div>

                {/* CTAs: Side by side desktop, stacked full width mobile */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={!consentAccepted}
                    className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 text-body font-bold rounded-chip shadow-card transition-all duration-150 min-h-[48px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden ${
                      consentAccepted
                        ? 'bg-primary hover:bg-primary-hover text-primary-contrast cursor-pointer active:scale-[0.99]'
                        : 'bg-surface-subtle text-text-subtle cursor-not-allowed border border-border'
                    }`}
                  >
                    <span>{t.startAuditBtn}</span>
                    <ArrowRight className="w-5 h-5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTryDemo}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-surface hover:bg-surface-subtle text-text border border-border text-body font-bold rounded-chip shadow-card transition-all duration-150 min-h-[48px] cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden active:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{t.tryDemoBtn}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Sample Report Preview Card */}
              <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
                <div className="bg-surface rounded-card p-5 border border-border shadow-popover space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-primary" />
                      <span className="font-bold text-small text-text">
                        Audit Report Preview (Sample)
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-chip bg-amber-50 text-amber-900 border border-amber-200">
                      SYNTHETIC DATA
                    </span>
                  </div>

                  {/* 3 Metric Preview Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-muted rounded-card border border-border-subtle">
                      <span className="text-[11px] font-semibold text-text-muted block uppercase">
                        Total Billed
                      </span>
                      <span className="text-h3 font-bold text-text block mt-0.5">
                        ₹1,85,000
                      </span>
                    </div>
                    <div className="p-3 bg-tier-valid-exclusion-bg/40 rounded-card border border-tier-valid-exclusion-border">
                      <span className="text-[11px] font-semibold text-tier-valid-exclusion-fg block uppercase">
                        Fair Amount
                      </span>
                      <span className="text-h3 font-bold text-tier-valid-exclusion-fg block mt-0.5">
                        ₹1,85,000
                      </span>
                    </div>
                  </div>

                  {/* Sample Finding Row with Unverified Badge */}
                  <div className="p-3.5 bg-surface-subtle/50 rounded-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-small text-text">
                        Drug Eluting Stent (DES)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-chip bg-unverified-bg text-unverified-fg border border-unverified-border">
                        <AlertTriangle className="w-3 h-3" />
                        <span>DEMO DATA</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-caption text-text-muted">
                      <span>Billed: ₹85,000</span>
                      <span>Ceiling: ₹39,186 (S.O. 1587(E))</span>
                    </div>
                    <div className="text-[11px] font-semibold text-unverified-fg">
                      Questioned Excess: ₹45,814 (Capped at LIKELY_ISSUE)
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-caption text-text-muted pt-1">
                    <span>Coverage: 100% Arithmetic</span>
                    <span>100% In-Browser Memory</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: HOW IT WORKS (3-Step Row, stacks on mobile) */}
        <section className="bg-surface-muted py-12 sm:py-16 border-b border-border">
          <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2 max-w-prose mx-auto">
              <h2 className="text-h2 font-bold text-text tracking-tight">
                {t.howItWorksTitle}
              </h2>
              <p className="text-small text-text-muted">
                Three verifiable steps to audit charges before payment or insurer dispute.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-surface p-6 rounded-card border border-border shadow-card space-y-3">
                <div className="w-10 h-10 rounded-card bg-primary-subtle text-primary font-bold flex items-center justify-center text-body">
                  1
                </div>
                <h3 className="text-h3 font-bold text-text">{t.step1Title}</h3>
                <p className="text-small text-text-muted leading-relaxed">
                  {t.step1Desc}
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-surface p-6 rounded-card border border-border shadow-card space-y-3">
                <div className="w-10 h-10 rounded-card bg-primary-subtle text-primary font-bold flex items-center justify-center text-body">
                  2
                </div>
                <h3 className="text-h3 font-bold text-text">{t.step2Title}</h3>
                <p className="text-small text-text-muted leading-relaxed">
                  {t.step2Desc}
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-surface p-6 rounded-card border border-border shadow-card space-y-3">
                <div className="w-10 h-10 rounded-card bg-primary-subtle text-primary font-bold flex items-center justify-center text-body">
                  3
                </div>
                <h3 className="text-h3 font-bold text-text">{t.step3Title}</h3>
                <p className="text-small text-text-muted leading-relaxed">
                  {t.step3Desc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: WHAT WE CHECK / WHAT WE DON'T YET (Two-column panel, stacks on mobile) */}
        <section className="bg-surface py-12 sm:py-16 border-b border-border">
          <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2 max-w-prose mx-auto">
              <h2 className="text-h2 font-bold text-text tracking-tight">
                Honest Verification Scope
              </h2>
              <p className="text-small text-text-muted">
                Zero invented rules. Every finding cites an official gazetted instrument. Un-sourced categories remain honestly unrepresented.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: What We Check */}
              <div className="bg-tier-valid-exclusion-bg/20 rounded-panel border border-tier-valid-exclusion-border p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2 text-tier-valid-exclusion-fg font-bold text-h3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h3>What We Check Today</h3>
                </div>
                <ul className="space-y-3 text-small text-text">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-tier-valid-exclusion-fg shrink-0 mt-1" />
                    <span>
                      <strong>NPPA DPCO Drug Ceilings:</strong> Scheduled formulation statutory caps from S.O. 1582(E) and retail formulation caps from S.O. 5975(E).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-tier-valid-exclusion-fg shrink-0 mt-1" />
                    <span>
                      <strong>Coronary Stent Price Caps:</strong> Bare Metal Stents and Drug Eluting Stents statutory ceilings under S.O. 1587(E).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-tier-valid-exclusion-fg shrink-0 mt-1" />
                    <span>
                      <strong>Deterministic Arithmetic:</strong> Line item rate &times; quantity integrity and grand total sum reconciliation.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-tier-valid-exclusion-fg shrink-0 mt-1" />
                    <span>
                      <strong>Printed MRP Safeguard:</strong> Flags instances where billed rate exceeds printed MRP on bill items.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Right Column: What We Don't Yet Check */}
              <div className="bg-tier-likely-bg/20 rounded-panel border border-tier-likely-border p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2 text-tier-likely-fg font-bold text-h3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3>What We Don&apos;t Yet Check (Pending Sources)</h3>
                </div>
                <ul className="space-y-3 text-small text-text">
                  <li className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-tier-likely-fg shrink-0 mt-1" />
                    <span>
                      <strong>Knee Implants Price Tables:</strong> Extension S.O. 6222(E) is tracked, but root price tables from S.O. 5190(E) / S.O. 2668(E) are pending drop-in. Items are marked <em>NOT_CHECKED</em>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-tier-likely-fg shrink-0 mt-1" />
                    <span>
                      <strong>IRDAI Annexure-I Non-Payables:</strong> Full schedule tables are pending manual drop-in into <code>docs/sources/raw/</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-tier-likely-fg shrink-0 mt-1" />
                    <span>
                      <strong>Room Tariff Bundling Schedules:</strong> Un-sourced clinical bundling rules remain zeroed rather than guessed.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-tier-likely-fg shrink-0 mt-1" />
                    <span>
                      <strong>Subjective Medical Necessity:</strong> ClaimKavach never judges clinical appropriateness or doctor prescriptions.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: TWO-ZONE TRUST ARCHITECTURE DIAGRAM (Stacks on mobile) */}
        <section className="bg-surface-muted py-12 sm:py-16">
          <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2 max-w-prose mx-auto">
              <h2 className="text-h2 font-bold text-text tracking-tight">
                Two-Zone Trust Architecture
              </h2>
              <p className="text-small text-text-muted">
                Strict physical isolation between probabilistic OCR extraction and deterministic statutory audit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Zone 1: Client Trust Zone */}
              <div className="bg-surface p-6 sm:p-8 rounded-panel border-2 border-primary/30 shadow-card space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-caption uppercase font-bold tracking-wider px-2.5 py-1 rounded-chip bg-primary-subtle text-primary border border-primary/20">
                      Zone 1: Pure Client Trust Zone
                    </span>
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-h3 font-bold text-text">
                    In-Browser Memory & Deterministic Rules
                  </h3>
                  <p className="text-small text-text-muted leading-relaxed">
                    Runs 100% inside your browser runtime. The mathematical audit engine uses exact integer paise arithmetic. No data is stored, cached, or written to disk.
                  </p>
                </div>

                <div className="pt-4 border-t border-border grid grid-cols-2 gap-3 text-caption font-mono text-text-muted">
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Zero Server Database
                  </div>
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Integer Paise Math
                  </div>
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Ephemeral State
                  </div>
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Client Gazette Audit
                  </div>
                </div>
              </div>

              {/* Zone 2: Serverless Extraction Zone */}
              <div className="bg-surface p-6 sm:p-8 rounded-panel border border-border shadow-card space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-caption uppercase font-bold tracking-wider px-2.5 py-1 rounded-chip bg-surface-subtle text-text-muted border border-border">
                      Zone 2: Ephemeral Extraction Route
                    </span>
                    <Server className="w-5 h-5 text-text-muted" />
                  </div>
                  <h3 className="text-h3 font-bold text-text">
                    Multimodal Structured OCR (/api/extract)
                  </h3>
                  <p className="text-small text-text-muted leading-relaxed">
                    Uses Google Gemini solely to read invoice line items into structured JSON fields. Emits <code>Cache-Control: no-store</code>, enforces magic byte validation, and discards all data after the response.
                  </p>
                </div>

                <div className="pt-4 border-t border-border grid grid-cols-2 gap-3 text-caption font-mono text-text-muted">
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Cache-Control: no-store
                  </div>
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Rate-Limited IP Window
                  </div>
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Zero Body Logging
                  </div>
                  <div className="bg-surface-muted p-2 rounded-chip border border-border">
                    &bull; Strict 4MB Payload Cap
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
