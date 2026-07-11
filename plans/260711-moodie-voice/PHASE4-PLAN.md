# PHASE 4 — Voice mượt thật sự: port kiến trúc Gemini Live của Iris vào Moodie

**Ngày:** 2026-07-11 · **Lead:** Claude · **Code:** Codex (playbook `codex-cli-windows-playbook`)
**Nguồn nghiên cứu:** trace trực tiếp `C:\Users\Admin\Desktop\Ai\iris-main` (file:line dưới đây) + báo cáo sâu [IRIS-RESEARCH.md](./IRIS-RESEARCH.md) (Codex).

---

## 1. Chẩn đoán: vì sao voice hiện tại của Moodie không mượt

Kiến trúc Phase 2 là **cascade rời rạc** — mỗi lượt nói phải đi qua 5 trạm chờ nhau:

```
[User nói] → VAD client đợi ĐỦ 2s im lặng → upload blob webm → Gemini STT (1–3s)
→ engine Moodie chạy trọn turn (3–20s, không stream ra voice) → speechSynthesis đọc
```

Điểm nghẽn cụ thể:
1. **Trễ cấu trúc ~6–25s/lượt**: 2s VAD + upload + STT + full turn + TTS khởi động. Không có gì phát ra trong lúc chờ.
2. **Giọng đọc robot**: `speechSynthesis` vi-VN của Windows/Chrome (Microsoft An) — chất lượng thấp, ngắt câu cứng, không tự nhiên.
3. **VAD client thô**: ngưỡng -55dB + "có tần số > 0" — nhạy nhiễu quạt/echo, đợi im 2 giây tuyệt đối mới gửi → cảm giác "nó không nghe mình".
4. **Barge-in giả**: ngắt lời chỉ cancel TTS + abort turn — không có đối thoại chồng lấn tự nhiên.
5. Không nói được câu ngắn liên tiếp ("ừ", "đúng rồi") — mỗi câu là 1 chu trình đầy đủ.

## 2. Iris làm gì khác (trace + verify từng dòng)

Iris **không có cascade**: browser stream PCM mic **liên tục** lên **Gemini Live API** (WebSocket 2 chiều), Google xử VAD + STT + suy nghĩ + TTS server-side, audio trả về stream ngay khi model bắt đầu nói. Cùng key Google.

| Mảnh | Cách Iris làm | Bằng chứng |
|---|---|---|
| Kết nối | `ai.live.connect` model `gemini-3.1-flash-live-preview`, `responseModalities: ["AUDIO"]` | `electron/main.mjs:1612, 328, 1419` |
| Voice | `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` ("Zephyr", đổi được) | `main.mjs:1425-1431` |
| Mic | getUserMedia (echo/noise/AGC, mono) → ScriptProcessor 1024 → **downsample 16kHz PCM16** → `sendRealtimeInput` liên tục | `src/hooks/useAudioPipeline.ts:63-107` |
| Phát | Nhận chunk base64 **24kHz PCM16** → AudioBuffer schedule nối đuôi (`playbackTimeRef`, đệm 30ms) → gapless | `useAudioPipeline.ts:137-173` |
| Ngắt lời | Server báo `content.interrupted` → flush toàn bộ playback queue — user cứ nói là Iris im NGAY | `main.mjs:1748`, `useAudioPipeline.ts:123-135` |
| VAD | KHÔNG có VAD client — Google tự phát hiện nói/ngừng (automatic activity detection mặc định) | không có code VAD nào phía client |
| Phiên dài | `sessionResumption` handle + server báo `goAway` trước cutoff → **reconnect ngầm trước 2s**, hội thoại liền mạch | `main.mjs:1721-1737, 1663-1677` |
| Context | `contextWindowCompression` sliding window (trigger 104857 tokens) | `main.mjs:1432-1435` |
| Transcript | `inputAudioTranscription` + `outputAudioTranscription` → lưu lịch sử chữ | `main.mjs:1436-1437` |
| **2 não** | Live = mặt tiền voice; việc nặng dispatch cho "worker brain" (Hermes) qua **function calling** (`propose → confirm → submit`), tool timeout 45s, kết quả nền inject lại bằng `sendRealtimeInput({text})` | `main.mjs:1438-1442, 1450, 1686-1718, 1224` |

