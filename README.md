# ClaimKavach (क्लेमकवच)

> **Independent Patient Hospital Bill & Health Insurance Deduction Audit System**  
> A private, stateless, client-side web application designed to help patients and policyholders in India detect statutory price ceiling violations (NPPA DPCO), arithmetic billing discrepancies, and arbitrary insurance claim deductions (IRDAI Annexure-I / proportionate room rent capping) before paying hospital bills or accepting claim settlement letters.

---

## 1. Architectural Philosophy: AI Reads, User Verifies, Code Audits

1. **AI Reads:**  
   Google Gemini (`@google/genai`, structured schema) is used strictly inside a single serverless route (`POST /api/extract`) to turn hospital invoices and TPA settlement PDFs/images into structured JSON fields.
2. **User Verifies:**  
   Every extracted item is reviewed in an interactive verification table with a live arithmetic grand-total reconciliation bar. Users can edit descriptions, categories, quantities, rates, brands, manufacturers, and marketers, and mark rows with *"I checked this"*.
3. **Deterministic Code Audits:**  
   The audit engine (`src/lib/audit/`) is 100% deterministic TypeScript running entirely in browser memory. Every calculation uses **integer paise arithmetic** to eliminate floating-point rounding errors.

---

## 2. Privacy Model

ClaimKavach is designed around strict data minimization and patient confidentiality:

- **Zero Server/Database Storage:**  
  There is no backend database, no user accounts, no session cookies, and no persistent server storage. Hospital bills and patient records are never stored to disk.
- **In-Memory Volatile Processing:**  
  All active bill state, line items, and audit reports reside in volatile client memory (Zustand store). Closing the browser tab or clicking **Clear Data** permanently erases all in-memory records.
- **Upstream Gemini Processing:**  
  When a user uploads a document, the image/PDF is transmitted over TLS to Google Gemini solely to perform OCR and structured data extraction. This transmission is governed by Google Cloud / Gemini API data protection terms (no training on paid API inputs). Users may optionally provide their own Gemini API key via client headers.
