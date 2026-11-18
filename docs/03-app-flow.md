# ClaimKavach — App Flow Document (03-app-flow.md)

## 3.1 Screen Inventory

| ID | Screen | Route | Purpose |
|----|--------|-------|---------|
| S0 | Landing | / | Value in one line, language switch (EN/HI/MR), 'Start' and 'Try a demo' |
| S1 | Goal select | /goal | Choose one of 4 goals |
| S2 | Consent | /consent | Honest privacy statement (Gemini OCR disclosure + no storage) and tick-box |
| S3 | Upload | /upload | One slot per required document |
| S4 | Processing | inline state on S3 | Real progress status per document |
| S5 | Review | /review | Edit extracted fields, confirm low-confidence (<0.75) ones |
| S6 | Report & Fix Plan | /report (and /fix alias) | Unified Status banner, side-by-side findings, and ranked Fix Plan with interactive toggle |
| S8 | Letter | /letter/[findingId] | Printable sample request letter in chosen language |
| S9 | Demo picker | /demo | Choose one of 3 offline fixture scenarios |

## 3.2 Primary Flow (Happy Path)

```
S0 Landing -> S1 Goal -> S2 Consent -> S3 Upload (all required slots filled)
  -> S4 Processing (parallel extraction, one request per document)
  -> S5 Review (user confirms or edits) -> analyze() runs in browser
  -> S6 Unified Report & Ranked Fix Plan -> S8 Printable Sample Letter (print or save as PDF)
```

## 3.3 Demo Flow

```
S0 -> S9 Demo picker -> load fixture JSON -> S5 Review (pre-filled) -> S6 Unified Report & Fix Plan -> S8 Letter
```

No consent screen needed because nothing is uploaded; show a persistent "Sample Data" badge on every screen.

## 3.4 Screen Behaviour (Detailed)

### S0 Landing
- Headline: "Find the mismatch before the portal rejects you."
- Language chips: EN, HI, MR
- Two buttons: **Start** (primary), **Try a demo** (secondary)
- Footer: "This is a check and guide, not an official verification. Nothing is stored."

### S1 Goal select
Four large cards with icon and one-line description. Selecting one stores `goalId` and navigates to S2.

### S2 Consent
Plain statement: "Your document photos are sent over an encrypted connection to Google Gemini to read the printed text. Our server masks Aadhaar numbers before returning the text to your browser, and we never save your photos or details. Closing this tab or tapping Clear erases everything."
- Checkbox: "I understand"
- Continue disabled until ticked
- Link: "Enter details by hand instead" (skips upload, goes straight to S5 with empty forms)

### S3 Upload
One card per required document showing:
- label, example thumbnail
- "Take photo" and "Choose file" buttons
- status chip (Empty, Ready, Reading, Done, Failed)
- "Continue" enabled when all required slots are Done or manually filled
- Per-slot "Remove" and "Retry"

### S5 Review
One section per document, one input per field, confidence chip (High, Check this). Fields under 0.75 confidence start flagged in amber and must be tapped "Looks right" or edited before Continue is enabled. "Add missing value" for nulls. Aadhaar shown only as a masked indicator (never digits).

### S6 Report & Fix Plan (Unified for 3-Minute Demo)

**Top banner** coloured by status (Ready, Ready with notes, Fix needed, Blocked) with one plain sentence.

**Section A (Findings):** Cards sorted Blocker, High, Medium, Low, Info. Each card shows:
- title, severity chip
- SideBySideDiff (highlighting token order swaps or differing characters)
- "Why this matters" (one line)
- Anchor/scroll to its Fix step below

**Section B (Ranked Fix Plan, also accessible via /fix):** Ordered list, cheapest first. Each item shows:
- what to change, in which document, where to go
- steps (3–6 lines)
- UIDAI lifetime limit warning (if applicable)
- documents to carry (interactive checkbox list)
- effort chip (1 visit, online, multiple steps)
- "Verify on the official site" badge if verified: false
- interactive toggle "Which version is correct?"
- button "Create sample letter"
- button "Copy as text"
- button "Read aloud"

### S8 Letter
Rendered sample template with user details pre-filled. "Print or save as PDF" button invoking `window.print()`. Edit-in-place inputs for bank branch name and date.

## 3.5 State Model (Memory Only)

Zustand store holds:
- `language`
- `goalId`
- `consentAccepted`
- `isDemoMode`
- `documents[docType]` = `{ status, fileObjectUrl (revoked on clear), extracted, userConfirmedFields[] }`
- `findings[]`
- `fixPlan[]`
- `correctVersionChoice[findingId]`

A global "Clear all data" button sits in the header on every screen after S2.

## 3.6 Error and Edge-Case Handling

| Situation | Behaviour |
|-----------|-----------|
| Blurry or unreadable document | Low confidence plus message "We could not read this clearly. Retake in good light or type the value below." with Retry. |
| Wrong document in slot | Extractor returns detectedDocType; show "This looks like a PAN card" and offer one-tap move to the PAN slot. |
| File too large | Compress raster images client-side; if image or PDF is still over 4 MB, show clear size message before upload. |
| Gemini down or 502 / 422 | Retry button, plus immediate "Enter details by hand" fallback to S5. |
| Rate limited 429 | "Too many tries. Please wait a minute or enter details by hand." with countdown. |
| Only 1 of 2+ required docs provided | Report shows Blocker R-REQ-1 with explanation of which document is missing. |
| Offline | Landing and Demo Mode work completely offline after initial page load; upload screen shows friendly offline notice. |
| Back navigation vs Refresh | Back/forward preserves Zustand state in memory; browser refresh clears memory and returns cleanly to S0. |
| Hindi/Marathi missing string | Fall back gracefully to English and log a warning in dev console only. |
