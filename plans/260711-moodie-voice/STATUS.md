# STATUS — Moodie Voice (Dictate + Voice Mode)

> **File này là điểm vào cho mọi agent.** Đọc trước khi đụng vào bất kỳ file nào của feature này.
> Lead/Review: **Claude** (session claude-fable-5) · Coder: **Codex CLI** (`codex exec -m claude`, xem playbook bên dưới).
> Cập nhật lần cuối: **2026-07-11 ~13:30** — **CODE XONG CẢ 2 PHASE, đã qua review + verify. Chờ user test thật.**

## Đang làm gì

Triển khai 2 tính năng giọng nói cho Moodie chat, mô phỏng open-webui (`C:\Users\Admin\Desktop\Ai\open-webui-main`):
1. **Dictate** — nút mic trong composer: ghi âm → STT (Gemini, key riêng) → chèn text vào ô nhập.
2. **Voice mode** — nút đen sóng âm: hội thoại giọng nói (VAD → STT → gửi Moodie → TTS đọc theo câu, hỗ trợ ngắt lời).

Spec đầy đủ: [PLAN.md](./PLAN.md) · Task Codex: [PHASE1-TASK.md](./PHASE1-TASK.md), [PHASE2-TASK.md](./PHASE2-TASK.md).

## Tiến độ

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Trace open-webui + mood-studio, viết plan | ✅ DONE | |
| **Phase 1 — Dictate** | ✅ DONE + reviewed | Build xanh, eslint sạch, 0 mojibake |
| · `lib/moodie/voice-config.ts` | ✅ | Key riêng `moodie_voice_api_key` (encrypted) + env `MOODIE_VOICE_GOOGLE_API_KEY`, model `moodie_voice_stt_model` (default gemini-2.5-flash) |
| · `app/api/moodie/audio/transcription/route.ts` | ✅ | POST multipart {file, language} → {text}; 503 thiếu key, 429 hết credit |
| · Voice actions + settings UI | ✅ | `moodie-provider-actions.ts` (additive), field trong `moodie-ai-card.tsx`, wiring qua `types/settings.ts`, `settings-queries.ts`, studio page/form/cards |
| · `components/moodie/moodie-voice-recorder.tsx` | ✅ | Port VoiceRecording.svelte; 1 bug dead-end sau lỗi/transcript rỗng đã bắt khi review + fix (mọi nhánh lỗi đều `onCancel()`) |
| · Nút Mic trong `moodie-composer.tsx` | ✅ | Surgical, không auto-send |
| **Phase 2 — Voice mode** | ✅ DONE + reviewed | |
| · `lib/moodie/voice-sentences.ts` + unit test | ✅ | 5/5 test pass (jest), verify độc lập |
| · `components/moodie/moodie-voice-overlay.tsx` | ✅ | VAD -55dB/2s, TTS speechSynthesis vi-VN, barge-in, mute+M. Review bắt 2 bug nghiêm trọng đã fix: (1) effect deps [open, onClose] + inline onClose → mic re-init mỗi text.delta; (2) stale closure recorder→onSendVoiceMessage → mỗi câu nói mở conversation mới. Fix = latest-ref pattern, deps [open] |
| · Nút voice mode (AudioLines đen) + wiring page-client/workspace | ✅ | Additive, chỉ hiện khi composer rỗng |
| Verify độc lập cuối | ✅ | `npm run build` xanh, jest 5/5, eslint sạch các file mới, 0 mojibake toàn bộ, dev server :3000 boot OK (/moodie 307→login đúng flow) |
| Báo cáo final Phase 1+2 | ✅ ĐÃ GỬI 2026-07-11 | |
| **Phase 4 — Voice mượt (Gemini Live, port từ Iris)** | ✅ DONE + reviewed | Kiến trúc: browser nối thẳng Gemini Live qua ephemeral token (route `/api/moodie/voice/token`), engine Moodie làm "brain" qua function `ask_moodie` (route `/api/moodie/voice/ask` gọi thẳng `sendMoodieMessage`), audio pipeline port nguyên xi Iris (16k PCM capture, 24k playback gapless, barge-in flush, goAway reconnect + refresh token 1-use, sessionResumption, contextWindowCompression). Đa ngôn ngữ tự động (không khóa `languageCode`, cả Live lẫn Dictate). Fallback tự động về cascade Phase 2 khi Live lỗi/hết quyền. Settings UI: chọn Engine/Voice/Model. Review bắt 5 bug: TS type lỗi build, token 1-use bị tái sử dụng ở goAway reconnect (nghiêm trọng — sẽ rớt session sau ~vài phút), thiếu resume AudioContext suspended, status không rời "speaking" khi bị ngắt lời, tool lạ làm treo model. Tất cả đã fix + verify lại độc lập. Run G dọn xong 28 chuỗi tiếng Việt hỏng kiểu `?` trong `moodie-mutations.ts` (audit từng chuỗi, review OK). Build/lint/test/mojibake sạch toàn bộ ~15 file. **Verify hạ tầng thật:** đọc key qua đúng đường Settings→decrypt→mint ephemeral token Live **THÀNH CÔNG**. CHẶN DUY NHẤT: key vẫn 429 hết credit → chưa nghe được giọng nói thật. |
| **Phase 3 — UI parity composer open-webui** | ✅ DONE + reviewed | 2 run: E (layout theo spec pixel-level [PHASE3-TASK.md](./PHASE3-TASK.md)) + E2 (đồng bộ màu mood theo yêu cầu user — bảng mapping token trong task file). Kết quả: container/toolbar/nút đúng bố cục open-webui, màu 100% token mood (nút tròn `bg-primary`, hover `bg-bg-subtle`, recorder tint primary), placeholder "Tôi có thể giúp gì cho bạn hôm nay?", nút `+` = đính tệp, `Sparkles` = kỹ năng, bỏ hint. Verify: 0 class gray/indigo/black sót, 0 non-ASCII, eslint sạch, build xanh 35.4s. Chỉ đụng composer + recorder. |

