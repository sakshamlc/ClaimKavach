/**
 * ClaimKavach — Trust Zone Pure Deterministic Audit Engine
 *
 * Orchestrates pure deterministic audit rules across medical bills and reference data.
 *
 * Guarantees:
 * 1. 100% Pure Functional: Identical input yields identical output.
 * 2. Unmerged Totals: billed, fair, confirmed, likely, needsReview.
 * 3. Dual Coverage: arithmeticChecked/total, regulatoryChecked/total, notCheckedItems.
 * 4. Centralized Guards:
 *    - Date validity downgrades out-of-date ceilings to NEEDS_REVIEW.
 *    - Non-exact token matching caps findings at LIKELY_ISSUE.
 *    - Unverified (verified: false) reference data can NEVER produce CONFIRMED_OVERCHARGE.
 * 5. Strictly no banned words ("illegal", "fraud", "cheating").
 * 6. Zero timestamps (generatedAt is forbidden in Trust Zone output).
 */

import {
  MedicalBill,
  AuditReport,
  AuditFinding,
  ReportTotals,
  ReportCoverage,
  LineItem,
  NotCheckedItem,
} from './types';
import {
  NppaCeilingRecord,
  ImplantCeilingRecord,
  Annexure1Record,
  RoomBundlingRecord,
  loadNppaCeilings,
  loadImplantCeilings,
  loadAnnexure1Classifications,
  loadRoomBundlingRecords,
  checkRecordDateValidity,
  enforceVerdictGuard,
  BaseRegulatoryRecord,
} from './regulatory';
import { addPaise, subtractPaise } from './currency';
import { findBestMatch, findBestDrugMatch } from './matching';

import { evaluateMathRule } from './rules/mathRule';
import { evaluateTotalRule } from './rules/totalRule';
import { evaluateDuplicateRule } from './rules/duplicateRule';
import { evaluateNppaCeilingRule, extractStrength, extractDosageForm } from './rules/nppaCeilingRule';
import { evaluateMrpRule } from './rules/mrpRule';
import { evaluateAnnexureDeductionRule } from './rules/annexureDeductionRule';
import { evaluateBundlingRule } from './rules/bundlingRule';
import { evaluatePolicyRule } from './rules/policyRule';
import { evaluatePharmacyLumpSumRule } from './rules/pharmacyLumpSumRule';

// Import default seed datasets
import nppaSeedData from '../../data/regulatory/nppaCeilings.json';
import implantSeedData from '../../data/regulatory/implants.json';
import annexure1SeedData from '../../data/regulatory/annexure1.json';
import roomBundlingSeedData from '../../data/regulatory/roomBundling.json';

export interface AuditReferenceData {
  nppaCeilings?: NppaCeilingRecord[];
  implantCeilings?: ImplantCeilingRecord[];
  annexure1?: Annexure1Record[];
  roomBundling?: RoomBundlingRecord[];
}

/**
 * Runs the deterministic audit on a medical bill.
 */
