# Iris Realtime Voice Architecture Research

## Scope and executive summary

This report documents the current Iris realtime voice implementation in `C:\Users\Admin\Desktop\Ai\iris-main`. The production UI path is **renderer microphone → Electron IPC → `@google/genai` Live session in Electron main → renderer PCM playback**. Despite UI/event names such as `sidecar:start` and `sidecar_status`, the active app does not launch `sidecar/voice_server.py`; `startLive()` constructs the Gemini client directly in Electron and reports its own process PID (`electron/main.mjs:1595`, `electron/main.mjs:1608`, `electron/main.mjs:1612`, `electron/main.mjs:1617`, `electron/main.mjs:2065`). The Python sidecar is a parallel/legacy standalone implementation useful as design reference, while `useWakeWord` only wakes a sleeping app and is disabled while a Live session is running (`src/App.tsx:330`, `src/App.tsx:331`, `src/App.tsx:333`).

The smooth experience comes primarily from: browser WebRTC acoustic processing, small 1024-frame capture callbacks, immediate 16 kHz mono PCM streaming, Gemini server-side automatic turn detection (no custom VAD thresholds are configured), incremental 24 kHz PCM playback scheduled on one continuous Web Audio timeline with a 30 ms safety lead, immediate queue flush on interruption, context compression, and transparent session resumption before Gemini's server time limit (`src/hooks/useAudioPipeline.ts:66`, `src/hooks/useAudioPipeline.ts:78`, `src/hooks/useAudioPipeline.ts:91`, `src/hooks/useAudioPipeline.ts:95`, `src/hooks/useAudioPipeline.ts:169`, `src/hooks/useAudioPipeline.ts:171`, `electron/main.mjs:86`, `electron/main.mjs:95`, `electron/main.mjs:1424`, `electron/main.mjs:1432`).

## 1. Active Live session lifecycle (`electron/main.mjs`)

### 1.1 Process state

Electron main owns one global `liveSession`, one `GoogleGenAI` client, connection status, transcript buffers, a session-resumption handle, and a pending GoAway timer (`electron/main.mjs:69`, `electron/main.mjs:70`, `electron/main.mjs:71`, `electron/main.mjs:72`, `electron/main.mjs:73`, `electron/main.mjs:74`, `electron/main.mjs:95`, `electron/main.mjs:96`). `startLive()` is idempotent: if a session already exists it returns the current status (`electron/main.mjs:1595`, `electron/main.mjs:1596`). It rejects startup without `GEMINI_API_KEY` (`electron/main.mjs:1597`, `electron/main.mjs:1599`, `electron/main.mjs:1600`).

Default model:

```js
const model = process.env.GEMINI_LIVE_MODEL || "models/gemini-3.1-flash-live-preview";
```

Source: `electron/main.mjs:1603`.

Before connecting, Iris resets its Hermes confirmation gate, performs a fail-safe long-term-memory recall bounded to 2.5 seconds, creates `GoogleGenAI`, and emits connecting state (`electron/main.mjs:1604`, `electron/main.mjs:1607`, `electron/main.mjs:1608`, `electron/main.mjs:1610`; recall timeout at `electron/main.mjs:1554`).

### 1.2 Exact Live config

```js
return {
  responseModalities: ["AUDIO"],
  mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
  sessionResumption: sessionResumptionHandle ? { handle: sessionResumptionHandle } : {},
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: process.env.GEMINI_LIVE_VOICE || "Zephyr",
      },
    },
  },
  contextWindowCompression: {
    triggerTokens: 104857,
    slidingWindow: { targetTokens: 52428 },
  },
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  tools: [
    { googleSearch: {} },
    ...buildHermesTools(),
    ...buildIrisUiTools(),
  ],
  systemInstruction: { /* parts omitted here */ },
};
```

Source: `electron/main.mjs:1417` through `electron/main.mjs:1444`.

Important implications:

