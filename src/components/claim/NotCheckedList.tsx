import React from 'react';
import type { LineItem } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
import { Card, Badge } from '@/components/ui';
import { MinusCircle, Info } from 'lucide-react';

interface NotCheckedListProps {
  items: (LineItem & { reason?: string })[];
}

export function NotCheckedList({ items }: NotCheckedListProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card variant="muted" className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-chip bg-surface text-text-muted border border-border mt-0.5">
          <MinusCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-h3 font-bold text-text">
            Items Not Checked Against Statutory Ceilings ({items.length})
          </h3>
          <p className="text-small text-text-muted leading-relaxed max-w-prose">
            These line items could not be audited against statutory schedules because either the item lacks pricing/quantity details or the corresponding statutory order (e.g., knee implant price schedules) has not yet been ingested into ClaimKavach.
          </p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-small text-left border-collapse">
          <thead className="bg-surface-subtle text-text font-bold border-b border-border">
            <tr>
              <th scope="col" className="py-2.5 px-3 w-28">Item ID</th>
              <th scope="col" className="py-2.5 px-3">Description</th>
              <th scope="col" className="py-2.5 px-3 w-36">Category</th>
              <th scope="col" className="py-2.5 px-3 w-32 text-right">Billed Amount</th>
              <th scope="col" className="py-2.5 px-3">Audit Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-2.5 px-3 font-mono font-medium text-text-muted">
                  {item.id}
                </td>
                <td className="py-2.5 px-3 font-medium">
                  {item.description}
                </td>
                <td className="py-2.5 px-3 capitalize text-text-muted">
                  {item.category.replace(/_/g, ' ')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">
                  {item.totalBilledPaise !== null && item.totalBilledPaise !== undefined
                    ? formatINR(item.totalBilledPaise)
                    : 'Unpriced'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1.5 text-caption font-medium text-unverified-fg bg-unverified-bg px-2.5 py-1 rounded-chip border border-unverified-border leading-normal">
                    <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{item.reason || item.notes || 'No statutory reference data available for this category.'}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked List */}
      <div className="sm:hidden space-y-3">
        {items.map((item) => (
          <div key={item.id} className="p-3.5 bg-surface rounded-card border border-border space-y-2 text-small">
            <div className="flex items-center justify-between">
              <span className="font-mono text-caption text-text-muted">{item.id}</span>
              <span className="font-mono font-bold text-text">
                {item.totalBilledPaise !== null && item.totalBilledPaise !== undefined
                  ? formatINR(item.totalBilledPaise)
                  : 'Unpriced'}
              </span>
            </div>
            <div className="font-semibold text-text">{item.description}</div>
            <div className="text-caption text-unverified-fg bg-unverified-bg p-2 rounded-chip border border-unverified-border leading-relaxed flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{item.reason || item.notes || 'No statutory reference data available for this category.'}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
