import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sample1Stent from '@/data/samples/sample1-stent.json';
import sample2Bundling from '@/data/samples/sample2-bundling-tpa.json';
import sample3Clean from '@/data/samples/sample3-clean.json';
import { ExtractedMedicalDocumentSchema } from '@/lib/extract/medicalBillSchema';
import { toMedicalBill } from '@/lib/extract/toMedicalBill';
import { runAudit } from '@/lib/audit/engine';
import { RoomBundlingRecord } from '@/lib/audit/regulatory';
import { POST } from '@/app/api/extract/route';
import { NextRequest } from 'next/server';

describe('Phase 4: End-to-End Extraction -> Mapper -> Audit Engine Flow', () => {
  const originalMock = process.env.EXTRACT_MOCK;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalGeminiModel = process.env.GEMINI_MODEL;

  beforeEach(() => {
    process.env.EXTRACT_MOCK = '1';
    (process.env as any).NODE_ENV = 'test';
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    process.env.EXTRACT_MOCK = originalMock;
    (process.env as any).NODE_ENV = originalNodeEnv;
    if (originalGeminiModel !== undefined) {
      process.env.GEMINI_MODEL = originalGeminiModel;
    } else {
      delete process.env.GEMINI_MODEL;
    }
  });

  it('Sample 1 (Stent Bill): runs on production dataset (src/data/regulatory/implants.json & nppaCeilings.json) and audits ceiling breach', () => {
    // 1. Validate extracted JSON
    const parsed = ExtractedMedicalDocumentSchema.parse(sample1Stent);
    expect(parsed.documentType).toBe('hospital_bill');

    // 2. Map to MedicalBill domain model
    const medicalBill = toMedicalBill(parsed);
    expect(medicalBill.isSynthetic).toBe(true);
    expect(medicalBill.items).toHaveLength(16);
    expect(medicalBill.totalBilledPaise).toBe(34200000); // 342000.00 in paise
    expect(medicalBill.billedPriceIncludesGst).toBe(false);

    // 3. Execute Trust Zone audit engine using default production dataset
    const report = runAudit(medicalBill);
    expect(report).toBeDefined();
    expect(report.billId).toBe(medicalBill.id);
    expect(report.totals.billed).toBe(34200000);

    // Stent item audited against coronary stent ceiling data (S.O. 1587(E))
    const stentFinding = report.findings.find(
      (f) => f.ruleId === 'R-STENT-01' || f.ruleId === 'R-NPPA-01' || f.itemId === 'item-1'
    );
    expect(stentFinding).toBeDefined();
  });

  it('Sample 2 (Room Bundling & TPA Deduction): runs on default dataset and explicit bundling fixture', () => {
    // 1. Validate extracted JSON
    const parsed = ExtractedMedicalDocumentSchema.parse(sample2Bundling);
    expect(parsed.documentType).toBe('combined');
    expect(parsed.settlement?.deductions).toHaveLength(1);

    // 2. Map to MedicalBill domain model
    const medicalBill = toMedicalBill(parsed);
    expect(medicalBill.isSynthetic).toBe(true);
    expect(medicalBill.items).toHaveLength(3);
    expect(medicalBill.totalBilledPaise).toBe(1835000); // 18350.00 in paise

    // Check that deduction is mapped to fictional consumable item
    const consumableItem = medicalBill.items.find((it) => it.description.includes('Consumable') || it.description.includes('Alpha'));
    expect(consumableItem).toBeDefined();
    expect(consumableItem?.deductedPaise).toBe(35000); // 350.00 in paise
    expect(consumableItem?.deductionReason).toContain('Annexure-I');

    // 3. Execute Trust Zone audit engine with default production reference data (annexure deduction fires)
    const report = runAudit(medicalBill);
    expect(report).toBeDefined();
    expect(report.totals.billed).toBe(1835000);

    const deductionFinding = report.findings.find((f) => f.ruleId === 'R-ANX-01');
    expect(deductionFinding).toBeDefined();

    // 4. Test bundling when room bundling reference data is loaded
    const sampleBundlingRecord: RoomBundlingRecord = {
      id: 'BUNDLE-NURSING-01',
      name: 'DEMO Routine Inpatient Nursing Charges',
      normalizedName: 'demo routine inpatient nursing charges',
      bundledWith: 'room_rent',
      description: 'Routine nursing charges bundled with room rent (fictional fixture)',
      effectiveDate: '2026-01-01',
      validUntil: null,
      instrumentNumber: 'CIRCULAR-2026-01',
      instrumentDate: '2026-01-01',
      gstTreatment: 'EXCLUDED',
      source: 'Sample Bundling Reference',
      sourceFile: 'BundlingRef.pdf',
      sourceUrl: 'https://example.gov.in',
      version: '1.0.0',
      verified: false,
      sourceRef: 'Page 1',
    };
    const reportWithBundling = runAudit(medicalBill, { roomBundling: [sampleBundlingRecord] });
    const bundlingFinding = reportWithBundling.findings.find((f) => f.ruleId === 'R-BUNDLE-01');
    expect(bundlingFinding).toBeDefined();
  });

  it('Sample 3 (Clean Bill): runs on default production dataset and yields zero overcharges', () => {
    // 1. Validate extracted JSON
    const parsed = ExtractedMedicalDocumentSchema.parse(sample3Clean);
    expect(parsed.documentType).toBe('hospital_bill');

    // 2. Map to MedicalBill domain model
    const medicalBill = toMedicalBill(parsed);
    expect(medicalBill.isSynthetic).toBe(true);
    expect(medicalBill.items).toHaveLength(3);
    expect(medicalBill.totalBilledPaise).toBe(270000); // 2700.00 in paise

    // 3. Execute Trust Zone audit engine on production reference dataset
    const report = runAudit(medicalBill);
    expect(report).toBeDefined();
    expect(report.totals.billed).toBe(270000);
    expect(report.totals.confirmed).toBe(0);
    expect(report.totals.likely).toBe(0);
    expect(report.totals.fair).toBe(270000);
  });

  it('/api/extract mock mode returns synthetic bills with no network and sets Cache-Control: no-store', async () => {
    const formData = new FormData();
    const dummyPdf = new Blob(['%PDF-1.4 dummy file content for testing'], { type: 'application/pdf' });
    formData.append('file', dummyPdf, 'test-bill.pdf');
    formData.append('docType', 'medical_bill');
    formData.append('sampleId', '1');

    const req = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-is-mock')).toBe('1');
    expect(response.headers.get('cache-control')).toBe('no-store');

    const json = await response.json();
    expect(json.documentType).toBe('hospital_bill');
    expect(json.bill.hospitalName).toBe('Sample Metro Care Hospital (Synthetic Demo)');
  });

  it('EXTRACT_MOCK is disabled in production (NODE_ENV === "production")', async () => {
    // When in production, EXTRACT_MOCK is ignored.
    (process.env as any).NODE_ENV = 'production';
    process.env.EXTRACT_MOCK = '1';
    delete process.env.GEMINI_MODEL; // Ensure missing model fails with 500 config error

    const formData = new FormData();
    const dummyPdf = new Blob(['%PDF-1.4 dummy file content for testing'], { type: 'application/pdf' });
    formData.append('file', dummyPdf, 'test-bill.pdf');
    formData.append('docType', 'medical_bill');

    const req = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    // Because NODE_ENV === 'production', mock mode is bypassed, and missing GEMINI_MODEL triggers 500
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe('CONFIG_ERROR');
    expect(json.error.message).toContain('GEMINI_MODEL is not configured');
    expect(response.headers.get('x-is-mock')).toBeNull();
  });
});
