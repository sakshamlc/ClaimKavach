import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Scale, ExternalLink, Database } from 'lucide-react';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';

export function Footer() {
  const language = useClaimStore((state) => state.language);
  const t = claimTranslations[language] || claimTranslations.en;
  return (
    <footer className="mt-auto border-t border-border bg-surface-muted py-12 px-4 sm:px-6 lg:px-8 text-small text-text-muted font-sans print:hidden">
      <div className="max-w-content mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
        {/* Mandatory Disclaimer */}
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-text text-body">
            <Scale className="w-5 h-5 text-primary" />
            <span>Statutory Notice & Independence Disclaimer</span>
          </div>
          <p className="leading-relaxed text-small text-text-muted max-w-prose">
            <strong>ClaimKavach</strong> is an independent, open-source verification tool and is not affiliated with the National Pharmaceutical Pricing Authority (NPPA), the Insurance Regulatory and Development Authority of India (IRDAI), the Ministry of Health and Family Welfare, or any private hospital or insurance company.
          </p>
          <p className="leading-relaxed text-small text-text-muted max-w-prose">
            All findings produced by ClaimKavach are mathematical computations and statutory comparisons against published regulatory notifications (such as NPPA DPCO 2013 ceiling orders and IRDAI Master Circulars). This tool is designed solely for consumer awareness, pre-flight review, and consumer grievance preparation. <strong>It does not constitute legal, medical, or financial advice.</strong>
          </p>
          <p className="text-caption text-text-subtle">
            Data privacy: 100% in-memory processing. Closing this browser tab or clicking &ldquo;Clear Data&rdquo; permanently purges all uploaded documents and patient data.
          </p>
        </div>

        {/* Official Statutory Links */}
        <div className="space-y-3 text-left self-start shrink-0">
          <div className="font-bold text-text text-caption uppercase tracking-wider">
            Official Regulatory Portals
          </div>
          <ul className="space-y-2 text-small text-text-muted">
            <li>
              <a
                href="https://www.nppa.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary rounded-chip"
              >
                <span>NPPA Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li>
              <a
                href="https://irdai.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary rounded-chip"
              >
                <span>IRDAI Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li>
              <a
                href="https://bimabharosa.irdai.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary rounded-chip"
              >
                <span>Bima Bharosa Grievance Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="pt-2 border-t border-border mt-2">
              <Link
                href="/sources"
                className="text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary rounded-chip"
              >
                <Database className="w-4 h-4" />
                <span>{t.sourcesFooterLink} (/sources)</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
