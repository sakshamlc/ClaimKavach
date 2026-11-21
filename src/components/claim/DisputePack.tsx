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

export function generateHospitalLetter(bill: MedicalBill, report: AuditReport, lang: 'en' | 'hi' = 'en'): string {
  const hospitalName = bill.hospital.name || (lang === 'hi' ? '[अस्पताल का नाम]' : '[Hospital Name]');
  const billId = bill.id || (lang === 'hi' ? '[बिल संख्या]' : '[Bill Number]');
  const totalBilled = formatINR(report.totals.billed);
  const confirmedOvercharge = formatINR(report.totals.confirmed);
  const likelyOvercharge = formatINR(report.totals.likely);

  const ceilingFindings = report.findings.filter(
    (f) => f.ruleId === 'R-NPPA-01' && (f.verdict === 'CONFIRMED_OVERCHARGE' || f.verdict === 'LIKELY_ISSUE')
  );
  const mathFindings = report.findings.filter(
    (f) => (f.ruleId === 'R-MATH-01' || f.ruleId === 'R-TOTAL-01') && f.amount > 0
  );

  if (lang === 'hi') {
    return `प्रति,
बिलिंग प्रभारी / चिकित्सा अधीक्षक,
${hospitalName}

दिनांक: [Date]
विषय: इनपेशेंट बिल संख्या ${billId} के मदवार स्पष्टीकरण एवं विनियामक मूल्य सीमा समीक्षा हेतु अनुरोध

आदरणीय महोदय / महोदया,

मरीज का नाम: [Patient Name]
आईपीडी संख्या: [IPD Registration Number]
भर्ती की तारीख: ${bill.stay.admissionDate || '[Admission Date]'}
डिस्चार्ज की तारीख: ${bill.stay.dischargeDate || '[Discharge Date]'}
कुल बिल राशि: ${totalBilled}

मैं उपरोक्त अंतिम अस्पताल चालान पर बिल किए गए विशिष्ट शुल्कों के मदवार विवरण और स्पष्टीकरण के लिए यह अनुरोध प्रस्तुत कर रहा/रही हूँ।

विनियामक अधिसूचनाओं में अधिसूचित सरकारी मूल्य सीमाओं की समीक्षा के अनुसार:

1. मूल्य बेंचमार्क समीक्षा:
${
  ceilingFindings.length > 0
    ? ceilingFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. मद: "${f.title || f.itemId}"\n      - बिल दर: ${f.actual !== undefined ? formatINR(f.actual) : 'N/A'}\n      - अधिसूचित संदर्भ सीमा: ${f.expected !== undefined ? formatINR(f.expected) : 'N/A'}\n      - प्रश्नगत अंतर: ${formatINR(f.amount)}\n      - स्रोत दस्तावेज: ${f.citation.instrument}${f.citation.kind === 'REGULATORY' && f.citation.instrumentNumber ? ` (${f.citation.instrumentNumber})` : ''}${f.citation.kind === 'REGULATORY' && f.citation.sourceRef ? `, Ref: ${f.citation.sourceRef}` : ''}`
        )
        .join('\n\n')
    : '   - कृपया पुष्टि करें कि सभी अनुसूचित दवाएं एवं प्रत्यारोपण अधिसूचित सरकारी बेंचमार्क के अनुरूप हैं।'
}

${
  mathFindings.length > 0
    ? `2. अंकगणितीय सुसंगतता:\n` +
      mathFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. ${f.title}: बिल ${f.actual !== undefined ? formatINR(f.actual) : 'N/A'}, अपेक्षित ${f.expected !== undefined ? formatINR(f.expected) : 'N/A'} (अंतर: ${formatINR(f.amount)})`
        )
        .join('\n')
    : ''
}

वैधानिक अधिसूचनाओं के अनुसार, अनुसूचित मदों पर अधिसूचित मूल्य सीमा और लागू कर से अधिक शुल्क नहीं लिया जा सकता।

कृपया संशोधित बिल जारी करें और अतिरिक्त शुल्क ${confirmedOvercharge !== '₹0.00' ? confirmedOvercharge : likelyOvercharge} का [Number of Days] कार्य दिवसों में समायोजन या धनवापसी करें।

सधन्यवाद,

भवदीय,
[Patient / Policyholder Name]
फोन: [Phone Number]
ईमेल: [Email Address]
पता: [Postal Address]`;
  }

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

