# ClaimKavach — Regulatory Data Sourcing & Verification Tracking (DATA_TODO)

> **Core Principle:** Never invent ceiling prices, package rates, or Annexure-I classifications.
> Never encode notification numbers, S.O. numbers, or specific URLs from memory.
> Every regulatory record must carry `source`, `sourceUrl`, `effectiveDate`, `validUntil`, `instrumentNumber`, `instrumentDate`, `gstTreatment`, `version`, `verified`, and `sourceRef`.
> Any record not verified against an official gazetted source on disk is marked `"verified": false`, labeled as **DEMO DATA** in the UI, and capped at `LIKELY_ISSUE` or `NEEDS_REVIEW` by the engine.

---

## 1. Automated Source Fetch Report

An automated download attempt was initiated.
- **Environment:** Sandboxed execution mode (no external network access).
- **Result:** Network requests returned `ENOTFOUND` due to sandbox isolation. No certificate bypass was attempted.
- **Status:** **0 files downloaded.** Automated fetch stopped immediately.
- **Zero Memory Reconstruction:** No notification numbers, specific URLs, ceiling prices, or classifications are encoded from memory.

---

## 2. Official Sources Required for Manual Drop-in

Please download the following statutory documents directly from official government portals (`.gov.in` / `.nic.in`) and place them into `docs/sources/raw/`. Read S.O. numbers, dates, and ceiling amounts directly from the official PDF documents:

| Statutory Instrument | Drop-in Filename | Official Domains | What to Record from Document | Status |
|---|---|---|---|---|
| **NPPA Scheduled Drug Ceilings** | `docs/sources/raw/nppa_drug_ceilings.pdf` | `egazette.gov.in`, `pharma-dept.gov.in` / `pharmaceuticals.gov.in`, `nppaindia.nic.in` (flagged by browser; use as last resort, never bypass warnings) | Latest annual WPI revision plus later amendment orders; record ceiling price, unit, `gstTreatment: "EXCLUDED"` | **PENDING DROP-IN** |
| **NPPA Coronary Stent Ceilings** | `docs/sources/raw/nppa_stents.pdf` | `egazette.gov.in`, `pharma-dept.gov.in` / `pharmaceuticals.gov.in`, `nppaindia.nic.in` | Latest revision, effective 1 April 2026; read the exact S.O. number and date as printed in the PDF | **PENDING DROP-IN** |
| **NPPA Knee Implant Ceilings** | `docs/sources/raw/nppa_knee_implants.pdf` | `egazette.gov.in`, `pharma-dept.gov.in` / `pharmaceuticals.gov.in`, `nppaindia.nic.in` | Knee implant ceiling order and its latest extension (time-limited order; record `validUntil` from document) | **PENDING DROP-IN** |
| **IRDAI Annexure-I Non-Payable & Subsumed Items** | `docs/sources/raw/irdai_annexure_1.pdf` | `irdai.gov.in` | Master Circular with Annexure of non-payable and subsumed items (decide between 2020 and 2024 master circulars from the document itself; record `sourceDocument`) | **PENDING DROP-IN** |

> **Official Portal Access Rules:**
> - Prefer `egazette.gov.in` and `pharma-dept.gov.in` / `pharmaceuticals.gov.in`.
> - If using `nppaindia.nic.in`, note that browser SSL certificate warnings may appear; use only as last resort and **never** bypass warnings in scripts.
> - For IRDAI circulars, use `irdai.gov.in` directly.

---

## 3. Verification Protocol (`scripts/verify-sources.ts`)

Once files are dropped into `docs/sources/raw/`:
1. Run `npx tsx scripts/verify-sources.ts` to compute SHA-256 hashes of dropped files and check against `docs/sources/MANIFEST.json`.
2. Only `scripts/verify-sources.ts` is permitted to set `"verified": true` in the dataset files.
3. The Trust Zone engine never reads files directly; it consumes the `verified` flag. If any record claims `"verified": true` without a matching file and hash on disk, automated tests fail.

---

## 4. Current Seed Data Status (Fictional Demo Data Only)

Until official files are dropped in and verified:
- **Drug Ceilings:** Visibly fictional names (`DEMO Drug Alpha 100mg`, `DEMO Drug Beta 500mg`), round prices, `verified: false`.
- **Implants:** Round fake prices (`1000000` / `2000000` paise), `verified: false`.
- **Annexure-I Items:** Fictional items (`DEMO Item Alpha`, `DEMO Item Beta`, `DEMO Item Gamma`), abstract treatments (`NON_PAYABLE`, `SUBSUMED`, `OPTIONAL`, `OTHER`), list IDs from data files, `sourceDocument: "TODO"`.
- **Room Bundling:** Fictional services (`DEMO Bundled Service Alpha`, `DEMO Bundled Service Beta`).
- **Engine Guard:** Findings derived from unverified reference data can **never** produce `CONFIRMED_OVERCHARGE` (strictly capped at `LIKELY_ISSUE` or `NEEDS_REVIEW`).
