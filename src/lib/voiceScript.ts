/**
 * ClaimKavach — Multilingual Voice Briefing Scripts & Speech Synthesis Voice Detector
 * Supports English (en-IN), Hindi (hi-IN), and Marathi (mr-IN).
 */

import { ExtractedBill, BillAuditSummary } from "./schemas";

export type SupportedLanguage = "en-IN" | "hi-IN" | "mr-IN";

export interface VoiceScriptResult {
  lang: SupportedLanguage;
  langLabel: string;
  headline: string;
  text: string;
}

/**
 * Mandatory browser voice detector.
 * Matches langPrefix (e.g. 'mr', 'hi', 'en') against window.speechSynthesis.getVoices().
 */
export function findVoiceForLang(
  voices: SpeechSynthesisVoice[],
  langPrefix: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const prefix = langPrefix.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((v) => v.lang.toLowerCase().includes(prefix)) ||
    null
  );
}

/**
 * Generates structured briefing scripts across English, Hindi, and Marathi.
 */
export function generateVoiceBriefing(
  bill: ExtractedBill,
  summary: BillAuditSummary
): Record<SupportedLanguage, VoiceScriptResult> {
  const billedStr = `₹${summary.totalBilledInr.toLocaleString("en-IN")}`;
  const disputeStr = `₹${summary.totalPotentialDisputeInr.toLocaleString("en-IN")}`;
  const payableStr = `₹${summary.estimatedPayableIfAcceptedInr.toLocaleString("en-IN")}`;
  const flagCount = summary.highConfidenceFlagCount + summary.reviewFlagCount;

  // Top flagged items for briefing
  const flagged = summary.results.filter((r) => r.confidenceTier !== "CLEAR");
  const topItemNames = flagged.slice(0, 2).map((f) => f.rawLabel).join(" and ");

  return {
    "en-IN": {
      lang: "en-IN",
      langLabel: "English (India)",
      headline: `Audit Briefing: Potential Dispute of ${disputeStr}`,
      text: `Hello. Here is your ClaimKavach hospital bill audit summary for ${bill.hospitalName}. Total billed is ${billedStr}. Our deterministic rule engine identified a potential dispute amount of ${disputeStr} across ${flagCount} items. The estimated fair payable amount if accepted is ${payableStr}. Significant items to review include ${topItemNames || "statutory price cap and package exclusions"}. You can download the official Patient Grievance Draft PDF to submit to the hospital billing desk or TPA.`,
    },
    "hi-IN": {
      lang: "hi-IN",
      langLabel: "हिंदी (Hindi)",
      headline: `ऑडिट सारांश: ${disputeStr} की संभावित बचत`,
      text: `नमस्ते. ${bill.hospitalName} के बिल के लिए यह आपका क्लेम कवच ऑडिट सारांश है. आपका कुल बिल ${billedStr} है. हमारे नियम इंजन ने ${flagCount} मदों में कुल ${disputeStr} की संभावित विवाद योग्य राशि पाई है. यदि आप यह प्रश्न उठाते हैं, तो अनुमानित देय राशि ${payableStr} बनती है. आप आधिकारिक ग्रीवेंस ड्राफ्ट पीडीएफ डाउनलोड करके अस्पताल बिलिंग डेस्क या टीपीए अधिकारी को सौंप सकते हैं.`,
    },
    "mr-IN": {
      lang: "mr-IN",
      langLabel: "मराठी (Marathi)",
      headline: `ऑडिट सारांश: ${disputeStr} ची संभाव्य बचत`,
      text: `नमस्कार. ${bill.hospitalName} च्या बिलासाठी हा आपला क्लेम कवच ऑडिट सारांश आहे. आपले एकूण बिल ${billedStr} आहे. आमच्या ऑडिट नियमांनुसार ${flagCount} बाबींमध्ये ${disputeStr} रुपयांची संभाव्य तफावत आढळली आहे. हे आक्षेप मान्य झाल्यास अंदाजे देय रक्कम ${payableStr} होते. आपण अधिकृत तक्रार मसुदा पीडीएफ डाउनलोड करून रुग्णालय बिलिंग किंवा टीपीए कक्षात सादर करू शकता.`,
    },
  };
}
