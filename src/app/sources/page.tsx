'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/claim/Header';
import { Footer } from '@/components/claim/Footer';
import { useClaimStore } from '@/store/claimStore';
import { claimTranslations } from '@/lib/claimI18n';
import manifestData from '../../../docs/sources/MANIFEST.json';
import reviewData from '../../../docs/sources/REVIEW.json';
import nppaCeilings from '@/data/regulatory/nppaCeilings.json';
import implants from '@/data/regulatory/implants.json';
import annexure1 from '@/data/regulatory/annexure1.json';
import roomBundling from '@/data/regulatory/roomBundling.json';
import {
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface ManifestSource {
  filename: string;
  title: string;
  instrumentNumber: string;
  instrumentDate: string;
  effectiveDate: string;
  sha256: string;
  sourceUrl: string | null;
  verified: boolean;
}

interface ReviewEntry {
  sourceFile: string;
  sha256: string;
  reviewer?: string;
  reviewedAt?: string;
  result?: string;
}

export default function SourcesPage() {
  const hookLanguage = useClaimStore((state) => state.language);
  const language = typeof window === 'undefined' ? (useClaimStore.getState().language || hookLanguage) : hookLanguage;
  const t = claimTranslations[language] || claimTranslations.en;
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const sources: ManifestSource[] = manifestData.sources || [];
  const reviews: ReviewEntry[] = (reviewData as ReviewEntry[]) || [];

  const getRecordCount = (filename: string): number => {
    const nppaCount = nppaCeilings.filter((r) => r.sourceFile === filename).length;
    const implantCount = implants.filter((r) => r.sourceFile === filename).length;
    const annexureCount = (annexure1 as Array<{ sourceFile?: string }>).filter((r) => r.sourceFile === filename).length;
    const roomCount = (roomBundling as Array<{ sourceFile?: string }>).filter((r) => r.sourceFile === filename).length;
    return nppaCount + implantCount + annexureCount + roomCount;
  };

  const getReviewStatus = (filename: string): string => {
    const review = reviews.find((r) => r.sourceFile === filename);
    if (!review) return t.sourcesNotYetReviewed;
    return review.result || t.sourcesNotYetReviewed;
  };

  const copyToClipboard = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-small font-semibold text-primary hover:underline min-h-[44px] py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.sourcesBackBtn}</span>
          </Link>

          <SectionHeader
            title={t.sourcesTitle}
            description={t.sourcesSubtitle}
            action={
              <span className="font-mono text-caption bg-surface-muted border border-border rounded-chip px-3 py-1.5 text-text-muted">
                MANIFEST: v{manifestData.schemaVersion} ({sources.length} sources)
              </span>
            }
          />
        </div>

        {/* Prominent Alert on NOT YET SOURCED Data */}
        <Alert
          variant="warning"
          title={language === 'hi' ? 'सोर्सिंग स्थिति' : 'Sourcing Completeness Status'}
          className="shadow-xs"
        >
          {t.sourcesNotYetSourced}
        </Alert>

        {/* Source Files Manifest: Desktop Table */}
        <div className="hidden md:block">
          <Card variant="outline" className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse text-small">
              <thead className="bg-surface-muted border-b border-border text-text-muted text-caption uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="p-4">{t.sourcesFilename}</th>
                  <th scope="col" className="p-4">{t.sourcesInstrument}</th>
                  <th scope="col" className="p-4">{t.sourcesRecords}</th>
                  <th scope="col" className="p-4">{t.sourcesSha}</th>
                  <th scope="col" className="p-4 text-right">{t.sourcesReviewStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((source) => {
                  const count = getRecordCount(source.filename);
                  const reviewStatus = getReviewStatus(source.filename);
                  const shortSha = `${source.sha256.slice(0, 10)}...${source.sha256.slice(-8)}`;
                  const isCopied = copiedSha === source.sha256;

                  return (
                    <tr key={source.filename} className="hover:bg-surface-subtle transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-mono font-bold text-text text-small">{source.filename}</div>
                        <div className="text-caption text-text-muted mt-0.5 max-w-sm">{source.title}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-semibold text-text">{source.instrumentNumber}</div>
                        <div className="text-caption text-text-muted">Dated: {source.instrumentDate}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-bold text-text">{`${count} ${language === 'hi' ? 'रिकॉर्ड्स' : 'records'}`}</div>
                        <div className="text-caption text-text-muted">
                          {count > 0 ? (language === 'hi' ? 'सफलतापूर्वक पार्स' : 'Parsed in engine') : (language === 'hi' ? 'संरचित रिकॉर्ड नहीं' : 'No structured records')}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-caption text-text-muted bg-surface-muted px-2 py-1 rounded border border-border" title={source.sha256}>
                            {shortSha}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(source.sha256)}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-chip border border-border bg-surface hover:bg-surface-muted text-text-muted hover:text-text transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            title="Copy full SHA-256 hash"
                            aria-label={isCopied ? t.copiedShaBtn : t.copyShaBtn}
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-tier-valid-exclusion-fg" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 align-top text-right">
                        <Badge variant={reviewStatus === 'PASS' ? 'confirmed' : 'unverified'} size="sm">
                          {reviewStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Source Files Manifest: Mobile Stacked Cards */}
        <div className="block md:hidden space-y-4" data-testid="sources-list">
          {sources.map((source, idx) => {
            const count = getRecordCount(source.filename);
            const reviewStatus = getReviewStatus(source.filename);
            const shortSha = `${source.sha256.slice(0, 10)}...${source.sha256.slice(-8)}`;
            const isCopied = copiedSha === source.sha256;

            return (
              <Card
                key={source.filename}
                variant="outline"
                data-testid={`source-card-${idx}`}
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block">
                      {t.sourcesFilename} #{idx + 1}
                    </span>
                    <h2 className="text-small font-bold text-text font-mono mt-0.5">
                      {source.filename}
                    </h2>
                    <p className="text-caption text-text-muted mt-1">
                      {source.title}
                    </p>
                  </div>
                  <Badge variant={reviewStatus === 'PASS' ? 'confirmed' : 'unverified'} size="sm">
                    {reviewStatus}
                  </Badge>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-small pt-1">
                  <div className="bg-surface-muted border border-border rounded-chip p-2.5">
                    <span className="text-[10px] uppercase font-bold text-text-muted block mb-0.5">
                      {t.sourcesInstrument}
                    </span>
                    <span className="font-semibold text-text block">
                      {source.instrumentNumber}
                    </span>
                    <span className="text-text-muted text-caption">
                      Dated: {source.instrumentDate}
                    </span>
                  </div>

                  <div className="bg-surface-muted border border-border rounded-chip p-2.5">
                    <span className="text-[10px] uppercase font-bold text-text-muted block mb-0.5">
                      {t.sourcesRecords}
                    </span>
                    <span className="font-bold text-text block">
                      {`${count} ${language === 'hi' ? 'रिकॉर्ड्स' : 'records'}`}
                    </span>
                    <span className="text-text-muted text-caption">
                      {count > 0 ? (language === 'hi' ? 'सफलतापूर्वक पार्स' : 'Parsed in engine') : (language === 'hi' ? 'संरचित रिकॉर्ड नहीं' : 'No structured records')}
                    </span>
                  </div>

                  <div className="bg-surface-muted border border-border rounded-chip p-2.5">
                    <span className="text-[10px] uppercase font-bold text-text-muted block mb-0.5">
                      {t.sourcesSha}
                    </span>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <code className="font-mono text-caption text-text truncate" title={source.sha256}>
                        {shortSha}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(source.sha256)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-chip border border-border bg-surface hover:bg-surface-muted text-text-muted hover:text-text transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shrink-0"
                        title="Copy full SHA-256 hash"
                        aria-label={isCopied ? t.copiedShaBtn : t.copyShaBtn}
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-tier-valid-exclusion-fg" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