**Insight quyết định:** pattern "2 não" của Iris map 1:1 vào Moodie — Live lo trải nghiệm nghe-nói, còn **engine Moodie hiện có (tools, memory, retrieval, RLS) giữ nguyên làm brain**, nối bằng function calling. Không đập engine.

## 3. Kiến trúc đề xuất cho Moodie

```
Browser (overlay voice mode)                    Google
┌──────────────────────────┐    WebSocket   ┌──────────────┐
│ mic 16kHz PCM ──────────►│───────────────►│ Gemini Live  │
│ ◄────────── 24kHz PCM    │◄───────────────│ (VAD,STT,TTS)│
│ AudioBuffer queue        │                └──────┬───────┘
│ interrupted→flush        │                       │ toolCall: ask_moodie(question)
└──────────┬───────────────┘                       ▼
           │ mint token              ┌──────────────────────────────┐
           ▼                         │ POST /api/moodie/voice/ask   │
POST /api/moodie/voice/token ──────► │ → sendMoodieMessage(payload) │
(ephemeral, TTL ngắn, auth user)     │   (engine đầy đủ, no-op emit)│
                                     │ → lưu turn vào conversation  │
                                     │ → trả text cho Live đọc      │
                                     └──────────────────────────────┘
```

Quyết định kiến trúc (đã trace tính khả thi từng điểm):

**3.1. Browser nối thẳng Gemini Live, auth bằng EPHEMERAL TOKEN.**
- Vercel serverless (region sin1) không giữ được WebSocket proxy → không thể bơm audio qua server như Iris (Electron main). Browser phải nối thẳng.
- KHÔNG được lộ `MOODIE_VOICE_GOOGLE_API_KEY` ra client → route mới `POST /api/moodie/voice/token`: auth user (pattern attachments route) → gọi Google `auth_tokens.create` (v1alpha, single-session, TTL ~30 phút, khóa vào config Live cụ thể) → trả token cho browser. SDK `@google/genai` nhận ephemeral token làm apiKey.
- **Dependency mới: `@google/genai`** (Iris dùng ^2.10.0) — đây là ngoại lệ có chủ đích cho rule "không dep mới", chỉ để client Live + mint token; gemini-adapter chat hiện tại giữ nguyên REST.

**3.2. Engine Moodie = brain, nối qua 1 function `ask_moodie`.**
- Live config declare tool: `ask_moodie(question: string, urgency?: "quick"|"deep")` + system instruction kiểu Iris: chuyện phiếm/chào hỏi → Live tự trả lời; **mọi câu hỏi về dữ liệu studio (đơn, hợp đồng, tài chính, lịch, khách...) → BẮT BUỘC ask_moodie, cấm bịa**  (port nguyên tắc truthfulness của Iris `main.mjs:1451`).
- `POST /api/moodie/voice/ask`: auth → gọi `sendMoodieMessage(payload, noopEmit)` (đã verify: emit optional, `app/actions/moodie-mutations.ts:256-258`) với conversation_id của phiên voice → trả `{ text: kết quả cuối }`. Timeout phía client-tool 45s như Iris; câu trả lời engine thường 3–20s = nằm trong ngưỡng.
- Trong lúc chờ tool: Live tự nói câu đệm ("Để tôi xem sổ sách đã nhé") — behavior mặc định của Live khi tool chậm, reinforcce bằng system instruction.
- Turn voice được **lưu vào đúng conversation Moodie** (dùng lại persistence sẵn có của sendMoodieMessage) → mở lại chat thấy đủ lịch sử nói.

**3.3. Audio pipeline: port nguyên xi của Iris** (đã chuẩn, chi tiết đầy đủ trong [IRIS-RESEARCH.md](./IRIS-RESEARCH.md) §3-4, §6):
- Capture: getUserMedia mono EC/NS/AGC → ScriptProcessor(1024) → downsample 16k PCM16 (bucket-average, clamp, LE) → gửi NGAY mỗi callback (~21–23ms/chunk, ~682–742 bytes, **không gộp batch**) → `session.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } })`. (AudioWorklet là nâng cấp sau — giữ parity hành vi trước, xem RESEARCH §7.3.)
- Playback: parse rate từ **MIME** (`parsePcmRate`, không hardcode 24k) → AudioBuffer schedule `max(currentTime + 0.03, playbackTimeRef)` → gapless; `interrupted` → stop mọi source + reset con trỏ về currentTime.
- **KHÔNG cấu hình `realtimeInputConfig.automaticActivityDetection`** — Iris dùng nguyên VAD mặc định của Google (RESEARCH §1.2). Đừng bịa ngưỡng.
- Port `downsampleTo16k`, `parsePcmRate`, `base64ToBytes` từ `iris/src/lib/audio.ts` (36 dòng).
- Tool response bắt buộc trả đúng `{id, name}` gốc của functionCall — model câm cho tới khi nhận đủ response (RESEARCH §2.2, §8).

