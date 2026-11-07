"use client";

import React, { useState } from "react";
import { AuditedItemResult, FlagColorCategory } from "@/lib/schemas";
import {
  AlertCircle,
  ShieldAlert,
  Scale,
  ExternalLink,
  HelpCircle,
  FileSearch,
  CheckCircle2,
  Filter,
} from "lucide-react";

interface ViolationCardsProps {
  results: AuditedItemResult[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
}

export const ViolationCards: React.FC<ViolationCardsProps> = ({
  results,
  activeItemId,
  onSelectItem,
}) => {
  const [filterColor, setFilterColor] = useState<FlagColorCategory | "ALL">("ALL");

  const flaggedItems = results.filter((r) => r.confidenceTier !== "CLEAR");

  const filteredItems = flaggedItems.filter((item) => {
    if (filterColor === "ALL") return true;
    return item.colorCategory === filterColor;
  });

  const getCardBorder = (category: FlagColorCategory, isActive: boolean) => {
    if (isActive) {
      return "border-2 border-teal-400 ring-2 ring-teal-400/30 bg-slate-900";
    }
    switch (category) {
      case "ABOVE_CEILING":
        return "border-red-900/60 hover:border-red-500 bg-red-950/20";
      case "REVIEW_FLAG":
        return "border-amber-900/60 hover:border-amber-500 bg-amber-950/20";
      case "INSURER_DEDUCTION":
        return "border-purple-900/60 hover:border-purple-500 bg-purple-950/20";
      default:
        return "border-slate-800 hover:border-slate-700 bg-slate-900/60";
    }
  };

  const getBadgeStyle = (category: FlagColorCategory) => {
    switch (category) {
      case "ABOVE_CEILING":
        return "bg-red-950/80 text-red-300 border-red-700/60";
      case "REVIEW_FLAG":
        return "bg-amber-950/80 text-amber-300 border-amber-700/60";
      case "INSURER_DEDUCTION":
        return "bg-purple-950/80 text-purple-300 border-purple-700/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5 text-teal-400" />
          <span>Filter Flags:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterColor("ALL")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterColor === "ALL"
                ? "bg-slate-700 text-white font-bold"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({flaggedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterColor("ABOVE_CEILING")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterColor === "ABOVE_CEILING"
                ? "bg-red-900 text-red-100 font-bold"
                : "bg-slate-800/80 text-red-400 hover:text-red-300"
            }`}
          >
            Above Ceiling (#E5484D)
          </button>
          <button
            type="button"
            onClick={() => setFilterColor("REVIEW_FLAG")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterColor === "REVIEW_FLAG"
                ? "bg-amber-900 text-amber-100 font-bold"
                : "bg-slate-800/80 text-amber-400 hover:text-amber-300"
            }`}
          >
            Review Flags (#F5A524)
          </button>
          <button
            type="button"
            onClick={() => setFilterColor("INSURER_DEDUCTION")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterColor === "INSURER_DEDUCTION"
                ? "bg-purple-900 text-purple-100 font-bold"
                : "bg-slate-800/80 text-purple-400 hover:text-purple-300"
            }`}
          >
            Insurer Deduction (#8E4EC6)
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No Flagged Violations</h4>
            <p className="text-xs text-slate-400 mt-1">
              All line items conform to statutory benchmarks in this category.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = activeItemId === item.lineItemId;
            return (
              <div
                key={item.lineItemId}
                tabIndex={0}
                role="button"
                aria-label={`Audit card for ${item.headline}`}
                onClick={() => onSelectItem(item.lineItemId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectItem(item.lineItemId);
                  }
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-md outline-none focus:ring-2 focus:ring-teal-400 ${getCardBorder(
                  item.colorCategory,
                  isActive
                )}`}
              >
                {/* Card Top Row: Badges & Dispute Amount */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeStyle(
                        item.colorCategory
                      )}`}
                    >
                      {item.colorCategory.replace("_", " ")}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        item.confidenceTier === "HIGH_CONFIDENCE"
                          ? "bg-teal-950/80 text-teal-300 border-teal-700/60"
                          : item.confidenceTier === "REVIEW_POLICY_BASED"
                          ? "bg-amber-950/80 text-amber-300 border-amber-700/60"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {item.confidenceTier.replace(/_/g, " ")}
                    </span>
                  </div>

                  {item.potentialDisputeAmountInr > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Amount Under Query
                      </span>
                      <span className="text-sm font-extrabold text-red-400">
                        Rs. {item.potentialDisputeAmountInr.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Headline & Explanation */}
                <h4 className="text-sm font-bold text-white mb-1">
                  {item.headline}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {item.explanation}
                </p>

                {/* Rupee Breakdown Pill */}
                <div className="flex flex-wrap items-center gap-4 py-2 px-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-400 mb-3">
                  <div>
                    Billed:{" "}
                    <strong className="text-white">
                      ₹{item.billedAmountInr.toLocaleString("en-IN")}
                    </strong>
                  </div>
                  {item.referenceBenchmarkInr !== null && (
                    <div>
                      Statutory Cap / Benchmark:{" "}
                      <strong className="text-teal-400">
                        ₹{item.referenceBenchmarkInr.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  )}
                  {item.potentialDisputeAmountInr > 0 && (
                    <div>
                      Dispute Excess:{" "}
                      <strong className="text-red-400">
                        ₹{item.potentialDisputeAmountInr.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Missing Disclosures Warning */}
                {item.mandatoryDisclosuresMissing.length > 0 && (
                  <div className="mb-3 p-2.5 rounded bg-amber-950/40 border border-amber-900/60 text-[11px] text-amber-200">
                    <span className="font-bold flex items-center gap-1 text-amber-300 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Missing Statutory Invoicing Disclosures:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                      {item.mandatoryDisclosuresMissing.map((disc, idx) => (
                        <li key={idx}>{disc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Source Citation */}
                {item.sourceCitation && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="truncate max-w-[280px]">
                      <span className="text-teal-400 font-semibold">Source: </span>
                      <span className="text-slate-300">
                        {item.sourceCitation.documentName} ({item.sourceCitation.clauseOrSchedule})
                      </span>
                    </div>
                    {item.sourceCitation.url && (
                      <a
                        href={item.sourceCitation.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Official Gazette <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
