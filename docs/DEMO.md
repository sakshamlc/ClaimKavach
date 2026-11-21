# ClaimKavach Demonstration & Audit Verification Guide (`docs/DEMO.md`)

This guide outlines the walkthrough steps for evaluating ClaimKavach's deterministic Trust Zone audit engine across synthetic demo bills.

---

## 1. Demo Scenarios & Sample Bills

| Sample Key | Invoice Description | Hospital & Bill No. | Financial Total | Key Audit Behaviors Demonstrated |
|---|---|---|---|---|
| **Sample 1** | Cardiac Stent Bill (Pre-April 2026) | Sample Metro Care Hospital (`SYN-3334`) | ₹3,42,000.00 | Date validity guard: stent is `NEEDS_REVIEW`; duplicate CBC test (`LIKELY_ISSUE`); pharmacy lump sum inquiry (`NEEDS_REVIEW`, amount 0). |
| **Sample 1b** | Cardiac Stent Bill (Post-April 2026) | Sample Metro Care Hospital (`SYN-3334`) | ₹3,42,000.00 | Date in force: stent is `LIKELY_ISSUE` (capped by unverified reference data guard); duplicate CBC (`LIKELY_ISSUE`); pharmacy lump sum (`NEEDS_REVIEW`, amount 0). |
| **Sample 2** | Bundling & TPA Deductions | DEMO Synthetic Healthcare Facility | ₹18,350.00 | Room bundling audit & Annexure-I non-payable deduction review. |
| **Sample 3** | Clean Medical Bill | Synthetic Community Clinic | ₹2,700.00 | 0 confirmed and 0 likely overcharges; 100% fair amount. |

---

## 2. Sample 1 & 1b Audit Breakdown

### Financial Tiers (Sample 1b — May Variant)
- **Total Billed:** ₹3,42,000.00 (34,200,000 paise)
- **Confirmed Overcharge:** ₹0.00 (Reference records are `verified: false`, strictly capping findings)
- **Likely Issues:** ₹71,263.97 (Stent excess ₹70,813.97 + Duplicate CBC ₹450.00)
- **Needs Review:** ₹0.00 (Pharmacy lump sum inquiry is amount 0; adds 0 to tier totals)
- **Fair Amount:** ₹3,42,000.00 (Fair = Billed - Confirmed only)
- **Adjusted Fair Amount (if likely upheld):** ₹2,70,736.03 (Fair - Likely)

### Findings Summary (3 Findings)
1. **Coronary Stent - Drug Eluting Stent (DES)** (`R-NPPA-01`):
   - **Verdict:** `LIKELY_ISSUE` (for May dates post-April 2026) / `NEEDS_REVIEW` (for March dates prior to S.O. 1587(E))
   - **Amount:** ₹70,813.97 (Billed ₹1,10,000.00 vs Notified Ceiling ₹39,186.03)
   - **Citation:** S.O. 1587(E), Drug Eluting Stents ceiling order
2. **Potential Duplicate Line Item** (`R-DUP-01`):
   - **Verdict:** `LIKELY_ISSUE`
   - **Amount:** ₹450.00 (Second identical CBC test on 2026-05-11 at ₹450.00)
   - **Citation:** Identical Line Repetition Check
3. **Unitemized Pharmacy Charge** (`R-STRUCT-01`):
   - **Verdict:** `NEEDS_REVIEW`
   - **Amount:** ₹0.00 (Inquiry finding, not a monetary demand)
   - **Citation:** `Bill structure (no reference data)`
   - **Explanation:** *"This line has no item breakdown. You can ask the hospital for an itemised pharmacy list."*

---

## 3. Honest Coverage Reporting (Three Plain Numbers)

ClaimKavach enforces honest coverage accounting:
- **Arithmetic and duplicate checks:** 16 of 16 (Every item checked for quantity × rate multiplication and duplicate charges)
- **Checked against reference data:** 1 of 16 (Only the DES coronary stent matched an ingested price ceiling order)
- **Not checked against any reference:** 15 (15 line items in categories without statutory price orders)

### Specific Per-Item Reasons for Not-Checked Lines
Every not-checked line item carries an explicit reason derived from its category and data state:
- **ICU Bed Charges & Monitoring:** No statutory price ceiling order applicable to ICU bed charges or monitoring equipment.
- **Room Rent:** No statutory price ceiling order applicable to room rent tariffs.
- **Cath Lab Procedure:** Surgical and cath lab procedure fees are not regulated under NPPA statutory price orders.
- **Doctor Consultation:** Doctor consultation fees are not regulated under statutory price ceiling schedules.
- **Nursing Charges:** No statutory ceiling order; unbundled nursing care schedule not ingested.
- **Diagnostics (CBC, Troponin, ECG):** Diagnostic laboratory and cardiac investigations are not regulated under DPCO statutory ceilings.
- **Consumables (Gloves, Swabs, Syringes):** General consumable items are not scheduled under DPCO price ceiling gazettes.
- **Administrative Fees:** Administrative and registration fees are not regulated under NPPA ceiling orders.
- **General Medicines:** Unitemized pharmacy lump sum; lacks specific formulation name and active ingredient details (includes direct link to `R-STRUCT-01` finding).

---

## 4. Testing with the Synthetic PDF Reference

To test real OCR/VLM extraction with the local reference asset:
- **PDF Asset Path:** `docs/samples/Case1_Cardiac_Stent_Synthetic.pdf`
- Refer to `docs/EXTRACTION_TEST.md` for step-by-step extraction instructions.
