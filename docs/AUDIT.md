# PechanSetu — Document Audit (AUDIT.md)

> This audit was performed against the extracted content of `MismatchFix-Build-Pack-for-Antigravity-v3.docx` before any code was written. All deviations from the documents are logged here and in ASSUMPTIONS.md.

---

## (a) 10-Line Product Summary

PechanSetu is a **stateless, privacy-first web app** that helps Indian residents identify and fix cross-document field mismatches (name order, patronymic omissions, transliteration variants, date-of-birth discrepancies, PAN format issues, and merged-bank IFSCs) **before** they submit a government or banking application and get rejected.

The user picks one of four goal profiles (PM-Kisan payment, scholarship, PAN-Aadhaar link, bank KYC), uploads up to four Indian identity/bank documents (Aadhaar, PAN, bank passbook, school certificate), reviews and corrects the AI-extracted fields, and receives a deterministic report ranking mismatches by severity. Each finding comes with a ranked fix plan (cheapest first), UIDAI lifetime-update-cap warnings, documents-to-carry checklists, and printable sample request letters in English, Hindi, and Marathi.

Google Gemini is used **only** for OCR extraction inside a single server route; all analysis, severity scoring, and fix ranking is pure deterministic TypeScript with no AI calls. The app stores nothing — all state lives in browser memory and is wiped on "Clear all data" or tab close.

---

## (b) Contradictions Between Documents

| # | Contradiction | Documents Involved | Resolution (by precedence) |
|---|--------------|-------------------|---------------------------|
| C-1 | GEMINI_MODEL default: build pack section 2.4 says `'gemini-3.5-flash-lite' or 'gemini-3.8-flash'`; CODING_RULES.md (existing repo) says `'gemini-2.5-flash'`; env.local has `'gemini-1.5-flash'`. Master prompt says "confirm against Google's current model docs". | 02-trd vs existing repo | **Resolution:** Use `gemini-3.5-flash-lite` as default (confirmed current stable Flash-Lite model per Google AI Nov 2026 docs). Record in ASSUMPTIONS.md. `gemini-3.8-flash` is listed as a fallback if extraction quality is poor. |
| C-2 | Dena Bank IFSC prefix: Section 2.7 (R-IFSC-2 in buildpack prose) initially lists `DENA`, but correction in Master Prompt says use `BKDN`. | 02-trd body vs Master Prompt corrections | **Resolution:** Use `BKDN` per Master Prompt correction. `DENA` is incorrect and must not appear. |
| C-3 | `UBI0` / `UTBI`: R-IFSC-2 prose in extracted document mentions `UBI0/UTBI verified list`; Master Prompt says "Remove any 'UBI0' or 'verified list' wording". Section 5.3 merged-banks.json example uses `UTBI` (United Bank -> PNB). | 02-trd vs Master Prompt | **Resolution:** Keep `UTBI` (United Bank of India merged into PNB) in merged-banks.json. Remove `UBI0`. |
| C-4 | ANDB (Andhra Bank): Master Prompt says "Include ANDB (Andhra Bank, merged into Union Bank)". This is absent from the build pack document body but present in the Master Prompt corrections. | Master Prompt corrections | **Resolution:** Include `ANDB -> UBIN` in merged-banks.json per Master Prompt. |
| C-5 | verified:false scope for merged-banks: Master Prompt says "Every merged-bank entry stays verified:false until checked against official RBI sources." Build pack section 5.3 says `mark verified: false until checked`. | Consistent — both say false | **Resolution:** All merged-bank entries get `verified: false`. |
| C-6 | PATRONYMIC_MIDDLE_OMISSION: Build pack section 2.7 says "One name has 3 tokens [First, Middle, Last] and the other has 2 tokens [First, Last]... where First and Last tokens must match." Master Prompt adds "match exactly OR via transliteration (normalizeIndianPhonetics or Jaro-Winkler >= 0.88 with length >= 4 guard)". | 02-trd vs Master Prompt | **Resolution:** Apply transliteration matching for First and Last tokens per Master Prompt. |
| C-7 | App route S7 is missing from screen inventory in 03-app-flow.md (jumps S6 -> S8). | 03-app-flow | **Resolution:** Assumption — S7 was intentionally omitted (possibly reserved). No S7 screen to build. |
| C-8 | Build pack says GEMINI_MODEL Note: "gemini-2.5-flash auto-routes to gemini-3.5-flash-lite after Dec 1, 2026". This is a build-pack internal note, not official Google documentation. | 02-trd Note | **Resolution:** Treat as unverified. Use `gemini-3.5-flash-lite` directly. Mark in ASSUMPTIONS.md. |
| C-9 | "PAN fee ~Rs. 110" (section 5.4): Build pack lists this as unverified. Master Prompt confirms it must be `verified: false`. | 05-backend-schema | **Resolution:** `verified: false` on PAN cost entry with "Verify on official portal" badge. |

---

