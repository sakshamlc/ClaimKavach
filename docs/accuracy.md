# ClaimKavach — Document Extraction Accuracy Audit (docs/accuracy.md)

> **Important Disclosure on Test Methodology:**
> In accordance with ClaimKavach's honest verification policy and non-negotiable rules, **this extraction audit was evaluated against synthetic benchmark fixtures** (`mock-aadhaar.json`, `mock-pan.json`, `mock-bank.json`, `mock-certificate.json`, `scenario-1.json`, `scenario-2.json`, `scenario-3.json`) in mock mode (`EXTRACT_MOCK=1`) without live API calls during automated local CI test runs. No empirical claim of 95%+ field accuracy on real user camera photos is made, because real-world OCR performance is subject to optical distortions, poor lighting, regional fonts, and passbook print wear. This document details the benchmark schema design, model configuration, per-field validation results, and the safety mechanisms in place.

---

## 1. Model Configuration & Architecture

- **Primary Configured Model:** `gemini-3.5-flash-lite` (specified via `process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'`)
- **Generation Configuration:**
  - `temperature: 0` (deterministic extraction)
  - `responseMimeType: 'application/json'`
  - Strict `responseSchema` enforcing typed fields, confidence floats (0.0 to 1.0), and ISO date formats
- **Regional Language Fallback:** `gemini-3.8-flash`
  - Recommended when processing purely regional-language documents (Devanagari script in Hindi/Marathi) where complex conjunct characters (*samyuktaksharas*) require higher token resolution.
- **Client-Side Compression Boundary:**
  - Raster images (JPEG/PNG/WebP) are compressed via HTML5 Canvas to a maximum dimension of 1600px and JPEG quality 0.8 ($\le 4$ MB) prior to upload.
  - Native PDFs ($\le 4$ MB) are transmitted directly without rasterization to preserve vector text streams.

---

## 2. Benchmark Evaluation on Synthetic Documents (Mock Suite)

Below are the per-field schema validation results from the 10 reference document types used to verify the extraction and normalization pipeline:

| # | Document Category | Script / Language | Key Tested Fields | Schema Compliance | Redaction Applied? | Verified in CI |
|---|---|---|---|:---:|:---:|:---:|
| 1 | Aadhaar Card (Clean Digital) | Latin / English | `fullName`, `dob`, `gender`, `aadhaarRedacted` | PASS | YES (`[Aadhaar Present - Redacted]`) | `mock-aadhaar.json` |
| 2 | Aadhaar Card (Bilingual) | Devanagari / Latin | `fullName`, `fatherOrSpouseName`, `dob`, `gender` | PASS | YES (`[Aadhaar Present - Redacted]`) | `scenario-2.json` |
| 3 | Aadhaar Card (Year-Only) | Latin / English | `fullName`, `yearOfBirthOnly: 1982`, `dob: null` | PASS | YES (`[Aadhaar Present - Redacted]`) | Schema unit test |
| 4 | PAN Card (Standard Individual) | Latin / English | `fullName`, `panNumber: "ABCPK1234F"`, `dob` | PASS | N/A | `mock-pan.json` |
| 5 | PAN Card (Surname-First) | Latin / English | `fullName: "Kumar Ramesh"`, `panNumber: "ABCDK1234F"` | PASS | N/A | `scenario-1.json` |
| 6 | Bank Passbook (Computerized) | Latin / English | `accountHolderName`, `accountNumberLast4`, `ifsc: "SBIN0001234"` | PASS | N/A | `mock-bank.json` |
| 7 | Bank Passbook (Merged Bank) | Latin / English | `accountHolderName`, `ifsc: "BKDN0001234"` (Dena Bank) | PASS | N/A | `rules.test.ts` |
| 8 | Bank Passbook (Invalid IFSC) | Latin / English | `accountHolderName`, `ifsc: "MAHB000012"` (10 chars) | PASS | N/A | `scenario-3.json` |
| 9 | School Marksheet / Certificate | Latin / English | `certificateName`, `dob`, `institutionName` | PASS | N/A | `mock-certificate.json` |
| 10| School Marksheet (Patronymic) | Latin / English | `fullName: "Sunita Patil"`, `fatherOrSpouseName: "Ramesh Patil"` | PASS | N/A | `scenario-2.json` |

---

## 3. Mandatory Safety Guardrail: Screen S5 Human-in-the-Loop Confidence Gate

Because OCR models can misread low-contrast characters (e.g., mistaking `8` for `0`, or misinterpreting faded ink on rural bank passbooks), ClaimKavach strictly decouples extraction from judgment:

1. **Extraction Confidence Scoring:**
   - Gemini returns an optical confidence score ($0.0 \dots 1.0$) for each extracted field.
2. **Confidence Threshold ($< 0.75$):**
   - Any field returned with confidence below $0.75$ is flagged in amber on Screen S5 (Review Extracted Information).
3. **Mandatory User Confirmation:**
   - The user must either tap `"Looks right"` to confirm the value or edit the text input directly before the `"Run Pre-Flight Analysis"` button permits proceeding.
4. **Deterministic Protection:**
   - Rules engine rules (`/src/lib/rules`) execute **only** on confirmed or user-edited values, preventing OCR errors from generating false mismatch alerts.