- Output is audio-only (`electron/main.mjs:1419`).
- The voice is environment-selectable and defaults to `Zephyr` (`electron/main.mjs:1425`, `electron/main.mjs:1428`).
- Both input and output audio transcription streams are requested (`electron/main.mjs:1436`, `electron/main.mjs:1437`).
- Context compression begins at 104,857 tokens and slides to 52,428 tokens, allowing a long-running voice relationship without unbounded context growth (`electron/main.mjs:1432`, `electron/main.mjs:1434`).
- **No `realtimeInputConfig.automaticActivityDetection` object is present.** Therefore Iris does not set start/end sensitivity, prefix padding, silence duration, or activity handling. It relies on Gemini Live's default automatic activity detection. This is an important porting fact: do not invent custom VAD constants when reproducing current behavior (`electron/main.mjs:1417` through `electron/main.mjs:1442`).
- Passing `{}` for `sessionResumption` intentionally requests resumption-update messages even before a handle exists (`electron/main.mjs:1421`, `electron/main.mjs:1424`).

### 1.3 Connect callbacks

Connection is created as:

```js
liveSession = await ai.live.connect({
  model,
  config: buildLiveConfig(),
  callbacks: {
    onopen() { /* status */ },
    onmessage(message) { handleLiveMessage(message); },
    onerror(error) { /* fatal event */ },
    onclose(event) { /* teardown */ },
  },
});
```

Source: `electron/main.mjs:1612` through `electron/main.mjs:1635`.

On open, the app marks itself running, reports the Electron PID, emits `gemini_status=connected` and `audio_state=listening`, and updates the tray (`electron/main.mjs:1616` through `electron/main.mjs:1621`). Incoming protocol messages are delegated synchronously to `handleLiveMessage()` (`electron/main.mjs:1623`, `electron/main.mjs:1624`). Errors are surfaced as fatal renderer events (`electron/main.mjs:1626`, `electron/main.mjs:1627`). On close, transcripts are flushed, the session reference is nulled, status becomes offline/idle, and the renderer is notified (`electron/main.mjs:1629` through `electron/main.mjs:1635`).

A fresh user wake sends a synthetic text system event causing Gemini to speak an immediate welcome; it is injected with `sendRealtimeInput({ text: greeting })`, not played locally (`electron/main.mjs:1586`, `electron/main.mjs:1591`). Pending Hermes completion announcements are likewise injected as text into the current Live conversation (`electron/main.mjs:1643`).

### 1.4 Server time-limit workaround, resumption, and renewal

The comments explicitly identify Gemini Live's server-side session time limit and the failure mode: `goAway` arrives shortly before hard socket closure; reconnecting without resumption loses server-side conversation state (`electron/main.mjs:86` through `electron/main.mjs:94`). Iris keeps `sessionResumptionHandle` and `goAwayReconnectTimer` globally (`electron/main.mjs:95`, `electron/main.mjs:96`).

`handleLiveMessage()` stores every resumable `newHandle` from `sessionResumptionUpdate` (`electron/main.mjs:1721` through `electron/main.mjs:1725`). On `goAway`, it parses `timeLeft`, defaults to five seconds if parsing fails, schedules reconnection before cutoff, and prevents duplicate timers (`electron/main.mjs:1728` through `electron/main.mjs:1734`). The reconnect path is deliberately silent: it is not treated as a user wake and skips the greeting (`electron/main.mjs:1647`; renewal intent at `electron/main.mjs:1663`, `electron/main.mjs:1664`). The next `buildLiveConfig()` supplies `{ handle: sessionResumptionHandle }`, resuming the server conversation (`electron/main.mjs:1424`).

This is not a periodic client keepalive. There is no ping loop or dummy-audio keepalive in the active Electron path. Longevity is achieved by protocol-driven `goAway` renewal plus session resumption, and context growth is controlled independently by sliding-window compression (`electron/main.mjs:1424`, `electron/main.mjs:1432`, `electron/main.mjs:1728`).

### 1.5 `handleLiveMessage`: every handled message type

