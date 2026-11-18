import { GoogleGenAI } from '@google/genai';
import {
  SYSTEM_INSTRUCTION,
  MEDICAL_BILL_PROMPT,
  GEMINI_MEDICAL_BILL_RESPONSE_SCHEMA,
} from './prompt';
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

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return 'application/pdf';
  }

  return null;
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

  const modelName = process.env.GEMINI_MODEL;
  if (!modelName) {
    throw new Error('GEMINI_MODEL is not configured');
  }
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
