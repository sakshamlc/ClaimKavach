import { describe, it, expect } from 'vitest';
import { normalizeName, normalizeIndianPhonetics, jaroWinkler } from '../src/lib/rules/normalize';
import { compareNames } from '../src/lib/rules/name';
import { parseDate, compareDob } from '../src/lib/rules/dob';
import { validatePan, checkPanSurnameMatch } from '../src/lib/rules/pan';
import { validateIfsc } from '../src/lib/rules/ifsc';
import { compareGender } from '../src/lib/rules/gender';
import { selectFixTarget, buildFixPlan } from '../src/lib/rules/fixplan';
import { analyze } from '../src/lib/rules/analyze';
import { AnalysisInput } from '../src/lib/rules/types';

import scenario1Fixture from '../src/fixtures/scenario-1.json';
import scenario2Fixture from '../src/fixtures/scenario-2.json';
import scenario3Fixture from '../src/fixtures/scenario-3.json';

describe('1. Name Normalization & Honorific Guardrail', () => {
  it('strips only salutations (shri, smt, dr, etc.) but NEVER kumar, kumari, singh, bai, ben, devi', () => {
    expect(normalizeName('Shri Ramesh Kumar')).toBe('ramesh kumar');
    expect(normalizeName('Dr. Sunita Kumari')).toBe('sunita kumari');
    expect(normalizeName('Late Harbhajan Singh')).toBe('harbhajan singh');
    expect(normalizeName('Smt. Gita Devi')).toBe('gita devi');
    expect(normalizeName('Ramesh Kumar')).toBe('ramesh kumar');
    expect(normalizeName('Kumar Ramesh')).toBe('kumar ramesh');
  });

  it('normalizes name aliases (mohd, md, muhammad -> mohammad)', () => {
    expect(normalizeName('Mohd Aslam')).toBe('mohammad aslam');
    expect(normalizeName('Md. Aslam')).toBe('mohammad aslam');
    expect(normalizeName('Muhammad Aslam')).toBe('mohammad aslam');
    expect(normalizeName('Mohammad Aslam')).toBe('mohammad aslam');
  });
});

