import { create } from 'zustand';
import type { MedicalBill, LineItem, AuditReport } from '@/lib/audit/types';
import { runAudit } from '@/lib/audit/engine';
import { toMedicalBill } from '@/lib/extract/toMedicalBill';
import { toPaise } from '@/lib/audit/currency';

// Import synthetic samples
import sample1Data from '@/data/samples/sample1-stent.json';
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
  // Consent
  consentAccepted: boolean;
  setConsentAccepted: (accepted: boolean) => void;

  // Active bill & metadata
  bill: MedicalBill | null;
  fileName: string | null;
  selectedSampleKey: 'sample1' | 'sample2' | 'sample3' | null;

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
  loadSample: (key: 'sample1' | 'sample2' | 'sample3') => void;
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
  consentAccepted: false,
  setConsentAccepted: (accepted) => set({ consentAccepted: accepted }),

  bill: null,
  fileName: null,
  selectedSampleKey: null,

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
    } else if (key === 'sample2') {
      rawData = sample2Data;
      label = 'sample2-bundling-tpa.json';
    } else if (key === 'sample3') {
      rawData = sample3Data;
      label = 'sample3-clean.json';
    }

    if (!rawData) return;

    const mappedBill = toMedicalBill(rawData);
    set({
      bill: mappedBill,
      fileName: label,
      selectedSampleKey: key,
      billedPriceIncludesGst: mappedBill.billedPriceIncludesGst ?? null,
      gstRatePct: mappedBill.gstRatePct ?? null,
      report: null,
      reportTimestamp: null,
    });
  },

  updateBillDate: (date) => {
    const current = get().bill;
    if (!current) return;
    set({
      bill: { ...current, billDate: date },
    });
  },

  updateLineItem: (id, updates) => {
    const current = get().bill;
    if (!current) return;

    const newItems = current.items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, ...updates, userEdited: true };
        return updated;
      }
      return item;
    });

    set({
      bill: { ...current, items: newItems },
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
      selectedSampleKey: null,
      policyInputs: initialPolicyInputs,
      billedPriceIncludesGst: null,
      gstRatePct: null,
      report: null,
      reportTimestamp: null,
    });
  },
}));
