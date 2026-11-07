import zlib from "zlib";
import { ExtractedBill, ExtractedLineItem, RoomCategoryEnum } from "./schemas";

/**
 * Extracts raw text from uncompressed or FlateDecode-compressed PDF streams.
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const chunks: string[] = [];
  let pos = 0;
  let hasDecompressedStream = false;

  // 1. Iterate over all streams in the PDF
  while (pos < buffer.length) {
    const streamMarker = buffer.indexOf("stream", pos);
    if (streamMarker === -1) break;

    let dataStart = streamMarker + 6;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) {
      dataStart += 1;
    }

    const endstreamMarker = buffer.indexOf("endstream", dataStart);
    if (endstreamMarker === -1) break;

    const streamData = buffer.subarray(dataStart, endstreamMarker);

    let decompressed: Buffer | null = null;
    try {
      decompressed = zlib.inflateSync(streamData);
      hasDecompressedStream = true;
    } catch {
      try {
        decompressed = zlib.inflateRawSync(streamData);
        hasDecompressedStream = true;
      } catch {
        decompressed = streamData;
      }
    }

    if (decompressed) {
      chunks.push(decompressed.toString("latin1"));
    }

    pos = endstreamMarker + 9;
  }

  // If no compressed streams were decompressed, use raw buffer
  if (!hasDecompressedStream) {
    chunks.push(buffer.toString("latin1"));
  }
  const combined = chunks.join("\n");

  // Extract all literal strings from PDF operators: (text) Tj, (text) ', (text) "
  // Handle escaped parentheses: \( and \)
  const extractedLines: string[] = [];
  
  // Regex to match ( ... ) that are followed by Tj, ', ", or inside TJ array
  // In PDF, a string starts with ( and ends with unescaped )
  let i = 0;
  while (i < combined.length) {
    if (combined[i] === "(") {
      let str = "";
      let j = i + 1;
      let depth = 1;
      while (j < combined.length && depth > 0) {
        if (combined[j] === "\\" && j + 1 < combined.length) {
          str += combined[j + 1];
          j += 2;
        } else if (combined[j] === "(") {
          depth++;
          str += "(";
          j++;
        } else if (combined[j] === ")") {
          depth--;
          if (depth > 0) str += ")";
          j++;
        } else {
          str += combined[j];
          j++;
        }
      }
      if (str.trim().length > 0) {
        extractedLines.push(str.trim());
      }
      i = j;
    } else {
      i++;
    }
  }

  return extractedLines.join(" ");
}

/**
 * Universal Digital PDF Text Parser (Deterministic Fallback)
 * Parses synthetic / digital hospital bills directly from PDF text.
 */
