# PechanSetu — Backend Schema Document (05-backend-schema.md)

## 5.1 Core Types (TypeScript / Zod)

```ts
export type DocType = 'aadhaar' | 'pan' | 'bank' | 'certificate';
export type GoalId = 'pm_kisan_payment' | 'scholarship_application' | 'pan_aadhaar_link' | 'bank_kyc';
export type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';
export type NameVerdict =
  | 'NORMALIZED_EXACT'
  | 'TOKEN_REORDER'
  | 'PATRONYMIC_MIDDLE_OMISSION'
  | 'INITIAL_ABBREVIATION'
  | 'TRANSLITERATION_VARIANT'
  | 'MISSING_TOKEN'
  | 'MISMATCH';

export interface Field<T = string> {
  value: T | null;
  confidence: number; // 0..1
}

export interface ExtractedDocument {
  docType: DocType;
  detectedDocType: DocType | 'unknown';
  fields: {
    fullName?: Field;
    fatherOrSpouseName?: Field;
    dob?: Field;                  // exact printed string
    dobIso?: Field;               // YYYY-MM-DD or null
    yearOfBirthOnly?: Field<number>;
    gender?: Field<'M' | 'F' | 'O'>;
    aadhaarRedacted?: Field<string>; // e.g. '[Aadhaar Present - Redacted]'; never digits
    panNumber?: Field;
    accountHolderName?: Field;
    accountNumberLast4?: Field;   // masked in UI
    ifsc?: Field;
    bankName?: Field;
    certificateName?: Field;
    institutionName?: Field;
  };
  overallConfidence: number;
}

export interface AnalysisInput {
  goalId: GoalId;
  documents: Partial<Record<DocType, ExtractedDocument>>;
  confirmedFields: string[];                     // e.g. 'aadhaar.fullName'
  correctVersionChoice: Record<string, DocType>; // findingId -> doc user marks correct
}

export interface Finding {
  id: string;
  ruleId: string;                 // e.g. 'R-NAME-1', 'R-DOB-1'
  severity: Severity;
  titleKey: string;
  explanationKey: string;
  left: { doc: DocType; labelKey: string; value: string };
  right: { doc: DocType; labelKey: string; value: string };
  verdict?: NameVerdict;
  fixTarget?: DocType;
}

export interface FixStep {
  findingId: string;
  targetDoc: DocType;
  whereKey: string;
  stepKeys: string[];
  documentsToCarryKeys: string[];
  lifetimeLimitNoteKey?: string;
  exceptionPathNoteKey?: string;
  effortRank: number;             // 1 = easiest
  effortLabelKey: string;
  needsVerification: boolean;     // true when rule data has verified: false
  letterTemplateId?: 'name-correction' | 'dbt-seeding-request';
}

export interface Report {
  status: 'ready' | 'ready_with_notes' | 'fix_needed' | 'blocked';
  findings: Finding[];
  fixPlan: FixStep[];
  generatedAt: string;
}

export interface ApiError {
  error: {
    code: 'BAD_TYPE' | 'TOO_LARGE' | 'SCHEMA_FAIL' | 'RATE_LIMIT' | 'UPSTREAM';
    message: string;
  };
}
```

## 5.2 Example Response: POST /api/extract (aadhaar)

```json
{
  "docType": "aadhaar",
  "detectedDocType": "aadhaar",
  "fields": {
    "fullName": { "value": "Ramesh Kumar", "confidence": 0.97 },
    "fatherOrSpouseName": { "value": "Laxman Kumar", "confidence": 0.91 },
    "dob": { "value": "05/03/2001", "confidence": 0.95 },
    "dobIso": { "value": "2001-03-05", "confidence": 0.95 },
    "gender": { "value": "M", "confidence": 0.99 },
    "aadhaarRedacted": { "value": "[Aadhaar Present - Redacted]", "confidence": 0.96 }
  },
  "overallConfidence": 0.95
}
```

## 5.3 Static Data Files & Verification Honesty Rules

