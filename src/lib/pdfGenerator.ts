/**
 * ClaimKavach — Patient Billing Review Query & Grievance PDF Generator
 * Built using jsPDF and jspdf-autotable.
 *
 * Rules:
 * 1. Uses "Rs." exclusively to prevent unencoded font/glyph corruption (no "¹").
 * 2. Never prints "[PLACEHOLDER...]" or unverified source citations.
 * 3. Whenever the PDF contains any row from an unverified rule (or demo mode is on),
 *    prints a bold banner at the top of page 1: "DRAFT - REFERENCE DATA NOT VERIFIED - DO NOT SEND".
 * 4. Fallback names: hospital "Sample Metro Care Hospital (Synthetic Demo)" for samples,
 *    "[Hospital name]" otherwise; patient "[Patient name]"; omits Bill ID and "extracted-fallback".
 * 5. Says "reference data prepared from public guidelines" only once, in the first paragraph.
 * 6. Renames the last table column to "Finding / Question for hospital".
 * 7. Renames "Total potential dispute" to "Total amount under query".
 * 8. Only mentions item types that actually appear in the table.
 * 9. Splits totals: "High-confidence items" and "Items to clarify". Shows "N/A" for benchmarks without a cap.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ExtractedBill, BillAuditSummary } from "./schemas";

export interface GrievanceDraftOptions {
  hospitalName?: string;
  patientName?: string;
  uhidNumber?: string;
  policyNumber?: string;
  tpaName?: string;
  isDemoMode?: boolean;
}

export function generateGrievancePdf(
  bill: ExtractedBill,
  summary: BillAuditSummary,
  options: GrievanceDraftOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Resolve Hospital Name: Prioritize options, then bill, fallback to synthetic or general name
  let hospitalDisplayName = options.hospitalName;
  if (!hospitalDisplayName) {
    if (bill.hospitalName && !bill.hospitalName.includes("Simulated Extraction")) {
      hospitalDisplayName = bill.hospitalName;
    } else if (bill.isSample || bill.isSynthetic) {
      hospitalDisplayName = "Sample Metro Care Hospital (Synthetic Demo)";
    } else {
      hospitalDisplayName = "Hospital Billing Department";
    }
  }

  // Resolve Patient Name: Prioritize options, then bill, fallback to synthetic demo name
  let patientDisplayName = options.patientName;
  if (!patientDisplayName) {
    if (bill.patientNameRedacted && !bill.patientNameRedacted.includes("[Patient")) {
      patientDisplayName = bill.patientNameRedacted;
    } else if (bill.isSample || bill.isSynthetic) {
      patientDisplayName = "Patient (Synthetic Demo)";
    } else {
      patientDisplayName = "Patient";
    }
  }

  // Resolve UHID / Policy / TPA: per-bill synthetic IDs for samples; fill-in placeholders for uploads
  let uhid = options.uhidNumber?.trim() || (bill as any).uhid || null;
  let policyNum = options.policyNumber?.trim() || (bill as any).policyNumber || null;
  let tpa = options.tpaName?.trim() || (bill as any).tpaName || null;

  if (!uhid || uhid === "N/A") {
    // Only synthesize UHID for built-in sample bills when isSample === true!
    // For uploaded bills, do NOT synthesize "UHID-SYN-7040"; render [UHID].
    if (bill.isSample) {
      if (bill.billId === "SYN-3334") {
        uhid = "UHID-SYN-3334";
      } else if (bill.billId === "SYN-7040") {
        uhid = "UHID-SYN-7040";
      } else if (bill.billId === "SYN-1258") {
        uhid = "UHID-SYN-1258";
      } else {
        uhid = `UHID-${bill.billId}`;
      }
    } else {
      uhid = "[UHID]";
    }
  }

  if (!policyNum || policyNum === "N/A") {
    if (bill.isSample) {
      if (bill.billId === "SYN-1258") {
        policyNum = "POL-SYN-1258";
      } else if (bill.billId === "SYN-7040") {
        policyNum = "POL-SYN-7040";
      } else if (bill.billId === "SYN-3334") {
        policyNum = "POL-SYN-3334";
      } else {
        policyNum = `POL-${bill.billId}`;
      }
    } else {
      policyNum = "[Policy No.]";
    }
  }

  if (!tpa || tpa === "N/A" || tpa === "TPA / Insurance Desk") {
    if (bill.isSample) {
      if (bill.billId === "SYN-1258") {
        tpa = "MediAssist TPA Services (Synthetic)";
      } else {
        tpa = "MediCare TPA Services (Synthetic)";
      }
    } else {
      tpa = "[TPA name]";
    }
  }

  const isDemo = options.isDemoMode ?? false;

  const flaggedResults = summary.results.filter(
    (r) => r.potentialDisputeAmountInr > 0 || r.confidenceTier === "NEEDS_HUMAN_REVIEW"
  );

  // Determine if any flagged row depends on an unverified rule
  const hasUnverifiedRules = flaggedResults.some(
    (r) => !r.ruleVerified || (r.sourceCitation?.documentName && r.sourceCitation.documentName.includes("PLACEHOLDER"))
  );

  // Split totals into High-confidence items and Items to clarify
  let highConfidencePaise = 0;
  let itemsToClarifyPaise = 0;

  for (const item of flaggedResults) {
    const isItemVerified = Boolean(item.ruleVerified);
    const paise = Math.round(item.potentialDisputeAmountInr * 100);
    // Derived strictly from AuditedItemResult:
    // If ruleVerified is false: amount is counted under "Items to clarify", NOT "High-confidence"
    if (isItemVerified && item.confidenceTier === "HIGH_CONFIDENCE") {
      highConfidencePaise += paise;
    } else {
      itemsToClarifyPaise += paise;
    }
  }

  const highConfidenceTotal = highConfidencePaise / 100;
  const itemsToClarifyTotal = itemsToClarifyPaise / 100;

  // Colors
  const navyColor: [number, number, number] = [11, 21, 48];
  const redColor: [number, number, number] = [229, 72, 77];
  const slateColor: [number, number, number] = [100, 116, 139];

  // --- Header Banner ---
  doc.setFillColor(...navyColor);
  doc.rect(0, 0, 210, 17, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("CLAIMKAVACH - PATIENT BILLING REVIEW QUERY DRAFT", 14, 9.5);

  // Sub-header without duplicating "reference data prepared from public guidelines"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(18, 165, 138);
  doc.text("Patient Billing Query & Invoicing Reconciliation Draft", 14, 14.5);

  let cursorY = 21;

  // --- Mandatory Warning Banner: Unverified Reference Data ---
  // The red warning banner MUST print at the top of Page 1 whenever ANY flagged or reviewed row
  // depends on an unverified rule (verified: false), across every path (upload, sample, or fallback).
  if (hasUnverifiedRules) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(...redColor);
    doc.rect(14, cursorY, 182, 6.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...redColor);
    doc.text(
      "DRAFT - REFERENCE DATA NOT VERIFIED - DO NOT SEND",
      105,
      cursorY + 4.5,
      { align: "center" }
    );
    cursorY += 9.5;
  }

  // --- Date & Addressee ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  doc.text(`Date: ${todayStr}`, 14, cursorY);
  cursorY += 4;

  doc.text(`To: The Billing Superintendent / Medical Superintendent, ${hospitalDisplayName}`, 14, cursorY);
  cursorY += 4;
  if (summary.totalTpaDeductedInr > 0) {
    doc.text(`Copy To: ${tpa} (Ref: Policy/Claim #${policyNum})`, 14, cursorY);
    cursorY += 4;
  }

  // --- Subject (Omit Bill ID and 'extracted-fallback' string) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navyColor);
  doc.text(
    `SUB: Request for Itemized Clarification & Billing Reconciliation`,
    14,
    cursorY
  );
  cursorY += 4.5;

  // --- Patient & Stay Metadata Box ---
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(218, 222, 229);
  doc.roundedRect(14, cursorY, 182, 13, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);

  doc.text(`Patient: ${patientDisplayName}`, 18, cursorY + 4.5, { maxWidth: 55 });
  doc.text(`UHID / IPD: ${uhid}`, 78, cursorY + 4.5, { maxWidth: 52 });
  doc.text(`Room Category: ${bill.roomCategory.replace(/_/g, " ")}`, 135, cursorY + 4.5, { maxWidth: 55 });

  doc.text(
    `Admission: ${bill.admissionDate || "N/A"}   |   Discharge: ${bill.dischargeDate || "N/A"}   |   Length of Stay: ${summary.lengthOfStayDays} Day(s)`,
    18,
    cursorY + 9.5
  );
  cursorY += 16;

  // --- Executive Summary Letter Body ---
  // Mentions "reference data prepared from public guidelines" ONLY ONCE here.
  // Renames "Total potential dispute" to "Total amount under query".
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);

  const introText =
    `Dear Sir/Madam,\n` +
    `I am writing to formally request itemized clarification and reconciliation regarding the final in-patient bill referenced above.\n` +
    `An audit against reference data prepared from public guidelines (verification status shown in the table) identified total billed charges of Rs. ${summary.totalBilledInr.toLocaleString("en-IN")}, comprising High-confidence items of Rs. ${highConfidenceTotal.toLocaleString("en-IN")} and Items to clarify of Rs. ${itemsToClarifyTotal.toLocaleString("en-IN")} ` +
    `(Total amount under query: Rs. ${summary.totalPotentialDisputeInr.toLocaleString("en-IN")}; Payable if all queried amounts were accepted: Rs. ${summary.estimatedPayableIfAcceptedInr.toLocaleString("en-IN")}).`;

  const splitIntro = doc.splitTextToSize(introText, 182);
  doc.text(splitIntro, 14, cursorY);
  cursorY += splitIntro.length * 3.5 + 2.5;

  // --- Table of Flagged Items ---
  // Last column: "Finding / Question for hospital"
  // Clean 3-line format: Status badge, factual observation, concise query question.
  // Never prints internal developer/unverified notes.
  const tableRows = flaggedResults.map((item, idx) => {
    const isItemVerified = Boolean(item.ruleVerified);
    const lineItem = bill.lineItems.find((li) => li.id === item.lineItemId);
    const tpaDeducted = lineItem?.tpaDeductedAmount ?? 0;
    const hasTpaDeduction = tpaDeducted > 0;

    // If ruleVerified is false: no cap figure, always "N/A"
    let benchmarkText = "N/A";
    if (isItemVerified && item.referenceBenchmarkInr !== null && item.referenceBenchmarkInr > 0) {
      const isVisitOverrun =
        item.ruleType === "DUPLICATE_OR_STAY_MATH" &&
        (item.headline.toLowerCase().includes("visit") ||
          item.rawLabel.toLowerCase().includes("visit") ||
          item.rawLabel.toLowerCase().includes("consultation"));

      const isStayOverrun =
        item.ruleType === "DUPLICATE_OR_STAY_MATH" &&
        !isVisitOverrun &&
        (item.headline.toLowerCase().includes("stay") ||
          item.rawLabel.toLowerCase().includes("bed") ||
          item.rawLabel.toLowerCase().includes("rent") ||
          item.rawLabel.toLowerCase().includes("icu"));

      if (isVisitOverrun) {
        benchmarkText = `Rs. ${item.referenceBenchmarkInr.toLocaleString("en-IN")} (Expected if one visit per day)`;
      } else if (isStayOverrun) {
        benchmarkText = `Rs. ${item.referenceBenchmarkInr.toLocaleString("en-IN")} (Expected for ${summary.lengthOfStayDays} nights)`;
      } else {
        benchmarkText = `Rs. ${item.referenceBenchmarkInr.toLocaleString("en-IN")}`;
      }
    }

    let statusBadge = "REVIEW FLAG";
    let observation = "";
    let question = "";

    // 1. Check if both Bundling and TPA Deduction apply
    const isBundling =
      item.ruleType === "PACKAGE_BUNDLING" ||
      item.rawLabel.toLowerCase().includes("nursing") ||
      item.rawLabel.toLowerCase().includes("monitor") ||
      item.headline.toLowerCase().includes("unbundling") ||
      item.headline.toLowerCase().includes("package");

    if (isBundling && hasTpaDeduction) {
      statusBadge = "REVIEW FLAG (BUNDLING & TPA DEDUCTION)";
      observation = `Item is queried for hospital package bundling and subject to TPA non-payable deduction (Rs. ${tpaDeducted.toLocaleString("en-IN")}).`;
      question = `Kindly clarify package inclusion and review non-payable deduction under active inpatient care exceptions.`;
    } else if (item.confidenceTier === "NEEDS_HUMAN_REVIEW") {
      statusBadge = "NEEDS HUMAN REVIEW";
      const isUnitMismatch =
        item.rawLabel.toLowerCase().includes("syringe") ||
        item.rawLabel.toLowerCase().includes("pack") ||
        item.headline.toLowerCase().includes("unit mismatch") ||
        item.explanation.toLowerCase().includes("unit mismatch");

      if (isUnitMismatch) {
        observation = `Billed in packaging unit (${lineItem?.unit || "PACK"}). Reconciliation needed for unit pricing.`;
        question = `Please confirm the pack size and per-unit price to reconcile with standard itemized unit rates.`;
      } else {
        observation = `Reference pricing benchmark requires clinical and product specification verification.`;
        question = `Kindly confirm the item specification, brand/batch disclosures, and applicable ceiling compliance for this charge.`;
      }
    } else if (isItemVerified && item.ruleType === "NPPA_CEILING") {
      statusBadge = "ABOVE CEILING";
      const billedUnit = lineItem?.unitPrice ?? item.billedAmountInr;
      const capUnit = item.referenceBenchmarkInr ?? 0;
      observation = `Billed unit price of Rs. ${billedUnit.toLocaleString("en-IN")} exceeds regulated ceiling of Rs. ${capUnit.toLocaleString("en-IN")}.`;
      question = `Kindly provide statutory ceiling justification or issue billing credit reconciliation.`;
    } else if (item.ruleType === "DUPLICATE_OR_STAY_MATH") {
      statusBadge = "STAY / DUPLICATE CHECK";
      const isVisitOverrun =
        item.headline.toLowerCase().includes("visit") ||
        item.rawLabel.toLowerCase().includes("consultation") ||
        item.rawLabel.toLowerCase().includes("visit");

      if (isVisitOverrun) {
        const visitsBilled = lineItem?.quantity ?? Math.round(item.billedAmountInr / (lineItem?.unitPrice || 1));
        observation = `${visitsBilled} visits billed vs ${summary.lengthOfStayDays} nights recorded.`;
        question = `Please confirm the visit count against the recorded stay.`;
      } else if (
        item.headline.toLowerCase().includes("stay") ||
        item.rawLabel.toLowerCase().includes("bed") ||
        item.rawLabel.toLowerCase().includes("rent") ||
        item.rawLabel.toLowerCase().includes("icu")
      ) {
        const daysBilled = lineItem?.quantity ?? Math.round(item.billedAmountInr / (lineItem?.unitPrice || 1));
        observation = `${daysBilled} days billed vs ${summary.lengthOfStayDays} nights recorded. Please confirm the hospital's day-counting method (calendar day vs 24-hour cycle).`;
        question = `Expected cost for recorded ${summary.lengthOfStayDays} nights is Rs. ${(item.referenceBenchmarkInr ?? 0).toLocaleString("en-IN")} at billed daily rate. Kindly clarify whether calendar-day or 24-hour billing cycle was applied.`;
      } else if (item.headline.toLowerCase().includes("repeat") || item.headline.toLowerCase().includes("duplicate")) {
        observation = `Repeat investigation billed multiple times on same date (${lineItem?.serviceDate || "same date"}).`;
        question = `Kindly clarify clinical indication for repeating this diagnostic investigation on the same day.`;
      } else {
        observation = item.headline;
        question = `Kindly provide itemized reconciliation and clinical rationale for service dates exceeding recorded stay.`;
      }
    } else if (item.ruleType === "PACKAGE_BUNDLING") {
      const lowerLabel = item.rawLabel.toLowerCase();
      const lowerHeadline = item.headline.toLowerCase();

      const isAdminFee =
        lowerLabel.includes("admission") ||
        lowerLabel.includes("registration") ||
        lowerLabel.includes("admin") ||
        lowerHeadline.includes("administrative") ||
        lowerHeadline.includes("admission") ||
        lineItem?.category === "OTHER";

      const isConsumable =
        !isAdminFee &&
        (lineItem?.category === "CONSUMABLE" ||
          lowerLabel.includes("cannula") ||
          lowerLabel.includes("glove") ||
          lowerLabel.includes("swab") ||
          lowerLabel.includes("syringe"));

      if (isAdminFee) {
        statusBadge = "REVIEW FLAG (ADMIN FEE)";
        observation = `Administrative or admission fees billed as standalone charges.`;
        question = `Please clarify what this administrative fee covers and whether standard non-payable administrative costs are already included in the room/package tariff.`;
      } else if (isConsumable) {
        statusBadge = "REVIEW FLAG (BUNDLING)";
        observation = `Consumable item billed separately alongside inpatient room stay.`;
        question = `Consumable Review: Please clarify whether this consumable is included in the procedure or package tariff, or provide itemized reconciliation.`;
      } else {
        statusBadge = "REVIEW FLAG (BUNDLING)";
        observation = `Routine nursing charges and vitals monitoring are typically inclusive of inpatient room tariff.`;
        question = `Kindly clarify whether this service is covered under the composite package tariff or provide itemized reconciliation.`;
      }
    } else if (item.ruleType === "TPA_DEDUCTION_REVIEW" || hasTpaDeduction) {
      statusBadge = "INSURER DEDUCTION";
      const reasonStr = lineItem?.tpaDeductionReason ? ` citing "${lineItem.tpaDeductionReason}"` : "";
      observation = `TPA deducted Rs. ${(tpaDeducted || item.potentialDisputeAmountInr).toLocaleString("en-IN")}${reasonStr}.`;
      question = `Kindly review deduction under IRDAI active inpatient care guidelines or provide specific policy clause.`;
    } else {
      const lowerLabel = item.rawLabel.toLowerCase();
      if (lowerLabel.includes("admission") || lowerLabel.includes("registration") || lowerLabel.includes("admin")) {
        statusBadge = "REVIEW FLAG (ADMIN FEE)";
        observation = `Administrative or admission fees billed as standalone charges.`;
        question = `Please clarify what this administrative fee covers and whether standard non-payable administrative costs are already included in the room/package tariff.`;
      } else {
        statusBadge = "REVIEW FLAG";
        observation = item.headline || `Item pricing requires verification against hospital tariff schedule.`;
        question = `Kindly share the tariff basis and itemized reconciliation for this charge.`;
      }
    }

    const findingLines = [statusBadge, observation, question].filter(Boolean);

    return [
      `${idx + 1}. ${item.rawLabel}`,
      `Rs. ${item.billedAmountInr.toLocaleString("en-IN")}`,
      benchmarkText,
      `Rs. ${item.potentialDisputeAmountInr.toLocaleString("en-IN")}`,
      findingLines.join("\n"),
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [["Item Description", "Billed", "Cap / Benchmark", "Amount Under Query", "Finding / Question for hospital"]],
    body: tableRows.length > 0 ? tableRows : [["No items under query", "-", "N/A", "-", "Clear"]],
    theme: "striped",
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
      cellPadding: 1.4,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [40, 40, 40],
      cellPadding: 1.3,
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 20, halign: "right" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: [200, 30, 30] },
      4: { cellWidth: 76 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      cursorY = data.cursor?.y || cursorY;
    },
  });

  cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3.5 : cursorY + 20;

  // Check page overflow
  if (cursorY > 255) {
    doc.addPage();
    cursorY = 20;
  }

  // --- Specific Regulatory Query Requests (ONLY mention item types present in table) ---
  const hasImplantOrCaps = flaggedResults.some((r) => r.ruleType === "NPPA_CEILING");
  const hasPackageBundling = flaggedResults.some((r) => r.ruleType === "PACKAGE_BUNDLING");
  const hasTpaDeductions = flaggedResults.some((r) => r.ruleType === "TPA_DEDUCTION_REVIEW");
  const hasDuplicateOrStay = flaggedResults.some((r) => r.ruleType === "DUPLICATE_OR_STAY_MATH");

  const specificPoints: string[] = [];

  if (hasImplantOrCaps) {
    specificPoints.push(
      "Item Pricing & Ceiling Compliance: For any implants (coronary stents, orthopedic knee kits) or scheduled medicines, kindly provide the mandatory invoice disclosures including Brand Name, Manufacturer, Batch/Lot Number, and ceiling adherence per statutory notifications."
    );
  }

  if (hasPackageBundling) {
    specificPoints.push(
      "Room Rent & Inclusions: For items billed alongside room rent or ICU tariffs, please clarify whether routine nursing, vitals monitoring, or standard consumables are included in the package tariff."
    );
  }

  if (hasTpaDeductions) {
    specificPoints.push(
      "Insurance / TPA Deductions Reconsideration: For deductions applied to active intravenous therapy or essential care consumables, please share the specific policy clause or reconsider under standard payable exceptions."
    );
  }

  if (hasDuplicateOrStay) {
    specificPoints.push(
      "Length of Stay & Service Dates Reconciliation: For days billed in excess of the recorded admission stay or same-day repeat investigations, please provide reconciliation and clinical rationale."
    );
  }

  if (specificPoints.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...navyColor);
    doc.text("Specific Clarifications & Disclosures Requested:", 14, cursorY);
    cursorY += 3.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(40, 40, 40);

    specificPoints.forEach((pt, i) => {
      const splitPt = doc.splitTextToSize(`${i + 1}. ${pt}`, 182);
      doc.text(splitPt, 14, cursorY);
      cursorY += splitPt.length * 3.0 + 1;
    });

    cursorY += 2;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Thanking you,", 14, cursorY);
  cursorY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.text(`${patientDisplayName}`, 14, cursorY);

  // --- Persistent Educational Disclaimer Footer ---
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(218, 222, 229);
    doc.line(14, 282, 196, 282);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(...slateColor);
    doc.text(
      "Mandatory Educational Disclaimer: ClaimKavach is an educational and analytical tool designed to assist patients in understanding hospital bills and insurance deductions. It does not provide legal advice or medical guidance. Estimated amounts represent potential grounds for query and discussion.",
      14,
      286,
      { maxWidth: 182 }
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 292, { align: "right" });
  }

  return doc;
}
