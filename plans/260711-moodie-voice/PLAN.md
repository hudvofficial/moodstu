# PLAN — Moodie Voice: Dictate + Voice Mode

**Ngày:** 2026-07-11 · **Lead/Review:** Claude · **Code:** Codex
**Tham chiếu:** open-webui tại `C:\Users\Admin\Desktop\Ai\open-webui-main` (đã trace, mọi file:line dưới đây đã xác minh).

## Mục tiêu

Hai nút giống open-webui, đặt trong composer của Moodie:
1. **Dictate** (icon mic): ghi âm → STT → chèn text vào ô nhập.
2. **Voice mode** (nút đen icon sóng âm): hội thoại bằng giọng nói — VAD phát hiện nói/im lặng → STT → gửi Moodie → đọc câu trả lời bằng TTS, hỗ trợ ngắt lời.

Triển khai **2 phase riêng biệt** — Phase 1 xong, review, verify rồi mới Phase 2.

---

## A. Trace open-webui (nguồn chân lý hành vi)

### Dictate
- Nút mic: `src/lib/components/chat/MessageInput.svelte:2056-2104` — click → `getUserMedia({audio:true})` chỉ để xin permission (stop tracks ngay), rồi `recording = true`. Permission denied → toast lỗi.
- Khi `recording`: form nhập bị ẩn, thay bằng `VoiceRecording` (`MessageInput.svelte:1298-1324`).
- `MessageInput/VoiceRecording.svelte` (toàn bộ hành vi):
  - MediaRecorder, mime ưu tiên: `audio/webm; codecs=opus` → `audio/webm` → `audio/ogg; codecs=opus` → `audio/mp4` → `audio/wav` (dòng 241-251).
  - getUserMedia constraints: echoCancellation + noiseSuppression + autoGainControl (dòng 225-231).
  - Visualizer: AnalyserNode `minDecibels -45`, RMS từ time-domain data, normalize `(rms*10)^1.5` clamp [0.01, 1], buffer ~300 cột, vẽ mỗi rAF (dòng 95-172).
  - Đếm giây, wake lock, Esc = hủy, nút X = hủy, nút ✓ = confirm (dòng 386-417).
  - Confirm → blob → `transcribeAudio(token, file, language)` → `onConfirm({text})` (dòng 174-205).
- `onConfirm` phía MessageInput: chèn `text` vào vị trí cursor, focus lại input, nếu setting `speechAutoSend` thì submit luôn (dòng 1307-1320).
- API client: `src/lib/apis/audio/index.ts:67-98` — POST multipart `{file, language?}` → `/audio/transcriptions` → `{text}`.
- Backend `backend/open_webui/routers/audio.py`: engine `openai` (`_transcribe_openai:644`) forward multipart `{model, language, file}` tới `{base_url}/audio/transcriptions`.

### Voice mode
- Nút: `MessageInput.svelte:2107-2169` — **chỉ hiện khi prompt rỗng && không có file đính kèm** (thay chỗ nút send); chặn nếu STT engine = web; xin mic permission trước khi mở overlay.
- `MessageInput/CallOverlay.svelte` — vòng lặp lõi:
  1. `startRecording` (dòng 233-269): stream liên tục (echo/noise/AGC), MediaRecorder tạo sẵn nhưng **chưa start**; `analyseAudio` chạy VAD bằng rAF.
  2. VAD (dòng 299-379): AnalyserNode `minDecibels -55`; có tín hiệu tần số (`domainData.some(v => v > 0)`) = đang nói → start recorder nếu chưa, đánh dấu `hasStartedSpeaking`, **gọi `stopAllAudio()` = ngắt lời assistant**; cập nhật `lastSoundTime`.
  3. Im lặng > **2000ms** sau khi đã nói → `confirmed = true`, stop recorder → `stopRecordingCallback` (dòng 186-231): restart vòng ghi mới ngay, transcribe blob (bỏ qua blob < 100 bytes), text ≠ rỗng → `submitPrompt(text, {_raw:true})`.
  4. Nghe response: Chat.svelte dispatch 3 event trên `eventTarget`: `chat:start` (id), `chat` (id + **từng câu hoàn chỉnh**), `chat:finish`. Cắt câu: `Chat.svelte:1252-1282` `dispatchCallOverlayAudio` — gọi `getMessageContentParts(content, split_on='punctuation')`, **pop phần tử cuối** (câu chưa trọn) khi chưa final, chống lặp bằng `message.lastSentence`.
  5. CallOverlay nhận câu → queue per message id + `fetchAudio(content)` prefetch TTS vào cache Map; `monitorAndPlayAudio` (dòng 538-588) dequeue tuần tự: có cache → phát; chưa có → re-queue + đợi 200ms. TTS engine: server OpenAI-compat `/audio/speech`, hoặc **browser `speechSynthesis`** khi không cấu hình engine (dòng 398-428).
  6. Ngắt lời/mute: `stopAllAudio` (dòng 460-479) = dừng stream response + cancel utterance + pause audio element. Suppress mic khi assistant đang nói nếu không bật `voiceInterruption` (dòng 323-340). Phím M = mute, tự unmute khi assistant nói xong (dòng 644-668). Wake lock. Camera/emoji: **KHÔNG port** (ngoài scope).
