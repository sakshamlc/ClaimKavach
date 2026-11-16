# Regulatory Source Documents Drop-in Directory

Place official government gazettes, NPPA notifications, and IRDAI circulars here.
The automated ingestion loaders in `scripts/ingestRegulatory.ts` will parse these documents into `src/data/regulatory/*.json`.

## Required Official Documents

### 1. NPPA Drug Price Ceilings
- **Filename:** `nppa_ceiling_prices_current.pdf` or `nppa_ceiling_prices_current.xlsx`
- **Official Source:** National Pharmaceutical Pricing Authority (NPPA), Department of Pharmaceuticals, Ministry of Chemicals & Fertilizers.
- **URL:** https://www.nppaindia.nic.in/en/utilities/ceiling-price/
- **Expected Content:** Scheduled formulation ceiling prices under DPCO 2013 (updated annually with WPI on April 1).

### 2. NPPA Coronary Stents Gazette Notification
- **Filename:** `nppa_stents_gazette_so_1335e.pdf`
- **Official Source:** Gazette of India Notification S.O. 1335(E) (and subsequent annual revision orders).
- **URL:** https://www.nppaindia.nic.in/en/medical-devices/coronary-stents/
- **Expected Content:** Bare Metal Stents (BMS) and Drug Eluting Stents (DES / BVS) ceiling prices with GST rules.

### 3. NPPA Knee Implants Gazette Notification
- **Filename:** `nppa_knee_implants_gazette_so_3987e.pdf`
- **Official Source:** Gazette of India Notification S.O. 3987(E) (and subsequent extension orders).
- **URL:** https://www.nppaindia.nic.in/en/medical-devices/knee-implants/
- **Expected Content:** Primary Knee System (Femoral, Tibial, Articular, Patellar components) and Revision Knee System price caps.

### 4. IRDAI Annexure-I Non-Payables & Bundling Circular
- **Filename:** `irdai_master_circular_annexure_1.pdf`
- **Official Source:** Insurance Regulatory and Development Authority of India (IRDAI) Master Circular on Health Insurance Products.
- **Reference:** IRDAI/HLT/REG/CIR/177/09/2019 and Master Circular 2024.
- **URL:** https://irdai.gov.in
- **Expected Content:**
  - List I: Expenses not admissible (luxury/personal).
  - List II: Items subsumed into Room / Bed charges.
  - List III: Items subsumed into Procedure / OT charges.
  - List IV: Items subsumed into Treatment / Doctor charges.

---

> **Note on Verification:**
> If a drop-in file is absent, the application relies exclusively on the small synthetic demo dataset in `src/data/regulatory/*.json`, with all records marked `"verified": false` and flagged as `DEMO DATA` in the UI. No numbers may be invented.
