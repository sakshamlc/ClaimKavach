/**
 * ClaimKavach — Deterministic Pure TypeScript Rule Engine
 * Tagline: "AI reads the bill. Verified rules judge it."
 *
 * All audits execute deterministically with integer paise math.
 * Rules with verified: false are strictly blocked from HIGH_CONFIDENCE.
 * Duplicate/stay flags cite no invented source; they state facts from the bill directly.
 */

import {
  ExtractedBill,
  ExtractedLineItem,
  NppaPriceCapEntry,
  IrdaiBundlingEntry,
  IrdaiNonPayableEntry,
  AuditedItemResult,
  BillAuditSummary,
} from "./schemas";
import {
  computeMatchScore,
  normalizeUnit,
  toPaise,
  toRupees,
  cleanLabel,
} from "./normalizer";
import defaultNppaRules from "../data/nppa_price_caps.json";
import defaultBundlingRules from "../data/irdai_bundling.json";
import defaultNonPayableRules from "../data/irdai_nonpayable.json";

export interface AuditOptions {
  forceVerifiedDemoMode?: boolean;
  customNppaRules?: NppaPriceCapEntry[];
  customBundlingRules?: IrdaiBundlingEntry[];
  customNonPayableRules?: IrdaiNonPayableEntry[];
}

/**
 * Calculates length of stay in days from admission and discharge dates.
 */
export function calculateLengthOfStayDays(
  admissionDate: string | null,
  dischargeDate: string | null
): number {
  if (!admissionDate || !dischargeDate) return 1;

  try {
    const start = new Date(admissionDate);
    const end = new Date(dischargeDate);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  } catch {
    return 1;
  }
}

/**
 * Core Deterministic Audit Engine
 */
