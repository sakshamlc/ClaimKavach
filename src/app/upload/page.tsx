'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';
import { processPdfOrImage } from '@/lib/pdfBatcher';
import { toMedicalBill } from '@/lib/extract/toMedicalBill';
import {
  Stepper,
  Button,
  Card,
  Badge,
  Alert,
  SectionHeader,
} from '@/components/ui';
import {
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Receipt,
  FileCheck,
  Calendar,
  Layers,
  Key,
  Camera,
  Trash2,
  ChevronDown,
  ChevronUp,
  Percent,
  Building,
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const consentAccepted = useClaimStore((state) => state.consentAccepted);
  const setBill = useClaimStore((state) => state.setBill);
  const loadSample = useClaimStore((state) => state.loadSample);
  const selectedSampleKey = useClaimStore((state) => state.selectedSampleKey);
  const bill = useClaimStore((state) => state.bill);
  const language = useClaimStore((state) => state.language);
  const tpaSettlement = useClaimStore((state) => state.tpaSettlement);
  const tpaFileName = useClaimStore((state) => state.tpaFileName);
  const setTpaSettlement = useClaimStore((state) => state.setTpaSettlement);
  const clearAllData = useClaimStore((state) => state.clearAllData);

  const t = claimTranslations[language] || claimTranslations.en;

  // Policy options local state
  const policyInputs = useClaimStore((state) => state.policyInputs);
  const setPolicyInputs = useClaimStore((state) => state.setPolicyInputs);

  // GST options local state
  const billedPriceIncludesGst = useClaimStore((state) => state.billedPriceIncludesGst);
  const gstRatePct = useClaimStore((state) => state.gstRatePct);
  const setGstOptions = useClaimStore((state) => state.setGstOptions);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tpaError, setTpaError] = useState<string | null>(null);
  const [isProcessingBill, setIsProcessingBill] = useState(false);
  const [isProcessingTpa, setIsProcessingTpa] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [partialWarnings, setPartialWarnings] = useState<string[] | null>(null);

  // Collapsible sections state for desktop right column
  const [openGst, setOpenGst] = useState(true);
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openApiKey, setOpenApiKey] = useState(false);

  // Custom Gemini Key state
  const [userGeminiKey, setUserGeminiKey] = useState<string>('');
  const [rememberKey, setRememberKey] = useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('claimkavach_gemini_key');
      const session = sessionStorage.getItem('claimkavach_gemini_key');
      if (local) {
        setUserGeminiKey(local);
        setRememberKey(true);
      } else if (session) {
        setUserGeminiKey(session);
        setRememberKey(false);
      }
    }
  }, []);

  const handleKeyChange = (val: string, remember: boolean) => {
    setUserGeminiKey(val);
    setRememberKey(remember);
    if (typeof window !== 'undefined') {
      if (!val.trim()) {
        localStorage.removeItem('claimkavach_gemini_key');
        sessionStorage.removeItem('claimkavach_gemini_key');
      } else if (remember) {
        localStorage.setItem('claimkavach_gemini_key', val.trim());
        sessionStorage.removeItem('claimkavach_gemini_key');
      } else {
        sessionStorage.setItem('claimkavach_gemini_key', val.trim());
        localStorage.removeItem('claimkavach_gemini_key');
      }
    }
  };

  const formatUserFacingError = (err: any): string => {
    const msg = err?.message || String(err);
    if (msg.includes('BAD_TYPE')) {
      return 'Unsupported or corrupted file format. Please upload a clear PDF or image (JPEG, PNG, WebP) of your hospital bill.';
    }
    if (msg.includes('TOO_LARGE')) {
      return 'The uploaded document exceeds the 4 MB limit. Please split multi-page documents or compress the file.';
    }
    if (msg.includes('RATE_LIMIT')) {
      return 'Rate limit reached. Please wait a minute before attempting another extraction.';
    }
    if (msg.includes('CONFIG_ERROR')) {
      return 'Gemini API key is not configured on the server. Please enter your personal Gemini API key in the configuration section to proceed.';
    }
    if (msg.includes('SCHEMA_FAIL')) {
      return 'Could not cleanly parse line items from this document. Please ensure the document is clear, or use manual entry/sample bills.';
    }
    if (msg.includes('UPSTREAM') || msg.includes('GoogleGenAI') || msg.includes('Gemini')) {
      return 'Upstream AI extraction service temporarily unavailable or rejected the request. Please check your API key or retry.';
    }
    return 'Extraction failed. Please verify your document is an itemized hospital bill or try one of the synthetic sample bills.';
  };

  const handleSelectSample = (key: 'sample1' | 'sample2' | 'sample3') => {
    loadSample(key);
    setUploadError(null);
    setPartialWarnings(null);
  };

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingBill(true);
    setUploadError(null);
    setPartialWarnings(null);
    setProgressStatus('Reading document...');

    try {
      const extractedData = await processPdfOrImage(file, {
        docType: 'hospital_bill',
        apiKey: userGeminiKey.trim() || undefined,
        onProgress: (_step, _total, status) => setProgressStatus(status),
      });

      if (extractedData.warnings && extractedData.warnings.length > 0) {
        setPartialWarnings(extractedData.warnings);
      }

      const domainBill = toMedicalBill(extractedData);
      setBill(domainBill, file.name);
      setProgressStatus(null);
    } catch (err: any) {
      console.error('File extraction error');
      setUploadError(formatUserFacingError(err));
    } finally {
      setIsProcessingBill(false);
      setProgressStatus(null);
    }
  };

  const handleTpaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingTpa(true);
    setTpaError(null);

    try {
      const extractedData = await processPdfOrImage(file, {
        docType: 'tpa_settlement',
        apiKey: userGeminiKey.trim() || undefined,
      });

      setTpaSettlement(extractedData, file.name);
    } catch (err: any) {
      console.error('TPA extraction error');
      setTpaError(formatUserFacingError(err));
    } finally {
      setIsProcessingTpa(false);
    }
  };

  const handleProceed = () => {
    if (!bill) {
      setUploadError('Please select a synthetic sample bill or upload a hospital invoice first.');
      return;
    }
    router.push('/verify');
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col font-sans text-text">
      <Header />
      <Stepper currentStep={1} />

      <main className="flex-1 max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Page Header */}
        <SectionHeader
          title={t.uploadTitle}
          description={t.uploadSubtitle}
          action={
            <Button
              onClick={handleProceed}
              disabled={!bill}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Verify
            </Button>
          }
        />

        {/* Section 1: Synthetic Sample Bills (One-Click Testing) */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-700" />
              <h2 className="text-h3 font-bold text-text">
                {t.samplesSectionTitle}
              </h2>
            </div>
            <Badge variant="synthetic">
              {t.samplesZeroUpload}
            </Badge>
          </div>

          <p className="text-small text-text-muted max-w-prose leading-relaxed">
            {t.samplesDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sample 1: Stent */}
            <button
              type="button"
              onClick={() => handleSelectSample('sample1')}
              className={`p-4 rounded-card border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden ${
                selectedSampleKey === 'sample1'
                  ? 'border-primary bg-primary-subtle/50 shadow-card ring-2 ring-primary/20'
                  : 'border-border bg-surface hover:bg-surface-subtle shadow-card'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="synthetic" size="sm">Sample 1</Badge>
                  {selectedSampleKey === 'sample1' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <h3 className="text-small font-bold text-text">{t.sample1Title}</h3>
                <p className="text-caption text-text-muted mt-1 leading-relaxed">
                  {t.sample1Desc}
                </p>
              </div>
              <span className="text-[11px] font-mono text-text-subtle pt-2 border-t border-border-subtle block">
                Tests: R-NPPA-01 Ceiling Rule
              </span>
            </button>

            {/* Sample 2: Bundling & TPA */}
            <button
              type="button"
              onClick={() => handleSelectSample('sample2')}
              className={`p-4 rounded-card border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden ${
                selectedSampleKey === 'sample2'
                  ? 'border-primary bg-primary-subtle/50 shadow-card ring-2 ring-primary/20'
                  : 'border-border bg-surface hover:bg-surface-subtle shadow-card'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="primary" size="sm">Sample 2</Badge>
                  {selectedSampleKey === 'sample2' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <h3 className="text-small font-bold text-text">{t.sample2Title}</h3>
                <p className="text-caption text-text-muted mt-1 leading-relaxed">
                  {t.sample2Desc}
                </p>
              </div>
              <span className="text-[11px] font-mono text-text-subtle pt-2 border-t border-border-subtle block">
                Tests: R-BUNDLE-01 &amp; R-ANX-01
              </span>
            </button>

            {/* Sample 3: Clean */}
            <button
              type="button"
              onClick={() => handleSelectSample('sample3')}
              className={`p-4 rounded-card border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden ${
                selectedSampleKey === 'sample3'
                  ? 'border-primary bg-primary-subtle/50 shadow-card ring-2 ring-primary/20'
                  : 'border-border bg-surface hover:bg-surface-subtle shadow-card'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="valid-exclusion" size="sm">Sample 3</Badge>
                  {selectedSampleKey === 'sample3' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <h3 className="text-small font-bold text-text">{t.sample3Title}</h3>
                <p className="text-caption text-text-muted mt-1 leading-relaxed">
                  {t.sample3Desc}
                </p>
              </div>
              <span className="text-[11px] font-mono text-text-subtle pt-2 border-t border-border-subtle block">
                Tests: Zero-Findings Clean Path
              </span>
            </button>
          </div>
        </Card>

        {/* Two-Column Responsive Layout: Left = Uploads, Right = Configuration Options */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Upload Zones) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hospital Bill Upload Card */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <h2 className="text-h3 font-bold text-text">
                    {t.uploadBillTitle}
                  </h2>
                </div>
                <span className="text-caption font-semibold px-2 py-0.5 rounded-chip bg-primary-subtle text-primary border border-primary/20">
                  Required
                </span>
              </div>

              {/* Bill Loaded Filled State */}
              {bill && !selectedSampleKey ? (
                <div className="p-4 rounded-card bg-surface-subtle border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-chip bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-small text-text block truncate">
                        {bill.hospital.name || 'Hospital Bill'}
                      </span>
                      <span className="text-caption text-text-muted block">
                        {bill.items.length} line items extracted
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearAllData()}
                    className="p-2 text-text-muted hover:text-tier-confirmed-fg rounded-chip transition-colors focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Remove bill and clear memory"
                    aria-label="Remove uploaded hospital bill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Empty Dropzone State */
                <div className="border-2 border-dashed border-border rounded-card p-6 text-center hover:bg-surface-subtle/50 transition-colors focus-within:ring-2 focus-within:ring-primary">
                  <input
                    type="file"
                    id="bill-upload"
                    accept=".pdf,image/*"
                    onChange={handleBillUpload}
                    className="hidden"
                    disabled={isProcessingBill}
                  />
                  <input
                    type="file"
                    id="bill-camera-upload"
                    accept="image/*"
                    capture="environment"
                    onChange={handleBillUpload}
                    className="hidden"
                    disabled={isProcessingBill}
                  />

                  <label
                    htmlFor="bill-upload"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2 select-none"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary-subtle text-primary flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-body font-bold text-primary">
                      {isProcessingBill ? progressStatus || 'Processing document...' : t.uploadBillBoxLabel}
                    </span>
                    <span className="text-caption text-text-muted max-w-xs">
                      {t.uploadBillBoxSub}
                    </span>
                  </label>

                  {/* Mobile Camera Capture Button */}
                  <div className="pt-4 sm:hidden">
                    <label
                      htmlFor="bill-camera-upload"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface text-text font-semibold text-small rounded-chip border border-border shadow-card cursor-pointer min-h-[44px]"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      <span>Take Photo / Camera</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Progress Area for Multi-page processing */}
              {isProcessingBill && (
                <div className="p-3 bg-primary-subtle/50 border border-primary/20 rounded-chip space-y-1.5 animate-pulse">
                  <div className="flex justify-between text-caption font-semibold text-primary">
                    <span>{progressStatus || 'Extracting document...'}</span>
                    <span>Working</span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-2/3 rounded-full animate-pulse" />
                  </div>
                </div>
              )}

              {/* Shared Alert Component for Errors */}
              {uploadError && (
                <Alert variant="error" title="Extraction Notice">
                  {uploadError}
                </Alert>
              )}

              {partialWarnings && partialWarnings.length > 0 && (
                <Alert variant="warning" title="Partial Extraction Notice">
                  <ul className="list-disc pl-4 space-y-0.5 text-caption mt-1">
                    {partialWarnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Card>

            {/* Optional TPA Settlement Sheet Upload Card */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <h2 className="text-h3 font-bold text-text">
                    {t.uploadTpaTitle}
                  </h2>
                </div>
                <span className="text-caption font-semibold px-2 py-0.5 rounded-chip bg-surface-subtle text-text-muted border border-border">
                  Optional
                </span>
              </div>

              {tpaFileName ? (
                <div className="p-4 rounded-card bg-surface-subtle border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-chip bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-small text-text block truncate">
                        {tpaFileName}
                      </span>
                      <span className="text-caption text-text-muted block">
                        TPA deduction schedule loaded
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTpaSettlement(null, undefined)}
                    className="p-2 text-text-muted hover:text-tier-confirmed-fg rounded-chip transition-colors focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Remove TPA settlement"
                    aria-label="Remove TPA settlement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-card p-5 text-center hover:bg-surface-subtle/50 transition-colors focus-within:ring-2 focus-within:ring-primary">
                  <input
                    type="file"
                    id="tpa-upload"
                    accept=".pdf,image/*"
                    onChange={handleTpaUpload}
                    className="hidden"
                    disabled={isProcessingTpa}
                  />
                  <label
                    htmlFor="tpa-upload"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2 select-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-subtle text-primary flex items-center justify-center">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="text-small font-bold text-primary">
                      {isProcessingTpa ? 'Reading TPA settlement...' : t.uploadTpaBoxLabel}
                    </span>
                    <span className="text-caption text-text-muted max-w-xs">
                      {t.uploadTpaBoxSub}
                    </span>
                  </label>
                </div>
              )}

              {tpaError && (
                <Alert variant="error" title="TPA Extraction Notice">
                  {tpaError}
                </Alert>
              )}
            </Card>
          </div>

          {/* Right Column (Collapsible Options) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. GST Configuration Option */}
            <Card className="p-5 space-y-3">
              <button
                type="button"
                onClick={() => setOpenGst(!openGst)}
                className="w-full flex items-center justify-between text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-chip min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <h3 className="text-small font-bold text-text">
                    {t.gstSectionTitle}
                  </h3>
                </div>
                {openGst ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
              </button>

              {openGst && (
                <div className="space-y-3 pt-2 border-t border-border-subtle">
                  <p className="text-caption text-text-muted leading-relaxed">
                    {t.gstSectionDesc}
                  </p>

                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-card border cursor-pointer transition-all text-small ${
                        billedPriceIncludesGst === false
                          ? 'border-primary bg-primary-subtle/40 text-text font-bold'
                          : 'border-border text-text hover:bg-surface-subtle'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gstInclusion"
                        checked={billedPriceIncludesGst === false}
                        onChange={() => setGstOptions(false, null)}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="block font-semibold">{t.gstExcludes}</span>
                        <span className="text-caption text-text-muted font-normal">
                          {t.gstExcludesSub}
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-card border cursor-pointer transition-all text-small ${
                        billedPriceIncludesGst === true
                          ? 'border-primary bg-primary-subtle/40 text-text font-bold'
                          : 'border-border text-text hover:bg-surface-subtle'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gstInclusion"
                        checked={billedPriceIncludesGst === true}
                        onChange={() => setGstOptions(true, gstRatePct || 5)}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="block font-semibold">{t.gstIncludes}</span>
                        <span className="text-caption text-text-muted font-normal">
                          {t.gstIncludesSub}
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-card border cursor-pointer transition-all text-small ${
                        billedPriceIncludesGst === null
                          ? 'border-primary bg-primary-subtle/40 text-text font-bold'
                          : 'border-border text-text hover:bg-surface-subtle'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gstInclusion"
                        checked={billedPriceIncludesGst === null}
                        onChange={() => setGstOptions(null, null)}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="block font-semibold">{t.gstUnknown}</span>
                        <span className="text-caption text-text-muted font-normal">
                          {t.gstUnknownSub}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </Card>

            {/* 2. Insurance Policy Terms Option */}
            <Card className="p-5 space-y-3">
              <button
                type="button"
                onClick={() => setOpenPolicy(!openPolicy)}
                className="w-full flex items-center justify-between text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-chip min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  <h3 className="text-small font-bold text-text">
                    {t.policySectionTitle}
                  </h3>
                </div>
                {openPolicy ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
              </button>

              {openPolicy && (
                <div className="space-y-3 pt-2 border-t border-border-subtle text-small">
                  <p className="text-caption text-text-muted leading-relaxed">
                    {t.policySectionDesc}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="sum-insured-input" className="block text-caption font-semibold text-text mb-1">
                        {t.policySumInsuredLabel}
                      </label>
                      <input
                        id="sum-insured-input"
                        type="number"
                        placeholder="e.g. 500000"
                        value={policyInputs.sumInsuredRupees ?? ''}
                        onChange={(e) =>
                          setPolicyInputs({
                            sumInsuredRupees: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 text-small border border-border rounded-input focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="room-cap-input" className="block text-caption font-semibold text-text mb-1">
                          {t.policyRoomCapLabel}
                        </label>
                        <input
                          id="room-cap-input"
                          type="number"
                          placeholder="e.g. 5000"
                          value={policyInputs.roomRentLimitRupees ?? ''}
                          onChange={(e) =>
                            setPolicyInputs({
                              roomRentLimitRupees: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full px-3 py-2 text-small border border-border rounded-input focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label htmlFor="copay-input" className="block text-caption font-semibold text-text mb-1">
                          {t.policyCopayLabel}
                        </label>
                        <input
                          id="copay-input"
                          type="number"
                          placeholder="e.g. 10"
                          value={policyInputs.copayPercent ?? ''}
                          onChange={(e) =>
                            setPolicyInputs({
                              copayPercent: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full px-3 py-2 text-small border border-border rounded-input focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="room-days-input" className="block text-caption font-semibold text-text mb-1">
                          {t.policyRoomDaysLabel}
                        </label>
                        <input
                          id="room-days-input"
                          type="number"
                          placeholder="e.g. 3"
                          value={policyInputs.roomDays ?? ''}
                          onChange={(e) =>
                            setPolicyInputs({
                              roomDays: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full px-3 py-2 text-small border border-border rounded-input focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label htmlFor="billed-rate-input" className="block text-caption font-semibold text-text mb-1">
                          {t.policyBilledRateLabel}
                        </label>
                        <input
                          id="billed-rate-input"
                          type="number"
                          placeholder="e.g. 8000"
                          value={policyInputs.billedRoomRateRupees ?? ''}
                          onChange={(e) =>
                            setPolicyInputs({
                              billedRoomRateRupees: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full px-3 py-2 text-small border border-border rounded-input focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* 3. Custom Google Gemini API Key Option */}
            <Card className="p-5 space-y-3">
              <button
                type="button"
                onClick={() => setOpenApiKey(!openApiKey)}
                className="w-full flex items-center justify-between text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-chip min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-700" />
                  <h3 className="text-small font-bold text-text">
                    Custom Gemini API Key
                  </h3>
                </div>
                {openApiKey ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
              </button>

              {openApiKey && (
                <div className="space-y-3 pt-2 border-t border-border-subtle text-small">
                  <p className="text-caption text-text-muted leading-relaxed">
                    Sent solely via the <code className="font-mono bg-surface-subtle px-1 py-0.5 rounded text-[11px]">x-gemini-key</code> HTTP header, never logged or stored on any server.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="gemini-api-key" className="block text-caption font-semibold text-text mb-1">
                        API Key
                      </label>
                      <input
                        id="gemini-api-key"
                        type="password"
                        value={userGeminiKey}
                        onChange={(e) => handleKeyChange(e.target.value, rememberKey)}
                        placeholder="AIzaSy..."
                        className="w-full px-3 py-2 text-caption font-mono border border-border rounded-input focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-caption text-text cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberKey}
                        onChange={(e) => handleKeyChange(userGeminiKey, e.target.checked)}
                        className="w-4 h-4 rounded-chip text-primary border-border focus:ring-primary"
                      />
                      <span>Remember on this device (<code className="text-[11px] font-mono">localStorage</code>)</span>
                    </label>
                  </div>
                </div>
              )}
            </Card>

            {/* Proceed CTA on Desktop */}
            <div className="pt-2">
              <Button
                onClick={handleProceed}
                disabled={!bill}
                size="lg"
                className="w-full"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Proceed to Verify
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
