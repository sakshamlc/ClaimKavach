# ClaimKavach — Migration & Evolution Plan (Trust Zone v2)

> **Document Version:** 2.1.0  
> **Date:** 2026-11-17  
> **Status:** Accepted with Corrections — Phase 1 Starting  
> **Target Branch:** `feat/trust-zone-v2` (Verified active)  
> **Core Mandate:** Migrate and evolve existing Next.js 14 + TypeScript + Tailwind architecture toward the ClaimKavach target specification. **Do not rewrite from scratch.**

---

## 1. Executive Summary & Architecture Boundaries

ClaimKavach is an open-source, stateless patient advocacy web application designed to audit Indian hospital bills and health insurance claim settlement/deduction sheets. It identifies billing above statutory NPPA price ceilings, unbundled consumable charges contrary to IRDAI Annexure-I circulars, stay-math discrepancies, and unsupported deductions by TPAs/insurers, producing a complete, professional, non-accusatory dispute pack.

### 1.1 Architectural Decisions & Guardrails
- **Next.js 14 Retained:** Retain Next.js 14 (`14.2.15`). It provides rock-solid App Router stability, fast builds, and avoids breaking changes or dependency thrashing.
- **Git Safety:** Zero modification of `.git` permissions, ACLs, or attributes. Branching is handled by the developer. Verified `git branch --show-current` is `feat/trust-zone-v2`.
- **Trust Zone Boundary:** `src/lib/audit/**` is strictly isolated from AI, external network calls, file I/O, non-injected clocks (`Date.now`), and randomness (`Math.random`). Enforced by ESLint `no-restricted-imports` and automated boundary unit tests.
- **Currency Arithmetic:** Strict integer paise (`paise: number`, e.g. ₹500.50 = `50050` paise) to eradicate JavaScript IEEE 754 floating-point errors.
- **Honest Language Guarantee:** Never use the word "illegal" about a hospital charge. Use neutral, objective, statutory terms: "exceeds NPPA ceiling", "likely subsumed under room rent", "inconsistent with length of stay", "insurer deduction not supported by Annexure-I".
- **Stateless Privacy:** 100% browser-memory execution (Zustand); zero database; zero server persistence; zero logging of patient PII/PHI; client-side blob URL revocation.
- **Serverless Rate Limiting Note:** The in-memory IP rate limiter is per-instance and serves as a lightweight anti-abuse guardrail on serverless runtimes. Documented as a known limitation; no distributed Redis required.
- **Configurable Preprocessing:** HTML5 canvas compression has configurable max dimension (default 2000px, JPEG quality ~0.85) and configurable Laplacian blur threshold (default 40). Note: dense multi-column hospital bills must be verified against real photo stress tests.

---

## 2. Repo Fit: Kept, Adapted, and Retired Modules

### 2.1 Modules Kept As-Is
- `src/lib/blurGate.ts`: Client-side Laplacian edge-variance blur gate (<40 variance rejected, >100 variance passed; threshold configurable).
- `src/lib/extract/client.ts` (`verifyMagicBytes`): Fast binary header validation for JPEG, PNG, WebP, PDF.
- `src/app/upload/page.tsx` (`processClientFile`): Client-side HTML5 canvas downscaling to max 2000px, JPEG quality 0.85.
- `src/lib/store.ts` (`clearAllData` & blob cleanup): Ephemeral state reset and explicit `URL.revokeObjectURL` garbage collection.
- `src/components/Header.tsx`, `src/components/ui/*`: Responsive header, language toggle, base UI primitives.

### 2.2 Modules Adapted / Evolved
- `src/lib/store.ts`: Evolve state slices to hold `medicalBill`, `auditReport`, `auditSummary`, and item verification states.
- `src/lib/extract/schema.ts` & `prompt.ts`: Update Zod schemas from identity cards to itemized medical bills and TPA deduction sheets.
- `src/app/api/extract/route.ts`: Support medical extraction schema, batching, and synthetic offline benchmarks.
- `src/app/upload/page.tsx`: Support hospital bill, discharge summary, and optional TPA deduction letter upload slots.
- `src/app/review/page.tsx`: Line-item audit review table (item, category, unit price, quantity, total, insurer deducted).
- `src/app/report/page.tsx`: Audit summary report cards (**Total Billed, Fair Amount, Confirmed, Likely, Needs Review**; never merge tiers into a single savings figure) + "N of M items checked" metric.
- `src/app/letter/[findingId]/LetterClient.tsx`: Four-part dispute pack (Hospital Query, Insurer Grievance Officer, Bima Bharosa, Insurance Ombudsman drafts).
- `src/components/FindingCard.tsx`: Display new `Verdict` enum chips with expandable citations, DEMO DATA badges when applicable, and neutral patient queries.
- `src/lib/i18n/`: English (default) and Hindi UI toggle.