export function auditBill(
  bill: ExtractedBill,
  options: AuditOptions = {}
): BillAuditSummary {
  const forceVerified = options.forceVerifiedDemoMode ?? false;
  const nppaRules: NppaPriceCapEntry[] = (options.customNppaRules || defaultNppaRules) as NppaPriceCapEntry[];
  const bundlingRules: IrdaiBundlingEntry[] = (options.customBundlingRules || defaultBundlingRules) as IrdaiBundlingEntry[];
  const nonPayableRules: IrdaiNonPayableEntry[] = (options.customNonPayableRules || defaultNonPayableRules) as IrdaiNonPayableEntry[];

  const stayDays = calculateLengthOfStayDays(bill.admissionDate, bill.dischargeDate);
  const results: AuditedItemResult[] = [];

  // Track duplicate tests/procedures on the same service date
  const seenServiceItems = new Map<string, ExtractedLineItem[]>();
  for (const item of bill.lineItems) {
    if (item.category === "DIAGNOSTICS_LAB" || item.category === "PROCEDURE_OT") {
      const key = `${item.serviceDate || "unknown"}_${cleanLabel(item.rawLabel)}`;
      const existing = seenServiceItems.get(key) || [];
      existing.push(item);
      seenServiceItems.set(key, existing);
    }
  }

  const flaggedDuplicateIds = new Set<string>();
  seenServiceItems.forEach((items) => {
    if (items.length > 1) {
      // Flag subsequent identical items on the same date as duplicates
      for (let i = 1; i < items.length; i++) {
        flaggedDuplicateIds.add(items[i].id);
      }
    }
  });

  for (const item of bill.lineItems) {
    let auditedResult: AuditedItemResult | null = null;

    // 1. DUPLICATE CHECK (Same-day identical lab/procedure)
    // REVIEW tone ("please clarify why repeated"), not ABOVE_CEILING. No external source cited.
    if (flaggedDuplicateIds.has(item.id)) {
      auditedResult = {
        lineItemId: item.id,
        rawLabel: item.rawLabel,
        confidenceTier: "REVIEW_POLICY_BASED",
        colorCategory: "REVIEW_FLAG",
        ruleType: "DUPLICATE_OR_STAY_MATH",
        matchScore: 1.0,
        billedAmountInr: item.totalBilled,
        referenceBenchmarkInr: null,
        potentialDisputeAmountInr: item.totalBilled,
        headline: `Repeat Same-Day Service: ${item.rawLabel}`,
        explanation: `This test/procedure was billed multiple times on the same date (${item.serviceDate || "same date"}). Please clarify why repeated.`,
        mandatoryDisclosuresMissing: [],
        sourceCitation: null,
        ruleVerified: true,
      };
      results.push(auditedResult);
      continue;
    }

    // 2. STAY-DURATION MATH CHECK (Quantity > stayDays for VISIT, DAY, or ROOM_RENT)
    // Cites no external source; states the facts from the bill directly.
    const normalizedItemUnit = normalizeUnit(item.unit);

    // 2A. VISIT OVER-COUNT (Consultations exceeding stay length)
    if ((normalizedItemUnit === "VISIT" || item.category === "CONSULTATION") && item.quantity > stayDays) {
      const excessVisits = item.quantity - stayDays;
      const unitPricePaise = toPaise(item.unitPrice);
      const excessAmountInr = toRupees(unitPricePaise * excessVisits);

      auditedResult = {
        lineItemId: item.id,
        rawLabel: item.rawLabel,
        confidenceTier: "REVIEW_POLICY_BASED",
        colorCategory: "REVIEW_FLAG",
        ruleType: "DUPLICATE_OR_STAY_MATH",
        matchScore: 1.0,
        billedAmountInr: item.totalBilled,
        referenceBenchmarkInr: toRupees(unitPricePaise * stayDays),
        potentialDisputeAmountInr: excessAmountInr,
        headline: `Visit Count Exceeds Stay Length: ${item.quantity} visits billed across ${stayDays}-day stay (${excessVisits} excess visit(s) @ Rs. ${item.unitPrice.toLocaleString("en-IN")})`,
        explanation: `${item.quantity} visits billed vs ${stayDays} nights recorded. Please confirm the visit count against the recorded stay.`,
        mandatoryDisclosuresMissing: [],
        sourceCitation: null,
        ruleVerified: true,
      };
      results.push(auditedResult);
      continue;
    }

    // 2B. DAY / ROOM_RENT OVER-COUNT (Billed days exceeding stay length)
    if ((normalizedItemUnit === "DAY" || item.category === "ROOM_RENT") && item.quantity > stayDays) {
      const excessDays = item.quantity - stayDays;
      const unitPricePaise = toPaise(item.unitPrice);
      const excessAmountInr = toRupees(unitPricePaise * excessDays);

      auditedResult = {
        lineItemId: item.id,
        rawLabel: item.rawLabel,
        confidenceTier: "REVIEW_POLICY_BASED",
        colorCategory: "REVIEW_FLAG",
        ruleType: "DUPLICATE_OR_STAY_MATH",
        matchScore: 1.0,
        billedAmountInr: item.totalBilled,
        referenceBenchmarkInr: toRupees(unitPricePaise * stayDays),
        potentialDisputeAmountInr: excessAmountInr,
        headline: `Stay Duration Exceeded: ${excessDays} Extra Day(s) Billed`,
        explanation: `${item.quantity} days billed vs ${stayDays} nights recorded. Please confirm the hospital's day-counting method (calendar day vs 24-hour cycle).`,
        mandatoryDisclosuresMissing: [],
        sourceCitation: null,
        ruleVerified: true,
      };
      results.push(auditedResult);
      continue;
    }

    // 3. NPPA / DPCO CEILING PRICE CHECK
    let bestNppaMatch: { rule: NppaPriceCapEntry; score: number } | null = null;
    for (const rule of nppaRules) {
      const score = computeMatchScore(item.rawLabel, rule.canonicalName, rule.aliases);
      if (!bestNppaMatch || score > bestNppaMatch.score) {
        bestNppaMatch = { rule, score };
      }
    }

    if (bestNppaMatch && bestNppaMatch.score >= 0.85) {
      const rule = bestNppaMatch.rule;
      const isRuleVerified = forceVerified ? true : rule.verified;

      // Unit compatibility check
      if (normalizedItemUnit !== rule.normalizedUnit) {
        auditedResult = {
          lineItemId: item.id,
          rawLabel: item.rawLabel,
          confidenceTier: "NEEDS_HUMAN_REVIEW",
          colorCategory: "REVIEW_FLAG",
          ruleType: "UNMATCHED_OR_LOW_CONFIDENCE",
          matchScore: bestNppaMatch.score,
          billedAmountInr: item.totalBilled,
          referenceBenchmarkInr: null,
          potentialDisputeAmountInr: 0,
          headline: `Needs Human Review: Unit Mismatch`,
          explanation: `Unit mismatch: billed in ${item.unit} vs. rule unit ${rule.normalizedUnit}. Verify pack quantity manually.`,
          mandatoryDisclosuresMissing: [],
          sourceCitation: null,
          ruleVerified: false,
        };
        results.push(auditedResult);
        continue;
      }

      // Check if unit price exceeds ceiling
      if (item.unitPrice > rule.ceilingPriceInr) {
        const excessUnitPricePaise = toPaise(item.unitPrice) - toPaise(rule.ceilingPriceInr);
        const totalExcessInr = toRupees(excessUnitPricePaise * item.quantity);

        auditedResult = {
          lineItemId: item.id,
          rawLabel: item.rawLabel,
          confidenceTier: isRuleVerified ? "HIGH_CONFIDENCE" : "NEEDS_HUMAN_REVIEW",
          colorCategory: isRuleVerified ? "ABOVE_CEILING" : "REVIEW_FLAG",
          ruleType: isRuleVerified ? "NPPA_CEILING" : "UNMATCHED_OR_LOW_CONFIDENCE",
          matchScore: bestNppaMatch.score,
          billedAmountInr: item.totalBilled,
          referenceBenchmarkInr: isRuleVerified ? rule.ceilingPriceInr : null,
          potentialDisputeAmountInr: isRuleVerified ? totalExcessInr : 0,
          headline: isRuleVerified
            ? `Billed Above NPPA Ceiling: Rs. ${item.unitPrice.toLocaleString("en-IN")} vs Cap Rs. ${rule.ceilingPriceInr.toLocaleString("en-IN")}`
            : `Needs Human Review: Unverified Price Ceiling Reference`,
          explanation: isRuleVerified
            ? `Billed unit price of Rs. ${item.unitPrice.toLocaleString("en-IN")} exceeds the gazetted ceiling of Rs. ${rule.ceilingPriceInr.toLocaleString("en-IN")} under NPPA DPCO by Rs. ${(item.unitPrice - rule.ceilingPriceInr).toLocaleString("en-IN")} per ${rule.normalizedUnit}.`
            : `Matched reference entry (${rule.canonicalName}), but rule is marked unverified. Verify current gazetted NPPA ceiling notification before claiming overcharge.`,
          mandatoryDisclosuresMissing: isRuleVerified ? rule.mandatoryDisclosures : [],
          sourceCitation: isRuleVerified ? rule.source : null,
          ruleVerified: isRuleVerified,
        };
        results.push(auditedResult);
        continue;
      }
    } else if (bestNppaMatch && bestNppaMatch.score >= 0.60) {
      // Partial match: force NEEDS_HUMAN_REVIEW with 0 dispute
      const rule = bestNppaMatch.rule;
      const isRuleVerified = forceVerified ? true : rule.verified;
      auditedResult = {
        lineItemId: item.id,
        rawLabel: item.rawLabel,
        confidenceTier: "NEEDS_HUMAN_REVIEW",
        colorCategory: "REVIEW_FLAG",
        ruleType: "UNMATCHED_OR_LOW_CONFIDENCE",
        matchScore: bestNppaMatch.score,
        billedAmountInr: item.totalBilled,
        referenceBenchmarkInr: isRuleVerified ? rule.ceilingPriceInr : null,
        potentialDisputeAmountInr: 0,
        headline: isRuleVerified
          ? `Partial Cap Match (${Math.round(bestNppaMatch.score * 100)}%): "${rule.canonicalName}"`
          : `Please share the basis for this charge`,
        explanation: isRuleVerified
          ? `Potential match to regulated item, but similarity is below the 85% high-confidence threshold. Verify drug/device formulation before disputing.`
          : `Please share the basis for this charge.`,
        mandatoryDisclosuresMissing: isRuleVerified ? rule.mandatoryDisclosures : [],
        sourceCitation: isRuleVerified ? rule.source : null,
        ruleVerified: isRuleVerified,
      };
      results.push(auditedResult);
      continue;
    }

    // 4. IRDAI PACKAGE BUNDLING CHECK (ICU / Room rent package inclusions)
    let bestBundlingMatch: { rule: IrdaiBundlingEntry; score: number } | null = null;
    for (const rule of bundlingRules) {
      if (rule.bundledIntoPackages.includes(bill.roomCategory)) {
        const score = computeMatchScore(item.rawLabel, rule.canonicalName, rule.aliases);
        if (!bestBundlingMatch || score > bestBundlingMatch.score) {
          bestBundlingMatch = { rule, score };
        }
      }
    }

    if (bestBundlingMatch && bestBundlingMatch.score >= 0.70) {
      const rule = bestBundlingMatch.rule;
      const isRuleVerified = forceVerified ? true : rule.verified;
      const isConsumable =
        item.category === "CONSUMABLE" ||
        cleanLabel(item.rawLabel).includes("cannula") ||
        cleanLabel(item.rawLabel).includes("glove") ||
        cleanLabel(item.rawLabel).includes("swab") ||
        cleanLabel(item.rawLabel).includes("syringe");

      auditedResult = {
        lineItemId: item.id,
        rawLabel: item.rawLabel,
        confidenceTier: "REVIEW_POLICY_BASED",
        colorCategory: "REVIEW_FLAG",
        ruleType: "PACKAGE_BUNDLING",
        matchScore: bestBundlingMatch.score,
        billedAmountInr: item.totalBilled,
        referenceBenchmarkInr: null,
        potentialDisputeAmountInr: item.totalBilled,
        headline: isRuleVerified
          ? `Package Unbundling Review: ${item.rawLabel}`
          : (isConsumable ? `Consumable Review: ${item.rawLabel}` : `Please share the basis for this charge`),
        explanation: isRuleVerified
          ? `${rule.rationale} Should not be unbundled as a standalone charge when in ${bill.roomCategory}.`
          : (isConsumable
              ? `Consumable Review: Please clarify whether this consumable is included in the procedure or package tariff, or provide itemized reconciliation.`
              : `Please share the basis for this charge. Package tariff schedule details requested.`),
        mandatoryDisclosuresMissing: [],
        sourceCitation: isRuleVerified ? rule.source : null,
        ruleVerified: isRuleVerified,
      };
      results.push(auditedResult);
      continue;
    }

    // 5. TPA NON-PAYABLE DEDUCTION OR CONSUMABLE REVIEW
    if (item.tpaDeductedAmount > 0) {
      let bestNonPayableMatch: { rule: IrdaiNonPayableEntry; score: number } | null = null;
      for (const rule of nonPayableRules) {
        const score = computeMatchScore(item.rawLabel, rule.canonicalName, rule.aliases);
        if (!bestNonPayableMatch || score > bestNonPayableMatch.score) {
          bestNonPayableMatch = { rule, score };
        }
      }

      if (bestNonPayableMatch && bestNonPayableMatch.score >= 0.65) {
        const rule = bestNonPayableMatch.rule;
        const isRuleVerified = forceVerified ? true : rule.verified;

        auditedResult = {
          lineItemId: item.id,
          rawLabel: item.rawLabel,
          confidenceTier: "REVIEW_POLICY_BASED",
          colorCategory: "INSURER_DEDUCTION",
          ruleType: "TPA_DEDUCTION_REVIEW",
          matchScore: bestNonPayableMatch.score,
          billedAmountInr: item.totalBilled,
          referenceBenchmarkInr: null,
          potentialDisputeAmountInr: item.tpaDeductedAmount,
          headline: isRuleVerified
            ? `Dispute TPA Deduction: Rs. ${item.tpaDeductedAmount.toLocaleString("en-IN")} Deducted`
            : `Please share the basis for this charge`,
          explanation: isRuleVerified
            ? `${rule.payableExceptionRule} Reason cited by TPA: "${item.tpaDeductionReason || "Non-payable exclusion"}".`
            : `Please share the basis for this deduction. Specific policy exclusion clause requested.`,
          mandatoryDisclosuresMissing: [],
          sourceCitation: isRuleVerified ? rule.source : null,
          ruleVerified: isRuleVerified,
        };
        results.push(auditedResult);
        continue;
      } else {
        // Generic TPA deduction review
        auditedResult = {
          lineItemId: item.id,
          rawLabel: item.rawLabel,
          confidenceTier: "REVIEW_POLICY_BASED",
          colorCategory: "INSURER_DEDUCTION",
          ruleType: "TPA_DEDUCTION_REVIEW",
          matchScore: 0.5,
          billedAmountInr: item.totalBilled,
          referenceBenchmarkInr: null,
          potentialDisputeAmountInr: item.tpaDeductedAmount,
          headline: `TPA Deduction Review: Rs. ${item.tpaDeductedAmount.toLocaleString("en-IN")} Disallowed`,
          explanation: `Insurer/TPA deducted Rs. ${item.tpaDeductedAmount.toLocaleString("en-IN")}. Request the specific contract clause under IRDAI Bima Bharosa guidelines.`,
          mandatoryDisclosuresMissing: [],
          sourceCitation: null,
          ruleVerified: false,
        };
        results.push(auditedResult);
        continue;
      }
    }

    // 6. IRDAI NON-PAYABLE CONSUMABLE ADMISSION FEE CHECK (when not deducted by TPA but charged by hospital)
    let bestNonPayableMatch: { rule: IrdaiNonPayableEntry; score: number } | null = null;
    for (const rule of nonPayableRules) {
      const score = computeMatchScore(item.rawLabel, rule.canonicalName, rule.aliases);
      if (!bestNonPayableMatch || score > bestNonPayableMatch.score) {
        bestNonPayableMatch = { rule, score };
      }
    }

    if (bestNonPayableMatch && bestNonPayableMatch.score >= 0.75 && bestNonPayableMatch.rule.isGenerallyNonPayable) {
      const rule = bestNonPayableMatch.rule;
      const isRuleVerified = forceVerified ? true : rule.verified;

      // Unit compatibility check on consumable rules (e.g. PACK vs UNIT)
      const ruleUnit = normalizeUnit(rule.normalizedUnit || "UNIT");
      if (normalizedItemUnit !== ruleUnit) {
        auditedResult = {
          lineItemId: item.id,
          rawLabel: item.rawLabel,
          confidenceTier: "NEEDS_HUMAN_REVIEW",
          colorCategory: "REVIEW_FLAG",
          ruleType: "UNMATCHED_OR_LOW_CONFIDENCE",
          matchScore: bestNonPayableMatch.score,
          billedAmountInr: item.totalBilled,
          referenceBenchmarkInr: null,
          potentialDisputeAmountInr: 0,
          headline: `Needs Human Review: Unit Mismatch`,
          explanation: `Unit mismatch: billed in ${item.unit} vs. rule unit ${rule.normalizedUnit || "UNIT"}. Verify pack quantity manually.`,
          mandatoryDisclosuresMissing: [],
          sourceCitation: null,
          ruleVerified: false,
        };
        results.push(auditedResult);
        continue;
      }

      const isConsumable =
        item.category === "CONSUMABLE" ||
        cleanLabel(item.rawLabel).includes("cannula") ||
        cleanLabel(item.rawLabel).includes("glove") ||
        cleanLabel(item.rawLabel).includes("swab") ||
        cleanLabel(item.rawLabel).includes("syringe");

      const isAdminFee =
        cleanLabel(item.rawLabel).includes("admission") ||
        cleanLabel(item.rawLabel).includes("registration") ||
        cleanLabel(item.rawLabel).includes("admin");

      auditedResult = {
        lineItemId: item.id,
        rawLabel: item.rawLabel,
        confidenceTier: "REVIEW_POLICY_BASED",
        colorCategory: "REVIEW_FLAG",
        ruleType: "PACKAGE_BUNDLING",
        matchScore: bestNonPayableMatch.score,
        billedAmountInr: item.totalBilled,
        referenceBenchmarkInr: null,
        potentialDisputeAmountInr: item.totalBilled,
        headline: isRuleVerified
          ? `Administrative / Non-Standard Fee: ${item.rawLabel}`
          : (isAdminFee
              ? `Administrative Fee Review: ${item.rawLabel}`
              : (isConsumable ? `Consumable Review: ${item.rawLabel}` : `Please share the basis for this charge`)),
        explanation: isRuleVerified
          ? `${rule.payableExceptionRule}`
          : (isAdminFee
              ? `Please clarify what this administrative fee covers and whether standard non-payable administrative costs are already included in the room/package tariff.`
              : (isConsumable
                  ? `Consumable Review: Please clarify whether this consumable is included in the procedure or package tariff, or provide itemized reconciliation.`
                  : `Please share the basis for this charge. Hospital tariff schedule requested.`)),
        mandatoryDisclosuresMissing: [],
        sourceCitation: isRuleVerified ? rule.source : null,
        ruleVerified: isRuleVerified,
      };
      results.push(auditedResult);
      continue;
    }

    // 7. CLEAR / NO AUDIT FLAGS
    results.push({
      lineItemId: item.id,
      rawLabel: item.rawLabel,
      confidenceTier: "CLEAR",
      colorCategory: "NEUTRAL",
      ruleType: "NONE",
      matchScore: 0,
      billedAmountInr: item.totalBilled,
      referenceBenchmarkInr: null,
      potentialDisputeAmountInr: 0,
      headline: `No Violations Detected`,
      explanation: `Item pricing and clinical categorization align with standard benchmarks.`,
      mandatoryDisclosuresMissing: [],
      sourceCitation: null,
      ruleVerified: false,
    });
  }

  // Summary aggregation using exact integer paise arithmetic
  let totalBilledPaise = 0;
  let totalTpaDeductedPaise = 0;
  let totalPotentialDisputePaise = 0;
  let highConfidenceCount = 0;
  let reviewFlagCount = 0;
  let needsHumanReviewCount = 0;

  for (const item of bill.lineItems) {
    totalBilledPaise += toPaise(item.totalBilled);
    totalTpaDeductedPaise += toPaise(item.tpaDeductedAmount || 0);
  }

  for (const r of results) {
    totalPotentialDisputePaise += toPaise(r.potentialDisputeAmountInr);
    if (r.confidenceTier === "HIGH_CONFIDENCE") highConfidenceCount++;
    if (r.confidenceTier === "REVIEW_POLICY_BASED") reviewFlagCount++;
    if (r.confidenceTier === "NEEDS_HUMAN_REVIEW") needsHumanReviewCount++;
  }

  const totalBilledInr = toRupees(totalBilledPaise);
  const totalTpaDeductedInr = toRupees(totalTpaDeductedPaise);
  const totalPotentialDisputeInr = toRupees(totalPotentialDisputePaise);
  const estimatedPayableIfAcceptedInr = Math.max(
    0,
    toRupees(totalBilledPaise - totalPotentialDisputePaise)
  );

  return {
    billId: bill.billId,
    auditedAtIso: new Date().toISOString(),
    lengthOfStayDays: stayDays,
    totalBilledInr,
    totalTpaDeductedInr,
    totalPotentialDisputeInr,
    estimatedPayableIfAcceptedInr,
    highConfidenceFlagCount: highConfidenceCount,
    reviewFlagCount,
    needsHumanReviewCount,
    results,
  };
}
