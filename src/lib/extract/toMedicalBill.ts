/**
 * ClaimKavach — Medical Bill Extracted Document to Domain Model Mapper
 *
 * Converts raw LLM extracted JSON (validated via Zod schemas in medicalBillSchema.ts)
 * into the domain model `MedicalBill` required by the Trust Zone audit engine.
 *
 * NOTE: This module resides OUTSIDE src/lib/audit/** to maintain strict
 * Trust Zone isolation.
 */

import type { MedicalBill, LineItem, ItemCategory } from '../audit/types';
import {
  safeCurrencyToPaise,
  safeParseQuantity,
  type ExtractedMedicalDocument,
  type RawExtractedHospitalBill,
  type RawExtractedTpaSettlement,
  type RawExtractedLineItem,
} from './medicalBillSchema';

/**
 * Maps raw extracted category string to Trust Zone ItemCategory.
 */
export function mapItemCategory(category: string | null | undefined, description: string): ItemCategory {
  if (category) {
    const c = category.toLowerCase().trim();
    if (c === 'room' || c === 'room_rent') return 'room_rent';
    if (c === 'icu' || c === 'ccu' || c === 'nicu' || c === 'micu') return 'icu';
    if (c === 'nursing') return 'nursing';
    if (c === 'pharmacy' || c === 'drug' || c === 'medicine') return 'pharmacy';
    if (c === 'implant' || c === 'stent') return 'implant';
    if (c === 'consumables' || c === 'consumable') return 'consumable';
    if (c === 'consultation' || c === 'doctor_visit' || c === 'visit') return 'doctor_visit';
    if (c === 'investigation' || c === 'lab' || c === 'radiology') return 'investigation';
    if (c === 'procedure' || c === 'surgery' || c === 'ot') return 'procedure';
    if (c === 'admin' || c === 'admin_fee' || c === 'registration') return 'admin_fee';
  }

  // Fallback heuristic based on description
  const d = description.toLowerCase();
  if (d.includes('icu') || d.includes('ccu') || d.includes('intensive care')) return 'icu';
  if (d.includes('room') || d.includes('bed charge') || d.includes('ward')) return 'room_rent';
  if (d.includes('nursing')) return 'nursing';
  if (d.includes('stent') || d.includes('implant') || d.includes('prosthesis') || d.includes('mesh') || d.includes('balloon')) return 'implant';
  if (d.includes('tablet') || d.includes('capsule') || d.includes('syrup') || d.includes('injection') || d.includes('mg') || d.includes('pharma')) return 'pharmacy';
  if (d.includes('thermometer') || d.includes('gloves') || d.includes('syringe') || d.includes('mask') || d.includes('cannula') || d.includes('consumable')) return 'consumable';
  if (d.includes('consultation') || d.includes('visit') || d.includes('doctor')) return 'doctor_visit';
  if (d.includes('blood') || d.includes('scan') || d.includes('x-ray') || d.includes('cbc') || d.includes('mri') || d.includes('test')) return 'investigation';

  return 'other';
}

/**
 * Normalizes text for matching line items to settlement deductions.
 */