1. **`sessionResumptionUpdate`**: cache `newHandle` when present (`electron/main.mjs:1721` through `electron/main.mjs:1725`).
2. **`goAway`**: schedule one transparent reconnect based on `timeLeft` (`electron/main.mjs:1728` through `electron/main.mjs:1734`).
3. **`toolCall`**: dispatch asynchronously; errors are logged rather than crashing the message loop (`electron/main.mjs:1739`, `electron/main.mjs:1740`).
4. **`serverContent.interrupted`**: emit `live:interrupt` to the renderer so scheduled playback is stopped, mark model turn complete for the Hermes gate, and update audio/UI state (`electron/main.mjs:1754`; gate semantics also documented in `electron/hermesGate.mjs:21`).
5. **`serverContent.inputTranscription.text`**: append incremental user text to `userTranscriptBuffer` (`electron/main.mjs:1759`, `electron/main.mjs:1760`).
6. **`serverContent.outputTranscription.text`**: append incremental model text to `modelTranscriptBuffer` (`electron/main.mjs:1771`). The code detects response start from output transcription and/or model audio so the completed user transcript can be surfaced promptly instead of waiting for turn completion (`electron/main.mjs:1765` through `electron/main.mjs:1767`).
7. **Model audio parts**: iterate `modelTurn.parts`, select `inlineData` with an audio MIME type, and emit `{data, mimeType}` on `live:audio` (`electron/main.mjs:1779`). The bytes remain base64 until renderer decoding.
8. **`serverContent.turnComplete`**: flush buffered transcripts, transition the audio state back toward listening, mark model turn complete, and trigger long-term-memory turn persistence (`electron/main.mjs:1783`; turn-pairing rationale at `electron/main.mjs:75` through `electron/main.mjs:79`, memory capture comments at `electron/main.mjs:147`).

`stopLive()` also emits `live:interrupt`, guaranteeing that app sleep/stop clears renderer playback rather than allowing queued speech to continue (`electron/main.mjs:1804`).

### 1.6 Realtime input forms

Mic audio enters Gemini as raw little-endian signed 16-bit mono PCM:

```js
const buffer = Buffer.from(new Uint8Array(arrayBuffer));
liveSession.sendRealtimeInput({
  audio: {
    data: buffer.toString("base64"),
    mimeType: "audio/pcm;rate=16000",
  },
});
```

Source: `electron/main.mjs:1812` through `electron/main.mjs:1821`.

Renderer IPC is one-way and low-overhead: `window.iris.sendAudioChunk(chunk)` maps to `ipcRenderer.send("live:audio", chunk)`, and main listens with `ipcMain.on("live:audio", ... sendAudioChunk)` (`electron/preload.cjs:36`, `electron/main.mjs:2093`).

Text is injected with the same API for welcome/system events, Hermes announcements, and typed commands (`electron/main.mjs:1591`, `electron/main.mjs:1643`, `electron/main.mjs:1831`). Text injection lets the Live model respond in the same voice/context without synthesizing separate TTS.

## 2. Tool calling

### 2.1 Declaration format

Tools are passed in `buildLiveConfig().tools` as one native Google Search declaration plus arrays containing `functionDeclarations` (`electron/main.mjs:1438` through `electron/main.mjs:1442`, `electron/main.mjs:1231`, `electron/main.mjs:1234`, `electron/main.mjs:1309`). Each function includes a name, spoken-agent-oriented description, JSON-schema-like `parameters`, and required fields where applicable (`electron/main.mjs:1241` through `electron/main.mjs:1255`).

Declared functions:

- Hermes worker integration: `check_hermes_status`, `propose_hermes_task`, `submit_hermes_task`, `get_hermes_task_status`, `stop_hermes_task`, `approve_hermes_action` (`electron/main.mjs:1236`, `electron/main.mjs:1241`, `electron/main.mjs:1258`, `electron/main.mjs:1274`, `electron/main.mjs:1284`, `electron/main.mjs:1293`).
- Iris/UI and direct media/browser actions: `get_iris_ui_context`, `go_to_sleep`, `control_iris_ui`, `watch_youtube_video`, `browser_navigate`, `browser_read_page`, `browser_click`, `browser_fill` (`electron/main.mjs:1314`, `electron/main.mjs:1320`, `electron/main.mjs:1326`, `electron/main.mjs:1352`, `electron/main.mjs:1369`, `electron/main.mjs:1384`, `electron/main.mjs:1390`, `electron/main.mjs:1400`).
- Native provider tool: Google Search (`electron/main.mjs:1439`).

### 2.2 Execution and response protocol

