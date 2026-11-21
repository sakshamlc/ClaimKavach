/**
 * ClaimKavach — Client-Side PDF Batching & Header Deduplication
 *
 * Requirements:
 * 1. 20-page max enforcement.
 * 2. Render PDF pages client-side using pdfjs-dist.
 * 3. Batch pages so each request payload is strictly under 4 MB.
 * 4. Deduplicate repeated header rows across multi-page hospital invoices.
 * 5. Deterministic merging of line items, hospital metadata, and stay info.
 */

export interface BatchProgressCallback {
  (currentStep: number, totalSteps: number, statusText: string): void;
}

const TABLE_HEADER_PATTERNS = [
  /^(sr\.?\s*no\.?|s\.?\s*no\.?|sl\.?\s*no\.?)\b/i,
  /^(item\s*description|particulars|service\s*description|description\s*of\s*service|item\s*name)\b/i,
  /^(qty|quantity|units?)\b/i,
  /^(rate|unit\s*rate|unit\s*price|mrp)\b/i,
  /^(amount|total\s*amount|total\s*billed|net\s*amount)\b/i,
];

/**
 * Checks whether an extracted line item is actually a repeated table header row.
 */
export function isRepeatedHeaderRow(item: {
  description: string;
  unitRatePaise?: number | null;
  totalBilledPaise?: number | null;
}): boolean {
  const desc = (item.description || '').trim();
  if (!desc) return true;

  // If rate and amount are 0 or null and description matches header keywords
  const isZeroOrNullMoney =
    (!item.unitRatePaise || item.unitRatePaise === 0) &&
    (!item.totalBilledPaise || item.totalBilledPaise === 0);

  for (const pattern of TABLE_HEADER_PATTERNS) {
    if (pattern.test(desc)) {
      return true;
    }
  }

  // Combined header string test e.g. "Item Particulars Qty Rate Amount"
  const headerKeywords = ['description', 'particulars', 'qty', 'quantity', 'rate', 'amount', 'sr no'];
  const matches = headerKeywords.filter((kw) => desc.toLowerCase().includes(kw));
  if (matches.length >= 2 && isZeroOrNullMoney) {
    return true;
  }

  return false;
}

/**
 * Deduplicates repeated table header rows and exact page-break boundary duplicates.
 */
export function dedupeRepeatedHeaders<
  T extends { description: string; unitRatePaise?: number | null; totalBilledPaise?: number | null }
>(items: T[]): T[] {
  const result: T[] = [];
  const seenHeaderFingerprints = new Set<string>();

  for (const item of items) {
    if (isRepeatedHeaderRow(item)) {
      continue; // Filter out table header rows
    }

    // Filter consecutive duplicate empty items
    const fingerprint = `${item.description.trim().toLowerCase()}|${item.unitRatePaise ?? ''}|${item.totalBilledPaise ?? ''}`;
    if (seenHeaderFingerprints.has(fingerprint) && item.description.length < 5) {
      continue;
    }

    result.push(item);
  }

  return result;
}

/**
 * Merges multiple batch extraction responses into a single combined medical bill extraction.
 */
export function mergeExtractedBatches(batches: any[]): any {
  if (!batches || batches.length === 0) {
    return null;
  }

  if (batches.length === 1) {
    const single = { ...batches[0] };
    if (Array.isArray(single.items)) {
      single.items = dedupeRepeatedHeaders(single.items);
    }
    return single;
  }

  const primary = { ...batches[0] };
  const allItems: any[] = [];

  for (const batch of batches) {
    if (batch && Array.isArray(batch.items)) {
      allItems.push(...batch.items);
    }

    // If subsequent pages contain more specific hospital or stay info, backfill
    if (batch.hospital) {
      primary.hospital = { ...primary.hospital };
      for (const [k, v] of Object.entries(batch.hospital)) {
        if (!primary.hospital[k] && v) {
          primary.hospital[k] = v;
        }
      }
    }
    if (batch.stay) {
      primary.stay = { ...primary.stay };
      for (const [k, v] of Object.entries(batch.stay)) {
        if (!primary.stay[k] && v) {
          primary.stay[k] = v;
        }
      }
    }
    if (batch.totalBilledPaise && (!primary.totalBilledPaise || batch.totalBilledPaise > primary.totalBilledPaise)) {
      primary.totalBilledPaise = batch.totalBilledPaise;
    }
  }

  primary.items = dedupeRepeatedHeaders(allItems);
  return primary;
}

/**
 * Client-side processor to render PDF pages into images, enforce the 20-page cap,
 * batch images into < 4 MB requests, and merge results.
 */