- **Strict HTTP Headers:**  
  All responses emit `Cache-Control: no-store, no-cache, must-revalidate`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy` with `frame-ancestors 'none'`.
- **Zero LocalStorage Leakage:**  
  The browser's `localStorage` is never used to persist medical records, line item charges, or patient names.
- **On-Device Audio Read-Aloud:**  
  Voice read-aloud uses the browser Web Speech API (`speechSynthesis`). All audio synthesis runs directly on the user's device using local speech engines unless the operating system's selected voice is marked remote/online, in which case ClaimKavach displays an explicit privacy notice requiring confirmation before proceeding.

---

## 3. Financial Metrics & The 5 Unmerged Tiers

ClaimKavach enforces strict unmerged financial reporting across 5 metric cards:

1. **Total Billed:** The gross stated hospital charges.
2. **Fair Amount to Pay:** Calculated strictly as `Total Billed - Confirmed Overcharges`.
3. **Confirmed Overcharge:** Only verified statutory ceiling breaches and user-confirmed arithmetic errors.
4. **Likely Issues:** Unverified regulatory ceilings, suspected duplicate charges, bundling items, and ungrounded TPA deductions.
5. **Needs Review:** Ambiguous item formulations, missing strength/dosage units, unstated GST status, or policy-dependent proportionate deductions.

> [!IMPORTANT]
> The audit engine never blends or collapses these tiers into a single "savings" figure. If all likely issues are upheld upon official dispute, an *Adjusted Fair Amount* scenario (`Fair - Likely`) is displayed separately.

---

## 4. Known Limitations

- **Unverified Reference Data Status:**  
  All 45 regulatory reference records in `src/data/regulatory/` currently start with `verified: false`. Findings derived from unverified reference records are strictly capped at `LIKELY_ISSUE` or `NEEDS_REVIEW` and display an *"Unverified reference data"* badge. Under ClaimKavach Trust Zone policy, they can never produce a Confirmed Overcharge.
- **Regulatory Scope (45 Production Records):**  
  The active ingested dataset covers:
  - 6 statutory scheduled formulation ceilings: S.O. 1582(E) dated 2026-03-25.
  - 37 manufacturer-specific retail formulations: S.O. 5975(E) dated 2025-12-24.
  - 2 coronary stent statutory ceilings: Bare Metal Stents and Drug Eluting Stents from S.O. 1587(E) dated 2026-03-25.
- **Un-Sourced Categories Honestly Reported as NOT_CHECKED:**  
  - **Knee Implants:** `Drugceiling4.pdf` contains extension order S.O. 6222(E) valid until 2027-01-15, but references root price tables in S.O. 5190(E) and S.O. 2668(E), which have not been ingested. Knee items are reported as `NOT_CHECKED`.
  - **IRDAI Annexure-I & Room Bundling:** Full itemized schedules have not been ingested. Items in these categories are reported as `NOT_CHECKED` without invented data.
- **In-Memory Rate Limiting & Serverless Characteristics:**  
  The extraction endpoint enforces an in-memory rate limit (default 10 requests per minute per IP). In a serverless environment (e.g. Vercel), rate limit tracking is ephemeral and maintained per container instance.
- **Document Page Cap:**  
  PDF uploads are capped at 20 pages client-side to prevent memory exhaustion and excessive latency. Batches are partitioned into requests under 4 MB.

---

## 5. How to Verify Reference Data (For Human Reviewers)

To promote reference records from `verified: false` to `verified: true`:

1. **Inspect Official Source Files:**  
   Locate official gazette PDFs in `docs/sources/raw/` (e.g. `nppa-so-1582e-2024.pdf`, `nppa-so-5975e-2024.pdf`).
2. **Compute SHA-256 Checksum:**  
   Compute the cryptographic hash using your system terminal:
   ```bash
   shasum -a 256 docs/sources/raw/<filename>.pdf
   ```
3. **Review Ingestion Evidence:**  
   Examine the generated deterministic evidence file `docs/sources/ingest-report.md` to confirm that page numbers, raw PDF text lines, ingredients, and parsed paise prices match the printed gazette.
4. **Populate Human Review Sign-Off (`docs/sources/REVIEW.json`):**  
   Append a sign-off entry to `docs/sources/REVIEW.json` (this file is strictly edited by human reviewers, never automated scripts):
   ```json
   [
     {
       "sourceFile": "nppa-so-1582e-2024.pdf",
       "sha256": "<computed-sha256-hash>",
       "reviewer": "Reviewer Name / Org",
       "reviewedAt": "2026-11-19T00:00:00Z",
       "sampleRecordIds": ["NPPA-1582E-001", "NPPA-1582E-002"],
       "result": "PASS"
     }
   ]
   ```
5. **Run Verification Script:**  
   Execute the verification tool:
   ```bash
   npm run verify-sources
   ```
   If and only if the hash in `REVIEW.json` matches `MANIFEST.json` and `docs/sources/raw/`, `verified: true` will be written to the corresponding records in `src/data/regulatory/`.

---

## 6. Patient Dispute Notice Pack

ClaimKavach generates 4 formal, pre-filled escalation notices based on verified bill findings:

1. **Step 1 — Hospital Billing Query:** Request for itemized clarification and price ceiling compliance (24–48h hospital response).
2. **Step 2 — Insurer GRO Notice:** Formal grievance to the insurance company Grievance Redressal Officer against arbitrary deductions.
3. **Step 3 — Bima Bharosa Draft:** Pre-formatted text for lodging complaints on IRDAI's regulatory portal.
4. **Step 4 — Insurance Ombudsman Complaint:** Structured complaint for unresolved grievances exceeding 30 days.

### Official Regulatory Portals:
- **IRDAI Official Portal:** [irdai.gov.in](https://irdai.gov.in)
- **Bima Bharosa Grievance Portal:** [bimabharosa.irdai.gov.in](https://bimabharosa.irdai.gov.in)
- **Council for Insurance Ombudsmen:** [cioins.co.in](https://cioins.co.in)

> [!NOTE]
> All dispute templates contain zero remembered statute or section numbers (e.g. no ungrounded "Rule 14" or "Section 15"). Citations strictly reference the source gazette document and item details attached to each audit finding.

---

## 7. Developer & Test Commands

```bash
# Start local development server
npm run dev

# Run full Vitest test suite
npm test

# Run TypeScript typecheck
npm run typecheck

# Run Next.js linter
npm run lint

# Run production smoke test against local or deployed server
node scripts/smoke.mjs http://localhost:3000

# Build for production
npm run build
```

---

## 8. Production Deployment

For complete instructions on deploying to Vercel, serverless runtime configuration, and post-deployment smoke testing, see [DEPLOY.md](file:///c:/Users/Administrator/Downloads/ClaimKavach/DEPLOY.md).

