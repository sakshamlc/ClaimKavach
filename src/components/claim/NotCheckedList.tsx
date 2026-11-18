import React from 'react';
import type { LineItem } from '@/lib/audit/types';
import { formatINR } from '@/lib/audit/currency';
import { HelpCircle, AlertCircle, Info } from 'lucide-react';

interface NotCheckedListProps {
  items: (LineItem & { reason?: string })[];
}

export function NotCheckedList({ items }: NotCheckedListProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Items Not Checked Against Statutory Ceilings ({items.length})
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            These line items could not be audited against statutory schedules because either the item lacks pricing/quantity details or the corresponding statutory order (e.g., knee implant price schedules) has not yet been ingested into ClaimKavach.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Item ID</th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-right">Billed Amount</th>
              <th className="py-2.5 px-3">Audit Status & Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                  {item.id}
                </td>
                <td className="py-2.5 px-3 font-medium">
                  {item.description}
                </td>
                <td className="py-2.5 px-3 capitalize text-slate-600">
                  {item.category.replace(/_/g, ' ')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {item.totalBilledPaise !== null && item.totalBilledPaise !== undefined
                    ? formatINR(item.totalBilledPaise)
                    : 'Unpriced'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Info className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{item.reason || item.notes || 'No statutory reference data available for this category.'}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
