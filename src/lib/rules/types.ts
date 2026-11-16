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
  action?: string;
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

export interface GoalConfig {
  id: GoalId;
  labelKey: string;
  descKey: string;
  required: DocType[];
  nameStrictness: 'strict' | 'standard';
  authoritativeDoc: DocType;
  checks: string[];
  source: string;
  lastVerified: string;
  verified: boolean;
}

export interface CorrectionCostEntry {
  doc: DocType;
  cost: number;
  effortRank: number;
  effortLabelKey: string;
  whereKey: string;
  feeText: string;
  lifetimeLimitText: string | null;
  exceptionHandlingText: string | null;
  stepKeys: string[];
  documentsToCarryKeys: string[];
  source: string;
  lastVerified: string;
  verified: boolean;
}

export interface BankCodeEntry {
  prefix: string;
  bankName: string;
}

export interface MergedBankEntry {
  oldPrefix: string;
  oldBankName: string;
  mergedIntoBank: string;
  mergedIntoPrefix: string;
  source: string;
  lastVerified: string;
  verified: boolean;
}