describe('2. Deterministic Name Comparison (Document 2 §2.10 & Known Corrections)', () => {
  it('Case 1: "Ramesh Kumar" vs "Kumar Ramesh" -> TOKEN_REORDER (Kumar NOT stripped)', () => {
    const res = compareNames('Ramesh Kumar', 'Kumar Ramesh');
    expect(res.verdict).toBe('TOKEN_REORDER');
    expect(res.severity).toBe('medium'); // standard goal default
  });

  it('Case 2: "R. Kumar" vs "Ramesh Kumar" -> INITIAL_ABBREVIATION', () => {
    const res = compareNames('R. Kumar', 'Ramesh Kumar');
    expect(res.verdict).toBe('INITIAL_ABBREVIATION');
    expect(res.severity).toBe('medium');
  });

  it('Case 3: "Mohd Aslam" vs "Mohammad Aslam" -> NORMALIZED_EXACT via alias', () => {
    const res = compareNames('Mohd Aslam', 'Mohammad Aslam');
    expect(res.verdict).toBe('NORMALIZED_EXACT');
  });

  it('Case 4: "Sunitha Patil" vs "Sunita Patil" -> TRANSLITERATION_VARIANT', () => {
    const res = compareNames('Sunitha Patil', 'Sunita Patil');
    expect(res.verdict).toBe('TRANSLITERATION_VARIANT');
    expect(res.severity).toBe('medium');
  });

  it('Case 4b: "Ramesh Chaudhari" vs "Ramesh Choudhary" -> TRANSLITERATION_VARIANT', () => {
    const res = compareNames('Ramesh Chaudhari', 'Ramesh Choudhary');
    expect(res.verdict).toBe('TRANSLITERATION_VARIANT');
    expect(res.severity).toBe('medium');
  });

  it('Case 5: "Sunita Patil" vs "Sunita Ramesh Patil" (with father="Ramesh Patil") -> PATRONYMIC_MIDDLE_OMISSION', () => {
    const res = compareNames('Sunita Patil', 'Sunita Ramesh Patil', 'standard', {
      fatherOrSpouseNameB: 'Ramesh Patil',
    });
    expect(res.verdict).toBe('PATRONYMIC_MIDDLE_OMISSION');
    expect(res.severity).toBe('low'); // standard goal = low
  });

  it('Case 6: "Sunita Patil" vs "Sunita Ramesh Patil" (without fatherOrSpouseName) -> MISSING_TOKEN', () => {
    const res = compareNames('Sunita Patil', 'Sunita Ramesh Patil');
    expect(res.verdict).toBe('MISSING_TOKEN');
    expect(res.severity).toBe('medium');
  });

  it('Case 6b: "Anil Kumar Sharma" vs "Anil Sharma" (middle token missing without father match) -> MISSING_TOKEN', () => {
    const res = compareNames('Anil Kumar Sharma', 'Anil Sharma');
    expect(res.verdict).toBe('MISSING_TOKEN');
    expect(res.severity).toBe('medium');
  });

  it('Case 6c: "Priya Singh Rathore" vs "Priya Rathore" -> MISSING_TOKEN', () => {
    const res = compareNames('Priya Singh Rathore', 'Priya Rathore');
    expect(res.verdict).toBe('MISSING_TOKEN');
    expect(res.severity).toBe('medium');
  });

  it('Case 7: "Amit Shah" vs "Rohan Mehta" -> MISMATCH', () => {
    const res = compareNames('Amit Shah', 'Rohan Mehta');
    expect(res.verdict).toBe('MISMATCH');
    expect(res.severity).toBe('blocker');
  });

  it('Known Correction 2: "Sunitha Ramesh Patil" vs "Sunita Patil" with father="Ramesh Patil" -> PATRONYMIC_MIDDLE_OMISSION (phonetic first)', () => {
    const res = compareNames('Sunitha Ramesh Patil', 'Sunita Patil', 'standard', {
      fatherOrSpouseNameA: 'Ramesh Patil',
    });
    expect(res.verdict).toBe('PATRONYMIC_MIDDLE_OMISSION');
    expect(res.severity).toBe('low');
  });

  it('Known Correction 2: "Sunitha Ramesh Patil" vs "Sunita Patil" without fatherOrSpouseName -> MISSING_TOKEN', () => {
    const res = compareNames('Sunitha Ramesh Patil', 'Sunita Patil');
    // First token matches via phonetics, Last matches, middle token is missing from shorter
    expect(res.verdict).toBe('MISSING_TOKEN');
    expect(res.severity).toBe('medium');
  });
});

describe('3. DOB Rules (R-DOB-1 & R-DOB-2)', () => {
  it('Case 8: DOB "05/03/2001" vs "03/05/2001" -> Blocker with day/month swap hint', () => {
    const res = compareDob('05/03/2001', '03/05/2001');
    expect(res.matches).toBe(false);
    expect(res.severity).toBe('blocker');
    expect(res.isSwapHint).toBe(true);
    expect(res.explanationKey).toBe('dob_possible_swap');
  });

  it('DOB exact match "15/08/1956" vs "15-08-1956"', () => {
    const res = compareDob('15/08/1956', '15-08-1956');
    expect(res.matches).toBe(true);
  });

  it('DOB month text "05 Mar 2001" vs "2001-03-05"', () => {
    const res = compareDob('05 Mar 2001', '2001-03-05');
    expect(res.matches).toBe(true);
  });

  it('R-DOB-2: Year-only match in strict mode returns medium, in standard returns info', () => {
    const strictRes = compareDob('1982', '05/03/1982', 'strict');
    expect(strictRes.matches).toBe(true);
    expect(strictRes.severity).toBe('medium');

    const stdRes = compareDob('1982', '05/03/1982', 'standard');
    expect(stdRes.matches).toBe(true);
    expect(stdRes.severity).toBe('info');
  });

  it('R-DOB-2: Year mismatch returns blocker', () => {
    const res = compareDob('1982', '05/03/1985');
    expect(res.matches).toBe(false);
    expect(res.severity).toBe('blocker');
  });
});

