import { z } from 'zod';

export const docTypeSchema = z.enum(['aadhaar', 'pan', 'bank', 'certificate']);

export const fieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  legible: z.boolean().default(true).optional(),
});

export const yearFieldSchema = z.object({
  value: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  legible: z.boolean().default(true).optional(),
});

export const genderFieldSchema = z.object({
  value: z.enum(['M', 'F', 'O']).nullable(),
  confidence: z.number().min(0).max(1),
  legible: z.boolean().default(true).optional(),
});

export const extractedDocumentSchema = z.object({
  docType: docTypeSchema,
  detectedDocType: z.enum(['aadhaar', 'pan', 'bank', 'certificate', 'unknown']),
  fields: z.object({
    fullName: fieldSchema.optional(),
    fatherOrSpouseName: fieldSchema.optional(),
    dob: fieldSchema.optional(),
    dobIso: fieldSchema.optional(),
    yearOfBirthOnly: yearFieldSchema.optional(),
    gender: genderFieldSchema.optional(),
    aadhaarRedacted: fieldSchema.optional(),
    panNumber: fieldSchema.optional(),
    accountHolderName: fieldSchema.optional(),
    accountNumberLast4: fieldSchema.optional(),
    ifsc: fieldSchema.optional(),
    bankName: fieldSchema.optional(),
    certificateName: fieldSchema.optional(),
    institutionName: fieldSchema.optional(),
  }),
  overallConfidence: z.number().min(0).max(1),
});

export type ExtractedDocumentSchemaType = z.infer<typeof extractedDocumentSchema>;
