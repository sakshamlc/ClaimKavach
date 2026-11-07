import { describe, it, expect } from "vitest";
import {
  NppaPriceCapEntrySchema,
  IrdaiBundlingEntrySchema,
  IrdaiNonPayableEntrySchema,
  ExtractedBillSchema,
} from "../src/lib/schemas";
import nppaData from "../src/data/nppa_price_caps.json";
import bundlingData from "../src/data/irdai_bundling.json";
import nonPayableData from "../src/data/irdai_nonpayable.json";
import sampleBillsData from "../src/data/sample_bills.json";
import { z } from "zod";

describe("ClaimKavach Phase 1 - Schema & Seed Rules Validation", () => {
  it("validates NPPA Price Caps JSON schema and placeholder verified: false status", () => {
    const parsed = z.array(NppaPriceCapEntrySchema).safeParse(nppaData);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.length).toBeGreaterThanOrEqual(4);
    parsed.data.forEach((entry) => {
      expect(entry.verified).toBe(false);
      expect(entry.source.documentName).toContain("[PLACEHOLDER");
      expect(entry.ceilingPriceInr).toBeGreaterThan(0);
    });
  });

  it("validates IRDAI Bundling JSON schema and placeholder verified: false status", () => {
    const parsed = z.array(IrdaiBundlingEntrySchema).safeParse(bundlingData);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.length).toBeGreaterThanOrEqual(3);
    parsed.data.forEach((entry) => {
      expect(entry.verified).toBe(false);
      expect(entry.source.documentName).toContain("[PLACEHOLDER");
      expect(entry.bundledIntoPackages.length).toBeGreaterThan(0);
    });
  });

  it("validates IRDAI Non-Payable JSON schema and placeholder verified: false status", () => {
    const parsed = z.array(IrdaiNonPayableEntrySchema).safeParse(nonPayableData);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.length).toBeGreaterThanOrEqual(3);
    parsed.data.forEach((entry) => {
      expect(entry.verified).toBe(false);
      expect(entry.source.documentName).toContain("[PLACEHOLDER");
      expect(entry.itemNumber).toBeGreaterThan(0);
    });
  });

  it("validates Synthetic Sample Bills structure and exact billed totals", () => {
    const parsed = z.array(ExtractedBillSchema).safeParse(sampleBillsData);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.length).toBeGreaterThanOrEqual(4);

    const [case1, case2, case3, case4] = parsed.data;

    // Check Case 1: Cardiac Stent (SYN-3334)
    expect(case1.billId).toBe("SYN-3334");
    expect(case1.isSample).toBe(true);
    expect(case1.isSynthetic).toBe(true);
    const case1Total = case1.lineItems.reduce((acc, item) => acc + item.totalBilled, 0);
    expect(case1Total).toBe(342000);

    // Check Case 2: Dengue ICU (SYN-7040)
    expect(case2.billId).toBe("SYN-7040");
    expect(case2.isSample).toBe(true);
    expect(case2.isSynthetic).toBe(true);
    const case2Total = case2.lineItems.reduce((acc, item) => acc + item.totalBilled, 0);
    expect(case2Total).toBe(184500);

    // Check Case 3: Knee TPA (SYN-1258)
    expect(case3.billId).toBe("SYN-1258");
    expect(case3.isSample).toBe(true);
    expect(case3.isSynthetic).toBe(true);
    const case3Total = case3.lineItems.reduce((acc, item) => acc + item.totalBilled, 0);
    expect(case3Total).toBe(265000);

    // Check Case 4: Clean Control
    expect(case4.billId).toBe("sample-case-4-clean-control");
    expect(case4.isSample).toBe(true);
    expect(case4.isSynthetic).toBe(true);
    const case4Total = case4.lineItems.reduce((acc, item) => acc + item.totalBilled, 0);
    expect(case4Total).toBe(11500);
  });
});
