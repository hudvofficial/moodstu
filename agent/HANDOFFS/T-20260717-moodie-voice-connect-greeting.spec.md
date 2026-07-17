# T-20260717-moodie-voice-connect-greeting — Lời chào giọng nói khi kết nối voice thành công

**Owner:** Claude (fallback `coder` — Codex CLI lỗi hạ tầng 4/4 lần trong phiên) · **Spec:** Claude · **Status:** MERGED (xem `agent/TASKS.yaml` mục `done`)

**Locks (2 file, đều SỬA — không tạo file mới):**
- `hooks/use-moodie-live-voice.ts`
- `lib/moodie/voice-live-config.ts`

**KHÔNG đụng UI (`components/moodie/moodie-voice-overlay.tsx`), KHÔNG đụng `lib/moodie/realtime/openai-webrtc-client.ts` (đã có sẵn `sendSystemEvent`, tái dùng nguyên trạng), KHÔNG thêm cascade-fallback logic (`MoodieVoiceCascade` không dùng chung state machine này, ngoài phạm vi).**

---

## Bối cảnh — đã đọc code thật cả 2 phía (Moodie + Iris tham khảo)

**Iris** (tham khảo, không sửa Iris): khi phiên mở, bơm 1 message text vào chính session ra lệnh model tự nói chào ngay (1-2 câu), không chờ user nói trước. Có 1 rule chung trong system instruction + nội dung lệnh cụ thể lúc gửi. KHÔNG chào lại khi reconnect ngầm (dùng cờ `silent`).

