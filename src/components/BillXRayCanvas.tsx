"use client";

import React, { useState } from "react";
import {
  ExtractedBill,
  BillAuditSummary,
  AuditedItemResult,
  FlagColorCategory,
} from "@/lib/schemas";
import {
  FileText,
  Building2,
  Calendar,
  Bed,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileCheck,
} from "lucide-react";

interface BillXRayCanvasProps {
  bill: ExtractedBill;
  auditSummary: BillAuditSummary;
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  uploadedFileUrl?: string | null;
}

export const BillXRayCanvas: React.FC<BillXRayCanvasProps> = ({
  bill,
  auditSummary,
  activeItemId,
  onSelectItem,
  uploadedFileUrl,
}) => {
  const [viewMode, setViewMode] = useState<"RECEIPT" | "RAW_FILE">("RECEIPT");
  const [showImageOverlay, setShowImageOverlay] = useState<boolean>(false);

  // Map each line item to its audit result
  const auditMap = new Map<string, AuditedItemResult>();
  auditSummary.results.forEach((res) => {
    auditMap.set(res.lineItemId, res);
  });

  const getRowHighlightClass = (
    colorCategory?: FlagColorCategory,
    isActive?: boolean
  ) => {
    if (isActive) {
      return "bg-teal-950/70 border-l-4 border-l-teal-400 border-teal-500/80 shadow-md";
    }
    switch (colorCategory) {
      case "ABOVE_CEILING":
        return "bg-red-950/40 border-l-4 border-l-[#E5484D] border-red-900/50 hover:bg-red-950/60";
      case "REVIEW_FLAG":
        return "bg-amber-950/40 border-l-4 border-l-[#F5A524] border-amber-900/50 hover:bg-amber-950/60";
      case "INSURER_DEDUCTION":
        return "bg-purple-950/40 border-l-4 border-l-[#8E4EC6] border-purple-900/50 hover:bg-purple-950/60";
      default:
        return "hover:bg-slate-800/40 border-l-4 border-l-transparent";
    }
  };

  const getPillBadge = (result?: AuditedItemResult) => {
    if (!result || result.confidenceTier === "CLEAR") return null;

    if (result.colorCategory === "ABOVE_CEILING") {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-700/60 shrink-0">
          Above Ceiling
        </span>
      );
    }
    if (result.colorCategory === "REVIEW_FLAG") {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60 shrink-0">
          Review Flag
        </span>
      );
    }
    if (result.colorCategory === "INSURER_DEDUCTION") {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700/60 shrink-0">
          TPA Deduction
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Bar with Mode Switcher & Legend */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-white">Bill X-Ray Canvas</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
            {bill.isSample ? "Synthetic Demo Receipt" : "Uploaded Extracted Bill"}
          </span>
        </div>

        {/* View Toggle for Uploads */}
        {uploadedFileUrl && (
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("RECEIPT")}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === "RECEIPT"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              X-Ray Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("RAW_FILE")}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === "RAW_FILE"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Raw Document
            </button>
          </div>
        )}

        {/* Highlight Color Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E5484D]"></span>
            Ceiling Breach
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5A524]"></span>
            Package Review
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8E4EC6]"></span>
            TPA Deduction
          </span>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "RAW_FILE" && uploadedFileUrl ? (
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[500px]">
          <div className="w-full flex justify-between items-center mb-3">
            <span className="text-xs text-slate-400">Original Uploaded File Preview</span>
            <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showImageOverlay}
                onChange={(e) => setShowImageOverlay(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0"
              />
              Show Experimental Bounding Boxes
            </label>
          </div>
          <div className="relative border border-slate-800 rounded-lg overflow-hidden max-h-[650px] w-full flex items-center justify-center bg-black/40">
            <iframe
              src={uploadedFileUrl}
              className="w-full h-[600px] border-none"
              title="Uploaded Medical Bill"
            />
          </div>
        </div>
      ) : (
        /* Mode A: Clean Stylized Digital Hospital Receipt */
        <div className="p-5 space-y-5 bg-slate-900/90 overflow-y-auto max-h-[700px]">
          {/* Hospital & Patient Header */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-teal-400" />
                  {bill.hospitalName}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Invoice ID: {bill.billId} • {bill.patientNameRedacted}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700/50 font-semibold">
                  Verified Ingestion
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Admission</span>
                <span className="font-semibold text-white">{bill.admissionDate || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Discharge</span>
                <span className="font-semibold text-white">{bill.dischargeDate || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Room Category</span>
                <span className="font-semibold text-teal-300">{bill.roomCategory.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Length of Stay</span>
                <span className="font-semibold text-white">{auditSummary.lengthOfStayDays} Day(s)</span>
              </div>
            </div>
          </div>

          {/* Itemized X-Ray Receipt Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <th className="py-2.5 px-3">Item / Service Description</th>
                  <th className="py-2.5 px-2 text-center w-14">Qty</th>
                  <th className="py-2.5 px-2 text-right w-20">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-24">Billed (₹)</th>
                  <th className="py-2.5 px-3 text-right w-28">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bill.lineItems.map((item) => {
                  const auditResult = auditMap.get(item.id);
                  const isFlagged = auditResult && auditResult.confidenceTier !== "CLEAR";
                  const isActive = activeItemId === item.id;

                  return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Row for ${item.rawLabel}, billed at ${item.totalBilled} rupees`}
                      onClick={() => onSelectItem(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectItem(item.id);
                        }
                      }}
                      className={`cursor-pointer transition-all outline-none focus:ring-1 focus:ring-teal-400 ${getRowHighlightClass(
                        auditResult?.colorCategory,
                        isActive
                      )}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{item.rawLabel}</span>
                          {item.code && (
                            <span className="text-[10px] font-mono text-slate-400">
                              [{item.code}]
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Cat: {item.category.replace("_", " ")}</span>
                          <span>•</span>
                          <span>Unit: {item.unit}</span>
                          {item.serviceDate && (
                            <>
                              <span>•</span>
                              <span>Date: {item.serviceDate}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center text-slate-300 font-mono">
                        {item.quantity}
                      </td>

                      <td className="py-2.5 px-2 text-right text-slate-400 font-mono">
                        ₹{item.unitPrice.toLocaleString("en-IN")}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                        ₹{item.totalBilled.toLocaleString("en-IN")}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {isFlagged ? (
                          <div className="flex flex-col items-end gap-0.5">
                            {getPillBadge(auditResult)}
                            {auditResult.potentialDisputeAmountInr > 0 && (
                              <span className="text-[10px] font-bold text-red-400 font-mono">
                                -₹{auditResult.potentialDisputeAmountInr.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-teal-400/80 font-medium flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Clear
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Receipt Totals */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Gross Billed Amount:</span>
              <span className="font-semibold text-white">
                ₹{auditSummary.totalBilledInr.toLocaleString("en-IN")}
              </span>
            </div>
            {auditSummary.totalPotentialDisputeInr > 0 && (
              <div className="flex justify-between text-red-400 font-medium">
                <span>Total Amount Under Query:</span>
                <span>
                  -Rs. {auditSummary.totalPotentialDisputeInr.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
              <span className="text-teal-300">Est. Fair Payable if Accepted:</span>
              <span className="text-teal-300 font-mono">
                ₹{auditSummary.estimatedPayableIfAcceptedInr.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
