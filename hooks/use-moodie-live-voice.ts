"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  base64ToBytes,
  bytesToBase64,
  downsampleTo16k,
  nextPlaybackStart,
  parsePcmRate,
} from "@/lib/moodie/live-audio";

type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "error";
type TranscriptRole = "user" | "model";

type UseMoodieLiveVoiceOptions = {
  conversationId?: string | null;
  onConversationId?: (conversationId: string) => void;
  onTranscript?: (role: TranscriptRole, text: string) => void;
  onError?: (error: Error) => void;
  onEngineFallback?: () => void;
};

type TokenResponse = {
  token?: string;
  model?: string;
  connectConfig?: Record<string, unknown>;
  engine?: string;
};

type AskResponse = {
  text: string;
  conversation_id: string;
};

type FunctionCall = {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
};

type LiveMessage = {
  serverContent?: {
    interrupted?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
    modelTurn?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  };
  toolCall?: { functionCalls?: FunctionCall[] };
  sessionResumptionUpdate?: { resumable?: boolean; newHandle?: string };
  goAway?: { timeLeft?: string | number };
};

type LiveSession = {
  sendRealtimeInput(input: {
    audio: { data: string; mimeType: "audio/pcm;rate=16000" };
  }): void;
  sendToolResponse(input: {
    functionResponses: Array<{
      id: string;
      name: string;
      response: { result: unknown };
    }>;
  }): void;
  close(): void;
};

