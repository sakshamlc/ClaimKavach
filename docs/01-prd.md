# PechanSetu — Product Requirements Document (01-prd.md)

> **Product name:** PechanSetu.  
> **Tagline:** "Find the mismatch before the portal rejects you."  
> **Mission:** Pre-flight check and fix guide for document-mismatch rejections in Indian government and banking applications.

---

## 1.1 Overview

PechanSetu tells a person exactly which field differs between their documents, how serious it is for their goal, and the cheapest, lowest-risk way to fix it (protecting scarce lifetime Aadhaar updates when a bank or PAN record can be updated instead), **before** they apply and get rejected.

## 1.2 Problem

Small mismatches (name order, initials vs full name, Maharashtra/Gujarat father/husband middle-name omission, transliteration variants, DOB format/swap, wrong or merged-bank IFSC, PAN surname letter) cause:
- Rejected scholarship forms
- Failed PM-Kisan and pension payments
- PAN-Aadhaar linking failures
- Bank KYC loops

Portals say "mismatch" or "rejected" without naming the field or the fix. People pay agents or make repeated office visits.

## 1.3 Personas

**Sunita, 42, farmer's spouse (Marathi-speaking):** Low digital literacy, mid-range Android phone. PM-Kisan payment failed. Needs voice-friendly, large-text, Marathi UI and clear guidance on bank KYC vs NPCI DBT seeding.

**Rahul, 19, first-year student:** Scholarship form rejected for name mismatch between school certificate ("Rahul Patil") and Aadhaar ("Rahul Suresh Patil"). Comfortable with apps, short on time.

**Mr. Deshmukh, 68, pensioner:** Bank KYC refresh asks for documents with matching names and updated IFSC after a PSU bank merger. Needs clear "what to carry" list and a pre-filled branch request letter.

## 1.4 Goals and Non-Goals

**Goals:**
1. Identify every cross-document mismatch relevant to the chosen goal
2. Rank fixes cheapest first while warning about UIDAI lifetime update caps (Name: 2, DOB: 1, Gender: 1) and the Regional Office exception path if already exhausted
3. Produce ready-to-print sample request letters in EN, HI, MR
4. Store nothing

**Non-Goals:** Filing applications, verifying authenticity, detecting forgery, legal advice, guaranteeing acceptance.

## 1.5 Success Metrics (Hackathon Level)

- A user reaches a full report and fix plan in under 3 minutes from landing.
- All 3 demo scenarios produce expected findings with zero false "OK" on seeded mismatches.
- Rules engine unit tests: 100% of listed cases pass (including "Ramesh Kumar" vs "Kumar Ramesh" token reorder without stripping "Kumar").
- Extraction accuracy measured on 10+ synthetic/anonymized documents, reported honestly in `/docs/accuracy.md`.

## 1.6 User Stories

- **US-1:** As a user, I pick my goal so the app checks only what matters for it.
- **US-2:** As a user, I upload photos of my documents so I do not type everything.
- **US-3:** As a user, I review and correct what the app read so errors in reading do not become false findings.
- **US-4:** As a user, I see which fields mismatch and how serious each is.
- **US-5:** As a user, I get the cheapest fix first, with the exact documents to carry and warnings about lifetime update limits.
- **US-6:** As a user, I print a sample correction request letter or sample NPCI DBT seeding request letter in my language.
- **US-7:** As a user, I can wipe everything with one tap.
- **US-8:** As a demo viewer, I load sample cases without uploading anything.

## 1.7 Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-01 | Language switcher (EN, HI, MR) persisted in localStorage | Must | All UI strings and letters change; no untranslated keys visible. |
| FR-02 | Goal selection from 4 profiles | Must | Selecting a goal sets required documents and checks. |
| FR-03 | Consent and privacy screen before first upload | Must | Clearly states document images are sent to Google Gemini for text reading, only redacted/masked Aadhaar info is returned to the browser, and nothing is stored; user must tick to continue. |
| FR-04 | One upload slot per required document; camera capture or file pick; JPG, PNG, WebP, PDF | Must | Client compresses raster images via canvas to max 1600px, JPEG 0.8, under 4 MB; PDFs bypass canvas resize and are accepted directly up to 4 MB (over 4 MB rejected with clear message). |
| FR-05 | Extraction via /api/extract returning schema-valid JSON with per-field confidence | Must | Invalid JSON or schema failure retried once, then a friendly error with manual entry fallback. |
| FR-06 | Review screen: every extracted field editable; fields under 0.75 confidence highlighted | Must | Edits flow into analysis; user can add a document by manual entry only. |
| FR-07 | Deterministic analysis run in the browser | Must | Pure function analyze(input), no network calls. |
| FR-08 | Report: status banner (Ready, Ready with notes, Fix needed, Blocked), findings sorted by severity | Must | Each finding has rule ID, plain-language explanation, and both values shown side by side with character/token diff highlighting. |
| FR-09 | Fix plan: per finding, which document to change, where, steps, documents to carry, cost rank, lifetime cap note | Must | Ordered cheapest first; renders integrated below findings on /report (and accessible via /fix); marks "Verify on the official site" where rule data has verified: false. |
| FR-10 | Sample correction/request letters generated from templates (not AI), printable via print stylesheet | Must | EN, HI, MR; user details pre-filled; Devanagari renders correctly; labelled clearly as "Sample request letter". |
| FR-11 | Documents-to-carry checklist per fix | Should | Interactive checkbox list per fix item, copyable as plain text. |
| FR-12 | Demo mode with 3 fixture scenarios that bypass extraction | Must | Works 100% offline of the Gemini API. |
| FR-13 | "Which version is correct?" toggle per finding | Should | Changing it dynamically re-ranks the fix target and updates the letter preview. |
| FR-14 | Copy report as plain text for WhatsApp | Should | Includes findings, fix steps, and checklist; no sensitive ID numbers. |
| FR-15 | "Clear all data" button; data cleared on tab close | Must | Memory state reset, object URLs revoked immediately. |
| FR-16 | Read-aloud of fix plan via browser speech synthesis (hi-IN, mr-IN, en-IN) | Could | Hidden cleanly if matching voice is unavailable. |
| FR-17 | Bring-your-own Gemini key stored only in localStorage | Could | Sent as request header to /api/extract, never logged. |

## 1.8 Non-Functional Requirements

- Time from upload to report under 15 seconds for 3 documents on a normal connection.
- WCAG 2.1 AA, 48px minimum tap targets, base font 16px or larger.
- Works on Chrome Android 100+ and Safari iOS 16+.
- No PII in logs, URLs, or analytics.

## 1.9 Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| OCR misreads a field and creates a false finding | Mandatory review screen (S5); confidence highlighting under 0.75. |
| Rule data is outdated or unconfirmed | lastVerified, source, and verified boolean on every rule; UI displays "Verify on the official site" whenever verified is false. |
| User has already used all UIDAI lifetime updates | Fix plan includes the UIDAI Regional Office / 1947 exception-handling note rather than claiming Aadhaar is impossible to update. |
| User thinks the app guarantees acceptance | Persistent disclaimer; wording "likely issue", never "will be rejected" or "guaranteed". |
| Sensitive data exposure | Stateless memory, server-side Aadhaar redaction, explicit consent screen before upload, no request body logging. |
| Hindi/Marathi translation quality | Mark for native-speaker review; keep strings short and clear. |

## 1.10 Copy and Legal Guardrails

- Always display: "This is a check and guide, not an official verification."
- Never say "illegal", "will be rejected", or "guaranteed".
- Never ask for, store, or display a full Aadhaar number.
- Label letter templates as "Sample request letter".
