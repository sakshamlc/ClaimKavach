"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { BillAuditSummary } from "@/lib/schemas";
import { TrendingDown, AlertTriangle, ShieldCheck } from "lucide-react";

interface SavingsChartProps {
  summary: BillAuditSummary;
}

export const SavingsChart: React.FC<SavingsChartProps> = ({ summary }) => {
  const chartData = [
    {
      name: "Billed Total",
      amount: summary.totalBilledInr,
      color: "#64748B", // Slate
      description: "Total invoice claimed by hospital",
    },
    {
      name: "Under Query",
      amount: summary.totalPotentialDisputeInr,
      color: "#E5484D", // Red
      description: "Total amount under query / clarification",
    },
    {
      name: "Est. Payable",
      amount: summary.estimatedPayableIfAcceptedInr,
      color: "#12A58A", // Teal
      description: "Estimated fair payable if queries accepted",
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-teal-400" />
            Financial Audit Overview
          </h3>
          <p className="text-[11px] text-slate-400">
            3-Bar comparison of billed charges vs potential queryable disputes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700/50 font-semibold">
            {summary.highConfidenceFlagCount} High Confidence
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/50 font-semibold">
            {summary.reviewFlagCount} Review Flags
          </span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium">Original Billed</span>
          <div className="text-lg font-extrabold text-white mt-0.5">
            ₹{summary.totalBilledInr.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-slate-500">Gross hospital claim</span>
        </div>

        <div className="p-3 bg-red-950/30 rounded-lg border border-red-900/40">
          <span className="text-[11px] text-red-300 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Total Amount Under Query
          </span>
          <div className="text-lg font-extrabold text-red-400 mt-0.5">
            Rs. {summary.totalPotentialDisputeInr.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-red-400/80">Caps, bundling & TPA queries</span>
        </div>

        <div className="p-3 bg-teal-950/30 rounded-lg border border-teal-900/40">
          <span className="text-[11px] text-teal-300 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-teal-400" />
            Est. Payable if Accepted
          </span>
          <div className="text-lg font-extrabold text-teal-300 mt-0.5">
            ₹{summary.estimatedPayableIfAcceptedInr.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-teal-400/80">Adjusted payable target</span>
        </div>
      </div>

      {/* Recharts 3-Bar Chart */}
      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                      <div className="font-bold text-white">{data.name}</div>
                      <div className="text-teal-400 font-mono text-sm">
                        ₹{Number(data.amount).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-400">{data.description}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
