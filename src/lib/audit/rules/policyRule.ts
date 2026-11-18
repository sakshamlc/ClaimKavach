/**
 * Rule: R-POLICY-01 (Proportionate Deduction Audit from Room Rent Cap)
 *
 * Audits insurance policy proportionate deductions when the patient selects a room
 * whose tariff exceeds the policy's specified room rent cap.
 *
 * Verdict & Reporting:
 * - Findings on medicines/implants are NEEDS_REVIEW (applicability depends on specific policy wording).
 * - Shows the mathematical formula and all input parameters clearly.
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
    return findings;
  }

  // Find room rent item on bill
  const roomRentItem = bill.items.find(
    (i) => i.category === 'room_rent' && i.unitRatePaise !== null && i.unitRatePaise !== undefined && i.unitRatePaise > 0
  );

  if (!roomRentItem || !roomRentItem.unitRatePaise) {
    return findings;
  }

  const actualDailyRoomRent = roomRentItem.unitRatePaise;
  const roomRentCap = policy.roomRentLimitPaise;

  if (actualDailyRoomRent <= roomRentCap) {
    return findings;
  }

  const admissibleRatio = roomRentCap / actualDailyRoomRent;
  const excessFraction = 1 - admissibleRatio;

  for (const item of bill.items) {
    if (
      (item.category === 'pharmacy' || item.category === 'implant') &&
      item.deductedPaise !== null &&
      item.deductedPaise !== undefined &&
      item.deductedPaise > 0
    ) {
      const deducted = item.deductedPaise;
      const expectedPropDeduction = multiplyPaiseByQuantity(item.totalBilledPaise || 0, excessFraction);
      const isPropDeduction = Math.abs(deducted - expectedPropDeduction) < 500; // within 5 rupees

      if (isPropDeduction) {
        findings.push({
          ruleId: 'R-POLICY-01',
          itemId: item.id,
          verdict: 'NEEDS_REVIEW',
          expected: 0,
          actual: deducted,
          amount: deducted,
          citation: {
            kind: 'REGULATORY',
            instrument: 'Health Insurance Policy - Room Rent Proportionate Deductions',
            section: 'Room Rent Capping Evaluation',
            url: 'https://irdai.gov.in',
            effectiveDate: '2024-01-01',
            verified: true,
            sourceRef: 'Policy Terms',
          },
          title: 'Proportionate Deduction Review on Pharmacy/Device',
          explanation: {
            en: `Insurer deducted ${formatINR(deducted)} from "${item.description}" due to room rent capping. Application to medicines and devices depends on specific policy wording. Formula: Associated Charges × (1 - Room Rent Cap / Actual Room Rent). Inputs: Room Rent Cap = ${formatINR(roomRentCap)}, Actual Room Rent = ${formatINR(actualDailyRoomRent)}, Billed Amount = ${formatINR(item.totalBilledPaise || 0)}, Ratio = ${(admissibleRatio * 100).toFixed(1)}%.`,
            hi: `बीमा कंपनी ने रूम रेंट सीमा के कारण "${item.description}" से ${formatINR(deducted)} की कटौती की। दवाओं व उपकरणों पर इसकी प्रयोज्यता पॉलिसी शब्दों पर निर्भर करती है। सूत्र: संबंधित शुल्क × (1 - रूम रेंट सीमा / वास्तविक रूम रेंट)।`,
          },
          suggestedAction: 'Review insurance policy terms to confirm whether proportionate deductions apply to medicines and implants.',
        });
      }
    }
  }

  return findings;
}
