'use client';

import React, { useState } from 'react';
import type { MedicalBill, AuditReport } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';
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
  ShieldAlert,
} from 'lucide-react';

export function generateHospitalLetter(bill: MedicalBill, report: AuditReport): string {
  const hospitalName = bill.hospital.name || '[Hospital Name]';
  const billId = bill.id || '[Bill Number]';
  const totalBilled = formatINR(report.totals.billed);
  const confirmedOvercharge = formatINR(report.totals.confirmed);
  const likelyOvercharge = formatINR(report.totals.likely);

  const ceilingFindings = report.findings.filter(
    (f) => f.ruleId === 'R-NPPA-01' && (f.verdict === 'CONFIRMED_OVERCHARGE' || f.verdict === 'LIKELY_ISSUE')
  );
  const mathFindings = report.findings.filter(
    (f) => (f.ruleId === 'R-MATH-01' || f.ruleId === 'R-TOTAL-01') && f.amount > 0
  );

  return `To,
The Billing In-Charge / Medical Superintendent,
${hospitalName}

Date: [Date]
Subject: Request for itemized clarification and statutory ceiling review for Inpatient Bill No. ${billId}

Dear Sir / Madam,

Patient Name: [Patient Name]
Inpatient / IPD No.: [IPD Registration Number]
Date of Admission: ${bill.stay.admissionDate || '[Admission Date]'}
Date of Discharge: ${bill.stay.dischargeDate || '[Discharge Date]'}
Total Billed Amount: ${totalBilled}

I am writing to formally request an itemized review and clarification regarding specific charges billed on the final hospital invoice referenced above.

Upon review against notified price ceilings published in official gazette notifications:

1. Regulatory Price Benchmark Review:
${
  ceilingFindings.length > 0
    ? ceilingFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. Item: "${f.title || f.itemId}"\n      - Billed Rate: ${f.actual !== undefined ? formatINR(f.actual) : 'N/A'}\n      - Notified Reference Ceiling: ${f.expected !== undefined ? formatINR(f.expected) : 'N/A'}\n      - Questioned Difference: ${formatINR(f.amount)}\n      - Source Document: ${f.citation.instrument}${f.citation.kind === 'REGULATORY' && f.citation.instrumentNumber ? ` (${f.citation.instrumentNumber})` : ''}${f.citation.kind === 'REGULATORY' && f.citation.sourceRef ? `, Ref: ${f.citation.sourceRef}` : ''}`
        )
        .join('\n\n')
    : '   - Please confirm that all scheduled formulations and implants adhere strictly to notified government benchmarks.'
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

Under applicable statutory notifications, scheduled items may not be billed above the notified price ceiling plus applicable taxes.

Kindly issue a revised, corrected final bill and arrange for the refund or adjustment of excess charges amounting to ${confirmedOvercharge !== '₹0.00' ? confirmedOvercharge : likelyOvercharge} within 7 working days.

Thank you.

Yours sincerely,
[Patient / Policyholder Name]
Contact Phone: [Phone Number]
Email Address: [Email Address]
Address: [Postal Address]`;
}

export function generateInsurerLetter(bill: MedicalBill, report: AuditReport): string {
  const hospitalName = bill.hospital.name || '[Hospital Name]';
  const totalBilled = formatINR(report.totals.billed);

  const deductionFindings = report.findings.filter(
    (f) => f.ruleId === 'R-ANX-01' || f.ruleId === 'R-BUNDLE-01'
  );

  return `To,
The Grievance Redressal Officer (GRO),
[Name of Health Insurance Company]
[Branch / Corporate Office Address]

Date: [Date]
Subject: Representation regarding claim deductions for Claim No. [Claim Number] / Policy No. [Policy Number]

Dear Sir / Madam,

Policyholder Name: [Policyholder Name]
Patient Name: [Patient Name]
Policy Number: [Policy Number]
Claim Number: [Claim Number]
Hospital: ${hospitalName}
Total Hospital Bill: ${totalBilled}
Deduction Amount Questioned: [Total Deducted Amount]

I am writing to formally submit a representation regarding deductions applied on the claim settlement letter dated [Settlement Date] for the hospitalization referenced above.

The deduction summary indicates that certain charges were disallowed. In this regard:

1. Verification of Non-Payable & Deducted Charges:
   - Deductions must strictly reference the specific exclusion clauses in the policy contract or applicable regulatory guidance.
   - Items essential to inpatient treatment that are not explicitly excluded in the agreed policy terms should not be arbitrarily deducted.

${
  deductionFindings.length > 0
    ? `2. Specific Questioned Items:\n` +
      deductionFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. Item: "${f.title || f.itemId}" — Deducted: ${formatINR(f.amount)}\n      Explanation: ${f.explanation.en}\n      Source Reference: ${f.citation.instrument}${f.citation.kind === 'REGULATORY' && f.citation.sourceRef ? ` (${f.citation.sourceRef})` : ''}`
        )
        .join('\n\n')
    : ''
}

I request you to re-examine these deductions against the policy contract and remit the admissible balance amount to my registered bank account.

Thank you.

Yours sincerely,
[Policyholder Name]
Policy Number: [Policy Number]
Registered Mobile: [Mobile Number]
Registered Email: [Email Address]`;
}

