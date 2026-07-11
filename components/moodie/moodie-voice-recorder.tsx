"use client";

/**
 * MoodieVoiceRecorder
 *
 * Ported from open-webui VoiceRecording.svelte
 * (src/lib/components/chat/MessageInput/VoiceRecording.svelte) to React.
 *
 * Flow: mount -> getUserMedia -> MediaRecorder starts immediately ->
 * RMS visualizer bars + m:ss duration counter run every frame ->
 * Esc or the X button cancels (no upload) -> the check button stops the
 * recorder, POSTs the blob to /api/moodie/audio/transcription and calls
 * onConfirm(text) once the server responds.
 *
 * All native browser resources (mic tracks, rAF loop, duration interval,
 * screen wake lock, AudioContext) are released on cancel/confirm/unmount.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MoodieVoiceRecorderProps {
  onCancel: () => void;
  onConfirm: (text: string) => void;
  language?: string;
}

const MIC_MIME_TYPES = [
  "audio/webm; codecs=opus",
  "audio/webm",
  "audio/ogg; codecs=opus",
  "audio/mp4",
  "audio/wav",
];

const MIN_DECIBELS = -45;
const VISUALIZER_BUFFER_LENGTH = 48;

function calculateRMS(data: Uint8Array) {
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const normalized = (data[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / data.length);
}

function normalizeRMS(rms: number) {
  const scaled = Math.pow(rms * 10, 1.5);
  return Math.min(1, Math.max(0.01, scaled));
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${paddedSeconds}`;
}

export function MoodieVoiceRecorder({ onCancel, onConfirm, language = "vi" }: MoodieVoiceRecorderProps) {
  const [visualizerData, setVisualizerData] = useState<number[]>(() => Array(VISUALIZER_BUFFER_LENGTH).fill(0));
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const confirmedRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const visualizerDataRef = useRef<number[]>(visualizerData);

  visualizerDataRef.current = visualizerData;

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Best-effort only; ignore failures (unsupported / not visible tab).
    }
  }

  async function releaseWakeLock() {
    if (!wakeLockRef.current) return;
    try {
      await wakeLockRef.current.release();
    } catch {
      // Ignore; sentinel may already be released by the browser.
    }
    wakeLockRef.current = null;
  }

  function stopDurationCounter() {
    if (durationIntervalRef.current !== null) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }

  function stopVisualizerLoop() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  function startVisualizerLoop(stream: MediaStream) {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.minDecibels = MIN_DECIBELS;
    source.connect(analyser);

    const timeDomainData = new Uint8Array(analyser.fftSize);

    const processFrame = () => {
      analyser.getByteTimeDomainData(timeDomainData);
      const rms = normalizeRMS(calculateRMS(timeDomainData));
      const next = visualizerDataRef.current.slice(1);
      next.push(rms);
      visualizerDataRef.current = next;
      setVisualizerData(next);
      rafIdRef.current = requestAnimationFrame(processFrame);
    };

    rafIdRef.current = requestAnimationFrame(processFrame);
  }

  async function stopTracksAndAudioContext() {
    stopVisualizerLoop();
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // Ignore; context may already be closed.
      }
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function cleanup() {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignore; recorder may already be stopping.
      }
    }
    stopDurationCounter();
    await releaseWakeLock();
    await stopTracksAndAudioContext();
  }

  async function transcribeAndConfirm(blob: Blob, mimeType: string) {
    const extension = mimeType.split("/")[1]?.split(";")[0] || "webm";
    const formData = new FormData();
    formData.append("file", blob, `moodie-voice.${extension}`);
    formData.append("language", language);

    try {
      const response = await fetch("/api/moodie/audio/transcription", { method: "POST", body: formData });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok) {
        toast.error(payload.error || "Kh\u00f4ng th\u1ec3 chuy\u1ec3n \u00e2m thanh th\u00e0nh v\u0103n b\u1ea3n");
        onCancel();
        return;
      }
      const text = (payload.text || "").trim();
      if (text) {
        onConfirm(text);
      } else {
        toast.error("Kh\u00f4ng nghe r\u00f5 gi\u1ecdng n\u00f3i, vui l\u00f2ng th\u1eed l\u1ea1i");
        onCancel();
      }
    } catch {
      toast.error("Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7 \u0111\u1ec3 chuy\u1ec3n \u00e2m thanh");
      onCancel();
    } finally {
      setTranscribing(false);
    }
  }

  function handleCancel() {
    cleanup().catch(() => {});
    onCancel();
  }

  function handleConfirm() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || transcribing) return;
    confirmedRef.current = true;
    setTranscribing(true);
    stopDurationCounter();
    stopVisualizerLoop();
    releaseWakeLock().catch(() => {});
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignore; onstop still fires via browser cleanup.
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        if (!cancelled) {
          toast.error("Kh\u00f4ng th\u1ec3 truy c\u1eadp micro");
          onCancel();
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const mimeType = MIC_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      } catch {
        toast.error("Kh\u00f4ng th\u1ec3 b\u1eaft \u0111\u1ea7u ghi \u00e2m");
        stream.getTracks().forEach((track) => track.stop());
        onCancel();
        return;
      }
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (confirmedRef.current) {
          const type = (audioChunksRef.current[0] as Blob | undefined)?.type || recorder.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type });
          audioChunksRef.current = [];
          transcribeAndConfirm(blob, type).catch(() => setTranscribing(false));
        }
        stopTracksAndAudioContext().catch(() => {});
      };

      try {
        recorder.start();
      } catch {
        toast.error("Kh\u00f4ng th\u1ec3 b\u1eaft \u0111\u1ea7u ghi \u00e2m");
        stream.getTracks().forEach((track) => track.stop());
        onCancel();
        return;
      }

      durationIntervalRef.current = setInterval(() => {
        setDurationSeconds((current) => current + 1);
      }, 1000);
      await requestWakeLock();
      startVisualizerLoop(stream);
    }

    start().catch(() => {});

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") requestWakeLock().catch(() => {});
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cleanup().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`flex w-full items-center justify-between rounded-full px-2.5 py-2 ${transcribing ? "bg-bg-subtle" : "bg-primary/8"}`}>
      <Button
        type="button"
        unstyled
        className="shrink-0 rounded-full bg-primary/15 p-1.5 text-primary"
        onClick={handleCancel}
        aria-label="H\u1ee7y ghi \u00e2m"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="mx-2 flex h-6 flex-1 items-center gap-0.5 overflow-hidden">
        {visualizerData.map((rms, index) => (
          <div
            key={index}
            className="h-full w-[2px] shrink-0 rounded-full bg-primary"
            style={{ height: `${Math.min(100, Math.max(14, rms * 100))}%` }}
          />
        ))}
      </div>

      <span className="mx-1 shrink-0 text-sm font-medium tabular-nums text-primary">
        {formatSeconds(durationSeconds)}
      </span>

      {transcribing ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <Button
          type="button"
          unstyled
          className="shrink-0 rounded-full bg-primary p-1.5 text-white"
          onClick={handleConfirm}
          aria-label="X\u00e1c nh\u1eadn ghi \u00e2m"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}