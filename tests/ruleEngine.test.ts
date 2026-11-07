import { describe, it, expect } from "vitest";
import { auditBill } from "../src/lib/ruleEngine";
import { ExtractedBill, NppaPriceCapEntry } from "../src/lib/schemas";
import sampleBillsData from "../src/data/sample_bills.json";

describe("ClaimKavach Phase 2 - Rule Engine Unit Tests", () => {
  const verifiedNppaRule: NppaPriceCapEntry = {
    id: "test-nppa-stent-verified",
    canonicalName: "Coronary Stent - Drug Eluting Stent (DES)",
    aliases: ["drug eluting stent", "des stent"],
    category: "IMPLANT_DEVICE",
    normalizedUnit: "UNIT",
    ceilingPriceInr: 38265,
    mandatoryDisclosures: ["Brand", "Batch"],
    verified: true,
    source: {
      documentName: "Official NPPA Gazette Notification",
      clauseOrSchedule: "Schedule-I",
      publishedDate: "2024-04-01",
      url: "https://nppa.gov.in/",
    },
  };

  const unverifiedNppaRule: NppaPriceCapEntry = {
    ...verifiedNppaRule,
    id: "test-nppa-stent-unverified",
    verified: false,
    source: {
      ...verifiedNppaRule.source,
      documentName: "[PLACEHOLDER] Unverified Notification",
    },
  };

  it("emits HIGH_CONFIDENCE when ceiling is breached AND rule.verified === true", () => {
    const bill: ExtractedBill = {
      billId: "test-bill-1",
      isSample: false,
      isSynthetic: true,
      hospitalName: "Test Hospital",
      patientNameRedacted: "Patient A",
      admissionDate: "2025-05-10",
      dischargeDate: "2025-05-13",
      roomCategory: "ICU",
      lineItems: [
        {
          id: "item-stent-1",
          rawLabel: "Coronary Stent - Drug Eluting Stent (DES)",
          code: null,
          serviceDate: "2025-05-11",
          category: "IMPLANT_DEVICE",
          unit: "UNIT",
          quantity: 1,
          unitPrice: 50000,
          totalBilled: 50000,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
      ],
    };

    const audit = auditBill(bill, { customNppaRules: [verifiedNppaRule] });
    expect(audit.highConfidenceFlagCount).toBe(1);
    const result = audit.results[0];
    expect(result.confidenceTier).toBe("HIGH_CONFIDENCE");
    expect(result.colorCategory).toBe("ABOVE_CEILING");
    // 50,000 - 38,265 = 11,735
    expect(result.potentialDisputeAmountInr).toBe(11735);
  });

  it("strictly downgrades to NEEDS_HUMAN_REVIEW when rule.verified === false", () => {
    const bill: ExtractedBill = {
      billId: "test-bill-2",
      isSample: false,
      isSynthetic: true,
      hospitalName: "Test Hospital",
      patientNameRedacted: "Patient B",
      admissionDate: "2025-05-10",
      dischargeDate: "2025-05-13",
      roomCategory: "ICU",
      lineItems: [
        {
          id: "item-stent-unverified",
          rawLabel: "Coronary Stent - Drug Eluting Stent (DES)",
          code: null,
          serviceDate: "2025-05-11",
          category: "IMPLANT_DEVICE",
          unit: "UNIT",
          quantity: 1,
          unitPrice: 50000,
          totalBilled: 50000,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
      ],
    };

    const audit = auditBill(bill, { customNppaRules: [unverifiedNppaRule] });
    expect(audit.highConfidenceFlagCount).toBe(0);
    expect(audit.needsHumanReviewCount).toBe(1);
    const result = audit.results[0];
    expect(result.confidenceTier).toBe("NEEDS_HUMAN_REVIEW");
    expect(result.colorCategory).toBe("REVIEW_FLAG");
  });

  it("guards against unit mismatches (PACK vs UNIT) and prevents false overcharge calculation", () => {
    const bill: ExtractedBill = {
      billId: "test-bill-3",
      isSample: false,
      isSynthetic: true,
      hospitalName: "Test Hospital",
      patientNameRedacted: "Patient C",
      admissionDate: "2025-05-10",
      dischargeDate: "2025-05-13",
      roomCategory: "ICU",
      lineItems: [
        {
          id: "item-pack-unit",
          rawLabel: "Drug Eluting Stent Pack",
          code: null,
          serviceDate: "2025-05-11",
          category: "IMPLANT_DEVICE",
          unit: "PACK",
          quantity: 1,
          unitPrice: 150000,
          totalBilled: 150000,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
      ],
    };

    const audit = auditBill(bill, { customNppaRules: [verifiedNppaRule] });
    const result = audit.results[0];
    expect(result.confidenceTier).toBe("NEEDS_HUMAN_REVIEW");
    expect(result.potentialDisputeAmountInr).toBe(0);
    expect(result.headline).toContain("Unit Mismatch");
  });

  it("flags excess stay duration as REVIEW_POLICY_BASED", () => {
    const bill: ExtractedBill = {
      billId: "test-bill-4",
      isSample: false,
      isSynthetic: true,
      hospitalName: "Test Hospital",
      patientNameRedacted: "Patient D",
      admissionDate: "2025-08-01",
      dischargeDate: "2025-08-05", // 4 days stay
      roomCategory: "GENERAL_WARD",
      lineItems: [
        {
          id: "item-room-excess",
          rawLabel: "General Ward Bed Charges",
          code: null,
          serviceDate: "2025-08-01",
          category: "ROOM_RENT",
          unit: "DAY",
          quantity: 6, // 2 excess days
          unitPrice: 5000,
          totalBilled: 30000,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
      ],
    };

    const audit = auditBill(bill);
    expect(audit.lengthOfStayDays).toBe(4);
    expect(audit.highConfidenceFlagCount).toBe(0);
    const result = audit.results[0];
    expect(result.confidenceTier).toBe("REVIEW_POLICY_BASED");
    expect(result.ruleType).toBe("DUPLICATE_OR_STAY_MATH");
    expect(result.explanation).toContain("6 days billed vs 4 nights recorded. Please confirm the hospital's day-counting method (calendar day vs 24-hour cycle).");
    // 2 excess days * 5000 = 10,000
    expect(result.potentialDisputeAmountInr).toBe(10000);
  });

  it("flags duplicate same-day lab tests with REVIEW tone and DUPLICATE_OR_STAY_MATH", () => {
    const bill: ExtractedBill = {
      billId: "test-bill-5",
      isSample: false,
      isSynthetic: true,
      hospitalName: "Test Hospital",
      patientNameRedacted: "Patient E",
      admissionDate: "2025-08-01",
      dischargeDate: "2025-08-03",
      roomCategory: "GENERAL_WARD",
      lineItems: [
        {
          id: "test-cbc-1",
          rawLabel: "Complete Blood Count",
          code: "CBC-01",
          serviceDate: "2025-08-02",
          category: "DIAGNOSTICS_LAB",
          unit: "TEST",
          quantity: 1,
          unitPrice: 1200,
          totalBilled: 1200,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
        {
          id: "test-cbc-2",
          rawLabel: "Complete Blood Count",
          code: "CBC-01",
          serviceDate: "2025-08-02",
          category: "DIAGNOSTICS_LAB",
          unit: "TEST",
          quantity: 1,
          unitPrice: 1200,
          totalBilled: 1200,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
      ],
    };

    const audit = auditBill(bill);
    expect(audit.reviewFlagCount).toBe(1);
    const duplicate = audit.results.find((r) => r.lineItemId === "test-cbc-2");
    expect(duplicate?.confidenceTier).toBe("REVIEW_POLICY_BASED");
    expect(duplicate?.colorCategory).toBe("REVIEW_FLAG");
    expect(duplicate?.ruleType).toBe("DUPLICATE_OR_STAY_MATH");
    expect(duplicate?.potentialDisputeAmountInr).toBe(1200);
    expect(duplicate?.explanation).toContain("Please clarify why repeated");
    expect(duplicate?.sourceCitation).toBeNull();
  });

  describe("Sample Bills Integration Tests (with forceVerifiedDemoMode: true)", () => {
    const sampleBills = sampleBillsData as ExtractedBill[];

    it("verifies Case 1 (Hero Demo SYN-3334): Cardiac Stent Audit in Demo Mode", () => {
      const case1 = sampleBills[0];
      const audit = auditBill(case1, { forceVerifiedDemoMode: true });

      expect(audit.billId).toBe("SYN-3334");
      expect(audit.totalBilledInr).toBe(342000);
      expect(audit.totalPotentialDisputeInr).toBe(86985);
      expect(audit.estimatedPayableIfAcceptedInr).toBe(255015);
      expect(audit.highConfidenceFlagCount).toBe(1);

      // Verify specific line items
      const stent = audit.results.find((r) => r.lineItemId === "syn-item-3");
      expect(stent?.confidenceTier).toBe("HIGH_CONFIDENCE");
      expect(stent?.colorCategory).toBe("ABOVE_CEILING");
      expect(stent?.potentialDisputeAmountInr).toBe(71735);

      const paracetamol = audit.results.find((r) => r.lineItemId === "syn-item-12");
      expect(paracetamol?.confidenceTier).toBe("CLEAR");
      expect(paracetamol?.potentialDisputeAmountInr).toBe(0);

      const duplicateCbc = audit.results.find((r) => r.lineItemId === "syn-item-9");
      expect(duplicateCbc?.confidenceTier).toBe("REVIEW_POLICY_BASED");
      expect(duplicateCbc?.potentialDisputeAmountInr).toBe(450);
    });

    it("verifies Case 1 (SYN-3334) in Live Mode (forceVerifiedDemoMode: false) regression checklist", () => {
      const case1 = sampleBills[0];
      const audit = auditBill(case1, { forceVerifiedDemoMode: false });

      // 1. Stent row (IMP-DES) is NEEDS_HUMAN_REVIEW (NOT ABOVE_CEILING), cap null, dispute 0
      const stent = audit.results.find((r) => r.lineItemId === "syn-item-3");
      expect(stent?.confidenceTier).toBe("NEEDS_HUMAN_REVIEW");
      expect(stent?.colorCategory).toBe("REVIEW_FLAG");
      expect(stent?.ruleType).toBe("UNMATCHED_OR_LOW_CONFIDENCE");
      expect(stent?.potentialDisputeAmountInr).toBe(0);
      expect(stent?.referenceBenchmarkInr).toBeNull();
      expect(stent?.headline).toBe("Needs Human Review: Unverified Price Ceiling Reference");
      expect(stent?.explanation).toContain("rule is marked unverified");

      // 2. High-confidence total is Rs. 0
      expect(audit.highConfidenceFlagCount).toBe(0);

      // 3. Row 5 (Cardiologist consultation visit, Qty 6 on 4-day stay) flags 2 excess visits for Rs. 3,000
      const consult = audit.results.find((r) => r.lineItemId === "syn-item-5");
      expect(consult?.confidenceTier).toBe("REVIEW_POLICY_BASED");
      expect(consult?.colorCategory).toBe("REVIEW_FLAG");
      expect(consult?.ruleType).toBe("DUPLICATE_OR_STAY_MATH");
      expect(consult?.potentialDisputeAmountInr).toBe(3000);
      expect(consult?.headline).toContain("Visit Count Exceeds Stay Length");
      expect(consult?.headline).toContain("2 excess visit(s)");
      expect(consult?.explanation).toBe("6 visits billed vs 4 nights recorded. Please confirm the visit count against the recorded stay.");

      // Verify admin fee wording
      const adminFee = audit.results.find((r) => r.lineItemId === "syn-item-15");
      expect(adminFee?.explanation).toBe("Please clarify what this administrative fee covers and whether standard non-payable administrative costs are already included in the room/package tariff.");

      // 4. Row 14 (Syringes, pack of 10, PACK vs UNIT) is NEEDS_HUMAN_REVIEW with reason unit mismatch and claim Rs. 0
      const syringes = audit.results.find((r) => r.lineItemId === "syn-item-14");
      expect(syringes?.confidenceTier).toBe("NEEDS_HUMAN_REVIEW");
      expect(syringes?.colorCategory).toBe("REVIEW_FLAG");
      expect(syringes?.ruleType).toBe("UNMATCHED_OR_LOW_CONFIDENCE");
      expect(syringes?.potentialDisputeAmountInr).toBe(0);
      expect(syringes?.headline).toBe("Needs Human Review: Unit Mismatch");

      // 5. Total amount under query is Rs. 15,250 and estimated payable is Rs. 3,26,750
      expect(audit.billId).toBe("SYN-3334");
      expect(audit.totalBilledInr).toBe(342000);
      expect(audit.totalPotentialDisputeInr).toBe(15250);
      expect(audit.estimatedPayableIfAcceptedInr).toBe(326750);
    });

    it("verifies Case 2: Dengue ICU Stay (SYN-7040: 5 ICU days on a 4-day stay -> flags 1 excess ICU day for Rs. 14,000 as REVIEW_POLICY_BASED)", () => {
      const case2 = sampleBills[1];
      const audit = auditBill(case2, { forceVerifiedDemoMode: false });

      expect(audit.billId).toBe("SYN-7040");
      expect(audit.lengthOfStayDays).toBe(4);
      expect(audit.totalBilledInr).toBe(184500);

      const bedRow = audit.results.find((r) => r.lineItemId === "syn-c2-item-1");
      expect(bedRow?.confidenceTier).toBe("REVIEW_POLICY_BASED");
      expect(bedRow?.colorCategory).toBe("REVIEW_FLAG");
      expect(bedRow?.ruleType).toBe("DUPLICATE_OR_STAY_MATH");
      expect(bedRow?.potentialDisputeAmountInr).toBe(14000);
      expect(bedRow?.headline).toContain("Stay Duration Exceeded");
      expect(bedRow?.explanation).toContain("5 days billed vs 4 nights recorded");
      expect(bedRow?.explanation).toContain("calendar day vs 24-hour cycle");

      // Verify consumable explanation for cannula (no nursing text)
      const cannula = audit.results.find((r) => r.lineItemId === "syn-c2-item-10");
      expect(cannula?.explanation).toContain("Consumable Review: Please clarify whether this consumable is included in the procedure or package tariff");

      // High-confidence items: Rs. 0 (since stay overrun is now a review flag)
      const highConfTotal = audit.results
        .filter((r) => r.confidenceTier === "HIGH_CONFIDENCE" && r.ruleVerified)
        .reduce((sum, r) => sum + r.potentialDisputeAmountInr, 0);
      expect(highConfTotal).toBe(0);
      expect(audit.highConfidenceFlagCount).toBe(0);

      // Items to clarify: Rs. 24,900 (14,000 stay overrun + 4,000 nursing + 6,000 monitor + 450 repeat CBC + 450 cannula)
      const itemsToClarifyTotal = audit.results
        .filter((r) => !(r.confidenceTier === "HIGH_CONFIDENCE" && r.ruleVerified))
        .reduce((sum, r) => sum + r.potentialDisputeAmountInr, 0);
      expect(itemsToClarifyTotal).toBe(24900);

      // Total amount under query: Rs. 24,900
      expect(audit.totalPotentialDisputeInr).toBe(24900);

      // Payable if all queried amounts accepted: Rs. 1,59,600
      expect(audit.estimatedPayableIfAcceptedInr).toBe(159600);
    });

    it("verifies Case 4: Clean Control Hospital Bill (produces 0 flags and 0 dispute)", () => {
      const case4 = sampleBills[3];
      const audit = auditBill(case4, { forceVerifiedDemoMode: false });

      expect(audit.billId).toBe("sample-case-4-clean-control");
      expect(audit.totalBilledInr).toBe(11500);
      expect(audit.totalPotentialDisputeInr).toBe(0);
      expect(audit.estimatedPayableIfAcceptedInr).toBe(11500);
      expect(audit.highConfidenceFlagCount).toBe(0);
      expect(audit.reviewFlagCount).toBe(0);
      expect(audit.needsHumanReviewCount).toBe(0);
      expect(audit.results.every((r) => r.confidenceTier === "CLEAR")).toBe(true);
    });

    it("verifies Case 3: Knee Replacement + TPA Deduction (SYN-1258) in Live Mode", () => {
      const case3 = sampleBills[2];
      const audit = auditBill(case3, { forceVerifiedDemoMode: false });

      expect(audit.billId).toBe("SYN-1258");
      expect(audit.lengthOfStayDays).toBe(4);
      expect(audit.totalBilledInr).toBe(265000);

      // Knee implant: unverified NPPA rule → NEEDS_HUMAN_REVIEW, dispute=0
      const kneeImplant = audit.results.find((r) => r.lineItemId === "syn-c3-item-3");
      expect(kneeImplant?.confidenceTier).toBe("NEEDS_HUMAN_REVIEW");
      expect(kneeImplant?.colorCategory).toBe("REVIEW_FLAG");
      expect(kneeImplant?.potentialDisputeAmountInr).toBe(0);
      expect(kneeImplant?.referenceBenchmarkInr).toBeNull();

      // Nursing charges (daily) — TPA deducted Rs. 4,000: disputed
      const nursing = audit.results.find((r) => r.lineItemId === "syn-c3-item-5");
      expect(nursing?.potentialDisputeAmountInr).toBe(4000);
      expect(nursing?.confidenceTier).toBe("REVIEW_POLICY_BASED");

      // Registration/admission fee — TPA deducted Rs. 500: disputed
      const admFee = audit.results.find((r) => r.lineItemId === "syn-c3-item-6");
      expect(admFee?.potentialDisputeAmountInr).toBe(500);

      // Digital thermometer — TPA deducted Rs. 600: disputed
      const therm = audit.results.find((r) => r.lineItemId === "syn-c3-item-7");
      expect(therm?.potentialDisputeAmountInr).toBe(600);

      // IV cannula — TPA deducted Rs. 600: disputed
      const cannula = audit.results.find((r) => r.lineItemId === "syn-c3-item-8");
      expect(cannula?.potentialDisputeAmountInr).toBe(600);

      // Syringes (PACK) — TPA deducted Rs. 450: disputed via TPA path
      const syringes = audit.results.find((r) => r.lineItemId === "syn-c3-item-9");
      expect(syringes?.potentialDisputeAmountInr).toBe(450);

      // Total: nursing(4000) + admFee(500) + thermometer(600) + cannula(600) + syringes(450) = 6150
      expect(audit.totalPotentialDisputeInr).toBe(6150);
      expect(audit.estimatedPayableIfAcceptedInr).toBe(258850);
    });
  });
});
