import React from 'react';
import { ShieldCheck, Scale, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-slate-50 py-8 px-4 text-xs text-muted font-sans print:hidden">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-6">
        {/* Mandatory Disclaimer */}
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
            <Scale className="w-4 h-4 text-slate-600" />
            <span>Statutory Notice & Independence Disclaimer</span>
          </div>
          <p className="leading-relaxed text-slate-600">
            <strong>ClaimKavach</strong> is an independent, open-source verification tool and is not affiliated with the National Pharmaceutical Pricing Authority (NPPA), the Insurance Regulatory and Development Authority of India (IRDAI), the Ministry of Health and Family Welfare, or any private hospital or insurance company.
          </p>
          <p className="leading-relaxed text-slate-600">
            All findings produced by ClaimKavach are mathematical computations and statutory comparisons against published regulatory notifications (such as NPPA DPCO 2013 ceiling orders and IRDAI Master Circulars). This tool is designed solely for consumer awareness, pre-flight review, and consumer grievance preparation. <strong>It does not constitute legal, medical, or financial advice.</strong>
          </p>
          <p className="text-[11px] text-slate-500">
            Data privacy: 100% in-memory processing. Closing this browser tab or clicking &ldquo;Clear Data&rdquo; permanently purges all uploaded documents and patient data.
          </p>
        </div>

        {/* Official Statutory Links */}
        <div className="space-y-2 text-right md:text-left self-start">
          <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Official Regulatory Portals
          </div>
          <ul className="space-y-1 text-slate-600">
            <li>
              <a
                href="https://www.nppa.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary inline-flex items-center gap-1"
              >
                <span>NPPA Official Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a
                href="https://irdai.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary inline-flex items-center gap-1"
              >
                <span>IRDAI Official Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a
                href="https://bimabharosa.irdai.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary inline-flex items-center gap-1"
              >
                <span>Bima Bharosa Grievance Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