### 2.3 Modules Retired (Safely removed only after replacement tests pass)
- Identity rule files: `src/lib/rules/dob.ts`, `gender.ts`, `ifsc.ts`, `name.ts`, `pan.ts`, `normalize.ts`, `fixplan.ts`.
- Identity reference data: `src/data/bank-codes.json`, `merged-banks.json`, `name-aliases.json`, `honorifics.json`, `goals.json`.
- Identity letter templates: `src/data/letters/name-correction.*.md`, `dbt-seeding-request.*.md`.
- Identity fixtures: `src/fixtures/mock-aadhaar.json`, `mock-pan.json`, `mock-bank.json`, `mock-certificate.json`, `scenario-1.json`, etc.

---

## 3. Existing 85 Tests Categorization (Reconciled)

The 85 tests collected and executed by Vitest across all 11 test suites are categorized below:

| Test Suite File | Vitest Test Count | Classification | Rationale & Action Plan |
|---|---|---|---|
| `tests/extractRoute.test.ts` | 6 tests | **KEEP (4) / ADAPT (2)** | Keep magic-byte, 4MB payload, and rate-limiting tests. Adapt mock-mode and missing-type tests to medical schema. |
| `tests/finalFixPass2_SectionF.test.ts` | 4 tests | **KEEP (3) / ADAPT (1)** | Keep clear image variance, blur stress, and magic bytes tests. Adapt required document check to hospital bill. |
| `tests/finalFixPass.test.ts` | 13 tests | **KEEP (2) / ADAPT (2) / RETIRE (9)** | Keep blur gate and store `clearAllData` tests. Adapt code validators to medical line items. Retire identity rule tests. |
| `tests/rules.test.ts` | 34 tests | **RETIRE (34)** | Identity mismatch rules (Aadhaar/PAN/IFSC). Replaced by `tests/audit/` rules. |
| `tests/sixProofs.test.ts` | 8 tests | **KEEP (2) / RETIRE (6)** | Keep blur gate and magic-byte tests. Retire identity proof scenarios (replaced by medical audit proofs). |
| `tests/summary.test.ts` | 3 tests | **RETIRE (3)** | Identity document fix-plan text summaries. Replaced by medical dispute summary tests. |
| `tests/finalFixPass2_SectionA.test.ts` | 4 tests | **ADAPT (4)** | Adapt translation completeness and no-raw-keys verification to medical i18n dictionaries. |
| `tests/finalFixPass2_SectionB.test.tsx` | 3 tests | **RETIRE (3)** | Identity diff component tests. Replaced by `FindingCard` medical tests. |
| `tests/finalFixPass2_SectionC.test.ts` | 5 tests | **RETIRE (5)** | Identity fix target selection. Replaced by dispute pack generation tests. |
| `tests/finalFixPass2_SectionE.test.ts` | 2 tests | **ADAPT (2)** | Adapt banned phrases and honest wording tests (enforce zero use of "illegal" and objective tone). |
| `tests/SideBySideDiff.test.tsx` | 3 tests | **RETIRE (3)** | Bank/PAN format diff chips. Replaced by medical line-item diff tests. |
| **Total Baseline** | **85 tests** | **KEEP: 11 \| ADAPT: 11 \| RETIRE: 63** | Baseline test run verified 100% green across all 11 suites. |

---

## 4. Spec Alignment, Verdict Enum & Rule Engine

### 4.1 Verdict Enum & Strict Confidence Caps
All findings use the target specification's exact 5-value `Verdict` enum:
- `CONFIRMED_OVERCHARGE`: **Restricted strictly** to:
  1. Billed unit price exceeding an exactly-matched NPPA statutory ceiling with `verified: true`.
  2. Mathematical errors failing on the bill itself (`R-MATH-01`, `R-TOTAL-01`).
