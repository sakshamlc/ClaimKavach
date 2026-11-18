/**
 * Rule: R-POLICY-01 (Proportionate Deduction Audit from Room Rent Cap)
 *
 * Audits insurance policy proportionate deductions when the patient selects a room
 * whose tariff exceeds the policy's specified room rent cap.
 *
 * Statutory / Regulatory Principle:
 * - When room rent limit is exceeded, proportionate deduction may only apply to
 *   associated medical charges (doctor visits, nursing, OT charges).
 * - Under IRDAI Master Circular guidelines, proportionate deductions MUST NOT be applied
 *   to fixed-cost items such as medicines, consumables, and medical implants.
 *
 * Formula:
 * - Admissible Ratio = Room Rent Cap (Paise) / Actual Daily Room Rent (Paise)
 * - Maximum Permissible Deduction = Associated Charges * (1 - Admissible Ratio)
 */

import { MedicalBill, AuditFinding } from '../types';
import { formatINR, multiplyPaiseByQuantity } from '../currency';

export function evaluatePolicyRule(bill: MedicalBill): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const policy = bill.policyContext;

  if (!policy || !policy.roomRentLimitPaise || policy.roomRentLimitPaise <= 0) {
    return findings; // No room rent limit defined in policy context
  }

  // Find room rent item on bill
  const roomRentItem = bill.items.find(
    (i) => i.category === 'room_rent' && i.unitRatePaise !== null && i.unitRatePaise > 0
  );

  if (!roomRentItem || !roomRentItem.unitRatePaise) {
    return findings;
  }

  const actualDailyRoomRent = roomRentItem.unitRatePaise;
  const roomRentCap = policy.roomRentLimitPaise;

  if (actualDailyRoomRent <= roomRentCap) {
    return findings; // Room rent within policy limits; proportionate deduction does not apply
  }

  const admissibleRatio = roomRentCap / actualDailyRoomRent;
  const excessFraction = 1 - admissibleRatio;

  // 1. Check for improper proportionate deductions on excluded categories (pharmacy, implants)
  for (const item of bill.items) {
    if (
      (item.category === 'pharmacy' || item.category === 'implant') &&
      item.deductedPaise !== null &&
      item.deductedPaise !== undefined &&
      item.deductedPaise > 0
    ) {
      const deducted = item.deductedPaise;
      // Check if deduction matches proportionate deduction pattern
      const expectedPropDeduction = multiplyPaiseByQuantity(item.totalBilledPaise || 0, excessFraction);
      const isPropDeduction = Math.abs(deducted - expectedPropDeduction) < 500; // within 5 rupees

      if (isPropDeduction) {
        findings.push({
          ruleId: 'R-POLICY-01',
          itemId: item.id,
          verdict: 'LIKELY_ISSUE',
          expected: 0,
          actual: deducted,
          amount: deducted,
          citation: {
            kind: 'REGULATORY',
            instrument: 'IRDAI Master Circular on Health Insurance (Proportionate Deductions)',
            section: 'Immunity of Medicines and Implants from Room Rent Proportionate Deductions',
            url: 'https://irdai.gov.in',
            effectiveDate: '2020-07-01',
            verified: true,
            sourceRef: 'Chapter II, Clause 5',
          },
          title: 'Improper Proportionate Deduction on Pharmacy/Implant',
          explanation: {
            en: `Insurer deducted ${formatINR(deducted)} from "${item.description}" due to room rent capping. Under IRDAI guidelines, proportionate deductions cannot be applied to medicines, consumables, or medical devices. Formula: Associated Charges × (1 - ${formatINR(roomRentCap)} / ${formatINR(actualDailyRoomRent)}).`,
            hi: `बीमा कंपनी ने रूम रेंट सीमा के आधार पर "${item.description}" से ${formatINR(deducted)} की कटौती की। IRDAI नियमों के अनुसार दवाओं और उपकरणों पर अनुपातिक कटौती लागू नहीं हो सकती।`,
          },
          suggestedAction: 'Dispute deduction with insurer citing IRDAI prohibition on proportionate deductions for medicines and implants.',
        });
      }
    }
  }

  return findings;
}
