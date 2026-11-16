'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { Printer, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

export default function LetterClient() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const findingId = params?.findingId as string;

  const documents = useAppStore((state) => state.documents);
  const findings = useAppStore((state) => state.findings);
  const fixPlan = useAppStore((state) => state.fixPlan);

  const [branchName, setBranchName] = useState('Main Branch');
  const [letterDate, setLetterDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-GB'); // DD/MM/YYYY
  });

  const finding = findings.find((f) => f.id === findingId) || findings[0];
  const step = fixPlan.find((s) => s.findingId === findingId) || fixPlan[0];

  const aadhaarName = documents.aadhaar?.extracted?.fields?.fullName?.value || 'Resident Name';
  const bankName = documents.bank?.extracted?.fields?.accountHolderName?.value || 'Account Holder';
  const bankTitle = documents.bank?.extracted?.fields?.bankName?.value || 'Bank Manager';
  const accountLast4 = documents.bank?.extracted?.fields?.accountNumberLast4?.value || 'XXXX';

  const isDbtSeeding = finding?.ruleId === 'R-DBT-1';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Hide header and action bars when printing */}
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        {/* Controls Bar (Hidden in Print) */}
        <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3 p-4 bg-surface rounded-card border border-border shadow-xs">
          <button
            type="button"
            onClick={() => router.push('/report')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text-main min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-xs transition-all min-h-[44px]"
          >
            <Printer className="w-4 h-4" />
            <span>{t('printOrSavePdf')}</span>
          </button>
        </div>

        {/* Notice Disclaimer (Hidden in Print) */}
        <div className="print:hidden mb-6 p-4 bg-info-bg text-info-fg rounded-card border border-sky-200 text-xs leading-relaxed flex items-start gap-2.5">
          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>{t('letterPageTitle')}:</strong> {t('letterNotice')}
          </div>
        </div>

        {/* Editable Meta Controls for Branch & Date */}
        <div className="print:hidden mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-surface rounded-card border border-border text-xs">
          <div>
            <label className="font-bold text-text-main block mb-1">Bank Branch Name:</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder={t('branchNamePlaceholder')}
            />
          </div>
          <div>
            <label className="font-bold text-text-main block mb-1">Date:</label>
            <input
              type="text"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder={t('datePlaceholder')}
            />
          </div>
        </div>

        {/* Printable Document Paper Card */}
        <article className="bg-surface border border-slate-300 rounded-card p-8 sm:p-12 shadow-sm text-text-main font-serif print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:text-black">
          {/* Print Watermark / Sample Indicator */}
          <div className="text-center pb-4 mb-6 border-b border-slate-200">
            <span className="text-[11px] font-mono tracking-widest text-slate-500 uppercase font-sans">
              [ {t('letterPageTitle')} - Pre-filled Draft ]
            </span>
            <h1 className="text-xl font-bold mt-1 text-slate-900">
              {isDbtSeeding ? t('dbtSeedingLetterTitle') : t('nameCorrectionLetterTitle')}
            </h1>
          </div>

          {/* Letter Head */}
          <div className="space-y-1 text-sm leading-relaxed mb-6">
            <p><strong>To,</strong></p>
            <p>The Branch Manager,</p>
            <p className="font-medium">{bankTitle}</p>
            <p className="underline decoration-slate-400">{branchName}</p>
            <p className="text-right text-xs mt-2"><strong>Date:</strong> {letterDate}</p>
          </div>

          {/* Subject */}
          <div className="my-6 p-2 bg-slate-50 border-l-4 border-slate-400 text-sm font-semibold print:bg-transparent">
            {isDbtSeeding ? (
              <p>Subject: Request for Linking / Seeding of Aadhaar with Bank Account for DBT Scheme Benefits</p>
            ) : (
              <p>Subject: Request for Correction / Alignment of Account Holder Name as per Aadhaar Card</p>
            )}
          </div>

          {/* Salutation & Body */}
          <div className="space-y-4 text-sm leading-relaxed text-slate-800">
            <p>Respected Sir / Madam,</p>

            {isDbtSeeding ? (
              <>
                <p>
                  I hold a Savings Bank Account with your esteemed branch under Account Number ending in{' '}
                  <strong>XXXX-XXXX-{accountLast4}</strong> in the name of <strong>{bankName}</strong>.
                </p>
                <p>
                  I am eligible for Direct Benefit Transfer (DBT) scheme benefits (including PM-KISAN / State & Central
                  Scholarships). To enable direct government credit transfers into my account, I hereby request you to
                  seed and map my Aadhaar Number in the NPCI (National Payments Corporation of India) DBT Mapper for this
                  account.
                </p>
                <p>
                  I confirm that my Aadhaar demographic details are updated and match my identity records. I have enclosed
                  a self-attested copy of my Aadhaar card along with my bank passbook copy for your verification.
                </p>
              </>
            ) : (
              <>
                <p>
                  I hold an active Savings Bank Account with your branch bearing Account Number ending in{' '}
                  <strong>XXXX-XXXX-{accountLast4}</strong>, currently recorded under the name{' '}
                  <strong>&quot;{bankName}&quot;</strong>.
                </p>
                <p>
                  My official and authoritative name as per my government-issued Aadhaar Card is{' '}
                  <strong>&quot;{aadhaarName}&quot;</strong>. Due to minor discrepancies in token order or spelling, my
                  online application verification is currently hindered.
                </p>
                <p>
                  I kindly request your office to update and align the record of my account holder name in the core
                  banking system to match my Aadhaar record (<strong>{aadhaarName}</strong>) and issue an updated passbook.
                </p>
              </>
            )}

            <p className="pt-2">
              Thanking you in anticipation of your prompt assistance.
            </p>

            {/* Signature Block */}
            <div className="pt-12 flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-500 font-sans">Enclosures:</p>
                <ul className="text-xs list-disc list-inside text-slate-600 font-sans mt-1">
                  <li>Self-attested copy of Aadhaar Card</li>
                  <li>Copy of Bank Passbook / Cheque Leaf</li>
                </ul>
              </div>

              <div className="text-right">
                <p className="h-12 border-b border-slate-400 w-44 inline-block"></p>
                <p className="font-bold text-sm mt-1">{aadhaarName}</p>
                <p className="text-xs text-slate-600">(Signature of Account Holder)</p>
              </div>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
