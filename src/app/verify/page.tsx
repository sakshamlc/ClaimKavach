'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { useClaimStore } from '@/store/claimStore';
import type { ItemCategory, LineItem } from '@/lib/audit/types';
import {
  toPaise,
  fromPaise,
  formatINR,
  addPaise,
  parseCurrencyToPaise,
} from '@/lib/audit/currency';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Calculator,
  ShieldAlert,
} from 'lucide-react';

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'pharmacy', label: 'Pharmacy / Medicine' },
  { value: 'implant', label: 'Implant / Stent' },
  { value: 'room_rent', label: 'Room Rent' },
  { value: 'icu', label: 'ICU / CCU' },
  { value: 'nursing', label: 'Nursing Charges' },
  { value: 'consumable', label: 'Consumable / Material' },
  { value: 'doctor_visit', label: 'Doctor / Consultation' },
  { value: 'investigation', label: 'Lab / Radiology' },
  { value: 'procedure', label: 'Surgical / Procedure' },
  { value: 'admin_fee', label: 'Admin / Registration Fee' },
  { value: 'other', label: 'Other' },
];

export default function VerifyPage() {
  const router = useRouter();
  const bill = useClaimStore((state) => state.bill);
  const updateBillDate = useClaimStore((state) => state.updateBillDate);
  const updateLineItem = useClaimStore((state) => state.updateLineItem);
  const addLineItem = useClaimStore((state) => state.addLineItem);
  const removeLineItem = useClaimStore((state) => state.removeLineItem);
  const toggleUserEdited = useClaimStore((state) => state.toggleUserEdited);
  const executeAudit = useClaimStore((state) => state.executeAudit);
  const selectedSampleKey = useClaimStore((state) => state.selectedSampleKey);

  if (!bill) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">No Active Bill Found</h2>
          <p className="text-sm text-slate-600">
            Please select a synthetic sample bill or upload a hospital invoice to begin.
          </p>
          <button
            type="button"
            onClick={() => router.push('/upload')}
            className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl"
          >
            Go to Upload
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate live sum of line item totals in integer paise
  const calculatedSumPaise = bill.items.reduce((acc, item) => {
    return addPaise(acc, item.totalBilledPaise || 0);
  }, 0);

  const statedGrandTotalPaise = bill.totalBilledPaise;
  const grandTotalDiffPaise = Math.abs(calculatedSumPaise - statedGrandTotalPaise);
  const isGrandTotalMatched = grandTotalDiffPaise === 0;

  const handleAddNewItem = () => {
    const newId = `ITEM-${bill.items.length + 1}`;
    const newItem: LineItem = {
      id: newId,
      description: 'New Billed Item',
      category: 'other',
      quantity: 1,
      unitRatePaise: 10000,
      totalBilledPaise: 10000,
      confidence: 1.0,
      userEdited: true,
    };
    addLineItem(newItem);
  };

  const handleRunAudit = () => {
    executeAudit();
    router.push('/report');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Page Title & Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                Step 2 of 3
              </span>
              {selectedSampleKey && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  SYNTHETIC FIXTURE
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Verify & Edit Bill Line Items
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Review extracted medicine and supply charges. Marking &ldquo;I checked this&rdquo; confirms arithmetic verification.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunAudit}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-md transition-all self-start md:self-auto cursor-pointer focus:ring-4 focus:ring-primary/20"
          >
            <span>Run Statutory Audit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bill Metadata Header & Date Input */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted block text-[10px] uppercase font-semibold">
              Hospital Name
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {bill.hospital.name || 'Not Specified'}
            </span>
          </div>

          <div>
            <span className="text-muted block text-[10px] uppercase font-semibold">
              Length of Stay
            </span>
            <span className="font-semibold text-slate-800">
              {bill.stay.admissionDate || 'N/A'} to {bill.stay.dischargeDate || 'N/A'} (
              {bill.stay.lengthOfStayNights} nights)
            </span>
          </div>

          <div>
            <label className="text-muted block text-[10px] uppercase font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Bill Invoice Date</span>
            </label>
            <input
              type="date"
              value={bill.billDate || ''}
              onChange={(e) => updateBillDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Live Reconciliation Bar */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isGrandTotalMatched
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
              : 'bg-amber-50/70 border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Calculator className={`w-5 h-5 ${isGrandTotalMatched ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <span className="font-bold block text-sm">
                {isGrandTotalMatched
                  ? 'Grand Total Arithmetic Reconciled'
                  : 'Stated Total vs Calculated Line Sum Discrepancy'}
              </span>
              <span className="text-[11px] opacity-90">
                Sum of items: <strong>{formatINR(calculatedSumPaise)}</strong> | Stated bill total: <strong>{formatINR(statedGrandTotalPaise)}</strong>
              </span>
            </div>
          </div>

          {!isGrandTotalMatched && (
            <div className="font-bold text-amber-950 bg-white px-3 py-1 rounded-lg border border-amber-300 self-start sm:self-auto">
              Difference: {formatINR(grandTotalDiffPaise)}
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Line Items ({bill.items.length})</span>
              <span className="text-[11px] text-muted">
                Low-confidence or unpriced items are highlighted in yellow.
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddNewItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
                  <th className="py-2.5 px-3 w-40">Category</th>
                  <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Unit Rate (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 w-32 text-center">User Checked</th>
                  <th className="py-2.5 px-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {bill.items.map((item, idx) => {
                  const isLowConfidence =
                    (item.confidence !== null && item.confidence !== undefined && item.confidence < 0.85) ||
                    item.quantity === null ||
                    item.unitRatePaise === null;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isLowConfidence ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-slate-900 font-medium focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        {isLowConfidence && (
                          <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                            Low confidence or missing details; verify on bill
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateLineItem(item.id, { category: e.target.value as ItemCategory })
                          }
                          className="w-full px-2 py-1 border border-slate-200 rounded text-slate-900 bg-white"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity ?? ''}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              quantity: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-16 px-2 py-1 border border-slate-200 rounded text-right font-mono text-slate-900"
                        />
                      </td>

                      {/* Unit Rate */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitRatePaise !== null && item.unitRatePaise !== undefined ? fromPaise(item.unitRatePaise) : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItem(item.id, {
                              unitRatePaise: val ? toPaise(parseFloat(val)) : null,
                            });
                          }}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-right font-mono text-slate-900"
                        />
                      </td>

                      {/* Total Billed */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={
                            item.totalBilledPaise !== null && item.totalBilledPaise !== undefined
                              ? fromPaise(item.totalBilledPaise)
                              : ''
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItem(item.id, {
                              totalBilledPaise: val ? toPaise(parseFloat(val)) : null,
                            });
                          }}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-right font-mono font-bold text-slate-900"
                        />
                      </td>

                      {/* User Checked Toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px]">
                          <input
                            type="checkbox"
                            checked={!!item.userEdited}
                            onChange={() => toggleUserEdited(item.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span
                            className={
                              item.userEdited
                                ? 'text-emerald-700 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {item.userEdited ? 'Checked' : 'Unchecked'}
                          </span>
                        </label>
                      </td>

                      {/* Delete Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => router.push('/upload')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            &larr; Back to Upload
          </button>

          <button
            type="button"
            onClick={handleRunAudit}
            className="flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer focus:ring-4 focus:ring-primary/20"
          >
            <span>Run Statutory Audit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
