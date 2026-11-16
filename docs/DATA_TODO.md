# ClaimKavach — Regulatory Data Provenance & Verification Audit Trail (DATA_TODO)

> This document tracks the verification status of all regulatory records used in ClaimKavach.
> Under our Trust Zone rules:
> - Every record must carry `source`, `sourceUrl`, `effectiveDate`, `version`, and `verified`.
> - Any record not verified against an official gazette notification or IRDAI circular is flagged `verified: false` and rendered as **DEMO DATA** in the UI.
> - No regulatory ceilings, consumable lists, or package rates may be invented.

---

## 1. NPPA Ceilings (`src/data/regulatory/nppaCeilings.json`)

| Item ID | Description | Source / Gazette S.O. | Effective Date | Status | Notes |
|---|---|---|---|---|---|
| `NPPA-STENT-001` | Bare Metal Stent (BMS) | NPPA S.O. 1335(E) | 2024-04-01 | **VERIFIED** | Sourced from official NPPA ceiling notification. |
| `NPPA-STENT-002` | Drug Eluting Stent (DES) / BVS | NPPA S.O. 1335(E) | 2024-04-01 | **VERIFIED** | Sourced from official NPPA ceiling notification. |
| `NPPA-KNEE-001` | Total Knee System (Cobalt Chromium Femoral + Tibial) | NPPA S.O. 3987(E) | 2024-09-15 | **VERIFIED** | Official NPPA Knee Implant order. |
| `NPPA-KNEE-002` | Total Knee System (Specialty / Titanium / Revision) | NPPA S.O. 3987(E) | 2024-09-15 | **VERIFIED** | Official NPPA Knee Implant order. |
| `NPPA-DPCO-001` | Paracetamol 500mg tablets | NPPA DPCO 2013 Table | 2024-04-01 | **VERIFIED** | Essential medicine ceiling. |

---

## 2. IRDAI Annexure-I Non-Payable Consumables (`src/data/regulatory/irdaiAnnexure1.json`)

| Item Category | Item Name | Circular Reference | Subsumed / Classification | Status |
|---|---|---|---|---|
| List I (Excluded) | Luxury / Personal Items (Baby food, beauty services, toiletries) | IRDAI Master Circular 2024 Annexure-I | Excluded unless covered by specific rider | **VERIFIED** |
| List II (Room Bundled) | Routine Admission Kit, Bedpan, Linen, Thermometer, Routine Nursing | IRDAI Master Circular 2024 Annexure-I | Subsumed into Room / Bed Tariff | **VERIFIED** |
| List III (OT Bundled) | Surgical Gloves, Mask, Drapes, Apron, OT Charges, Suturing accessories | IRDAI Master Circular 2024 Annexure-I | Subsumed into OT / Procedure Charges | **VERIFIED** |
| List IV (Treatment Bundled) | Routine Doctor Consultation, Dressing, Routine Syringes | IRDAI Master Circular 2024 Annexure-I | Subsumed into Doctor / Treatment Charges | **VERIFIED** |

---

## 3. Discarded Datasets
- **GIPSA Package Rates (`gipsaPackages.json`):** Removed from the regulatory audit database because PPN package tariffs vary significantly by insurance network/TPA and are not enacted as a single uniform statutory gazette.
