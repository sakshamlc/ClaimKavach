# ClaimKavach (क्लेम कवच)

> **"AI reads the bill. Verified rules judge it."**  
> *A 100% Free-Tier AI Hospital-Bill & Insurance-Deduction Audit Tool for Indian Families.*

---

## 🎯 The Problem

Every year, millions of Indian families face catastrophic health expenses. Even with health insurance, hospitals frequently overcharge beyond National Pharmaceutical Pricing Authority (NPPA) ceiling caps on coronary stents and knee implants, unbundle routine nursing and vitals monitors from ICU packages, and TPAs arbitrarily disallow critical active care consumables under generic "non-payable" exclusion clauses.

Patients are handed 20-page billing folders at discharge when they are emotionally vulnerable and least able to scrutinize regulatory clauses.

---

## 🛡️ The Solution: ClaimKavach

ClaimKavach introduces a strict engineering boundary:
1. **AI Zone (Probabilistic):** Google Gemini Vision (`gemini-2.5-flash` via Google AI Studio) acts strictly as a structured OCR extractor, parsing messy receipts, invoices, and discharge summaries in memory. The LLM is **never** permitted to calculate prices, discounts, or legal citations.
2. **Trust Zone (Deterministic):** A pure TypeScript audit engine evaluates line items against local, verifiable gazetted rule files (`nppa_price_caps.json`, `irdai_bundling.json`, `irdai_nonpayable.json`) using exact integer paise arithmetic (`Math.round(inr * 100)`).
3. **Strict Verification Gating:** Rules marked with `verified: false` are strictly downgraded from `HIGH_CONFIDENCE` to `NEEDS_HUMAN_REVIEW` until validated against official Gazette notifications.
4. **Action Pack:** Generates an official, polite **Patient Billing Review Query & Grievance Draft (PDF)** ready for hospital billing desks and insurance TPA escalation under IRDAI Bima Bharosa guidelines.
5. **Multilingual Voice Briefing:** Web Speech API player providing voice briefings in English, Hindi, and Marathi with automatic browser voice pack detection and graceful text fallback.

---

## 🏗️ 5-Step Core Architecture

```
[ Step 1: Upload / 1-Click Synthetic Sample Bills ]
  │
[ Step 2: In-Memory Stateless Extraction (/api/extract) ]
  │ Uses GEMINI_MODEL (Default: gemini-2.5-flash) with rate limiting
[ Step 3: Human Review & OCR Verification (HumanReviewTable) ]
  │ Patient verifies line items, quantities, dates, prices, room category
[ Step 4: Pure TypeScript Deterministic Audit (ruleEngine.ts) ]
  │ NPPA DPCO Caps + Stay Math + Duplicate Tests + IRDAI Bundling & Non-Payables
[ Step 5: Output Workspace & Action Pack ]
  ├─ Bill X-Ray Canvas (Left Pane: Synchronized row highlights)
  ├─ Violation Cards & 3-Bar Savings Chart (Right Pane)
  ├─ Grievance Draft PDF Export (jsPDF + autotable)
  └─ Multilingual Voice Briefing (en-IN, hi-IN, mr-IN)
```

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/ClaimKavach.git
cd ClaimKavach
npm install
```

### 2. Environment Variables Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your free Gemini API key from [Google AI Studio](https://aistudio.google.com/):
```env
GEMINI_API_KEY="AIzaSy_YOUR_API_KEY_HERE"
GEMINI_MODEL="gemini-2.5-flash"
```
> *Tip: You can change `GEMINI_MODEL` to any active free-tier model in Google AI Studio (e.g. `gemini-2.0-flash`, `gemini-1.5-flash`) without altering application code.*

### 3. Run Test Suite
```bash
npx vitest run
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 📊 Pre-Configured Synthetic Demo Cases

1. **Case 1 (Hero Demo) — Cardiac Stent Audit:**
   - **Billed:** ₹3,42,000 | **Flagged:** ₹52,500 | **Est. Fair Payable:** ₹2,89,500
   - *Violations:* Coronary Drug-Eluting Stent (DES) billed above NPPA DPCO ceiling, unbundled ICU multipara monitoring charges, duplicate same-day cardiac troponin test, and disputed TPA cannula deduction.
2. **Case 2 — Dengue ICU Stay:**
   - **Billed:** ₹1,84,500 | **Flagged:** ₹26,500 | **Est. Fair Payable:** ₹1,58,000
   - *Violations:* Stay-duration math overflow (5 days billed on a 4-day admission), unbundled vitals monitor, duplicate same-day CBC, and administrative admission charge review.
3. **Case 3 — Knee Replacement + TPA Deduction:**
   - **Billed:** ₹2,65,000 | **Flagged:** ₹34,000 | **Est. Fair Payable:** ₹2,31,000
   - *Violations:* Primary Knee Implant Kit exceeding NPPA ceiling order, unbundled nursing charges in single private room, and wrongful TPA consumable exclusion under IRDAI Annexure-I active care exceptions.

---

## 🔒 Privacy & Compliance Guarantees

- **Zero Secret Leakage:** `GEMINI_API_KEY` is strictly confined to server-side `/api/extract/route.ts`.
- **Zero Disk Persistence:** Uploaded bills are processed in-memory and discarded immediately.
- **Instant Client Memory Purge:** Clicking "Delete Upload & Reset" clears all React state, object URLs, and in-memory caches.
- **Mandatory Educational Disclaimer:** Rendered on all workspace views and in generated grievance PDF drafts.

---

## ⚖️ Legal & Educational Disclaimer

ClaimKavach is an educational and analytical tool designed to help patients understand hospital bills and insurance deductions. It does not provide legal advice or medical guidance. Estimated amounts represent potential grounds for query and discussion with your hospital billing superintendent or insurance TPA.
