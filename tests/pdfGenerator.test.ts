import { describe, it, expect } from "vitest";
import { generateGrievancePdf } from "../src/lib/pdfGenerator";
import { auditBill } from "../src/lib/ruleEngine";
import { ExtractedBill } from "../src/lib/schemas";
import sampleBillsData from "../src/data/sample_bills.json";

describe("ClaimKavach - pdfGenerator & Audit Pipeline Tests", () => {
  const sampleBills = sampleBillsData as unknown as ExtractedBill[];
  const case1 = sampleBills[0];
  const case2 = sampleBills[1];
  const case3 = sampleBills[2];

  it("confirms Cardiac Stent sample bill goes through verified-rule gate: NEEDS_HUMAN_REVIEW with no cap figure outside demo mode", () => {
    // Outside demo mode, unverified seed rules cannot emit HIGH_CONFIDENCE or ABOVE_CEILING
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: false });
    const stentResult = auditSummary.results.find((r) => r.lineItemId === "syn-item-3" || r.rawLabel.toLowerCase().includes("stent"));

    expect(stentResult).toBeDefined();
    expect(stentResult?.confidenceTier).toBe("NEEDS_HUMAN_REVIEW");
    expect(stentResult?.colorCategory).not.toBe("ABOVE_CEILING");
    expect(stentResult?.referenceBenchmarkInr).toBeNull();
    expect(stentResult?.ruleVerified).toBe(false);
    expect(stentResult?.headline).toBe("Needs Human Review: Unverified Price Ceiling Reference");
  });

  it("fails if generated PDF text contains 'PLACEHOLDER' when demo mode is off", () => {
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: false });
    const doc = generateGrievancePdf(case1, auditSummary, { isDemoMode: false });

    const pageCount = (doc.internal as any).getNumberOfPages();
    let fullPdfText = "";
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const textLines = (doc as any).internal.pages[p] || [];
      fullPdfText += JSON.stringify(textLines);
    }

    expect(fullPdfText.toUpperCase()).not.toContain("PLACEHOLDER");
  });

  it("prints mandatory warning banner 'DRAFT - REFERENCE DATA NOT VERIFIED - DO NOT SEND' on page 1 whenever any row is unverified (both demo mode on or off)", () => {
    // Test Case A: Demo mode is ON
    const auditSummaryDemo = auditBill(case1, { forceVerifiedDemoMode: true });
    const docDemo = generateGrievancePdf(case1, auditSummaryDemo, { isDemoMode: true });
    const page1Demo = JSON.stringify((docDemo as any).internal.pages[1] || []);
    expect(page1Demo).toContain("DRAFT - REFERENCE DATA NOT VERIFIED - DO NOT SEND");

    // Test Case B: Demo mode is OFF
    const auditSummaryUnverified = auditBill(case1, { forceVerifiedDemoMode: false });
    const docUnverified = generateGrievancePdf(case1, auditSummaryUnverified, { isDemoMode: false });
    const page1Unverified = JSON.stringify((docUnverified as any).internal.pages[1] || []);
    expect(page1Unverified).toContain("DRAFT - REFERENCE DATA NOT VERIFIED - DO NOT SEND");
  });

  it("does NOT print DRAFT banner when all items are verified and demo mode is OFF", () => {
    const stayOnlyBill: ExtractedBill = {
      billId: "verified-stay-bill",
      isSample: false,
      isSynthetic: true,
      hospitalName: "Apollo City Care",
      patientNameRedacted: "Patient Verified",
      admissionDate: "2025-01-01",
      dischargeDate: "2025-01-03",
      roomCategory: "GENERAL_WARD",
      lineItems: [
        {
          id: "stay-item-v",
          rawLabel: "General Ward Bed Charges",
          code: null,
          serviceDate: "2025-01-01",
          category: "ROOM_RENT",
          unit: "DAY",
          quantity: 4, // 2 extra days
          unitPrice: 2000,
          totalBilled: 8000,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
      ],
    };

    const auditSummary = auditBill(stayOnlyBill, { forceVerifiedDemoMode: false });
    const doc = generateGrievancePdf(stayOnlyBill, auditSummary, { isDemoMode: false });
    const page1 = JSON.stringify((doc as any).internal.pages[1] || []);
    expect(page1).not.toContain("DRAFT - REFERENCE DATA NOT VERIFIED - DO NOT SEND");
  });

  it("replaces fallback names: 'Sample Metro Care Hospital (Synthetic Demo)' for samples, omits Bill ID and extracted-fallback", () => {
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: true });

    // Test Sample Bill
    const docSample = generateGrievancePdf(case1, auditSummary, { isDemoMode: true });
    const sampleText = JSON.stringify((docSample as any).internal.pages[1] || []).replace(/\\/g, "");
    expect(sampleText).toContain("Sample Metro Care Hospital (Synthetic Demo)");
    expect(sampleText).not.toContain("sample-case-1-cardiac-stent");
    expect(sampleText).not.toContain("extracted-fallback");

    // Test Non-Sample Uploaded Bill with no custom name provided
    const nonSampleBill: ExtractedBill = {
      ...case1,
      isSample: false,
      isSynthetic: false,
      billId: "SYN-3334",
      hospitalName: "Simulated Extraction (Gemini Key Not Configured)",
    };
    const docNonSample = generateGrievancePdf(nonSampleBill, auditSummary, { isDemoMode: true });
    const nonSampleText = JSON.stringify((docNonSample as any).internal.pages[1] || []).replace(/\\/g, "");
    expect(nonSampleText).not.toContain("extracted-fallback");
  });

  it("says 'reference data prepared from public guidelines' only once, in the first paragraph (not in sub-header)", () => {
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: true });
    const doc = generateGrievancePdf(case1, auditSummary, { isDemoMode: true });

    const pageCount = (doc.internal as any).getNumberOfPages();
    let fullPdfText = "";
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const textLines = (doc as any).internal.pages[p] || [];
      fullPdfText += JSON.stringify(textLines);
    }

    const unescapedText = fullPdfText.replace(/\\/g, "");
    const phrase = "reference data prepared from public guidelines";
    const occurrences = (unescapedText.match(new RegExp(phrase, "g")) || []).length;
    expect(occurrences).toBe(1);
  });

  it("renames last table column to 'Finding / Question for hospital'", () => {
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: true });
    const doc = generateGrievancePdf(case1, auditSummary, { isDemoMode: true });

    const text = JSON.stringify((doc as any).internal.pages[1] || []).replace(/\\/g, "");
    expect(text).toContain("Finding / Question for hospital");
  });

  it("renames 'Total potential dispute' to 'Total amount under query'", () => {
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: true });
    const doc = generateGrievancePdf(case1, auditSummary, { isDemoMode: true });

    const text = JSON.stringify((doc as any).internal.pages[1] || []).replace(/\\/g, "");
    expect(text).toContain("Total amount under query");
    expect(text).not.toContain("Total potential dispute");
  });

  it("ensures no '¹' or unencoded rupee character appears anywhere in the generated PDF", () => {
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: true });
    const doc = generateGrievancePdf(case1, auditSummary, { isDemoMode: true });

    const pageCount = (doc.internal as any).getNumberOfPages();
    let fullPdfText = "";
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const textLines = (doc as any).internal.pages[p] || [];
      fullPdfText += JSON.stringify(textLines);
    }

    expect(fullPdfText).not.toContain("¹");
    expect(fullPdfText).not.toContain("₹");
    expect(fullPdfText).toContain("Rs.");
  });

  it("only mentions in letter text the specific item types that appear in the table", () => {
    const stayOnlyBill: ExtractedBill = {
      billId: "stay-only-bill",
      isSample: false,
      isSynthetic: true,
      hospitalName: "City Hospital",
      patientNameRedacted: "Patient X",
      admissionDate: "2025-01-01",
      dischargeDate: "2025-01-03",
      roomCategory: "GENERAL_WARD",
      lineItems: [
        {
          id: "stay-item-1",
          rawLabel: "General Ward Bed Charges",
          code: null,
          serviceDate: "2025-01-01",
          category: "ROOM_RENT",
          unit: "DAY",
          quantity: 4,
          unitPrice: 2000,
          totalBilled: 8000,
          tpaDeductedAmount: 0,
          tpaDeductionReason: null,
        },
      ],
    };

    const auditSummary = auditBill(stayOnlyBill);
    const doc = generateGrievancePdf(stayOnlyBill, auditSummary, { isDemoMode: true });

    const pageCount = (doc.internal as any).getNumberOfPages();
    let fullPdfText = "";
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const textLines = (doc as any).internal.pages[p] || [];
      fullPdfText += JSON.stringify(textLines);
    }

    expect(fullPdfText).toContain("Length of Stay & Service Dates Reconciliation");
    expect(fullPdfText).not.toContain("Item Pricing & Ceiling Compliance");
    expect(fullPdfText).not.toContain("Insurance / TPA Deductions Reconsideration");
  });

  it("runs real Case 1 through the UI code path (toggle off) and asserts PDF has no 'Cap Rs.', no 'ABOVE CEILING' for stent, and High-confidence is Rs. 0", () => {
    // 1. Run audit with demo mode toggle OFF (the UI default)
    const auditSummary = auditBill(case1, { forceVerifiedDemoMode: false });

    // 2. Generate PDF with isDemoMode: false (the UI default)
    const doc = generateGrievancePdf(case1, auditSummary, { isDemoMode: false });

    // 3. Extract all page text
    const pageCount = (doc.internal as any).getNumberOfPages();
    let fullPdfText = "";
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const textLines = (doc as any).internal.pages[p] || [];
      fullPdfText += JSON.stringify(textLines);
    }
    const cleanText = fullPdfText.replace(/\\/g, "").replace(/\)\s*TjnT\*\s*\(/g, " ");

    // Asserts:
    // a) High-confidence total is Rs. 0 for that bill
    expect(cleanText).toContain("High-confidence items of Rs. 0");

    // b) Contains no "Cap Rs."
    expect(cleanText).not.toContain("Cap Rs.");

    // c) Contains no "ABOVE CEILING" for the stent
    expect(cleanText).not.toContain("ABOVE CEILING");

    // d) Contains STAY / DUPLICATE CHECK
    expect(cleanText).toContain("STAY / DUPLICATE CHECK");

    // e) Stent row shows "NEEDS HUMAN REVIEW" and neutral patient question (no internal notes)
    expect(cleanText).toContain("NEEDS HUMAN REVIEW");
    expect(cleanText).toContain("Kindly confirm the item specification, brand/batch disclosures, and applicable ceiling compliance for this charge.");
    expect(cleanText).not.toContain("Verify current gazetted");
    expect(cleanText).not.toContain("Please share the basis");

    // f) Specific wording cleanups for Case 1
    // 1. Fee row (Registration / admission fee) specific question (not nursing)
    expect(cleanText).toContain("Please clarify what this administrative fee covers and whether standard non-payable administrative costs are already included in the room/package tariff.");

    // 2. Unit mismatch row (Syringes pack) specific question (no brand/batch/NPPA ceiling wording)
    expect(cleanText).toContain("Please confirm the pack size and per-unit price to reconcile with standard itemized unit rates.");

    // 3. Professional visit row wording and benchmark label
    expect(cleanText).toContain("6 visits billed vs 4 nights recorded");
    expect(cleanText).toContain("Please confirm the visit count against the recorded stay.");
    expect(cleanText).toContain("Rs. 6,000 (Expected");
    expect(cleanText).toContain("if one visit per day");
    expect(cleanText).not.toContain("medical necessity for multiple");

    // g) Fits on 1 single page
    expect(pageCount).toBe(1);
  });

  it("fits Case 2 (SYN-7040) on 1 single page with STAY / DUPLICATE CHECK badge and verified math", () => {
    const case2 = sampleBills[1];
    const auditSummary = auditBill(case2, { forceVerifiedDemoMode: false });
    const doc = generateGrievancePdf(case2, auditSummary, { isDemoMode: false });

    const pageCount = (doc.internal as any).getNumberOfPages();
    expect(pageCount).toBe(1);

    const fullPdfText = JSON.stringify((doc as any).internal.pages[1] || [])
      .replace(/\\/g, "")
      .replace(/\)\s*TjnT\*\s*\(/g, " ");
    expect(fullPdfText).toContain("STAY / DUPLICATE CHECK");
    expect(fullPdfText).not.toContain("ABOVE CEILING");

    // Case 2 Math assertions:
    expect(fullPdfText).toContain("High-confidence items of Rs. 0");
    expect(fullPdfText).toContain("Items to clarify of Rs. 24,900");
    expect(fullPdfText).toContain("Total amount under query: Rs. 24,900");
    expect(fullPdfText).toContain("Payable if all queried amounts were accepted: Rs. 1,59,600");

    // Clarified stay benchmark and observation
    expect(fullPdfText).toContain("Expected cost for recorded 4 nights is Rs. 56,000 at billed daily rate");
    expect(fullPdfText).toContain("5 days billed vs 4 nights recorded");
    expect(fullPdfText).toContain("calendar day vs 24-hour cycle");

    // Consumable row explanation (no nursing text)
    expect(fullPdfText).toContain("Consumable Review: Please clarify whether this consumable is included in the procedure or package tariff");
  });

  it("renders [UHID] for custom uploaded bills when bill.uhid is absent", () => {
    const uploadedBill: ExtractedBill = {
      ...case2,
      isSample: false,
      isSynthetic: false,
      uhid: undefined,
    };
    const auditSummary = auditBill(uploadedBill, { forceVerifiedDemoMode: false });
    const doc = generateGrievancePdf(uploadedBill, auditSummary, { isDemoMode: false });
    const fullPdfText = JSON.stringify((doc as any).internal.pages[1] || []).replace(/\\/g, "");
    expect(fullPdfText).toContain("UHID / IPD: [UHID]");
    expect(fullPdfText).not.toContain("UHID-SYN-7040");
  });

  it("verifies Case 3 (SYN-1258) cleanup improvements and regression requirements", () => {
    const case3 = sampleBills[2];
    const auditSummary = auditBill(case3, { forceVerifiedDemoMode: false });
    const doc = generateGrievancePdf(case3, auditSummary, { isDemoMode: false });

    const pageCount = (doc.internal as any).getNumberOfPages();
    let fullPdfText = "";
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const textLines = (doc as any).internal.pages[p] || [];
      fullPdfText += JSON.stringify(textLines);
    }
    const cleanText = fullPdfText.replace(/\\/g, "").replace(/\)\s*TjnT\*\s*\(/g, " ");

    // 1. Output PDF text for Case 3 contains no internal "Verify current gazetted" notes
    expect(cleanText).not.toContain("Verify current gazetted");
    expect(cleanText).not.toContain("Item matches unverified reference entry");

    // 2. No row has repeated "Please share the basis" phrases (in fact completely eliminated)
    expect(cleanText).not.toContain("Please share the basis");

    // 3. Case 3 outputs unique UHID UHID-SYN-1258 and policy POL-SYN-1258
    expect(cleanText).toContain("UHID-SYN-1258");
    expect(cleanText).toContain("POL-SYN-1258");
    expect(cleanText).toContain("MediAssist TPA Services (Synthetic)");

    // 4. The phrase "Payable if all queried amounts were accepted" is present
    expect(cleanText).toContain("Payable if all queried amounts were accepted");

    // 5. Combined bundling + TPA deduction badge for Nursing charges
    expect(cleanText).toContain("REVIEW FLAG (BUNDLING & TPA DEDUCTION)");
    expect(cleanText).toContain("Item is queried for hospital package bundling and subject to TPA non-payable deduction");
    expect(cleanText).toContain("Kindly clarify package inclusion and review non-payable deduction under active inpatient care exceptions");

    // 6. Neutral patient question for knee implant
    expect(cleanText).toContain("Kindly confirm the item specification, brand/batch disclosures, and applicable ceiling compliance for this charge.");
  });
});
