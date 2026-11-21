import { create } from 'zustand';
import type { MedicalBill, LineItem, AuditReport } from '@/lib/audit/types';
import { runAudit } from '@/lib/audit/engine';
import { toMedicalBill } from '@/lib/extract/toMedicalBill';
import { toPaise } from '@/lib/audit/currency';
import type { ClaimLanguage } from '@/lib/claimI18n';

// Import synthetic samples
import sample1Data from '@/data/samples/sample1-stent.json';
import sample1bData from '@/data/samples/sample1b-stent-post-april.json';
import sample2Data from '@/data/samples/sample2-bundling-tpa.json';
import sample3Data from '@/data/samples/sample3-clean.json';

export interface PolicyInputs {
  sumInsuredRupees: number | null;
  roomRentLimitRupees: number | null;
  copayPercent: number | null;
  roomDays: number | null;
  billedRoomRateRupees: number | null;
}

export interface ClaimState {
  // Language (English / Hindi)
  language: ClaimLanguage;
  setLanguage: (lang: ClaimLanguage) => void;

  // Consent
  consentAccepted: boolean;
  setConsentAccepted: (accepted: boolean) => void;

  // Active bill & metadata
  bill: MedicalBill | null;
  fileName: string | null;
  selectedSampleKey: 'sample1' | 'sample1b' | 'sample2' | 'sample3' | null;

  // Optional TPA settlement upload
  tpaSettlement: any | null;
  tpaFileName: string | null;
  setTpaSettlement: (tpa: any | null, fileName?: string) => void;

  // Policy options
  policyInputs: PolicyInputs;
  setPolicyInputs: (inputs: Partial<PolicyInputs>) => void;

  // GST options
  billedPriceIncludesGst: boolean | null;
  gstRatePct: number | null;
  setGstOptions: (includesGst: boolean | null, ratePct: number | null) => void;

  // Audit report & UI timestamp
  report: AuditReport | null;
  reportTimestamp: string | null;

  // Actions
  setBill: (bill: MedicalBill, fileName?: string) => void;
  loadSample: (key: 'sample1' | 'sample1b' | 'sample2' | 'sample3') => void;
  updateBillDate: (date: string) => void;
  updateLineItem: (id: string, updates: Partial<LineItem>) => void;
  addLineItem: (item: LineItem) => void;
  removeLineItem: (id: string) => void;
  toggleUserEdited: (id: string) => void;
  executeAudit: () => AuditReport | null;
  clearAllData: () => void;
}

const initialPolicyInputs: PolicyInputs = {
  sumInsuredRupees: null,
  roomRentLimitRupees: null,
  copayPercent: null,
  roomDays: null,
  billedRoomRateRupees: null,
};

