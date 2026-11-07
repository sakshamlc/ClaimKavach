"use client";

import React from "react";
import { CheckCircle2, Bot, ShieldCheck, FileSpreadsheet, Scale, Eye } from "lucide-react";

interface AgentPipelineBarProps {
  currentStep: number; // 1 to 5
  onStepClick?: (step: number) => void;
}

const STEPS = [
  {
    step: 1,
    title: "1. Ingestion",
    subtitle: "Upload / Sample",
    icon: FileSpreadsheet,
    zone: "AI_ZONE",
  },
  {
    step: 2,
    title: "2. AI OCR",
    subtitle: "Gemini Vision",
    icon: Bot,
    zone: "AI_ZONE",
  },
  {
    step: 3,
    title: "3. Human Review",
    subtitle: "Verify Rows",
    icon: ShieldCheck,
    zone: "TRUST_ZONE",
  },
  {
    step: 4,
    title: "4. Deterministic Audit",
    subtitle: "Paise Math Rules",
    icon: Scale,
    zone: "TRUST_ZONE",
  },
  {
    step: 5,
    title: "5. Bill X-Ray & Pack",
    subtitle: "Grievance Draft",
    icon: Eye,
    zone: "TRUST_ZONE",
  },
];

export const AgentPipelineBar: React.FC<AgentPipelineBarProps> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-100">
      {/* Zone Headers */}
      <div className="grid grid-cols-5 gap-2 mb-3 text-xs font-semibold uppercase tracking-wider">
        <div className="col-span-2 flex items-center gap-1.5 px-3 py-1 bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 rounded-md">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Zone (Probabilistic OCR)</span>
        </div>
        <div className="col-span-3 flex items-center justify-between px-3 py-1 bg-teal-950/60 border border-teal-700/50 text-teal-300 rounded-md">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Trust Zone (Deterministic Rules & Math)</span>
          </div>
          <span className="text-[10px] text-teal-400/80 font-normal">Pure TypeScript</span>
        </div>
      </div>

      {/* Steps Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STEPS.map((item) => {
          const isCompleted = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          const isTrustZone = item.zone === "TRUST_ZONE";
          const Icon = item.icon;

          return (
            <button
              key={item.step}
              type="button"
              disabled={!onStepClick || item.step > currentStep}
              onClick={() => onStepClick && onStepClick(item.step)}
              className={`relative flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                isCurrent
                  ? isTrustZone
                    ? "bg-teal-950/80 border-teal-500 shadow-md shadow-teal-950/40"
                    : "bg-indigo-950/80 border-indigo-500 shadow-md shadow-indigo-950/40"
                  : isCompleted
                  ? "bg-slate-800/80 border-slate-700 hover:border-slate-600"
                  : "bg-slate-900/60 border-slate-800/80 opacity-60 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
                    : isCurrent
                    ? isTrustZone
                      ? "bg-teal-500 text-slate-950 font-bold"
                      : "bg-indigo-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate text-slate-200">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {item.subtitle}
                </div>
              </div>

              {isCurrent && (
                <div
                  className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${
                    isTrustZone ? "bg-teal-400" : "bg-indigo-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
