# ClaimKavach — 3-Minute Walkthrough & Demonstration Script

This script provides an exact, chronological 3-minute walkthrough of **ClaimKavach** for evaluators, healthcare advocates, and users.

---

## Chronological Walkthrough (180 Seconds)

### Minute 0:00 – 0:35 &bull; Landing Page & Zero-Data Privacy Guarantee
1. **Open the App:** Navigate to `http://localhost:3000` (or production URL).
2. **Key Visual Points:**
   - Notice the **45 Statutory Reference Records Loaded** status pill.
   - Point out the top memory banner: *"ClaimKavach runs purely in browser memory. Nothing is stored, tracked, or sent to a database."*
   - Language Toggle: Click **हिंदी** in the header to show instant Devanagari localization; switch back to **English**.
3. **Consent & Entry:**
   - Read the clear consumer notice: *"Independent open-source audit tool for consumer awareness, not legal or insurance advice."*
   - Check the consent box and click **Audit Hospital Bill**.

---

### Minute 0:35 – 1:15 &bull; Step 1: Upload & One-Click Synthetic Samples
1. **Overview of Modes:**
   - Highlight the **Synthetic Sample Bills** (zero upload required for instant evaluation).
   - Point out the optional **Custom Google Gemini API Key** configuration (sent strictly via `x-gemini-key`, never saved on server, `sessionStorage` default).
   - Note the 20-page document cap and <4 MB batching with client-side header deduplication.
2. **Select Sample 1 (Stent Overcharge):**
   - Click **Sample 1: Cardiac Stent Overcharge**.
   - Notice that Sample 1 automatically pre-populates hospital metadata and line items without needing any document upload.
3. **Click Proceed to Step 2 (Verify).**

---

### Minute 1:15 – 1:55 &bull; Step 2: Verification & Grand Total Reconciliation
1. **Interactive Verification Table:**
   - Point out the hospital name, stay duration, and **Invoice Date** field (with prompt explaining its role in DPCO/NPPA annual validity windows).
2. **Live Arithmetic Reconciliation Bar:**
   - Point out the green reconciliation status: *"Grand Total Arithmetic Reconciled — Calculated Line Sum: ₹1,85,000.00 | Stated Bill Total: ₹1,85,000.00"*.
3. **Line Items Inspection:**
   - Show how users can edit descriptions, categories, quantities, unit rates, brand/manufacturer/marketer, or toggle *"I checked this"*.
4. **Click "Run Statutory & Arithmetic Audit" &rarr; Proceed to Report.**

---

### Minute 1:55 – 2:35 &bull; Step 3: Audit Report, 5 Financial Cards & Coverage
1. **5 Financial Breakdown Cards:**
   - **Total Billed:** ₹1,85,000.00
   - **Fair Amount:** ₹1,85,000.00 (Fair = Billed - Confirmed only)
   - **Confirmed Overcharge:** ₹0.00 (Correctly 0 because reference data is `verified: false`)
   - **Likely Issues:** ₹45,813.97 (Stent statutory ceiling breach capped at Likely Issue because data is unverified)
   - **Needs Review:** ₹0.00
2. **Secondary Scenario Line:**
   - Point out: *"If all likely issues are upheld upon official verification or hospital dispute: Fair Amount becomes ₹1,39,186.03"*.
3. **Unverified Reference Data Notice:**
   - Notice the prominent badge on the finding: **DEMO DATA / UNVERIFIED**.
   - Explain the Trust Zone guard: unverified gazette data can **never** produce a Confirmed Overcharge.
4. **Coverage Breakdown Meters:**
   - **Arithmetic Coverage:** 100% (all items verified for multiplication and summation).
   - **Regulatory Coverage:** 50% (stent checked against S.O. 1587(E); room rent honestly noted as unsourced).
5. **Not Checked Items List:**
   - Expand the Not Checked section to see items like Room Rent where no statutory ceiling exists.

---

### Minute 2:35 – 3:00 &bull; Dispute Pack, Portals & Print Export
1. **Open Dispute Pack Tab:**
   - Click **Dispute Notice Pack (4 Drafts)**.
   - Show the 4 sequential escalation notices:
     1. Hospital Billing Query (with user-fillable timeline blank `[_____]`)
     2. Insurer Grievance (GRO Notice)
     3. Bima Bharosa Complaint Draft
     4. Insurance Ombudsman Representation
2. **Verification Box & Official Portals:**
   - Point out the *"Verify Before Sending Notice"* disclaimer with official links:
     - `irdai.gov.in`
     - `bimabharosa.irdai.gov.in`
     - `cioins.co.in`
3. **Print / Export Report:**
   - Click **Print / Export Report** (`window.print()`).
   - Notice the clean print stylesheet, embedding the statutory disclaimer and loaded reference data versions.

---

## What NOT to Claim (Demonstration Boundaries)

When presenting ClaimKavach, **strictly adhere** to these factual boundaries:

1. **DO NOT claim legal advice:** ClaimKavach is an informational consumer calculation aid, not legal representation.
2. **DO NOT claim reference records are officially certified:** All 45 regulatory records on disk currently have `verified: false` pending formal human review via `docs/sources/REVIEW.json`.
3. **DO NOT claim fraud or illegality:** Avoid words like "fraud", "scam", "illegal", or "cheating". Use precise statutory terms: *"Billed rate exceeds statutory ceiling in S.O. 1587(E)"* or *"Arithmetic calculation discrepancy"*.
4. **DO NOT claim fixed dispute deadlines:** ClaimKavach does not promise a "7-day refund timeline" or hardcoded legal deadline. All drafts provide user-fillable blanks for hospital response timelines.
5. **DO NOT claim un-sourced coverage:** Knee implants (S.O. 5190(E) table) and IRDAI Annexure-I schedules are not ingested; they remain honestly reported as `NOT_CHECKED`.