describe('4. PAN Rules (R-PAN-1, R-PAN-2, R-PAN-3)', () => {
  it('Case 9: PAN 5th letter check passes when PAN name is "Kumar Ramesh" and surname is "Kumar"', () => {
    // PAN 5th char 'K'
    const res = checkPanSurnameMatch('ABCDE1234F', 'Kumar Ramesh');
    expect(res.matches).toBe(false); // 'E' is 5th char

    const resK = checkPanSurnameMatch('ABCDK1234F', 'Kumar Ramesh');
    expect(resK.matches).toBe(true); // 'K' is 5th char
  });

  it('Case 10a: Invalid PAN format -> Blocker', () => {
    expect(validatePan('INVALID_PAN').valid).toBe(false);
    expect(validatePan('INVALID_PAN').severity).toBe('blocker');
    expect(validatePan('ABCDE12345').valid).toBe(false); // 5 digits instead of 4
  });

  it('Case 10b: Valid Individual PAN with holderType "P"', () => {
    const res = validatePan('ABCDE1234F', true);
    expect(res.valid).toBe(false); // 4th char is 'D', not 'P'
    expect(res.severity).toBe('high');

    const validP = validatePan('ABCPK1234F', true);
    expect(validP.valid).toBe(true);
    expect(validP.holderType).toBe('P');
  });
});

describe('5. IFSC & Merged Banks Rules (R-IFSC-1 & R-IFSC-2)', () => {
  it('Case 10c: Invalid IFSC (5th char not 0) -> Blocker', () => {
    // 5th char is '1' instead of '0'
    const res1 = validateIfsc('SBIN1000123');
    expect(res1.valid).toBe(false);
    expect(res1.severity).toBe('blocker');
    expect(res1.explanationKey).toBe('ifsc_invalid_format');

    // 5th char is letter 'X' instead of '0'
    const res2 = validateIfsc('HDFCX001234');
    expect(res2.valid).toBe(false);
    expect(res2.severity).toBe('blocker');
    expect(res2.explanationKey).toBe('ifsc_invalid_format');

    // 5th char is '9' instead of '0'
    const res3 = validateIfsc('ICIC9001234');
    expect(res3.valid).toBe(false);
    expect(res3.severity).toBe('blocker');
    expect(res3.explanationKey).toBe('ifsc_invalid_format');
  });

  it('Oriental Bank of Commerce uses ORBC prefix merged into PUNB', () => {
    const res = validateIfsc('ORBC0001234');
    expect(res.valid).toBe(true);
    expect(res.severity).toBe('high');
    expect(res.explanationKey).toBe('ifsc_merged_bank');
    expect(res.mergedBankInfo?.oldBankName).toBe('Oriental Bank of Commerce');
    expect(res.mergedBankInfo?.mergedIntoBank).toBe('Punjab National Bank');
  });

  it('Case 10d: Valid active IFSC', () => {
    const res = validateIfsc('SBIN0001234');
    expect(res.valid).toBe(true);
    expect(res.severity).toBe('low');
  });

  it('Case 10e: Merged bank prefix SYNB (Syndicate Bank) -> High warning', () => {
    const res = validateIfsc('SYNB0001234');
    expect(res.valid).toBe(true);
    expect(res.severity).toBe('high');
    expect(res.explanationKey).toBe('ifsc_merged_bank');
    expect(res.mergedBankInfo?.oldBankName).toBe('Syndicate Bank');
  });

  it('Known Correction 1: Dena Bank uses BKDN prefix (NOT DENA)', () => {
    const resBkdn = validateIfsc('BKDN0001234');
    expect(resBkdn.valid).toBe(true);
    expect(resBkdn.severity).toBe('high');
    expect(resBkdn.mergedBankInfo?.oldBankName).toBe('Dena Bank');

    // DENA is NOT in merged-banks.json
    const resDena = validateIfsc('DENA0001234');
    expect(resDena.explanationKey).toBe('ifsc_unknown_bank');
  });

  it('Known Correction 1: Andhra Bank (ANDB) included in merged banks', () => {
    const res = validateIfsc('ANDB0001234');
    expect(res.valid).toBe(true);
    expect(res.severity).toBe('high');
    expect(res.mergedBankInfo?.oldBankName).toBe('Andhra Bank');
    expect(res.mergedBankInfo?.mergedIntoBank).toBe('Union Bank of India');
  });

  it('Unknown bank prefix -> Low warning', () => {
    const res = validateIfsc('ZZZZ0001234');
    expect(res.valid).toBe(true);
    expect(res.severity).toBe('low');
    expect(res.explanationKey).toBe('ifsc_unknown_bank');
  });
});

