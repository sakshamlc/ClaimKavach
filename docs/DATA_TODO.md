# ClaimKavach — Regulatory Data Sourcing & Verification Tracking (DATA_TODO)

> **Core Principle:** Never invent ceiling prices, package rates, or Annexure-I classifications.
> Every regulatory record must carry `source`, `sourceUrl`, `effectiveDate`, `version`, and `verified`.
> Any record not verified against an official gazetted source is marked `"verified": false`, labeled as **DEMO DATA** in the UI, and capped at `LIKELY_ISSUE` or `NEEDS_REVIEW` by the engine.

---

## 1. Action Items for Official Source Drop-in

To transition from synthetic seed data to statutory data, drop the official files into `/docs/sources/`:

1. **NPPA Scheduled Drug Ceilings (DPCO 2013):**
   - **Download:** Latest gazetted schedule from [NPPA Ceiling Prices Portal](https://www.nppaindia.nic.in/en/utilities/ceiling-price/).
   - **Drop Location:** `/docs/sources/nppa_ceiling_prices_current.pdf`
   - **Target JSON:** `src/data/regulatory/nppaCeilings.json`

2. **NPPA Coronary Stents Gazette:**
   - **Download:** S.O. 1335(E) and annual WPI revision order from [NPPA Coronary Stents](https://www.nppaindia.nic.in/en/medical-devices/coronary-stents/).
   - **Drop Location:** `/docs/sources/nppa_stents_gazette_so_1335e.pdf`
   - **Target JSON:** `src/data/regulatory/nppaCeilings.json`

3. **NPPA Orthopedic Knee Implants Gazette:**
   - **Download:** S.O. 3987(E) from [NPPA Knee Implants](https://www.nppaindia.nic.in/en/medical-devices/knee-implants/).
   - **Drop Location:** `/docs/sources/nppa_knee_implants_gazette_so_3987e.pdf`
   - **Target JSON:** `src/data/regulatory/nppaCeilings.json`

4. **IRDAI Annexure-I (Lists I, II, III, IV):**
   - **Download:** Master Circular on Health Insurance (Annexure-I Non-Payable Items) from [IRDAI Official Portal](https://irdai.gov.in).
   - **Drop Location:** `/docs/sources/irdai_master_circular_annexure_1.pdf`
   - **Target JSON:** `src/data/regulatory/irdaiAnnexure1.json`

---

## 2. Seed Data Status Tracking

Until official source files are dropped into `/docs/sources/` and ingested, the repository ships with a small, clearly-marked synthetic dataset for demo purposes:

| Dataset | Record ID | Description | Verified Status | Engine Cap |
|---|---|---|---|---|
| NPPA Ceilings | `SYN-NPPA-STENT-01` | Synthetic Coronary DES Stent benchmark | `false` (DEMO DATA) | Capped at `LIKELY_ISSUE` / `NEEDS_REVIEW` |
| NPPA Ceilings | `SYN-NPPA-KNEE-01` | Synthetic Primary Knee Femoral Component | `false` (DEMO DATA) | Capped at `LIKELY_ISSUE` / `NEEDS_REVIEW` |
| NPPA Ceilings | `SYN-NPPA-MED-01` | Synthetic Paracetamol 650mg IV Infusion | `false` (DEMO DATA) | Capped at `LIKELY_ISSUE` / `NEEDS_REVIEW` |
| IRDAI Annexure-I | `SYN-ANX-LIST2-01` | Routine Admission / Registration Kit | `false` (DEMO DATA) | Capped at `LIKELY_ISSUE` |
| IRDAI Annexure-I | `SYN-ANX-LIST2-02` | Routine Nursing & Monitoring charges | `false` (DEMO DATA) | Capped at `LIKELY_ISSUE` |
| IRDAI Annexure-I | `SYN-ANX-LIST3-01` | Surgical Gloves / Mask / OT Drapes | `false` (DEMO DATA) | Capped at `LIKELY_ISSUE` |
| IRDAI Annexure-I | `SYN-ANX-LIST1-01` | Luxury / Personal Toiletries | `false` (DEMO DATA) | `VALID_EXCLUSION` |

---

## 3. Discarded Datasets
- **GIPSA Package Rates (`gipsaPackages.json`):** Explicitly excluded from the repository. PPN tariffs are bilaterally negotiated and not published as a single national statutory gazette.
