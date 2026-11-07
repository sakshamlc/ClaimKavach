"use client";

import React, { useState } from "react";
import {
  ExtractedBill,
  ExtractedLineItem,
  RoomCategory,
} from "@/lib/schemas";
import {
  Plus,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Building2,
  Calendar,
  Bed,
  Info,
} from "lucide-react";

interface HumanReviewTableProps {
  bill: ExtractedBill;
  onProceedToAudit: (updatedBill: ExtractedBill) => void;
  onReset: () => void;
}

const CATEGORIES = [
  "IMPLANT_DEVICE",
  "MEDICINE",
  "CONSUMABLE",
  "ROOM_RENT",
  "NURSING_MONITORING",
  "DIAGNOSTICS_LAB",
  "CONSULTATION",
  "PROCEDURE_OT",
  "OTHER",
] as const;

const ROOM_CATEGORIES: RoomCategory[] = [
  "GENERAL_WARD",
  "TWIN_SHARING",
  "SINGLE_PRIVATE",
  "ICU",
  "NICU_PICU",
  "DAY_CARE",
  "UNKNOWN",
];

const UNITS = [
  "UNIT",
  "TABLET",
  "VIAL",
  "ML",
  "STRIP",
  "DAY",
  "VISIT",
  "TEST",
  "PACK",
] as const;

export const HumanReviewTable: React.FC<HumanReviewTableProps> = ({
  bill: initialBill,
  onProceedToAudit,
  onReset,
}) => {
  const [bill, setBill] = useState<ExtractedBill>(initialBill);

  const handleMetadataChange = <K extends keyof ExtractedBill>(
    field: K,
    value: ExtractedBill[K]
  ) => {
    setBill((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = <K extends keyof ExtractedLineItem>(
    index: number,
    field: K,
    value: ExtractedLineItem[K]
  ) => {
    setBill((prev) => {
      const newLineItems = [...prev.lineItems];
      const item = { ...newLineItems[index], [field]: value };

      // Auto update totalBilled if quantity or unitPrice changes
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? Number(value) : item.quantity;
        const price = field === "unitPrice" ? Number(value) : item.unitPrice;
        item.totalBilled = Math.round(qty * price * 100) / 100;
      }

      newLineItems[index] = item;
      return { ...prev, lineItems: newLineItems };
    });
  };

  const handleAddItem = () => {
    const newItem: ExtractedLineItem = {
      id: `manual-item-${Date.now()}`,
      rawLabel: "New Billable Item",
      code: null,
      serviceDate: bill.admissionDate || new Date().toISOString().slice(0, 10),
      category: "OTHER",
      unit: "UNIT",
      quantity: 1,
      unitPrice: 0,
      totalBilled: 0,
      tpaDeductedAmount: 0,
      tpaDeductionReason: null,
    };
    setBill((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  const handleDeleteItem = (index: number) => {
    if (bill.lineItems.length <= 1) return;
    setBill((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const totalBilled = bill.lineItems.reduce((acc, it) => acc + it.totalBilled, 0);
  const totalDeducted = bill.lineItems.reduce((acc, it) => acc + it.tpaDeductedAmount, 0);

  return (
    <div className="w-full space-y-6 bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-xl">
      {/* Header & Verification Guidance */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Step 3: Trust Zone
            </span>
            <h2 className="text-xl font-bold text-white">
              Human Review & OCR Verification
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            AI extracted these rows from your bill. Please verify quantities, dates, and prices before the deterministic rule engine runs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => onProceedToAudit(bill)}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-md transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            Run Deterministic Audit
          </button>
        </div>
      </div>

      {/* Bill Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-950/70 border border-slate-800/80 rounded-lg">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            Hospital Name
          </label>
          <input
            type="text"
            value={bill.hospitalName}
            onChange={(e) => handleMetadataChange("hospitalName", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
            <Bed className="w-3.5 h-3.5 text-teal-400" />
            Room Category
          </label>
          <select
            value={bill.roomCategory}
            onChange={(e) => handleMetadataChange("roomCategory", e.target.value as RoomCategory)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            {ROOM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            Admission Date
          </label>
          <input
            type="date"
            value={bill.admissionDate || ""}
            onChange={(e) => handleMetadataChange("admissionDate", e.target.value || null)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            Discharge Date
          </label>
          <input
            type="date"
            value={bill.dischargeDate || ""}
            onChange={(e) => handleMetadataChange("dischargeDate", e.target.value || null)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Itemized Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3 w-8">#</th>
              <th className="py-2.5 px-3 min-w-[200px]">Item Label / Description</th>
              <th className="py-2.5 px-3 min-w-[130px]">Category</th>
              <th className="py-2.5 px-3 w-24">Unit</th>
              <th className="py-2.5 px-3 w-20 text-right">Qty</th>
              <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
              <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
              <th className="py-2.5 px-3 w-28 text-right">TPA Cut (₹)</th>
              <th className="py-2.5 px-3 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {bill.lineItems.map((item, index) => (
              <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                  {index + 1}
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={item.rawLabel}
                    onChange={(e) => handleItemChange(index, "rawLabel", e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-teal-400"
                  />
                </td>
                <td className="py-2 px-3">
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleItemChange(index, "category", e.target.value as ExtractedLineItem["category"])
                    }
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-teal-400"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <select
                    value={item.unit}
                    onChange={(e) =>
                      handleItemChange(index, "unit", e.target.value as ExtractedLineItem["unit"])
                    }
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-teal-400"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                    className="w-16 bg-slate-900/80 border border-slate-700/80 rounded px-1.5 py-1 text-right text-slate-200 text-xs focus:outline-none focus:border-teal-400"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="any"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                    className="w-24 bg-slate-900/80 border border-slate-700/80 rounded px-1.5 py-1 text-right text-slate-200 text-xs focus:outline-none focus:border-teal-400"
                  />
                </td>
                <td className="py-2 px-3 text-right font-medium text-white">
                  ₹{item.totalBilled.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    step="any"
                    value={item.tpaDeductedAmount}
                    onChange={(e) => handleItemChange(index, "tpaDeductedAmount", Number(e.target.value))}
                    className="w-20 bg-slate-900/80 border border-purple-800/80 text-purple-300 rounded px-1.5 py-1 text-right text-xs focus:outline-none focus:border-purple-400"
                  />
                </td>
                <td className="py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(index)}
                    disabled={bill.lineItems.length <= 1}
                    className="text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Controls & Sums */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-300 bg-teal-950/60 hover:bg-teal-900/60 border border-teal-700/50 rounded-lg transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item Row
        </button>

        <div className="flex items-center gap-6 text-xs">
          <div className="text-slate-400">
            TPA Deducted:{" "}
            <span className="font-semibold text-purple-400">
              ₹{totalDeducted.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="text-slate-400">
            Total Billed:{" "}
            <span className="font-bold text-white text-sm">
              ₹{totalBilled.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
