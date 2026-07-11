# TASK F1 — Phase 4 server-side: token + ask routes, live config, dep

Đọc trước: `plans/260711-moodie-voice/PHASE4-PLAN.md` (kiến trúc, mục 3.1, 3.2, 3.6, 3.7) + `plans/260711-moodie-voice/IRIS-RESEARCH.md` §1.2 (config Live chuẩn của Iris). Scope CHỈ server-side — KHÔNG đụng client/overlay/hook.

## Deliverables

**1. Dependency:** `npm install @google/genai` (PATH prepend `C:\Users\Admin\.nodejs`, npm). Đây là dep mới DUY NHẤT được phép.

**2. `lib/moodie/voice-live-config.ts` (mới)** — additive cạnh voice-config.ts hiện có:
- System_settings keys mới: `moodie_voice_live_model` (default `"gemini-3.1-flash-live-preview"`), `moodie_voice_live_voice` (default `"Zephyr"`), `moodie_voice_engine` (`"live" | "cascade"`, default `"live"`).
- `getMoodieVoiceLiveConfig()`: đọc 3 keys + apiKey từ `getMoodieVoiceConfig()` sẵn có (KHÔNG đọc key trực tiếp).
- Export `buildMoodieLiveConnectConfig(opts)` trả object config Live cho client (KHÔNG chứa key): port đúng khung Iris (IRIS-RESEARCH §1.2): `responseModalities: ["AUDIO"]`, `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`, `contextWindowCompression { triggerTokens: 104857, slidingWindow: { targetTokens: 52428 } }`, `inputAudioTranscription: {}`, `outputAudioTranscription: {}`, `sessionResumption: {}` (client tự thay handle khi reconnect), tools = function declaration `ask_moodie` (name, description tiếng Việt-as-escape nói rõ: "Hỏi Moodie — bộ não nghiệp vụ của studio. BẮT BUỘC dùng cho mọi câu hỏi về dữ liệu: đơn hàng, hợp đồng, tài chính, lịch, khách hàng, nhân sự, kho...", parameters `{ question: string (required) }`), systemInstruction: port khung Iris (routing rule: chit-chat trả lời trực tiếp; dữ liệu studio → ask_moodie, CẤM bịa số liệu — port nguyên tắc truthfulness IRIS-RESEARCH §1.2/main.mjs:1451; NGÔN NGỮ: "Trả lời bằng đúng ngôn ngữ người dùng đang nói. Người dùng chủ yếu nói tiếng Việt; thuật ngữ nghiệp vụ studio hiểu theo ngữ cảnh tiếng Việt." — KHÔNG khóa languageCode; giữ câu trả lời nói ngắn tự nhiên).
- KHÔNG set `realtimeInputConfig.automaticActivityDetection` (dùng default Google như Iris).

**3. `app/api/moodie/voice/token/route.ts` (mới):**
- POST, auth y hệt attachments route (401 message tiếng Việt sẵn có).
- Đọc config; engine === "cascade" hoặc thiếu key → 503 `{ error, engine: "cascade" }` để client fallback.
- Mint ephemeral token bằng `@google/genai`: `const ai = new GoogleGenAI({ apiKey }); const token = await ai.authTokens.create({ config: { uses: 1, expireTime: <now+30m ISO>, newSessionExpireTime: <now+2m ISO>, liveConnectConstraints: { model, config: buildMoodieLiveConnectConfig(...) } } })` — nếu SDK version khác shape, đọc `node_modules/@google/genai` .d.ts để dùng đúng API authTokens; nếu constraints không khả dụng thì mint token không constraints (vẫn OK).
- Trả `{ token: token.name, model, connectConfig }`. Map lỗi 429 → "Tài khoản Google AI đã hết hạn mức..." (message escape sẵn có Phase 1), lỗi khác → message tiếng Việt rõ.

**4. `app/api/moodie/voice/ask/route.ts` (mới):**
- POST JSON `{ question: string, conversation_id?: string | null }`, auth như trên, validate question không rỗng ≤ 4000 chars.
- Gọi `sendMoodieMessage({ conversation_id: conversation_id ?? null, content: question, attachments: [], contexts: [] }, undefined)` — import từ `@/app/actions/moodie-mutations`. KHÔNG sửa file mutations.
- Kết quả success → trả `{ text: <content assistant message cuối trong result.data.conversation>, conversation_id: <id conversation> }` (đọc shape MoodieSendResult trong types/moodie.ts để lấy đúng field). Fail → `{ error }` 500, message tiếng Việt.

**5. Sửa `app/api/moodie/audio/transcription/route.ts` (fix đa ngôn ngữ, PHASE4-PLAN mục 3.6):** đổi TRANSCRIBE_PROMPT thành escape của: "Transcribe chính xác đoạn ghi âm sang văn bản, giữ nguyên ngôn ngữ người nói, không dịch. Chỉ trả về nội dung transcript, không giải thích." Bỏ phần `(language: ${language})` ép ngôn ngữ — chỉ thêm hint nếu language được client gửi tường minh: `(Gợi ý: người nói có thể dùng ${language})`.

**6. Settings UI additive** (`components/settings/moodie-ai-card.tsx` + action trong `moodie-provider-actions.ts`): section voice sẵn có thêm: select Engine (live/cascade), input Voice name, input Live model — lưu qua action mới `saveMoodieVoiceLiveConfig` (pattern y hệt `saveMoodieVoiceConfig` sẵn có). Nếu tiện thì mở rộng action cũ thay vì tạo mới — chọn cách ít diff hơn, additive.

## Ràng buộc (như mọi run + nhấn mạnh)
- No apply_patch — MCP read_text_file/write_file. Tiếng Việt = \uXXXX escapes, comment ASCII.
- KHÔNG đụng file ngoài danh sách trên (trừ package.json/package-lock.json do npm install).
- Verify: `npx eslint <các file mới/sửa> --max-warnings=0`, `npm run build`, mojibake scan, báo cáo file list + shape thật của authTokens API đã dùng (quan trọng cho lead review).
- KHÔNG commit.
