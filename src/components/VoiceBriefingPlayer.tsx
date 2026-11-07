"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExtractedBill, BillAuditSummary } from "@/lib/schemas";
import {
  SupportedLanguage,
  generateVoiceBriefing,
  findVoiceForLang,
} from "@/lib/voiceScript";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Languages,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface VoiceBriefingPlayerProps {
  bill: ExtractedBill;
  summary: BillAuditSummary;
}

export const VoiceBriefingPlayer: React.FC<VoiceBriefingPlayerProps> = ({
  bill,
  summary,
}) => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("en-IN");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices from Web Speech API
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const briefings = generateVoiceBriefing(bill, summary);
  const currentBriefing = briefings[selectedLang];

  // Detect if matching voice is installed on user's device
  const langPrefix = selectedLang.slice(0, 2);
  const matchingVoice = findVoiceForLang(voices, langPrefix);
  const isVoiceInstalled = matchingVoice !== null;

  const handlePlay = () => {
    if (!("speechSynthesis" in window) || !isVoiceInstalled) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentBriefing.text);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    utterance.lang = selectedLang;
    utterance.rate = 0.95; // Clear patient pacing

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (window.speechSynthesis && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    handleStop();
    setSelectedLang(lang);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Top Header & Language Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Voice Briefing & Multilingual Summary
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                Web Speech API
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Listen or read an audio summary designed for patient families.
            </p>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => handleLanguageChange("en-IN")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              selectedLang === "en-IN"
                ? "bg-teal-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange("hi-IN")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              selectedLang === "hi-IN"
                ? "bg-teal-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            हिंदी
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange("mr-IN")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              selectedLang === "mr-IN"
                ? "bg-teal-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            मराठी
          </button>
        </div>
      </div>

      {/* Voice Status Alert if Language Pack Missing */}
      {!isVoiceInstalled && (
        <div className="flex items-center gap-2 p-3 bg-amber-950/40 border border-amber-900/60 rounded-lg text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Audio voice pack for <strong>{currentBriefing.langLabel}</strong> is not installed on this browser/OS — showing full written translation below.
          </span>
        </div>
      )}

      {/* Briefing Text Card */}
      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-teal-300">
            {currentBriefing.headline}
          </h4>
          {isPlaying && (
            <span className="flex items-center gap-1.5 text-[11px] text-teal-400 font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              Speaking...
            </span>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {currentBriefing.text}
        </p>
      </div>

      {/* Audio Controls (Active only if device has matching voice pack) */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-slate-500">
          {isVoiceInstalled ? (
            <span>Voice engine: {matchingVoice?.name || "System Voice"}</span>
          ) : (
            <span>Text mode active</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isVoiceInstalled ? (
            <>
              {!isPlaying ? (
                <button
                  type="button"
                  onClick={handlePlay}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isPaused ? "Resume Audio" : "Play Briefing"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-all"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  Pause
                </button>
              )}

              {(isPlaying || isPaused) && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                  title="Stop Audio"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : (
            <div className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Audio Unavailable for {currentBriefing.langLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
