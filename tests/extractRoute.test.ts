import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/extract/route';

// Minimal 1x1 valid PNG buffer with valid magic bytes (89 50 4E 47 ...)
const VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

// Helper to construct NextRequest with FormData
function createExtractRequest(
  fileContent: Uint8Array,
  fileName: string,
  docType?: string,
  ip: string = '127.0.0.1'
): NextRequest {
  const formData = new FormData();
  const buffer = Buffer.from(fileContent);
  const blob = new Blob([buffer], { type: 'image/png' });
  formData.append('file', blob, fileName);
  if (docType) {
    formData.append('docType', docType);
  }

  return new NextRequest('http://localhost:3000/api/extract', {
    method: 'POST',
    body: formData,
    headers: {
      'x-forwarded-for': ip,
    },
  });
}

describe('POST /api/extract Route & Gate 2 Verification', () => {
  const origEnv = process.env.EXTRACT_MOCK;

  beforeEach(() => {
    process.env.EXTRACT_MOCK = '1';
  });

  afterEach(() => {
    process.env.EXTRACT_MOCK = origEnv;
  });

  it('1. Returns schema-valid JSON for hospital bill in mock mode', async () => {
    const req = createExtractRequest(VALID_PNG_BYTES, 'test.png', 'hospital_bill', '10.0.0.1');
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.documentType).toBe('hospital_bill');
    expect(data.bill).toBeDefined();
    expect(data.bill.items.length).toBeGreaterThan(0);
  });

  it('2. Rejects invalid MIME / magic bytes with 400 BAD_TYPE', async () => {
    const invalidBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    const req = createExtractRequest(invalidBytes, 'corrupt.bin', 'hospital_bill', '10.0.0.2');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('BAD_TYPE');
    expect(data.error.message).toContain('Unsupported or corrupted file type');
  });

  it('2b. Rejects unsupported MIME type (e.g. text/plain or executable bytes) with 400 BAD_TYPE', async () => {
    // Plain text ASCII bytes "Hello World"
    const textBytes = new TextEncoder().encode('Hello world, this is a plain text file not an image or pdf');
    const req = createExtractRequest(textBytes, 'notes.txt', 'hospital_bill', '10.0.0.25');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('BAD_TYPE');
  });

  it('3. Rejects missing docType with 400 BAD_TYPE', async () => {
    const req = createExtractRequest(VALID_PNG_BYTES, 'test.png', undefined, '10.0.0.3');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('BAD_TYPE');
  });

  it('4. Rejects file > 4 MB with 413 TOO_LARGE', async () => {
    const largeBytes = new Uint8Array(5 * 1024 * 1024); // 5 MB
    // Set valid PNG magic bytes so it passes magic bytes check first
    largeBytes.set(VALID_PNG_BYTES.subarray(0, 8), 0);

    const req = createExtractRequest(largeBytes, 'large.png', 'hospital_bill', '10.0.0.4');
    const res = await POST(req);

    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error.code).toBe('TOO_LARGE');
  });

  it('5. Rate limiter triggers 429 RATE_LIMIT on 11th rapid call from same IP', async () => {
    const testIp = '192.168.1.100';

    // 10 allowed calls
    for (let i = 0; i < 10; i++) {
      const req = createExtractRequest(VALID_PNG_BYTES, 'test.png', 'hospital_bill', testIp);
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 11th call must return 429
    const req11 = createExtractRequest(VALID_PNG_BYTES, 'test.png', 'hospital_bill', testIp);
    const res11 = await POST(req11);
    expect(res11.status).toBe(429);
    const data11 = await res11.json();
    expect(data11.error.code).toBe('RATE_LIMIT');
  });

  it('6. Returns 500 CONFIG_ERROR when GEMINI_API_KEY is missing and no custom key provided', async () => {
    process.env.EXTRACT_MOCK = '0';
    const origKey = process.env.GEMINI_API_KEY;
    const origModel = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_MODEL = 'gemini-1.5-pro';

    try {
      const req = createExtractRequest(VALID_PNG_BYTES, 'test.png', 'hospital_bill', '10.0.0.50');
      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error.code).toBe('CONFIG_ERROR');
      expect(data.error.message).toContain('GEMINI_API_KEY is not configured on the server and no custom key was provided');
    } finally {
      process.env.GEMINI_API_KEY = origKey;
      process.env.GEMINI_MODEL = origModel;
    }
  });

  it('7. EXTRACT_MOCK=1 is strictly ignored when NODE_ENV is production', async () => {
    process.env.EXTRACT_MOCK = '1';
    const origNodeEnv = process.env.NODE_ENV;
    const origKey = process.env.GEMINI_API_KEY;
    (process.env as any).NODE_ENV = 'production';
    delete process.env.GEMINI_API_KEY;

    try {
      const req = createExtractRequest(VALID_PNG_BYTES, 'test.png', 'hospital_bill', '10.0.0.51');
      const res = await POST(req);
      // In production without key, it ignores mock and fails with CONFIG_ERROR
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error.code).toBe('CONFIG_ERROR');
    } finally {
      (process.env as any).NODE_ENV = origNodeEnv;
      process.env.GEMINI_API_KEY = origKey;
    }
  });
});