`handleToolCall()` loops over all `toolCall.functionCalls`, emits a UI event for observability, executes each call, and builds `{id, name, response: {result}}` records (`electron/main.mjs:1696` through `electron/main.mjs:1706`). Execution is wrapped in a timeout so a stuck local tool cannot leave the Live session permanently waiting; the code comment explicitly states Gemini cannot speak again until the tool response arrives (`electron/main.mjs:1681`, `electron/main.mjs:1696`). Failures are converted into response objects and surfaced as tool-result events (`electron/main.mjs:1706` through `electron/main.mjs:1710`). All responses from that tool-call message are returned together:

```js
liveSession.sendToolResponse({ functionResponses });
```

Source: `electron/main.mjs:1716`.

`executeTool()` is a strict switch dispatcher. It routes every declared function to its implementation and returns a structured unknown-tool error by default (`electron/main.mjs:1025` through `electron/main.mjs:1083`). The Hermes submit path enforces a two-turn human confirmation gate before dispatching work (`electron/main.mjs:1031` through `electron/main.mjs:1050`). `go_to_sleep` delays the actual renderer sleep event three seconds so Gemini's spoken goodbye can finish before playback teardown (`electron/main.mjs:1060` through `electron/main.mjs:1067`).

## 3. Renderer microphone capture

`useAudioPipeline` owns both browser audio directions (`src/hooks/useAudioPipeline.ts:4` through `src/hooks/useAudioPipeline.ts:7`). Starting Iris calls Electron `startSidecar`, records session state, and then starts browser capture (`src/App.tsx:569` through `src/App.tsx:574`).

### 3.1 Capture constraints

```ts
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
}
```

Source: `src/hooks/useAudioPipeline.ts:66` through `src/hooks/useAudioPipeline.ts:73`.

This requests the browser/WebRTC acoustic echo canceller, noise suppression, automatic gain control, and mono capture. The code logs that WebRTC echo cancellation is enabled (`src/hooks/useAudioPipeline.ts:106`).

### 3.2 ScriptProcessor path, not AudioWorklet

The implementation creates a default-rate `AudioContext`, a `MediaStreamAudioSourceNode`, and `createScriptProcessor(1024, 1, 1)` (`src/hooks/useAudioPipeline.ts:76` through `src/hooks/useAudioPipeline.ts:78`). There is no AudioWorklet in this path. The processor is connected to the destination because legacy ScriptProcessor callbacks generally require being in the graph, but its output buffer is zero-filled so microphone audio is never locally monitored (`src/hooks/useAudioPipeline.ts:88`, `src/hooks/useAudioPipeline.ts:89`, `src/hooks/useAudioPipeline.ts:99`).

### 3.3 PCM conversion and cadence

Every 1024 input frames, the callback down-samples the browser context rate to 16 kHz and converts Float32 samples to signed Int16 (`src/hooks/useAudioPipeline.ts:87`, `src/hooks/useAudioPipeline.ts:91`). `downsampleTo16k` uses bucket averaging, clamps to `[-1,1]`, and maps negative values through `0x8000` and non-negative values through `0x7fff` (`src/lib/audio.ts:1` through `src/lib/audio.ts:23`). This produces native little-endian Int16 bytes on the target platform; playback explicitly decodes little-endian (`src/hooks/useAudioPipeline.ts:151`).

The callback cadence depends on the actual `AudioContext.sampleRate`: about 21.3 ms at 48 kHz or 23.2 ms at 44.1 kHz. After downsampling, each typical chunk is about 341 or 371 mono samples (roughly 682 or 742 bytes). These durations are direct arithmetic consequences of the configured 1024-frame processor (`src/hooks/useAudioPipeline.ts:78`) and 16 kHz target (`src/lib/audio.ts:2`). There is no client aggregation or pre-send queue: each non-empty PCM block is copied into a standalone `ArrayBuffer` and immediately sent over IPC (`src/hooks/useAudioPipeline.ts:92` through `src/hooks/useAudioPipeline.ts:95`).

## 4. Renderer playback and interruption

The preload bridge subscribes to `live:audio` and `live:interrupt`; the hook maps those directly to `playChunk()` and `flushPlayback()` (`electron/preload.cjs:43` through `electron/preload.cjs:51`, `src/hooks/useAudioPipeline.ts:28` through `src/hooks/useAudioPipeline.ts:34`).

### 4.1 Decode format and sample rate