**3.4. Phiên dài + bền:** giữ `sessionResumption` handle trong ref; nhận `goAway` → hẹn reconnect trước cutoff 2s, connect lại với handle (port `main.mjs:1663-1677, 1721-1737`) — user không biết có reconnect. `contextWindowCompression` sliding window như Iris.

**3.5. Transcript:** bật `inputAudioTranscription/outputAudioTranscription` → hiện phụ đề realtime trong overlay (UX + kiểm chứng) và append vào conversation qua route ask (hoặc mutation nhẹ mới `logVoiceExchange` — additive).

**3.6. Ngôn ngữ — ĐA NGÔN NGỮ TỰ ĐỘNG như Iris (user chốt 2026-07-11):**
- **KHÔNG khóa ngôn ngữ.** Iris không set `languageCode` ở đâu cả (verify: `buildLiveConfig` main.mjs:1417-1477 không có; system prompt không ép tiếng) — Gemini Live native audio tự nhận diện mọi ngôn ngữ và đáp bằng ngôn ngữ người nói. Port đúng hành vi đó.
- System instruction chỉ ghi: "Trả lời bằng đúng ngôn ngữ người dùng đang nói. Người dùng chủ yếu nói tiếng Việt; thuật ngữ nghiệp vụ studio (đơn, hợp đồng, cọc...) hiểu theo ngữ cảnh tiếng Việt." — hint, không phải khóa.
- Voice chọn từ prebuilt list (Zephyr/Puck/Kore/Aoede... — các voice này đa ngôn ngữ) — setting `moodie_voice_live_voice` (default Zephyr). Model: setting `moodie_voice_live_model` default `gemini-3.1-flash-live-preview` (fallback `gemini-2.5-flash-native-audio-preview-12-2025` nếu key không có quyền — **verify bằng key thật sau khi nạp credit**).
- **Sửa kèm (fix Phase 1, gộp vào run F1):** route Dictate `app/api/moodie/audio/transcription/route.ts` đang khóa tiếng Việt (prompt "sang văn bản tiếng Việt" + `language="vi"`). Đổi prompt thành: "Transcribe chính xác đoạn ghi âm sang văn bản, GIỮ NGUYÊN ngôn ngữ người nói (không dịch). Chỉ trả về transcript." — param `language` chỉ còn là hint optional, không ép.

**3.7. Fallback:** giữ nguyên cascade Phase 2 làm chế độ dự phòng. Overlay thử Live trước; mint token fail (hết credit/không quyền model/region) → toast rõ lý do + tự chuyển cascade. Flag setting `moodie_voice_engine: "live" | "cascade"` (default live).

**3.8. Giữ nguyên:** Dictate Phase 1 (recorder + STT route — hợp lý cho đọc-chính-tả vào ô nhập), UI overlay Phase 3 (mood tokens) — chỉ thay ruột engine.

## 4. Trace độ phù hợp thực tế (những gì ĐÃ verify trên repo Moodie)

| Điều kiện | Kết quả trace |
|---|---|
| Engine gọi được ngoài SSE | ✅ `sendMoodieMessage(rawInput, emit?)` — emit optional (`moodie-mutations.ts:256`) |
| Auth route pattern | ✅ copy `app/api/moodie/attachments/route.ts` |
| Key voice riêng đã có | ✅ `lib/moodie/voice-config.ts` (Phase 1) — thêm 2 setting mới cùng chỗ |
| Settings UI có sẵn card | ✅ `moodie-ai-card.tsx` (Phase 1 đã thêm section voice) |
| Overlay + trạng thái turn | ✅ Phase 2/3 — overlay đổi ruột, giữ vỏ |
| Vercel không WS server | ✅ đã chốt ephemeral token, không cần proxy |
| SDK | ⚠️ cần thêm dep `@google/genai` (duy nhất) |
| Key hết credit | ⛔ **user phải nạp trước bước verify** — mọi test Live đều cần |
| Live model quyền truy cập | ❓ verify bằng key thật (mục 3.6) |
| Echo loa→mic | Iris chứng minh EC của getUserMedia + VAD server đủ tốt (không suppress thủ công) |