- Cắt câu: `src/lib/utils/index.ts:1072-1135` — `extractSentences` split `(?<=[.!?])\s+|\n+`, code block được thay placeholder trước khi split; `extractSentencesForAudio` merge câu ngắn (<4 từ hoặc <50 ký tự) vào câu trước.

---

## B. Kiến trúc mood-studio (điểm tích hợp — đã trace trên branch `perf/fix-chunk-gate-lazy-recharts`)

- **Composer:** `components/moodie/moodie-composer.tsx` — hàng nút dưới: Plus (shortcuts) + Paperclip (dòng 186-193); bên phải: nút Stop khi `loading` / nút Send `ArrowUp` disabled khi rỗng (dòng 195-203). `onSend(submission: MoodieComposerSubmission)`.
- **Mẫu API route có auth:** `app/api/moodie/attachments/route.ts` — `createClient()` từ `@/lib/supabase/server`, `supabase.auth.getUser()`, FormData, validate mime/size, lỗi tiếng Việt. **Copy đúng pattern này.**
- **SSE turn:** `app/api/moodie/messages/stream/route.ts` → client `lib/moodie/stream-client.ts` → `hooks/use-moodie-turn.ts` → reducer `lib/moodie/turn-store.ts` (dòng 103: `text.delta` cộng dồn vào `streamedText`). Event types: `types/moodie.ts:337-353` — **`text.delta` đã stream về client**, đủ cho TTS theo câu, KHÔNG cần event type mới.
- **Gửi tin:** `components/moodie/moodie-page-client.tsx:190` `handleSendMessage(input: MoodieComposerSubmission | string, ...)` — nhận string trực tiếp; `onEvent: moodieTurn.receive` (dòng 210). Stop: `moodieTurn.stop`.
- **Provider:** `lib/moodie/providers/registry.ts` — config từ DB `system_settings` (`moodie_provider_id`: `gemini` | `openai_compatible`, `moodie_provider_base_url`, `moodie_provider_api_key` mã hóa qua `decryptSecret`, `moodie_provider_model`). `getActiveMoodieProvider()`; fallback Gemini env key. Adapter: `lib/moodie/providers/gemini-adapter.ts`, `openai-adapter.ts`.
- **Workspace:** `moodie-workspace-desktop.tsx:60` + `moodie-workspace-mobile.tsx` render `MoodieComposer` với `onSend={onSendMessage} onStop={onStopGeneration}` — props đi từ page-client (dòng 419-430, 464-475).

---

## C. Thiết kế triển khai

### Phase 1 — Dictate

**QUYẾT ĐỊNH KIẾN TRÚC (user chốt 2026-07-11): toàn bộ tính năng giọng nói dùng GOOGLE API KEY RIÊNG**, tách khỏi key provider chat chính. Voice luôn đi qua Google (Gemini) bất kể chat provider đang là gemini hay openai_compatible.

**1.0. Config voice riêng (additive vào `lib/moodie/providers/registry.ts` hoặc file mới `lib/moodie/voice-config.ts` — ưu tiên file mới cho sạch)**
- System_settings keys mới:
  - `moodie_voice_api_key` — Google API key riêng cho voice, mã hóa bằng `encryptSecret`/`decryptSecret` (pattern y hệt `moodie_provider_api_key` trong `app/actions/moodie-provider-actions.ts:146-147`).
  - `moodie_voice_stt_model` — default `"gemini-2.5-flash"`.
- Env fallback khi chưa có setting: `MOODIE_VOICE_GOOGLE_API_KEY` (KHÔNG fallback sang key chat chính — thiếu key = tính năng tắt, nút mic vẫn hiện nhưng bấm vào báo lỗi rõ: "Chưa cấu hình Google API key cho giọng nói").
- Server action mới trong `app/actions/moodie-provider-actions.ts` (additive): `saveMoodieVoiceConfig` + đọc snapshot (hasKey, model) — theo đúng skeleton `saveMoodieProviderConfig:72`.
- Settings UI: thêm field "Google API key cho giọng nói" vào đúng màn settings đang gọi `getMoodieProviderSettingsAction` (tìm consumer của action này; thêm field additive, không refactor form).