export function generateBimaBharosaText(bill: MedicalBill, report: AuditReport): string {
  const hospitalName = bill.hospital.name || '[Hospital Name]';

  return `Complaint Summary for Bima Bharosa Portal (bimabharosa.irdai.gov.in):

1. Policy Type: Health Insurance
2. Insurer Name: [Name of Insurance Company]
3. Policy Number: [Policy Number]
4. Claim Number: [Claim Number]
5. Hospital: ${hospitalName}
6. Dates of Hospitalization: ${bill.stay.admissionDate || '[Admission]'} to ${bill.stay.dischargeDate || '[Discharge]'}
7. Disputed Deduction Amount: [Amount in ₹]

Grievance Description:
I am filing this complaint following lack of resolution from the insurer's Grievance Redressal Officer (GRO) regarding claim deductions on Claim No. [Claim Number].

The insurer deducted [Deducted Amount] attributing charges to non-payable or proportionate deduction heads without transparent justification. Essential inpatient items and medical supplies appear to have been disallowed without explicit contractual support.

I request regulatory intervention to direct the insurer to review the claim settlement and pay the lawful balance claim amount.`;
}

export function generateOmbudsmanLetter(bill: MedicalBill, report: AuditReport): string {
  const hospitalName = bill.hospital.name || '[Hospital Name]';
  const totalBilled = formatINR(report.totals.billed);

  return `To,
The Insurance Ombudsman,
Office of the Insurance Ombudsman,
[City / Regional Jurisdiction Address]

Date: [Date]
Subject: Formal Complaint regarding unsettled health insurance claim deductions

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
The insurer settled only [Settled Amount] and disallowed [Disputed Amount]. The deductions made by the insurer / TPA appear inconsistent with applicable health insurance terms and standard guidelines.

3. Prior Representation to Insurer:
The complainant represented this matter to the Grievance Redressal Officer (GRO) of the insurer on [Date]. More than 30 days have elapsed without satisfactory resolution, or the representation was repudiated without adequate justification.

4. Relief Sought:
I request an award directing the insurer to pay the unpaid claim balance of [Disputed Amount] along with any applicable interest in accordance with grievance redressal norms.

Verification:
I verify that no complaint on the same subject matter is currently pending before any Court or Consumer Forum.

Yours faithfully,
[Complainant Name]
Signature: ______________________
Phone: [Phone Number]
Email: [Email Address]`;
}

export function generateAllDisputeDrafts(bill: MedicalBill, report: AuditReport) {
  return [
    { id: 'hospital', label: '1. Hospital Billing Query', text: generateHospitalLetter(bill, report) },
    { id: 'insurer', label: '2. Insurer GRO Notice', text: generateInsurerLetter(bill, report) },
    { id: 'bima_bharosa', label: '3. Bima Bharosa Draft', text: generateBimaBharosaText(bill, report) },
    { id: 'ombudsman', label: '4. Insurance Ombudsman', text: generateOmbudsmanLetter(bill, report) },
  ] as const;
}

interface DisputePackProps {
  bill: MedicalBill;
  report: AuditReport;
}

export function DisputePack({ bill, report }: DisputePackProps) {
  const [activeTab, setActiveTab] = useState<'hospital' | 'insurer' | 'bima_bharosa' | 'ombudsman'>('hospital');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const language = useClaimStore((state) => state.language);
  const t = claimTranslations[language] || claimTranslations.en;

  const tabs = generateAllDisputeDrafts(bill, report);
  const currentDoc = tabs.find((t) => t.id === activeTab)?.text || '';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-6 shadow-xs font-sans">
      {/* Header & Escalation Flow */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>{t.disputeTitle}</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {t.disputeSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 transition-colors self-start sm:self-auto print:hidden cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printDisputeBtn}</span>
          </button>
        </div>

        {/* Escalation Hierarchy Flow Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
          <span className="font-bold text-slate-900 block mb-1">
            Standard Escalation Sequence in India:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px] mt-2 font-medium">
            <div className={`p-2 rounded border ${activeTab === 'hospital' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">{t.step1Hospital}</span>
              <span className="text-[10px] opacity-80">{t.step1HospitalSub}</span>
            </div>
            <div className={`p-2 rounded border ${activeTab === 'insurer' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">{t.step2Gro}</span>
              <span className="text-[10px] opacity-80">{t.step2GroSub}</span>
            </div>
            <div className={`p-2 rounded border ${activeTab === 'bima_bharosa' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">{t.step3Bima}</span>
              <span className="text-[10px] opacity-80">{t.step3BimaSub}</span>
            </div>
            <div className={`p-2 rounded border ${activeTab === 'ombudsman' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className="block font-bold">{t.step4Ombudsman}</span>
              <span className="text-[10px] opacity-80">{t.step4OmbudsmanSub}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verify Before Sending Callout Box with Official Portals */}
      <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 text-xs text-amber-950 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>{t.verifyBeforeSendingTitle}</span>
        </div>
        <p className="leading-relaxed">
          {t.verifyBeforeSendingText}
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1 font-semibold text-amber-900">
          <a
            href="https://irdai.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline text-primary"
          >
            <span>irdai.gov.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://bimabharosa.irdai.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline text-primary"
          >
            <span>bimabharosa.irdai.gov.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://cioins.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline text-primary"
          >
            <span>cioins.co.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2 print:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all shadow-xs cursor-pointer"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t.copiedBtn}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copyDraftBtn}</span>
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