- `LIKELY_ISSUE`: High-probability tariff discrepancy, including:
  1. Exact duplicate line items (`R-DUP-01`: same item, date, and price).
  2. Billed price exceeds printed MRP (`R-NPPA-02`).
  3. Routine nursing or RMO billed separately from room tariff.
  4. Room days exceeding recorded nights (calendar-day vs 24-hr cycle query).
  5. Routine OT/treatment consumables billed separately contrary to Annexure-I.
  6. Insurer TPA deduction not supported by Annexure-I (`R-ANX-01`).
- `NEEDS_REVIEW`: Requires hospital specification, brand, or batch disclosure before determining compliance (e.g. unverified stent catalog, revision knee implant, unit/pack size ambiguity).
- `VALID_EXCLUSION`: Items legitimately excluded or non-payable per IRDAI List I (e.g. personal toiletries, luxury charges).
- `NOT_CHECKED`: Line items that do not have an applicable regulatory ceiling or cannot be verified against available reference data.

#### Engine-Level Guard:
Any finding derived from a record where `verified: false`:
1. **MUST be capped at `LIKELY_ISSUE` or `NEEDS_REVIEW`** (never `CONFIRMED_OVERCHARGE`).
2. **MUST carry a visible `"DEMO DATA"` badge** in the UI and report.

### 4.2 Explicit Rule Catalog
- `R-MATH-01`: Line arithmetic check (`quantity * unitRatePaise !== totalBilledPaise`). `CONFIRMED_OVERCHARGE` if overcharged, or calculation discrepancy.
- `R-TOTAL-01`: Total arithmetic check (`sum(lineItems) !== billTotalPaise`). `CONFIRMED_OVERCHARGE`.
- `R-DUP-01`: Exact duplicate line item on same date / description. `LIKELY_ISSUE`.
- `R-NPPA-01`: Billed unit price > NPPA ceiling price. `CONFIRMED_OVERCHARGE` if `verified: true`, capped at `LIKELY_ISSUE` if `verified: false`.
- `R-NPPA-02`: Billed price exceeds printed Maximum Retail Price (MRP). `LIKELY_ISSUE`.
- `R-ANX-01`: TPA deduction audit from optional TPA letter. Checks deducted items against Annexure-I non-payable lists; flags insurer deductions contrary to Annexure-I as `LIKELY_ISSUE` ("insurer deduction not supported by Annexure-I").
- `R-ROOM-01`: Room rent days exceeding recorded stay nights (`LIKELY_ISSUE`).
- `R-ROOM-02`: Routine nursing / RMO billed separately from room tariff (`LIKELY_ISSUE`).
- `R-OT-01`: Standard OT surgical accessories billed separately (`LIKELY_ISSUE`).

### 4.3 Report Summary Metric Cards
The report presents 5 distinct, unmerged metric cards:
1. **Total Billed:** Full gross amount charged on the bill.
2. **Fair Amount:** Total Billed minus Confirmed and Likely overcharges.
3. **Confirmed Overcharge:** Sum of `CONFIRMED_OVERCHARGE` items.
4. **Likely Discrepancies:** Sum of `LIKELY_ISSUE` items.
5. **Needs Review:** Sum of `NEEDS_REVIEW` items requiring disclosure.
> *Strict rule:* Never merge Confirmed, Likely, and Needs Review into a single "savings" figure.

---

## 5. Regulatory Data Sourcing & Provenance

### 5.1 Official Sources Directory (`/docs/sources/`)
Official regulatory documents must be dropped into `/docs/sources/`:
- `nppa_ceiling_prices_current.pdf` (DPCO 2013 scheduled formulations)
- `nppa_stents_gazette_so_1335e.pdf` (Coronary Stents gazette)
- `nppa_knee_implants_gazette_so_3987e.pdf` (Knee Implants gazette)
- `irdai_master_circular_annexure_1.pdf` (IRDAI Annexure-I non-payables)