function normalizeForMatching(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Maps an extracted line item to a Trust Zone LineItem.
 */
export function mapRawLineItem(
  rawItem: RawExtractedLineItem,
  index: number,
  billLevelIncludesGst?: boolean | null,
  billLevelGstRatePct?: number | null
): { item: LineItem; hasCurrencyError: boolean } {
  let hasCurrencyError = false;

  const unitRateResult = safeCurrencyToPaise(rawItem.unitPrice);
  if (unitRateResult.hasCurrencyError) hasCurrencyError = true;

  const totalBilledResult = safeCurrencyToPaise(rawItem.amount);
  if (totalBilledResult.hasCurrencyError) hasCurrencyError = true;

  const discountResult = safeCurrencyToPaise(rawItem.discount);
  if (discountResult.hasCurrencyError) hasCurrencyError = true;

  const taxResult = safeCurrencyToPaise(rawItem.tax);
  if (taxResult.hasCurrencyError) hasCurrencyError = true;

  const qty = safeParseQuantity(rawItem.quantity);
  const category = mapItemCategory(rawItem.category, rawItem.name);

  let description = rawItem.name;
  if (
    category === 'implant' &&
    (/drug\s*eluting/i.test(rawItem.name) || /\bdes\b/i.test(rawItem.name)) &&
    /stent/i.test(rawItem.name)
  ) {
    description =
      'Drug Eluting Stents (DES) including metallic DES and Bioresorbable Vascular Scaffold (BVS)/ Biodegradable Stents';
  }

  const item: LineItem = {
    id: `item-${index + 1}`,
    description,
    category,
    quantity: qty,
    unitRatePaise: unitRateResult.paise,
    totalBilledPaise: totalBilledResult.paise,
    date: rawItem.date ?? null,
    discountPaise: discountResult.paise,
    taxPaise: taxResult.paise,
    confidence: rawItem.confidence ?? null,
    userEdited: false,
    verified: false,
    billedPriceIncludesGst: billLevelIncludesGst ?? null,
    gstRatePct: billLevelGstRatePct ?? null,
    notes: rawItem.notes ?? undefined,
  };

  return { item, hasCurrencyError };
}

/**
 * Converts an ExtractedMedicalDocument or separate raw bill & settlement into a MedicalBill.
 */
export function toMedicalBill(
  extracted: ExtractedMedicalDocument | {
    bill: RawExtractedHospitalBill | null;
    settlement?: RawExtractedTpaSettlement | null;
    isSynthetic?: boolean;
  }
): MedicalBill {
  const rawBill: RawExtractedHospitalBill = extracted.bill || {
    hospitalName: null,
    billDate: null,
    admissionDate: null,
    dischargeDate: null,
    lengthOfStayNights: null,
    roomType: null,
    items: [],
    statedTotal: null,
    hasDiscountOrTaxColumns: false,
    billedPriceIncludesGst: null,
    gstRatePct: null,
  };
  const rawSettlement = extracted.settlement;
  const isSynthetic = extracted.isSynthetic ?? false;

  let anyCurrencyError = false;

  const billIncludesGst = rawBill.billedPriceIncludesGst ?? null;
  const billGstRatePct = rawBill.gstRatePct ?? null;

  // Map line items
  const items: LineItem[] = (rawBill.items || []).map((rawItem, idx) => {
    const { item, hasCurrencyError } = mapRawLineItem(rawItem, idx, billIncludesGst, billGstRatePct);
    if (hasCurrencyError) anyCurrencyError = true;
    return item;
  });

  // Attach settlement deduction details to matched line items if settlement is present
  if (rawSettlement && Array.isArray(rawSettlement.deductions)) {
    for (const deduction of rawSettlement.deductions) {
      const deductionAmountResult = safeCurrencyToPaise(deduction.deductedAmount);
      if (deductionAmountResult.hasCurrencyError) anyCurrencyError = true;

      const deductionDesc = deduction.itemName || (deduction as any).itemDescription || '';
      const normDesc = normalizeForMatching(deductionDesc);
      // Attempt exact or substring match
      const matchedItem = items.find((it) => {
        const itNorm = normalizeForMatching(it.description);
        return itNorm.includes(normDesc) || normDesc.includes(itNorm);
      });

      if (matchedItem && deductionAmountResult.paise !== null) {
        matchedItem.deductedPaise = deductionAmountResult.paise;
        matchedItem.deductionReason =
          deduction.reason || (deduction as any).reasonDescription || (deduction as any).reasonCode || 'Insurer deduction';
      }
    }
  }

  // Determine total billed paise
  const statedTotalResult = safeCurrencyToPaise(rawBill.statedTotal);
  if (statedTotalResult.hasCurrencyError) anyCurrencyError = true;

  let totalBilledPaise: number;
  if (statedTotalResult.paise !== null) {
    totalBilledPaise = statedTotalResult.paise;
  } else {
    // Sum valid item amounts
    totalBilledPaise = items.reduce((sum, item) => sum + (item.totalBilledPaise || 0), 0);
  }

  const hasUnextractedDiscountOrTax =
    rawBill.hasDiscountOrTaxColumns === true || anyCurrencyError;

  const medicalBill: MedicalBill = {
    id: `bill-${Date.now().toString(36)}`,
    billDate: rawBill.billDate ?? null,
    hospital: {
      name: rawBill.hospitalName || 'Unknown Hospital',
    },
    stay: {
      admissionDate: rawBill.admissionDate || rawBill.billDate || '1970-01-01',
      dischargeDate: rawBill.dischargeDate || rawBill.billDate || '1970-01-01',
      lengthOfStayNights: rawBill.lengthOfStayNights ?? 0,
      roomType: rawBill.roomType ?? undefined,
    },
    items,
    totalBilledPaise,
    hasUnextractedDiscountOrTax,
    billedPriceIncludesGst: billIncludesGst,
    gstRatePct: billGstRatePct,
    isSynthetic,
  };

  if (rawSettlement) {
    medicalBill.policyContext = {
      tpaName: rawSettlement.tpaName ?? undefined,
      claimNumber: undefined,
    };
  }

  return medicalBill;
}
