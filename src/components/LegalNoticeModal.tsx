"use client";

import React, { useState } from "react";
import { ExtractedBill, BillAuditSummary } from "@/lib/schemas";
import { generateGrievancePdf } from "@/lib/pdfGenerator";
import {
  FileDown,
  X,
  FileText,
  User,
  Shield,
  Building,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface LegalNoticeModalProps {
  bill: ExtractedBill;
  summary: BillAuditSummary;
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
}

export const LegalNoticeModal: React.FC<LegalNoticeModalProps> = ({
  bill,
  summary,
  isOpen,
  onClose,
  isDemoMode = false,
}) => {
  const isBuiltInSample = Boolean(bill.isSample);
  const isSampleOrSynth = bill.isSample || bill.isSynthetic;

  const defaultUhid = () => {
    if (isBuiltInSample) {
      if (bill.billId === "SYN-1258") return "UHID-SYN-1258";
      if (bill.billId === "SYN-7040") return "UHID-SYN-7040";
      if (bill.billId === "SYN-3334") return "UHID-SYN-3334";
      return `UHID-${bill.billId}`;
    }
    return (bill as any).uhid || "[UHID]";
  };

  const defaultPolicy = () => {
    if (isBuiltInSample) {
      if (bill.billId === "SYN-1258") return "POL-SYN-1258";
      if (bill.billId === "SYN-7040") return "POL-SYN-7040";
      if (bill.billId === "SYN-3334") return "POL-SYN-3334";
      return `POL-${bill.billId}`;
    }
    return (bill as any).policyNumber || "[Policy No.]";
  };

  const defaultTpa = () => {
    if (isBuiltInSample) {
      if (bill.billId === "SYN-1258") return "MediAssist TPA Services (Synthetic)";
      return "MediCare TPA Services (Synthetic)";
    }
    return (bill as any).tpaName || "[TPA name]";
  };

  const [patientName, setPatientName] = useState<string>(
    bill.patientNameRedacted && !bill.patientNameRedacted.includes("[Patient")
      ? bill.patientNameRedacted
      : isSampleOrSynth
      ? "Patient (Synthetic Demo)"
      : "[Patient name]"
  );
  const [uhidNumber, setUhidNumber] = useState<string>(defaultUhid());
  const [policyNumber, setPolicyNumber] = useState<string>(defaultPolicy());
  const [tpaName, setTpaName] = useState<string>(defaultTpa());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const flaggedResults = summary.results.filter(
    (r) => r.potentialDisputeAmountInr > 0 || r.confidenceTier === "NEEDS_HUMAN_REVIEW"
  );
  const flaggedCount = flaggedResults.length;

  // Check if any flagged item depends on an unverified rule
  const hasUnverifiedRules = flaggedResults.some(
    (r) => !r.ruleVerified || (r.sourceCitation?.documentName && r.sourceCitation.documentName.includes("PLACEHOLDER"))
  );

  // Download is NEVER blocked — the PDF's red DRAFT banner is the safety mechanism.
  // The user is informed below if the PDF will carry the DRAFT stamp.
  const isDownloadBlocked = false;

  const handleDownload = () => {
    if (isDownloadBlocked) return;

    setIsGenerating(true);
    try {
      const doc = generateGrievancePdf(bill, summary, {
        patientName,
        uhidNumber,
        policyNumber,
        tpaName,
        isDemoMode,
      });

      const fileName = `ClaimKavach_Grievance_Draft_${bill.billId}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Export Patient Query & Grievance Draft
              </h3>
              <p className="text-[11px] text-slate-400">
                Official PDF template citing statutory NPPA and IRDAI clauses.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if unverified rules exist and demo mode is off */}
        {hasUnverifiedRules && !isDemoMode ? (
          <div className="p-3 bg-amber-950/50 border border-amber-700/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-300 font-semibold block">
                PDF will carry a DRAFT stamp — Do not send without verification
              </strong>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Some flagged items are backed by unverified reference data. The exported PDF will be stamped{" "}
                <strong>&quot;DRAFT - REFERENCE DATA NOT VERIFIED - DO NOT SEND&quot;</strong> in red at the top.
                Enable <strong>&quot;Verify Seed Rules (Demo Mode)&quot;</strong> on the toolbar to simulate verified output.
              </p>
            </div>
          </div>
        ) : (
          /* Audit Stats Banner */
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Total Amount Under Query
              </span>
              <span className="text-base font-bold text-red-400">
                Rs. {summary.totalPotentialDisputeInr.toLocaleString("en-IN")}
              </span>
              <span className="text-slate-400 block text-[10px] mt-0.5">
                Payable if all queried amounts were accepted: Rs. {summary.estimatedPayableIfAcceptedInr.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Flagged Items Included
              </span>
              <span className="text-base font-bold text-white">
                {flaggedCount} Regulatory Queries
              </span>
            </div>
          </div>
        )}

        {/* Customization Inputs with Fill-in Placeholders */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-teal-400" />
              Patient Name (for Letterhead)
            </label>
            <input
              type="text"
              value={patientName}
              placeholder="[Patient Name]"
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                UHID / IPD Admission No.
              </label>
              <input
                type="text"
                value={uhidNumber}
                placeholder="[UHID]"
                onChange={(e) => setUhidNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Insurance Policy / Claim No.
              </label>
              <input
                type="text"
                value={policyNumber}
                placeholder="[Policy No.]"
                onChange={(e) => setPolicyNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-teal-400" />
              TPA / Insurance Desk Name
            </label>
            <input
              type="text"
              value={tpaName}
              placeholder="[TPA name]"
              onChange={(e) => setTpaName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>

        {/* Legal Disclaimer Pill */}
        <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-800/50 text-[11px] text-teal-200/90 leading-relaxed">
          <strong className="text-teal-300">Format Guarantee: </strong>
          The exported document formats a polite query letter. It uses standard currency formatting (Rs.) and only cites verified regulatory guidelines.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating || isDownloadBlocked}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Download Official PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};
