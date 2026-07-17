"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, MicOff, SendHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMoodieLiveVoice } from "@/hooks/use-moodie-live-voice";
import { extractCompletedSentences } from "@/lib/moodie/voice-sentences";
import { toast } from "sonner";

interface MoodieVoiceOverlayProps {
  open: boolean;
  onClose: () => void;
  streamedText: string;
  status: string | null;
  onSendVoiceMessage: (text: string) => Promise<void> | void;
  onStopGeneration: () => void;
}

const MIN_DECIBELS = -55;
const SILENCE_MS = 2000;
const MIN_BLOB_BYTES = 100;
const MIC_MIME_TYPES = [
  "audio/webm; codecs=opus",
  "audio/webm",
  "audio/ogg; codecs=opus",
  "audio/mp4",
  "audio/wav",
];

function getRecorderOptions() {
  const mimeType = MIC_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  return mimeType ? { mimeType } : undefined;
}

function calculateRms(data: Uint8Array) {
  let sumSquares = 0;
  for (const value of data) {
    const normalized = (value - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.min(1, Math.max(0.04, Math.pow(Math.sqrt(sumSquares / data.length) * 10, 1.5)));
}

function stripCompletedPrefix(text: string, sentences: string[]) {
  let remainder = text.trim();
  for (const sentence of sentences) {
    const index = remainder.indexOf(sentence);
    if (index < 0) continue;
    remainder = remainder.slice(index + sentence.length).trim();
  }
  return remainder.replace(/^\s+/, "").trim();
}

function VoiceTextComposer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => void | boolean | Promise<void | boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || disabled || sending) return;
    setSending(true);
    try {
      const accepted = await onSend(text);
      if (accepted !== false) setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="flex w-full items-center gap-2" onSubmit={submit}>
      <Input
        unstyled
        withBaseStyles={false}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nhắn cho Moodie…"
        aria-label="Nhắn cho Moodie"
        disabled={disabled || sending}
        className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/6 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="submit"
        unstyled
        disabled={disabled || sending || !draft.trim()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Gửi tin nhắn"
      >
        <SendHorizontal className="h-4 w-4" />
      </Button>
    </form>
  );
}

function MoodieVoiceCascade({
  open,
  onClose,
  streamedText,
  status,
  onSendVoiceMessage,
  onStopGeneration,
}: MoodieVoiceOverlayProps) {
  const [muted, setMuted] = useState(false);
  const [rmsLevel, setRmsLevel] = useState(0.04);
  const [transcribing, setTranscribing] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastSoundTimeRef = useRef(0);
  const hasStartedSpeakingRef = useRef(false);
  const stoppingRecorderRef = useRef(false);
  const mountedRef = useRef(false);
  const mutedRef = useRef(false);
  const assistantSpeakingRef = useRef(false);
  const spokenSentenceIndexRef = useRef(0);
  const queuedTextRef = useRef<string[]>([]);
  const currentTurnTextRef = useRef("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const onCloseRef = useRef(onClose);
  const onSendVoiceMessageRef = useRef(onSendVoiceMessage);
  const onStopGenerationRef = useRef(onStopGeneration);

  mutedRef.current = muted;
  assistantSpeakingRef.current = assistantSpeaking;
  onCloseRef.current = onClose;
  onSendVoiceMessageRef.current = onSendVoiceMessage;
  onStopGenerationRef.current = onStopGeneration;

  function selectVoice() {
    return voicesRef.current.find((voice) => voice.lang === "vi-VN")
      || voicesRef.current.find((voice) => voice.lang.toLowerCase().startsWith("vi"))
      || null;
  }

  function speakNext() {
    if (!mountedRef.current || assistantSpeakingRef.current || queuedTextRef.current.length === 0) return;
    const text = queuedTextRef.current.shift();
    if (!text?.trim()) {
      speakNext();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = selectVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "vi-VN";
    utterance.onstart = () => {
      if (!mountedRef.current) return;
      assistantSpeakingRef.current = true;
      setAssistantSpeaking(true);
    };
    utterance.onend = () => {
      assistantSpeakingRef.current = false;
      if (!mountedRef.current) return;
      setAssistantSpeaking(false);
      if (queuedTextRef.current.length === 0) setMuted(false);
      speakNext();
    };
    utterance.onerror = () => {
      assistantSpeakingRef.current = false;
      if (!mountedRef.current) return;
      setAssistantSpeaking(false);
      speakNext();
    };
    window.speechSynthesis.speak(utterance);
  }

  function enqueueSpeech(text: string) {
    if (!text.trim()) return;
    queuedTextRef.current.push(text.trim());
    speakNext();
  }

  function stopSpeechAndGeneration() {
    const wasSpeaking = assistantSpeakingRef.current || window.speechSynthesis.speaking;
    queuedTextRef.current = [];
    window.speechSynthesis.cancel();
    assistantSpeakingRef.current = false;
    setAssistantSpeaking(false);
    if (wasSpeaking) onStopGenerationRef.current();
  }

  async function transcribe(blob: Blob, mimeType: string) {
    if (blob.size < MIN_BLOB_BYTES || !mountedRef.current) return;
    setTranscribing(true);
    const extension = mimeType.split("/")[1]?.split(";")[0] || "webm";
    const formData = new FormData();
    formData.append("file", blob, `moodie-voice.${extension}`);
    formData.append("language", "vi");
    try {
      const response = await fetch("/api/moodie/audio/transcription", { method: "POST", body: formData });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Kh\u00f4ng th\u1ec3 nh\u1eadn di\u1ec7n gi\u1ecdng n\u00f3i");
      const text = payload.text?.trim();
      if (text && mountedRef.current) {
        currentTurnTextRef.current = "";
        spokenSentenceIndexRef.current = 0;
        await onSendVoiceMessageRef.current(text);
      }
    } catch (error) {
      if (mountedRef.current) toast.error(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 nh\u1eadn di\u1ec7n gi\u1ecdng n\u00f3i");
    } finally {
      if (mountedRef.current) setTranscribing(false);
    }
  }

  function createRecorder(stream: MediaStream) {
    const recorder = new MediaRecorder(stream, getRecorderOptions());
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      stoppingRecorderRef.current = false;
      hasStartedSpeakingRef.current = false;
      if (mountedRef.current && stream.active) createRecorder(stream);
      transcribe(blob, mimeType).catch(() => {});
    };
  }

  async function cleanup() {
    mountedRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      try { recorder.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      try { await audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    queuedTextRef.current = [];
    window.speechSynthesis.cancel();
    assistantSpeakingRef.current = false;
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }
  }

  useEffect(() => {
    if (!open) return;
    mountedRef.current = true;
    queueMicrotask(() => {
      if (!mountedRef.current) return;
      setMuted(false);
      setRmsLevel(0.04);
    });
    spokenSentenceIndexRef.current = 0;
    currentTurnTextRef.current = "";

    const synthesis = window.speechSynthesis;
    const loadVoices = () => { voicesRef.current = synthesis.getVoices(); };
    loadVoices();
    synthesis.addEventListener("voiceschanged", loadVoices);

    const start = async () => {
      try {
        if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        createRecorder(stream);
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.minDecibels = MIN_DECIBELS;
        analyserRef.current = analyser;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        const timeData = new Uint8Array(analyser.fftSize);
        const analyse = (now: number) => {
          if (!mountedRef.current) return;
          analyser.getByteFrequencyData(frequencyData);
          analyser.getByteTimeDomainData(timeData);
          setRmsLevel(mutedRef.current ? 0.04 : calculateRms(timeData));
          const hasSound = !mutedRef.current && frequencyData.some((value) => value > 0);
          const activeRecorder = recorderRef.current;
          if (hasSound) {
            if (assistantSpeakingRef.current || synthesis.speaking) stopSpeechAndGeneration();
            lastSoundTimeRef.current = now;
            if (activeRecorder?.state === "inactive" && !stoppingRecorderRef.current) {
              activeRecorder.start();
              hasStartedSpeakingRef.current = true;
            }
          } else if (
            hasStartedSpeakingRef.current
            && activeRecorder?.state === "recording"
            && !stoppingRecorderRef.current
            && now - lastSoundTimeRef.current > SILENCE_MS
          ) {
            stoppingRecorderRef.current = true;
            activeRecorder.stop();
          }
          rafRef.current = requestAnimationFrame(analyse);
        };
        rafRef.current = requestAnimationFrame(analyse);
      } catch {
        toast.error("Kh\u00f4ng th\u1ec3 truy c\u1eadp micro");
        onCloseRef.current();
      }
    };
    start().catch(() => {});

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key.toLowerCase() === "m") setMuted((current) => !current);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      synthesis.removeEventListener("voiceschanged", loadVoices);
      window.removeEventListener("keydown", handleKeyDown);
      cleanup().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (streamedText.length < currentTurnTextRef.current.length) spokenSentenceIndexRef.current = 0;
    currentTurnTextRef.current = streamedText;
    const sentences = extractCompletedSentences(streamedText);
    for (let index = spokenSentenceIndexRef.current; index < sentences.length; index += 1) enqueueSpeech(sentences[index]);
    spokenSentenceIndexRef.current = sentences.length;
    if (status === "completed") {
      const remainder = stripCompletedPrefix(streamedText, sentences);
      if (remainder) enqueueSpeech(remainder);
    }
    // enqueueSpeech intentionally reads current refs; rerunning on its identity would replay audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status, streamedText]);

  if (!open) return null;

  const label = assistantSpeaking
    ? "\u0110ang n\u00f3i"
    : transcribing || (status !== null && status !== "completed")
      ? "\u0110ang suy ngh\u0129"
      : muted
        ? "\u0110\u00e3 t\u1eaft ti\u1ebfng"
        : "\u0110ang nghe";
  const circleScale = 0.88 + rmsLevel * 0.38;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-950/60 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}>
      <section className="moodie-voice-panel flex flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-neutral-950 text-white shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label="Trò chuyện bằng giọng nói">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${muted ? "bg-white/35" : assistantSpeaking || transcribing ? "bg-warning animate-pulse" : "bg-success animate-pulse"}`} aria-hidden="true" />
            <p className="text-sm font-semibold">Moodie</p>
          </div>
        <Button type="button" unstyled className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" onClick={() => onCloseRef.current()} aria-label="\u0110\u00f3ng ch\u1ebf \u0111\u1ed9 gi\u1ecdng n\u00f3i">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center sm:h-40 sm:w-40">
          <div className="absolute inset-8 rounded-full bg-primary/20 blur-3xl transition-transform duration-100" style={{ transform: `scale(${circleScale})` }} />
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-primary to-violet-500 shadow-xl transition-transform duration-100 sm:h-28 sm:w-28" style={{ transform: `scale(${circleScale})` }}>
            {muted ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold" aria-live="polite">{label}</p>
          <p className="mt-2 text-sm text-white/55">{muted ? "Nh\u1ea5n M \u0111\u1ec3 b\u1eadt micro" : "B\u1ea1n c\u00f3 th\u1ec3 n\u00f3i b\u1ea5t c\u1ee9 l\u00fac n\u00e0o"}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 safe-area-pb sm:px-5">
        <VoiceTextComposer onSend={async (text) => { await onSendVoiceMessage(text); }} />
        <div className="flex justify-center">
          <Button type="button" unstyled className={`flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-4 transition ${muted ? "bg-white text-neutral-950" : "bg-white/10 text-white hover:bg-white/20"}`} onClick={() => setMuted((current) => !current)} aria-label={muted ? "B\u1eadt micro" : "T\u1eaft micro"}>
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span className="text-sm font-medium">{muted ? "Bật mic" : "Tắt mic"}</span>
          </Button>
        </div>
      </div>
      </section>
    </div>
  );
}

export function MoodieVoiceOverlay({
  open,
  onClose,
  streamedText,
  status: cascadeStatus,
  onSendVoiceMessage,
  onStopGeneration,
}: MoodieVoiceOverlayProps) {
  const [useCascade, setUseCascade] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const startRef = useRef<() => Promise<void>>(async () => {});
  const stopRef = useRef<() => void>(() => {});
  const toggleMuteRef = useRef<() => void>(() => {});
  const statusRef = useRef<"idle" | "connecting" | "listening" | "speaking" | "error">("idle");

  const {
    status,
    start,
    stop,
    muted,
    toggleMute,
    sendText,
    inputLevelRef,
    outputLevelRef,
    userTranscript,
    modelTranscript,
  } = useMoodieLiveVoice({
    conversationId,
    onConversationId: setConversationId,
    onError: () => {
      toast.error("Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i ch\u1ebf \u0111\u1ed9 gi\u1ecdng n\u00f3i");
      onCloseRef.current();
    },
    onEngineFallback: () => {
      toast.info("\u0110ang d\u00f9ng ch\u1ebf \u0111\u1ed9 d\u1ef1 ph\u00f2ng");
      setUseCascade(true);
    },
  });

  useEffect(() => {
    onCloseRef.current = onClose;
    startRef.current = start;
    stopRef.current = stop;
    toggleMuteRef.current = toggleMute;
    statusRef.current = status;
  }, [onClose, start, status, stop, toggleMute]);

  useEffect(() => {
    if (!open) {
      stopRef.current();
      queueMicrotask(() => setUseCascade(false));
      return;
    }

    void startRef.current();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key.toLowerCase() === "m") toggleMuteRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);

    const animate = () => {
      const currentStatus = statusRef.current;
      const level = currentStatus === "speaking"
        ? outputLevelRef.current
        : currentStatus === "listening"
          ? inputLevelRef.current
          : 0.04;
      const scale = 0.88 + level * 0.38;
      const transform = `scale(${scale})`;
      if (circleRef.current) circleRef.current.style.transform = transform;
      if (glowRef.current) glowRef.current.style.transform = transform;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      stopRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  if (useCascade) {
    return (
      <MoodieVoiceCascade
        open={open}
        onClose={onClose}
        streamedText={streamedText}
        status={cascadeStatus}
        onSendVoiceMessage={onSendVoiceMessage}
        onStopGeneration={onStopGeneration}
      />
    );
  }

  const label = status === "connecting"
    ? "\u0110ang k\u1ebft n\u1ed1i"
    : status === "error"
      ? "L\u1ed7i k\u1ebft n\u1ed1i"
      : status === "speaking"
        ? "Moodie \u0111ang n\u00f3i"
        : muted
          ? "\u0110\u00e3 t\u1eaft ti\u1ebfng"
          : "\u0110ang nghe";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-neutral-950/60 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}>
      <section className="moodie-voice-panel flex flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-neutral-950 text-white shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label="Trò chuyện bằng giọng nói">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${muted ? "bg-white/35" : status === "connecting" ? "bg-warning animate-pulse" : status === "error" ? "bg-error" : "bg-success animate-pulse"}`} aria-hidden="true" />
            <p className="text-sm font-semibold">Moodie</p>
          </div>
        <Button type="button" unstyled className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" onClick={() => onCloseRef.current()} aria-label="\u0110\u00f3ng ch\u1ebf \u0111\u1ed9 gi\u1ecdng n\u00f3i">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center sm:h-40 sm:w-40">
          <div ref={glowRef} className="absolute inset-8 rounded-full bg-primary/20 blur-3xl transition-transform duration-100" />
          <div ref={circleRef} className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-primary to-violet-500 shadow-xl transition-transform duration-100 sm:h-28 sm:w-28">
            {muted ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold" aria-live="polite">{label}</p>
          <p className="mt-2 text-sm text-white/55">{muted ? "Nh\u1ea5n M \u0111\u1ec3 b\u1eadt micro" : "B\u1ea1n c\u00f3 th\u1ec3 n\u00f3i b\u1ea5t c\u1ee9 l\u00fac n\u00e0o"}</p>
        </div>
        <div className="w-full rounded-2xl bg-white/5 px-4 py-3 text-center">
          <p className="min-h-6 text-sm text-white/45">{userTranscript || "Lời bạn nói sẽ hiện ở đây"}</p>
          <p className="mt-2 min-h-7 text-sm font-medium leading-6 text-white/90 sm:text-base">{modelTranscript || "Moodie đang sẵn sàng lắng nghe"}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 safe-area-pb sm:px-5">
        <VoiceTextComposer disabled={status === "connecting" || status === "error"} onSend={sendText} />
        <div className="flex justify-center">
          <Button type="button" unstyled className={`flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-4 transition ${muted ? "bg-white text-neutral-950" : "bg-white/10 text-white hover:bg-white/20"}`} onClick={toggleMute} aria-label={muted ? "B\u1eadt micro" : "T\u1eaft micro"}>
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span className="text-sm font-medium">{muted ? "Bật mic" : "Tắt mic"}</span>
          </Button>
        </div>
      </div>
      </section>
    </div>
  );
}
