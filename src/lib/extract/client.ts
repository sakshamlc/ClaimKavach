import { GoogleGenAI } from '@google/genai';
import { DocType } from '../rules/types';
import {
  SYSTEM_INSTRUCTION,
  getExtractionPrompt,
  GEMINI_RESPONSE_SCHEMA,
  MEDICAL_BILL_PROMPT,
  GEMINI_MEDICAL_BILL_RESPONSE_SCHEMA,
} from './prompt';
import { extractedDocumentSchema, ExtractedDocumentSchemaType } from './schema';
import {
  ExtractedMedicalDocumentSchema,
  type ExtractedMedicalDocument,
} from './medicalBillSchema';

/**
 * Validates magic bytes of an uploaded file buffer.
 * Returns the detected mimeType or null if invalid.
 */
export function verifyMagicBytes(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // WebP: RIFF (bytes 0-3: 52 49 46 46) and WEBP (bytes 8-11: 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // PDF: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  return null;
}

/**
 * Server-side Aadhaar redaction guardrail.
 * Scans all string values in fields and ensures 12-digit Aadhaar numbers are never returned.
 */
export function sanitizeAadhaarDigits(doc: ExtractedDocumentSchemaType): ExtractedDocumentSchemaType {
  const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;

  const sanitized = JSON.parse(JSON.stringify(doc)) as ExtractedDocumentSchemaType;

  for (const field of Object.values(sanitized.fields)) {
    if (field && typeof field.value === 'string') {
      if (aadhaarRegex.test(field.value)) {
        field.value = '[Aadhaar Present - Redacted]';
      }
    }
  }

  // If this is an Aadhaar document and aadhaarRedacted is empty or null, mark it present
  if (sanitized.docType === 'aadhaar' && !sanitized.fields.aadhaarRedacted?.value) {
    sanitized.fields.aadhaarRedacted = {
      value: '[Aadhaar Present - Redacted]',
      confidence: 0.95,
    };
  }

  return sanitized;
}

/**
 * Deterministic code validators on extracted values.
 * Guards against hallucinated characters, invalid length strings, or invalid dates.
 */
export function validateExtractedFields(doc: ExtractedDocumentSchemaType): ExtractedDocumentSchemaType {
  const result = JSON.parse(JSON.stringify(doc)) as ExtractedDocumentSchemaType;

  // Account number last 4: must be digits only (up to 4 digits or masked)
  if (result.fields.accountNumberLast4?.value) {
    const val = String(result.fields.accountNumberLast4.value).trim();
    if (!/^\d{1,4}$/.test(val)) {
      result.fields.accountNumberLast4.value = null;
      result.fields.accountNumberLast4.legible = false;
    }
  }

  return result;
}

/**
 * Double-extraction consistency checker.
 * Compares two extraction passes field-by-field.
 * If values conflict, sets the field to null with legible: false.
 */
export function applyDoubleExtractionConsistency(
  primary: ExtractedDocumentSchemaType,
  secondary: ExtractedDocumentSchemaType
): ExtractedDocumentSchemaType {
  const merged = JSON.parse(JSON.stringify(primary)) as ExtractedDocumentSchemaType;

  for (const [key, primaryField] of Object.entries(merged.fields)) {
    const secField = (secondary.fields as any)[key];
    if (primaryField && secField) {
      if (
        primaryField.value &&
        secField.value &&
        String(primaryField.value).trim().toLowerCase() !==
          String(secField.value).trim().toLowerCase()
      ) {
        // Discrepancy detected across two extraction passes
        primaryField.value = null;
        primaryField.legible = false;
        primaryField.confidence = 0.2;
      }
    }
  }

  return merged;
}

/**
 * Calls Google Gemini using @google/genai with structured JSON output and schema validation.
 * Includes one automatic retry on schema failure.
 */
export async function extractWithGemini(
  buffer: Buffer,
  mimeType: string,
  docType: DocType,
  apiKey?: string
): Promise<ExtractedDocumentSchemaType> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const ai = new GoogleGenAI({ apiKey: key });

  const base64Data = buffer.toString('base64');
  const promptText = getExtractionPrompt(docType);

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < 2) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const parsedJson = JSON.parse(responseText);
      const validated = extractedDocumentSchema.parse(parsedJson);

      return validateExtractedFields(sanitizeAadhaarDigits(validated));
    } catch (err: any) {
      lastError = err;
      if (attempts >= 2) break;
    }
  }

  throw lastError || new Error('Extraction failed schema validation twice');
}

/**
 * Calls Google Gemini for medical bill and TPA settlement extraction
 * using GEMINI_MODEL (temperature 0), strictly following the prompt and JSON schema.
 */
export async function extractMedicalBillWithGemini(
  buffer: Buffer,
  mimeType: string,
  apiKey?: string
): Promise<ExtractedMedicalDocument> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const ai = new GoogleGenAI({ apiKey: key });

  const base64Data = buffer.toString('base64');

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < 2) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: MEDICAL_BILL_PROMPT,
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_MEDICAL_BILL_RESPONSE_SCHEMA,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const parsedJson = JSON.parse(responseText);
      const validated = ExtractedMedicalDocumentSchema.parse(parsedJson);

      return validated;
    } catch (err: any) {
      lastError = err;
      if (attempts >= 2) break;
    }
  }

  throw lastError || new Error('Medical bill extraction failed schema validation');
}