| File | Shape & Honesty Requirement |
|------|----------------------------|
| goals.json | `{ id, labelKey, descKey, required: DocType[], nameStrictness: 'strict'|'standard', authoritativeDoc: DocType, checks: string[], source, lastVerified, verified: boolean }` |
| correction-costs.json | `{ doc, cost: 1..5, effortLabelKey, whereKey, feeText, lifetimeLimitText, exceptionHandlingText, stepKeys[], documentsToCarryKeys[], source, lastVerified, verified: boolean }` |
| bank-codes.json | `{ prefix, bankName }[]` seeded with major active RBI scheduled banks. |
| merged-banks.json | `{ oldPrefix, oldBankName, mergedIntoBank, mergedIntoPrefix, source, lastVerified, verified: boolean }[]` |
| honorifics.json | `['shri', 'shree', 'sri', 'smt', 'shrimati', 'kum', 'mr', 'mrs', 'ms', 'miss', 'dr', 'late', 'adv', 'prof']` — NEVER include 'kumar', 'kumari', 'ben', 'bai', 'devi', 'lal', 'singh'. |
| name-aliases.json | `[{ canonical: 'mohammad', variants: ['mohd', 'md', 'muhammad', 'mohammed'] }]` |
| letters/*.md | Sample request templates with placeholders `{{fullName}}`, `{{accountLast4}}`, `{{currentValue}}`, `{{correctValue}}`, `{{branch}}`, `{{date}}`. Clearly titled 'Sample Request Letter'. |

## 5.4 Correction Cost & Verification Matrix (correction-costs.json)

| Doc | Cost Rank | Confirmed vs Unconfirmed Details | verified Flag |
|-----|-----------|----------------------------------|---------------|
| bank | 1 (Easiest) | Update at home branch with KYC proof. Exact form name varies by bank; provide Sample Correction Request Letter & Sample DBT Seeding Letter. | verified: false (show branch check note) |
| pan | 2 (Online) | Online correction via Protean (NSDL) / UTIITSL portal. Fee (~Rs. 110) and supporting document matrix must be confirmed on official portal. | verified: false (show official portal note) |
| aadhaar | 4 (Capped) | CONFIRMED on uidai.gov.in: Name max 2 times in lifetime; DOB max 1 time; Gender max 1 time. Demographic fee Rs. 75 (valid through Sep 2028; free if combined with biometric update). Exception path: If lifetime cap reached, resident must submit Gazette/Birth proof via UIDAI Regional Office / 1947 exception process. Channel rules (online vs Seva Kendra) depend on field. | Limits & Rs. 75 fee: verified: true. Channel specifics: verified: false |
| certificate | 5 (Hardest) | School/Board/University marksheet name or DOB change requires formal board application, fee, and often Gazette/affidavit. | verified: false |

## 5.5 Fixtures (Demo Mode - /src/fixtures)

### Scenario 1 — PM-Kisan Name Order Swap
- **Aadhaar:** `'Ramesh Kumar'` vs **Bank Passbook:** `'Kumar Ramesh'`
- **Goal:** `pm_kisan_payment`
- **Expected:** 1 High finding (TOKEN_REORDER), fix target = bank (Rank 1), preserving Aadhaar's 2-time lifetime name cap, plus R-DBT-1 seeding checklist

### Scenario 2 — Scholarship Patronymic Middle Name + DOB Swap
- **Aadhaar:** `'Rahul Suresh Patil'` (fatherOrSpouseName: `'Suresh Patil'`, DOB: `'03/05/2005'`)
- **School Certificate:** `'Rahul Patil'` (DOB: `'05/03/2005'`)
- **Goal:** `scholarship_application`
- **Expected:** PATRONYMIC_MIDDLE_OMISSION (Low) and R-DOB-1 Blocker with 'possible day/month swap' hint

### Scenario 3 — Bank KYC Invalid/Merged IFSC + Initials
- **Bank:** IFSC `'SBIN1000123'` (5th char '1' instead of '0'), Name `'R. Deshmukh'`
- **Aadhaar:** `'Ramesh Deshmukh'`
- **PAN:** `'Ramesh Deshmukh'`
- **Goal:** `bank_kyc`
- **Expected:** R-IFSC-1 Blocker and INITIAL_ABBREVIATION Medium finding