export async function processPdfOrImage(
  file: File,
  options?: {
    docType?: 'hospital_bill' | 'tpa_settlement';
    onProgress?: BatchProgressCallback;
    apiKey?: string;
  }
): Promise<any> {
  const docType = options?.docType || 'hospital_bill';
  const progress = options?.onProgress || (() => {});

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  // If not PDF (single image file)
  if (!isPdf) {
    const maxMb = 4;
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 4 MB maximum.`);
    }

    progress(1, 1, 'Extracting document...');
    let data: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', docType);

        const headers: Record<string, string> = {};
        if (options?.apiKey) {
          headers['x-gemini-key'] = options.apiKey;
        }

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
          headers,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const code = err.error?.code || 'UPSTREAM';
          const msg = err.error?.message || `Extraction failed with HTTP ${res.status}`;
          throw new Error(`[${code}] ${msg}`);
        }

        data = await res.json();
        break;
      } catch (e: any) {
        lastError = e;
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    if (!data) {
      throw lastError || new Error('Extraction failed.');
    }

    if (Array.isArray(data.items)) {
      data.items = dedupeRepeatedHeaders(data.items);
    }
    return data;
  }

  // PDF processing with pdfjs-dist
  progress(0, 10, 'Loading PDF document...');
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source if in browser
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  if (numPages > 20) {
    throw new Error(
      `PDF exceeds 20-page limit (found ${numPages} pages). Please submit itemized hospital bills of 20 pages or fewer.`
    );
  }

  // Render pages to image blobs
  const pageBlobs: Blob[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    progress(pageNum, numPages, `Rendering page ${pageNum} of ${numPages}...`);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas 2D context not supported on this browser.');
    }

    await (page.render as any)({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82)
    );

    if (!blob) {
      throw new Error(`Failed to convert page ${pageNum} to image.`);
    }

    pageBlobs.push(blob);
  }

  // Group pages into batches strictly under 4 MB (3.5 MB safety margin)
  const MAX_BATCH_BYTES = 3.5 * 1024 * 1024;
  const batches: Blob[][] = [];
  let currentBatch: Blob[] = [];
  let currentBatchSize = 0;

  for (const blob of pageBlobs) {
    if (currentBatch.length > 0 && currentBatchSize + blob.size > MAX_BATCH_BYTES) {
      batches.push(currentBatch);
      currentBatch = [blob];
      currentBatchSize = blob.size;
    } else {
      currentBatch.push(blob);
      currentBatchSize += blob.size;
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  const extractedBatches: any[] = [];
  const batchWarnings: string[] = [];
  let totalProcessedPages = 0;

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batchPages = batches[bIdx];
    progress(bIdx + 1, batches.length, `Extracting batch ${bIdx + 1} of ${batches.length}...`);

    for (let pIdx = 0; pIdx < batchPages.length; pIdx++) {
      totalProcessedPages++;
      const pageNum = totalProcessedPages;
      const pageBlob = batchPages[pIdx];

      let pageExtracted: any = null;
      let lastPageError: any = null;

      // Retry failed batch/page once
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const formData = new FormData();
          formData.append('file', pageBlob, `page_${pageNum}.jpg`);
          formData.append('docType', docType);

          const headers: Record<string, string> = {};
          if (options?.apiKey) {
            headers['x-gemini-key'] = options.apiKey;
          }

          const res = await fetch('/api/extract', {
            method: 'POST',
            body: formData,
            headers,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const code = err.error?.code || 'UPSTREAM';
            const msg = err.error?.message || `Extraction failed on page ${pageNum} with status ${res.status}`;
            throw new Error(`[${code}] ${msg}`);
          }

          pageExtracted = await res.json();
          break;
        } catch (e: any) {
          lastPageError = e;
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }

      if (pageExtracted) {
        extractedBatches.push(pageExtracted);
      } else {
        batchWarnings.push(
          `Page ${pageNum} failed to extract (${lastPageError?.message || 'Upstream error'}). Partial results from other pages are displayed.`
        );
      }
    }
  }

  if (extractedBatches.length === 0) {
    throw new Error(
      batchWarnings[0] || 'Extraction failed for all pages of this document. Please check the API key and try again.'
    );
  }

  progress(batches.length, batches.length, 'Merging results and deduplicating headers...');
  const merged = mergeExtractedBatches(extractedBatches);
  if (batchWarnings.length > 0) {
    merged.warnings = [...(merged.warnings || []), ...batchWarnings];
  }
  return merged;
}
