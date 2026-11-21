import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMagicBytes,
  extractMedicalBillWithGemini,
} from '@/lib/extract/client';
import { ExtractedMedicalDocumentSchema } from '@/lib/extract/medicalBillSchema';

import sample1Stent from '@/data/samples/sample1-stent.json';
import sample1bStent from '@/data/samples/sample1b-stent-post-april.json';
import sample2Bundling from '@/data/samples/sample2-bundling-tpa.json';
import sample3Clean from '@/data/samples/sample3-clean.json';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const medicalSampleMap: Record<string, any> = {
  '1': sample1Stent,
  'sample1': sample1Stent,
  'sample1-stent': sample1Stent,
  'stent': sample1Stent,
  '1b': sample1bStent,
  'sample1b': sample1bStent,
  'sample1b-stent': sample1bStent,
  'post-april': sample1bStent,
  '2': sample2Bundling,
  'sample2': sample2Bundling,
  'sample2-bundling': sample2Bundling,
  'bundling': sample2Bundling,
  '3': sample3Clean,
  'sample3': sample3Clean,
  'sample3-clean': sample3Clean,
  'clean': sample3Clean,
};

// Simple In-Memory Rate Limiter (IP -> timestamp array)
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    return false; // Rate limit exceeded
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. In-memory Rate Limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const limitPerMin = parseInt(process.env.RATE_LIMIT_PER_MIN || '10', 10);
    if (!checkRateLimit(ip, limitPerMin)) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT',
            message: 'Too many requests. Please wait a minute before trying again.',
          },
        },
        {
          status: 429,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // 2. Parse Multipart Form Data (No body logging for privacy and determinism)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const docTypeRaw = (formData.get('docType') || formData.get('documentType')) as string | null;
    const sampleId = (formData.get('sampleId') as string | null) || req.headers.get('x-mock-sample') || '1';

    if (!file || !docTypeRaw) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_TYPE',
            message: 'Both file and docType are required in multipart/form-data.',
          },
        },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // 3. Payload size check (4 MB)
    const maxMb = parseInt(process.env.MAX_UPLOAD_MB || '4', 10);
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: {
            code: 'TOO_LARGE',
            message: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${maxMb} MB.`,
          },
        },
        {
          status: 413,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // 4. Verify Magic Bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedMime = verifyMagicBytes(buffer);

    if (!detectedMime) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_TYPE',
            message: 'Unsupported or corrupted file type. Supported formats: JPEG, PNG, WebP, PDF.',
          },
        },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // 5. EXTRACT_MOCK=1 support (allowed ONLY in non-production environments)
    const isMockAllowed =
      process.env.EXTRACT_MOCK === '1' && process.env.NODE_ENV !== 'production';

    if (isMockAllowed) {
      const sample =
        docTypeRaw === 'tpa_settlement'
          ? sample2Bundling
          : medicalSampleMap[sampleId] || sample1Stent;
      const validated = ExtractedMedicalDocumentSchema.parse(sample);
      return NextResponse.json(validated, {
        headers: {
          'x-is-mock': '1',
          'Cache-Control': 'no-store',
        },
      });
    }

    // 6. Config Validation: GEMINI_MODEL must be configured
    if (!process.env.GEMINI_MODEL) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFIG_ERROR',
            message: 'GEMINI_MODEL is not configured in server environment.',
          },
        },
        {
          status: 500,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // 7. Key Validation: Server key or client-provided x-gemini-key
    const clientKey = req.headers.get('x-gemini-key') || undefined;
    const effectiveKey = clientKey || process.env.GEMINI_API_KEY;

    if (!effectiveKey) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFIG_ERROR',
            message: 'GEMINI_API_KEY is not configured on the server and no custom key was provided.',
          },
        },
        {
          status: 500,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // 7. Upstream Gemini Call
    try {
      const extracted = await extractMedicalBillWithGemini(buffer, detectedMime, clientKey);
      return NextResponse.json(extracted, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (err: any) {
      const msg = err?.message || 'Upstream extraction error';
      if (msg.includes('schema validation')) {
        return NextResponse.json(
          {
            error: {
              code: 'SCHEMA_FAIL',
              message: 'Failed to extract valid document fields from this document. Please retake photo or enter manually.',
            },
          },
          {
            status: 422,
            headers: { 'Cache-Control': 'no-store' },
          }
        );
      }
      return NextResponse.json(
        {
          error: {
            code: 'UPSTREAM',
            message: 'Extraction service error: Upstream Gemini service failed or rejected request.',
          },
        },
        {
          status: 502,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM',
          message: err?.message || 'Unexpected server error.',
        },
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
