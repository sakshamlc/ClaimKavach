import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useClaimStore } from '../../src/store/claimStore';
import { MetricCards } from '../../src/components/claim/MetricCards';
import { CoverageMeters } from '../../src/components/claim/CoverageMeters';
import { DisputePack, generateAllDisputeDrafts } from '../../src/components/claim/DisputePack';
import { Header } from '../../src/components/claim/Header';
import { formatINR } from '../../src/lib/audit/currency';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('ClaimKavach End-to-End Workflow in Mock Mode (Sample 1 -> Verify -> Report -> Dispute Pack)', () => {
  beforeEach(() => {
    useClaimStore.getState().clearAllData();
  });

  it('completes the full end-to-end user journey for Sample 1 (Stent Overcharge)', () => {
    // -------------------------------------------------------------
    // Step 1: Initial State & Informed Consent
    // -------------------------------------------------------------
    const store = useClaimStore.getState();
    expect(store.bill).toBeNull();
    expect(store.report).toBeNull();

    useClaimStore.getState().setConsentAccepted(true);
    expect(useClaimStore.getState().consentAccepted).toBe(true);

    // -------------------------------------------------------------
    // Step 2: Load Sample 1 (Coronary Stent Bill)
    // -------------------------------------------------------------
    useClaimStore.getState().loadSample('sample1');
    const bill = useClaimStore.getState().bill!;
    expect(bill).not.toBeNull();
    expect(bill.isSynthetic).toBe(true);
    expect(bill.items.length).toBeGreaterThan(0);

    // Assert Header badge text indicates Synthetic Sample
    const headerHtml = renderToString(React.createElement(Header));
    expect(headerHtml).toContain('SYNTHETIC SAMPLE');
    expect(headerHtml).toContain('Statutory Audit');

    // -------------------------------------------------------------
    // Step 3: Verification Table Operations
    // -------------------------------------------------------------
    // Find the coronary stent line item
    const stentItem = bill.items.find(
      (item) => item.category === 'implant' || item.description.toLowerCase().includes('stent')
    )!;
    expect(stentItem).toBeDefined();
    expect(stentItem.unitRatePaise).toBe(4500000); // ₹45,000.00 billed

    // Toggle user checked flag
    useClaimStore.getState().toggleUserEdited(stentItem.id);
    const verifiedItem = useClaimStore.getState().bill!.items.find((i) => i.id === stentItem.id)!;
    expect(verifiedItem.userEdited).toBe(true);

    // Update structured manufacturer / marketer
    useClaimStore.getState().updateLineItem(stentItem.id, {
      brand: 'DES Coronary Stent',
      manufacturer: 'Demo Implant Mfr',
    });

    // -------------------------------------------------------------
    // Step 4: Execute Statutory Audit & Verify Report Totals
    // -------------------------------------------------------------
    const report = useClaimStore.getState().executeAudit();
    expect(report).not.toBeNull();
    if (!report) throw new Error('Report should not be null');

    // Assert the 5 unmerged financial tiers
    // 1. Total Billed
    expect(report.totals.billed).toBe(4500280); // ₹45,002.80
    // 2. Confirmed Overcharge: 0 (because reference data is verified: false, so it is in likely tier)
    expect(report.totals.confirmed).toBe(0);
    // 3. Likely Issues: includes stent overcharge (> 0)
    expect(report.totals.likely).toBeGreaterThan(0);
    // 4. Needs Review: integer paise
    expect(Number.isInteger(report.totals.needsReview)).toBe(true);
    // 5. Fair Amount: Billed - Confirmed ONLY (never auto-subtracts unverified likely issues)
    expect(report.totals.fair).toBe(report.totals.billed);
    // Adjusted fair amount if likely upheld
    expect(report.totals.ifLikelyUpheld).toBe(report.totals.fair - report.totals.likely);

    // Render MetricCards component and assert 5 cards exist
    const metricCardsHtml = renderToString(React.createElement(MetricCards, { totals: report.totals }));
    expect(metricCardsHtml).toContain('Total Billed');
    expect(metricCardsHtml).toContain('Confirmed Overcharge');
    expect(metricCardsHtml).toContain('Likely Issues');
    expect(metricCardsHtml).toContain('Needs Review');
    expect(metricCardsHtml).toContain('Fair Amount');
    expect(metricCardsHtml).toContain('₹45,002.80');

    // -------------------------------------------------------------
    // Step 5: Coverage Breakdown Meters
    // -------------------------------------------------------------
    expect(report.coverage.arithmeticChecked).toBeGreaterThan(0);
    expect(report.coverage.regulatoryChecked).toBeGreaterThan(0);
    expect(report.coverage.total).toBeGreaterThan(0);

    const coverageHtml = renderToString(React.createElement(CoverageMeters, { coverage: report.coverage }));
    expect(coverageHtml).toContain('Arithmetic Coverage');
    expect(coverageHtml).toContain('Regulatory Coverage');
    expect(coverageHtml).toContain('%');

    // -------------------------------------------------------------
    // Step 6: Dispute Notice Pack & Official Portals
    // -------------------------------------------------------------
    const disputeDrafts = generateAllDisputeDrafts(bill, report);
    expect(disputeDrafts.length).toBe(4);
    expect(disputeDrafts[0].label).toContain('Hospital Billing');
    expect(disputeDrafts[1].label).toContain('Insurer GRO');
    expect(disputeDrafts[2].label).toContain('Bima Bharosa');
    expect(disputeDrafts[3].label).toContain('Ombudsman');

    // Render DisputePack component
    const disputePackHtml = renderToString(
      React.createElement(DisputePack, { bill: useClaimStore.getState().bill!, report })
    );

    // Assert "Verify Before Sending" callout and 3 official portals
    expect(disputePackHtml).toContain('Verify Before Sending Notice');
    expect(disputePackHtml).toContain('irdai.gov.in');
    expect(disputePackHtml).toContain('bimabharosa.irdai.gov.in');
    expect(disputePackHtml).toContain('cioins.co.in');

    // Assert print view button and print styles are present
    expect(disputePackHtml).toContain('Print Dispute Draft');
    expect(disputePackHtml).toContain('print:hidden');

    // Assert draft text contains statutory stent findings
    expect(disputeDrafts[0].text).toContain('Billed Rate: ₹45,000.00');
    expect(disputeDrafts[0].text).toContain('Notified Reference Ceiling:');
    expect(disputeDrafts[0].text).toContain('Questioned Difference:');
  });
});