### 5.2 Provenance Schema
Every record in `src/data/regulatory/*.json` MUST contain:
```json
{
  "id": "NPPA-CARD-001",
  "code": "DES-STENT",
  "description": "Drug Eluting Stent (DES)",
  "ceilingPaise": 3826500,
  "source": "NPPA Notification S.O. 1335(E)",
  "sourceUrl": "https://www.nppaindia.nic.in",
  "effectiveDate": "2024-04-01",
  "version": "2024.1",
  "verified": true
}
```
Until real files are dropped into `/docs/sources/` and ingested, a small synthetic seed dataset with `"verified": false` and `DEMO DATA` labels is used to run synthetic sample bills.

---

## 6. Gap Analysis Table

| # | Spec Area | Target Specification | Current Codebase State | Status | Impacted / Target Files |
|---|---|---|---|---|---|
| **1** | **Trust Zone Isolation** | Pure TS, zero AI, zero network, zero clock/random access. Enforced by ESLint rule. | Current `rules/` is pure TS but lacks ESLint boundary enforcement. | **Partial** | Configure `.eslintrc.json` `no-restricted-imports`, add `tests/audit/boundary.test.ts`. |
| **2** | **Currency Arithmetic** | Strict integer paise (`paise: number`). Zero floating-point rounding errors. | No currency arithmetic exists. | **Missing** | Create `src/lib/audit/currency.ts` and `tests/audit/currency.test.ts`. |
| **3** | **Regulatory Ceilings** | NPPA gazetted caps (DPCO, Stents, Knee Implants, Pacemakers) with strict provenance fields. | Only identity reference JSONs exist. | **Missing** | Create `src/data/regulatory/nppaCeilings.json` and `src/data/regulatory/irdaiAnnexure1.json`. Log unverified items in `docs/DATA_TODO.md`. |
| **4** | **Audit Verdict Engine** | 5 Verdict types (`CONFIRMED_OVERCHARGE`, `LIKELY_ISSUE`, `NEEDS_REVIEW`, `VALID_EXCLUSION`, `NOT_CHECKED`) with `R-MATH-01`, `R-TOTAL-01`, `R-DUP-01`, `R-NPPA-01/02`, `R-ANX-01`. | Uses generic severities (`blocker`, `high`, `medium`, `low`, `info`). | **Missing** | Create `src/lib/audit/rules/` (`nppaRule.ts`, `consumablesRule.ts`, `roomRentRule.ts`, `stayMathRule.ts`, `mathRule.ts`, `anxRule.ts`) and `engine.ts`. |
| **5** | **Audit Coverage Metrics** | Clear metric: "N of M items checked" + explicit list of `NOT_CHECKED` items. | No coverage metric exists. | **Missing** | Implement in `src/lib/audit/engine.ts` and render on `src/app/report/page.tsx`. |
| **6** | **Dispute Pack** | 4 distinct drafts: Hospital Query, Insurer Grievance Officer, Bima Bharosa, Insurance Ombudsman. | Only Aadhaar/Bank correction letters exist. | **Missing** | Create `src/lib/audit/disputeGenerator.ts`, `src/data/letters/disputeTemplates.ts`, update `LetterClient.tsx`. |
| **7** | **Honest Language** | Zero occurrences of "illegal" or accusatory phrasing. Objective, statutory questions. | Banned phrases test exists for identity domain, needs medical audit updates. | **Partial** | Update `tests/finalFixPass2_SectionE.test.ts` and prompt/report dictionaries. |
| **8** | **Document Extraction Schema** | Multimodal OCR schema for medical bills, discharge summaries, and optional TPA deduction sheets. | Extracts Aadhaar/PAN/Bank fields. | **Conflicting** | Create `src/lib/extract/medicalBillSchema.ts`, update `prompt.ts`, `client.ts`, and `route.ts`. |
| **9** | **PDF Client-side Batching** | Multi-page PDF to page images with chunking under 4 MB per request. Configurable image size (default 2000px, JPEG 0.85). | PDFs pass through raw to Gemini. | **Partial** | Add client-side PDF page rendering and chunking in `upload/page.tsx`. |
| **10** | **Upload Guards & Blur Gate** | Canvas resize to 2000px + Laplacian edge variance blur gate (threshold 40) + magic-byte check. | Fully implemented and passing in `blurGate.ts` and `upload/page.tsx`! | **Done** | Retain as core safeguard. |
| **11** | **Privacy & Statelessness** | Zero database, zero server-side storage of medical PII, blob revocation on clear. | Fully implemented in `store.ts` and architecture. | **Done** | Retain strictly; add CSP and `no-store` headers in `next.config.mjs`. |
| **12** | **Language & Accessibility** | English & Hindi language toggle, min 48px tap targets, accessible contrast. | Fully implemented in `Header.tsx` and `i18n/`. | **Partial** | Update dictionary keys for medical audit terminology. |

