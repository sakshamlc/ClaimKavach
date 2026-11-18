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
  const originalEnv = process.env.EXTRACT_MOCK;

  beforeEach(() => {
    process.env.EXTRACT_MOCK = '1';
  });

  afterEach(() => {
    process.env.EXTRACT_MOCK = originalEnv;
  });

  it('Sample 1 (Stent Bill): extract -> toMedicalBill -> runAudit executes correctly', () => {
    // 1. Validate extracted JSON
    const parsed = ExtractedMedicalDocumentSchema.parse(sample1Stent);
    expect(parsed.documentType).toBe('hospital_bill');

    // 2. Map to MedicalBill domain model
    const medicalBill = toMedicalBill(parsed);
    expect(medicalBill.isSynthetic).toBe(true);
    expect(medicalBill.items).toHaveLength(2);
    expect(medicalBill.totalBilledPaise).toBe(4500280); // 45002.80 in paise

    // 3. Execute Trust Zone audit engine
    const report = runAudit(medicalBill);
    expect(report).toBeDefined();
    expect(report.billId).toBe(medicalBill.id);
    expect(report.totals.billed).toBe(4500280);

    // Stent item should be audited against coronary stent ceiling data
    const stentFinding = report.findings.find(
      (f) => f.ruleId === 'R-STENT-01' || f.ruleId === 'R-NPPA-01' || f.itemId === 'item-1'
    );
    expect(stentFinding).toBeDefined();
  });

  it('Sample 2 (Room Bundling & TPA Deduction): extract -> toMedicalBill -> runAudit executes correctly', () => {
    // 1. Validate extracted JSON
    const parsed = ExtractedMedicalDocumentSchema.parse(sample2Bundling);
    expect(parsed.documentType).toBe('combined');
    expect(parsed.settlement?.deductions).toHaveLength(1);

    // 2. Map to MedicalBill domain model
    const medicalBill = toMedicalBill(parsed);
    expect(medicalBill.isSynthetic).toBe(true);
    expect(medicalBill.items).toHaveLength(3);
    expect(medicalBill.totalBilledPaise).toBe(1835000); // 18350.00 in paise

    // Check that deduction is mapped to Digital Thermometer item
    const thermometerItem = medicalBill.items.find((it) => it.description.includes('Thermometer'));
    expect(thermometerItem).toBeDefined();
    expect(thermometerItem?.deductedPaise).toBe(35000); // 350.00 in paise
    expect(thermometerItem?.deductionReason).toContain('Annexure-I');

    // 3. Execute Trust Zone audit engine with default reference data (annexure deduction fires)
    const report = runAudit(medicalBill);
    expect(report).toBeDefined();
    expect(report.totals.billed).toBe(1835000);

    const deductionFinding = report.findings.find((f) => f.ruleId === 'R-ANX-01');
    expect(deductionFinding).toBeDefined();

    // 4. Test bundling when room bundling reference data is loaded
    const sampleBundlingRecord: RoomBundlingRecord = {
      id: 'BUNDLE-NURSING-01',
      name: 'Routine Nursing Charges',
      normalizedName: 'routine nursing charges',
      bundledWith: 'room_rent',
      description: 'Routine nursing charges bundled with room rent',
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

  it('Sample 3 (Clean Bill): extract -> toMedicalBill -> runAudit executes with zero overcharges', () => {
    // 1. Validate extracted JSON
    const parsed = ExtractedMedicalDocumentSchema.parse(sample3Clean);
    expect(parsed.documentType).toBe('hospital_bill');

    // 2. Map to MedicalBill domain model
    const medicalBill = toMedicalBill(parsed);
    expect(medicalBill.isSynthetic).toBe(true);
    expect(medicalBill.items).toHaveLength(3);
    expect(medicalBill.totalBilledPaise).toBe(270000); // 2700.00 in paise

    // 3. Execute Trust Zone audit engine
    const report = runAudit(medicalBill);
    expect(report).toBeDefined();
    expect(report.totals.billed).toBe(270000);
    expect(report.totals.confirmed).toBe(0);
    expect(report.totals.likely).toBe(0);
    expect(report.totals.fair).toBe(270000);
  });

  it('/api/extract mock mode returns synthetic bills with no network and sets Cache-Control: no-store', async () => {
    // Create a mock multipart request with a dummy PDF file
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
    expect(json.bill.hospitalName).toBe('Synthetic Metro Heart Institute');
  });
});
