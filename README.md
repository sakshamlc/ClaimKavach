# PechanSetu (पहचानसेतू)

> **"Find the mismatch before the portal rejects you."**  
> A stateless, privacy-first pre-flight web application designed to help people in India catch and resolve cross-document mismatches (name order, patronymic middle names, transliteration differences, DOB swap, PAN format, and merged-bank IFSCs) before submitting government scheme, scholarship, or banking applications.

---

## 1. The Problem

Small, unintentional differences between Indian identity and banking documents cause severe real-world hardship:
- **PM-Kisan & DBT payments fail** due to reversed name order (e.g. *Ramesh Kumar* on Aadhaar vs *Kumar Ramesh* in bank passbook).
- **Scholarship forms get rejected** when Maharashtra/Gujarat patronymic father/husband middle names are omitted on school certificates (*Rahul Suresh Patil* vs *Rahul Patil*).
- **PAN-Aadhaar linking gets rejected** due to day/month date-of-birth swaps (*05/03/2001* vs *03/05/2001*).
- **Bank KYC loops occur** when IFSC codes belong to PSU banks that merged under RBI circulars (e.g. *Dena Bank* `BKDN`, *Andhra Bank* `ANDB`, *Syndicate Bank* `SYNB`).

Government portals rarely explain *why* an application failed or *which field* was mismatched—they merely output "Rejected" or "Mismatch". Residents end up paying local agents or making repeated trips to administrative offices.

**PechanSetu solves this by running a complete pre-flight check in under 3 minutes, showing exact side-by-side differences and ranking the cheapest fix first.**

---

## 2. Core Architectural Principles: AI Reads, The User Confirms, Code Judges

1. **AI Reads, The User Confirms, Code Judges:**  
   - **AI Reads:** Google Gemini (`@google/genai`, `temperature: 0`, structured schema) is used **strictly** inside a single serverless route (`POST /api/extract`) to turn document images/PDFs into structured text.
   - **The User Confirms:** Every extracted field with confidence < 0.75 or ambiguous reading is highlighted on the Review Screen for user confirmation before any analysis runs. OCR can make mistakes, so the user always has the final say.
   - **Code Judges:** All comparison, transliteration, phonetic scoring, severity calculation, and fix ranking is 100% deterministic TypeScript in `/src/lib/rules` with zero AI calls and zero network requests.

2. **100% Stateless & Honest Privacy Statement:**  
   - **Images Sent to Google Gemini:** Document photos are transmitted over TLS to Google Gemini solely to extract printed text.
   - **Nothing is Stored:** Zero database, zero user accounts, zero server-side storage, and zero request-body logging.
   - **Aadhaar Protection:** The first 8 digits of Aadhaar are redacted before returning text to your browser. Full Aadhaar numbers are never stored or logged.
   - **Ephemeral Browser Memory:** All state lives strictly in browser memory (Zustand). Revoking object URLs and closing the tab or tapping "Clear all data" permanently erases everything.

3. **Honest Copy & Clear Limitations:**  
   - **Not an Official Verification:** PechanSetu is an advisory pre-flight check and guidance tool, not an official verification authority.
   - **OCR Limits:** OCR can misread faint text, blurred edges, or skewed camera angles. The client-side blur gate rejects images with Laplacian variance < 40 and prompts for a retake.
   - **No Misleading Guarantees:** The app never promises that applications "will succeed" or claims that issues "will be rejected". Wording strictly uses honest phrasing ("No mismatches found", "may reject", "are likely to reject").
   - **Pre-filled Letter Drafts:** Sample letters are clearly labeled pre-filled drafts for the user to review, edit, and sign.

