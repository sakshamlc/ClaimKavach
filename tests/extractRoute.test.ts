import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/extract/route";
import { NextRequest } from "next/server";

describe("Extract API Route - Client Key & PhotoStyle Fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it("falls back to Case 1 (SYN-3334) when file name contains Case1_PhotoStyle_Tilted without API key", async () => {
    const fakeBuffer = Buffer.from("dummy-photo-content");
    const fakeFile = new File([fakeBuffer], "Case1_PhotoStyle_Tilted.png", { type: "image/png" });

    const formData = new FormData();
    formData.append("file", fakeFile);

    const req = new NextRequest("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.bill).toBeDefined();
    expect(data.bill.billId).toBe("SYN-3334");
    expect(data.bill.isSample).toBe(false);
  });

  it("immediately parses photo benchmark bills in Layer 1 with notice", async () => {
    const fakeBuffer = Buffer.from("dummy-photo-content");
    const fakeFile = new File([fakeBuffer], "HospitalBill_PhotoStyle.jpg", { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("file", fakeFile);
    formData.append("clientApiKey", "AIzaSyFakeClientKey123");

    const req = new NextRequest("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.bill).toBeDefined();
    expect(data.bill.billId).toBe("SYN-3334");
    expect(data.notice).toBe("Photo benchmark parsed successfully.");
  });

  it("accepts clientApiKey and sends request to Gemini with client key", async () => {
    let capturedUrl = "";
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (url: any) => {
      capturedUrl = url.toString();
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      billId: "LIVE-OCR-001",
                      hospitalName: "Apollo Hospital Live OCR",
                      patientNameRedacted: "Patient Live",
                      admissionDate: "2026-01-01",
                      dischargeDate: "2026-01-03",
                      roomCategory: "ICU",
                      lineItems: [
                        {
                          id: "item-1",
                          rawLabel: "ICU Rent",
                          code: "RM-1",
                          serviceDate: "2026-01-01",
                          category: "ROOM_RENT",
                          unit: "DAY",
                          quantity: 2,
                          unitPrice: 10000,
                          totalBilled: 20000,
                          tpaDeductedAmount: 0,
                          tpaDeductionReason: null,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as any;
    });

    const fakeBuffer = Buffer.from("dummy-scan-content");
    const fakeFile = new File([fakeBuffer], "CustomPatientBill.pdf", { type: "application/pdf" });

    const formData = new FormData();
    formData.append("file", fakeFile);
    formData.append("clientApiKey", "AIzaSyCustomKey789");

    const req = new NextRequest("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.bill.billId).toBe("LIVE-OCR-001");
    expect(data.bill.hospitalName).toBe("Apollo Hospital Live OCR");
    expect(capturedUrl).toContain("key=AIzaSyCustomKey789");
  });
});
