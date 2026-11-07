# ClaimKavach — System Specification

> **Tagline:** "AI reads the bill. Verified rules judge it."  
> **Mission:** Production-grade, privacy-first web application for auditing Indian hospital bills and insurance TPA deductions, tailored for Indian patients and families facing unexpected hospital costs.

---

## 1. Architectural Architecture & Core 5-Step Flow

```
[ Step 1: Upload / Sample Bill ]
          │ (PDF/JPG/PNG <= 10MB in memory OR 1 of 3 synthetic sample bills)
          ▼
[ Step 2: Extraction (/api/extract) ]
          │ Server-side only, calls Gemini API (gemini-2.5-flash / free tier)
          │ Outputs structured ExtractedBill JSON via strict schema
          ▼
[ Step 3: Human Review (HumanReviewTable) ]
          │ Patient verifies line items, quantities, dates, prices, room type
          │ Corrects OCR typos before audit runs
          ▼
[ Step 4: Deterministic Audit (ruleEngine.ts) ]
          │ Pure TypeScript, integer paise arithmetic
          │ Runs against local rule JSONs: NPPA caps, IRDAI bundling, IRDAI non-payable
          │ High-Confidence flags REQUIRE rule.verified === true AND matchScore >= 0.85
          ▼
[ Step 5: Output Workspace & Action Pack ]
          ├─ Bill X-Ray Canvas (Left: Stylized receipt / synchronized row highlights)
          ├─ Violation Cards & Savings Chart (Right: Flag cards, rupee breakdown, 3-bar chart)
          ├─ Patient Query / Grievance Draft PDF (jsPDF + autotable export)
          └─ Multilingual Voice Briefing (English, Hindi, Marathi with voice-pack fallback)
```

---

## 2. Design Tokens

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Navy** | `#0B1530` | Core background, primary dark headers, authoritative base |
| **Teal** | `#12A58A` | Trust, verified badges, action buttons, highlight accents |
| **Red (Above Ceiling)** | `#E5484D` | NPPA/DPCO ceiling price violations |
| **Amber (Review Flag)** | `#F5A524` | Package unbundling, potential duplication, policy reviews |
| **Purple (Insurer Deduction)** | `#8E4EC6` | TPA non-payable deduction dispute recommendations |
| **Slate Gray** | `#64748B` | Secondary text, borders, neutral indicators |

---

## 3. Data Schemas Summary

1. **`RuleSource`**: `{ documentName: string, clauseOrSchedule: string, publishedDate: string, url: string }`
2. **`ExtractedLineItem`**: Raw label, code, service date, category (`IMPLANT_DEVICE`, `MEDICINE`, `CONSUMABLE`, `ROOM_RENT`, `NURSING_MONITORING`, `DIAGNOSTICS_LAB`, `CONSULTATION`, `PROCEDURE_OT`, `OTHER`), normalized unit, quantity, unit price, total billed, TPA deductions, and optional bounding box.
3. **`ExtractedBill`**: Bill ID, isSample, isSynthetic, hospital name, patient name (redacted), admission/discharge dates, room category (`GENERAL_WARD`, `TWIN_SHARING`, `SINGLE_PRIVATE`, `ICU`, `NICU_PICU`, `DAY_CARE`, `UNKNOWN`), line items array.
4. **Rule Definitions**:
   - `NppaPriceCapEntry`: Implants/Medicines ceiling caps, normalized unit, mandatory disclosures, verified boolean, source.
   - `IrdaiBundlingEntry`: Standard ICU/ward package inclusions, rationale, verified boolean, source.
   - `IrdaiNonPayableEntry`: Consumable classification per IRDAI Annexure-I, exception rules, verified boolean, source.
5. **Audit Output**:
   - Confidence Tiers: `HIGH_CONFIDENCE`, `REVIEW_POLICY_BASED`, `NEEDS_HUMAN_REVIEW`, `CLEAR`
   - Color Categories: `ABOVE_CEILING` (#E5484D), `REVIEW_FLAG` (#F5A524), `INSURER_DEDUCTION` (#8E4EC6), `NEUTRAL`
   - Rupee calculations strictly performed in integer paise (`Math.round(inr * 100)`).

---

## 4. Privacy & Compliance Guarantees

- **Zero Disk/Database Persistence:** All uploaded files are received in memory via `FormData`, parsed to buffer, sent to the Gemini API, and instantly discarded.
- **Zero Secret Leakage:** `GEMINI_API_KEY` and `GEMINI_MODEL` are server-only.
- **Synthetic Sample Data:** 100% fictional hospital names and redacted patient IDs.
- **Mandatory Educational Disclaimer:** "ClaimKavach is an educational and analytical tool designed to help patients understand hospital bills and insurance deductions. It does not provide legal advice or medical guidance. Estimated amounts are potential grounds for query and dispute with your hospital or TPA."
