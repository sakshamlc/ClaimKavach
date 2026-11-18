'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { useClaimStore } from '@/store/claimStore';
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
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const consentAccepted = useClaimStore((state) => state.consentAccepted);
  const setBill = useClaimStore((state) => state.setBill);
  const loadSample = useClaimStore((state) => state.loadSample);
  const selectedSampleKey = useClaimStore((state) => state.selectedSampleKey);
  const bill = useClaimStore((state) => state.bill);

  // Policy options local state
  const policyInputs = useClaimStore((state) => state.policyInputs);
  const setPolicyInputs = useClaimStore((state) => state.setPolicyInputs);

  // GST options local state
  const billedPriceIncludesGst = useClaimStore((state) => state.billedPriceIncludesGst);
  const gstRatePct = useClaimStore((state) => state.gstRatePct);
  const setGstOptions = useClaimStore((state) => state.setGstOptions);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectSample = (key: 'sample1' | 'sample2' | 'sample3') => {
    loadSample(key);
    setUploadError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'hospital_bill');

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload extraction failed (${res.status})`);
      }

      const extractedData = await res.json();
      const { toMedicalBill } = await import('@/lib/extract/toMedicalBill');
      const domainBill = toMedicalBill(extractedData);
      setBill(domainBill, file.name);
    } catch (err: any) {
      console.error('File extraction error:', err);
      setUploadError(
        err.message || 'Failed to extract bill. You can try one of our 3 synthetic sample bills.'
      );
    } finally {
      setIsProcessing(false);
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
            Step 1: Provide Hospital Bill & Policy Details
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Choose one of our 3 pre-configured synthetic sample bills or upload your own hospital invoice PDF.
          </p>
        </div>

        {/* Section 1: Synthetic Sample Bills (One-Click Testing) */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                1-Click Synthetic Sample Bills
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Zero Upload Required
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Click any scenario to load a fully structured synthetic fixture with zero real patient data.
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
                <h3 className="text-sm font-bold text-slate-900">Coronary Stent Bill</h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Angioplasty DES stent billed at ₹45,000 above the ₹39,186.03 NPPA statutory ceiling.
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
                <h3 className="text-sm font-bold text-slate-900">Bundling & TPA Deductions</h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Separate billing of nursing & gowns, plus arbitrary TPA non-payable deduction disputes.
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
                <h3 className="text-sm font-bold text-slate-900">Clean Medical Bill</h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Fully compliant inpatient bill with zero statutory ceiling overcharges or math errors.
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
              Or Upload Hospital Bill (PDF or Photo)
            </h2>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50/50 transition-colors">
            <input
              type="file"
              id="bill-upload"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <label
              htmlFor="bill-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-primary">
                {isProcessing ? 'Reading document text...' : 'Click to select bill or drag file here'}
              </span>
              <span className="text-xs text-muted">
                Accepts itemized hospital bill (PDF or camera photo). Processed in memory only.
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
                Loaded bill with <strong>{bill.items.length} line items</strong>. Hospital: {bill.hospital.name}.
              </span>
            </div>
          )}
        </div>

        {/* Section 3: GST Configuration */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Tax & GST Inclusion Setting
            </h2>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Statutory NPPA ceilings are published pre-tax (excluding GST). Indicate whether your bill rates include GST so the audit engine can make an accurate statutory comparison without false flags.
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
                <span className="block font-semibold">Excludes GST</span>
                <span className="text-[11px] text-muted font-normal">
                  Hospital rates billed as pre-tax base rate
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
                <span className="block font-semibold">Includes GST</span>
                <span className="text-[11px] text-muted font-normal">
                  Unit rates are inclusive of tax
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
                <span className="block font-semibold">Not Stated / Unknown</span>
                <span className="text-[11px] text-muted font-normal">
                  Caps findings at NEEDS_REVIEW
                </span>
              </div>
            </label>
          </div>

          {billedPriceIncludesGst === true && (
            <div className="pt-2 flex items-center gap-3 text-xs">
              <span className="text-slate-700 font-semibold">Stated GST Rate (%):</span>
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
                Typical GST for medicines: 5% or 12%; Stents: 5%.
              </span>
            </div>
          )}
        </div>

        {/* Section 4: Optional Policy Context */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">
              Optional: Insurance Policy Terms (For Proportionate Deductions)
            </h2>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            If your insurer deducted charges due to room rent capping, enter your policy limit to verify if the proportionate deduction was calculated lawfully.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Room Rent Limit per Day (₹):
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
                Policy Sum Insured (₹):
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
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            &larr; Back to Landing
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer focus:ring-4 focus:ring-primary/20"
          >
            <span>Proceed to Line Item Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
