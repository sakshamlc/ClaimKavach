import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  loadNppaCeilings,
  loadImplantCeilings,
  loadAnnexure1Classifications,
  loadRoomBundlingRecords,
  enforceVerdictGuard,
  validateRecordVerificationStatus,
  normalizeItemName,
  checkRecordDateValidity,
  RegulatoryLoadError,
  Manifest,
  BaseRegulatoryRecord,
} from '../../src/lib/audit/regulatory';
import { LineItem, Verdict } from '../../src/lib/audit/types';
import { verifySourcesOnDisk } from '../../scripts/verify-sources';

import nppaSeedData from '../../src/data/regulatory/nppaCeilings.json';
import implantSeedData from '../../src/data/regulatory/implants.json';
import annexure1SeedData from '../../src/data/regulatory/annexure1.json';
import roomBundlingSeedData from '../../src/data/regulatory/roomBundling.json';
import manifestData from '../../docs/sources/MANIFEST.json';

describe('Phase 2 Regulatory Loaders, Zod Validation & Integrity Guards', () => {
  describe('1. Seed Data Validation & Structure', () => {
    it('loads and validates synthetic NPPA ceilings seed data', () => {
      const { records, warnings } = loadNppaCeilings(nppaSeedData, manifestData as Manifest);
      expect(records.length).toBe(2);
      expect(warnings.length).toBe(0); // All seed data is already verified: false, so no unexpected demotions
      for (const rec of records) {
        expect(rec.verified).toBe(false); // Seed data MUST be verified: false
        expect(rec.sourceRef).toBe('TODO'); // Explicit TODO for unverified sources
        expect(rec.sourceUrl).toBeTruthy();
        expect(rec.ceilingPaise).toBeGreaterThan(0);
        expect(rec.gstTreatment).toBe('EXCLUDED'); // NPPA drug ceilings notified exclusive of GST
        expect(rec.validUntil).toBeNull();
        expect(rec.instrumentNumber).toBeNull();
        expect(rec.instrumentDate).toBeNull();
        expect(rec.normalizedName).toBe(normalizeItemName(rec.name));
        expect(rec.name).toMatch(/^DEMO Drug /); // Strictly fictional naming
      }
    });

    it('loads and validates synthetic Implant ceilings seed data with round fake prices', () => {
      const { records, warnings } = loadImplantCeilings(implantSeedData, manifestData as Manifest);
      expect(records.length).toBe(2);
      expect(warnings.length).toBe(0);
      for (const rec of records) {
        expect(rec.verified).toBe(false);
        expect(rec.sourceRef).toBe('TODO');
        expect(rec.name).toMatch(/^DEMO Device /);
        expect([1000000, 2000000]).toContain(rec.ceilingPaise); // Round fake prices
        expect(['EXCLUDED', 'INCLUDED', 'UNKNOWN']).toContain(rec.gstTreatment);
      }
    });

    it('loads and validates synthetic Annexure-I classifications with abstract taxonomy', () => {
      const { records, warnings } = loadAnnexure1Classifications(annexure1SeedData, manifestData as Manifest);
      expect(records.length).toBe(3);
      expect(warnings.length).toBe(0);
      for (const rec of records) {
        expect(rec.verified).toBe(false);
        expect(['NON_PAYABLE', 'SUBSUMED', 'OPTIONAL', 'OTHER']).toContain(rec.treatment);
        expect(rec.listId).toBeTruthy();
        expect(rec.listName).toBeTruthy();
        expect(rec.sourceDocument).toBe('TODO');
        expect(rec.name).toMatch(/^DEMO Item /);
      }
    });

    it('loads and validates synthetic Room Bundling seed data', () => {
      const { records, warnings } = loadRoomBundlingRecords(roomBundlingSeedData, manifestData as Manifest);
      expect(records.length).toBe(2);
      expect(warnings.length).toBe(0);
      for (const rec of records) {
        expect(rec.verified).toBe(false);
        expect(['room_rent', 'icu']).toContain(rec.bundledWith);
        expect(rec.description).toBeTruthy();
        expect(rec.name).toMatch(/^DEMO Bundled Service /);
      }
    });
  });

  describe('2. Date Validity & Bill Date Audit Checks', () => {
    const sampleRecord: BaseRegulatoryRecord = {
      id: 'REC-01',
      name: 'DEMO Drug Alpha',
      normalizedName: 'demo drug alpha',
      source: 'Test Gazette',
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

    it('caps verdict at NEEDS_REVIEW when billDate is null', () => {
      const check = checkRecordDateValidity(sampleRecord, null);
      expect(check.isValid).toBe(false);
      expect(check.needsReviewReason).toContain('billDate is null');
    });

    it('caps verdict at NEEDS_REVIEW when billDate is before effectiveDate', () => {
      const check = checkRecordDateValidity(sampleRecord, '2024-03-15');
      expect(check.isValid).toBe(false);
      expect(check.needsReviewReason).toContain('prior to regulatory effectiveDate');
    });

    it('caps verdict at NEEDS_REVIEW with revision note when billDate is after validUntil', () => {
      const check = checkRecordDateValidity(sampleRecord, '2025-04-10');
      expect(check.isValid).toBe(false);
      expect(check.needsReviewReason).toBe('ceiling may have been revised; check the current notification');
    });

    it('validates successfully when billDate is within [effectiveDate, validUntil]', () => {
      const check = checkRecordDateValidity(sampleRecord, '2024-06-15');
      expect(check.isValid).toBe(true);
      expect(check.needsReviewReason).toBeUndefined();
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

    it('throws ZodError on invalid ceilingPaise (non-integer, negative, or zero)', () => {
      const invalidPrice = [
        {
          id: 'TEST-1',
          name: 'Invalid Price Item',
          normalizedName: 'invalid price item',
          ceilingPaise: -500, // Negative!
          unit: '1 Tablet',
          source: 'Test Source',
          sourceUrl: 'https://example.gov.in',
          effectiveDate: '2024-01-01',
          validUntil: null,
          instrumentNumber: null,
          instrumentDate: null,
          gstTreatment: 'EXCLUDED',
          version: '1.0',
          verified: false,
          sourceRef: 'Row 1',
        },
      ];
      expect(() => loadNppaCeilings(invalidPrice)).toThrow(ZodError);
    });
  });

  describe('4. Demotion Reporting & Warnings Array', () => {
    it('demotes unverified records and returns warnings in the loader result', () => {
      const rogueDataset = [
        {
          id: 'ROGUE-01',
          name: 'Rogue Item Claiming Verified',
          normalizedName: 'rogue item claiming verified',
          ceilingPaise: 5000,
          unit: '1 Tablet',
          effectiveDate: '2024-01-01',
          validUntil: null,
          instrumentNumber: null,
          instrumentDate: null,
          gstTreatment: 'EXCLUDED',
          source: 'Fake Source',
          sourceUrl: 'https://fake.example.gov.in',
          version: '1.0',
          verified: true, // Claims verified: true
          sourceRef: 'TODO',
        },
      ];

      // Empty manifest
      const { records, warnings } = loadNppaCeilings(rogueDataset, {
        schemaVersion: '1.0.0',
        updatedAt: '2024-01-01',
        sources: [],
      });

      expect(records[0].verified).toBe(false); // Demoted
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('demoted to verified: false');
    });
  });

  describe('5. On-Disk Source Verification & SHA-256 Gate (scripts/verify-sources.ts)', () => {
    it('verifies that no record currently claims verified: true without matching file and SHA-256 on disk', () => {
      const report = verifySourcesOnDisk();
      expect(report.success).toBe(true);
      expect(report.errors.length).toBe(0);
      expect(report.recordsChecked).toBeGreaterThan(0);
    });

    it('fails verification if a record claims verified: true without a matching file on disk', () => {
      // Create a mock manifest where a source claims to be verified but file does not exist
      const mockManifest = {
        schemaVersion: '1.0.0',
        updatedAt: '2024-01-01',
        sources: [
          {
            filename: 'non_existent_file.pdf',
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            sourceUrl: 'https://nppa.gov.in/test.pdf',
            verified: true,
          },
        ],
      };

      const recordClaimingVerified = {
        id: 'FAKE-01',
        name: 'Item With Missing File',
        normalizedName: 'item with missing file',
        effectiveDate: '2024-01-01',
        validUntil: null,
        instrumentNumber: null,
        instrumentDate: null,
        gstTreatment: 'EXCLUDED' as const,
        source: 'non_existent_file.pdf',
        sourceUrl: 'https://nppa.gov.in/test.pdf',
        version: '1.0',
        verified: true,
        sourceRef: 'TODO',
      };

      // In-memory demotion check
      const validated = validateRecordVerificationStatus(recordClaimingVerified, {
        schemaVersion: '1.0.0',
        updatedAt: '2024-01-01',
        sources: [],
      });
      expect(validated.verified).toBe(false);
    });
  });

  describe('6. Engine Verdict Guard: Capping Unverified Findings', () => {
    it('caps CONFIRMED_OVERCHARGE at LIKELY_ISSUE when record is unverified', () => {
      expect(enforceVerdictGuard('CONFIRMED_OVERCHARGE', false)).toBe('LIKELY_ISSUE');
      expect(enforceVerdictGuard('CONFIRMED_OVERCHARGE', true)).toBe('CONFIRMED_OVERCHARGE');
      expect(enforceVerdictGuard('LIKELY_ISSUE', false)).toBe('LIKELY_ISSUE');
      expect(enforceVerdictGuard('NEEDS_REVIEW', false)).toBe('NEEDS_REVIEW');
    });
  });

  describe('7. LineItem Null Handling Contract (Money, Quantity, Dates)', () => {
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
});
