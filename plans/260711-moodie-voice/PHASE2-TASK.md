# TASK — Phase 2: Voice Mode (giao cho Codex, lead: Claude)

Bạn là coder cho mood-studio. Phase 1 (Dictate) đã xong và được review. Implement **Phase 2 — Voice mode** (nút đen sóng âm: hội thoại bằng giọng nói).

## Đọc trước khi code (theo thứ tự)
1. `plans/260711-moodie-voice/PLAN.md` — scope của bạn là Phase 2: mục C 2.1 → 2.3, ràng buộc mục D, success criteria mục E Phase 2, mục A phần "Voice mode" (hành vi chuẩn từ open-webui, đã trace file:line).
2. Code Phase 1 vừa merge vào working tree: `lib/moodie/voice-config.ts`, `app/api/moodie/audio/transcription/route.ts`, `components/moodie/moodie-voice-recorder.tsx` — TÁI DÙNG route transcription và các util sẵn có, không viết lại.
3. `plans/260603-native-feel-performance/LESSONS.md`.

## Việc phải làm (chi tiết + file:line trong PLAN.md mục C)
1. `lib/moodie/voice-sentences.ts` (mới, thuần logic): port `extractSentences` + merge logic `extractSentencesForAudio` từ open-webui `src/lib/utils/index.ts:1072-1135` — bảo vệ code block bằng placeholder, split `(?<=[.!?])\s+|\n+`, merge câu <4 từ hoặc <50 ký tự vào câu trước. Thêm strip markdown cơ bản cho TTS (bỏ `**`, `#`, link giữ text). Export `extractCompletedSentences(streamedText: string): string[]` — trả các câu trọn vẹn (bỏ câu cuối chưa kết thúc).
2. `tests/unit/moodie-voice-sentences.test.ts` (mới): tiếng Việt có dấu, code block không bị cắt, câu ngắn merge, text đang stream dở (câu cuối chưa xong bị loại), markdown strip.
3. `components/moodie/moodie-voice-overlay.tsx` (mới): port hành vi từ open-webui `src/lib/components/chat/MessageInput/CallOverlay.svelte` (đã trace trong PLAN.md mục A):
   - VAD loop: AnalyserNode `minDecibels -55`, phát hiện tiếng (`domainData.some(v => v > 0)`) → start MediaRecorder + đánh dấu hasStartedSpeaking + ngắt TTS đang phát; im lặng 2000ms sau khi đã nói → stop recorder → blob (<100 bytes thì bỏ) → POST `/api/moodie/audio/transcription` → text ≠ rỗng → gọi prop `onSendVoiceMessage(text)` → restart vòng ghi.
   - TTS: theo dõi prop `streamedText` + `status`; mỗi lần `extractCompletedSentences` trả câu mới (track index câu đã đọc, chống lặp) → enqueue `SpeechSynthesisUtterance`, voice ưu tiên `lang === "vi-VN"` từ `speechSynthesis.getVoices()` (chú ý getVoices có thể rỗng lần đầu — nghe event `voiceschanged`), phát tuần tự. Turn completed → đọc nốt phần còn lại.
   - Ngắt lời (mặc định BẬT): VAD thấy user nói khi TTS đang phát → `speechSynthesis.cancel()` + gọi prop `onStopGeneration()`. NẾU loa echo gây self-trigger (test thật) → suppress analyser khi đang phát (minDecibels=-1 như CallOverlay dòng 323-330) và bỏ ngắt lời, ghi rõ trong báo cáo.
   - UI: overlay full-screen (`fixed inset-0`, z-index cao hơn bottom-nav — xem z hiện dùng trong module), nền tối, vòng tròn giữa scale theo rmsLevel (ngưỡng port từ CallOverlay dòng 828-837), label trạng thái: "Đang nghe" / "Đang suy nghĩ" / "Đang nói". Nút Mute (toggle + phím M, tự unmute khi assistant nói xong) + nút X đóng. Đóng overlay = dừng TẤT CẢ: tracks, rAF, speechSynthesis, wake lock.
   - Cleanup triệt để khi unmount (như trên).
4. `components/moodie/moodie-composer.tsx` (sửa surgical): khi `value.trim() === "" && attachments.length === 0 && !loading` → thay nút Send bằng nút Voice mode: nền đen (`bg-text-primary` hoặc token đen module đang dùng), icon lucide `AudioLines`, aria-label "Trò chuyện bằng giọng nói"; click → getUserMedia xin permission rồi stop tracks (denied → toast) → gọi prop mới `onOpenVoiceMode?.()`.
5. `components/moodie/moodie-page-client.tsx` + `moodie-workspace-desktop.tsx` + `moodie-workspace-mobile.tsx` (additive): state `voiceMode`; prop `onOpenVoiceMode` drill xuống composer; render `MoodieVoiceOverlay` với `streamedText={moodieTurn.state.streamedText}`, `status` từ turn state, `onSendVoiceMessage={(text) => handleSendMessage(text)}`, `onStopGeneration={moodieTurn.stop}`, `onClose={() => setVoiceMode(false)}`.

## Ràng buộc cứng (y hệt Phase 1)
- Node: prepend `C:\Users\Admin\.nodejs` vào PATH; dùng **npm**.
- KHÔNG npm dependency mới. Match style module moodie. UI text tiếng Việt.
- File shared chỉ additive. KHÔNG đụng file ngoài danh sách trên.
- Encoding: đọc/ghi CHỈ qua apply_patch/file tools; xong việc quét mọi file đã sửa tìm signature mojibake (`á»`, `áº`, `Ä‘`, `Æ°`, `Ă´`, `â€`) — thấy là sửa bằng apply_patch.
- KHÔNG commit, KHÔNG push.

## Bối cảnh test
Key Google trong `.env.local` đang HẾT CREDIT → transcription trả 429 với message tiếng Việt (đã xử lý ở Phase 1). Không test STT thật. TTS browser (`speechSynthesis`) KHÔNG cần key — logic TTS/VAD/overlay test được bằng unit test + build.

## Definition of done — báo cáo từng mục
1. `npm run test -- moodie-voice-sentences` (hoặc lệnh test unit tương ứng dự án) pass.
2. `npm run lint` xanh (hoặc chỉ lỗi có sẵn — liệt kê).
3. `npm run build` xanh.
4. Quét mojibake mọi file đã sửa: 0 signature.
5. Liệt kê file tạo/sửa + tóm tắt diff.
6. Các quyết định nhỏ tự đưa ra để lead review.
