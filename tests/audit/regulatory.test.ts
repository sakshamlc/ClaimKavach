import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  loadNppaCeilings,
  loadImplantCeilings,
  loadAnnexure1Classifications,
  loadRoomBundlingRecords,
  enforceVerdictGuard,
  normalizeItemName,
  checkRecordDateValidity,
  isValidIsoDate,
  RegulatoryLoadError,
  BaseRegulatoryRecord,
} from '../../src/lib/audit/regulatory';
import { LineItem, Verdict } from '../../src/lib/audit/types';
import { verifySourcesOnDisk } from '../../scripts/verify-sources';

import * as fs from 'fs';
import * as path from 'path';

import nppaSeedData from '../fixtures/regulatory/nppaCeilings.json';
import implantSeedData from '../fixtures/regulatory/implants.json';
import annexure1SeedData from '../fixtures/regulatory/annexure1.json';
import roomBundlingSeedData from '../fixtures/regulatory/roomBundling.json';

describe('Phase 2 Regulatory Loaders, Zod Validation & Integrity Guards', () => {
  describe('1. Seed Data Validation & Structure (Pure Loaders, No Manifest Read in Trust Zone)', () => {
    it('loads and validates synthetic NPPA ceilings seed data', () => {
      const records = loadNppaCeilings(nppaSeedData);
      expect(records.length).toBe(2);
      for (const rec of records) {
        expect(rec.verified).toBe(false); // Seed data MUST be verified: false
        expect(rec.sourceRef).toBe('TODO');
        expect(rec.sourceFile).toBe('nppa_drug_ceilings.pdf');
        expect(rec.sourceUrl).toBeTruthy();
        expect(rec.ceilingPaise).toBeGreaterThan(0);
        expect(rec.gstTreatment).toBe('EXCLUDED'); // NPPA drug ceilings notified exclusive of GST
        expect(rec.dosageForm).toBeTruthy();
        expect(rec.strength).toBeTruthy();
        expect(rec.priceUnit).toBeTruthy();
        expect(rec.validUntil).toBeNull();
        expect(rec.instrumentNumber).toBeNull();
        expect(rec.instrumentDate).toBeNull();
        expect(rec.normalizedName).toBe(normalizeItemName(rec.name));
        expect(rec.name).toMatch(/^DEMO Drug /);
      }
    });

    it('loads and validates synthetic Implant ceilings seed data with round fake prices and subtype', () => {
      const records = loadImplantCeilings(implantSeedData);
      expect(records.length).toBe(2);
      for (const rec of records) {
        expect(rec.verified).toBe(false);
        expect(rec.sourceRef).toBe('TODO');
        expect(rec.subtype).toBeTruthy();
        expect(rec.name).toMatch(/^DEMO Device /);
        expect([1000000, 2000000]).toContain(rec.ceilingPaise);
        expect(['EXCLUDED', 'INCLUDED', 'UNKNOWN']).toContain(rec.gstTreatment);
      }
    });

    it('loads and validates synthetic Annexure-I classifications with abstract taxonomy', () => {
      const records = loadAnnexure1Classifications(annexure1SeedData);
      expect(records.length).toBe(3);
      for (const rec of records) {
        expect(rec.verified).toBe(false);
        expect(['NON_PAYABLE', 'SUBSUMED', 'OPTIONAL', 'OTHER']).toContain(rec.treatment);
        expect(rec.listId).toBeTruthy();
        expect(rec.listName).toBeTruthy();
        expect(rec.sourceDocument).toBe('TODO');
        expect(rec.sourceFile).toBe('irdai_annexure_1.pdf');
        expect(rec.name).toMatch(/^DEMO Item /);
      }
    });

    it('loads and validates synthetic Room Bundling seed data', () => {
      const records = loadRoomBundlingRecords(roomBundlingSeedData);
      expect(records.length).toBe(2);
      for (const rec of records) {
        expect(rec.verified).toBe(false);
        expect(['room_rent', 'icu']).toContain(rec.bundledWith);
        expect(rec.description).toBeTruthy();
        expect(rec.name).toMatch(/^DEMO Bundled Service /);
      }
    });
  });

  describe('2. Date Validity & Bill Date / LineItem Date Precedence', () => {
    const sampleRecord: BaseRegulatoryRecord = {
      id: 'REC-01',
      name: 'DEMO Drug Alpha',
      normalizedName: 'demo drug alpha',
      source: 'Test Gazette',
      sourceFile: 'test.pdf',
      sourceUrl: 'https://example.gov.in',
      effectiveDate: '2024-04-01',
      validUntil: '2025-03-31',
      instrumentNumber: null,
      instrumentDate: null,
      gstTreatment: 'EXCLUDED',
      version: '1.0',
      verified: false,
      sourceRef: 'TODO',
    };

    it('rejects impossible and non-ISO dates via isValidIsoDate', () => {
      expect(isValidIsoDate('2024-02-29')).toBe(true);  // Leap year
      expect(isValidIsoDate('2023-02-29')).toBe(false); // Not a leap year!
      expect(isValidIsoDate('2024-02-31')).toBe(false); // Impossible February day
      expect(isValidIsoDate('2024-04-31')).toBe(false); // April has 30 days
      expect(isValidIsoDate('2024-13-01')).toBe(false); // Impossible month
      expect(isValidIsoDate('2024-00-10')).toBe(false);
      expect(isValidIsoDate('invalid-date')).toBe(false);
      expect(isValidIsoDate('')).toBe(false);
    });

    it('uses lineItem.date when present in priority over billDate', () => {
      // lineItem date in 2024 (valid), billDate in 2026 (expired)
      const check = checkRecordDateValidity(sampleRecord, '2024-06-15', '2026-01-01');
      expect(check.isValid).toBe(true);
    });

    it('falls back to billDate when lineItem.date is null or undefined', () => {
      const check = checkRecordDateValidity(sampleRecord, null, '2024-06-15');
      expect(check.isValid).toBe(true);
    });

    it('caps verdict at NEEDS_REVIEW when both lineItem.date and billDate are null', () => {
      const check = checkRecordDateValidity(sampleRecord, null, null);
      expect(check.isValid).toBe(false);
      expect(check.needsReviewReason).toContain('missing');
    });

    it('caps verdict at NEEDS_REVIEW when date is prior to effectiveDate', () => {
      const check = checkRecordDateValidity(sampleRecord, '2024-03-15', null);
      expect(check.isValid).toBe(false);
      expect(check.needsReviewReason).toContain('prior to regulatory effectiveDate');
    });

    it('caps verdict at NEEDS_REVIEW with exact revision note when date is after validUntil', () => {
      const check = checkRecordDateValidity(sampleRecord, null, '2025-04-10');
      expect(check.isValid).toBe(false);
      expect(check.needsReviewReason).toBe('ceiling may have been revised; check the current notification');
    });
  });

  describe('3. Loud Failure on Malformed or Missing Files', () => {
    it('throws RegulatoryLoadError on null or empty array', () => {
      expect(() => loadNppaCeilings(null)).toThrow(RegulatoryLoadError);
      expect(() => loadNppaCeilings([])).toThrow(RegulatoryLoadError);
      expect(() => loadImplantCeilings([])).toThrow(RegulatoryLoadError);
      expect(() => loadAnnexure1Classifications([])).toThrow(RegulatoryLoadError);
      expect(() => loadRoomBundlingRecords([])).toThrow(RegulatoryLoadError);
    });

    it('throws ZodError on malformed records missing mandatory provenance fields', () => {
      const malformedData = [
        {
          id: 'TEST-1',
          name: 'Missing fields',
        },
      ];
      expect(() => loadNppaCeilings(malformedData)).toThrow(ZodError);
    });

    it('throws ZodError on impossible calendar dates in regulatory records', () => {
      const invalidDateData = [
        {
          id: 'TEST-1',
          name: 'Invalid Date Item',
          normalizedName: 'invalid date item',
          ceilingPaise: 5000,
          unit: '1 Tablet',
          dosageForm: 'Tablet',
          strength: '100mg',
          priceUnit: 'per tablet',
          source: 'Test Source',
          sourceFile: 'test.pdf',
          sourceUrl: 'https://example.gov.in',
          effectiveDate: '2024-02-31', // Impossible date!
          validUntil: null,
          instrumentNumber: null,
          instrumentDate: null,
          gstTreatment: 'EXCLUDED',
          version: '1.0',
          verified: false,
          sourceRef: 'Row 1',
        },
      ];
      expect(() => loadNppaCeilings(invalidDateData)).toThrow(ZodError);
    });
  });

  describe('4. Source Verification on Disk & Demotion (scripts/verify-sources.ts)', () => {
    it('runs verifySourcesOnDisk and confirms no record claims verified: true without matching file on disk', () => {
      const report = verifySourcesOnDisk(process.cwd(), { autoDemote: false });
      expect(report.success).toBe(true);
      expect(report.errors.length).toBe(0);
      expect(report.recordsChecked).toBeGreaterThan(0);
    });
  });

  describe('5. Engine Verdict Guard: Capping Unverified Findings', () => {
    it('caps CONFIRMED_OVERCHARGE at LIKELY_ISSUE when record is unverified', () => {
      expect(enforceVerdictGuard('CONFIRMED_OVERCHARGE', false)).toBe('LIKELY_ISSUE');
      expect(enforceVerdictGuard('CONFIRMED_OVERCHARGE', true)).toBe('CONFIRMED_OVERCHARGE');
      expect(enforceVerdictGuard('LIKELY_ISSUE', false)).toBe('LIKELY_ISSUE');
      expect(enforceVerdictGuard('NEEDS_REVIEW', false)).toBe('NEEDS_REVIEW');
    });
  });

  describe('6. LineItem Null Handling Contract (Money, Quantity, Dates)', () => {
    it('returns NOT_CHECKED when quantity, money, or date is null', () => {
      const itemWithNullQty: LineItem = {
        id: 'NULL-QTY-01',
        description: 'Uncounted Medicine',
        category: 'pharmacy',
        quantity: null,
        unitRatePaise: 5000,
        totalBilledPaise: null,
        date: null,
      };

      function auditItem(item: LineItem): Verdict {
        if (
          item.quantity === null ||
          item.unitRatePaise === null ||
          item.totalBilledPaise === null ||
          item.date === null
        ) {
          return 'NOT_CHECKED';
        }
        return 'LIKELY_ISSUE';
      }

      expect(auditItem(itemWithNullQty)).toBe('NOT_CHECKED');
    });
  });

  describe('7. Production Regulatory Invariants', () => {
    it('ensures src/data/regulatory/ contains no records with id starting with "DEMO"', () => {
      const regDir = path.resolve(__dirname, '../../src/data/regulatory');
      const files = fs.readdirSync(regDir).filter((f) => f.endsWith('.json'));
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const filePath = path.join(regDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(Array.isArray(data)).toBe(true);
        for (const record of data) {
          expect(record.id.startsWith('DEMO')).toBe(false);
        }
      }
    });

    it('validates official ingested NPPA ceilings and Implants schema conformance', () => {
      const nppaOfficial = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../src/data/regulatory/nppaCeilings.json'), 'utf8')
      );
      const implantOfficial = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../src/data/regulatory/implants.json'), 'utf8')
      );

      const loadedNppa = loadNppaCeilings(nppaOfficial);
      const loadedImplants = loadImplantCeilings(implantOfficial);

      expect(loadedNppa.length).toBe(43);
      expect(loadedImplants.length).toBe(2);

      for (const rec of loadedNppa) {
        expect(rec.verified).toBe(false);
        expect(rec.sourceFile).toMatch(/Drugceiling1\.pdf|DrugCeiling2\.pdf/);
      }

      for (const rec of loadedImplants) {
        expect(rec.verified).toBe(false);
        expect(rec.sourceFile).toBe('Drugceiling3.pdf');
      }
    });
  });
});
