import { describe, it, expect } from "vitest";
import jsPDF from "jspdf";
import { parseDigitalBillPdfText } from "../src/lib/pdfParser";

describe("ClaimKavach - Universal Digital PDF Text Parser", () => {
  it("extracts header dates, hospital name, bill ID, room category, and line items from a digital PDF", () => {
    const doc = new jsPDF();
    doc.text("Sample Metro Care Hospital (Synthetic Demo)", 10, 10);
    doc.text("ITEMIZED BILL", 10, 20);
    doc.text("Patient: Patient (Redacted - Synthetic)   Bill No: SYN-3334", 10, 30);
    doc.text("Admission: 2026-03-10   Discharge: 2026-03-14", 10, 40);
    doc.text("Room category: ICU", 10, 50);
    doc.text("1 2026-03-10 ICU room rent RM-ICU DAY 2 Rs. 12,000 Rs. 24,000", 10, 60);
    doc.text("2 2026-03-10 Private single room rent RM-PVT DAY 2 Rs. 6,000 Rs. 12,000", 10, 70);
    doc.text("3 2026-03-10 Coronary stent - Drug Eluting Stent (DES), 1 unit IMP-DES UNIT 1 Rs. 110,000 Rs. 110,000", 10, 80);

    const pdfBuf = Buffer.from(doc.output("arraybuffer"));
    const parsed = parseDigitalBillPdfText(pdfBuf);

    expect(parsed).not.toBeNull();
    expect(parsed?.billId).toBe("SYN-3334");
    expect(parsed?.hospitalName).toBe("Sample Metro Care Hospital (Synthetic Demo)");
    expect(parsed?.patientNameRedacted).toContain("Patient (Redacted - Synthetic)");
    expect(parsed?.admissionDate).toBe("2026-03-10");
    expect(parsed?.dischargeDate).toBe("2026-03-14");
    expect(parsed?.roomCategory).toBe("ICU");
    expect(parsed?.lineItems.length).toBe(3);

    const [item1, item2, item3] = parsed!.lineItems;
    expect(item1.rawLabel).toBe("ICU room rent");
    expect(item1.code).toBe("RM-ICU");
    expect(item1.unit).toBe("DAY");
    expect(item1.quantity).toBe(2);
    expect(item1.unitPrice).toBe(12000);
    expect(item1.totalBilled).toBe(24000);

    expect(item3.rawLabel).toContain("Coronary stent");
    expect(item3.code).toBe("IMP-DES");
    expect(item3.unit).toBe("UNIT");
    expect(item3.quantity).toBe(1);
    expect(item3.unitPrice).toBe(110000);
    expect(item3.totalBilled).toBe(110000);
  });
});
