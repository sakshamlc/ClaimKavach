'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import type { ClaimLanguage } from '@/lib/claimI18n';
import { claimTranslations } from '@/lib/claimI18n';
import { buildSpokenScript, type SpokenScript, type SpokenSection } from '@/lib/listen/buildScript';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  FastForward,
  AlertTriangle,
  Globe,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export interface AudioPlayerProps {
  report: AuditReport;
  language: ClaimLanguage;
  targetFindingIndex?: number | null;
  onClearTargetFindingIndex?: () => void;
  onHighlightFinding?: (findingId: string | null) => void;
  className?: string;
}

export function AudioPlayer({
  report,
  language,
  targetFindingIndex,
  onClearTargetFindingIndex,
  onHighlightFinding,
  className = '',
}: AudioPlayerProps) {
  const t = claimTranslations[language] || claimTranslations.en;

  const [isSupported, setIsSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioLanguage, setAudioLanguage] = useState<ClaimLanguage>(language);
  const [remoteVoiceConsent, setRemoteVoiceConsent] = useState(false);

  const scriptRef = useRef<SpokenScript | null>(null);
  const currentSectionRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync script when report or audioLanguage changes
  const spokenScript = React.useMemo(() => {
    return buildSpokenScript(report, audioLanguage);
  }, [report, audioLanguage]);

  scriptRef.current = spokenScript;

  // Feature detection
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
    }
  }, []);

  // Sync audio language with UI language
  useEffect(() => {
    setAudioLanguage(language);
  }, [language]);

  // Load and cache voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Helper to pick matching voice
  const getMatchingVoice = useCallback(
    (lang: ClaimLanguage): { voice: SpeechSynthesisVoice | null; isRemote: boolean; isMissing: boolean } => {
      if (voices.length === 0) return { voice: null, isRemote: false, isMissing: false };

      if (lang === 'hi') {
        const hindiVoices = voices.filter(
          (v) => v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().includes('hindi')
        );
        if (hindiVoices.length === 0) {
          return { voice: null, isRemote: false, isMissing: true };
        }
        const localVoice = hindiVoices.find((v) => v.localService);
        const selected = localVoice || hindiVoices[0];
        return { voice: selected, isRemote: !selected.localService, isMissing: false };
      }

      // English
      const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
      const inEnVoice = enVoices.find(
        (v) => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')
      );
      const localInVoice = inEnVoice?.localService ? inEnVoice : null;
      const localEnVoice = enVoices.find((v) => v.localService);

      const selected = localInVoice || inEnVoice || localEnVoice || enVoices[0] || null;
      return {
        voice: selected,
        isRemote: selected ? !selected.localService : false,
        isMissing: selected === null,
      };
    },
    [voices]
  );

  const voiceStatus = getMatchingVoice(audioLanguage);

  // Stop speech cleanly
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
    activeUtteranceRef.current = null;
    if (onHighlightFinding) {
      onHighlightFinding(null);
    }
  }, [onHighlightFinding]);

  // Clean up on unmount or tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopSpeech();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopSpeech();
    };
  }, [stopSpeech]);

  // Stop on report change or language change
  useEffect(() => {
    stopSpeech();
  }, [report, language, stopSpeech]);

  // Play a specific section by index
  const playSection = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const script = scriptRef.current;
      if (!script || index >= script.sections.length) {
        stopSpeech();
        return;
      }

      const section = script.sections[index];
      currentSectionRef.current = index;
      setCurrentSectionIndex(index);

      // Cancel any ongoing utterance before queuing next section
      window.speechSynthesis.cancel();

      // Highlight active finding if section represents a finding
      if (section.findingId && onHighlightFinding) {
        onHighlightFinding(section.findingId);
        // Smoothly scroll finding card into view
        if (typeof document !== 'undefined') {
          const cardEl = document.getElementById(`finding-row-${section.findingId}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      } else if (onHighlightFinding) {
        onHighlightFinding(null);
      }

      const utterance = new SpeechSynthesisUtterance(section.text);
      utterance.rate = playbackRate;

      const currentVoice = voiceStatus.voice;
      if (currentVoice) {
        utterance.voice = currentVoice;
        utterance.lang = currentVoice.lang;
      } else {
        utterance.lang = audioLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      }

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        const nextIndex = index + 1;
        if (nextIndex < script.sections.length) {
          playSection(nextIndex);
        } else {
          stopSpeech();
        }
      };

      utterance.onerror = () => {
        stopSpeech();
      };

      activeUtteranceRef.current = utterance;
      setIsPlaying(true);
      setIsPaused(false);
      isPlayingRef.current = true;

      window.speechSynthesis.speak(utterance);
    },
    [audioLanguage, onHighlightFinding, playbackRate, stopSpeech, voiceStatus.voice]
  );

  // Handle external jump to target finding
  useEffect(() => {
    if (targetFindingIndex !== null && targetFindingIndex !== undefined) {
      const script = scriptRef.current;
      if (script) {
        const foundIdx = script.sections.findIndex((s) => s.findingIndex === targetFindingIndex);
        if (foundIdx !== -1) {
          playSection(foundIdx);
        }
      }
      if (onClearTargetFindingIndex) {
        onClearTargetFindingIndex();
      }
    }
  }, [targetFindingIndex, onClearTargetFindingIndex, playSection]);

  const handlePlay = () => {
    if (voiceStatus.isMissing && audioLanguage === 'hi') {
      return;
    }
    if (voiceStatus.isRemote && !remoteVoiceConsent) {
      return;
    }
    if (isPaused && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      return;
    }
    playSection(currentSectionIndex);
  };

  const handlePause = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleStop = () => {
    stopSpeech();
    setCurrentSectionIndex(0);
    currentSectionRef.current = 0;
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (isPlaying) {
      playSection(currentSectionRef.current);
    }
  };

  if (!isSupported) {
    return (
      <Alert variant="info" className={`text-caption ${className}`}>
        {t.audioNotSupported}
      </Alert>
    );
  }

  const currentSection: SpokenSection | undefined = spokenScript.sections[currentSectionIndex];
  const totalFindings = spokenScript.findingSectionsCount;
  const isFindingSection = currentSection?.findingIndex !== undefined;

  return (
    <Card
      variant="outline"
      className={`p-4 bg-primary-soft/50 border-primary/20 space-y-3 shadow-card ${className}`}
      data-testid="audio-player"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-chip bg-accent-teal text-white flex items-center justify-center shrink-0 shadow-card">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-small font-bold text-text leading-tight">{t.audioTitle}</h3>
            <p className="text-caption text-text-muted mt-0.5">{t.audioSubtitle}</p>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-surface p-1 rounded-chip border border-border">
          <span className="text-[11px] font-semibold text-text-muted px-1.5 select-none">
            {t.audioSpeedLabel}
          </span>
          {[0.75, 1.0, 1.25].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleSpeedChange(speed)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-chip transition-colors min-h-[32px] cursor-pointer ${
                playbackRate === speed
                  ? 'bg-accent-teal text-white shadow-xs'
                  : 'text-text hover:bg-surface-subtle'
              }`}
            >
              {`${speed}x`}
            </button>
          ))}
        </div>
      </div>

      {/* Missing Hindi Voice Notice */}
      {voiceStatus.isMissing && audioLanguage === 'hi' && (
        <Alert variant="warning" title="Hindi Voice Unavailable" className="text-small">
          <p className="mb-2">{t.audioHindiMissingNotice}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="teal"
              size="sm"
              onClick={() => {
                setAudioLanguage('en');
                playSection(0);
              }}
            >
              <Globe className="w-4 h-4 mr-1.5" />
              {t.audioListenInEnglish}
            </Button>
          </div>
        </Alert>
      )}

      {/* Remote Voice Warning & Consent Requirement */}
      {voiceStatus.isRemote && !remoteVoiceConsent && (
        <Alert variant="warning" className="text-small">
          <div className="space-y-2">
            <p className="text-text font-medium">{t.audioRemoteVoiceNotice}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="teal"
                size="sm"
                onClick={() => {
                  setRemoteVoiceConsent(true);
                  playSection(currentSectionIndex);
                }}
              >
                {t.audioContinueRemoteVoice}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleStop}>
                {t.audioKeepOnDevice}
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Main Playback Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <Button
              variant="teal"
              size="md"
              onClick={handlePlay}
              disabled={voiceStatus.isMissing && audioLanguage === 'hi'}
              disabledReason={t.audioHindiMissingNotice}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              {isPaused ? t.audioResumeBtn : t.audioPlayBtn}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={handlePause}
              leftIcon={<Pause className="w-4 h-4" />}
            >
              {t.audioPauseBtn}
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            onClick={handleStop}
            disabled={!isPlaying && !isPaused && currentSectionIndex === 0}
            leftIcon={<Square className="w-4 h-4" />}
          >
            {t.audioStopBtn}
          </Button>
        </div>

        {/* Progress & Live Screen Reader Announcer */}
        <div
          className="text-caption font-semibold text-text bg-surface px-3 py-2 rounded-chip border border-border flex items-center gap-2 self-start sm:self-auto"
          aria-live="polite"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying
                ? 'bg-accent-teal animate-pulse'
                : isPaused
                ? 'bg-tier-likely-fg'
                : 'bg-text-muted'
            }`}
          />
          <span>
            {isFindingSection && currentSection
              ? `${t.audioSectionFindingPrefix} ${currentSection.findingIndex! + 1} ${t.audioSectionFindingOf} ${totalFindings}`
              : currentSection?.shortLabel || t.audioSectionOverview}
          </span>
          <span className="text-text-muted font-normal">
            ({currentSectionIndex + 1}/{spokenScript.sections.length})
          </span>
        </div>
      </div>
    </Card>
  );
}