## Việc CHƯA làm / cần user

- **Google API key voice đang HẾT CREDIT** — key nằm trong `.env.local` (`MOODIE_VOICE_GOOGLE_API_KEY`), gọi generateContent trả 429. User cần nạp tại ai.studio/projects trước khi test STT thật.
- Test mic bằng giọng thật trên Chrome localhost (agent không làm được).
- ✅ Mojibake lịch sử ngoài Moodie Voice đã được xử lý ngày 2026-07-11: runtime auth/user-management, 2 migration 20260505*, migration repair cho DB đã apply và các tài liệu bị ảnh hưởng. Có verifier UTF-8 để ngăn tái phát.

## Bối cảnh quan trọng cho agent khác

- **Branch:** đang làm trực tiếp trên working tree `perf/fix-chunk-gate-lazy-recharts` (thư mục chính) — có sẵn WIP moodie lớn CHƯA COMMIT của phiên trước, đừng commit/revert bừa. KHÔNG commit gì khi user chưa duyệt báo cáo final.
- **Chạy Codex trên máy này BẮT BUỘC theo playbook:** `codex exec -m claude --dangerously-bypass-approvals-and-sandbox "<prompt>" < /dev/null`, cấm apply_patch (hỏng — chính là nguồn mojibake gốc), ghi file qua MCP filesystem write_file, tiếng Việt = `\uXXXX` escapes, session ngắn. Chi tiết: `~/.codex/AGENTS.md` + memory `codex-cli-windows-playbook`.
- Máy codepage 1258: file hiển thị bể qua console ≠ file bể — verify bằng byte (`data.count(b'\xc3\xa1\xc2\xbb')`).
- Lint repo có sẵn 39 lỗi ở module không liên quan (contracts/gallery/inventory/printing/settings) — không phải do feature này.
