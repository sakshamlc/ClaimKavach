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

## 2. Official Sources Required (Needs manual download)

The following statutory source documents are required for complete regulatory coverage. Ingestion scripts process **only** files present in `docs/sources/raw/`. Missing source files must be manually downloaded directly from official government portals (`.gov.in` / `.nic.in`) and dropped into `docs/sources/raw/`:

### 2.1 Missing Parent Documents for Ingestion
1. **NPPA Knee Implants Root Price Table (S.O. 5190(E) & S.O. 2668(E))**:
   - `Drugceiling4.pdf` contains **S.O. 6222(E)** dated 13 Nov 2026, which is an extension order valid until 2027-01-15.
   - S.O. 6222(E) does **not** print an itemized price table. Instead, it explicitly references:
     - **S.O. 5190(E)** dated 14 November 2025 (preceding ceiling revision)
     - **S.O. 2668(E)** dated 16 August 2017 (original knee replacement system ceiling price notification)
   - *Status:* **Needs manual download**. Drop into `docs/sources/raw/` as `nppa_knee_so5190e.pdf`. Until ingested, knee implants remain honestly reported as `NOT_CHECKED` with date-aware extension notes.

2. **IRDAI Master Circular Annexure-I Itemized Non-Payables & Subsumed Schedules**:
   - `Drugceiling5.pdf` contains the IRDAI Master Circular on Insurance Products 2024 narrative text (`IRDAI/HLT/CIR/PRO/84/5/2024`), but does not contain the standalone itemized table schedules (List I to IV of Non-Payable items).
   - *Status:* **Needs manual download**. Drop official Annexure-I schedule PDF into `docs/sources/raw/irdai_annexure_1.pdf`. Until ingested, Annexure-I checks remain `NOT_CHECKED`.

### 2.2 Sourced Documents Currently on Disk in `docs/sources/raw/`
| File | Instrument Number | Date | Effective Date | Ingested Records | Current Verification Status |
|---|---|---|---|---|---|
| `Drugceiling1.pdf` | S.O. 5975(E) | 2025-12-24 | 2025-12-24 | 37 Retail Formulations | `verified: false` |
| `DrugCeiling2.pdf` | S.O. 1582(E) | 2026-03-25 | 2026-04-01 | 6 Scheduled Formulations | `verified: false` |
| `Drugceiling3.pdf` | S.O. 1587(E) | 2026-03-25 | 2026-04-01 | 2 Coronary Stent Types | `verified: false` |
| `Drugceiling4.pdf` | S.O. 6222(E) | 2026-11-13 | 2026-11-15 | 0 (Extension order only; validUntil: 2027-01-15) | `verified: false` |
| `Drugceiling5.pdf` | IRDAI/HLT/CIR/PRO/84/5/2024 | 2024-05-29 | 2024-05-29 | 0 (Circular text only; annexures pending) | `verified: false` |

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
