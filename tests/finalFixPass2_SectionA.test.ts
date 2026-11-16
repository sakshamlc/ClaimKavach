import { describe, it, expect } from 'vitest';
import { en } from '../src/lib/i18n/en';
import { hi } from '../src/lib/i18n/hi';
import { mr } from '../src/lib/i18n/mr';
import { analyze } from '../src/lib/rules/analyze';

describe('Final Fix Pass 2 - Section A: Raw Keys and Missing Strings', () => {
  it('1. has step_bank_dbt_seeding_request defined in EN, HI, and MR', () => {
    expect((en as Record<string, string>)['step_bank_dbt_seeding_request']).toBeDefined();
    expect((hi as Record<string, string>)['step_bank_dbt_seeding_request']).toBeDefined();
    expect((mr as Record<string, string>)['step_bank_dbt_seeding_request']).toBeDefined();

    expect((en as Record<string, string>)['step_bank_dbt_seeding_request'].length).toBeGreaterThan(10);
    expect((hi as Record<string, string>)['step_bank_dbt_seeding_request'].length).toBeGreaterThan(10);
    expect((mr as Record<string, string>)['step_bank_dbt_seeding_request'].length).toBeGreaterThan(10);
  });

  it('2. ensures EN, HI, and MR have identical keys (no missing translation keys)', () => {
    const enKeys = Object.keys(en).sort();
    const hiKeys = Object.keys(hi).sort();
    const mrKeys = Object.keys(mr).sort();

    const missingInHi = enKeys.filter((k) => !hiKeys.includes(k));
    const missingInMr = enKeys.filter((k) => !mrKeys.includes(k));
    const extraInHi = hiKeys.filter((k) => !enKeys.includes(k));
    const extraInMr = mrKeys.filter((k) => !enKeys.includes(k));

    expect(missingInHi, `Missing keys in hi: ${missingInHi.join(', ')}`).toEqual([]);
    expect(missingInMr, `Missing keys in mr: ${missingInMr.join(', ')}`).toEqual([]);
    expect(extraInHi, `Extra keys in hi: ${extraInHi.join(', ')}`).toEqual([]);
    expect(extraInMr, `Extra keys in mr: ${extraInMr.join(', ')}`).toEqual([]);
  });

  it('3. ensures no raw keys (step_*, field_*, dbt_status, action, etc.) appear in generated summary or fix plans across all goals', () => {
    const scenarios = [
      {
        goal: 'pm_kisan',
        docs: {
          aadhaar: { fullName: 'Ramesh Kumar', aadhaarRedacted: 'XXXX XXXX 1234' },
          bank: { accountHolderName: 'Kumar Ramesh', accountNumberLast4: '1234', ifsc: 'SBIN0001234' },
        },
      },
      {
        goal: 'scholarship',
        docs: {
          aadhaar: { fullName: 'Rahul Suresh Patil', dob: '03/05/2005' },
          certificate: { certificateName: 'Rahul Patil', dob: '05/03/2005' },
          bank: { accountHolderName: 'Rahul Suresh Patil' },
        },
      },
      {
        goal: 'bank_kyc',
        docs: {
          aadhaar: { fullName: 'Ramesh Deshmukh' },
          pan: { fullName: 'Ramesh Deshmukh' },
          bank: { accountHolderName: 'R. Deshmukh', ifsc: 'SBIN1000123' },
        },
      },
    ];

    for (const scenario of scenarios) {
      const result = analyze({
        goalId: scenario.goal as any,
        documents: Object.fromEntries(
          Object.entries(scenario.docs).map(([docType, fields]) => [
            docType,
            {
              docType: docType as any,
              detectedDocType: docType as any,
              fields: Object.fromEntries(
                Object.entries(fields).map(([k, v]) => [k, { value: v, confidence: 0.95 }])
              ),
              overallConfidence: 0.95,
            },
          ])
        ),
        confirmedFields: [],
        correctVersionChoice: {},
      });
      const plan = result.fixPlan;

      for (const [lang, dict] of Object.entries({ en, hi, mr })) {
        const d = dict as Record<string, string>;

        // Check finding titles & descriptions
        for (const finding of result.findings) {
          const title = d[finding.titleKey] || finding.titleKey;
          const desc = d[finding.explanationKey] || finding.explanationKey;
          expect(title, `Raw finding title key in ${lang}`).not.toMatch(/^finding_/);
          expect(desc, `Raw finding desc key in ${lang}`).not.toMatch(/^finding_/);
        }

        // Check fix plan
        for (const step of plan) {
          const targetDocText = d[`doc_${step.targetDoc}`] || step.targetDoc;
          expect(targetDocText).not.toMatch(/^(step_|field_|dbt_|action_|doc_)/);

          const whereText = d[step.whereKey] || step.whereKey;
          expect(whereText).not.toMatch(/^where_/);

          for (const stepKey of step.stepKeys) {
            const stepText = d[stepKey] || stepKey;
            expect(stepText).not.toMatch(/^step_/);
            expect(d[stepKey], `Missing translation for ${stepKey} in ${lang}`).toBeDefined();
          }

          for (const carryKey of step.documentsToCarryKeys || []) {
            const carryText = d[carryKey] || carryKey;
            expect(carryText).not.toMatch(/^carry_/);
            expect(d[carryKey], `Missing translation for ${carryKey} in ${lang}`).toBeDefined();
          }
        }
      }
    }
  });

  it('4. ensures HI and MR strings are translated (not identical to EN except for proper nouns, acronyms, and examples)', () => {
    const allowedIdentical = new Set([
      'appName', // PechanSetu
      'datePlaceholder', // DD/MM/YYYY
      'hint_expected_ifsc', // Contains example code SBIN0001234 but sentence translated
      'hint_expected_pan', // Example code
      'hint_expected_pan_individual',
      'hint_expected_acc',
    ]);

    const untranslatedHi: string[] = [];
    const untranslatedMr: string[] = [];

    const enDict = en as Record<string, string>;
    const hiDict = hi as Record<string, string>;
    const mrDict = mr as Record<string, string>;

    for (const key of Object.keys(enDict)) {
      if (allowedIdentical.has(key)) continue;

      const enVal = enDict[key]?.trim();
      const hiVal = hiDict[key]?.trim();
      const mrVal = mrDict[key]?.trim();

      // If English value has letters and is longer than 3 chars
      if (enVal && enVal.length > 3 && /[a-zA-Z]/.test(enVal)) {
        if (hiVal === enVal) {
          untranslatedHi.push(`${key}: "${enVal}"`);
        }
        if (mrVal === enVal) {
          untranslatedMr.push(`${key}: "${enVal}"`);
        }
      }
    }

    expect(untranslatedHi, `Untranslated keys in HI: ${untranslatedHi.join('; ')}`).toEqual([]);
    expect(untranslatedMr, `Untranslated keys in MR: ${untranslatedMr.join('; ')}`).toEqual([]);
  });
});