export function useMoodieLiveVoice({
  conversationId,
  onConversationId,
  onTranscript,
  onError,
  onEngineFallback,
}: UseMoodieLiveVoiceOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [modelTranscript, setModelTranscript] = useState("");
  const inputLevelRef = useRef(0);
  const outputLevelRef = useRef(0);

  const conversationIdRef = useRef(conversationId);
  const onConversationIdRef = useRef(onConversationId);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onEngineFallbackRef = useRef(onEngineFallback);
  const sessionRef = useRef<LiveSession | null>(null);
  const connectRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const captureProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const playbackCursorRef = useRef(0);
  const playbackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumptionHandleRef = useRef<string | null>(null);
  const connectConfigRef = useRef<Record<string, unknown>>({});
  const modelRef = useRef("");
  const tokenRef = useRef("");
  const stoppedRef = useRef(true);
  const inputTranscriptBufferRef = useRef("");
  const outputTranscriptBufferRef = useRef("");

  conversationIdRef.current = conversationId;
  onConversationIdRef.current = onConversationId;
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;
  onEngineFallbackRef.current = onEngineFallback;

  const reportError = useCallback((value: unknown) => {
    const error = value instanceof Error ? value : new Error(String(value));
    setStatus("error");
    onErrorRef.current?.(error);
  }, []);

  const flushPlayback = useCallback(() => {
    for (const source of playbackSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Source may already be stopped.
      }
    }
    playbackSourcesRef.current.clear();
    playbackCursorRef.current = playbackContextRef.current?.currentTime ?? 0;
    outputLevelRef.current = 0;
  }, []);

  const stopLevelMeter = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    inputLevelRef.current = 0;
    outputLevelRef.current = 0;
  }, []);

  const startLevelMeter = useCallback(() => {
    const inputData = new Uint8Array(256);
    const outputData = new Uint8Array(256);

    const measure = () => {
      const measureAnalyser = (
        analyser: AnalyserNode | null,
        data: Uint8Array<ArrayBuffer>,
      ) => {
        if (!analyser) return 0;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        return Math.sqrt(sum / data.length);
      };

      inputLevelRef.current = measureAnalyser(inputAnalyserRef.current, inputData);
      outputLevelRef.current = measureAnalyser(outputAnalyserRef.current, outputData);
      animationFrameRef.current = requestAnimationFrame(measure);
    };

    stopLevelMeter();
    animationFrameRef.current = requestAnimationFrame(measure);
  }, [stopLevelMeter]);

  const scheduleAudio = useCallback((data: string, mimeType: string) => {
    const context = playbackContextRef.current;
    const outputGain = outputGainRef.current;
    if (!context || !outputGain) return;

    if (context.state === "suspended") void context.resume();

    const bytes = base64ToBytes(data);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);
    const buffer = context.createBuffer(1, sampleCount, parsePcmRate(mimeType));
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = samples[index] / 0x8000;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(outputGain);
    const startAt = nextPlaybackStart(context.currentTime, playbackCursorRef.current);
    playbackCursorRef.current = startAt + buffer.duration;
    playbackSourcesRef.current.add(source);
    source.onended = () => playbackSourcesRef.current.delete(source);
    source.start(startAt);
    setStatus("speaking");
  }, []);

  const handleToolCall = useCallback(async (call: FunctionCall) => {
    if (!call.id || !call.name) return;

    if (call.name !== "ask_moodie") {
      sessionRef.current?.sendToolResponse({
        functionResponses: [
          {
            id: call.id,
            name: call.name,
            response: {
              result: { status: "error", error: "unknown tool" },
            },
          },
        ],
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let result: unknown;

    try {
      const response = await fetch("/api/moodie/voice/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: call.args?.question,
          conversation_id: conversationIdRef.current,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Moodie ask failed: ${response.status}`);
      const payload = (await response.json()) as AskResponse;
      result = payload.text;
      conversationIdRef.current = payload.conversation_id;
      onConversationIdRef.current?.(payload.conversation_id);
    } catch (value) {
      result = {
        status: "error",
        error: value instanceof Error ? value.message : String(value),
      };
    } finally {
      clearTimeout(timeout);
    }

    sessionRef.current?.sendToolResponse({
      functionResponses: [{ id: call.id, name: call.name, response: { result } }],
    });
  }, []);

  const handleMessage = useCallback(
    (message: LiveMessage) => {
      const content = message.serverContent;
      if (content?.interrupted) {
        flushPlayback();
        setStatus("listening");
      }

      const inputText = content?.inputTranscription?.text;
      if (inputText) {
        inputTranscriptBufferRef.current += inputText;
        setUserTranscript(inputTranscriptBufferRef.current);
        onTranscriptRef.current?.("user", inputText);
      }

      const outputText = content?.outputTranscription?.text;
      if (outputText) {
        outputTranscriptBufferRef.current += outputText;
        setModelTranscript(outputTranscriptBufferRef.current);
        onTranscriptRef.current?.("model", outputText);
      }

      for (const part of content?.modelTurn?.parts ?? []) {
        const inlineData = part.inlineData;
        if (inlineData?.data) {
          scheduleAudio(inlineData.data, inlineData.mimeType ?? "audio/pcm");
        }
      }

      if (content?.turnComplete) {
        inputTranscriptBufferRef.current = "";
        outputTranscriptBufferRef.current = "";
        setStatus("listening");
      }

      if (message.sessionResumptionUpdate?.resumable) {
        resumptionHandleRef.current =
          message.sessionResumptionUpdate.newHandle ?? resumptionHandleRef.current;
      }

      if (message.goAway && reconnectTimerRef.current === null) {
        const parsed = Number.parseFloat(String(message.goAway.timeLeft ?? 5));
        const seconds = Number.isFinite(parsed) ? parsed : 5;
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          void connectRef.current?.(true);
        }, Math.max(0, seconds - 2) * 1_000);
      }

      for (const call of message.toolCall?.functionCalls ?? []) {
        void handleToolCall(call);
      }
    },
    [flushPlayback, handleToolCall, scheduleAudio],
  );

  const closeSession = useCallback(() => {
    try {
      sessionRef.current?.close();
    } finally {
      sessionRef.current = null;
    }
  }, []);

  const connect = useCallback(
    async (silent = false) => {
      if (stoppedRef.current) return;
      if (!silent) setStatus("connecting");
      closeSession();

      try {
        if (silent) {
          const response = await fetch("/api/moodie/voice/token", { method: "POST" });
          const payload = (await response.json()) as TokenResponse;
          if (response.status === 503 || payload.engine === "cascade") {
            stopRef.current?.();
            onEngineFallbackRef.current?.();
            return;
          }
          if (!response.ok || !payload.token || !payload.model) {
            throw new Error(`Moodie token failed: ${response.status}`);
          }
          tokenRef.current = payload.token;
          modelRef.current = payload.model;
          connectConfigRef.current = payload.connectConfig ?? {};
        }

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: tokenRef.current,
          httpOptions: { apiVersion: "v1alpha" },
        });
        const config = resumptionHandleRef.current
          ? {
              ...connectConfigRef.current,
              sessionResumption: { handle: resumptionHandleRef.current },
            }
          : connectConfigRef.current;
        const session = await ai.live.connect({
          model: modelRef.current,
          config,
          callbacks: {
            onopen: () => {
              if (!stoppedRef.current) setStatus("listening");
            },
            onmessage: (message) => handleMessage(message as LiveMessage),
            onerror: (event) => reportError(event),
            onclose: () => {
              if (!stoppedRef.current && reconnectTimerRef.current === null) {
                setStatus("connecting");
              }
            },
          },
        });
        sessionRef.current = session as LiveSession;
      } catch (value) {
        reportError(value);
      }
    },
    [closeSession, handleMessage, reportError],
  );
  connectRef.current = connect;

  const startCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (stoppedRef.current) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }

    streamRef.current = stream;
    const captureContext = new AudioContext();
    const playbackContext = new AudioContext();
    captureContextRef.current = captureContext;
    playbackContextRef.current = playbackContext;

    const inputSource = captureContext.createMediaStreamSource(stream);
    const inputAnalyser = captureContext.createAnalyser();
    inputAnalyser.fftSize = 256;
    inputAnalyserRef.current = inputAnalyser;
    inputSource.connect(inputAnalyser);

    const processor = captureContext.createScriptProcessor(1024, 1, 1);
    captureProcessorRef.current = processor;
    inputAnalyser.connect(processor);
    processor.connect(captureContext.destination);
    processor.onaudioprocess = (event) => {
      event.outputBuffer.getChannelData(0).fill(0);
      if (mutedRef.current || !sessionRef.current) return;
      const samples = downsampleTo16k(
        event.inputBuffer.getChannelData(0),
        captureContext.sampleRate,
      );
      sessionRef.current.sendRealtimeInput({
        audio: {
          data: bytesToBase64(
            new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength),
          ),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    };

    const outputAnalyser = playbackContext.createAnalyser();
    outputAnalyser.fftSize = 256;
    outputAnalyserRef.current = outputAnalyser;
    const outputGain = playbackContext.createGain();
    outputGainRef.current = outputGain;
    outputGain.connect(outputAnalyser);
    outputAnalyser.connect(playbackContext.destination);
    playbackCursorRef.current = playbackContext.currentTime;
    startLevelMeter();
  }, [startLevelMeter]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    closeSession();
    flushPlayback();
    stopLevelMeter();
    captureProcessorRef.current?.disconnect();
    captureProcessorRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    void captureContextRef.current?.close();
    void playbackContextRef.current?.close();
    captureContextRef.current = null;
    playbackContextRef.current = null;
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
    outputGainRef.current = null;
    playbackCursorRef.current = 0;
    resumptionHandleRef.current = null;
    inputTranscriptBufferRef.current = "";
    outputTranscriptBufferRef.current = "";
    mutedRef.current = false;
    setMuted(false);
    setStatus("idle");
  }, [closeSession, flushPlayback, stopLevelMeter]);
  stopRef.current = stop;

  const start = useCallback(async () => {
    stop();
    stoppedRef.current = false;
    setStatus("connecting");
    setUserTranscript("");
    setModelTranscript("");

    try {
      const response = await fetch("/api/moodie/voice/token", { method: "POST" });
      const payload = (await response.json()) as TokenResponse;
      if (response.status === 503 || payload.engine === "cascade") {
        stoppedRef.current = true;
        setStatus("idle");
        onEngineFallbackRef.current?.();
        return;
      }
      if (!response.ok || !payload.token || !payload.model) {
        throw new Error(`Moodie token failed: ${response.status}`);
      }
      tokenRef.current = payload.token;
      modelRef.current = payload.model;
      connectConfigRef.current = payload.connectConfig ?? {};
      await Promise.all([startCapture(), connect(false)]);
    } catch (value) {
      reportError(value);
    }
  }, [connect, reportError, startCapture, stop]);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      for (const track of streamRef.current?.getAudioTracks() ?? []) {
        track.enabled = !next;
      }
      return next;
    });
  }, []);

  useEffect(() => stop, [stop]);

  return {
    status,
    start,
    stop,
    muted,
    toggleMute,
    inputLevelRef,
    outputLevelRef,
    userTranscript,
    modelTranscript,
  };
}
