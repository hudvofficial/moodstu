"use client";

import { useEffect, useRef } from "react";

type SpeechRecognitionEventLike = Event & {
  resultIndex?: number;
  results: ArrayLike<{ 0?: { transcript?: string }; isFinal?: boolean }>;
};

type SpeechRecognitionErrorEventLike = Event & { error?: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function normalizeWakePhrase(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isMoodieWakePhrase(value: string) {
  const normalized = normalizeWakePhrase(value);
  return /\bhey\s+(moodie|moody|mudi|mudy)\b/.test(normalized)
    || /\bhe\s+(moodie|moody|mudi|mudy)\b/.test(normalized);
}

export function useMoodieWakePhrase(enabled: boolean, onWake: () => void) {
  const onWakeRef = useRef(onWake);
  const lastWakeAtRef = useRef(0);

  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  useEffect(() => {
    if (!enabled) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    let active = true;
    let started = false;
    let retryTimer: number | null = null;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "vi-VN";

    const start = () => {
      if (!active || started) return;
      try {
        recognition.start();
        started = true;
      } catch {
        // Browser may already be starting or may require a user gesture.
      }
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
        transcript += ` ${event.results[index]?.[0]?.transcript || ""}`;
      }
      const matches = isMoodieWakePhrase(transcript);
      const now = Date.now();
      if (!matches || now - lastWakeAtRef.current < 4000) return;
      lastWakeAtRef.current = now;
      onWakeRef.current();
    };

    recognition.onerror = (event) => {
      started = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") active = false;
    };
    recognition.onend = () => {
      started = false;
      if (!active) return;
      retryTimer = window.setTimeout(start, 500);
    };

    start();
    window.addEventListener("pointerdown", start, { passive: true });
    window.addEventListener("keydown", start);

    return () => {
      active = false;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Best-effort cleanup for partially initialized recognition.
      }
    };
  }, [enabled]);
}