describe('6. Status Banner Logic & Fix Target Selection', () => {
  it('Case 11: Status banner outcomes (blocked, fix_needed, ready_with_notes, ready)', () => {
    // Scenario 1: High severity finding -> fix_needed
    const s1Report = analyze(scenario1Fixture as unknown as AnalysisInput);
    expect(s1Report.status).toBe('fix_needed');

    // Scenario 2: Blocker DOB swap -> blocked
    const s2Report = analyze(scenario2Fixture as unknown as AnalysisInput);
    expect(s2Report.status).toBe('blocked');

    // Scenario 3: Blocker IFSC -> blocked
    const s3Report = analyze(scenario3Fixture as unknown as AnalysisInput);
    expect(s3Report.status).toBe('blocked');
  });

  it('Case 12: Fix target selection prioritizes cheaper document (bank=1, pan=2, aadhaar=4, certificate=5)', () => {
    // Between Aadhaar (4) and Bank (1), target is bank
    expect(selectFixTarget('aadhaar', 'bank')).toBe('bank');

    // Between Aadhaar (4) and PAN (2), target is pan
    expect(selectFixTarget('aadhaar', 'pan')).toBe('pan');

    // Between Aadhaar (4) and Certificate (5), target is aadhaar
    expect(selectFixTarget('aadhaar', 'certificate')).toBe('aadhaar');

    // With user toggle: if user marks Bank as correct, target flips to Aadhaar
    expect(selectFixTarget('aadhaar', 'bank', undefined, 'bank')).toBe('aadhaar');
    // If user marks Aadhaar as correct, target is Bank
    expect(selectFixTarget('aadhaar', 'bank', undefined, 'aadhaar')).toBe('bank');
  });
});

describe('7. End-to-End Analysis with the 3 Demo Fixtures', () => {
  it('Scenario 1: PM-Kisan Name Order Swap', () => {
    const report = analyze(scenario1Fixture as unknown as AnalysisInput);
    expect(report.status).toBe('fix_needed');

    const nameFinding = report.findings.find((f) => f.ruleId === 'R-NAME-1');
    expect(nameFinding).toBeDefined();
    expect(nameFinding?.verdict).toBe('TOKEN_REORDER');
    expect(nameFinding?.severity).toBe('high');
    expect(nameFinding?.fixTarget).toBe('bank');

    // Seeding checklist finding present
    const dbtFinding = report.findings.find((f) => f.ruleId === 'R-DBT-1');
    expect(dbtFinding).toBeDefined();

    // Ranked fix plan starts with bank (effortRank 1)
    expect(report.fixPlan.length).toBeGreaterThan(0);
    expect(report.fixPlan[0].targetDoc).toBe('bank');
    expect(report.fixPlan[0].effortRank).toBe(1);
    expect(report.fixPlan[0].lifetimeLimitNoteKey).toBeDefined(); // Aadhaar involved note
  });

  it('Scenario 2: Scholarship Patronymic Middle Name + DOB Swap', () => {
    const report = analyze(scenario2Fixture as unknown as AnalysisInput);
    expect(report.status).toBe('blocked');

    // Patronymic middle omission finding
    const nameFinding = report.findings.find((f) => f.ruleId === 'R-NAME-2');
    expect(nameFinding).toBeDefined();
    expect(nameFinding?.verdict).toBe('PATRONYMIC_MIDDLE_OMISSION');
    expect(nameFinding?.severity).toBe('low');

    // DOB swap finding
    const dobFinding = report.findings.find((f) => f.ruleId === 'R-DOB-1');
    expect(dobFinding).toBeDefined();
    expect(dobFinding?.severity).toBe('blocker');
    expect(dobFinding?.titleKey).toBe('finding_dob_swap_title');
  });

  it('Scenario 3: Bank KYC Invalid IFSC + Initial Abbreviation', () => {
    const report = analyze(scenario3Fixture as unknown as AnalysisInput);
    expect(report.status).toBe('blocked');

    // Invalid IFSC blocker
    const ifscFinding = report.findings.find((f) => f.ruleId === 'R-IFSC-1');
    expect(ifscFinding).toBeDefined();
    expect(ifscFinding?.severity).toBe('blocker');

    // Initials finding between bank and aadhaar
    const nameFinding = report.findings.find((f) => f.ruleId === 'R-NAME-1');
    expect(nameFinding).toBeDefined();
    expect(nameFinding?.verdict).toBe('INITIAL_ABBREVIATION');
    expect(nameFinding?.severity).toBe('medium');
  });
});