`playChunk()` extracts `rate=N` from the MIME type, defaulting to 24 kHz if missing (`src/hooks/useAudioPipeline.ts:138`, `src/lib/audio.ts:26` through `src/lib/audio.ts:29`). It base64-decodes bytes, treats them as little-endian signed Int16, normalizes by 32768, and creates a mono `AudioBuffer` at the declared rate (`src/hooks/useAudioPipeline.ts:139` through `src/hooks/useAudioPipeline.ts:152`). Gemini Live output is therefore normally 24 kHz PCM, but the renderer is MIME-driven rather than hard-coded.

### 4.2 Gapless queueing and jitter absorption

Each chunk becomes an `AudioBufferSourceNode`. All sources share one `AudioContext` and one analyser/destination chain (`src/hooks/useAudioPipeline.ts:143` through `src/hooks/useAudioPipeline.ts:159`, `src/hooks/useAudioPipeline.ts:162` through `src/hooks/useAudioPipeline.ts:164`). Scheduling uses:

```ts
const startAt = Math.max(context.currentTime + 0.03, playbackTimeRef.current || 0);
source.start(startAt);
playbackTimeRef.current = startAt + buffer.duration;
```

Source: `src/hooks/useAudioPipeline.ts:169` through `src/hooks/useAudioPipeline.ts:171`.

This is the core smoothness mechanism. `playbackTimeRef` is a monotonic end-of-queue timestamp, so arriving chunks are placed immediately after prior chunks for gapless playback. The `currentTime + 0.03` floor provides a 30 ms scheduling/prebuffer margin, absorbing small renderer/IPC timing jitter and avoiding scheduling in the past. There is no adaptive jitter buffer, packet reordering, or dynamic latency controller; it is a simple timestamp queue with a fixed 30 ms lead (`src/hooks/useAudioPipeline.ts:169`). Ended sources remove themselves from the tracking array (`src/hooks/useAudioPipeline.ts:165`, `src/hooks/useAudioPipeline.ts:166`).

### 4.3 Barge-in flush

`flushPlayback()` calls `stop()` on every scheduled/playing source, empties the source array, and resets the scheduling cursor to `AudioContext.currentTime` (`src/hooks/useAudioPipeline.ts:123` through `src/hooks/useAudioPipeline.ts:135`). A Gemini `serverContent.interrupted` message is translated by main into `live:interrupt`, so barge-in stops both currently audible and future queued chunks immediately (`electron/main.mjs:1754`, `src/hooks/useAudioPipeline.ts:31`). Stopping/sleeping also emits the same interrupt (`electron/main.mjs:1804`).

## 5. Wakeword and Python sidecar roles

### 5.1 `useWakeWord`: local sleep-state gate

Wakeword inference runs only when `hasBridge && wakeWordEnabled && !sidecarRunning`; detection calls the normal `start()` path (`src/App.tsx:330` through `src/App.tsx:333`). Thus it is **not** involved in Gemini turn detection and consumes no Live-session audio while Iris is awake.

It uses three cached ONNX Runtime Web models: mel spectrogram, embedding, and `hey_iris` classifier (`src/hooks/useWakeWord.ts:43` through `src/hooks/useWakeWord.ts:53`). Sessions are intentionally retained across disarm/re-arm for instant wakeword restart (`src/hooks/useWakeWord.ts:223`, `src/hooks/useWakeWord.ts:224`). Constants define 16 kHz processing, a 1.5-second window, 100 ms prediction interval, threshold, and cooldown (`src/hooks/useWakeWord.ts:1` through `src/hooks/useWakeWord.ts:20`). It requests its own mono microphone with echo cancellation, noise suppression, and AGC, creates a 16 kHz `AudioContext`, and uses `ScriptProcessor(2048)` to maintain a rolling ring buffer (`src/hooks/useWakeWord.ts:168` through `src/hooks/useWakeWord.ts:198`). The output is zeroed to prevent local echo (`src/hooks/useWakeWord.ts:184`).

### 5.2 `sidecar/voice_server.py`: standalone/legacy alternative

The Python module contains its own Gemini Live client, PyAudio capture/playback, queues, session resumption, and GoAway handling. Its audio constants are Int16 mono, 16 kHz send, 24 kHz receive, and 512-frame chunks (`sidecar/voice_server.py:20` through `sidecar/voice_server.py:26`). At 16 kHz, 512 frames are 32 ms per capture chunk. Its config requests context compression, session resumption, and input/output transcription (`sidecar/voice_server.py:172` through `sidecar/voice_server.py:189`).

