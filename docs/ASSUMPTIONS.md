# PechanSetu — Assumptions (ASSUMPTIONS.md)

> Every assumption here was recorded before code was written. If a document was subsequently updated or an official source was checked, the assumption is annotated.

---

## Model Selection

**ASSUMPTION-MODEL-01**: The build pack references `gemini-3.5-flash-lite` and `gemini-3.8-flash`. A web search conducted 2026-11-15 confirms that `gemini-3.5-flash-lite` is a current, stable, cost-efficient Gemini Flash-Lite model available via the Google AI API. This is used as the GEMINI_MODEL default.

**ASSUMPTION-MODEL-02**: `gemini-3.8-flash` is listed in the build pack as an optional fallback for better Hindi/Marathi extraction quality. It has not been independently verified against official Google AI docs. If extraction quality on Hindi/Marathi documents is poor with the default model, document the gap in `/docs/accuracy.md` and note `gemini-3.8-flash` as a possible fallback for the operator to try.

**ASSUMPTION-MODEL-03**: The build pack note says "gemini-2.5-flash auto-routes to gemini-3.5-flash-lite after Dec 1, 2026." This is treated as an internal note in the build pack and not official documentation. We use `gemini-3.5-flash-lite` directly.

---

## IFSC / Merged Banks

**ASSUMPTION-IFSC-01**: Dena Bank's IFSC prefix is `BKDN` (not `DENA`). This was explicitly corrected in the Master Prompt. All code and data use `BKDN`.

**ASSUMPTION-IFSC-02**: `ANDB` (Andhra Bank, merged into Union Bank / prefix `UBIN`) is included in merged-banks.json per Master Prompt correction. The build pack document body did not list it explicitly.

**ASSUMPTION-IFSC-03**: `UBI0` has been removed. `UTBI` (United Bank of India -> PNB, prefix `PUNB`) is retained.

**ASSUMPTION-IFSC-04**: All merged-bank entries in merged-banks.json are `verified: false` until an operator checks them against official RBI merger circulars.

---

## Rules Engine

**ASSUMPTION-RULES-01**: Jaro-Winkler similarity is implemented as a pure TypeScript function in `src/lib/rules/normalize.ts` with no external library dependency. Standard Jaro-Winkler formula applied.

**ASSUMPTION-RULES-02**: PATRONYMIC_MIDDLE_OMISSION requires First and Last token match via exact normalization OR normalizeIndianPhonetics OR Jaro-Winkler >= 0.88 with length >= 4 guard. Middle token must match first token of fatherOrSpouseName from either document. When fatherOrSpouseName is null/absent on both documents, the verdict falls through to MISSING_TOKEN.

**ASSUMPTION-RULES-03**: The `length >= 4 guard` on Jaro-Winkler means: JW similarity is only applied when both compared tokens have length >= 4. For shorter tokens, only exact or phonetic match is used.

**ASSUMPTION-GOALS-01**: For `scholarship_application`, required documents are `aadhaar` and `certificate` per Document 5 Section 5.5 (Scenario 2 tests only Aadhaar and Certificate with no bank document; requiring bank would cause Scenario 2 to trigger R-REQ-1 blocker for missing bank, whereas the spec explicitly states "no Aadhaar vs bank" in Scenario 2 expected report). Bank KYC requires `aadhaar`, `pan`, and `bank` per Document 5 Section 5.4. If a user uploads Bank for Scholarship, R-DBT-1 is verified, but bank is not an application blocker.

---

## Architecture

**ASSUMPTION-ARCH-01**: i18n is implemented as a strongly-typed dictionary (`src/lib/i18n/{en,hi,mr}.ts`) rather than next-intl, to avoid adding a large library dependency and to stay within the 36-hour build window.

**ASSUMPTION-ARCH-02**: EXTRACT_MOCK=1 makes `/api/extract` return a canned fixture JSON based on the `docType` form field. Files: `/src/fixtures/mock-aadhaar.json`, `mock-pan.json`, `mock-bank.json`, `mock-certificate.json`. This allows full UI development without live Gemini calls.

**ASSUMPTION-ARCH-03**: Zustand v5 (latest stable) is used for the client-side state store.

**ASSUMPTION-ARCH-04**: S7 screen number is absent from the build pack screen inventory (jumps S6 -> S8). This is intentional; no S7 screen is built.

**ASSUMPTION-ARCH-05**: PechanSetu is built as a complete greenfield product for Indian identity document matching. Existing source files (`src/components/`, `src/lib/`, `src/data/`, `src/app/`) have been completely tailored to PechanSetu.

---

## Data & Verification

**ASSUMPTION-DATA-01**: bank-codes.json is seeded with the 12 Public Sector Banks + top 10 private banks' standard IFSC prefixes as of 2024. All entries are `verified: false`.

**ASSUMPTION-DATA-02**: The UIDAI lifetime limits (Name: 2, DOB: 1, Gender: 1) and the Rs. 75 demographic fee are marked `verified: true` in correction-costs.json, as the build pack explicitly confirms these figures from uidai.gov.in.

**ASSUMPTION-DATA-03**: PAN correction fee (~Rs. 110), bank branch procedures, school/board certificate procedures, and NPCI DBT Mapper seeding procedures are all `verified: false`.

---

## UI / Accessibility

**ASSUMPTION-UI-01**: `capture='environment'` on the camera button is a no-op on desktop browsers. This is acceptable; the file picker opens normally.

**ASSUMPTION-UI-02**: Noto Sans and Noto Sans Devanagari are loaded via `next/font/google` with `display: 'swap'` and system font fallback, to handle cases where the font CDN is unavailable.

**ASSUMPTION-UI-03**: The letter print functionality uses `window.print()` with an `@media print` stylesheet. No JS PDF library is used for Devanagari, per the spec.

---

## Package

**ASSUMPTION-PKG-01**: Package `name` in package.json is set to `pechansetu`.

**ASSUMPTION-PKG-02**: `@google/genai` v1.x (latest stable) is used for the Gemini API client. The structured output (`responseSchema`) API is confirmed available in this version.