## 5. Task breakdown cho Codex (mỗi run 1 session, theo playbook)

- **Run F1 — server**: `lib/moodie/voice-live-config.ts` (settings mới: live model, voice name, engine flag — additive vào voice-config), route `POST /api/moodie/voice/token` (mint ephemeral, auth, trả token + config), route `POST /api/moodie/voice/ask` (auth → sendMoodieMessage no-op emit → `{text, conversation_id}`; map lỗi 429/không quyền model thành message tiếng Việt). Settings UI: thêm 2 field (voice, engine) vào section voice sẵn có. + `npm i @google/genai`.
- **Run F2 — client audio core**: `lib/moodie/live-audio.ts` (port downsample/parse/b64 từ Iris + PCM player queue với flush) + `hooks/use-moodie-live-voice.ts`: mint token → `ai.live.connect` (config: AUDIO, voice, transcription, resumption, compression, tools=[ask_moodie], systemInstruction tiếng Việt port từ khung Iris) → capture/playback/interrupted/goAway-reconnect/toolCall→fetch ask→sendToolResponse. Unit test cho phần thuần (downsample, schedule math) nếu tách được.
- **Run F3 — overlay swap + wire**: `moodie-voice-overlay.tsx` đổi ruột sang hook mới (giữ UI mood: vòng tròn scale theo outputLevel, label Đang nghe/Đang nói, phụ đề transcript, mute = track.enabled false như Iris `useAudioPipeline.ts:175-182`, X = close session sạch), fallback cascade khi Live fail, page-client giữ nguyên props.
- **Run F4 — verify + hardening**: lint/build/mojibake, review lead, rồi **user test thật** (cần credit). Đo độ trễ cảm nhận: nói xong → nghe tiếng đầu tiên < 1.5s (chuẩn Iris).
- **Run G (dọn dẹp, tách riêng)**: sửa 6 file WIP bị hỏng-dấu-`?` (nặng nhất `moodie-mutations.ts` 61 chỗ — khôi phục theo ngữ cảnh câu) — không chung run với feature.

## 6. Rủi ro & câu hỏi mở

1. **Credit + quyền model Live của key** — chặn mọi verify; user nạp trước F4.
2. **Chi phí**: Live native-audio tính theo phút audio in/out — cao hơn STT rời; cần theo dõi quota sau khi chạy thật (dashboard Google AI Studio).
3. **Mobile Safari**: AudioContext cần user-gesture resume; ScriptProcessor deprecated nhưng còn chạy — test iOS ở F4, AudioWorklet là nâng cấp sau.
3b. **Echo loa ngoài**: bản Electron của Iris chỉ dựa vào browser AEC (đủ tốt thực tế); nếu test thật bị self-trigger → port pattern **speaker echo guard** từ bản Python tham chiếu của Iris (`sidecar/voice_server.py:330-342`): suppress mic khi đang phát + 0.9s sau đó, kèm chế độ "headphones" cho phép barge-in đầy đủ (RESEARCH §5.2, §8).
4. **ask_moodie > 45s** (action nặng nhiều tool): v1 trả "đang xử lý, hỏi lại sau" — pattern announce nền của Iris (`sendRealtimeInput({text})` khi xong) để v2.
5. **2 người dùng cùng studio nói cùng lúc**: mỗi phiên Live độc lập theo user — không xung đột (engine đã có RLS).

## 7. Success criteria Phase 4

- Nói xong câu → nghe Moodie **bắt đầu** trả lời < 1.5s (câu chit-chat) / có câu đệm ngay với câu hỏi dữ liệu.
- Ngắt lời giữa chừng → im NGAY (< 300ms cảm nhận).
- Hỏi số liệu thật ("tháng này chốt được bao nhiêu đơn?") → ask_moodie trả đúng số từ engine, đọc tự nhiên bằng tiếng Việt.
- Phiên > 15 phút không rớt (resumption vô hình).
- Đóng overlay: mic + WS + audio tắt sạch. Transcript nằm trong conversation.
- Build/lint/test/mojibake sạch như mọi phase.