Unlike the active renderer/WebRTC path, Python implements an explicit laptop-speaker echo guard: default `VOICE_DUPLEX_MODE=speaker` suppresses outbound mic audio while playback is queued or for `SPEAKER_ECHO_GUARD_SECONDS` (default 0.9 s) after model audio; `headphones` mode permits full barge-in (`sidecar/voice_server.py:209`, `sidecar/voice_server.py:210`, `sidecar/voice_server.py:330` through `sidecar/voice_server.py:335`, `sidecar/voice_server.py:339` through `sidecar/voice_server.py:342`). It flushes playback on interruption (`sidecar/voice_server.py:344` through `sidecar/voice_server.py:351`) and watches `session_resumption_update`/`go_away` (`sidecar/voice_server.py:419` through `sidecar/voice_server.py:425`).

For the current app architecture, treat this file as a reference implementation, not an extra process in the realtime path. The npm `sidecar` script can run it manually (`package.json:29`), but the Electron IPC handler named `sidecar:start` calls `startLive()` directly (`electron/main.mjs:2065`).

## 6. Latency and smoothness inventory

| Mechanism | Exact implementation | Effect / limitation |
|---|---|---|
| WebRTC acoustic processing | `echoCancellation`, `noiseSuppression`, `autoGainControl`, mono (`src/hooks/useAudioPipeline.ts:66` through `src/hooks/useAudioPipeline.ts:73`) | Reduces speaker leakage/noise before Gemini; behavior depends on OS/browser audio stack. |
| Small capture blocks | `createScriptProcessor(1024, 1, 1)` (`src/hooks/useAudioPipeline.ts:78`) | Roughly 21–23 ms callback cadence on common devices. Legacy main-thread API can jitter under renderer load. |
| Immediate streaming | Per-callback downsample/copy/IPC (`src/hooks/useAudioPipeline.ts:91` through `src/hooks/useAudioPipeline.ts:95`) | No batching delay; IPC overhead per block. |
| Compact wire format | Base64 `audio/pcm;rate=16000` (`electron/main.mjs:1816` through `electron/main.mjs:1821`) | Gemini-compatible raw mono PCM; base64 adds size/CPU overhead. |
| Server VAD defaults | No `automaticActivityDetection` config (`electron/main.mjs:1417` through `electron/main.mjs:1442`) | Simple and adaptive by provider defaults; no app-level tuning/control. |
| Incremental output | Every audio part forwarded immediately (`electron/main.mjs:1779`) | Speech begins before full response completion. |
| Fixed micro-prebuffer | 30 ms schedule floor (`src/hooks/useAudioPipeline.ts:169`) | Absorbs small arrival jitter with low added latency. |
| Continuous playback clock | `playbackTimeRef = startAt + duration` (`src/hooks/useAudioPipeline.ts:171`) | Gapless chunk concatenation. |
| Hard barge-in flush | Stop all sources and reset cursor (`src/hooks/useAudioPipeline.ts:123` through `src/hooks/useAudioPipeline.ts:135`) | Prevents stale queued speech after interruption. |
| Protocol session renewal | resumption handle + GoAway timer (`electron/main.mjs:95`, `electron/main.mjs:1424`, `electron/main.mjs:1721` through `electron/main.mjs:1734`) | Hides server time limit and preserves context. |
| Context compression | 104857→52428 sliding window (`electron/main.mjs:1432` through `electron/main.mjs:1435`) | Supports long sessions without context-window failure. |
| Tool timeout discipline | bounded local execution before `sendToolResponse` (`electron/main.mjs:1681` through `electron/main.mjs:1716`) | Avoids indefinitely silencing the model while it waits for a tool. |
| No explicit keepalive | No ping/dummy media loop in active lifecycle | Reconnection is GoAway-driven, not keepalive-driven. |
| No adaptive jitter buffer | One fixed 30 ms lead only (`src/hooks/useAudioPipeline.ts:169`) | Very simple; prolonged network stalls can still produce gaps. |
| No AudioWorklet | ScriptProcessor capture (`src/hooks/useAudioPipeline.ts:78`) | Easier implementation, but less robust than audio-thread processing under UI load. |

