# TASK F3 — Phase 4: swap ruột overlay sang Live + settings UI + fallback

Đọc trước: `plans/260711-moodie-voice/PHASE4-PLAN.md` mục 3.5-3.7 + kết quả F2: hook `hooks/use-moodie-live-voice.ts` (API ghi trong PHASE4-F2-TASK.md mục 3) + `lib/moodie/live-audio.ts` đã tồn tại, unit test pass.

## Deliverables

**1. `components/moodie/moodie-voice-overlay.tsx` — thay ruột, giữ vỏ:**
- GIỮ nguyên: UI mood (fixed inset-0 nền tối, vòng tròn scale, label trạng thái, nút Mute + phím M, nút X, aria), props hiện tại từ page-client (`open, onClose, streamedText, status, onSendVoiceMessage, onStopGeneration` — page-client KHÔNG đổi).
- THAY: toàn bộ logic VAD/MediaRecorder/speechSynthesis cũ bằng `useMoodieLiveVoice`:
  - `open=true` → `start()`. Trạng thái hook → label: connecting "Đang kết nối" / listening "Đang nghe" / speaking "Moodie đang nói" / error → toast + đóng.
  - Vòng tròn scale theo `outputLevelRef` khi speaking, `inputLevelRef` khi listening (đọc ref trong rAF loop riêng của component, KHÔNG setState mỗi frame — chỉ update transform qua ref DOM hoặc setState throttle ~10fps).
  - Phụ đề: hiển thị `userTranscript` (mờ) + `modelTranscript` (rõ) 2 dòng cuối overlay.
  - `onConversationId`: bubble lên page-client? KHÔNG đổi props page-client — giữ conversationId trong state overlay nội bộ; khi đóng overlay gọi `onClose()` như cũ (conversation đã được lưu server-side qua ask route; danh sách hội thoại tự refresh lần sau — chấp nhận v1).
  - **Fallback cascade:** hook gọi `onEngineFallback` (do token route trả 503/engine cascade) → overlay chuyển sang chế độ cascade CŨ. Để làm được: TÁCH logic cascade hiện tại (VAD/recorder/speechSynthesis + TTS theo câu từ streamedText) ra component con `MoodieVoiceCascade` TRONG CÙNG FILE (copy phần logic cũ, không viết lại), overlay render Live-mode mặc định, fallback → render cascade con với props cũ. Toast thông báo "Đang dùng chế độ dự phòng".
  - Cleanup khi đóng/unmount: `stop()` của hook (hook tự lo chi tiết).
- Bài học Phase 2 BẮT BUỘC áp dụng: latest-ref cho mọi callback, effect deps tối thiểu `[open]`.

**2. Settings UI (dồn từ F1):** thêm vào section voice của `components/settings/moodie-ai-card.tsx`: select Engine (`live` | `cascade`, label "Chế độ giọng nói: Realtime (Live) / Dự phòng (từng câu)"), input "Voice" (default Zephyr), input "Live model" (default gemini-3.1-flash-live-preview). Lưu qua action mới `saveMoodieVoiceLiveConfig` trong `app/actions/moodie-provider-actions.ts` (additive, pattern saveMoodieVoiceConfig, keys: `moodie_voice_engine`, `moodie_voice_live_voice`, `moodie_voice_live_model`) + snapshot đọc trả các giá trị này (mở rộng snapshot voice hiện có — additive).

## Ràng buộc
- No apply_patch — MCP read/write. \uXXXX escapes, ASCII comments.
- CHỈ đụng: overlay, moodie-ai-card.tsx, moodie-provider-actions.ts. KHÔNG đụng page-client/workspace/composer/hook F2.
- Verify: `npx eslint` các file sửa `--max-warnings=0`, `npm run build`, mojibake scan, chạy lại unit test moodie-live-audio + moodie-voice-sentences (đảm bảo không vỡ). Báo cáo file list + quyết định nhỏ.
- KHÔNG commit.
