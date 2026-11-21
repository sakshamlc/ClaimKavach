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
  Stepper,
  Button,
  Card,
  Badge,
  Alert,
  SectionHeader,
  StickyActionBar,
} from '@/components/ui';
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
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
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

  // Track expanded cards on mobile
  const [expandedMobileItems, setExpandedMobileItems] = useState<Record<string, boolean>>({});

  const toggleMobileExpand = (id: string) => {
    setExpandedMobileItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!bill) {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col font-sans text-text">
        <Header />
        <main className="flex-1 max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-text-subtle mx-auto" />
          <h2 className="text-h2 font-bold text-text">No Active Bill Found</h2>
          <p className="text-small text-text-muted">
            Please select a synthetic sample bill or upload a hospital invoice to begin.
          </p>
          <Button onClick={() => router.push('/upload')}>
            Go to Upload
          </Button>
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
    <div className="min-h-screen bg-surface-muted flex flex-col font-sans text-text pb-28 sm:pb-12">
      <Header />
      <Stepper currentStep={2} />

      <main className="flex-1 max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Page Header */}
        <SectionHeader
          title={t.verifyTitle}
          description={t.verifySubtitle}
          action={
            <Button
              onClick={handleRunAudit}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              <span>{t.runAuditBtn}</span>
            </Button>
          }
        />

        {/* Missing Bill Date Warning */}
        {!bill.billDate && (
          <Alert variant="warning" title="Invoice Date Missing">
            Hospital invoice date has not been set. Date-dependent statutory ceiling checks (NPPA annual revisions, validity windows) will default to <strong>NEEDS_REVIEW</strong> unless an invoice date is provided.
          </Alert>
        )}

        {/* Invoice Metadata Header Bar */}
        <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-small">
          <div>
            <span className="text-text-muted block text-caption font-semibold uppercase tracking-wider">
              {t.hospitalLabel}
            </span>
            <span className="font-bold text-text text-body mt-0.5 block truncate">
              {bill.hospital.name || 'Hospital Invoice'}
            </span>
            <span className="text-caption text-text-subtle">
              {bill.hospital.city ? `${bill.hospital.city}, ${bill.hospital.state || 'India'}` : 'Location unstated'}
            </span>
          </div>

          <div>
            <span className="text-text-muted block text-caption font-semibold uppercase tracking-wider">
              {t.stayLabel}
            </span>
            <span className="font-bold text-text text-body mt-0.5 block">
              {bill.stay.admissionDate && bill.stay.dischargeDate
                ? `${bill.stay.admissionDate} to ${bill.stay.dischargeDate}`
                : `${bill.stay.lengthOfStayNights} Nights`}
            </span>
            <span className="text-caption text-text-subtle">
              Ward/Room: {bill.stay.roomType || 'Standard'}
            </span>
          </div>

          <div>
            <label
              htmlFor="verify-bill-date"
              className="text-text-muted block text-caption font-semibold uppercase tracking-wider cursor-pointer"
            >
              {t.billDateLabel}
            </label>
            <div className="flex items-center gap-1.5 mt-0.5">
              <input
                id="verify-bill-date"
                type="date"
                value={bill.billDate || ''}
                onChange={(e) => updateBillDate(e.target.value)}
                className="px-2.5 py-1 text-small border border-border rounded-input font-mono font-medium text-text min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              />
            </div>
            <span className="text-[11px] text-text-subtle mt-0.5 block">
              Used for DPCO/NPPA ceiling validity window
            </span>
          </div>
        </Card>

        {/* Live Grand Total Reconciliation Bar (Desktop & Tablet) */}
        <div
          className={`p-4 rounded-card border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-small transition-all shadow-card ${
            isGrandTotalMatched
              ? 'bg-tier-valid-exclusion-bg/40 border-tier-valid-exclusion-border text-tier-valid-exclusion-fg'
              : 'bg-tier-likely-bg/40 border-tier-likely-border text-tier-likely-fg'
          }`}
        >
          <div className="flex items-center gap-3">
            {isGrandTotalMatched ? (
              <CheckCircle2 className="w-5 h-5 text-tier-valid-exclusion-fg shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-tier-likely-fg shrink-0" />
            )}
            <div>
              <span className="font-bold text-body block text-text">
                {isGrandTotalMatched ? t.reconciledTitle : t.reconcileDiffTitle}
              </span>
              <span className="text-caption text-text-muted block">
                Calculated Line Sum: <strong>{formatINR(calculatedSumPaise)}</strong> | Stated Bill Total: <strong>{formatINR(statedGrandTotalPaise)}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-small font-mono self-start sm:self-auto">
            {!isGrandTotalMatched && (
              <div className="text-right">
                <span className="text-caption uppercase text-tier-likely-fg block font-sans">
                  {language === 'hi' ? 'अंतर' : 'Discrepancy'}
                </span>
                <span className="font-bold text-tier-likely-fg text-body">
                  {formatINR(grandTotalDiffPaise)}
                </span>
              </div>
            )}
            <div className="text-right">
              <span className="text-caption uppercase text-text-muted block font-sans">
                {language === 'hi' ? 'गणना योग' : 'Calculated Sum'}
              </span>
              <span className="font-bold text-text text-body">
                {formatINR(calculatedSumPaise)}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table Header Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-h3 font-bold text-text">
              {t.lineItemsTitle} ({bill.items.length})
            </h2>
            <span className="text-caption text-text-muted hidden sm:inline">
              &bull; Review descriptions, rates, quantities, and verify matching formulations
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddNewItem}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t.addItemBtn}
          </Button>
        </div>

        {/* DESKTOP TABLE VIEW: Sticky header, sticky first column, zebra rows, min 44px height */}
        <div className="hidden sm:block">
          <div className="bg-surface rounded-card border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto max-h-[640px]">
              <table className="w-full text-small text-left border-collapse">
                <thead className="bg-surface-subtle text-text font-bold border-b border-border sticky top-0 z-20 shadow-none">
                  <tr>
                    <th scope="col" className="py-3 px-3 w-12 text-center bg-surface-subtle sticky left-0 z-20 border-r border-border">
                      {t.colIndex}
                    </th>
                    <th scope="col" className="py-3 px-3 min-w-[280px] bg-surface-subtle">
                      {t.colDesc}
                    </th>
                    <th scope="col" className="py-3 px-3 w-40 bg-surface-subtle">
                      {t.colCategory}
                    </th>
                    <th scope="col" className="py-3 px-3 w-24 text-right bg-surface-subtle">
                      {t.colQty}
                    </th>
                    <th scope="col" className="py-3 px-3 w-32 text-right bg-surface-subtle">
                      {t.colRate}
                    </th>
                    <th scope="col" className="py-3 px-3 w-32 text-right bg-surface-subtle">
                      {t.colTotal}
                    </th>
                    <th scope="col" className="py-3 px-3 w-32 text-center bg-surface-subtle">
                      {t.colChecked}
                    </th>
                    <th scope="col" className="py-3 px-3 w-16 text-center bg-surface-subtle">
                      {t.colAction}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {bill.items.map((item, idx) => {
                    const isLowConfidence =
                      (item.confidence !== null && item.confidence !== undefined && item.confidence < 0.85) ||
                      item.quantity === null ||
                      item.unitRatePaise === null;

                    return (
                      <tr
                        key={item.id}
                        className={`min-h-[44px] transition-colors duration-150 odd:bg-surface even:bg-surface-subtle/40 hover:bg-surface-subtle ${
                          isLowConfidence ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        {/* Sticky Column: Row Index */}
                        <td className="py-3 px-3 font-mono text-text-subtle text-caption text-center align-top sticky left-0 z-10 bg-inherit border-r border-border">
                          {idx + 1}
                        </td>

                        {/* Description + Structured Manufacturer / Marketer Inputs */}
                        <td className="py-3 px-3 space-y-1.5 align-top">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-border rounded-input text-text font-medium focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                            placeholder="Item Description"
                          />

                          {/* Secondary Structured Formulation Inputs */}
                          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                            <input
                              type="text"
                              placeholder="Brand (optional)"
                              value={item.brand || ''}
                              onChange={(e) => updateLineItem(item.id, { brand: e.target.value || null })}
                              className="px-2 py-1 border border-border rounded-input text-text placeholder:text-text-subtle"
                              title="Brand name printed on bill/packaging"
                            />
                            <input
                              type="text"
                              placeholder="Manufacturer"
                              value={item.manufacturer || ''}
                              onChange={(e) => updateLineItem(item.id, { manufacturer: e.target.value || null })}
                              className="px-2 py-1 border border-border rounded-input text-text placeholder:text-text-subtle"
                              title="Manufacturer for retail formulation match"
                            />
                            <input
                              type="text"
                              placeholder="Marketer"
                              value={item.marketer || ''}
                              onChange={(e) => updateLineItem(item.id, { marketer: e.target.value || null })}
                              className="px-2 py-1 border border-border rounded-input text-text placeholder:text-text-subtle"
                              title="Marketer for retail formulation match"
                            />
                          </div>

                          {/* Low Confidence Indicator with Text + Icon (not color alone) */}
                          {isLowConfidence && (
                            <div className="flex items-center gap-1.5 text-caption font-semibold text-unverified-fg bg-unverified-bg px-2 py-0.5 rounded-chip border border-unverified-border w-fit">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>Low confidence; verify on printed invoice</span>
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 align-top">
                          <select
                            value={item.category}
                            onChange={(e) =>
                              updateLineItem(item.id, { category: e.target.value as ItemCategory })
                            }
                            className="w-full px-2.5 py-2 border border-border rounded-input text-text bg-surface min-h-[44px]"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3 text-right align-top">
                          <input
                            type="number"
                            step="any"
                            value={item.quantity ?? ''}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                quantity: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="w-20 px-2.5 py-1.5 border border-border rounded-input text-right font-mono text-text min-h-[44px]"
                          />
                        </td>

                        {/* Unit Rate */}
                        <td className="py-3 px-3 text-right align-top">
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
                            className="w-28 px-2.5 py-1.5 border border-border rounded-input text-right font-mono text-text min-h-[44px]"
                          />
                        </td>

                        {/* Total Billed */}
                        <td className="py-3 px-3 text-right align-top">
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
                            className="w-28 px-2.5 py-1.5 border border-border rounded-input text-right font-mono font-bold text-text min-h-[44px]"
                          />
                        </td>

                        {/* User Checked Toggle */}
                        <td className="py-3 px-3 text-center align-top">
                          <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer text-caption select-none min-h-[44px] min-w-[44px]">
                            <input
                              type="checkbox"
                              checked={!!item.userEdited}
                              onChange={() => toggleUserEdited(item.id)}
                              className="rounded-chip border-border text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className={item.userEdited ? 'font-bold text-primary' : 'text-text-muted'}>
                              {item.userEdited ? 'Checked' : 'Check'}
                            </span>
                          </label>
                        </td>

                        {/* Action: Delete */}
                        <td className="py-3 px-3 text-center align-top">
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="p-2 text-text-subtle hover:text-tier-confirmed-fg rounded-chip transition-colors focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
                            title="Delete line item"
                            aria-label={`Delete line item ${idx + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MOBILE STACKED CARDS VIEW: No horizontal page overflow */}
        <div className="sm:hidden space-y-4">
          {bill.items.map((item, idx) => {
            const isExpanded = !!expandedMobileItems[item.id];
            const isLowConfidence =
              (item.confidence !== null && item.confidence !== undefined && item.confidence < 0.85) ||
              item.quantity === null ||
              item.unitRatePaise === null;

            return (
              <Card
                key={item.id}
                className={`p-4 space-y-3 ${isLowConfidence ? 'border-amber-300 bg-amber-50/20' : ''}`}
              >
                {/* Header row: Index & Delete */}
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-surface-subtle text-text-muted flex items-center justify-center text-caption font-mono font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-caption font-mono text-text-muted">
                      {item.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-caption min-h-[44px] px-2">
                      <input
                        type="checkbox"
                        checked={!!item.userEdited}
                        onChange={() => toggleUserEdited(item.id)}
                        className="rounded-chip border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className={item.userEdited ? 'font-bold text-primary' : 'text-text-muted'}>
                        {item.userEdited ? 'Checked' : 'Verify'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="p-2 text-text-subtle hover:text-tier-confirmed-fg rounded-chip min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      aria-label={`Remove item ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description Input */}
                <div>
                  <label htmlFor={`mobile-desc-${item.id}`} className="block text-caption font-semibold text-text-muted mb-1">
                    {t.colDesc}
                  </label>
                  <input
                    id={`mobile-desc-${item.id}`}
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                    className="w-full px-3 py-2 text-small border border-border rounded-input font-medium text-text min-h-[44px]"
                  />
                </div>

                {/* Category Select */}
                <div>
                  <label htmlFor={`mobile-cat-${item.id}`} className="block text-caption font-semibold text-text-muted mb-1">
                    {t.colCategory}
                  </label>
                  <select
                    id={`mobile-cat-${item.id}`}
                    value={item.category}
                    onChange={(e) =>
                      updateLineItem(item.id, { category: e.target.value as ItemCategory })
                    }
                    className="w-full px-3 py-2 text-small border border-border rounded-input bg-surface text-text min-h-[44px]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity & Unit Rate & Total Billed in 3 Columns */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor={`mobile-qty-${item.id}`} className="block text-caption font-semibold text-text-muted mb-1">
                      {t.colQty}
                    </label>
                    <input
                      id={`mobile-qty-${item.id}`}
                      type="number"
                      step="any"
                      value={item.quantity ?? ''}
                      onChange={(e) =>
                        updateLineItem(item.id, {
                          quantity: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="w-full px-2 py-2 text-small border border-border rounded-input text-right font-mono min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label htmlFor={`mobile-rate-${item.id}`} className="block text-caption font-semibold text-text-muted mb-1">
                      {t.colRate}
                    </label>
                    <input
                      id={`mobile-rate-${item.id}`}
                      type="number"
                      step="0.01"
                      value={item.unitRatePaise !== null && item.unitRatePaise !== undefined ? fromPaise(item.unitRatePaise) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateLineItem(item.id, {
                          unitRatePaise: val ? toPaise(parseFloat(val)) : null,
                        });
                      }}
                      className="w-full px-2 py-2 text-small border border-border rounded-input text-right font-mono min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label htmlFor={`mobile-total-${item.id}`} className="block text-caption font-semibold text-text-muted mb-1">
                      {t.colTotal}
                    </label>
                    <input
                      id={`mobile-total-${item.id}`}
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
                      className="w-full px-2 py-2 text-small border border-border rounded-input text-right font-mono font-bold min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Low Confidence Callout */}
                {isLowConfidence && (
                  <div className="flex items-center gap-1.5 text-caption font-semibold text-unverified-fg bg-unverified-bg p-2 rounded-chip border border-unverified-border">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Low confidence; verify against printed bill details</span>
                  </div>
                )}

                {/* Expand / Collapse Secondary Details (Brand, Manufacturer, Marketer) */}
                <div className="pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => toggleMobileExpand(item.id)}
                    className="flex items-center justify-between w-full text-caption font-semibold text-text-muted hover:text-text min-h-[44px]"
                  >
                    <span>Formulation Details (Brand, Manufacturer)</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 pt-2">
                      <input
                        type="text"
                        placeholder="Brand name printed on bill"
                        value={item.brand || ''}
                        onChange={(e) => updateLineItem(item.id, { brand: e.target.value || null })}
                        className="w-full px-2.5 py-1.5 text-small border border-border rounded-input min-h-[44px]"
                      />
                      <input
                        type="text"
                        placeholder="Manufacturer name"
                        value={item.manufacturer || ''}
                        onChange={(e) => updateLineItem(item.id, { manufacturer: e.target.value || null })}
                        className="w-full px-2.5 py-1.5 text-small border border-border rounded-input min-h-[44px]"
                      />
                      <input
                        type="text"
                        placeholder="Marketer name"
                        value={item.marketer || ''}
                        onChange={(e) => updateLineItem(item.id, { marketer: e.target.value || null })}
                        className="w-full px-2.5 py-1.5 text-small border border-border rounded-input min-h-[44px]"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      {/* MOBILE STICKY ACTION & RECONCILE BAR */}
      <StickyActionBar>
        <div className="flex flex-col text-caption font-mono">
          <span className="text-text-muted">Total: {formatINR(calculatedSumPaise)}</span>
          <span className={isGrandTotalMatched ? 'text-tier-valid-exclusion-fg font-bold' : 'text-tier-likely-fg font-bold'}>
            {isGrandTotalMatched ? 'Reconciled' : `Diff: ${formatINR(grandTotalDiffPaise)}`}
          </span>
        </div>

        <Button
          onClick={handleRunAudit}
          size="md"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          <span>{t.runAuditBtn}</span>
        </Button>
      </StickyActionBar>

      <Footer />
    </div>
  );
}