---

## 7. Comprehensive Risk List

1. **Floating Point Rounding Drift:**
   - *Risk:* Using JavaScript floating-point numbers (`0.1 + 0.2 !== 0.3`) results in off-by-one paise discrepancies on hospital bills.
   - *Mitigation:* `currency.ts` implements integer paise throughout all data models and calculations.
2. **AI Leaking into Deterministic Audit:**
   - *Risk:* LLM hallucinating regulatory rules or legal conclusions.
   - *Mitigation:* Gemini is strictly restricted to raw OCR text transcription. Trust Zone `src/lib/audit/**` has zero imports of `@google/genai` or network modules, enforced by ESLint and `tests/audit/boundary.test.ts`.
3. **Regulatory Drift & Unverified Rates:**
   - *Risk:* Citing outdated or fabricated ceiling rates compromises patient credibility.
   - *Mitigation:* Every record has `source`, `sourceUrl`, `effectiveDate`, `version`, `verified`. Unverified items are marked `verified: false`, flagged as `DEMO DATA`, and capped at `LIKELY_ISSUE` / `NEEDS_REVIEW`. Logged in `docs/DATA_TODO.md`.
4. **Accusatory Language Risks:**
   - *Risk:* Calling hospital charges "illegal" exposes patients to hostile administrative pushback.
   - *Mitigation:* Honest, objective language enforced by automated unit tests.
5. **Serverless Payload Limits & Timeouts:**
   - *Risk:* Multi-page PDF bills exceeding Vercel 4.5MB request limit or timing out.
   - *Mitigation:* Client-side canvas compression downscales images to max 2000px; multi-page PDFs are batched; canned synthetic benchmarks provide instant offline execution.
6. **In-Memory Rate Limiter on Distributed Serverless:**
   - *Risk:* In-memory IP tracking is per-instance and does not persist across cold starts.
   - *Mitigation:* Recognized as a known limitation; acts as a lightweight anti-abuse filter without requiring third-party Redis overhead.
7. **TypeScript `any` Types:**
   - *Risk:* Permissive types hiding schema drift.
   - *Mitigation:* Replaced by strict Zod-inferred types in `medicalBillSchema.ts` and strict discriminated unions in `audit/types.ts`.

---

## 8. No-Regression & Baseline Protection List

The following existing safeguards must remain 100% green before, during, and after migration:

1. **Blur Gate Functionality (`src/lib/blurGate.ts`):**
   - High-frequency printed text (>100 variance) passes gate.
   - Blurred or uniform images (<40 variance) are rejected.
2. **Binary Header & Magic Bytes (`src/lib/extract/client.ts`):**
   - Correctly identifies `image/jpeg` (`FF D8 FF`), `image/png` (`89 50 4E 47`), `image/webp` (`RIFF...WEBP`), and `application/pdf` (`%PDF`).
   - Rejects text, executables, or corrupt buffers.
3. **Payload Size Guard:**
   - Files > 4 MB return HTTP 413 `TOO_LARGE`.
4. **API Rate Limiter:**
   - Triggers HTTP 429 `RATE_LIMIT` upon rapid bursts from the same IP.
5. **Store Cleanup & Memory Safety (`src/lib/store.ts`):**
   - `clearAllData()` completely clears documents and revokes active blob URLs via `URL.revokeObjectURL`.

---

## 9. Migration Phases & Implementation Sequence

### Phase 1: Trust Zone Foundations & Integer Currency (Current Phase)
- **Files to Create:**
  - `src/lib/audit/currency.ts` (paise conversion, formatting, math)
  - `src/lib/audit/types.ts` (MedicalBill, LineItem, Verdict enum, AuditFinding, AuditReport, ReportSummary)
