'use client';

import React, { useState } from 'react';
import type { MedicalBill, AuditReport } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
import {
  FileText,
  Copy,
  Check,
  Printer,
  Building2,
  ShieldCheck,
  Send,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface DisputePackProps {
  bill: MedicalBill;
  report: AuditReport;
}

export function DisputePack({ bill, report }: DisputePackProps) {
  const [activeTab, setActiveTab] = useState<'hospital' | 'insurer' | 'bima_bharosa' | 'ombudsman'>('hospital');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hospitalName = bill.hospital.name || '[Hospital Name]';
  const billDate = bill.billDate || '[Bill Date]';
  const billId = bill.id || '[Bill Number]';
  const totalBilled = formatINR(report.totals.billed);
  const confirmedOvercharge = formatINR(report.totals.confirmed);
  const likelyOvercharge = formatINR(report.totals.likely);
  const fairAmount = formatINR(report.totals.fair);

  // Collect ceiling and arithmetic findings
  const ceilingFindings = report.findings.filter(
    (f) => f.ruleId === 'R-NPPA-01' && (f.verdict === 'CONFIRMED_OVERCHARGE' || f.verdict === 'LIKELY_ISSUE')
  );
  const mathFindings = report.findings.filter(
    (f) => (f.ruleId === 'R-MATH-01' || f.ruleId === 'R-TOTAL-01') && f.amount > 0
  );
  const deductionFindings = report.findings.filter(
    (f) => f.ruleId === 'R-ANX-01' || f.ruleId === 'R-BUNDLE-01'
  );

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Draft 1: Hospital Clarification & DPCO Refund Letter
  const hospitalLetter = `To,
The Billing In-Charge / Medical Superintendent,
${hospitalName}

Date: ${new Date().toLocaleDateString('en-IN')}
Subject: Request for itemized clarification and statutory ceiling review for Inpatient Bill No. ${billId}

Dear Sir / Madam,

Patient Name: [Patient Name]
Inpatient / IPD No.: [IPD Registration Number]
Date of Admission: ${bill.stay.admissionDate || '[Admission Date]'}
Date of Discharge: ${bill.stay.dischargeDate || '[Discharge Date]'}
Total Billed Amount: ${totalBilled}

I am writing to formally request an itemized review and clarification regarding specific charges billed on the final hospital invoice referenced above.

Upon review against notified statutory price ceilings published by the National Pharmaceutical Pricing Authority (NPPA), Department of Pharmaceuticals, Government of India:

1. Statutory Price Ceilings (Drugs (Prices Control) Order, 2013):
${
  ceilingFindings.length > 0
    ? ceilingFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. Item: "${f.title || f.itemId}"\n      - Billed Rate: ${f.actual !== undefined ? formatINR(f.actual) : 'N/A'}\n      - Notified Statutory Benchmark: ${f.expected !== undefined ? formatINR(f.expected) : 'N/A'}\n      - Questioned Difference: ${formatINR(f.amount)}\n      - Statutory Authority: ${f.citation.instrument} (${f.citation.kind === 'REGULATORY' && f.citation.instrumentNumber ? f.citation.instrumentNumber : 'NPPA Gazette Order'}, ${f.citation.kind === 'REGULATORY' && f.citation.sourceRef ? f.citation.sourceRef : ''})`
        )
        .join('\n\n')
    : '   - Please confirm that all scheduled formulations and coronary stents adhere strictly to NPPA notified ceilings.'
}

