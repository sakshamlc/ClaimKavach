# PechanSetu — Implementation Plan (06-implementation-plan.md)

> **Total budget:** 36–40 hours. Each phase ends with a strict verification gate: do not start the next phase until the gate passes.

## Phase 0: Project Setup (1 hour)

1. Rename package to `pechansetu` in package.json
2. Install: Next.js (App Router, TypeScript strict), Tailwind CSS, shadcn/ui, Zod, Vitest, Playwright, Zustand, @google/genai, next-intl
3. Create folder structure from Document 2.3
4. Write all six specification files into /docs/
5. Configure Noto_Sans and Noto_Sans_Devanagari in src/app/layout.tsx
6. Add .env.example and `npm run check` (lint + typecheck + vitest run)

**Gate 0:** `npm run dev` renders; `npm run check` passes with zero errors.

## Phase 1: Deterministic Rules Engine & Unit Tests (6 hours)

1. Implement `normalize.ts` (strict honorific guardrail keeping 'kumar'/'kumari' intact, plus `normalizeIndianPhonetics`)
2. Implement `name.ts` (all 7 verdicts: NORMALIZED_EXACT, TOKEN_REORDER, PATRONYMIC_MIDDLE_OMISSION, INITIAL_ABBREVIATION, TRANSLITERATION_VARIANT, MISSING_TOKEN, MISMATCH)
3. Implement `dob.ts`, `pan.ts` (with reordered surname check), `ifsc.ts` (with merged-banks check), `gender.ts`, `analyze.ts`, `fixplan.ts`
4. Populate `/src/data/*.json` with accurate source, lastVerified, and verified boolean flags
5. Write all 12+ unit test suites from Document 2.10 in `/tests/rules.test.ts`

**Gate 1:** `vitest run` passes 100%; running the 3 demo fixtures through `analyze()` produces the exact expected findings and fix rankings.

## Phase 2: Stateless Extraction API (4 hours)

1. Build `POST /api/extract` with:
   - Multipart parsing
   - Magic-byte sniffing (JPEG, PNG, WebP, PDF)
   - @google/genai structured output (responseSchema, temperature 0)
   - One automatic retry on schema failure
   - Server-side Aadhaar redaction
   - In-memory rate limiter (RATE_LIMIT_PER_MIN)
   - EXTRACT_MOCK=1 support (returns fixture JSON without calling Gemini)
2. Implement EXIF stripping for images

**Gate 2:** Automated test or curl with sample image returns schema-valid JSON with redacted Aadhaar; invalid MIME returns 400; 11th rapid call returns 429.

## Phase 3: Core Mobile-First UI Flow (8 hours)

Build screens:
- **S0** (`/`): Landing
- **S1** (`/goal`): Goal selection
- **S2** (`/consent`): Consent
- **S3** (`/upload`): Upload with image canvas compression and PDF pass-through
- **S5** (`/review`): Review with <0.75 confidence confirmation
- **S6** (`/report`): Unified Report with SideBySideDiff and status banner

**Gate 3:** With EXTRACT_MOCK=1, a user can complete S0 -> S6 in under 3 minutes via keyboard and on a 375px mobile viewport.

## Phase 4: Integrated Fix Plan, Toggle, Checklists & Letters (6 hours)

1. Build Ranked Fix Plan section on S6 (and /fix route):
   - "Which version is correct?" toggle
   - UIDAI lifetime cap & Regional Office exception notes
   - VerifyBadge for verified:false entries
   - Copy-as-text
2. Build S8 (`/letter/[findingId]`) with EN/HI/MR templates:
   - Sample Bank Correction Request
   - Sample NPCI DBT Seeding Request
   - Styled with @media print

**Gate 4:** Toggling "Which version is correct?" updates the target document and letter preview; print preview renders Hindi and Marathi Devanagari cleanly.

## Phase 5: Internationalisation & Read-Aloud (3 hours)

1. Complete `en.ts`, `hi.ts`, `mr.ts` dictionaries
2. Wire LanguageSwitch persisted in localStorage
3. Add optional Web Speech API read-aloud button

**Gate 5:** Switching EN/HI/MR updates every visible string, finding, fix step, and letter with zero raw i18n keys.

## Phase 6: Offline Demo Mode & Synthetic Watermarked Documents (3 hours)

1. Build S9 (`/demo`)
2. Generate synthetic Aadhaar, PAN, Bank Passbook, and School Certificate test cards (clearly watermarked "SAMPLE - NOT REAL")
3. Evaluate extraction on at least 10 synthetic documents
4. Document honest results in `/docs/accuracy.md`

**Gate 6:** All 3 demo scenarios work completely offline; `/docs/accuracy.md` is committed.

## Phase 7: Hardening, Browser-Agent QA & Deploy (4 hours)

1. Write Playwright E2E tests for the 3 demo scenarios at 375px viewport across EN, HI, MR
2. Run axe accessibility check on S5 and S6
3. Verify CSP, security headers, no body logging, and "Clear all data" memory wipe + URL.revokeObjectURL
4. README.md complete

**Gate 7:** All unit + Playwright tests pass; Lighthouse accessibility >= 95 on S6; README.md and ASSUMPTIONS.md complete.

## Definition of Done (All Must Pass)

- [ ] All Vitest unit tests (including 'Ramesh Kumar' vs 'Kumar Ramesh' and patronymic middle names) and Playwright E2E tests pass.
- [ ] Three demo scenarios work end-to-end in EN, HI, and MR.
- [ ] No full Aadhaar number appears anywhere in UI, logs, fixtures, or API responses.
- [ ] Every rule data entry in `/src/data/*.json` has source, lastVerified, and verified; every verified:false item displays the 'Verify on the official site' note in UI.
- [ ] Persistent disclaimer ('This is a check and guide, not an official verification') visible on report, fix plan, and sample letters.
- [ ] Lighthouse accessibility score >= 95 on S6.
- [ ] README.md, `/docs/accuracy.md`, and `/docs/ASSUMPTIONS.md` written.
