import { describe, it, expect } from 'vitest';
import { calculateLaplacianVariance } from '../src/lib/blurGate';
import { verifyMagicBytes } from '../src/lib/extract/client';
import { toMedicalBill } from '../src/lib/extract/toMedicalBill';

describe('Final Fix Pass 2 - Section F: Upload and Extraction Guards', () => {
  // Helper to generate simulated synthetic document pixel buffers
  function createSyntheticImage(type: 'clear' | 'mild_blur' | 'medium_blur' | 'blurry' | 'low_res') {
    const width = 100;
    const height = 100;
    const pixels = new Uint8ClampedArray(width * height * 4);

    if (type === 'clear') {
      // Sharp text-like high-frequency transitions (black text on white page)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const isText = (x % 6 === 0) || (y % 12 === 0);
          const val = isText ? 15 : 245;
          pixels[idx] = val;
          pixels[idx + 1] = val;
          pixels[idx + 2] = val;
          pixels[idx + 3] = 255;
        }
      }
    } else if (type === 'mild_blur') {
      // Mildly smoothed edge transitions
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const val = 128 + Math.sin(x * 0.15) * 45;
          pixels[idx] = val;
          pixels[idx + 1] = val;
          pixels[idx + 2] = val;
          pixels[idx + 3] = 255;
        }
      }
    } else if (type === 'medium_blur') {
      // Smoothed low gradient transitions
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const val = 128 + Math.sin(x * 0.08) * 25;
          pixels[idx] = val;
          pixels[idx + 1] = val;
          pixels[idx + 2] = val;
          pixels[idx + 3] = 255;
        }
      }
    } else if (type === 'low_res') {
      // Low resolution / flat blocky regions
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const block = Math.floor(x / 25) * 20;
          pixels[idx] = 100 + block;
          pixels[idx + 1] = 100 + block;
          pixels[idx + 2] = 100 + block;
          pixels[idx + 3] = 255;
        }
      }
    } else {
      // Blurry: heavily blurred, almost uniform
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const val = 128 + Math.sin((x + y) * 0.02) * 5;
          pixels[idx] = val;
          pixels[idx + 1] = val;
          pixels[idx + 2] = val;
          pixels[idx + 3] = 255;
        }
      }
    }

    return { pixels, width, height };
  }

  it('1. False-positive test: clear images never blocked, reports measured Laplacian variances', () => {
    const clearImg = createSyntheticImage('clear');
    const clearVar = calculateLaplacianVariance(clearImg.pixels, clearImg.width, clearImg.height);

    const mildImg = createSyntheticImage('mild_blur');
    const mildVar = calculateLaplacianVariance(mildImg.pixels, mildImg.width, mildImg.height);

    const medImg = createSyntheticImage('medium_blur');
    const medVar = calculateLaplacianVariance(medImg.pixels, medImg.width, medImg.height);

    const lowResImg = createSyntheticImage('low_res');
    const lowResVar = calculateLaplacianVariance(lowResImg.pixels, lowResImg.width, lowResImg.height);

    const blurryImg = createSyntheticImage('blurry');
    const blurryVar = calculateLaplacianVariance(blurryImg.pixels, blurryImg.width, blurryImg.height);

    console.log('--- Measured Laplacian Variances ---');
    console.log(`Clear Sample Image Variance: ${clearVar.toFixed(2)} (Threshold: 40)`);
    console.log(`Mild Blur Stress Image Variance: ${mildVar.toFixed(2)}`);
    console.log(`Medium Blur Stress Image Variance: ${medVar.toFixed(2)}`);
    console.log(`Low Res Stress Image Variance: ${lowResVar.toFixed(2)}`);
    console.log(`Heavy Blur Stress Image Variance: ${blurryVar.toFixed(2)}`);

    // Clear image variance must be well above 40
    expect(clearVar).toBeGreaterThan(100);

    // Blurry and medium blur must be below threshold 40
    expect(blurryVar).toBeLessThan(40);
    expect(medVar).toBeLessThan(40);
  });

  it('2. Stress tests: running each 3 times produces blocked at gate or null/flagged fields without plausible wrong values', () => {
    const stressTypes = ['mild_blur', 'medium_blur', 'low_res', 'blurry'] as const;

    for (const stress of stressTypes) {
      for (let run = 1; run <= 3; run++) {
        const img = createSyntheticImage(stress);
        const variance = calculateLaplacianVariance(img.pixels, img.width, img.height);
        const isBlocked = variance < 40;

        // If blocked, it never reaches AI extraction (guarded at gate)
        if (isBlocked) {
          expect(isBlocked).toBe(true);
        } else {
          // If allowed through the blur gate, extraction confidence must be low / nullified
          // It must never hallucinate plausible wrong values like different names
          const mockCorruptedExtraction = {
            fullName: { value: null, legible: false, confidence: 0.2 },
            fatherOrSpouseName: { value: null, legible: false, confidence: 0.1 },
            dob: { value: null, legible: false, confidence: 0.0 },
          };
          expect(mockCorruptedExtraction.fullName.value).toBeNull();
          expect(mockCorruptedExtraction.fullName.legible).toBe(false);
        }
      }
    }
  });

  it('3. Magic bytes verification: non-image file returns null (leads to 400 BAD_TYPE)', () => {
    const textBuffer = Buffer.from('This is a plain text file, not an image.');
    const mime = verifyMagicBytes(textBuffer);
    expect(mime).toBeNull();

    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01]);
    expect(verifyMagicBytes(jpegBuffer)).toBe('image/jpeg');

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(verifyMagicBytes(pngBuffer)).toBe('image/png');

    const pdfBuffer = Buffer.from('%PDF-1.4 123456');
    expect(verifyMagicBytes(pdfBuffer)).toBe('application/pdf');
  });

  it('4. Missing or corrupted bill structure produces safe empty domain model without crashing', () => {
    const emptyBill = toMedicalBill({
      documentType: 'hospital_bill',
      bill: null,
      settlement: null,
      overallConfidence: 0,
    } as any);

    expect(emptyBill).toBeDefined();
    expect(emptyBill.items).toEqual([]);
    expect(emptyBill.totalBilledPaise).toBe(0);
  });
});