export const useClaimStore = create<ClaimState>((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  consentAccepted: false,
  setConsentAccepted: (accepted) => set({ consentAccepted: accepted }),

  bill: null,
  fileName: null,
  selectedSampleKey: null,

  tpaSettlement: null,
  tpaFileName: null,
  setTpaSettlement: (tpa, fileName) => {
    set({
      tpaSettlement: tpa,
      tpaFileName: fileName || null,
    });

    // If an active bill exists and TPA settlement provides deduction line items, match by item name
    const current = get().bill;
    if (current && tpa && Array.isArray(tpa.items)) {
      const updatedItems = current.items.map((item) => {
        const matched = tpa.items.find(
          (ti: any) =>
            ti.description &&
            item.description.toLowerCase().includes(ti.description.toLowerCase().slice(0, 8))
        );
        if (matched && (matched.deductedPaise || matched.disallowedPaise)) {
          return {
            ...item,
            deductedPaise: matched.deductedPaise || matched.disallowedPaise,
            deductionReason: matched.deductionReason || matched.reason || item.deductionReason,
          };
        }
        return item;
      });
      set({ bill: { ...current, items: updatedItems } });
    }
  },

  policyInputs: initialPolicyInputs,
  setPolicyInputs: (inputs) =>
    set((state) => ({
      policyInputs: { ...state.policyInputs, ...inputs },
    })),

  billedPriceIncludesGst: null,
  gstRatePct: null,
  setGstOptions: (includesGst, ratePct) =>
    set({ billedPriceIncludesGst: includesGst, gstRatePct: ratePct }),

  report: null,
  reportTimestamp: null,

  setBill: (bill, fileName) =>
    set({
      bill,
      fileName: fileName || null,
      selectedSampleKey: null,
      report: null,
      reportTimestamp: null,
    }),

  loadSample: (key) => {
    let rawData: any = null;
    let label = '';
    if (key === 'sample1') {
      rawData = sample1Data;
      label = 'sample1-stent.json';
    } else if (key === 'sample1b') {
      rawData = sample1bData;
      label = 'sample1b-stent-post-april.json';
    } else if (key === 'sample2') {
      rawData = sample2Data;
      label = 'sample2-bundling-tpa.json';
    } else if (key === 'sample3') {
      rawData = sample3Data;
      label = 'sample3-clean.json';
    }

    if (rawData) {
      const domainBill = toMedicalBill(rawData);
      set({
        bill: domainBill,
        fileName: label,
        selectedSampleKey: key,
        report: null,
        reportTimestamp: null,
        policyInputs: {
          sumInsuredRupees: 500000,
          roomRentLimitRupees: 5000,
          copayPercent: 10,
          roomDays: domainBill.stay.lengthOfStayNights || 3,
          billedRoomRateRupees: 6000,
        },
      });
    }
  },

  updateBillDate: (date) => {
    const current = get().bill;
    if (!current) return;
    set({
      bill: {
        ...current,
        billDate: date,
      },
    });
  },

  updateLineItem: (id, updates) => {
    const current = get().bill;
    if (!current) return;
    set({
      bill: {
        ...current,
        items: current.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    });
  },

  addLineItem: (item) => {
    const current = get().bill;
    if (!current) return;
    set({
      bill: {
        ...current,
        items: [...current.items, { ...item, userEdited: true }],
      },
    });
  },

  removeLineItem: (id) => {
    const current = get().bill;
    if (!current) return;
    set({
      bill: {
        ...current,
        items: current.items.filter((i) => i.id !== id),
      },
    });
  },

  toggleUserEdited: (id) => {
    const current = get().bill;
    if (!current) return;
    set({
      bill: {
        ...current,
        items: current.items.map((i) =>
          i.id === id ? { ...i, userEdited: !i.userEdited } : i
        ),
      },
    });
  },

  executeAudit: () => {
    const current = get().bill;
    if (!current) return null;

    const policy = get().policyInputs;
    const gstIncludes = get().billedPriceIncludesGst;
    const gstRate = get().gstRatePct;

    // Attach policy context and GST options to bill if configured
    const billToAudit: MedicalBill = {
      ...current,
      billedPriceIncludesGst: gstIncludes !== null ? gstIncludes : current.billedPriceIncludesGst,
      gstRatePct: gstRate !== null ? gstRate : current.gstRatePct,
      policyContext: {
        ...current.policyContext,
        sumInsuredPaise: policy.sumInsuredRupees ? toPaise(policy.sumInsuredRupees) ?? undefined : undefined,
        roomRentLimitPaise: policy.roomRentLimitRupees ? toPaise(policy.roomRentLimitRupees) ?? undefined : undefined,
        hasProportionateDeductionClause: !!policy.roomRentLimitRupees,
        copayPercent: policy.copayPercent ?? undefined,
        roomDays: policy.roomDays ?? undefined,
        billedRoomRatePaise: policy.billedRoomRateRupees ? toPaise(policy.billedRoomRateRupees) ?? undefined : undefined,
      },
    };

    const generatedReport = runAudit(billToAudit);
    const nowIso = new Date().toISOString();

    set({
      report: generatedReport,
      reportTimestamp: nowIso,
    });

    return generatedReport;
  },

  clearAllData: () => {
    set({
      consentAccepted: false,
      bill: null,
      fileName: null,
      tpaSettlement: null,
      tpaFileName: null,
      selectedSampleKey: null,
      policyInputs: initialPolicyInputs,
      billedPriceIncludesGst: null,
      gstRatePct: null,
      report: null,
      reportTimestamp: null,
    });
  },
}));