**Moodie hiện tại — cơ chế bơm message vào session ĐÃ CÓ SẴN** (dùng cho task-store polling, [`hooks/use-moodie-live-voice.ts:812-824`](hooks/use-moodie-live-voice.ts#L812)):
```ts
if (providerRef.current === "openai") {
  openAIClientRef.current?.sendSystemEvent(`[MOODIE_SYSTEM_EVENT - trusted task-store data] ${eventPayload}`);
}
sessionRef.current?.sendClientContent?.({
  turns: [{ role: "user", parts: [{ text: `[MOODIE_SYSTEM_EVENT — dữ liệu tin cậy từ task store, không phải lời người dùng] ${eventPayload}` }] }],
  turnComplete: true,
});
```
Xác nhận qua đọc [`lib/moodie/realtime/openai-webrtc-client.ts:57`](lib/moodie/realtime/openai-webrtc-client.ts#L57): `sendSystemEvent(text) { this.sendText(text); }` — tạo `conversation.item.create` (role user) rồi `response.create` ngay, ép model phản hồi. Gemini's `sendClientContent` với `turnComplete: true` tương đương. **Cả 2 provider đã có sẵn đường "giả làm 1 lượt user đã xong" để ép model trả lời — tái dùng nguyên xi, không phát minh API mới.**

**System instruction dùng chung cho cả 2 provider:** [`lib/moodie/voice-live-config.ts:198-210`](lib/moodie/voice-live-config.ts#L198) (`buildMoodieLiveConnectConfig`) xây instruction cho Gemini; [`buildMoodieOpenAIRealtimeSessionConfig`, dòng 219-241](lib/moodie/voice-live-config.ts#L219) **tái dùng chính văn bản đó** cho OpenAI (`instructions: geminiConfig.systemInstruction...map(...)`) — sửa 1 chỗ áp dụng cho cả 2 provider, không cần sửa 2 nơi.

**Điểm kích hoạt (đã có chime từ Task 2):** [`onOpen` OpenAI dòng ~514-522](hooks/use-moodie-live-voice.ts#L514) và [`onopen` Gemini dòng ~573-585](hooks/use-moodie-live-voice.ts#L573), cả 2 đều đã guard `if (!silent)` cho chime — thêm lời chào vào cùng guard, tái dùng cờ `silent` có sẵn (không chào lại khi reconnect ngầm sau `goAway`, đúng bài học Iris).

### Quyết định thiết kế cần nêu rõ (không giấu, không suy đoán ngầm)

**Delay 300ms trước khi gửi, thay vì gọi đồng bộ ngay trong callback `onopen`/`onOpen`:** Với OpenAI, `openAIClientRef.current` chắc chắn đã gán xong trước khi `onOpen` fire (gán tại dòng ~547, trước `await client.connect()` dòng ~549) — an toàn gọi ngay. Nhưng với Gemini, `sessionRef.current = session` chỉ gán SAU KHI `await ai.live.connect({...})` resolve (dòng 605) — còn `onopen` là callback truyền vào bên trong lệnh gọi đó, có thể fire TRƯỚC khi promise resolve (tùy cách SDK `@google/genai` cài đặt nội bộ, không kiểm chứng được từ code đọc được). Để tránh race-condition không chắc chắn thay vì đoán mò, dùng `setTimeout` 300ms trước khi gửi cho CẢ 2 provider (đồng nhất, dễ verify, đủ thời gian để assignment chắc chắn hoàn tất). Có guard `stoppedRef.current` bên trong timeout để không gửi vào session đã đóng.

**Lời chào tự chứa đầy đủ hướng dẫn (không chỉ 1 tag trần)** — giống Iris (message tiêm vào có full câu lệnh, không chỉ dựa vào system prompt nhớ lại) + có thêm 1 rule ngắn trong system instruction để củng cố — 2 lớp, giống chính xác cách Iris làm (rule chung + lệnh cụ thể lúc gửi).

---

## Task 1 — Thêm rule vào system instruction (`lib/moodie/voice-live-config.ts`)

Tìm khối (dòng 198-210):
```ts
    systemInstruction: {
      parts: [
        {
          text: [
            "Bạn là giao diện giọng nói thời gian thực của Moodie. Trả lời trực tiếp cho chào hỏi, identity, khả năng của Moodie, cấu trúc tổng quan Mood Studio và kiến thức tĩnh đã có trong context. Chỉ gọi ask_moodie khi câu hỏi cần dữ liệu Studio đang thay đổi, kiểm tra quyền, nguồn thật hoặc một phép tra cứu nhanh. CẤM bịa số liệu, trạng thái hoặc thông tin nghiệp vụ; nếu dữ liệu có thể thay đổi mà chưa có kết quả tool thì không được khẳng định. Trả lời bằng đúng ngôn ngữ người dùng đang nói. Người dùng chủ yếu nói tiếng Việt; thuật ngữ nghiệp vụ studio hiểu theo ngữ cảnh tiếng Việt. Giữ câu trả lời nói ngắn, tự nhiên, rõ ràng và không đọc dài dòng.",
            "Ported realtime-worker policy: khi yêu cầu cần nghiên cứu, truy vết codebase, nhiều tool hoặc có thể mất hơn vài giây, gọi propose_moodie_task để chạy nền rồi lập tức báo đã bắt đầu và tiếp tục hội thoại. Không dùng ask_moodie để chờ một cuộc điều tra dài. Dùng get_moodie_task_status để đọc progress/kết quả thật. Chỉ công bố kết quả khi status=completed; status=failed phải nói rõ thất bại. Action có hậu quả phải mô tả đề xuất và hỏi xác nhận trực tiếp; chỉ sau câu đồng ý rõ ràng mới gọi submit_moodie_task. Không tự xác nhận thay người dùng.",
            buildMoodieVoiceKnowledgePack(opts.role || "viewer"),
            opts.contextPacket ? `Ngữ cảnh đã xác thực và ghi nhớ dài hạn:\n${opts.contextPacket}` : "",
          ].filter(Boolean).join("\n\n"),
        },
      ],
    },
```

Thay bằng (chỉ thêm 1 phần tử mới vào mảng, giữ nguyên các phần tử khác y hệt):
```ts
    systemInstruction: {
      parts: [
        {
          text: [
            "Bạn là giao diện giọng nói thời gian thực của Moodie. Trả lời trực tiếp cho chào hỏi, identity, khả năng của Moodie, cấu trúc tổng quan Mood Studio và kiến thức tĩnh đã có trong context. Chỉ gọi ask_moodie khi câu hỏi cần dữ liệu Studio đang thay đổi, kiểm tra quyền, nguồn thật hoặc một phép tra cứu nhanh. CẤM bịa số liệu, trạng thái hoặc thông tin nghiệp vụ; nếu dữ liệu có thể thay đổi mà chưa có kết quả tool thì không được khẳng định. Trả lời bằng đúng ngôn ngữ người dùng đang nói. Người dùng chủ yếu nói tiếng Việt; thuật ngữ nghiệp vụ studio hiểu theo ngữ cảnh tiếng Việt. Giữ câu trả lời nói ngắn, tự nhiên, rõ ràng và không đọc dài dòng.",
            "Ported realtime-worker policy: khi yêu cầu cần nghiên cứu, truy vết codebase, nhiều tool hoặc có thể mất hơn vài giây, gọi propose_moodie_task để chạy nền rồi lập tức báo đã bắt đầu và tiếp tục hội thoại. Không dùng ask_moodie để chờ một cuộc điều tra dài. Dùng get_moodie_task_status để đọc progress/kết quả thật. Chỉ công bố kết quả khi status=completed; status=failed phải nói rõ thất bại. Action có hậu quả phải mô tả đề xuất và hỏi xác nhận trực tiếp; chỉ sau câu đồng ý rõ ràng mới gọi submit_moodie_task. Không tự xác nhận thay người dùng.",
            "Khi bạn nhận được tin nhắn bắt đầu bằng đúng cụm '[MOODIE_SYSTEM_EVENT — phiên giọng nói vừa bắt đầu, không phải lời người dùng]', đây là tín hiệu hệ thống báo phiên vừa kết nối, không phải người dùng vừa nói: hãy làm đúng theo hướng dẫn đi kèm ngay lập tức, không chờ người dùng nói trước, không hỏi lại xác nhận.",
            buildMoodieVoiceKnowledgePack(opts.role || "viewer"),
            opts.contextPacket ? `Ngữ cảnh đã xác thực và ghi nhớ dài hạn:\n${opts.contextPacket}` : "",
          ].filter(Boolean).join("\n\n"),
        },
      ],
    },
```

**Không sửa `buildMoodieOpenAIRealtimeSessionConfig` — nó tự động kế thừa instruction mới vì đọc lại từ `buildMoodieLiveConnectConfig` mỗi lần gọi.**

---

## Task 2 — Thêm hằng số + hàm gửi lời chào (`hooks/use-moodie-live-voice.ts`)

**2a.** Thêm hằng số module-level, đặt ngay trước `export function useMoodieLiveVoice({` (sau khi type `LiveSession` kết thúc, dòng 80):
```ts
const VOICE_SESSION_START_EVENT =
  "[MOODIE_SYSTEM_EVENT — phiên giọng nói vừa bắt đầu, không phải lời người dùng] Hãy chủ động cất tiếng chào người dùng ngay, ngắn gọn và tự nhiên (1-2 câu), dùng tên/vai trò người dùng nếu đã biết từ ngữ cảnh xác thực, rồi hỏi có thể giúp gì. Đừng chờ người dùng nói trước, đừng lặp lại lời chào này nếu phiên đã từng chào.";

export function useMoodieLiveVoice({
```

**2b.** Thêm hàm `sendSessionStartGreeting`, đặt ngay sau khi `scheduleAudio` kết thúc (dòng 273, trước `const handleToolCall = useCallback(...`):
```ts
  const sendSessionStartGreeting = useCallback(() => {
    window.setTimeout(() => {
      if (stoppedRef.current) return;
      if (providerRef.current === "openai") {
        openAIClientRef.current?.sendSystemEvent(VOICE_SESSION_START_EVENT);
      } else {
        sessionRef.current?.sendClientContent?.({
          turns: [{ role: "user", parts: [{ text: VOICE_SESSION_START_EVENT }] }],
          turnComplete: true,
        });
      }
    }, 300);
  }, []);

  const handleToolCall = useCallback(async (call: FunctionCall) => {
```

**2c.** Gọi hàm trong callback `onOpen` OpenAI (nằm trong `connect()`, đã có chime từ Task 2 — chỉ thêm 1 dòng, đổi `if (!silent) playMoodieConnectedChime(...)` đơn dòng thành khối `{}`):

Thay:
```ts
            onOpen: () => {
              if (connectTimeoutRef.current !== null) clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
              emitTelemetry("session.connected", { includeTurn: false });
              if (!silent) playMoodieConnectedChime(playbackContextRef.current ?? undefined);
              setStatus("listening");
            },
```
bằng:
```ts
            onOpen: () => {
              if (connectTimeoutRef.current !== null) clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
              emitTelemetry("session.connected", { includeTurn: false });
              if (!silent) {
                playMoodieConnectedChime(playbackContextRef.current ?? undefined);
                sendSessionStartGreeting();
              }
              setStatus("listening");
            },
```

**2d.** Gọi hàm trong callback `onopen` Gemini — thay:
```ts
            onopen: () => {
              if (!stoppedRef.current) {
                if (connectTimeoutRef.current !== null) {
                  clearTimeout(connectTimeoutRef.current);
                  connectTimeoutRef.current = null;
                }
                emitTelemetry(silent ? "session.resumed" : "session.connected", { includeTurn: false });
                if (!silent) playMoodieConnectedChime(playbackContextRef.current ?? undefined);
                setStatus("listening");
              }
            },
```
bằng:
```ts
            onopen: () => {
              if (!stoppedRef.current) {
                if (connectTimeoutRef.current !== null) {
                  clearTimeout(connectTimeoutRef.current);
                  connectTimeoutRef.current = null;
                }
                emitTelemetry(silent ? "session.resumed" : "session.connected", { includeTurn: false });
                if (!silent) {
                  playMoodieConnectedChime(playbackContextRef.current ?? undefined);
                  sendSessionStartGreeting();
                }
                setStatus("listening");
              }
            },
```

**2e.** Thêm `sendSessionStartGreeting` vào mảng dependency của `connect` (đúng 1 chỗ, cuối hàm `connect`, dòng ~614):

Thay:
```ts
    [closeSession, emitTelemetry, fallbackToCascade, handleMessage, handleToolCall, reportError],
  );
```
bằng:
```ts
    [closeSession, emitTelemetry, fallbackToCascade, handleMessage, handleToolCall, reportError, sendSessionStartGreeting],
  );
```

**Không sửa gì khác** — không đụng `handleMessage`, không đụng vòng lặp task-store polling (dòng 796-831, cơ chế tương tự nhưng KHÔNG phải phạm vi task này).

---

## Verify (Codex/coder tự chạy trước khi báo xong)

1. `npx eslint hooks/use-moodie-live-voice.ts lib/moodie/voice-live-config.ts` — 0 lỗi, 0 warning.
2. `npm run build` — xanh.
3. Báo diff đầy đủ. **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude)

1. Đọc lại diff, xác nhận đúng phạm vi (2 file, đúng các điểm trên).
2. `npm run build` chạy lại độc lập.
3. Nếu khả thi: mở `/moodie` dev server thật, bấm voice, nghe xem model có tự chào trong ~1-2s sau chime không (không cần nói gì trước). Nếu không tiện (cần mic permission + provider API key thật + có thể tốn phí gọi model), chấp nhận verify bằng đọc code + build xanh, ghi rõ giới hạn — đây là hành vi phụ thuộc runtime model thật, khó test tự động.
4. Commit + push sau khi verify đạt.