**1.1. API route mới `app/api/moodie/audio/transcription/route.ts`**
- POST multipart: `file` (audio blob), `language` (optional, default `"vi"`).
- Auth y hệt attachments route (401 "Phiên đăng nhập đã hết hạn").
- Validate: size > 0 và ≤ 15MB (413), mime bắt đầu `audio/` (415).
- Đọc voice config từ 1.0. Gọi Gemini `models.generateContent` (theo convention gọi REST/SDK sẵn có trong `gemini-adapter.ts`) với part `inlineData` base64 audio + text prompt: `"Transcribe chính xác đoạn ghi âm sau sang văn bản tiếng Việt. Chỉ trả về nội dung transcript, không giải thích."` Model từ `moodie_voice_stt_model`.
- Không có voice key → 503 với message tiếng Việt rõ ràng.
- Response: `{ text: string }`. KHÔNG lưu file vào storage.

**1.2. Component mới `components/moodie/moodie-voice-recorder.tsx`** (port VoiceRecording.svelte sang React)
- Props: `{ onCancel: () => void; onConfirm: (text: string) => void; language?: string }`.
- Port đúng: mime priority list, constraints echo/noise/AGC, RMS visualizer (giữ nguyên hằng số -45dB, công thức normalize, thanh 2px), đếm giây m:ss, Esc hủy, X hủy, ✓ confirm → POST route 1.1 → `onConfirm(text)`. Spinner khi đang transcribe. Wake lock (try/catch, không bắt buộc). Lỗi → toast + onCancel.
- Cleanup triệt để trong effect cleanup: stop tracks, clear interval, cancel rAF (check unmounted trong processFrame), release wake lock.

**1.3. Sửa `moodie-composer.tsx`** (surgical)
- State `recording: boolean`.
- Nút Mic (lucide `Mic`) cạnh Paperclip, `aria-label="Đọc để nhập"`, disabled khi `disabled || loading`; click → xin permission như open-webui (getUserMedia rồi stop tracks ngay, denied → toast) → `setRecording(true)`.
- Khi `recording`: ẩn khối Textarea + hàng nút (giữ mount bằng class `hidden` như open-webui HOẶC conditional render — chọn conditional render cho sạch, draft đã có localStorage), render `MoodieVoiceRecorder`.
- `onConfirm(text)`: `setValue(v => v ? v + " " + text : text)` (nối cuối — moodie không track cursor), `setRecording(false)`, focus + resize textarea. KHÔNG auto-send.

### Phase 2 — Voice mode

**2.1. Util cắt câu `lib/moodie/voice-sentences.ts`** (thuần, unit-testable)
- Port `extractSentences` + merge logic `extractSentencesForAudio` (open-webui utils/index.ts:1072-1135): bảo vệ code block bằng placeholder, split `(?<=[.!?])\s+|\n+`, merge câu <4 từ hoặc <50 ký tự. Thêm strip markdown cơ bản cho TTS (bỏ `**`, `#`, link giữ text).
- Hàm chính: `extractCompletedSentences(streamedText: string): string[]` — trả các câu trọn (bỏ câu cuối chưa xong, caller tự xử lý final).
- **Unit test** `tests/unit/moodie-voice-sentences.test.ts`: tiếng Việt có dấu, code block, câu ngắn merge, text chưa kết thúc.

**2.2. Component `components/moodie/moodie-voice-overlay.tsx`**
- Props: `{ open; onClose; onSendVoiceMessage: (text: string) => Promise<void>; onStopGeneration; turnState }` (turnState = state từ useMoodieTurn để đọc `streamedText` + status).
- VAD loop port từ CallOverlay (giữ hằng số: minDecibels **-55**, silence **2000ms**, blob < 100 bytes bỏ qua): stream mic liên tục → nói → ghi → im lặng 2s → POST transcription route → text ≠ rỗng → `onSendVoiceMessage(text)`.
- TTS v1 = **browser `speechSynthesis`**: theo dõi `streamedText` (useEffect), mỗi lần có câu hoàn chỉnh mới (so sánh index câu đã đọc — chống lặp như `lastSentence` của open-webui) → enqueue `SpeechSynthesisUtterance`, voice chọn `speechSynthesis.getVoices()` ưu tiên `lang === "vi-VN"`, queue tuần tự. Khi turn completed → đọc nốt phần còn lại.
- Ngắt lời: VAD phát hiện user nói khi đang phát → `speechSynthesis.cancel()` + `onStopGeneration()` (mặc định BẬT — đơn giản hơn open-webui, không cần setting).
- Suppress VAD trong lúc TTS đang phát NẾU không ngắt lời được ổn định (echo loa → mic): test thật; nếu loa echo gây self-trigger → áp dụng cơ chế suppress của open-webui (analyser.minDecibels = -1 khi assistantSpeaking).
- UI: overlay full-screen (fixed inset-0, z cao hơn bottom-nav), nền tối, vòng tròn scale theo rmsLevel (port ngưỡng size từ CallOverlay dòng 828-837), trạng thái: "Đang nghe" / "Đang suy nghĩ" (spinner 3 chấm) / "Đang nói". Nút: Mute (toggle, phím M) + X đóng. Đóng = dừng mọi audio + stop tracks + speechSynthesis.cancel().
- Wake lock. KHÔNG camera, KHÔNG emoji.

