# PechanSetu — UI/UX Design Brief (04-ui-ux-brief.md)

## 4.1 Design Principles

- **Calm, not bureaucratic:** The user is stressed; use plain words and generous whitespace.
- **One task per screen:** Never show an overwhelming wall of form inputs on landing.
- **Show, do not tell:** Place the two conflicting values side by side and highlight the differing tokens or characters.
- **Never alarm:** Say "likely issue", never "illegal" or "will be rejected".
- **Works for low digital literacy:** 48px minimum tap targets, icons paired with text labels, optional voice read-aloud.

## 4.2 Visual System & Color Tokens

| Token | Value | Use |
|-------|-------|-----|
| Primary | `#1F4E8C` | Primary buttons, active links |
| Primary hover | `#173B6B` | Hover and focus states |
| Surface | `#FFFFFF` | Cards and input containers |
| Background | `#F6F8FB` | Page background |
| Text | `#1B1F24` | Primary body copy |
| Muted | `#5A6572` | Secondary labels and captions |
| Success | `#1E7A46` on `#E6F4EA` | Ready status banner and confirmed chips |
| Warning | `#8A5A00` on `#FFF4DB` | High or Medium severity chips, low-confidence highlight |
| Danger | `#B3261E` on `#FDECEA` | Blocker severity chip and Blocked banner |
| Info | `#1F5F8B` on `#E6F1F8` | Info chip and DBT seeding guidance |

**Never rely on colour alone:** Every severity chip and status banner includes a distinct icon and text label. All text combinations meet WCAG 2.1 AA contrast (>= 4.5:1).

**Typography:** Load `Noto Sans` (Latin) and `Noto Sans Devanagari` (Hindi/Marathi) via `next/font/google`. Base font 16px, body line-height 1.6, headings 24px / 20px / 18px, minimum 14px for captions. Increase Devanagari base font size by +1px (17px) for optical legibility.

**Spacing and shape:** 8px spatial grid, card border-radius 12px, 1px solid border `#D9E0E8`, subtle hover shadow.

## 4.3 Component Inventory (shadcn/ui based)

- `GoalCard` — goal selection card
- `UploadSlot` — file upload slot with camera/file and status chip
- `StatusChip` — document slot status
- `ConfidenceChip` — High/Check this per extracted field
- `FieldRow` — label, editable input, confidence chip, confirm button
- `SeverityChip` — Blocker/High/Medium/Low/Info
- `FindingCard` — finding with SideBySideDiff and anchor to fix
- `SideBySideDiff` — highlights token swaps in amber and character diffs in rose/emerald
- `FixStepCard` — ranked fix step with checklist, toggle, letters, copy
- `ChecklistItem` — interactive checkbox
- `LanguageSwitch` — EN/HI/MR chip group
- `ConsentBox` — checkbox with privacy statement
- `StickyActionBar` — persistent "Clear all data" header button
- `Toast` — transient feedback messages
- `EmptyState` — empty state illustration + prompt
- `ErrorState` — error state with one recovery action
- `LoadingSkeleton` — skeleton cards during extraction
- `VerifyBadge` — "Verify on the official site" badge for verified:false rule entries

## 4.4 Mobile Wireframe (S6 Unified Report & Fix Plan)

```
REPORT & FIX PLAN (375px Mobile Viewport)
+---------------------------------------+
| [EN | HI | MR]          [Clear Data]  |
+---------------------------------------+
| [!] FIX NEEDED                        |
| 1 issue found for PM-Kisan Payment    |
+---------------------------------------+
| [HIGH] Name word order differs        |
|  Aadhaar: [Ramesh] [Kumar]            |
|  Bank:    [Kumar]  [Ramesh]           |
|  Why: Portal matching may fail        |
|  Correct version: (o) Aadhaar ( ) Bank|
+---------------------------------------+
| EASIEST FIX (Rank #1 - Free, 1 Visit) |
| Change: Bank Passbook Name            |
| Where:  Your Home Bank Branch         |
| Why not Aadhaar? UIDAI allows only 2  |
| lifetime name updates (Rs. 75 fee).   |
| Carry:  [x] Original Aadhaar          |
|         [x] Bank Passbook             |
| [ Create Sample Letter ] [ Copy Text ]|
+---------------------------------------+
| [i] Check NPCI DBT Seeding status     |
| [ Sample DBT Seeding Letter ]         |
+---------------------------------------+
| This is a check and guide, not an     |
| official verification.                |
+---------------------------------------+
```

## 4.5 Interaction Details

- Camera button opens device rear camera (`capture='environment'`) with helper hint "Fit the whole document inside the frame in good light".
- Processing shows one real status row per document (Compressing -> Reading with Gemini -> Validating), never a fake timer.
- Low-confidence fields (<0.75) pulse once and remain highlighted in amber until confirmed or edited.
- Transitions limited to 150–200ms; respect `prefers-reduced-motion`.

## 4.6 Microcopy Samples (EN / HI / MR)

| Key | English | Hindi | Marathi |
|-----|---------|-------|---------|
| headline | Find the mismatch before the portal rejects you | पोर्टल से रिजेक्ट होने से पहले गड़बड़ी पकड़ें | पोर्टल नाकारण्यापूर्वी चूक शोधा |
| start | Start | शुरू करें | सुरू करा |
| demo | Try a demo | डेमो आज़माएँ | डेमो पहा |
| fix_needed | Fix needed | सुधार ज़रूरी | दुरुस्ती आवश्यक |
| name_reorder | The words of your name are in a different order | आपके नाम के शब्दों का क्रम अलग है | तुमच्या नावातील शब्दांचा क्रम वेगळा आहे |
| patronymic_omission | Middle (father/spouse) name is present on one document and omitted on the other | एक दस्तावेज़ में पिता/पति का मध्य नाम है और दूसरे में नहीं है | एका कागदपत्रात वडिलांचे/पतीचे मधले नाव आहे आणि दुसऱ्यात नाही |
| verify_note | Verify latest procedure and fee on the official portal | आधिकारिक पोर्टल पर नवीनतम प्रक्रिया और शुल्क की पुष्टि करें | अधिकृत पोर्टलवर नवीनतम प्रक्रिया आणि शुल्काची खात्री करा |
| disclaimer | This is a check and guide, not an official verification | यह जाँच और मार्गदर्शन है, आधिकारिक सत्यापन नहीं | ही तपासणी व मार्गदर्शन आहे, अधिकृत पडताळणी नाही |

## 4.7 Accessibility & Empty/Loading/Error States

- Semantic HTML landmarks
- Explicit `<label>` associations
- Visible focus rings (never outline: none without replacement)
- `aria-describedby` for field errors
- `role='status'` on banners
- Keyboard navigation throughout
- 200% text zoom support

Every screen implements:
- **Empty** state with illustration and prompt
- **Loading** state (skeleton cards)
- **Error** state with one plain sentence and one recovery action
