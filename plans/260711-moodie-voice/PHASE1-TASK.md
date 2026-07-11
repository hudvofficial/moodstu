# TASK — Phase 1: Dictate (giao cho Codex, lead: Claude)

Bạn là coder cho mood-studio. Implement **Phase 1 — Dictate (nút mic, đọc-thành-chữ)** cho Moodie chat.

## Đọc trước khi code (theo thứ tự)
1. `plans/260711-moodie-voice/PLAN.md` — scope của bạn CHỈ là Phase 1: mục C 1.0 → 1.3, ràng buộc mục D, success criteria mục E Phase 1. KHÔNG làm Phase 2.
2. `plans/260603-native-feel-performance/LESSONS.md`
3. Các file tích hợp trace sẵn trong PLAN.md mục B.

## Việc phải làm (chi tiết + file:line trong PLAN.md)
1. `lib/moodie/voice-config.ts` (mới): đọc config voice — system_settings `moodie_voice_api_key` (giải mã `decryptSecret` từ `@/lib/settings-secrets`) + `moodie_voice_stt_model` (default `"gemini-2.5-flash"`), env fallback `MOODIE_VOICE_GOOGLE_API_KEY`. KHÔNG fallback sang key chat chính.
2. `app/actions/moodie-provider-actions.ts` (additive): action lưu voice config (encryptSecret, theo skeleton `saveMoodieProviderConfig` cùng file) + đọc snapshot (hasKey, model).
3. Settings UI: thêm field "Google API key cho giọng nói" vào màn settings đang gọi `getMoodieProviderSettingsAction` (grep tìm consumer; additive, không refactor form).
4. `app/api/moodie/audio/transcription/route.ts` (mới): POST multipart `{file, language="vi"}` → auth y hệt `app/api/moodie/attachments/route.ts` → validate size ≤15MB (413), mime `audio/*` (415) → Gemini `generateContent` REST với part `inlineData` base64 + prompt: "Transcribe chính xác đoạn ghi âm sau sang văn bản tiếng Việt. Chỉ trả về nội dung transcript, không giải thích." → trả `{ text }`. Thiếu key → 503 "Chưa cấu hình Google API key cho giọng nói". Gemini trả 429 → map thành "Tài khoản Google AI đã hết hạn mức, vui lòng nạp thêm."
5. `components/moodie/moodie-voice-recorder.tsx` (mới): port từ `C:\Users\Admin\Desktop\Ai\open-webui-main\src\lib\components\chat\MessageInput\VoiceRecording.svelte` sang React. MediaRecorder (mime priority theo PLAN.md), visualizer RMS (hằng số -45dB, normalize `(rms*10)^1.5` clamp [0.01,1]), đếm giây m:ss, Esc/X hủy, ✓ confirm → POST route → `onConfirm(text)`, spinner khi transcribe. Cleanup triệt để: stop tracks, clear interval, cancel rAF, release wake lock.
6. `components/moodie/moodie-composer.tsx` (sửa surgical): nút Mic (lucide `Mic`) cạnh Paperclip, aria-label "Đọc để nhập", disabled khi `disabled || loading`; click → getUserMedia xin permission rồi stop tracks ngay (denied → toast) → recording=true; khi recording render recorder thay khối input; `onConfirm(text)` → nối vào cuối `value` (space nếu đã có text) + focus + resize. KHÔNG auto-send.

## Ràng buộc cứng
- Node: prepend `C:\Users\Admin\.nodejs` vào PATH; dùng **npm** (không pnpm).
- KHÔNG npm dependency mới. Match style module moodie. UI text tiếng Việt.
- File shared chỉ additive. KHÔNG đụng file ngoài danh sách trên.
- Encoding: đọc/ghi file CHỈ qua apply_patch/file tools, KHÔNG qua Get-Content/Set-Content PowerShell. Xong việc quét mọi file đã sửa tìm signature mojibake (`á»`, `áº`, `Ä‘`, `Æ°`, `Ă´`, `â€`) — thấy là sửa lại bằng apply_patch.
- KHÔNG commit, KHÔNG push — để nguyên working tree cho lead review.
- KHÔNG sửa các file WIP moodie khác ngoài `moodie-composer.tsx`.

## Bối cảnh test
Key voice đã có trong `.env.local` (`MOODIE_VOICE_GOOGLE_API_KEY`) nhưng project Google đang HẾT CREDIT — generateContent trả 429 "prepayment credits are depleted". Đây KHÔNG phải bug: 429 = auth OK. Đừng cố test STT thật.

## Definition of done — báo cáo từng mục
1. `npm run lint` xanh (hoặc chỉ còn lỗi có sẵn từ trước — liệt kê).
2. `npm run build` xanh.
3. Quét mojibake mọi file đã sửa: 0 signature.
4. Liệt kê file tạo/sửa + tóm tắt diff.
5. Các quyết định nhỏ tự đưa ra (nếu có) để lead review.
