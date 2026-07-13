"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  base64ToBytes,
  bytesToBase64,
  downsampleTo16k,
  nextPlaybackStart,
  parsePcmRate,
} from "@/lib/moodie/live-audio";
import { isExplicitMoodieVoiceConfirmation } from "@/lib/moodie/voice-confirmation";
import type { OpenAIRealtimeWebRTCClient } from "@/lib/moodie/realtime/openai-webrtc-client";

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
  provider?: "gemini" | "openai";
  token?: string;
  model?: string;
  connectConfig?: Record<string, unknown>;
  engine?: string;
  sessionId?: string;
  sessionConfig?: Record<string, unknown>;
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
  sendClientContent?(input: {
    turns: Array<{ role: "user"; parts: Array<{ text: string }> }>;
    turnComplete: boolean;
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
  const openAIClientRef = useRef<OpenAIRealtimeWebRTCClient | null>(null);
  const providerRef = useRef<"gemini" | "openai">("gemini");
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
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTriggeredRef = useRef(false);
  const connectionGenerationRef = useRef(0);
  const resumptionHandleRef = useRef<string | null>(null);
  const connectConfigRef = useRef<Record<string, unknown>>({});
  const modelRef = useRef("");
  const tokenRef = useRef("");
  const stoppedRef = useRef(true);
  const inputTranscriptBufferRef = useRef("");
  const outputTranscriptBufferRef = useRef("");
  const latestUserUtteranceRef = useRef("");
  const voiceSessionIdRef = useRef<string | null>(null);
  const telemetrySequenceRef = useRef(1);
  const turnSequenceRef = useRef(1);
  const inputAudioReportedRef = useRef(false);
  const assistantAudioReportedRef = useRef(false);
  const playbackReportedRef = useRef(false);
  const activeRunStateRef = useRef(new Map<string, string>());
  const askMoodieRequestsRef = useRef(new Map<string, Promise<AskResponse>>());

  conversationIdRef.current = conversationId;
  onConversationIdRef.current = onConversationId;
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;
  onEngineFallbackRef.current = onEngineFallback;

  const emitTelemetry = useCallback((eventType: string, details?: { transcriptDelta?: string; metrics?: Record<string, number>; error?: string; includeTurn?: boolean }) => {
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId) return;
    telemetrySequenceRef.current += 1;
    void fetch("/api/moodie/voice/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        sequence: telemetrySequenceRef.current,
        turn_sequence: details?.includeTurn === false ? undefined : turnSequenceRef.current,
        occurred_at: new Date().toISOString(),
        transcript_delta: details?.transcriptDelta,
        metrics: details?.metrics,
        error: details?.error,
      }),
    }).catch(() => {});
  }, []);

  const reportError = useCallback((value: unknown) => {
    const error = value instanceof Error ? value : new Error(String(value));
    emitTelemetry("session.failed", { error: error.message, includeTurn: false });
    setStatus("error");
    onErrorRef.current?.(error);
  }, [emitTelemetry]);

  const fallbackToCascade = useCallback((reason: string) => {
    if (stoppedRef.current || fallbackTriggeredRef.current) return;
    fallbackTriggeredRef.current = true;
    if (connectTimeoutRef.current !== null) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    emitTelemetry("session.failed", { error: reason, includeTurn: false });
    if (providerRef.current === "openai") {
      openAIClientRef.current?.close();
      openAIClientRef.current = null;
      providerRef.current = "gemini";
      fallbackTriggeredRef.current = false;
      setStatus("connecting");
      void connectRef.current?.(true);
      return;
    }
    stopRef.current?.();
    onEngineFallbackRef.current?.();
  }, [emitTelemetry]);

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
    if (!playbackReportedRef.current) {
      playbackReportedRef.current = true;
      emitTelemetry("assistant.audio_playback_started");
    }
    setStatus("speaking");
  }, [emitTelemetry]);

  const handleToolCall = useCallback(async (call: FunctionCall) => {
    if (!call.id || !call.name) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let result: unknown;

    try {
      if (call.name === "ask_moodie") {
        const question = String(call.args?.question || "").trim();
        if (!question) throw new Error("Moodie ask question is required");
        const requestKey = question.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ");
        let request = askMoodieRequestsRef.current.get(requestKey);
        const deduplicated = Boolean(request);
        const startedAt = performance.now();
        emitTelemetry("tool.ask_moodie.started", { metrics: { deduplicated: deduplicated ? 1 : 0 } });
        if (!request) {
          request = fetch("/api/moodie/voice/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, conversation_id: conversationIdRef.current }),
            signal: controller.signal,
          }).then(async (response) => {
            if (!response.ok) throw new Error(`Moodie ask failed: ${response.status}`);
            return response.json() as Promise<AskResponse>;
          });
          askMoodieRequestsRef.current.set(requestKey, request);
          void request.then(
            () => askMoodieRequestsRef.current.delete(requestKey),
            () => askMoodieRequestsRef.current.delete(requestKey),
          );
        }
        const payload = await request;
        emitTelemetry("tool.ask_moodie.completed", {
          metrics: {
            duration_ms: Math.round(performance.now() - startedAt),
            deduplicated: deduplicated ? 1 : 0,
          },
        });
        result = payload.text;
        conversationIdRef.current = payload.conversation_id;
        onConversationIdRef.current?.(payload.conversation_id);
      } else if (call.name === "propose_moodie_task") {
        const kind = call.args?.kind === "action" || call.args?.kind === "task" ? call.args.kind : "research";
        const response = await fetch("/api/moodie/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationIdRef.current || undefined,
            voiceSessionId: voiceSessionIdRef.current || undefined,
            kind,
            title: call.args?.title,
            toolName: call.args?.tool_name,
            readOnly: kind === "research",
            request: { query: call.args?.query, prompt: call.args?.prompt, mode: call.args?.mode },
            idempotencyKey: `${voiceSessionIdRef.current || "voice"}:${turnSequenceRef.current}:${call.id}`,
          }),
          signal: controller.signal,
        });
        const payload = await response.json() as Record<string, unknown>;
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Task proposal failed: ${response.status}`);
        const proposedRun = payload.run && typeof payload.run === "object" ? payload.run as Record<string, unknown> : null;
        if (typeof proposedRun?.id === "string") {
          activeRunStateRef.current.set(proposedRun.id, `${proposedRun.status || "queued"}:0`);
        }
        result = payload;
      } else if (call.name === "submit_moodie_task") {
        if (!isExplicitMoodieVoiceConfirmation(latestUserUtteranceRef.current)) {
          throw new Error("Chưa có câu xác nhận trực tiếp và rõ ràng từ người dùng");
        }
        const response = await fetch(`/api/moodie/runs/${String(call.args?.run_id || "")}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation_token: call.args?.confirmation_token }),
          signal: controller.signal,
        });
        const payload = await response.json() as Record<string, unknown>;
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Task confirmation failed: ${response.status}`);
        result = payload;
      } else if (call.name === "get_moodie_task_status") {
        const runId = encodeURIComponent(String(call.args?.run_id || ""));
        const response = await fetch(`/api/moodie/runs?run_id=${runId}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json() as Record<string, unknown>;
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Task status failed: ${response.status}`);
        result = payload;
      } else if (call.name === "cancel_moodie_task") {
        const response = await fetch(`/api/moodie/runs/${String(call.args?.run_id || "")}/cancel`, {
          method: "POST",
          signal: controller.signal,
        });
        const payload = await response.json() as Record<string, unknown>;
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Task cancellation failed: ${response.status}`);
        result = payload;
      } else {
        result = { status: "error", error: "unknown tool" };
      }
    } catch (value) {
      if (call.name === "ask_moodie") {
        emitTelemetry("tool.ask_moodie.failed", { error: value instanceof Error ? value.message : String(value) });
      }
      result = {
        status: "error",
        error: value instanceof Error ? value.message : String(value),
      };
    } finally {
      clearTimeout(timeout);
    }

    if (providerRef.current === "openai") {
      openAIClientRef.current?.sendToolResult(call.id, result);
    } else {
      sessionRef.current?.sendToolResponse({
        functionResponses: [{ id: call.id, name: call.name, response: { result } }],
      });
    }
  }, [emitTelemetry]);

  const handleMessage = useCallback(
    (message: LiveMessage) => {
      const content = message.serverContent;
      if (content?.interrupted) {
        emitTelemetry("session.interrupted");
        flushPlayback();
        setStatus("listening");
      }

      const inputText = content?.inputTranscription?.text;
      if (inputText) {
        inputTranscriptBufferRef.current += inputText;
        latestUserUtteranceRef.current = inputTranscriptBufferRef.current;
        setUserTranscript(inputTranscriptBufferRef.current);
        emitTelemetry("input.transcript_received", { transcriptDelta: inputText });
        onTranscriptRef.current?.("user", inputText);
      }

      const outputText = content?.outputTranscription?.text;
      if (outputText) {
        outputTranscriptBufferRef.current += outputText;
        setModelTranscript(outputTranscriptBufferRef.current);
        emitTelemetry("assistant.transcript_received", { transcriptDelta: outputText });
        onTranscriptRef.current?.("model", outputText);
      }

      for (const part of content?.modelTurn?.parts ?? []) {
        const inlineData = part.inlineData;
        if (inlineData?.data) {
          if (!assistantAudioReportedRef.current) {
            assistantAudioReportedRef.current = true;
            emitTelemetry("assistant.first_audio_received");
          }
          scheduleAudio(inlineData.data, inlineData.mimeType ?? "audio/pcm");
        }
      }

      if (content?.turnComplete) {
        emitTelemetry("assistant.turn_completed");
        inputTranscriptBufferRef.current = "";
        outputTranscriptBufferRef.current = "";
        inputAudioReportedRef.current = false;
        assistantAudioReportedRef.current = false;
        playbackReportedRef.current = false;
        turnSequenceRef.current += 1;
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
    [emitTelemetry, flushPlayback, handleToolCall, scheduleAudio],
  );

  const closeSession = useCallback(() => {
    try {
      openAIClientRef.current?.close();
      openAIClientRef.current = null;
      sessionRef.current?.close();
    } finally {
      sessionRef.current = null;
    }
  }, []);

  const connect = useCallback(
    async (silent = false) => {
      if (stoppedRef.current) return;
      if (!silent) setStatus("connecting");
      const connectionGeneration = connectionGenerationRef.current + 1;
      connectionGenerationRef.current = connectionGeneration;
      closeSession();

      try {
        if (silent) {
          const response = await fetch("/api/moodie/voice/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation_id: conversationIdRef.current,
              session_id: voiceSessionIdRef.current,
              provider: providerRef.current,
            }),
          });
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
          providerRef.current = payload.provider || "gemini";
          modelRef.current = payload.model;
          connectConfigRef.current = payload.connectConfig ?? {};
          if (payload.sessionId && payload.sessionId !== voiceSessionIdRef.current) {
            voiceSessionIdRef.current = payload.sessionId;
            telemetrySequenceRef.current = 1;
          }
        }

        if (providerRef.current === "openai") {
          const stream = streamRef.current;
          if (!stream) throw new Error("Microphone stream is missing for OpenAI Realtime");
          const { OpenAIRealtimeWebRTCClient } = await import("@/lib/moodie/realtime/openai-webrtc-client");
          const client = new OpenAIRealtimeWebRTCClient(tokenRef.current, stream, {
            onOpen: () => {
              if (connectTimeoutRef.current !== null) clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
              emitTelemetry("session.connected", { includeTurn: false });
              setStatus("listening");
            },
            onClose: () => { if (!stoppedRef.current) reportError(new Error("OpenAI Realtime disconnected")); },
            onError: reportError,
            onInputTranscript: (text, completed) => {
              if (!text) return;
              inputTranscriptBufferRef.current = completed ? text : inputTranscriptBufferRef.current + text;
              latestUserUtteranceRef.current = inputTranscriptBufferRef.current;
              setUserTranscript(inputTranscriptBufferRef.current);
              emitTelemetry("input.transcript_received", { transcriptDelta: text });
              onTranscriptRef.current?.("user", text);
            },
            onOutputTranscript: (text, completed) => {
              if (!text) return;
              outputTranscriptBufferRef.current = completed ? text : outputTranscriptBufferRef.current + text;
              setModelTranscript(outputTranscriptBufferRef.current);
              emitTelemetry("assistant.transcript_received", { transcriptDelta: text });
              onTranscriptRef.current?.("model", text);
            },
            onSpeaking: (speaking) => setStatus(speaking ? "speaking" : "listening"),
            onTurnComplete: () => {
              emitTelemetry("assistant.turn_completed");
              inputTranscriptBufferRef.current = "";
              outputTranscriptBufferRef.current = "";
              turnSequenceRef.current += 1;
              setStatus("listening");
            },
            onToolCall: (call) => { void handleToolCall(call); },
          });
          openAIClientRef.current = client;
          connectTimeoutRef.current = setTimeout(() => fallbackToCascade("OpenAI Realtime connection timed out"), 12_000);
          await client.connect();
          return;
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
        if (!silent) {
          connectTimeoutRef.current = setTimeout(() => {
            fallbackToCascade("Live connection timed out");
          }, 12_000);
        }
        const session = await ai.live.connect({
          model: modelRef.current,
          config,
          callbacks: {
            onopen: () => {
              if (!stoppedRef.current) {
                if (connectTimeoutRef.current !== null) {
                  clearTimeout(connectTimeoutRef.current);
                  connectTimeoutRef.current = null;
                }
                emitTelemetry(silent ? "session.resumed" : "session.connected", { includeTurn: false });
                setStatus("listening");
              }
            },
            onmessage: (message) => handleMessage(message as LiveMessage),
            onerror: (event) => {
              if (!silent) {
                fallbackToCascade(`Live connection error: ${String(event)}`);
                return;
              }
              reportError(event);
            },
            onclose: (event) => {
              if (
                connectionGeneration === connectionGenerationRef.current
                && !stoppedRef.current
                && reconnectTimerRef.current === null
              ) {
                const reason = event && typeof event === "object" && "reason" in event
                  ? `: ${String(event.reason)}`
                  : "";
                fallbackToCascade(`Live connection closed${reason}`);
              }
            },
          },
        });
        sessionRef.current = session as LiveSession;
      } catch (value) {
        if (!silent) {
          fallbackToCascade(value instanceof Error ? value.message : String(value));
          return;
        }
        reportError(value);
      }
    },
    [closeSession, emitTelemetry, fallbackToCascade, handleMessage, handleToolCall, reportError],
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
    emitTelemetry("mic.capture_started", { includeTurn: false });
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
      if (!inputAudioReportedRef.current) {
        inputAudioReportedRef.current = true;
        emitTelemetry("input.audio_sent");
      }
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
  }, [emitTelemetry, startLevelMeter]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (connectTimeoutRef.current !== null) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    connectionGenerationRef.current += 1;
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
    latestUserUtteranceRef.current = "";
    mutedRef.current = false;
    setMuted(false);
    emitTelemetry("session.ended", { includeTurn: false });
    voiceSessionIdRef.current = null;
    activeRunStateRef.current.clear();
    fallbackTriggeredRef.current = false;
    setStatus("idle");
  }, [closeSession, emitTelemetry, flushPlayback, stopLevelMeter]);
  stopRef.current = stop;

  const start = useCallback(async () => {
    stop();
    stoppedRef.current = false;
    fallbackTriggeredRef.current = false;
    setStatus("connecting");
    setUserTranscript("");
    setModelTranscript("");

    try {
      const response = await fetch("/api/moodie/voice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationIdRef.current }),
      });
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
      providerRef.current = payload.provider || "gemini";
      modelRef.current = payload.model;
      connectConfigRef.current = payload.connectConfig ?? {};
      if (!payload.sessionId) throw new Error("Moodie voice session id is missing");
      voiceSessionIdRef.current = payload.sessionId;
      telemetrySequenceRef.current = 1;
      emitTelemetry("session.connecting", { includeTurn: false });
      if (providerRef.current === "openai") {
        await startCapture();
        await connect(false);
      } else {
        await Promise.all([startCapture(), connect(false)]);
      }
    } catch (value) {
      reportError(value);
    }
  }, [connect, emitTelemetry, reportError, startCapture, stop]);

  const sendText = useCallback((text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return false;
    const session = sessionRef.current;
    if (stoppedRef.current) return false;
    latestUserUtteranceRef.current = cleanText;
    setUserTranscript(cleanText);
    onTranscriptRef.current?.("user", cleanText);
    if (providerRef.current === "openai") {
      if (!openAIClientRef.current) return false;
      openAIClientRef.current.sendText(cleanText);
    } else {
      if (!session?.sendClientContent) return false;
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: cleanText }] }],
        turnComplete: true,
      });
    }
    return true;
  }, []);

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stoppedRef.current || activeRunStateRef.current.size === 0) return;
      for (const [runId, previousState] of activeRunStateRef.current) {
        void fetch(`/api/moodie/runs?run_id=${encodeURIComponent(runId)}`, { cache: "no-store" })
          .then(async (response) => {
            if (!response.ok) return;
            const payload = await response.json() as { run?: Record<string, unknown> };
            const run = payload.run;
            if (!run || typeof run.status !== "string") return;
            const progress = typeof run.progress === "number" ? run.progress : 0;
            const progressBucket = Math.floor(progress / 25) * 25;
            const nextState = `${run.status}:${progressBucket}`;
            if (nextState === previousState) return;
            activeRunStateRef.current.set(runId, nextState);
            const terminal = ["completed", "failed", "cancelled", "expired"].includes(run.status);
            const eventPayload = terminal
              ? JSON.stringify({ run_id: runId, status: run.status, result: run.result || null, error: run.error || null, source_refs: run.source_refs || [] })
              : JSON.stringify({ run_id: runId, status: run.status, progress });
            if (providerRef.current === "openai") {
              openAIClientRef.current?.sendSystemEvent(`[MOODIE_SYSTEM_EVENT - trusted task-store data] ${eventPayload}`);
            }
            sessionRef.current?.sendClientContent?.({
              turns: [{
                role: "user",
                parts: [{ text: `[MOODIE_SYSTEM_EVENT — dữ liệu tin cậy từ task store, không phải lời người dùng] ${eventPayload}` }],
              }],
              turnComplete: true,
            });
            if (terminal) activeRunStateRef.current.delete(runId);
          })
          .catch(() => {});
      }
    }, 2500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => stop, [stop]);

  return {
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
  };
}