Upon review against notified price ceilings published in official regulatory notifications:

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

Kindly issue a revised, corrected final bill and arrange for the refund or adjustment of excess charges amounting to ${confirmedOvercharge !== '₹0.00' ? confirmedOvercharge : likelyOvercharge} within [Number of Days] working days.

Thank you.

Yours sincerely,
[Patient / Policyholder Name]
Contact Phone: [Phone Number]
Email Address: [Email Address]
Address: [Postal Address]`;
}

export function generateInsurerLetter(bill: MedicalBill, report: AuditReport, lang: 'en' | 'hi' = 'en'): string {
  const hospitalName = bill.hospital.name || (lang === 'hi' ? '[अस्पताल का नाम]' : '[Hospital Name]');
  const totalBilled = formatINR(report.totals.billed);

  const deductionFindings = report.findings.filter(
    (f) => f.ruleId === 'R-ANX-01' || f.ruleId === 'R-BUNDLE-01'
  );

  if (lang === 'hi') {
    return `प्रति,
शिकायत निवारण अधिकारी (GRO),
[Name of Health Insurance Company]
[Branch / Corporate Office Address]

दिनांक: [Date]
विषय: दावा संख्या [Claim Number] / पॉलिसी संख्या [Policy Number] के लिए दावा कटौतियों के संबंध में अभ्यावेदन

महोदय / महोदया,

पॉलिसीधारक का नाम: [Policyholder Name]
मरीज का नाम: [Patient Name]
पॉलिसी संख्या: [Policy Number]
दावा संख्या: [Claim Number]
अस्पताल: ${hospitalName}
कुल अस्पताल बिल: ${totalBilled}
प्रश्नगत कटौती राशि: [Total Deducted Amount]

मैं उपरोक्त अस्पताल में भर्ती के संबंध में जारी दावा निपटान पत्र पर की गई कटौतियों के संदर्भ में औपचारिक अभ्यावेदन प्रस्तुत कर रहा/रही हूँ।

कटौती विवरण के अनुसार कुछ शुल्कों को अस्वीकृत किया गया है। इस संबंध में:

1. गैर-देय एवं काटे गए शुल्कों का सत्यापन:
   - कटौतियों को पॉलिसी अनुबंध की विशिष्ट बहिष्करण शर्तों या विनियामक मार्गदर्शन के अनुरूप होना चाहिए।
   - इनपेशेंट उपचार के आवश्यक मद जो पॉलिसी शर्तों में स्पष्ट रूप से बहिष्कृत नहीं हैं, उन्हें मनमाने ढंग से नहीं काटा जाना चाहिए।

${
  deductionFindings.length > 0
    ? `2. विशिष्ट प्रश्नगत मदें:\n` +
      deductionFindings
        .map(
          (f, idx) =>
            `   ${idx + 1}. मद: "${f.title || f.itemId}" — कटौती: ${formatINR(f.amount)}\n      स्पष्टीकरण: ${f.explanation.hi || f.explanation.en}\n      स्रोत संदर्भ: ${f.citation.instrument}${f.citation.kind === 'REGULATORY' && f.citation.sourceRef ? ` (${f.citation.sourceRef})` : ''}`
        )
        .join('\n\n')
    : ''
}

मैं आपसे पॉलिसी अनुबंध के आधार पर इन कटौतियों की पुनः जांच करने और स्वीकार्य शेष राशि मेरे पंजीकृत बैंक खाते में भेजने का अनुरोध करता/करती हूँ।

सधन्यवाद,

भवदीय,
[Policyholder Name]
पॉलिसी संख्या: [Policy Number]
पंजीकृत मोबाइल: [Mobile Number]
पंजीकृत ईमेल: [Email Address]`;
  }

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

export function generateBimaBharosaText(bill: MedicalBill, report: AuditReport, lang: 'en' | 'hi' = 'en'): string {
  const hospitalName = bill.hospital.name || (lang === 'hi' ? '[अस्पताल का नाम]' : '[Hospital Name]');

  if (lang === 'hi') {
    return `बीमा भरोसा पोर्टल हेतु शिकायत सारांश (bimabharosa.irdai.gov.in):