## 7. Porting blueprint

1. Keep the Gemini Live socket in a privileged/backend process, not the UI. Mirror the narrow IPC contract: raw PCM input, base64 PCM output, interrupt, transcript, status, and tool events (`electron/preload.cjs:34` through `electron/preload.cjs:56`).
2. Capture mono audio with platform AEC/NS/AGC, produce 16 kHz signed Int16 PCM, and stream every ~20–30 ms without application batching (`src/hooks/useAudioPipeline.ts:66` through `src/hooks/useAudioPipeline.ts:95`).
3. Prefer AudioWorklet in a new port for real-time-thread reliability, but preserve the current 1024-source-frame cadence and conversion semantics initially for behavioral parity (`src/hooks/useAudioPipeline.ts:78`, `src/lib/audio.ts:1` through `src/lib/audio.ts:23`).
4. Decode model PCM according to MIME rate, schedule chunks against one continuous playback cursor, and keep approximately 30 ms of safety lead (`src/lib/audio.ts:26` through `src/lib/audio.ts:29`, `src/hooks/useAudioPipeline.ts:169` through `src/hooks/useAudioPipeline.ts:171`).
5. Treat interruption as a first-class control packet that atomically stops all active/scheduled output (`electron/main.mjs:1754`, `src/hooks/useAudioPipeline.ts:123` through `src/hooks/useAudioPipeline.ts:135`).
6. Enable both transcription streams for UI/state bookkeeping but do not block audio on transcript completion (`electron/main.mjs:1436`, `electron/main.mjs:1437`, `electron/main.mjs:1759`, `electron/main.mjs:1771`, `electron/main.mjs:1779`).
7. Implement session resumption from day one. Request handles with an empty config, persist every replacement handle, and reconnect before GoAway cutoff without replaying a welcome turn (`electron/main.mjs:1421` through `electron/main.mjs:1424`, `electron/main.mjs:1721` through `electron/main.mjs:1734`, `electron/main.mjs:1647`).
8. Return every function call using its original `id` and `name`, and always send a structured success/error response so the model can resume speaking (`electron/main.mjs:1698` through `electron/main.mjs:1716`).
9. Keep wakeword inference outside the active Live session. Arm it only while asleep; on detection, start the full session/capture pipeline (`src/App.tsx:330` through `src/App.tsx:333`).
10. Preserve the distinction between the active Electron/WebRTC implementation and the Python reference. Do not accidentally run both microphone pipelines simultaneously (`electron/main.mjs:2065`, `package.json:29`).

## 8. Key architectural risks

- ScriptProcessor runs callbacks on the main renderer thread and is deprecated; heavy React/layout work can delay capture (`src/hooks/useAudioPipeline.ts:78`).
- The playback queue has only a fixed 30 ms lead and no underrun recovery metric (`src/hooks/useAudioPipeline.ts:169`).
- Active full-duplex behavior relies mainly on browser AEC; unlike the Python version, Electron has no explicit speaker-guard suppression (`src/hooks/useAudioPipeline.ts:68`; contrast `sidecar/voice_server.py:330` through `sidecar/voice_server.py:342`).
- Session handles exist only in memory, so a full application restart cannot resume a prior Live socket (`electron/main.mjs:95`). Long-term memory recall partly compensates at a semantic level but is not protocol session continuity (`electron/main.mjs:1550` through `electron/main.mjs:1558`).
- Tool calls share the Live turn: slow tools directly delay further model speech, making the execution timeout and prompt routing important (`electron/main.mjs:1681`, `electron/main.mjs:1696`, `electron/main.mjs:1716`).

## Conclusion

Iris achieves smooth realtime voice with a deliberately thin streaming pipeline rather than elaborate DSP: WebRTC-cleaned microphone frames are converted and forwarded immediately; Gemini provides automatic activity detection, incremental audio, interruption, transcription, tools, and resumable sessions; the renderer uses a 30 ms timestamped PCM queue for gapless playback and destroys that queue on barge-in. The most important portability invariants are the exact 16 kHz input/24 kHz MIME-driven output contract, continuous playback clock, immediate interrupt flush, bounded tool-response loop, and GoAway/session-resumption lifecycle.
