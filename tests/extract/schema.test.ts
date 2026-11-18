import { describe, it, expect } from 'vitest';
import {
  ExtractedMedicalDocumentSchema,
  RawExtractedHospitalBillSchema,
  RawExtractedTpaSettlementSchema,
  safeCurrencyToPaise,
  safeParseQuantity,
} from '@/lib/extract/medicalBillSchema';
import { toMedicalBill } from '@/lib/extract/toMedicalBill';

describe('Phase 4: Medical Bill Extraction Schemas & Currency Parsing', () => {
  it('safeCurrencyToPaise converts valid currency strings to integer paise', () => {
    expect(safeCurrencyToPaise('100.50')).toEqual({ paise: 10050, hasCurrencyError: false, raw: '100.50' });
    expect(safeCurrencyToPaise('₹ 1,500.00')).toEqual({ paise: 150000, hasCurrencyError: false, raw: '₹ 1,500.00' });
    expect(safeCurrencyToPaise('0')).toEqual({ paise: 0, hasCurrencyError: false, raw: '0' });
    expect(safeCurrencyToPaise('0.28')).toEqual({ paise: 28, hasCurrencyError: false, raw: '0.28' });
  });

  it('safeCurrencyToPaise returns null with hasCurrencyError: false for null, empty or whitespace', () => {
    expect(safeCurrencyToPaise(null)).toEqual({ paise: null, hasCurrencyError: false, raw: null });
    expect(safeCurrencyToPaise(undefined)).toEqual({ paise: null, hasCurrencyError: false, raw: null });
    expect(safeCurrencyToPaise('')).toEqual({ paise: null, hasCurrencyError: false, raw: null });
    expect(safeCurrencyToPaise('   ')).toEqual({ paise: null, hasCurrencyError: false, raw: null });
  });

  it('safeCurrencyToPaise returns null with hasCurrencyError: true for malformed inputs or excess decimals', () => {
    // 3 decimals should throw CurrencyError and result in hasCurrencyError: true
    const threeDecimals = safeCurrencyToPaise('12.345');
    expect(threeDecimals.paise).toBeNull();
    expect(threeDecimals.hasCurrencyError).toBe(true);

    const invalidAlpha = safeCurrencyToPaise('NOT_A_NUMBER');
    expect(invalidAlpha.paise).toBeNull();
    expect(invalidAlpha.hasCurrencyError).toBe(true);
  });

  it('safeParseQuantity handles valid quantities and edge cases', () => {
    expect(safeParseQuantity('1')).toBe(1);
    expect(safeParseQuantity('2.5')).toBe(2.5);
    expect(safeParseQuantity('10 units')).toBe(10);
    expect(safeParseQuantity(null)).toBeNull();
    expect(safeParseQuantity('')).toBeNull();
    expect(safeParseQuantity('N/A')).toBeNull();
    expect(safeParseQuantity('-5')).toBeNull();
  });

  it('validates a complete hospital bill and permits nullable fields when unreadable', () => {
    const rawData = {
      documentType: 'hospital_bill',
      bill: {
        hospitalName: null, // unreadable
        billDate: '2026-05-15',
        admissionDate: null,
        dischargeDate: null,
        lengthOfStayNights: null,
        roomType: null,
        items: [
          {
            name: 'Generic Paracetamol 500mg',
            category: 'pharmacy',
            quantity: '10',
            unitPrice: '2.50',
            amount: '25.00',
            discount: null,
            tax: null,
            date: null,
            confidence: 0.95,
            notes: null,
          },
        ],
        statedTotal: '25.00',
        hasDiscountOrTaxColumns: false,
        billedPriceIncludesGst: null,
        gstRatePct: null,
      },
      settlement: null,
      overallConfidence: 0.95,
    };

    const parsed = ExtractedMedicalDocumentSchema.parse(rawData);
    expect(parsed.documentType).toBe('hospital_bill');
    expect(parsed.bill?.hospitalName).toBeNull();
    expect(parsed.bill?.items).toHaveLength(1);
    expect(parsed.bill?.items[0].name).toBe('Generic Paracetamol 500mg');
  });

  it('validates a TPA settlement document schema', () => {
    const rawSettlement = {
      tpaName: 'MediAssist TPA',
      claimNumber: 'CLM-12345',
      sumInsured: '500000.00',
      roomRentLimit: '5000.00',
      coPayAmount: '0.00',
      roomRentProportionateDeduction: null,
      deductions: [
        {
          itemName: 'Gloves and Syringes',
          billedAmount: '450.00',
          deductedAmount: '450.00',
          reason: 'Non-payable under Annexure-I',
          category: 'consumable',
        },
      ],
    };

    const parsed = RawExtractedTpaSettlementSchema.parse(rawSettlement);
    expect(parsed.tpaName).toBe('MediAssist TPA');
    expect(parsed.deductions).toHaveLength(1);
    expect(parsed.deductions[0].deductedAmount).toBe('450.00');
  });
});