1. पॉलिसी प्रकार: स्वास्थ्य बीमा
2. बीमा कंपनी: [Name of Insurance Company]
3. पॉलिसी संख्या: [Policy Number]
4. दावा संख्या: [Claim Number]
5. अस्पताल: ${hospitalName}
6. भर्ती की अवधि: ${bill.stay.admissionDate || '[Admission]'} से ${bill.stay.dischargeDate || '[Discharge]'}
7. विवादित कटौती राशि: [Amount in ₹]

शिकायत का विवरण:
दावा संख्या [Claim Number] पर दावा कटौतियों के संबंध में बीमा कंपनी के शिकायत निवारण अधिकारी (GRO) से समाधान न मिलने के बाद मैं यह शिकायत दर्ज कर रहा/रही हूँ।

बीमा कंपनी ने बिना पारदर्शी औचित्य के गैर-देय या आनुपातिक कटौती शीर्षों के तहत [Deducted Amount] की कटौती की। आवश्यक इनपेशेंट उपचार आपूर्ति को अनुबंधीय समर्थन के बिना अस्वीकार किया गया प्रतीत होता है।

मैं दावा निपटान की समीक्षा करने और न्यायसंगत शेष दावा राशि का भुगतान कराने के लिए विनियामक हस्तक्षेप का अनुरोध करता/करती हूँ।`;
  }

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

export function generateOmbudsmanLetter(bill: MedicalBill, report: AuditReport, lang: 'en' | 'hi' = 'en'): string {
  const hospitalName = bill.hospital.name || (lang === 'hi' ? '[अस्पताल का नाम]' : '[Hospital Name]');
  const totalBilled = formatINR(report.totals.billed);

  if (lang === 'hi') {
    return `प्रति,
बीमा लोकपाल,
कार्यालय बीमा लोकपाल,
[City / Regional Jurisdiction Address]

दिनांक: [Date]
विषय: स्वास्थ्य बीमा दावा कटौतियों के संबंध में औपचारिक शिकायत

शिकायतकर्ता का नाम: [Complainant Name]
बीमित / मरीज का नाम: [Patient Name]
बीमा कंपनी: [Name of Insurer]
पॉलिसी संख्या: [Policy Number]
दावा संख्या: [Claim Number]
बीमा कंपनी GRO को अभ्यावेदन की तारीख: [Date Representation Sent]
अस्वीकृति की तारीख / अभ्यावेदन अवधि समाप्ति: [Date]

आदरणीय लोकपाल,

1. मामले के तथ्य:
शिकायतकर्ता के पास [Name of Insurer] द्वारा जारी स्वास्थ्य बीमा पॉलिसी संख्या [Policy Number] है। बीमित व्यक्ति ने ${bill.stay.admissionDate || '[Date]'} से ${bill.stay.dischargeDate || '[Date]'} तक ${hospitalName} में इनपेशेंट उपचार कराया। कुल चिकित्सा बिल ${totalBilled} था।

2. शिकायत का आधार:
बीमा कंपनी ने केवल [Settled Amount] का निपटान किया और [Disputed Amount] को अस्वीकृत कर दिया। बीमा कंपनी / टीपीए द्वारा की गई कटौतियां स्वास्थ्य बीमा शर्तों और मानक दिशानिर्देशों के प्रतिकूल प्रतीत होती हैं।

3. बीमा कंपनी को पूर्व अभ्यावेदन:
शिकायतकर्ता ने [Date] को बीमा कंपनी के शिकायत निवारण अधिकारी (GRO) को यह मामला प्रस्तुत किया था। संतोषजनक समाधान के बिना अभ्यावेदन अवधि समाप्त हो चुकी है, या अभ्यावेदन को पर्याप्त औचित्य के बिना खारिज कर दिया गया।

4. चाही गई राहत:
मैं बीमा कंपनी को शिकायत निवारण मानदंडों के अनुसार लागू ब्याज सहित [Disputed Amount] की बकाया राशि का भुगतान करने का निर्देश देने का अनुरोध करता/करती हूँ।

सत्यापन:
मैं सत्यापित करता/करती हूँ कि इसी विषय पर कोई शिकायत वर्तमान में किसी भी न्यायालय या उपभोक्ता फोरम के समक्ष लंबित नहीं है।