- **Tests to Add:**
  - `tests/audit/currency.test.ts` (integer arithmetic, edge cases, round-trip formatting)
  - `tests/audit/boundary.test.ts` (verifies `src/lib/audit/**` has zero forbidden imports: `@google/genai`, network, `Date.now`, `Math.random`)
  - `tests/audit/determinism.test.ts` (verifies pure functions return identical outputs given identical inputs across multiple runs)
- **Lint Guard:** Add `no-restricted-imports` rule in `.eslintrc.json`.

### Phase 2: Regulatory Databases & Provenance Loaders
- **Files to Create:**
  - `src/data/regulatory/nppaCeilings.json` (synthetic seed data with `verified: false`, DEMO DATA)
  - `src/data/regulatory/irdaiAnnexure1.json` (synthetic seed data with `verified: false`, DEMO DATA)
  - `src/lib/audit/regulatory.ts` (typed lookup index with confidence cap guards)
  - `docs/sources/README.md` & `docs/DATA_TODO.md`
- **Tests to Add:**
  - `tests/audit/regulatory.test.ts` (validates schema, source URLs, verified flags, and DEMO DATA capping)

### Phase 3: Pure Deterministic Audit Engine
- **Files to Create:**
  - `src/lib/audit/rules/mathRule.ts` (`R-MATH-01`, `R-TOTAL-01`)
  - `src/lib/audit/rules/nppaRule.ts` (`R-NPPA-01`, `R-NPPA-02`)
  - `src/lib/audit/rules/consumablesRule.ts` (`R-ANX-01`, `R-OT-01`)
  - `src/lib/audit/rules/roomRentRule.ts` (`R-ROOM-01`, `R-ROOM-02`)
  - `src/lib/audit/rules/stayMathRule.ts` (`R-DUP-01`)
  - `src/lib/audit/engine.ts` (audit orchestrator, coverage metric "N of M checked", 5 unmerged report cards)
- **Tests to Add:**
  - `tests/audit/rules.test.ts`
  - `tests/audit/engine.test.ts`

### Phase 4: Medical Bill Extraction Schema & Offline Benchmarks
- **Files to Create:**
  - `src/lib/extract/medicalBillSchema.ts` (Zod schema for medical bill and TPA sheets)
  - `src/fixtures/medical/case1-cardiac.json` (labeled synthetic)
  - `src/fixtures/medical/case2-ortho.json` (labeled synthetic)
  - `src/fixtures/medical/case3-consumables.json` (labeled synthetic)
- **Files to Adapt:**
  - `src/lib/extract/prompt.ts`
  - `src/lib/extract/client.ts`
  - `src/app/api/extract/route.ts` (connect medical schema and synthetic benchmark mode)
- **Tests to Add:**
  - `tests/extract/medicalSchema.test.ts`
  - `tests/extract/syntheticCases.test.ts`

### Phase 5: UI Refactoring & 4-Draft Dispute Pack
- **Files to Create:**
  - `src/lib/audit/disputeGenerator.ts` (generates Hospital Query, Insurer Grievance Officer, Bima Bharosa, and Insurance Ombudsman drafts)
  - `src/data/letters/disputeTemplates.ts`
- **Files to Adapt:**
  - `src/lib/store.ts` (medical state slices, cleanup)
  - `src/app/page.tsx` (ClaimKavach branding)
  - `src/app/upload/page.tsx` (hospital bill, discharge summary, optional TPA deduction sheet; configurable dimensions)
  - `src/app/review/page.tsx` (line-item table review)
  - `src/app/report/page.tsx` (5 cards: Total Billed, Fair Amount, Confirmed, Likely, Needs Review; coverage N of M)
  - `src/app/letter/[findingId]/LetterClient.tsx` (4 dispute drafts, copy, printable view)
  - `src/components/FindingCard.tsx` (Verdict chips, DEMO DATA badges)
  - `src/lib/i18n/` (English/Hindi toggle)
- **Tests to Add:**
  - `tests/ui/disputePack.test.ts`
  - `tests/ui/honestLanguage.test.ts`

### Phase 6: E2E Hardening, Security Headers & Clean-up
- **Security:** Add CSP and `Cache-Control: no-store` in `next.config.mjs`.
- **Clean-up:** Safely retire old identity rule and fixture files once all new tests pass.
- **Verification:** Run complete test suite and Playwright smoke tests.
