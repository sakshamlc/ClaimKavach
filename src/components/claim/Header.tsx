'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClaimStore } from '@/store/claimStore';
import { ShieldAlert, Trash2, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const clearAllData = useClaimStore((state) => state.clearAllData);
  const bill = useClaimStore((state) => state.bill);
  const selectedSampleKey = useClaimStore((state) => state.selectedSampleKey);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data and start over? All in-memory bill data will be permanently erased.')) {
      clearAllData();
      router.push('/');
    }
  };

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-40 shadow-xs">
      {/* Top Disclaimer Banner */}
      <div className="bg-info-bg text-info-fg text-xs px-4 py-1.5 text-center font-medium border-b border-sky-100 flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>ClaimKavach runs purely in browser memory. Nothing is stored, tracked, or sent to a database.</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-primary leading-tight font-sans tracking-tight">
                ClaimKavach
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                Statutory Audit
              </span>
              {(selectedSampleKey || bill?.isSynthetic) && (
                <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                  SYNTHETIC SAMPLE
                </span>
              )}
            </div>
            <p className="text-muted text-xs hidden sm:block leading-tight mt-0.5">
              Independent Patient Hospital Bill & Insurance Deduction Verification
            </p>
          </div>
        </Link>

        {/* Clear Data Action */}
        <div className="flex items-center gap-3">
          {bill && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors min-h-[36px]"
              title="Wipe in-memory bill data immediately"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Data</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
