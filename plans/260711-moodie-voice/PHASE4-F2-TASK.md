# TASK F2 — Phase 4 client audio core: live-audio utils + hook

Đọc trước: `plans/260711-moodie-voice/PHASE4-PLAN.md` mục 3.3-3.5 + `plans/260711-moodie-voice/IRIS-RESEARCH.md` §3, §4, §1.4, §1.5 (blueprint chuẩn, có file:line của Iris). F1 đã xong: route `POST /api/moodie/voice/token` trả `{ token, model, connectConfig }`; route `POST /api/moodie/voice/ask` nhận `{ question, conversation_id }` trả `{ text, conversation_id }`. Dep `@google/genai` đã có trong package.json.

## Deliverables

**1. `lib/moodie/live-audio.ts` (mới, thuần — unit-testable):** port từ `C:\Users\Admin\Desktop\Ai\iris-main\src\lib\audio.ts` (36 dòng) + logic schedule:
- `downsampleTo16k(input: Float32Array, sourceRate: number): Int16Array` — bucket-average, clamp [-1,1], map âm qua 0x8000 dương qua 0x7fff (đúng nguyên bản Iris).
- `parsePcmRate(mimeType: string): number` — đọc `rate=N`, default 24000.
- `base64ToBytes(b64: string): Uint8Array` và `bytesToBase64(bytes: Uint8Array): string` (browser-safe, không Buffer).
- `nextPlaybackStart(currentTime: number, cursor: number): number` = `Math.max(currentTime + 0.03, cursor)` — tách thuần để test.

**2. `tests/unit/moodie-live-audio.test.ts` (mới):** downsample 48k→16k đúng số mẫu + giá trị biên, parsePcmRate các case (có rate, thiếu rate, mime lạ), base64 roundtrip, nextPlaybackStart (cursor sau/trước currentTime).

**3. `hooks/use-moodie-live-voice.ts` (mới)** — hook React sở hữu trọn vòng đời phiên Live, port hành vi Iris:
- API: `useMoodieLiveVoice({ conversationId, onConversationId, onTranscript, onError, onEngineFallback })` trả `{ status: "idle"|"connecting"|"listening"|"speaking"|"error", start, stop, muted, toggleMute, inputLevelRef, outputLevelRef, userTranscript, modelTranscript }`.
- `start()`: POST `/api/moodie/voice/token` → 503/`engine:"cascade"` → gọi `onEngineFallback()` và dừng. OK → `import { GoogleGenAI } from "@google/genai"` → `new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } })` → `ai.live.connect({ model, config: connectConfig-từ-server (+ sessionResumption handle từ ref nếu reconnect), callbacks })` — đọc .d.ts của SDK nếu shape khác.
- Capture (IRIS-RESEARCH §3): getUserMedia mono EC/NS/AGC → AudioContext + ScriptProcessor(1024,1,1), output zero-fill, mỗi callback downsample 16k → `session.sendRealtimeInput({ audio: { data: bytesToBase64(...), mimeType: "audio/pcm;rate=16000" } })` — gửi ngay, KHÔNG batch. Analyser tap cho inputLevelRef (rms như Iris).
- Playback (§4): message có audio inlineData → decode theo parsePcmRate → AudioBuffer mono → schedule bằng `nextPlaybackStart` + cursor ref, track sources; analyser cho outputLevelRef.
- `serverContent.interrupted` → flush: stop mọi source, clear mảng, cursor = currentTime.
- `sessionResumptionUpdate.newHandle` → lưu ref. `goAway` → hẹn timer reconnect trước cutoff 2s (parse timeLeft, default 5s, chống trùng timer) → đóng session cũ, connect lại silent với handle (§1.4).
- `toolCall` → với mỗi functionCall `ask_moodie`: POST `/api/moodie/voice/ask` `{ question: args.question, conversation_id }` timeout 45s (AbortController); nhận `{ text, conversation_id }` → cập nhật conversationId qua `onConversationId`; `session.sendToolResponse({ functionResponses: [{ id, name, response: { result: text } }] })` — đúng id+name gốc (bắt buộc, RESEARCH §2.2); lỗi/timeout → response `{ status: "error", error }` vẫn phải gửi.
- Transcription: input/outputTranscription.text cộng dồn buffer + gọi `onTranscript(role, text)`; `turnComplete` → flush buffer.
- `toggleMute`: `track.enabled = !muted` (như Iris useAudioPipeline:175-182), không đóng stream.
- `stop()`/unmount cleanup TRIỆT ĐỂ: close session, clear goAway timer, stop tracks, close 2 AudioContext, cancel rAF, flush playback, reset refs. Latest-ref pattern cho mọi callback prop (bài học Phase 2 — KHÔNG để stale closure/effect re-init).
- KHÔNG render UI trong hook.

## Ràng buộc
- No apply_patch — MCP read/write. \uXXXX escapes, ASCII comments. KHÔNG đụng file ngoài 3 file trên.
- Verify: chạy unit test mới (jest, xem lệnh trong tests hiện có), `npx eslint` 3 file `--max-warnings=0`, `npm run build`, mojibake scan. Báo cáo shape SDK thật đã dùng (live.connect callbacks, sendRealtimeInput, sendToolResponse).
- KHÔNG commit.
