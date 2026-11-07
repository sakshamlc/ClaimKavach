# ClaimKavach — Coding Rules for Engineers & Agents

Every developer and AI agent working on this codebase must strictly adhere to these architectural rules:

---

## 1. Zero Secret Leakage
- `GEMINI_API_KEY` and `GEMINI_MODEL` must **ONLY** be read inside server-side code (`src/app/api/extract/route.ts`).
- Never prefix API keys with `NEXT_PUBLIC_`.
- Do not log raw API keys, bearer tokens, or user-uploaded file contents in server or client logs.

## 2. Configurable Free-Tier Gemini Model
- Always read the model dynamically:
  ```ts
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  ```
- Keep Google AI Studio documentation references in `.env.example` so users can switch free-tier models (e.g. `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`) without code changes.

## 3. Strict Boundary: Probabilistic Extraction vs Deterministic Audit
- **LLM (`/api/extract`) ONLY extracts raw structured text**:
  - Labels, quantities, units, unit prices, service dates, hospital name, admission/discharge dates, and room category.
  - The LLM must **NEVER** calculate price caps, ceilings, discounts, legal citations, or circular numbers.
- **Audit Engine (`src/lib/ruleEngine.ts`) is 100% Pure Deterministic TypeScript**:
  - Uses exact integer paise arithmetic (`toPaise = Math.round(inr * 100)`).
  - Evaluates against local JSON rule files (`nppa_price_caps.json`, `irdai_bundling.json`, `irdai_nonpayable.json`).

## 4. Strict `verified: boolean` Gating
- Every rule entry in `src/data/*.json` has:
  ```ts
  verified: boolean;
  source: {
    documentName: string;
    clauseOrSchedule: string;
    publishedDate: string; // YYYY-MM-DD
    url: string;
  };
  ```
- **Rule:** If `rule.verified === false`, the rule engine MUST NOT emit a `HIGH_CONFIDENCE` flag. It must downgrade to `NEEDS_HUMAN_REVIEW`.
- A high-confidence flag requires:
  1. `rule.verified === true`
  2. `matchScore >= 0.85`
  3. Compatible normalized units (e.g. `UNIT` vs `UNIT`).

## 5. Stateless In-Memory Uploads & Client Privacy
- Never persist uploaded bills to disk, local storage, indexedDB, or cloud buckets.
- Parse `FormData` buffer in memory, stream to Gemini, and allow immediate garbage collection.
- The "Delete Upload & Reset" button must purge React state, object URLs, and in-memory caches instantly.

## 6. Honest Bill X-Ray Highlighting
- For built-in synthetic sample bills: Render a clean, stylized hospital receipt with deterministic line-item highlight anchors.
- For user-uploaded bills: Render the interactive Extracted-Items X-Ray Table as the primary highlight view with optional raw image preview toggle. This guarantees phone camera captures never display floating, misaligned bounding boxes.

## 7. Language & Voice-Pack Detection
- `VoiceBriefingPlayer.tsx` must detect available browser voices via `window.speechSynthesis.getVoices()`.
- If a voice pack is missing for Hindi (`hi-IN`) or Marathi (`mr-IN`), do not fail silently or produce garbled sound. Mark audio as unavailable for that language and display the translated written summary clearly.

## 8. Consumer Protection & Legal Phrasing
- Always use **"Potential amount to dispute"** — never use "Guaranteed refund" or "Illegal charge".
- Render the mandatory educational disclaimer in the web workspace and in generated PDF grievance drafts.