export function runAudit(
  bill: MedicalBill,
  customReferenceData?: AuditReferenceData
): AuditReport {
  // 1. Load reference datasets
  const nppaCeilings = customReferenceData?.nppaCeilings ?? loadNppaCeilings(nppaSeedData);
  const implantCeilings = customReferenceData?.implantCeilings ?? loadImplantCeilings(implantSeedData);
  const annexure1 = customReferenceData?.annexure1 ?? loadAnnexure1Classifications(annexure1SeedData);
  const roomBundling = customReferenceData?.roomBundling ?? loadRoomBundlingRecords(roomBundlingSeedData);

  const dataVersions: Record<string, string> = {
    nppa: nppaCeilings[0]?.version || 'UNKNOWN',
    implants: implantCeilings[0]?.version || 'UNKNOWN',
    irdai: annexure1[0]?.version || 'UNKNOWN',
    roomBundling: roomBundling[0]?.version || 'UNKNOWN',
  };

  const rawFindings: Array<{
    finding: AuditFinding;
    referenceRecord?: BaseRegulatoryRecord;
    isExactMatch: boolean;
    item?: LineItem;
  }> = [];

  const checkedArithmeticItemIds = new Set<string>();
  const checkedRegulatoryItemIds = new Set<string>();

  // 2. Bill-level arithmetic checks
  const totalFinding = evaluateTotalRule(bill, { confidenceThreshold: 0.9 });
  if (totalFinding) {
    rawFindings.push({ finding: totalFinding, isExactMatch: true });
  }

  const duplicateFindings = evaluateDuplicateRule(bill);
  for (const dup of duplicateFindings) {
    rawFindings.push({ finding: dup, isExactMatch: true });
  }

  // 3. Line-item evaluations
  for (const item of bill.items) {
    // Arithmetic check (R-MATH-01)
    if (item.quantity !== null && item.unitRatePaise !== null && item.totalBilledPaise !== null) {
      checkedArithmeticItemIds.add(item.id);
      const mathFinding = evaluateMathRule(item, {
        confidenceThreshold: 0.9,
        hasUnextractedDiscountOrTax: bill.hasUnextractedDiscountOrTax,
      });
      if (mathFinding) {
        rawFindings.push({ finding: mathFinding, isExactMatch: true, item });
      }
    }

    // MRP enforcement (R-NPPA-02)
    if (item.mrpPaise !== null && item.unitRatePaise !== null) {
      const mrpFinding = evaluateMrpRule(item);
      if (mrpFinding) {
        rawFindings.push({ finding: mrpFinding, isExactMatch: true, item });
      }
    }

    // Bill structure / Pharmacy lump sum check (R-STRUCT-01)
    const structFinding = evaluatePharmacyLumpSumRule(item, bill.totalBilledPaise);
    if (structFinding) {
      rawFindings.push({ finding: structFinding, isExactMatch: true, item });
    }

    // Pharmacy statutory ceiling (R-NPPA-01)
    if (item.category === 'pharmacy' && nppaCeilings.length > 0) {
      const match = findBestDrugMatch(item.description, nppaCeilings, 0.65);
      if (match.record) {
        const itemStrength = extractStrength(item.description);
        const recordStrength = extractStrength(match.record.strength);
        const itemForm = extractDosageForm(item.description);
        const recordForm = extractDosageForm(match.record.dosageForm);
        const specMatches =
          (!itemStrength || !recordStrength || itemStrength === recordStrength) &&
          (!itemForm || !recordForm || itemForm === recordForm);

        if (specMatches) {
          checkedRegulatoryItemIds.add(item.id);
        }

        const ceilingFinding = evaluateNppaCeilingRule(item, match.record, match.isExact, {
          billedPriceIncludesGst: item.billedPriceIncludesGst !== undefined ? item.billedPriceIncludesGst : bill.billedPriceIncludesGst,
          gstRatePct: item.gstRatePct !== undefined ? item.gstRatePct : bill.gstRatePct,
        });
        if (ceilingFinding) {
          rawFindings.push({
            finding: ceilingFinding,
            referenceRecord: match.record,
            isExactMatch: match.isExact,
            item,
          });
        }
      }
    }

    // Medical implant statutory ceiling (R-NPPA-01)
    if (item.category === 'implant' && implantCeilings.length > 0) {
      const match = findBestMatch(item.description, implantCeilings, 0.65);
      if (match.record) {
        checkedRegulatoryItemIds.add(item.id);
        const implantFinding = evaluateNppaCeilingRule(item, match.record, match.isExact, {
          billedPriceIncludesGst: item.billedPriceIncludesGst !== undefined ? item.billedPriceIncludesGst : bill.billedPriceIncludesGst,
          gstRatePct: item.gstRatePct !== undefined ? item.gstRatePct : bill.gstRatePct,
        });
        if (implantFinding) {
          rawFindings.push({
            finding: implantFinding,
            referenceRecord: match.record,
            isExactMatch: match.isExact,
            item,
          });
        }
      }
    }

    // TPA deduction audit (R-ANX-01)
    if (item.deductedPaise !== null && item.deductedPaise !== undefined && item.deductedPaise > 0) {
      const match = findBestMatch(item.description, annexure1, 0.65);
      if (match.record) {
        checkedRegulatoryItemIds.add(item.id);
      }
      const deductionFinding = evaluateAnnexureDeductionRule(item, match.record, annexure1.length > 0);
      if (deductionFinding) {
        rawFindings.push({
          finding: deductionFinding,
          referenceRecord: match.record || undefined,
          isExactMatch: match.isExact,
          item,
        });
      }
    }

    // Room bundling check (R-BUNDLE-01)
    if (
      item.category === 'nursing' ||
      item.category === 'admin_fee' ||
      item.category === 'consumable' ||
      item.category === 'other'
    ) {
      const match = findBestMatch(item.description, roomBundling, 0.65);
      if (match.record) {
        checkedRegulatoryItemIds.add(item.id);
        const bundlingFinding = evaluateBundlingRule(item, bill, match.record);
        if (bundlingFinding) {
          rawFindings.push({
            finding: bundlingFinding,
            referenceRecord: match.record,
            isExactMatch: match.isExact,
            item,
          });
        }
      }
    }
  }

  // 4. Policy proportionate deductions (R-POLICY-01)
  const policyFindings = evaluatePolicyRule(bill);
  for (const pf of policyFindings) {
    rawFindings.push({ finding: pf, isExactMatch: true });
  }

  // 5. Centralized Guards Processing
  const finalFindings: AuditFinding[] = [];

  for (const entry of rawFindings) {
    const finding = { ...entry.finding };

    // Guard A: Date Validity (centrally applied)
    if (entry.referenceRecord) {
      const dateCheck = checkRecordDateValidity(
        entry.referenceRecord,
        entry.item?.date,
        bill.billDate
      );
      if (!dateCheck.isValid) {
        // Ceiling expired, not in effect, or date unknown => downgrade to NEEDS_REVIEW
        finding.verdict = 'NEEDS_REVIEW';
        if (dateCheck.needsReviewReason) {
          finding.explanation = {
            en: `${finding.explanation.en} [Note: ${dateCheck.needsReviewReason}]`,
            hi: `${finding.explanation.hi} [नोट: ${dateCheck.needsReviewReason}]`,
          };
        }
      }
    }

    // Guard B: Non-Exact / Fuzzy Match Capping (centrally applied)
    if (!entry.isExactMatch && finding.verdict === 'CONFIRMED_OVERCHARGE') {
      finding.verdict = 'LIKELY_ISSUE';
    }

    // Guard C: Unverified Reference Data Capping (centrally applied)
    if (finding.citation.kind === 'REGULATORY') {
      finding.verdict = enforceVerdictGuard(finding.verdict, finding.citation.verified);
    }

    finalFindings.push(finding);
  }

  // 6. Calculate unmerged totals
  // Fair Amount & Reconciliation Principles:
  // Fair Amount = Billed - Confirmed only.
  // ifLikelyUpheld = Fair - Likely = Billed - Confirmed - Likely.
  let confirmedTotal = 0;
  let likelyTotal = 0;
  let needsReviewTotal = 0;

  for (const f of finalFindings) {
    if (f.verdict === 'CONFIRMED_OVERCHARGE') {
      confirmedTotal = addPaise(confirmedTotal, f.amount);
    } else if (f.verdict === 'LIKELY_ISSUE') {
      likelyTotal = addPaise(likelyTotal, f.amount);
    } else if (f.verdict === 'NEEDS_REVIEW') {
      needsReviewTotal = addPaise(needsReviewTotal, f.amount);
    }
  }

  const fairAmount = subtractPaise(bill.totalBilledPaise, confirmedTotal);
  const ifLikelyUpheld = subtractPaise(fairAmount, likelyTotal);

  const totals: ReportTotals = {
    billed: bill.totalBilledPaise,
    fair: fairAmount < 0 ? 0 : fairAmount,
    ifLikelyUpheld: ifLikelyUpheld < 0 ? 0 : ifLikelyUpheld,
    confirmed: confirmedTotal,
    likely: likelyTotal,
    needsReview: needsReviewTotal,
  };

  // 7. Calculate coverage & notCheckedItems
  // An item is "not checked" when it matched NO reference-data record
  // (a price order, an Annexure entry or a bundling entry), regardless of arithmetic or duplicate checks.
  const notCheckedItems: NotCheckedItem[] = bill.items
    .filter((item) => !checkedRegulatoryItemIds.has(item.id))
    .map((item) => {
      let reason = '';
      if (/knee/i.test(item.description)) {
        const effectiveDate = item.date || bill.billDate;
        const isExpired = effectiveDate ? effectiveDate > '2027-01-15' : false;
        reason = isExpired
          ? "Knee implant ceiling extension order S.O. 6222(E) expired on 2027-01-15 unless renewed by subsequent notification; root price table from S.O. 5190(E) / S.O. 2668(E) has not been ingested; item is NOT_CHECKED."
          : "Knee implant ceiling order S.O. 6222(E) is valid until 2027-01-15 (extending S.O. 5190(E)), but root price table from S.O. 5190(E) / S.O. 2668(E) has not been ingested; item is NOT_CHECKED.";
      } else if (item.totalBilledPaise === null || item.totalBilledPaise === undefined) {
        reason = "Line item lacks billed price or quantity details on invoice.";
      } else if (item.category === 'pharmacy') {
        const isLump =
          (item.quantity === 1 || item.quantity === null) &&
          /lump|general|sundr|medicines/i.test(item.description);
        reason = isLump
          ? "Unitemized pharmacy lump sum; lacks specific formulation name and active ingredient details."
          : "No matching active pharmaceutical ingredient / formulation in ingested NPPA DPCO schedules.";
      } else if (item.category === 'implant') {
        reason = "No matching implant price ceiling order in S.O. 1587(E) (only coronary stents currently ingested).";
      } else if (item.category === 'icu') {
        reason = /monitor/i.test(item.description)
          ? "No statutory price ceiling order applicable to ICU monitoring equipment."
          : "No statutory price ceiling order applicable to ICU bed charges.";
      } else if (item.category === 'room_rent') {
        reason = "No statutory price ceiling order applicable to room rent tariffs.";
      } else if (item.category === 'procedure') {
        reason = "Surgical and cath lab procedure fees are not regulated under NPPA statutory price orders.";
      } else if (item.category === 'doctor_visit') {
        reason = "Doctor consultation fees are not regulated under statutory price ceiling schedules.";
      } else if (item.category === 'nursing') {
        reason = "No statutory ceiling order; unbundled nursing care schedule not ingested.";
      } else if (item.category === 'investigation') {
        reason = /ecg|cardio/i.test(item.description)
          ? "Diagnostic cardiac investigations are not regulated under DPCO statutory ceilings."
          : "Diagnostic laboratory investigations are not regulated under DPCO statutory ceilings.";
      } else if (item.category === 'consumable') {
        reason = "General consumable items are not scheduled under DPCO price ceiling gazettes.";
      } else if (item.category === 'admin_fee') {
        reason = "Administrative and registration fees are not regulated under NPPA ceiling orders.";
      } else {
        reason = `No statutory reference data available for ${item.category.replace(/_/g, ' ')} category.`;
      }

      // Check if this not-checked item has an associated finding
      const associatedFinding = finalFindings.find(
        (f) => f.itemId === item.id || (f.itemIds && f.itemIds.includes(item.id))
      );

      return {
        ...item,
        reason,
        notes: /knee/i.test(item.description)
          ? item.notes
            ? `${item.notes} | ${reason}`
            : reason
          : item.notes,
        findingId: associatedFinding ? associatedFinding.ruleId : undefined,
        findingKey: associatedFinding
          ? `${associatedFinding.ruleId}-${associatedFinding.itemId}`
          : undefined,
        findingTitle: associatedFinding
          ? associatedFinding.title || associatedFinding.explanation.en
          : undefined,
      };
    });

  const coverage: ReportCoverage = {
    arithmeticChecked: checkedArithmeticItemIds.size,
    regulatoryChecked: checkedRegulatoryItemIds.size,
    notCheckedCount: notCheckedItems.length,
    total: bill.items.length,
  };

  return {
    billId: bill.id,
    totals,
    coverage,
    findings: finalFindings,
    dataVersions,
    notCheckedItems: notCheckedItems.length > 0 ? notCheckedItems : undefined,
  };
}