**2.3. Wire vào composer + page-client** (additive)
- Composer: khi `value.trim() === "" && attachments.length === 0 && !loading` → thay nút Send bằng nút Voice mode (nền đen `bg-text-primary text-white`, icon `AudioLines`), aria `"Trò chuyện bằng giọng nói"`; click → xin mic permission → gọi prop mới `onOpenVoiceMode?()`.
- `moodie-page-client.tsx`: state `voiceMode: boolean`; render `MoodieVoiceOverlay` với `onSendVoiceMessage={(text) => handleSendMessage(text)}`, `turnState={moodieTurn.state}`, `onStopGeneration={moodieTurn.stop}`. Prop `onOpenVoiceMode` drill qua workspace-desktop/mobile → composer (thêm prop optional, additive).

---

## D. Ràng buộc (bắt buộc đọc trước khi code)

1. **Đọc `plans/260603-native-feel-performance/LESSONS.md` trước.**
2. Chỉ đụng module moodie + route mới + `lib/moodie/voice-sentences.ts` + test. File shared (`types/moodie.ts`, workspace types, registry.ts) chỉ **additive**.
3. **Encoding:** file chứa tiếng Việt — tuân `~/.codex/AGENTS.md`: chỉ đọc/ghi qua apply_patch, xong task phải quét signature mojibake (`á»`, `áº`, `Ä‘`, `Æ°`, `Ă´`, `â€`) trong mọi file đã sửa.
4. **KHÔNG thêm npm dependency mới.** Icon dùng lucide-react có sẵn (`Mic`, `AudioLines`).
5. Match style hiện có của module moodie (component function, props interface trên đầu, text UI tiếng Việt, toast từ sonner, Button từ `@/components/ui/button`).
6. Node: prepend `C:\Users\Admin\.nodejs\...` vào PATH; dùng **npm** (không pnpm).
7. Responsive: overlay full-screen mọi breakpoint; composer thêm nút không được vỡ layout @375/@768/@1023.

## E. Success criteria & verify

**Phase 1:**
- `npm run lint` + `npm run build` xanh.
- Test thật localhost Chrome: bấm mic → nói tiếng Việt → text đúng chèn vào composer; Esc hủy sạch (mic indicator browser tắt); từ chối permission → toast, không crash.
- Không mojibake trong file sửa (quét byte-level).

**Phase 2:**
- Unit test voice-sentences pass.
- Test thật: mở voice mode → nói → Moodie trả lời → nghe giọng vi-VN đọc theo câu ngay khi stream (không đợi hết turn); nói chen ngang → TTS dừng + turn stop; đóng overlay → mic + audio tắt hẳn; mute hoạt động.
- Lint/build xanh, không mojibake.

## F. Open questions (Codex phải verify bằng test thật, ghi kết quả vào báo cáo)

1. Gemini generateContent có nhận `audio/webm` inline không? Nếu bị từ chối → thêm util encode WAV client-side (AudioContext.decodeAudioData → PCM 16-bit WAV, ~30 dòng, không dep) và gửi wav.
2. `speechSynthesis` voice vi-VN có sẵn trên máy user (Windows/Chrome thường có Microsoft An/HoaiMy) → nếu không có voice vi → dùng voice mặc định + note.
3. (Phase 2, tùy chọn nâng cấp sau) Google có TTS chất lượng cao qua key này: Gemini TTS model (`gemini-2.5-flash-preview-tts`) hoặc Cloud Text-to-Speech — v1 vẫn dùng speechSynthesis browser, chỉ ghi nhận khả năng nâng cấp, KHÔNG làm trong scope này.
