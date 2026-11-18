# ClaimKavach — Architecture & Audit Core Specification

> **Guiding Principle:** Deterministic, honest, mathematically verifiable medical bill auditing.
> The Trust Zone executes pure functions with zero network I/O, no runtime clock calls, and no heuristic AI generation.

---

## 1. Five Unmerged Financial Metric Cards

ClaimKavach enforces unmerged financial reporting. Tiers of audit findings are never merged into a single "savings" figure.

| Metric Card | Definition | Determination Criteria |
|---|---|---|
| **Total Billed** | Stated gross or net hospital bill amount (`bill.totalBilledPaise`). | Extracted directly from bill header / settlement summary. |
| **Confirmed Overcharge** | Legally and mathematically undeniable overcharges. | Billed unit rate above verified statutory price ceiling (`verified: true`), printed MRP violation, or bill arithmetic error on high-confidence/verified lines. |
| **Likely Issue** | High-probability discrepancies requiring hospital reconciliation. | Unbundled charges likely subsumed in room/ICU bed tariff, duplicate lines, or unverified reference ceiling findings (`verified: false`). |
| **Needs Review** | Items requiring policy, clinical, or unit-of-issue clarification. | Billing unit ambiguities, expired regulatory ceiling orders, proportionate deductions depending on policy wording, or optional insurance covers. |
| **Fair Amount** | Adjusted reasonable amount payable deducting confirmed overcharges only. | Derived deterministically via the formula below. |
| **If Likely Upheld** | Conservative settlement amount if all likely hospital billing discrepancies are upheld upon reconciliation. | Derived deterministically via the formula below. |

---

## 2. Fair Amount Definition & Accounting Principles

### Formulas:
$$\text{Fair Amount} = \text{Total Billed} - \text{Confirmed Overcharge}$$
$$\text{If Likely Upheld} = \text{Fair Amount} - \text{Likely Issue} = \text{Total Billed} - (\text{Confirmed Overcharge} + \text{Likely Issue})$$

### What IS Subtracted from Fair Amount:
1. **`Confirmed Overcharge`**:
   - Arithmetic calculation errors ($qty \times rate \neq billed$).
   - Charges in excess of verified statutory price ceilings (NPPA Drug Schedules, gazetted stent/knee device ceilings).
   - Charges in excess of the manufacturer's printed Maximum Retail Price (MRP).

### What IS Accounted for in If Likely Upheld:
1. **`Likely Issue`**:
   - Duplicate line item billings.
   - Separate charges for routine nursing, resident doctor duty, or standard monitoring that are bundled into the room/ICU daily bed tariff.
   - Price ceiling discrepancies backed by unverified reference data (`verified: false`).

### What is NOT Subtracted:
1. **`Needs Review`**:
   - Ambiguities such as unconfirmed package units (per strip vs. per tablet).
   - Proportionate deduction evaluations under room rent caps that depend on specific policy terms.
   - Items where reference ceilings may have been revised or bill dates are outside the notification validity window.
   - *Rationale:* These items are flagged for patient awareness and insurer inquiry, but cannot be deducted without verification.
2. **`Valid Exclusion` (e.g. Standard Non-Payable Items)**:
   - Items confirmed as non-payable under standard regulatory guidelines (e.g. luxury toiletries, visitor passes).
   - *Rationale:* Valid exclusions represent legitimate patient out-of-pocket liabilities under standard insurance contracts. They are not hospital overcharges and therefore remain payable by the patient.

---

## 3. Trust Zone Integrity & Verification Boundary

```
[ Unstructured Bill / OCR / Extraction ]
                   │
                   ▼ (Extract Line Items, Unit Rates, Billed Amounts, Confidence)
      ┌────────────────────────────────────────────────────────┐
      │               TRUST ZONE (src/lib/audit)               │
      │  - Pure functional determinism (zero side-effects)      │
      │  - Integer paise arithmetic (round-half-up, no float)  │
      │  - Never reads filesystem or manifest                  │
      │  - Consumes only record.verified flag                   │
      │  - Centrally enforced date & confidence guards          │
      └────────────────────────────────────────────────────────┘
                   │
                   ▼ (AuditReport)
[ UI Cards: Billed | Fair | Confirmed | Likely | Needs Review ]
```