4. **Rule Data Transparency & Unverified Entries (`verified: false`):**  
   Every rule data entry in `/src/data/*.json` explicitly records its verification status. Entries that have not been validated against primary gazetted circulars are marked `verified: false` and carry a *"Verify on the official site"* badge in the UI.

   **Current Unverified Rule-Data List (`verified: false`):**
   - **`correction-costs.json`**:
     - `bank`: Branch visit fee text and local modification process (`verified: false`)
     - `pan`: ~Rs. 110 fee and 15-digit acknowledgement number (`verified: false`)
     - `aadhaar`: 14-digit URN tracking procedure (`verified: false`)
     - `certificate`: Educational board duplicate certificate fee and affidavit workflow (`verified: false`)
   - **`merged-banks.json`**:
     - All 8 merged bank entries (`BKDN`, `ANDB`, `SYNB`, `ALLA`, `CORP`, `VIJB`, `ORBC`, `UTBI`) remain `verified: false` until cross-checked with official RBI master directives.
   - **`goals.json`**:
     - All 4 goal check profiles (`pm_kisan_payment`, `scholarship_application`, `pan_aadhaar_link`, `bank_kyc`) are marked `verified: false` as portal rules evolve.
   *(The only entries marked `verified: true` are UIDAI's published lifetime update limits: Name 2, DOB 1, Gender 1; Rs. 75 fee; Regional Office exception path).*

---

## 3. Supported Goals & Documents

### 4 Pre-Configured Goal Profiles
| Goal ID | Application Type | Required Documents | Strictness | Authoritative Document |
|---------|------------------|--------------------|------------|------------------------|
| `pm_kisan_payment` | PM-Kisan Payment Fix | Aadhaar + Bank Passbook | Strict (order matters) | Aadhaar |
| `scholarship_application` | Scholarship Application | Aadhaar + School/College Certificate | Standard | Aadhaar |
| `pan_aadhaar_link` | PAN-Aadhaar Linking | Aadhaar + PAN Card | Strict | Aadhaar |
| `bank_kyc` | Bank KYC & Re-KYC Update | Aadhaar + PAN + Bank Passbook | Standard | Aadhaar |

### 4 Supported Document Types
1. **Aadhaar Card** (Name, Father/Spouse name, DOB / Year of birth, Gender, Redacted Aadhaar presence)
2. **PAN Card** (Name, Father name, DOB, 10-char PAN number)
3. **Bank Passbook / Cheque** (Account holder name, Account last 4 digits, 11-char IFSC code, Bank name)
4. **School/Board Certificate** (Student name, Father/Spouse name, DOB, Certificate title, Board name)

---

## 4. How the Rules Engine Works

All functions in `/src/lib/rules` are pure, deterministic functions exhaustively tested in Vitest.

### Deterministic Name Comparison (`compareNames`)
Evaluated in strict deterministic order (1 to 7):

1. **`NORMALIZED_EXACT`**: Identical after `normalizeName()` (NFKC, lowercase, punctuation removed, salutations stripped, aliases applied).
2. **`TOKEN_REORDER`**: Same multiset of name words in a different order (e.g. *Ramesh Kumar* vs *Kumar Ramesh*).
   - **Critical Guardrail:** `honorifics.json` strips ONLY salutations (`shri, smt, mr, mrs, dr`, etc.). It **never** strips given names or titles like `kumar, kumari, ben, bai, devi, lal, singh`.
3. **`PATRONYMIC_MIDDLE_OMISSION`**: One document has 3 words [First, Middle, Last] and the other has 2 words [First, Last].  
   - First and Last tokens match (either exactly, via Devanagari phonetics, or via Jaro-Winkler ≥ 0.88 with length ≥ 4 guard).
   - Middle token matches the first name of `fatherOrSpouseName` from either document (e.g. *Sunita Ramesh Patil* vs *Sunita Patil* with father *Ramesh Patil*).
4. **`INITIAL_ABBREVIATION`**: One side uses a single-letter initial matching the start of the full word (e.g. *R. Kumar* vs *Ramesh Kumar*).
5. **`TRANSLITERATION_VARIANT`**: Same word count, where every paired word matches after Indian phonetic normalization (`aa->a, ee->i, oo->u, chh->ch, sh->s, ph->f, v->w, th->t, dh->d, bh->b, gh->g, kh->k, ou->au, trailing y->i`) OR has Jaro-Winkler similarity ≥ 0.88 (with token length ≥ 4 guard).
   - Normalizes *Sunitha* == *Sunita*, *Chaudhari* == *Choudhary*.
6. **`MISSING_TOKEN`**: All tokens of the shorter name match the longer name, but the extra word is not explained by father/spouse details.
7. **`MISMATCH`**: Completely different names (e.g. *Amit Shah* vs *Rohan Mehta*).

### Other Deterministic Checks
- **`R-DOB-1`**: Parses `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD`, `DD Mon YYYY`. If day ≤ 12 and `DD/MM` matches `MM/DD`, flags **"Possible Day/Month Swap"** blocker.
- **`R-DOB-2`**: Handles older cards with birth year only (`yearOfBirthOnly: 1965`).
- **`R-PAN-1..3`**: Validates 10-char format `^[A-Z]{5}[0-9]{4}[A-Z]$`, verifies Individual type ('P'), and checks that the 5th character matches the surname initial (with support for token-reordered names).
- **`R-IFSC-1..2`**: Validates 11-char format (5th char must be zero `0`), and detects merged PSU bank codes:
  - `BKDN` (Dena Bank → Bank of Baroda)
  - `ANDB` (Andhra Bank → Union Bank of India)
  - `SYNB` (Syndicate Bank → Canara Bank)
  - `ALLA` (Allahabad Bank → Indian Bank)
  - `CORP` (Corporation Bank → Union Bank)
  - `VIJB` (Vijaya Bank → Bank of Baroda)
  - `ORBC` (Oriental Bank of Commerce → PNB)
  - `UTBI` (United Bank of India → PNB)
- **`R-DBT-1`**: Explains NPCI DBT Mapper seeding requirement for PM-Kisan & Scholarships, separate from bank KYC.

### Fix Target Selection & UIDAI Cap Protection
When two documents mismatch:
1. If the user toggles **"Which version is correct?"**, the other document is targeted.
2. Otherwise, the app targets the document with the **lower correction cost / effort**:
   - Bank Passbook (`cost: 1` — Free at branch)
   - PAN Card (`cost: 2` — ~Rs. 110 online)
   - Aadhaar Card (`cost: 4` — Rs. 75, strictly capped by UIDAI)
   - School Certificate (`cost: 5` — Board affidavit required)
3. Whenever Aadhaar is targeted or involved, the app explicitly shows UIDAI's verified lifetime update limits (**Name: 2, DOB: 1, Gender: 1**) and provides the **UIDAI Regional Office / 1947 helpline exception path**.

---

## 5. Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm 9+

### Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```ini
# Get free API key from https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# Default model: gemini-3.5-flash-lite (stable Nov 2026)
GEMINI_MODEL=gemini-3.5-flash-lite

# Set to 1 to run offline with canned mock fixtures without hitting the Gemini API
EXTRACT_MOCK=0

# Rate limit and max upload size
MAX_UPLOAD_MB=4
RATE_LIMIT_PER_MIN=10
```

### Installation & Development
```bash
# Install dependencies
npm install

# Run all checks (ESLint, TypeScript typecheck, Vitest unit tests)
npm run check

# Start Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment to Vercel

PechanSetu is ready for deployment on [Vercel](https://vercel.com):

1. Push your repository to GitHub (`main` branch).
2. Import the project into your Vercel Dashboard.
3. Set the following Environment Variables in the Vercel project settings:
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.
   - `GEMINI_MODEL`: `gemini-3.5-flash-lite`
   - `MAX_UPLOAD_MB`: `4`
   - `RATE_LIMIT_PER_MIN`: `10`
   - `EXTRACT_MOCK`: `0`
4. Deploy. The Next.js App Router and serverless routes will configure automatically.

---

## 6. Testing

### Run Unit Tests (Vitest)
```bash
npm run test
# or
npx vitest run
```
Tests cover:
- Name normalization & honorific guardrail (Kumar/Singh never stripped)
- Token reordering (*Ramesh Kumar* vs *Kumar Ramesh*)
- Initial abbreviations (*R. Kumar* vs *Ramesh Kumar*)
- Name aliases (*Mohd* vs *Mohammad*)
- Transliteration variants (*Sunitha* vs *Sunita*, *Chaudhari* vs *Choudhary*)
- Patronymic middle omissions with and without father details
- Date-of-birth day/month swap detection
- PAN 5th letter checks with reordered names
- Invalid PAN & IFSC codes
- Merged bank codes (`BKDN`, `ANDB`, `SYNB`, etc.)
- Status banner logic & Fix plan ranking
- Complete end-to-end evaluation of the 3 demo fixtures

### Run Playwright E2E Tests
```bash
npx playwright test
```
Tests run at a **375px mobile viewport** across English, Hindi, and Marathi.

---

## 7. How to Update Rule Data

All rule datasets live in `/src/data/*.json`:

| File | Description | Updating Instructions |
|------|-------------|-----------------------|
| `goals.json` | Goal profiles, required documents, strictness | Add or update goals. Set `verified: false` unless verified with gazetted scheme guidelines. |
| `correction-costs.json` | Fees, steps, documents to carry | Only UIDAI lifetime limits and the Rs. 75 fee may have `verified: true`. All other entries must have `verified: false`. |
| `bank-codes.json` | Active scheduled bank IFSC prefixes | Add 4-letter RBI prefixes with bank names. |
| `merged-banks.json` | Merged PSU bank prefixes | Add old prefix, merged bank name, and new prefix. Must keep `verified: false` until checked against RBI circulars. |
| `honorifics.json` | Stripped salutations | **NEVER** add `kumar`, `kumari`, `ben`, `bai`, `devi`, `lal`, or `singh`. Only add strict salutations (`shri, smt, dr`, etc.). |
| `name-aliases.json` | Canonical name variants | Add spelling variations mapping to canonical forms. |

---

## 8. Known Limitations & Sample Documents Note

1. **Synthetic Sample Documents Only:** All sample and demo document fixtures included in this repository (`/src/fixtures/`, `/stress_tests/`) are 100% synthetic mock data generated for testing. None contain real personally identifiable information (PII), real Aadhaar numbers, real PAN numbers, or real bank accounts.
2. **Handwritten Documents:** The MVP is optimized for printed identity cards and computer-printed bank passbooks. Handwritten text on old rural passbooks is out of scope.
3. **Pre-Flight Check Only:** PechanSetu does not submit applications or communicate with government portals. It provides pre-flight guidance and sample request drafts.
4. **Regional Office Exception Path:** While UIDAI allows exception handling beyond lifetime limits via Regional Offices / 1947, approval remains at UIDAI's discretion.
5. **Dependency Audit & Major Upgrades:** An `npm audit` scan flags 18 vulnerabilities in Next.js 14, Vitest 2, and Zod 3. In the production runtime (`npm audit --omit=dev`), only 3 findings exist, none of which affect PechanSetu's stateless core (the app does not use Next.js Server Actions or dynamic `next/image` optimization). Major framework upgrades (`next@16`, `vitest@5`, `zod@4`) involve breaking changes across the App Router and are planned for post-demo release.

---

## 9. License

This project is open source. A LICENSE file has not been committed yet—please refer to repository settings for the chosen open source license.
