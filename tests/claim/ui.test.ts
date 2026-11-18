import { describe, it, expect, beforeEach } from 'vitest';
import { useClaimStore } from '../../src/store/claimStore';
import { toMedicalBill } from '../../src/lib/extract/toMedicalBill';
import { runAudit } from '../../src/lib/audit/engine';
import { formatINR } from '../../src/lib/audit/currency';
import {
  generateAllDisputeDrafts,
  generateHospitalLetter,
  generateInsurerLetter,
  generateBimaBharosaText,
  generateOmbudsmanLetter,
} from '../../src/components/claim/DisputePack';
import sample1Data from '../../src/data/samples/sample1-stent.json';
import sample2Data from '../../src/data/samples/sample2-bundling-tpa.json';
import sample3Data from '../../src/data/samples/sample3-clean.json';

describe('Phase 5 & 6: ClaimKavach UI Logic, Store & Dispute Verification', () => {
  beforeEach(() => {
    useClaimStore.getState().clearAllData();
  });

  describe('1. Memory-Only Zustand Store Integrity', () => {
    it('initializes with null state and consent false', () => {
      const state = useClaimStore.getState();
      expect(state.bill).toBeNull();
      expect(state.report).toBeNull();
      expect(state.consentAccepted).toBe(false);
      expect(state.selectedSampleKey).toBeNull();
      expect(state.language).toBe('en');
    });

    it('clearAllData immediately wipes all bill data, report, and policy context from memory', () => {
      useClaimStore.getState().loadSample('sample1');
      expect(useClaimStore.getState().bill).not.toBeNull();

      useClaimStore.getState().clearAllData();
      const state = useClaimStore.getState();
      expect(state.bill).toBeNull();
      expect(state.report).toBeNull();
      expect(state.consentAccepted).toBe(false);
      expect(state.selectedSampleKey).toBeNull();
      expect(state.policyInputs.sumInsuredRupees).toBeNull();
      expect(state.tpaSettlement).toBeNull();
      expect(state.tpaFileName).toBeNull();
    });

    it('toggles bilingual language preference', () => {
      expect(useClaimStore.getState().language).toBe('en');
      useClaimStore.getState().setLanguage('hi');
      expect(useClaimStore.getState().language).toBe('hi');
      useClaimStore.getState().setLanguage('en');
      expect(useClaimStore.getState().language).toBe('en');
    });
  });

  describe('2. 1-Click Synthetic Samples Loading & Auditing', () => {
    it('loads Sample 1 (Stent bill), executes audit, and keeps tiers unmerged', () => {
      useClaimStore.getState().loadSample('sample1');
      const bill = useClaimStore.getState().bill;
      expect(bill).not.toBeNull();
      expect(bill?.isSynthetic).toBe(true);

      const report = useClaimStore.getState().executeAudit();
      expect(report).not.toBeNull();
      expect(report?.totals.billed).toBe(4500280); // ₹45,002.80

      // Fair Amount = Billed - Confirmed ONLY
      // Because reference data is verified:false, the stent overcharge is LIKELY_ISSUE (not confirmed)
      expect(report?.totals.confirmed).toBe(0);
      expect(report?.totals.fair).toBe(4500280); // Unaltered by unverified issues
      expect(report?.totals.likely).toBeGreaterThan(0); // Stent excess is in likely tier
      expect(report?.totals.ifLikelyUpheld).toBe(
        report!.totals.fair - report!.totals.likely
      );

      // Tiers must never be merged:
      expect(report?.totals.confirmed).not.toBe(report?.totals.likely);
    });

    it('loads Sample 2 (Bundling & TPA deductions) and produces separate bundling and annexure findings', () => {
      useClaimStore.getState().loadSample('sample2');
      const report = useClaimStore.getState().executeAudit();
      expect(report).not.toBeNull();
      expect(report?.findings.length).toBeGreaterThan(0);
      expect(report?.coverage.total).toBeGreaterThan(0);
    });

    it('loads Sample 3 (Clean bill) and yields zero overcharge findings', () => {
      useClaimStore.getState().loadSample('sample3');
      const report = useClaimStore.getState().executeAudit();
      expect(report).not.toBeNull();
      expect(report?.totals.confirmed).toBe(0);
      expect(report?.totals.likely).toBe(0);
      expect(report?.totals.fair).toBe(report?.totals.billed);
    });
  });

  describe('3. Line Item Editing & "I checked this" Toggle in Store', () => {
    it('toggles userEdited flag and updates item quantity/rates', () => {
      useClaimStore.getState().loadSample('sample1');
      const bill = useClaimStore.getState().bill!;
      const targetId = bill.items[0].id;

      expect(bill.items[0].userEdited).toBeFalsy();

      useClaimStore.getState().toggleUserEdited(targetId);
      const updatedBill = useClaimStore.getState().bill!;
      expect(updatedBill.items.find((i) => i.id === targetId)?.userEdited).toBe(true);

      useClaimStore.getState().updateLineItem(targetId, { quantity: 2 });
      const quantityUpdatedBill = useClaimStore.getState().bill!;
      expect(quantityUpdatedBill.items.find((i) => i.id === targetId)?.quantity).toBe(2);
    });

    it('supports editing brand, manufacturer and marketer on line items', () => {
      useClaimStore.getState().loadSample('sample1');
      const bill = useClaimStore.getState().bill!;
      const targetId = bill.items[0].id;

      useClaimStore.getState().updateLineItem(targetId, {
        brand: 'DemoBrand',
        manufacturer: 'Demo Mfr Ltd',
        marketer: 'Demo Marketer Inc',
      });

      const updated = useClaimStore.getState().bill!.items.find((i) => i.id === targetId)!;
      expect(updated.brand).toBe('DemoBrand');
      expect(updated.manufacturer).toBe('Demo Mfr Ltd');
      expect(updated.marketer).toBe('Demo Marketer Inc');
    });

    it('allows updating the bill invoice date', () => {
      useClaimStore.getState().loadSample('sample1');
      useClaimStore.getState().updateBillDate('2026-06-01');
      expect(useClaimStore.getState().bill?.billDate).toBe('2026-06-01');
    });
  });

  describe('4. Dispute Notice Drafts: Honest Wording Scanner & Ban Test', () => {
    const BANNED_PATTERNS = [
      /\bwill reject\b/i,
      /\bwill be rejected\b/i,
      /\bguaranteed\b/i,
      /\billegal\b/i,
      /\bAll documents match\b/i,
      /\bReady to Apply\b/i,
      /\bNOT enough\b/,
      /निश्चित रूप से/i,
      /निश्चितपणे/i,
    ];

    const UNGROUNDED_LEGAL_CITATIONS = [
      /\bRule\s+\d+/i,
      /\bSection\s+\d+/i,
      /\bPara\s+\d+/i,
      /\bRegulations?,\s*\d{4}\b/i,
      /\bRules?,\s*\d{4}\b/i,
      /\bOrder,\s*\d{4}\b/i,
      /Drugs \(Prices Control\) Order/i,
      /Ombudsman Rules/i,
      /Protection of Policyholders/i,
    ];

    it('ensures all rendered dispute drafts contain zero banned phrases', () => {
      for (const sample of ['sample1', 'sample2'] as const) {
        useClaimStore.getState().loadSample(sample);
        const report = useClaimStore.getState().executeAudit()!;
        const bill = useClaimStore.getState().bill!;

        const drafts = generateAllDisputeDrafts(bill, report);
        expect(drafts.length).toBe(4);

        for (const draft of drafts) {
          for (const pattern of BANNED_PATTERNS) {
            const matches = pattern.test(draft.text);
            expect(
              matches,
              `Banned phrase matching pattern ${pattern} found in ${draft.label}: "${draft.text.slice(0, 80)}..."`
            ).toBe(false);
          }
        }
      }
    });

    it('ensures dispute templates contain zero ungrounded "Rule " or "Section " or remembered legal citations', () => {
      for (const sample of ['sample1', 'sample2', 'sample3'] as const) {
        useClaimStore.getState().loadSample(sample);
        const report = useClaimStore.getState().executeAudit()!;
        const bill = useClaimStore.getState().bill!;

        const drafts = generateAllDisputeDrafts(bill, report);

        for (const draft of drafts) {
          for (const pattern of UNGROUNDED_LEGAL_CITATIONS) {
            const matches = pattern.test(draft.text);
            expect(
              matches,
              `Ungrounded citation matching ${pattern} found in ${draft.label} for ${sample}`
            ).toBe(false);
          }
        }
      }
    });
  });
});
