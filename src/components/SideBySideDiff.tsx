'use client';

import React from 'react';
import { DocType } from '@/lib/rules/types';
import { useTranslation } from '@/lib/i18n';

interface SideBySideDiffProps {
  left: { doc: DocType; labelKey: string; value: string };
  right: { doc: DocType; labelKey: string; value: string };
  verdict?: string;
  ruleId?: string;
}

export function SideBySideDiff({ left, right, verdict, ruleId }: SideBySideDiffProps) {
  const { t } = useTranslation();

  const isExpectedHint =
    right.labelKey === 'expected' ||
    (typeof right.value === 'string' && right.value.startsWith('hint_expected_'));

  const formatToken = (tok: string) => {
    if (tok.startsWith('field_') || tok === 'review_screen') {
      return t(tok);
    }
    return tok;
  };

  const isReorder = verdict === 'TOKEN_REORDER';
  const isPatronymic = verdict === 'PATRONYMIC_MIDDLE_OMISSION';

  // Render Left Value with fine-grained character highlighting for code errors
  const renderLeftValue = () => {
    const rawVal = left.value || '';

    // 1. Invalid IFSC (R-IFSC-1): Highlight offending 5th character
    if (ruleId === 'R-IFSC-1' || left.labelKey === 'field_ifsc') {
      if (rawVal.length === 11 && rawVal[4] !== '0') {
        return (
          <span className="font-mono tracking-wide text-base font-semibold text-text-main inline-flex items-center">
            <span>{rawVal.slice(0, 4)}</span>
            <span className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded border border-rose-300 font-bold mx-0.5">
              {rawVal[4]}
            </span>
            <span>{rawVal.slice(5)}</span>
          </span>
        );
      }
    }

    // 2. Non-Individual PAN (R-PAN-2): Highlight offending 4th character (not 'P')
    if (ruleId === 'R-PAN-2') {
      if (rawVal.length === 10 && rawVal[3] !== 'P') {
        return (
          <span className="font-mono tracking-wide text-base font-semibold text-text-main inline-flex items-center">
            <span>{rawVal.slice(0, 3)}</span>
            <span className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded border border-rose-300 font-bold mx-0.5">
              {rawVal[3]}
            </span>
            <span>{rawVal.slice(4)}</span>
          </span>
        );
      }
    }

    // 3. Invalid PAN Format (R-PAN-1)
    if (ruleId === 'R-PAN-1') {
      if (rawVal.length === 10) {
        // Expected: 5 letters, 4 digits, 1 letter
        return (
          <span className="font-mono tracking-wide text-base font-semibold text-text-main inline-flex items-center">
            {rawVal.split('').map((char, i) => {
              const isInvalidChar =
                (i < 5 && !/[A-Za-z]/.test(char)) ||
                (i >= 5 && i < 9 && !/[0-9]/.test(char)) ||
                (i === 9 && !/[A-Za-z]/.test(char));

              return isInvalidChar ? (
                <span key={i} className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded border border-rose-300 font-bold mx-0.5">
                  {char}
                </span>
              ) : (
                <span key={i}>{char}</span>
              );
            })}
          </span>
        );
      }
    }

    // 4. Invalid Account Number (R-ACC-1): Highlight non-digit characters
    if (ruleId === 'R-ACC-1' || left.labelKey === 'field_accountNumber') {
      const parts = rawVal.split(/([^0-9]+)/).filter(Boolean);
      return (
        <span className="font-mono tracking-wide text-base font-semibold text-text-main inline-flex items-center flex-wrap">
          {parts.map((part, idx) => {
            const isNonDigit = !/^\d+$/.test(part);
            return isNonDigit ? (
              <span key={idx} className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded border border-rose-300 font-bold mx-0.5">
                {part}
              </span>
            ) : (
              <span key={idx}>{part}</span>
            );
          })}
        </span>
      );
    }

    // Default left value rendering with token chips
    const tokensLeft = rawVal.split(/[, ]+/).filter(Boolean);
    const tokensRight = (right.value || '').split(/[, ]+/).filter(Boolean);

    return (
      <div className="text-base font-semibold text-text-main flex flex-wrap gap-1.5 items-center">
        {tokensLeft.map((tok, idx) => {
          const inRight = tokensRight.some((r) => r.toLowerCase() === tok.toLowerCase());
          const highlightClass = isReorder
            ? 'bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300 font-bold'
            : !inRight
            ? 'bg-rose-100 text-rose-900 px-1.5 py-0.5 rounded border border-rose-300 font-bold'
            : 'text-text-main';

          return (
            <span key={idx} className={highlightClass}>
              {formatToken(tok)}
            </span>
          );
        })}
      </div>
    );
  };

  // Render Right Value
  const renderRightValue = () => {
    // If it's a descriptive format hint, render as a clean plain sentence (NO chips!)
    if (isExpectedHint) {
      const translatedHint = t(right.value) || right.value;
      return (
        <div className="text-sm font-medium text-text-main leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          {translatedHint}
        </div>
      );
    }

    // Default right value rendering with token chips
    const tokensLeft = (left.value || '').split(/[, ]+/).filter(Boolean);
    const tokensRight = (right.value || '').split(/[, ]+/).filter(Boolean);

    return (
      <div className="text-base font-semibold text-text-main flex flex-wrap gap-1.5 items-center">
        {tokensRight.map((tok, idx) => {
          const inLeft = tokensLeft.some((l) => l.toLowerCase() === tok.toLowerCase());
          const highlightClass = isReorder
            ? 'bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300 font-bold'
            : !inLeft
            ? isPatronymic
              ? 'bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300'
              : 'bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300 font-bold'
            : 'text-text-main';

          return (
            <span key={idx} className={highlightClass}>
              {formatToken(tok)}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-background rounded-xl border border-border my-2">
      {/* Left Document Box */}
      <div className="p-3 bg-surface rounded-lg border border-border">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
          {t(left.labelKey)}
        </span>
        {renderLeftValue()}
      </div>

      {/* Right Document Box */}
      <div className="p-3 bg-surface rounded-lg border border-border">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
          {t(right.labelKey)}
        </span>
        {renderRightValue()}
      </div>
    </div>
  );
}