${
  mathFindings.length > 0
    ? `2. Arithmetic Consistency:\n` +
      mathFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. ${f.title}: Billed ${f.actual !== undefined ? formatINR(f.actual) : 'N/A'}, Expected ${f.expected !== undefined ? formatINR(f.expected) : 'N/A'} (Difference: ${formatINR(f.amount)})`
        )
        .join('\n')
    : ''
}

Under the provisions of the Drugs (Prices Control) Order, 2013 and relevant NPPA notifications, scheduled medicines and medical devices may not be billed above the notified statutory ceiling plus applicable taxes.

Kindly issue a revised, corrected final bill and arrange for the refund or adjustment of excess charges amounting to ${confirmedOvercharge !== '₹0.00' ? confirmedOvercharge : likelyOvercharge} within 7 working days.

Thank you.

Yours sincerely,
[Patient / Policyholder Name]
Contact Phone: [Phone Number]
Email Address: [Email Address]
Address: [Postal Address]`;

  // Draft 2: Insurer Grievance Redressal Officer (GRO) Representation
  const insurerLetter = `To,
The Grievance Redressal Officer (GRO),
[Name of Health Insurance Company]
[Branch / Corporate Office Address]

Date: ${new Date().toLocaleDateString('en-IN')}
Subject: Representation regarding arbitrary claim deductions for Claim No. [Claim Number] / Policy No. [Policy Number]

Dear Sir / Madam,

Policyholder Name: [Policyholder Name]
Patient Name: [Patient Name]
Policy Number: [Policy Number]
Claim Number: [Claim Number]
Hospital: ${hospitalName}
Total Hospital Bill: ${totalBilled}
Deduction Amount Questioned: [Total Deducted Amount]

I am writing to formally submit a grievance against deductions applied on the claim settlement letter dated [Settlement Date] for the hospitalization referenced above.

The deduction summary indicates that certain items were disallowed as "non-medical expenses" or "subsumed items". In this regard, please note:

1. Compliance with IRDAI Master Circular (Annexure-I):
   - The Insurance Regulatory and Development Authority of India (IRDAI) specifies non-payable items in Annexure-I.
   - Deductions must strictly reference the specific clause of the policy terms and conditions or statutory circulars.
   - Items essential to standard medical procedures that are not expressly listed as excluded in the policy contract cannot be arbitrarily deducted.

${
  deductionFindings.length > 0
    ? `2. Specific Questioned Items:\n` +
      deductionFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. Item: "${f.title || f.itemId}" — Deducted: ${formatINR(f.amount)}\n      Explanation: ${f.explanation.en}`
        )
        .join('\n\n')
    : ''
}

