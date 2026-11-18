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
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building,
  Percent,
  Receipt,
  FileCheck,
  Calendar,
  Layers,
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

  const handleSelectSample = (key: 'sample1' | 'sample2' | 'sample3') => {
    loadSample(key);
    setUploadError(null);
  };

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingBill(true);
    setUploadError(null);
    setProgressStatus('Reading document...');

    try {
      const extractedData = await processPdfOrImage(file, {
        docType: 'hospital_bill',
        onProgress: (_step, _total, status) => setProgressStatus(status),
      });

      const domainBill = toMedicalBill(extractedData);
      setBill(domainBill, file.name);
      setProgressStatus(null);
    } catch (err: any) {
      console.error('File extraction error:', err);
      setUploadError(
        err.message || 'Failed to extract bill. You can try one of our 3 synthetic sample bills.'
      );
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
      });
      setTpaSettlement(extractedData, file.name);
    } catch (err: any) {
      console.error('TPA extraction error:', err);
      setTpaError(err.message || 'Failed to process TPA settlement sheet.');
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
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.uploadTitle}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t.uploadSubtitle}
          </p>
        </div>

        {/* Section 1: Synthetic Sample Bills (One-Click Testing) */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                {t.samplesSectionTitle}
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {t.samplesZeroUpload}
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {t.samplesDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Sample 1: Stent */}
            <button
              type="button"
              onClick={() => handleSelectSample('sample1')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                selectedSampleKey === 'sample1'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Sample 1
                  </span>
                  {selectedSampleKey === 'sample1' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t.sample1Title}</h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {t.sample1Desc}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                Tests: R-NPPA-01 Ceiling Rule
              </span>
            </button>

            {/* Sample 2: Bundling & TPA */}
            <button
              type="button"
              onClick={() => handleSelectSample('sample2')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                selectedSampleKey === 'sample2'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-900">
                    Sample 2
                  </span>
                  {selectedSampleKey === 'sample2' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t.sample2Title}</h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {t.sample2Desc}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                Tests: R-BUNDLE-01 & R-ANX-01
              </span>
            </button>

            {/* Sample 3: Clean */}
            <button
              type="button"
              onClick={() => handleSelectSample('sample3')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                selectedSampleKey === 'sample3'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                    Sample 3
                  </span>
                  {selectedSampleKey === 'sample3' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t.sample3Title}</h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {t.sample3Desc}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                Tests: Zero-Findings Clean Path
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Upload Own Hospital Bill PDF */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-slate-900">
              {t.uploadBillTitle}
            </h2>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50/50 transition-colors">
            <input
              type="file"
              id="bill-upload"
              accept=".pdf,image/*"
              onChange={handleBillUpload}
              className="hidden"
              disabled={isProcessingBill}
            />
            <label
              htmlFor="bill-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-primary">
                {isProcessingBill ? progressStatus || 'Reading document text...' : t.uploadBillBoxLabel}
              </span>
              <span className="text-xs text-muted">
                {t.uploadBillBoxSub}
              </span>
            </label>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {bill && !selectedSampleKey && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                Loaded bill with <strong>{bill.items.length} line items</strong>. Hospital: {bill.hospital.name || 'Hospital'}.
              </span>
            </div>
          )}
        </div>

        {/* Section 3: Optional TPA Settlement Sheet Upload */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {t.uploadTpaTitle}
            </h2>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:bg-slate-50/50 transition-colors">
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
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-indigo-700">
                {isProcessingTpa ? 'Reading TPA settlement...' : t.uploadTpaBoxLabel}
              </span>
              <span className="text-[11px] text-muted">
                {t.uploadTpaBoxSub}
              </span>
            </label>
          </div>

          {tpaError && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{tpaError}</span>
            </div>
          )}

          {tpaFileName && (
            <div className="flex items-center gap-2 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600" />
              <span>
                TPA settlement loaded: <strong>{tpaFileName}</strong>. Deductions mapped into audit context.
              </span>
            </div>
          )}
        </div>

        {/* Section 4: GST Configuration */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {t.gstSectionTitle}
            </h2>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {t.gstSectionDesc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                billedPriceIncludesGst === false
                  ? 'border-primary bg-primary/5 text-primary font-bold'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="gstInclusion"
                checked={billedPriceIncludesGst === false}
                onChange={() => setGstOptions(false, null)}
                className="mt-0.5 text-primary"
              />
              <div>
                <span className="block font-semibold">{t.gstExcludes}</span>
                <span className="text-[11px] text-muted font-normal">
                  {t.gstExcludesSub}
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                billedPriceIncludesGst === true
                  ? 'border-primary bg-primary/5 text-primary font-bold'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="gstInclusion"
                checked={billedPriceIncludesGst === true}
                onChange={() => setGstOptions(true, gstRatePct || 5)}
                className="mt-0.5 text-primary"
              />
              <div>
                <span className="block font-semibold">{t.gstIncludes}</span>
                <span className="text-[11px] text-muted font-normal">
                  {t.gstIncludesSub}
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                billedPriceIncludesGst === null
                  ? 'border-primary bg-primary/5 text-primary font-bold'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="gstInclusion"
                checked={billedPriceIncludesGst === null}
                onChange={() => setGstOptions(null, null)}
                className="mt-0.5 text-primary"
              />
              <div>
                <span className="block font-semibold">{t.gstUnknown}</span>
                <span className="text-[11px] text-muted font-normal">
                  {t.gstUnknownSub}
                </span>
              </div>
            </label>
          </div>

          {billedPriceIncludesGst === true && (
            <div className="pt-2 flex items-center gap-3 text-xs">
              <span className="text-slate-700 font-semibold">{t.gstRateLabel}</span>
              <input
                type="number"
                min="0"
                max="28"
                step="0.01"
                value={gstRatePct ?? 5}
                onChange={(e) => setGstOptions(true, parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-primary/20"
                placeholder="5"
              />
              <span className="text-[11px] text-muted">
                {t.gstRateNote}
              </span>
            </div>
          )}
        </div>

        {/* Section 5: Policy Context Form (Sum Insured, Room Limit, Copay, Room Days, Room Rate) */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">
              {t.policySectionTitle}
            </h2>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {t.policySectionDesc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.policyRoomCapLabel}
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={policyInputs.roomRentLimitRupees ?? ''}
                onChange={(e) =>
                  setPolicyInputs({
                    roomRentLimitRupees: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.policySumInsuredLabel}
              </label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={policyInputs.sumInsuredRupees ?? ''}
                onChange={(e) =>
                  setPolicyInputs({
                    sumInsuredRupees: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.policyCopayLabel}
              </label>
              <input
                type="number"
                placeholder="e.g. 10"
                value={policyInputs.copayPercent ?? ''}
                onChange={(e) =>
                  setPolicyInputs({
                    copayPercent: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.policyRoomDaysLabel}
              </label>
              <input
                type="number"
                placeholder="e.g. 3"
                value={policyInputs.roomDays ?? ''}
                onChange={(e) =>
                  setPolicyInputs({
                    roomDays: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.policyBilledRateLabel}
              </label>
              <input
                type="number"
                placeholder="e.g. 6000"
                value={policyInputs.billedRoomRateRupees ?? ''}
                onChange={(e) =>
                  setPolicyInputs({
                    billedRoomRateRupees: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            &larr; {t.backBtn}
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer focus:ring-4 focus:ring-primary/20"
          >
            <span>{t.proceedVerifyBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