export function parseDigitalBillPdfText(buffer: Buffer): ExtractedBill | null {
  try {
    const text = extractTextFromPdfBuffer(buffer);
    if (!text || text.length < 20) {
      return null;
    }

    // 1. Bill ID: regex /Bill No:\s*([A-Z0-9-]+)/i
    const billIdMatch = text.match(/Bill\s*No:\s*([A-Z0-9-]+)/i);
    const billId = billIdMatch ? billIdMatch[1].trim() : `SYN-${Date.now()}`;

    // 2. Patient Name: regex /Patient:\s*(.+?)\s+Bill No:/i or fallback
    const patientMatch = text.match(/Patient:\s*(.+?)(?:\s+Bill\s*No:|\s*Bill\s*ID:|\s*Admission:|$)/i);
    const patientNameRedacted = patientMatch ? patientMatch[1].trim() : "Patient (Redacted - Synthetic)";

    // 3. Dates
    const admMatch = text.match(/Admission:\s*(\d{4}-\d{2}-\d{2})/i);
    const admissionDate = admMatch ? admMatch[1] : null;

    const disMatch = text.match(/Discharge:\s*(\d{4}-\d{2}-\d{2})/i);
    const dischargeDate = disMatch ? disMatch[1] : null;

    // 4. Room Category
    const roomMatch = text.match(/Room\s*category:\s*([A-Z_+\s]+?)(?:\s*Line|\s*S\.No|\s*#|\s*Admission|$)/i);
    let roomCategory: "GENERAL_WARD" | "TWIN_SHARING" | "SINGLE_PRIVATE" | "ICU" | "NICU_PICU" | "DAY_CARE" | "UNKNOWN" = "UNKNOWN";
    const roomStr = roomMatch ? roomMatch[1].toUpperCase() : text.toUpperCase();
    if (roomStr.includes("ICU")) {
      roomCategory = "ICU";
    } else if (roomStr.includes("SINGLE") || roomStr.includes("PVT") || roomStr.includes("PRIVATE")) {
      roomCategory = "SINGLE_PRIVATE";
    } else if (roomStr.includes("TWIN") || roomStr.includes("SHARING")) {
      roomCategory = "TWIN_SHARING";
    } else if (roomStr.includes("GENERAL") || roomStr.includes("WARD")) {
      roomCategory = "GENERAL_WARD";
    }

    // 5. Hospital Name: line or text before ITEMIZED BILL
    let hospitalName = "Sample Metro Care Hospital (Synthetic Demo)";
    const hospMatch = text.match(/([A-Za-z0-9\s.,()-]+?)\s+ITEMIZED\s+BILL/i);
    if (hospMatch && hospMatch[1].trim().length > 3) {
      hospitalName = hospMatch[1].trim();
    } else if (text.includes("Sample Metro Care Hospital")) {
      hospitalName = "Sample Metro Care Hospital (Synthetic Demo)";
    } else if (text.includes("City Life Multi-Care")) {
      hospitalName = "City Life Multi-Care Hospital (Synthetic Demo)";
    } else if (text.includes("Apex Joint & Spine")) {
      hospitalName = "Apex Joint & Spine Specialty Center (Synthetic Demo)";
    } else if (text.includes("City Health General")) {
      hospitalName = "City Health General Hospital (Synthetic Demo)";
    }

    // 6. Table Rows
    // Regex: /(\d+)\s+(\d{4}-\d{2}-\d{2})\s+([\s\S]+?)\s+([A-Z0-9-]+)\s+(DAY|VISIT|TEST|UNIT|VIAL|PACK|TABLET|STRIP|ML)\s+(\d+)\s+Rs\.\s*([\d,]+)\s+Rs\.\s*([\d,]+)/g
    const lineItems: ExtractedLineItem[] = [];
    const rowRegex = /(\d+)\s+(\d{4}-\d{2}-\d{2})\s+([\s\S]+?)\s+([A-Z0-9-]+)\s+(DAY|VISIT|TEST|UNIT|VIAL|PACK|TABLET|STRIP|ML)\s+(\d+)\s+Rs\.\s*([\d,]+)\s+Rs\.\s*([\d,]+)/gi;

    let rowMatch: RegExpExecArray | null;
    let idx = 1;
    const seenRowKeys = new Set<string>();
    while ((rowMatch = rowRegex.exec(text)) !== null) {
      const rowNum = rowMatch[1];
      const serviceDate = rowMatch[2];
      const rawLabel = rowMatch[3].trim().replace(/\s+/g, " ");
      const code = rowMatch[4].trim();

      const dedupeKey = `${rowNum}_${serviceDate}_${code}`;
      if (seenRowKeys.has(dedupeKey)) continue;
      seenRowKeys.add(dedupeKey);
      const unit = rowMatch[5].toUpperCase() as any;
      const quantity = parseInt(rowMatch[6], 10);
      const unitPrice = parseFloat(rowMatch[7].replace(/,/g, ""));
      const totalBilled = parseFloat(rowMatch[8].replace(/,/g, ""));

      // Infer category from code or label
      let category: ExtractedLineItem["category"] = "OTHER";
      const uLabel = rawLabel.toUpperCase();
      const uCode = code.toUpperCase();

      if (uCode.startsWith("RM-") || uCode.startsWith("BED-") || uLabel.includes("ROOM RENT") || uLabel.includes("BED CHARGES")) {
        category = "ROOM_RENT";
      } else if (uCode.startsWith("IMP-") || uLabel.includes("STENT") || uLabel.includes("IMPLANT")) {
        category = "IMPLANT_DEVICE";
      } else if (uCode.startsWith("PR-") || uCode.startsWith("OT-") || uLabel.includes("PROCEDURE") || uLabel.includes("ANGIOPLASTY") || uLabel.includes("OT CHARGES")) {
        category = "PROCEDURE_OT";
      } else if (uCode.startsWith("CON-") && (unit === "VISIT" || uLabel.includes("VISIT") || uLabel.includes("CONSULTATION")) || uCode.startsWith("DOC-")) {
        category = "CONSULTATION";
      } else if (uCode.startsWith("NUR-") || uCode.startsWith("MON-") || uLabel.includes("NURSING") || uLabel.includes("MONITOR")) {
        category = "NURSING_MONITORING";
      } else if (uCode.startsWith("LAB-") || uCode.startsWith("DX-") || uCode.startsWith("RAD-") || uLabel.includes("TEST") || uLabel.includes("ECG") || uLabel.includes("X-RAY") || uLabel.includes("COUNT")) {
        category = "DIAGNOSTICS_LAB";
      } else if (uCode.startsWith("MED-") || uCode.startsWith("PH-") || uLabel.includes("INFUSION") || uLabel.includes("MEDICINE") || uLabel.includes("PHARMACY") || uLabel.includes("FLUIDS")) {
        category = "MEDICINE";
      } else if (uCode.startsWith("CON-") || uLabel.includes("GLOVES") || uLabel.includes("SYRINGES") || uLabel.includes("SWABS") || uLabel.includes("CANNULA") || uLabel.includes("CONSUMABLE")) {
        category = "CONSUMABLE";
      }

      lineItems.push({
        id: `parsed-row-${idx++}`,
        rawLabel,
        code,
        serviceDate,
        category,
        unit,
        quantity,
        unitPrice,
        totalBilled,
        tpaDeductedAmount: 0,
        tpaDeductionReason: null,
      });
    }

    if (lineItems.length === 0) {
      // If table row regex didn't match, return null to allow caller to fall back
      return null;
    }

    return {
      billId,
      isSample: false,
      isSynthetic: true,
      hospitalName,
      patientNameRedacted,
      admissionDate,
      dischargeDate,
      roomCategory,
      lineItems,
    };
  } catch (err) {
    console.error("parseDigitalBillPdfText error:", err);
    return null;
  }
}
