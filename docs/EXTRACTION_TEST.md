# Real VLM Extraction Verification Guide (`docs/EXTRACTION_TEST.md`)

> **Notice:** Antigravity and standard sandboxed environments operate without external network access.
> This document details the exact manual protocol for verifying `docs/samples/Case1_Cardiac_Stent_Synthetic.pdf` through the live Google Gemini VLM pipeline (`EXTRACT_MOCK=0`).

---

## 1. Prerequisites

1. **Active Gemini API Key:**  
   Ensure a valid Google Gemini API key is available, either:
   - Set in `.env.local`: `GEMINI_API_KEY=your_key_here` and `GEMINI_MODEL=gemini-2.5-flash`
   - Or provided by the user in the client UI configuration panel (sent via `x-gemini-key` header, stateless, never stored on ClaimKavach servers).
2. **Real Extraction Mode:**  
   Ensure mock mode is disabled:
   ```env
   EXTRACT_MOCK=0
   ```
3. **Reference PDF Asset:**  
   Locate the synthetic reference PDF at:
   `docs/samples/Case1_Cardiac_Stent_Synthetic.pdf`

---

## 2. Test Execution Steps

1. Start the Next.js development server:
   ```bash
   npm run dev
   ```
2. Navigate in your browser to `http://localhost:3000/upload`.
3. Set the **Tax & GST Inclusion Setting** selector to:
   **"Excludes GST (Pre-tax rates)"** (`billedPriceIncludesGst = false`).
4. In the Hospital Bill Upload dropzone, upload or drag-and-drop:
   `docs/samples/Case1_Cardiac_Stent_Synthetic.pdf`.
5. Observe the client progress bar:
   - Page rendering and canvas rasterization.
   - Dispatch to `POST /api/extract`.
   - Upstream Gemini multimodal OCR extraction.

---

## 3. Expected Extraction Assertions (What to Compare)

Once extraction completes, the application automatically redirects to the interactive verification screen (`/verify`). Verify the following items against the extracted table:

| Verification Target | Expected Value / Behavior | Inspection Notes |
|---|---|---|
| **Total Lines Extracted** | **16 lines** | Ensure all 16 rows from `Sr 1` to `Sr 16` are populated. |
| **Stent Line Item** | **Intact as single line** | Description contains `Coronary stent - Drug Eluting Stent (DES)`. Category mapped as `implant`. |
| **Stent Unit Price** | **₹1,10,000.00** (`110000.00`) | Must not be blended, rounded, or split across rows. |
| **Stent Total Amount** | **₹1,10,000.00** (`110000.00`) | Quantity is `1`. |
| **Procedure Line Item** | **₹85,000.00** (`85000.00`) | Cath lab angioplasty procedure kept distinct from stent implant. |
| **Hospital Stated Total** | **₹3,42,000.00** (`342000.00`) | Extracted from bill footer. |
| **Arithmetic Sum** | **₹3,42,000.00** (`342000.00`) | Live calculation matches stated total exactly; Grand Total green banner active. |
| **Admission Date** | **2026-03-10** | Correctly parsed from header. |
| **Discharge Date** | **2026-03-14** | Correctly parsed from header. |
| **Duplicate CBC Dates** | **2026-03-11** | Both CBC test lines retain identical item date (`2026-03-11`). |
| **Pharmacy Lump Sum** | **₹85,100.00** (`85100.00`) | Billed under `PH-GEN` as quantity 1 with unit rate `85100.00`. |

---

## 4. Downstream Audit Verification

Upon clicking **"Run Statutory Audit"**:
- **3 Findings Identified:**
  1. **Stent Finding (R-NPPA-01):**
     - For March variant (`2026-03-10`): Flagged as `NEEDS_REVIEW` due to the statutory date validity guard (item date `2026-03-10` is prior to S.O. 1587(E) effective date `2026-04-01`).
     - For May variant (`2026-05-10`): Flagged as `LIKELY_ISSUE` (unverified reference data cap) questioning ₹70,813.97 excess above benchmark ₹39,186.03.
  2. **Duplicate Finding (R-DUP-01):** Flagged as `LIKELY_ISSUE` on the duplicate CBC test on `2026-03-11` (₹450.00).
  3. **Pharmacy Lump Sum Finding (R-STRUCT-01):** Flagged as `NEEDS_REVIEW` with `amount: 0` (inquiry, not a money claim; financial tiers are untouched). Citation instrument is `"Bill structure (no reference data)"` with wording: *"This line has no item breakdown. You can ask the hospital for an itemised pharmacy list."*
- **Coverage Breakdown:**
  - **Arithmetic and duplicate checks:** 16 of 16
  - **Checked against reference data:** 1 of 16
  - **Not checked against any reference:** 15
- **Not-Checked Line Items Table:**
  - Displays all 15 unchecked line items with specific reasons derived from data state (e.g. no statutory price ceiling order applicable to room rent tariffs, cath lab surgical procedures, consultation fees, or diagnostics).
  - Lines associated with findings (`item-9` duplicate CBC and `item-16` pharmacy lump sum) show direct "See finding" link anchors.