भवदीय,
[Complainant Name]
हस्ताक्षर: ______________________
फोन: [Phone Number]
ईमेल: [Email Address]`;
  }

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
Date of Rejection / Expiry of representation period: [Date]

Respected Ombudsman,

1. Facts of the Case:
The complainant holds health insurance policy No. [Policy Number] issued by [Name of Insurer]. The insured underwent inpatient treatment at ${hospitalName} from ${bill.stay.admissionDate || '[Date]'} to ${bill.stay.dischargeDate || '[Date]'}. Total medical bills incurred were ${totalBilled}.

2. Ground of Grievance:
The insurer settled only [Settled Amount] and disallowed [Disputed Amount]. The deductions made by the insurer / TPA appear inconsistent with applicable health insurance terms and standard guidelines.

3. Prior Representation to Insurer:
The complainant represented this matter to the Grievance Redressal Officer (GRO) of the insurer on [Date]. The representation period has elapsed without satisfactory resolution, or the representation was repudiated without adequate justification.

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

export function generateAllDisputeDrafts(bill: MedicalBill, report: AuditReport, lang: 'en' | 'hi' = 'en') {
  return [
    { id: 'hospital', label: lang === 'hi' ? '1. अस्पताल बिलिंग पूछताछ' : '1. Hospital Billing Query', text: generateHospitalLetter(bill, report, lang) },
    { id: 'insurer', label: lang === 'hi' ? '2. बीमा GRO नोटिस' : '2. Insurer GRO Notice', text: generateInsurerLetter(bill, report, lang) },
    { id: 'bima_bharosa', label: lang === 'hi' ? '3. बीमा भरोसा प्रारूप' : '3. Bima Bharosa Draft', text: generateBimaBharosaText(bill, report, lang) },
    { id: 'ombudsman', label: lang === 'hi' ? '4. बीमा लोकपाल शिकायत' : '4. Insurance Ombudsman', text: generateOmbudsmanLetter(bill, report, lang) },
  ] as const;
}

interface DisputePackProps {
  bill: MedicalBill;
  report: AuditReport;
}

function renderHighlightedText(text: string) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span
          key={i}
          className="bg-unverified-bg text-unverified-fg font-semibold px-1.5 py-0.5 rounded-chip border border-unverified-border inline-block my-0.5"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function DisputePack({ bill, report }: DisputePackProps) {
  const [activeTab, setActiveTab] = useState<'hospital' | 'insurer' | 'bima_bharosa' | 'ombudsman'>('hospital');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const language = useClaimStore((state) => state.language);
  const t = claimTranslations[language] || claimTranslations.en;

  const tabs = generateAllDisputeDrafts(bill, report, language);
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
    <div className="bg-surface rounded-card border border-border p-6 sm:p-8 space-y-6 shadow-card font-sans">
      {/* Header & Escalation Flow */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-h3 font-bold text-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>{t.disputeTitle}</span>
            </h3>
            <p className="text-small text-text-muted mt-0.5">
              {t.disputeSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-small font-semibold bg-surface-subtle hover:bg-surface text-text rounded-chip border border-border transition-colors self-start sm:self-auto print:hidden cursor-pointer min-h-[44px]"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printDisputeBtn}</span>
          </button>
        </div>

        {/* Escalation Hierarchy Flow: Horizontal 4-step on >=640px, vertical on mobile */}
        <div className="bg-surface-subtle border border-border rounded-card p-4 space-y-2">
          <span className="font-bold text-text block text-caption uppercase tracking-wider">
            Standard Escalation Sequence in India:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-small font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('hospital')}
              className={`p-3 rounded-chip border text-left transition-all min-h-[44px] cursor-pointer ${
                activeTab === 'hospital'
                  ? 'bg-primary text-primary-contrast border-primary shadow-card font-bold'
                  : 'bg-surface border-border text-text hover:bg-surface-subtle'
              }`}
            >
              <span className="block text-caption uppercase">{t.step1Hospital}</span>
              <span className="text-[11px] opacity-90">{t.step1HospitalSub}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('insurer')}
              className={`p-3 rounded-chip border text-left transition-all min-h-[44px] cursor-pointer ${
                activeTab === 'insurer'
                  ? 'bg-primary text-primary-contrast border-primary shadow-card font-bold'
                  : 'bg-surface border-border text-text hover:bg-surface-subtle'
              }`}
            >
              <span className="block text-caption uppercase">{t.step2Gro}</span>
              <span className="text-[11px] opacity-90">{t.step2GroSub}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bima_bharosa')}
              className={`p-3 rounded-chip border text-left transition-all min-h-[44px] cursor-pointer ${
                activeTab === 'bima_bharosa'
                  ? 'bg-primary text-primary-contrast border-primary shadow-card font-bold'
                  : 'bg-surface border-border text-text hover:bg-surface-subtle'
              }`}
            >
              <span className="block text-caption uppercase">{t.step3Bima}</span>
              <span className="text-[11px] opacity-90">{t.step3BimaSub}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ombudsman')}
              className={`p-3 rounded-chip border text-left transition-all min-h-[44px] cursor-pointer ${
                activeTab === 'ombudsman'
                  ? 'bg-primary text-primary-contrast border-primary shadow-card font-bold'
                  : 'bg-surface border-border text-text hover:bg-surface-subtle'
              }`}
            >
              <span className="block text-caption uppercase">{t.step4Ombudsman}</span>
              <span className="text-[11px] opacity-90">{t.step4OmbudsmanSub}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verify Before Sending Prominent Warning Alert */}
      <div className="bg-unverified-bg border border-unverified-border rounded-card p-4 sm:p-5 text-small text-text space-y-2.5">
        <div className="flex items-center gap-2 font-bold text-unverified-fg text-body">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{t.verifyBeforeSendingTitle}</span>
        </div>
        <p className="leading-relaxed text-small text-text max-w-prose">
          {t.verifyBeforeSendingText}
        </p>
        <div className="text-caption font-semibold text-text-muted pt-1">
          links to check before sending (unverified):
        </div>
        <div className="flex flex-wrap items-center gap-4 text-small font-semibold">
          <a
            href="https://irdai.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline text-primary"
          >
            <span>irdai.gov.in</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://bimabharosa.irdai.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline text-primary"
          >
            <span>bimabharosa.irdai.gov.in</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://cioins.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline text-primary"
          >
            <span>cioins.co.in</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Document View & Copy Control in Document-Style Card */}
      <div className="space-y-3">
        {/* Document-style Card: readable body font at 16px, generous line height, highlighted blanks */}
        <div className="bg-surface rounded-card border border-border shadow-popover overflow-hidden">
          {/* Document Top Action Bar */}
          <div className="p-4 bg-surface-subtle border-b border-border flex items-center justify-between gap-3 print:hidden">
            <span className="text-caption text-text-muted font-medium">
              Highlighted fields <code className="bg-unverified-bg text-unverified-fg px-1.5 py-0.5 rounded-chip font-bold text-caption border border-unverified-border">[like this]</code> indicate patient information to fill in before sending.
            </span>

            <button
              type="button"
              onClick={() => copyToClipboard(currentDoc, activeTab)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-contrast rounded-chip font-semibold text-small transition-all duration-150 shadow-card cursor-pointer min-h-[44px] shrink-0"
              aria-label="Copy letter text to clipboard"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="w-4 h-4 text-primary-contrast" />
                  <span>{t.copiedBtn}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-primary-contrast" />
                  <span>{t.copyDraftBtn}</span>
                </>
              )}
            </button>
          </div>

          {/* Print-Only Audit Coverage Breakdown */}
          <div className="hidden print:block p-4 bg-surface-subtle border-b border-border text-small text-text space-y-1">
            <div className="font-bold text-caption uppercase tracking-wider text-text-muted">
              ClaimKavach Audit Coverage &amp; Verification Summary
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-caption">
              <div>Arithmetic and duplicate checks: {report.coverage.arithmeticChecked} of {report.coverage.total}</div>
              <div>Checked against reference data: {report.coverage.regulatoryChecked} of {report.coverage.total}</div>
              <div>Not checked against any reference: {report.coverage.notCheckedCount !== undefined ? report.coverage.notCheckedCount : (report.notCheckedItems?.length || 0)}</div>
            </div>
          </div>

          {/* Document Body */}
          <div className="p-6 sm:p-8 text-body leading-relaxed text-text font-sans whitespace-pre-wrap break-words max-w-prose">
            {renderHighlightedText(currentDoc)}
          </div>
        </div>
      </div>
    </div>
  );
}