I request you to re-examine these deductions under the IRDAI (Protection of Policyholders' Interests) Regulations, 2017, and remit the balance settlement amount to my registered bank account within the statutory 30-day timeline.

Thank you.

Yours sincerely,
[Policyholder Name]
Policy Number: [Policy Number]
Registered Mobile: [Mobile Number]
Registered Email: [Email Address]`;

  // Draft 3: Bima Bharosa Portal Text
  const bimaBharosaText = `Complaint Summary for Bima Bharosa Portal (bimabharosa.irdai.gov.in):

1. Policy Type: Health Insurance
2. Insurer Name: [Name of Insurance Company]
3. Policy Number: [Policy Number]
4. Claim Number: [Claim Number]
5. Hospital: ${hospitalName}
6. Dates of Hospitalization: ${bill.stay.admissionDate || '[Admission]'} to ${bill.stay.dischargeDate || '[Discharge]'}
7. Disputed Deduction Amount: [Amount in ₹]

Grievance Description:
I am filing this complaint following unsatisfactory response / lack of resolution from the insurer's Grievance Redressal Officer (GRO) regarding arbitrary claim deductions on Claim No. [Claim Number].

The insurer deducted [Deducted Amount] attributing charges to "non-payable" or "proportionate deduction" categories without transparent itemized justification under IRDAI Master Circular guidelines (Annexure-I). Furthermore, essential inpatient supplies were disallowed despite being medically necessary for inpatient treatment.

I request IRDAI intervention to direct the insurer to review the claim settlement and pay the lawful balance claim amount.`;

  // Draft 4: Insurance Ombudsman Formal Complaint
  const ombudsmanLetter = `To,
The Insurance Ombudsman,
Office of the Insurance Ombudsman,
[City / Regional Jurisdiction Address]

Date: ${new Date().toLocaleDateString('en-IN')}
Subject: Formal Complaint under Rule 14 of the Insurance Ombudsman Rules, 2017

Complainant Name: [Complainant Name]
Insured / Patient Name: [Patient Name]
Insurance Company: [Name of Insurer]
Policy Number: [Policy Number]
Claim Number: [Claim Number]
Date of Representation to Insurer GRO: [Date Representation Sent]
Date of Rejection / Expiry of 30 days: [Date]

Respected Ombudsman,

1. Facts of the Case:
The complainant holds health insurance policy No. [Policy Number] issued by [Name of Insurer]. The insured underwent inpatient treatment at ${hospitalName} from ${bill.stay.admissionDate || '[Date]'} to ${bill.stay.dischargeDate || '[Date]'}. Total medical bills incurred were ${totalBilled}.

2. Ground of Grievance:
The insurer settled only [Settled Amount] and wrongfully repudiated / deducted [Disputed Amount]. The deductions made by the insurer / TPA violate the IRDAI Master Circular on Health Insurance and standard policy provisions.

3. Representation to Insurer:
The complainant represented this matter to the Grievance Redressal Officer (GRO) of the insurer on [Date]. Either the insurer rejected the representation or more than 30 days have elapsed without resolution.

4. Relief Sought:
I pray for an award directing the insurer to pay the unpaid claim balance of [Disputed Amount] along with applicable interest under the Insurance Ombudsman Rules, 2017.

Verification:
I verify that no complaint on the same subject matter is pending before any Court or Consumer Forum.

Yours faithfully,
[Complainant Name]
Signature: ______________________
Phone: [Phone Number]
Email: [Email Address]`;

  const tabs = [
    { id: 'hospital', label: '1. Hospital Billing Query', doc: hospitalLetter },
    { id: 'insurer', label: '2. Insurer GRO Notice', doc: insurerLetter },
    { id: 'bima_bharosa', label: '3. Bima Bharosa Draft', doc: bimaBharosaText },
    { id: 'ombudsman', label: '4. Insurance Ombudsman', doc: ombudsmanLetter },
  ] as const;

  const currentDoc = tabs.find((t) => t.id === activeTab)?.doc || '';

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6 shadow-xs font-sans">
      {/* Header & Escalation Flow */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Patient Dispute Pack & Escalation Drafts</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Pre-filled formal notices based on statutory findings. Copy to clipboard or print to PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 transition-colors self-start sm:self-auto print:hidden"
          >
            <Printer className="w-4 h-4" />
            <span>Print Dispute Draft</span>
          </button>
        </div>

        {/* Escalation Hierarchy Flow Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
          <span className="font-bold text-slate-900 block mb-1">
            Standard Escalation Sequence in India:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px] mt-2 font-medium">
            <div className={`p-2 rounded border ${activeTab === 'hospital' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">Step 1: Hospital</span>
              <span className="text-[10px] opacity-80">Clarification (24-48h)</span>
            </div>
            <div className={`p-2 rounded border ${activeTab === 'insurer' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">Step 2: Insurer GRO</span>
              <span className="text-[10px] opacity-80">Statutory 30-day window</span>
            </div>
            <div className={`p-2 rounded border ${activeTab === 'bima_bharosa' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">Step 3: Bima Bharosa</span>
              <span className="text-[10px] opacity-80">IRDAI regulatory portal</span>
            </div>
            <div className={`p-2 rounded border ${activeTab === 'ombudsman' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">Step 4: Ombudsman</span>
              <span className="text-[10px] opacity-80">Binding quasi-judicial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2 print:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document View & Copy Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted print:hidden">
          <span>
            Highlighted brackets <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono">[like this]</code> indicate details to verify before sending.
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(currentDoc, activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all shadow-xs"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Draft Text</span>
              </>
            )}
          </button>
        </div>

        {/* Rendered Text Box */}
        <pre className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-inner">
          {currentDoc}
        </pre>
      </div>
    </div>
  );
}
