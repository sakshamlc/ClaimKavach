"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AgentPipelineBar } from "@/components/AgentPipelineBar";
import { HumanReviewTable } from "@/components/HumanReviewTable";
import { BillXRayCanvas } from "@/components/BillXRayCanvas";
import { ViolationCards } from "@/components/ViolationCards";
import { SavingsChart } from "@/components/SavingsChart";
import { LegalNoticeModal } from "@/components/LegalNoticeModal";
import { VoiceBriefingPlayer } from "@/components/VoiceBriefingPlayer";
import { ExtractedBill, BillAuditSummary } from "@/lib/schemas";
import { auditBill } from "@/lib/ruleEngine";
import sampleBillsData from "@/data/sample_bills.json";
import {
  Upload,
  FileText,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  HeartPulse,
  Activity,
  Bone,
  CheckCircle2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FileDown,
  Info,
} from "lucide-react";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedBill, setSelectedBill] = useState<ExtractedBill | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionNotice, setExtractionNotice] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [forceVerifiedDemoMode, setForceVerifiedDemoMode] = useState<boolean>(false);
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState<boolean>(false);
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<"XRAY" | "FLAGS">("XRAY");
  const [clientApiKey, setClientApiKey] = useState<string>("");
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);

  // Load client-side API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("user_gemini_api_key");
      if (savedKey) {
        setClientApiKey(savedKey);
        setIsKeySaved(true);
      }
    }
  }, []);

  const handleSaveApiKey = () => {
    if (typeof window !== "undefined") {
      const trimmed = clientApiKey.trim();
      if (trimmed) {
        localStorage.setItem("user_gemini_api_key", trimmed);
        setIsKeySaved(true);
      } else {
        localStorage.removeItem("user_gemini_api_key");
        setIsKeySaved(false);
      }
    }
  };

  const sampleBills = sampleBillsData as unknown as ExtractedBill[];

  // 1-Click Synthetic Sample Selection — always resets demo mode to false
  const handleSelectSample = (bill: ExtractedBill) => {
    setForceVerifiedDemoMode(false);
    setSelectedBill(bill);
    setUploadedFileUrl(null);
    setCurrentStep(3); // Direct to Human Review
    setExtractionNotice(null);
  };

  // Stateless In-Memory File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create transient object URL for in-browser PDF/Image preview
    const objectUrl = URL.createObjectURL(file);
    setUploadedFileUrl(objectUrl);

    setIsExtracting(true);
    setCurrentStep(2);
    setExtractionNotice(null);
    setForceVerifiedDemoMode(false); // Always reset demo mode on new upload

    try {
      const formData = new FormData();
      formData.append("file", file);

      const userApiKey =
        clientApiKey.trim() ||
        (typeof window !== "undefined" ? localStorage.getItem("user_gemini_api_key") || "" : "");
      formData.append("clientApiKey", userApiKey || "");

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      setSelectedBill(data.bill);
      if (data.notice) {
        setExtractionNotice(data.notice);
      }
      setCurrentStep(3);
    } catch (err: unknown) {
      console.error(err);
      // Show extraction error without falling back to a stale sample bill
      const errMsg =
        err instanceof Error ? err.message : "Upload or extraction failed. Please try again.";
      setExtractionNotice(`⚠️ ${errMsg}`);
      setSelectedBill(null);
      setCurrentStep(1);
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 3 to Step 4/5 transition
  const handleProceedToAudit = (updatedBill: ExtractedBill) => {
    setSelectedBill(updatedBill);
    setCurrentStep(5); // Jump directly into Output Workspace (Bill X-Ray & Grievance Pack)
  };

  // Privacy Reset: Purges all client state and object URLs instantaneously
  const handleReset = () => {
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setSelectedBill(null);
    setUploadedFileUrl(null);
    setActiveItemId(null);
    setForceVerifiedDemoMode(false);
    setCurrentStep(1);
    setExtractionNotice(null);
  };

  // Deterministic Audit Calculation
  const auditSummary: BillAuditSummary | null = useMemo(() => {
    if (!selectedBill) return null;
    return auditBill(selectedBill, { forceVerifiedDemoMode });
  }, [selectedBill, forceVerifiedDemoMode]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar: Optional Client-Side Gemini API Key Override */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-sm">🔑</span>
          <span className="font-semibold text-white">Gemini API Key (Optional):</span>
          <span className="text-slate-400 hidden sm:inline">Stored in browser localStorage only</span>
        </div>
        <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[280px]">
          <input
            type="password"
            value={clientApiKey}
            onChange={(e) => {
              setClientApiKey(e.target.value);
              setIsKeySaved(false);
            }}
            placeholder="AIzaSy... (optional for live OCR)"
            className="flex-1 sm:w-64 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs font-mono"
          />
          <button
            type="button"
            onClick={handleSaveApiKey}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs shrink-0 ${
              isKeySaved
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/50"
                : "bg-teal-600 hover:bg-teal-500 text-white"
            }`}
          >
            {isKeySaved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>

      {/* 5-Step Agent Pipeline Bar */}
      <AgentPipelineBar
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step <= currentStep) setCurrentStep(step);
        }}
      />

      {extractionNotice && (
        <div className="p-3 bg-teal-950/50 border border-teal-600/40 rounded-lg text-xs text-teal-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{extractionNotice}</span>
        </div>
      )}

      {/* STEP 1: Upload & Sample Bill Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Hospital Bill & Insurance Audit
            </h1>
            <p className="text-slate-400 text-sm">
              Upload your hospital bill or explore 1-click synthetic cases to audit NPPA DPCO price caps, duplicate charges, ICU unbundling, and wrongful TPA deductions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Box */}
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl transition-all text-center">
              <div className="w-14 h-14 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Upload Hospital Bill
              </h3>
              <p className="text-xs text-slate-400 mb-4 max-w-xs">
                Supports PDF, JPG, PNG (Max 10 MB). Processed statelessly in memory.
              </p>
              <label className="cursor-pointer px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-all">
                Choose File
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Synthetic Sample Bills */}
            <div className="flex flex-col justify-between p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-teal-400" />
                  Try 1-Click Synthetic Sample Bills
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  100% synthetic data with pre-configured NPPA and IRDAI audit cases:
                </p>
              </div>

              <div className="space-y-3">
                {/* Case 1: Hero Demo */}
                <button
                  type="button"
                  onClick={() => handleSelectSample(sampleBills[0])}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/60 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                        <HeartPulse className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-teal-300">
                          Case 1: Cardiac Stent Audit (Hero Demo)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Drug-eluting stent above NPPA cap + unbundled ICU monitoring
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">Rs. 3,42,000</div>
                      <div className="text-[10px] text-amber-400 font-medium">Potential Query: Rs. 15,250</div>
                      <div className="text-[9px] text-slate-400 font-medium">Est. Payable: Rs. 3,26,750</div>
                    </div>
                  </div>
                </button>

                {/* Case 2: Dengue ICU */}
                <button
                  type="button"
                  onClick={() => handleSelectSample(sampleBills[1])}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-teal-300">
                          Case 2: Dengue ICU Stay
                        </div>
                        <div className="text-[11px] text-slate-400">
                          5-day bed charge on 4-day stay + duplicate same-day CBC
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">Rs. 1,84,500</div>
                      <div className="text-[10px] text-amber-400 font-medium">Potential Query: Rs. 24,900</div>
                      <div className="text-[9px] text-slate-400 font-medium">Est. Payable: Rs. 1,59,600</div>
                    </div>
                  </div>
                </button>

                {/* Case 3: Knee Ortho */}
                <button
                  type="button"
                  onClick={() => handleSelectSample(sampleBills[2])}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/60 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <Bone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-teal-300">
                          Case 3: Knee Replacement + TPA Deduction
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Implant kit cap breach + wrongful TPA consumable exclusion
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">Rs. 2,65,000</div>
                      <div className="text-[10px] text-amber-400 font-medium">Potential Query: Rs. 5,100</div>
                      <div className="text-[9px] text-slate-400 font-medium">Est. Payable: Rs. 2,59,900</div>
                    </div>
                  </div>
                </button>

                {/* Case 4: Clean Control */}
                {sampleBills[3] && (
                  <button
                    type="button"
                    onClick={() => handleSelectSample(sampleBills[3])}
                    className="w-full text-left p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/60 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                            Case 4: Clean Control Hospital Bill
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Fully compliant billing with zero pricing or tariff disputes
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-white">Rs. 11,500</div>
                        <div className="text-[10px] text-emerald-400 font-medium">Potential Query: Rs. 0</div>
                        <div className="text-[9px] text-slate-400 font-medium">Est. Payable: Rs. 11,500</div>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Extraction Loader */}
      {currentStep === 2 && (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto" />
          <h3 className="text-base font-bold text-white">
            AI Vision Model Reading Bill...
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Extracting line items, room categories, admission dates, and TPA deductions in memory.
          </p>
        </div>
      )}

      {/* STEP 3: Human Review Table */}
      {currentStep === 3 && selectedBill && (
        <HumanReviewTable
          bill={selectedBill}
          onProceedToAudit={handleProceedToAudit}
          onReset={handleReset}
        />
      )}

      {/* STEP 4 & 5: Output Workspace (Split Screen X-Ray, Violation Cards & Savings Chart) */}
      {currentStep >= 4 && selectedBill && auditSummary && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
              >
                ← Back to Edit Rows
              </button>

              {/* Demo Mode Toggle */}
              <button
                type="button"
                onClick={() => setForceVerifiedDemoMode(!forceVerifiedDemoMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  forceVerifiedDemoMode
                    ? "bg-teal-950/80 border-teal-600/60 text-teal-300"
                    : "bg-slate-800/80 border-slate-700 text-slate-400"
                }`}
                title="Toggle between simulating gazetted verification vs live placeholder gating"
              >
                {forceVerifiedDemoMode ? (
                  <ToggleRight className="w-4 h-4 text-teal-400" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                )}
                <span>Verify Seed Rules (Demo Mode)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* PDF Grievance Export Button */}
              <button
                type="button"
                onClick={() => setIsGrievanceModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow transition-all"
              >
                <FileDown className="w-4 h-4" />
                Download Grievance Draft (PDF)
              </button>

              {/* Delete Upload & Reset */}
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Upload & Reset
              </button>
            </div>
          </div>

          {/* Voice Briefing Player (Web Speech API with Automatic Device Voice Detection) */}
          <VoiceBriefingPlayer bill={selectedBill} summary={auditSummary} />

          {/* Savings Chart & Financial Summary */}
          <SavingsChart summary={auditSummary} />

          {/* Mobile Tab Switcher (< 1024px) */}
          <div className="flex lg:hidden items-center justify-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileWorkspaceTab("XRAY")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                mobileWorkspaceTab === "XRAY"
                  ? "bg-teal-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Bill X-Ray View
            </button>
            <button
              type="button"
              onClick={() => setMobileWorkspaceTab("FLAGS")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                mobileWorkspaceTab === "FLAGS"
                  ? "bg-teal-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Flagged Violations ({auditSummary.results.filter((r) => r.confidenceTier !== "CLEAR").length})
            </button>
          </div>

          {/* Split-Screen Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Bill X-Ray Canvas (7 cols on desktop) */}
            <div
              className={`lg:col-span-7 ${
                mobileWorkspaceTab === "XRAY" ? "block" : "hidden lg:block"
              }`}
            >
              <BillXRayCanvas
                bill={selectedBill}
                auditSummary={auditSummary}
                activeItemId={activeItemId}
                onSelectItem={(id) => setActiveItemId(id)}
                uploadedFileUrl={uploadedFileUrl}
              />
            </div>

            {/* Right Column: Violation Cards (5 cols on desktop) */}
            <div
              className={`lg:col-span-5 ${
                mobileWorkspaceTab === "FLAGS" ? "block" : "hidden lg:block"
              }`}
            >
              <ViolationCards
                results={auditSummary.results}
                activeItemId={activeItemId}
                onSelectItem={(id) => setActiveItemId(id)}
              />
            </div>
          </div>

          {/* Legal Notice & Grievance Export Modal */}
          <LegalNoticeModal
            bill={selectedBill}
            summary={auditSummary}
            isOpen={isGrievanceModalOpen}
            onClose={() => setIsGrievanceModalOpen(false)}
            isDemoMode={forceVerifiedDemoMode}
          />
        </div>
      )}
    </div>
  );
}
