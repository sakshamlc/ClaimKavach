import { describe, it, expect } from 'vitest';
import {
  isRepeatedHeaderRow,
  dedupeRepeatedHeaders,
  mergeExtractedBatches,
} from '../../src/lib/pdfBatcher';

describe('PDF Batcher & Multi-page Table Header Deduplication', () => {
  describe('1. isRepeatedHeaderRow', () => {
    it('identifies table header row variations when money is zero or null', () => {
      expect(isRepeatedHeaderRow({ description: 'Particulars', unitRatePaise: null, totalBilledPaise: null })).toBe(true);
      expect(isRepeatedHeaderRow({ description: 'Item Description Qty Rate Amount', unitRatePaise: 0, totalBilledPaise: 0 })).toBe(true);
      expect(isRepeatedHeaderRow({ description: 'Sr. No.', unitRatePaise: null, totalBilledPaise: null })).toBe(true);
      expect(isRepeatedHeaderRow({ description: 'Rate / Unit', unitRatePaise: 0, totalBilledPaise: 0 })).toBe(true);
    });

    it('does NOT flag legitimate medical items even if description contains keywords', () => {
      expect(
        isRepeatedHeaderRow({
          description: 'Paracetamol 500mg Tablet (Item code 123)',
          unitRatePaise: 250,
          totalBilledPaise: 2500,
        })
      ).toBe(false);

      expect(
        isRepeatedHeaderRow({
          description: 'Coronary Drug Eluting Stent',
          unitRatePaise: 4500000,
          totalBilledPaise: 4500000,
        })
      ).toBe(false);
    });
  });

  describe('2. dedupeRepeatedHeaders', () => {
    it('filters repeated headers across simulated multi-page hospital invoices', () => {
      const page1Items = [
        { description: 'Item Description', unitRatePaise: null, totalBilledPaise: null },
        { description: 'Cefuroxime 500mg Injection', unitRatePaise: 1582, totalBilledPaise: 15820 },
        { description: 'Normal Saline 500ml IV', unitRatePaise: 4340, totalBilledPaise: 8680 },
      ];

      const page2Items = [
        { description: 'Item Description', unitRatePaise: null, totalBilledPaise: null }, // Repeated header on page 2!
        { description: 'Nursing Service Charges', unitRatePaise: 120000, totalBilledPaise: 120000 },
        { description: 'Surgical Gloves Disposable', unitRatePaise: 5000, totalBilledPaise: 10000 },
      ];

      const combined = [...page1Items, ...page2Items];
      const deduped = dedupeRepeatedHeaders(combined);

      expect(deduped.length).toBe(4);
      expect(deduped.map((d) => d.description)).toEqual([
        'Cefuroxime 500mg Injection',
        'Normal Saline 500ml IV',
        'Nursing Service Charges',
        'Surgical Gloves Disposable',
      ]);
    });
  });

  describe('3. mergeExtractedBatches', () => {
    it('merges multiple page extraction responses into single coherent bill', () => {
      const batch1 = {
        hospital: { name: 'Metro Multispeciality Hospital', city: 'New Delhi' },
        stay: { admissionDate: '2026-05-10', lengthOfStayNights: 2 },
        totalBilledPaise: 100000,
        items: [
          { description: 'Particulars', unitRatePaise: null, totalBilledPaise: null },
          { description: 'Drug Alpha 100mg', unitRatePaise: 1000, totalBilledPaise: 10000 },
        ],
      };

      const batch2 = {
        hospital: {},
        stay: { dischargeDate: '2026-05-12' },
        totalBilledPaise: 250000,
        items: [
          { description: 'Particulars', unitRatePaise: null, totalBilledPaise: null },
          { description: 'Drug Beta 200mg', unitRatePaise: 2000, totalBilledPaise: 20000 },
        ],
      };

      const merged = mergeExtractedBatches([batch1, batch2]);
      expect(merged.hospital.name).toBe('Metro Multispeciality Hospital');
      expect(merged.stay.admissionDate).toBe('2026-05-10');
      expect(merged.stay.dischargeDate).toBe('2026-05-12');
      expect(merged.totalBilledPaise).toBe(250000);
      expect(merged.items.length).toBe(2);
      expect(merged.items[0].description).toBe('Drug Alpha 100mg');
      expect(merged.items[1].description).toBe('Drug Beta 200mg');
    });
  });
});