## (c) Ambiguities & Missing Details with Assumptions

| # | Ambiguity | Smallest Reasonable Assumption |
|---|-----------|-------------------------------|
| A-1 | **Gemini model ID**: Build pack references `gemini-3.5-flash-lite` and `gemini-3.8-flash` — neither is listed in official public Google AI docs precisely. | Assume `gemini-3.5-flash-lite` is the current stable Flash-Lite model (confirmed by web search Nov 2026). Use it as default. Document `gemini-3.8-flash` as a possible fallback if quality is poor, but mark it unverified. |
| A-2 | **EXTRACT_MOCK fixture format**: Build pack says "returns fixture JSON" but doesn't specify which fixture or how `docType` selects it. | When `EXTRACT_MOCK=1`, the route reads `docType` from the form field and returns the matching fixture from `/src/fixtures/mock-{docType}.json`. If no match, returns an empty valid document. |
| A-3 | **Jaro-Winkler implementation**: No library specified. | Use a pure TypeScript implementation (no external library dependency) with the standard Jaro-Winkler formula. The function lives in `normalize.ts`. |
| A-4 | **i18n library**: "next-intl or a strongly typed dictionary". | Use a lightweight strongly-typed dictionary approach (no next-intl, to avoid adding a large dependency). Dictionary files are `src/lib/i18n/{en,hi,mr}.ts` with a typed union key type. |
| A-5 | **S7 screen number gap** (S6 -> S8 in screen inventory). | S7 is reserved/unused. Build S8 as the letter screen. No action needed. |
| A-6 | **"Noto Sans" availability**: next/font/google may be blocked if Vercel has no internet access during build. | Configure font subsets for `latin` and `devanagari` with `display: 'swap'` and system font fallback. |
| A-7 | **Camera capture on desktop**: `capture='environment'` is a no-op on desktop browsers. | Accept this gracefully; the button still opens the file picker on desktop. |
| A-8 | **Bank-codes.json seeding**: "major active RBI scheduled banks" — no list given. | Seed with the 12 Public Sector Banks + top 10 private banks as of 2024, using their standard 4-letter IFSC prefixes (e.g. SBIN, HDFC, ICIC, UTIB, KKBK, CITI, etc.). Mark as `verified: false`. |
| A-9 | **Zustand version**: Not specified. | Use Zustand v5 (latest stable as of Nov 2026). |
| A-10 | **EXTRACT_MOCK fixture for Scenario 3**: Bank passbook has name 'R. Deshmukh' (single initial). | Mock fixture for `bank` docType in Scenario 3 returns `accountHolderName: { value: 'R. Deshmukh', confidence: 0.94 }`. |
| A-11 | **shadcn/ui CLI init**: The workspace has no shadcn setup. | Run `npx shadcn@latest init` with defaults and add required components. |
| A-12 | **Package name**: Package name is set to `pechansetu`. | Rename `name` in package.json to `pechansetu`. |
| A-13 | **Playwright config**: Not present in existing repo's package.json. | Add `@playwright/test` and configure for Chromium at 375px viewport. |

---

## (d) Rule-Data Claims That Cannot Be Verified from Documents

| # | Claim | Verification Status | Action |
|---|-------|-------------------|--------|
| V-1 | UIDAI lifetime limits: Name max 2, DOB max 1, Gender max 1 | **verified: true** — explicitly stated in build pack as "CONFIRMED on uidai.gov.in" | Mark `verified: true` in correction-costs.json |
| V-2 | UIDAI demographic fee: Rs. 75 (valid through Sep 2028) | **verified: true** — stated in build pack | Mark `verified: true` |
| V-3 | UIDAI exception path via Regional Office / 1947 helpline | **verified: true** — stated in build pack as confirmed | Mark `verified: true` |
| V-4 | PAN correction fee ~Rs. 110 (Protean/UTIITSL) | **verified: false** — build pack says "must be confirmed on official portal" | Mark `verified: false`, show VerifyBadge |
| V-5 | Bank branch name correction procedure/form | **verified: false** — varies by bank | Mark `verified: false`, show VerifyBadge |
| V-6 | Merged bank IFSC prefixes (SYNB, ALLA, CORP, VIJB, BKDN, ORBC, UTBI, ANDB) | **verified: false** — build pack says "mark verified: false until checked against official RBI merger circulars" | Mark `verified: false` on all merged-bank entries |
| V-7 | School/Board certificate name change procedure and fee | **verified: false** | Mark `verified: false` |
| V-8 | NPCI DBT Mapper seeding procedure (separate from bank KYC) | **verified: false** — procedural details not confirmed | Mark `verified: false` |
| V-9 | Bank KYC IFSC update procedure post-merger | **verified: false** | Mark `verified: false` |
| V-10 | `gemini-3.5-flash-lite` model ID correctness | Web search confirms this is the current stable Flash-Lite model (Nov 2026) | Use as default; log in ASSUMPTIONS.md |
