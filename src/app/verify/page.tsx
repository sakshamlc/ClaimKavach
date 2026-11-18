'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';
import type { ItemCategory, LineItem } from '@/lib/audit/types';
import {
  toPaise,
  fromPaise,
  formatINR,
  addPaise,
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
  const language = useClaimStore((state) => state.language);

  const t = claimTranslations[language] || claimTranslations.en;

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

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Header & Meta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t.verifyTitle}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {t.verifySubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunAudit}
            className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>{t.runAuditBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Metadata Header Bar */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
              {t.hospitalLabel}
            </span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">
              {bill.hospital.name || 'Hospital Invoice'}
            </span>
            <span className="text-[11px] text-slate-500">
              {bill.hospital.city ? `${bill.hospital.city}, ${bill.hospital.state || 'India'}` : 'Location unstated'}
            </span>
          </div>

          <div>
            <span className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
              {t.stayLabel}
            </span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {bill.stay.admissionDate && bill.stay.dischargeDate
                ? `${bill.stay.admissionDate} to ${bill.stay.dischargeDate}`
                : `${bill.stay.lengthOfStayNights} Nights`}
            </span>
            <span className="text-[11px] text-slate-500">
              Ward/Room: {bill.stay.roomType || 'Standard'}
            </span>
          </div>

          <div>
            <span className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
              {t.billDateLabel}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <input
                type="date"
                value={bill.billDate || ''}
                onChange={(e) => updateBillDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded font-mono font-medium text-slate-800"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Used for DPCO/NPPA ceiling validity window
            </span>
          </div>
        </div>

        {/* Live Grand Total Reconciliation Bar */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
            isGrandTotalMatched
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {isGrandTotalMatched ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold text-sm block">
                {isGrandTotalMatched ? t.reconciledTitle : t.reconcileDiffTitle}
              </span>
              <span className="text-[11px] opacity-90 block">
                Calculated Line Sum: <strong>{formatINR(calculatedSumPaise)}</strong> | Stated Bill Total: <strong>{formatINR(statedGrandTotalPaise)}</strong>
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
              <span className="font-bold text-slate-900 text-sm">{t.lineItemsTitle} ({bill.items.length})</span>
              <span className="text-[11px] text-muted hidden sm:inline">
                {t.lineItemsSub}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddNewItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addItemBtn}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10">{t.colIndex}</th>
                  <th className="py-2.5 px-3 min-w-[260px]">{t.colDesc}</th>
                  <th className="py-2.5 px-3 w-36">{t.colCategory}</th>
                  <th className="py-2.5 px-3 w-20 text-right">{t.colQty}</th>
                  <th className="py-2.5 px-3 w-28 text-right">{t.colRate}</th>
                  <th className="py-2.5 px-3 w-28 text-right">{t.colTotal}</th>
                  <th className="py-2.5 px-3 w-28 text-center">{t.colChecked}</th>
                  <th className="py-2.5 px-3 w-12 text-center">{t.colAction}</th>
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
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] align-top">
                        {idx + 1}
                      </td>

                      {/* Description + Structured Brand / Mfg / Marketer Inputs */}
                      <td className="py-2.5 px-3 space-y-1.5 align-top">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-slate-900 font-medium focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="Item Description"
                        />

                        {/* Structured Brand, Manufacturer, Marketer inputs for Retail Formulation Match */}
                        <div className="grid grid-cols-3 gap-1 text-[11px]">
                          <input
                            type="text"
                            placeholder="Brand (optional)"
                            value={item.brand || ''}
                            onChange={(e) => updateLineItem(item.id, { brand: e.target.value || null })}
                            className="px-1.5 py-0.5 border border-slate-200 rounded text-slate-700 placeholder:text-slate-400"
                            title="Brand name printed on bill/packaging"
                          />
                          <input
                            type="text"
                            placeholder="Manufacturer"
                            value={item.manufacturer || ''}
                            onChange={(e) => updateLineItem(item.id, { manufacturer: e.target.value || null })}
                            className="px-1.5 py-0.5 border border-slate-200 rounded text-slate-700 placeholder:text-slate-400"
                            title="Manufacturer for retail formulation match"
                          />
                          <input
                            type="text"
                            placeholder="Marketer"
                            value={item.marketer || ''}
                            onChange={(e) => updateLineItem(item.id, { marketer: e.target.value || null })}
                            className="px-1.5 py-0.5 border border-slate-200 rounded text-slate-700 placeholder:text-slate-400"
                            title="Marketer for retail formulation match"
                          />
                        </div>

                        {isLowConfidence && (
                          <span className="text-[10px] text-amber-700 font-semibold block">
                            Low confidence or missing details; verify on bill
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 align-top">
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
                      <td className="py-2.5 px-3 text-right align-top">
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
                      <td className="py-2.5 px-3 text-right align-top">
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
                      <td className="py-2.5 px-3 text-right align-top">
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
                      <td className="py-2.5 px-3 text-center align-top">
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
                            {item.userEdited ? t.checkedStatus : t.uncheckedStatus}
                          </span>
                        </label>
                      </td>

                      {/* Delete Action */}
                      <td className="py-2.5 px-3 text-center align-top">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            &larr; {t.backBtn}
          </button>

          <button
            type="button"
            onClick={handleRunAudit}
            className="flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer focus:ring-4 focus:ring-primary/20"
          >
            <span>{t.runAuditBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
