/**
 * Client-side Blur Detection Gate using Laplacian Variance on grayscale pixel values.
 * Blurry photos have low high-frequency edge variance (< 40).
 * Sharp photos with clear printed text have high edge variance (> 100).
 */
export function calculateLaplacianVariance(
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number
): number {
  if (width < 3 || height < 3) return 100;

  // Convert RGBA to Grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] =
      0.299 * pixels[idx] +
      0.587 * pixels[idx + 1] +
      0.114 * pixels[idx + 2];
  }

  // Discrete 3x3 Laplacian Kernel:
  // [ 0,  1,  0 ]
  // [ 1, -4,  1 ]
  // [ 0,  1,  0 ]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        gray[idx - width] +
        gray[idx + width] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];

      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return variance;
}

/**
 * Checks if a canvas image is too blurry.
 * Returns { isBlurry: boolean, variance: number }
 */
export function checkCanvasBlur(
  canvas: HTMLCanvasElement,
  threshold = 40
): { isBlurry: boolean; variance: number } {
  try {
    const sampleWidth = Math.min(canvas.width, 320);
    const sampleHeight = Math.min(canvas.height, 240);

    const offscreen = document.createElement('canvas');
    offscreen.width = sampleWidth;
    offscreen.height = sampleHeight;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return { isBlurry: false, variance: 100 };

    ctx.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);
    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const variance = calculateLaplacianVariance(
      imgData.data,
      sampleWidth,
      sampleHeight
    );

    return {
      isBlurry: variance < threshold,
      variance,
    };
  } catch (err) {
    // If canvas reading fails (e.g. tainted), allow through
    return { isBlurry: false, variance: 100 };
  }
}
