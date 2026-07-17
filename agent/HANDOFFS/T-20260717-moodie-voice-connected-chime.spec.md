# T-20260717-moodie-voice-connected-chime — Chime âm thanh báo đã kết nối voice

**Owner:** Claude (fallback `coder` — Codex CLI lỗi hạ tầng 4/4 lần trong phiên, không thử lại nữa) · **Spec:** Claude · **Status:** MERGED (xem `agent/TASKS.yaml` mục `done`)

**Locks (2 file — 1 file mới, 1 file sửa):**
- MỚI: `lib/moodie/voice-chime.ts`
- SỬA: `hooks/use-moodie-live-voice.ts` — 2 điểm gọi hàm chime (callback `onOpen`/`onopen`) + 1 dòng import + **Task 3 bổ sung bên dưới** (bọc 3 chỗ gán ref bằng `useEffect`).

**KHÔNG đụng UI (`components/moodie/moodie-voice-overlay.tsx`), KHÔNG đổi system prompt/instruction (đó là Task khác, tách riêng), KHÔNG thêm asset file audio.**

---

## BỔ SUNG SAU KHI IMPLEMENT LẦN 1 — Task 3: dọn lint nợ có sẵn trong file bị động

Sau khi thêm chime, `npx eslint hooks/use-moodie-live-voice.ts` báo **7 lỗi `react-hooks/refs`** ("Cannot access refs during render") — đã xác minh độc lập bằng `git stash` là lỗi **có sẵn từ trước**, không do 3 dòng chime gây ra. Theo luật cứng dự án ("eslint exit != 0 là KHÔNG push — động file nào nhận cổng CI file đó"), phải dọn sạch trước khi commit. User chọn: sửa luôn trong task này (bọc `useEffect`, không đổi hành vi runtime).

`useEffect` đã có sẵn trong import (dòng 3: `import { useCallback, useEffect, useRef, useState } from "react";`) — không cần thêm import.

### Task 3a — Bọc block 5 dòng gán ref (dòng 139-143)

Thay:
```ts
  conversationIdRef.current = conversationId;
  onConversationIdRef.current = onConversationId;
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;
  onEngineFallbackRef.current = onEngineFallback;
```
bằng:
```ts
  useEffect(() => {
    conversationIdRef.current = conversationId;
    onConversationIdRef.current = onConversationId;
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onEngineFallbackRef.current = onEngineFallback;
  });
```
(KHÔNG có mảng dependency — giữ đúng ý nghĩa "chạy lại mỗi render" như code gốc, chỉ chuyển thời điểm chạy từ lúc render sang lúc commit.)

### Task 3b — Bọc `connectRef.current = connect;` (dòng 619, ngay sau khi `connect` useCallback kết thúc)

Thay:
```ts
    [closeSession, emitTelemetry, fallbackToCascade, handleMessage, handleToolCall, reportError],
  );
  connectRef.current = connect;

  const startCapture = useCallback(async () => {
```
bằng:
```ts
    [closeSession, emitTelemetry, fallbackToCascade, handleMessage, handleToolCall, reportError],
  );
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const startCapture = useCallback(async () => {
```

### Task 3c — Bọc `stopRef.current = stop;` (dòng 722, ngay sau khi `stop` useCallback kết thúc)

Thay:
```ts
  }, [closeSession, emitTelemetry, flushPlayback, stopLevelMeter]);
  stopRef.current = stop;

  const start = useCallback(async () => {
```
bằng:
```ts
  }, [closeSession, emitTelemetry, flushPlayback, stopLevelMeter]);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
```

**Đã kiểm an toàn hành vi (không phải suy đoán):** mọi nơi đọc `connectRef.current`/`stopRef.current` trong file đều nằm trong callback bất đồng bộ (event handler, `setTimeout`, hàm được gọi sau khi lỗi/đóng kết nối) — không có chỗ nào đọc đồng bộ ngay trong thân render cùng lượt render đó. Chuyển gán từ "lúc render" sang "lúc commit (effect)" không đổi hành vi quan sát được.

**KHÔNG sửa gì khác** — không đổi cấu trúc `useCallback` nào, không gộp 3 effect thành 1 (giữ đúng vị trí/nhóm hiện có của từng chỗ gán).

### Verify bổ sung
`npx eslint hooks/use-moodie-live-voice.ts` phải về **0 lỗi** (không chỉ giảm xuống 6, phải về 0 — nếu còn sót thì đọc lại thông báo lỗi mới, đừng đoán đã xong).

---

## Bối cảnh — đã đọc code thật

Đối chiếu Iris (tham khảo, không sửa Iris): Iris phát 1 chime 2 nốt tăng dần bằng Web Audio oscillator (không phải file audio) mỗi khi phiên "thức dậy", độc lập với lời chào giọng nói của model — đây là tín hiệu tức thời, không cần chờ model sinh audio.

Moodie hiện tại: `hooks/use-moodie-live-voice.ts` có 2 điểm kết nối thành công, cả 2 đều gọi `setStatus("listening")` ngay khi mở phiên — đây chính là điểm cần chèn chime:
- **OpenAI Realtime** — [`onOpen` trong `connect()`, dòng 514-519](hooks/use-moodie-live-voice.ts#L514):
```ts
            onOpen: () => {
              if (connectTimeoutRef.current !== null) clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
              emitTelemetry("session.connected", { includeTurn: false });
              setStatus("listening");
            },
```
- **Gemini Live** — [`onopen` trong `connect()`, dòng 573-581](hooks/use-moodie-live-voice.ts#L573):
```ts
            onopen: () => {
              if (!stoppedRef.current) {
                if (connectTimeoutRef.current !== null) {
                  clearTimeout(connectTimeoutRef.current);
                  connectTimeoutRef.current = null;
                }
                emitTelemetry(silent ? "session.resumed" : "session.connected", { includeTurn: false });
                setStatus("listening");
              }
            },
```

**Quan trọng — tái dùng cờ `silent` đã có sẵn:** `connect(silent = false)` ([dòng 471](hooks/use-moodie-live-voice.ts#L471)) đã phân biệt kết nối thật (`silent=false`, user bấm bắt đầu) với reconnect ngầm sau `goAway`/mất kết nối (`silent=true`, gọi từ [dòng 450](hooks/use-moodie-live-voice.ts#L450) và [dòng 566](hooks/use-moodie-live-voice.ts#L566)). Giống bài học của Iris (không chào lại khi reconnect ngầm) — chime **CHỈ phát khi `!silent`**, không phát mỗi lần tự nối lại giữa cuộc hội thoại (tránh làm phiền).

`playbackContextRef` ([khai báo dòng 109](hooks/use-moodie-live-voice.ts#L109)) là `AudioContext` đã có sẵn, được tạo trong `startCapture()` ([dòng 634-637](hooks/use-moodie-live-voice.ts#L634)) để phát audio model — tái dùng context này cho chime thay vì tạo `AudioContext` mới (tránh nhiều context cùng lúc).

Đã kiểm: test env là `node` (không phải `jsdom`), không có mock Web Audio nào trong `tests/` — viết unit test cho hàm phát âm thanh này sẽ phải dựng thêm hạ tầng mock, không tương xứng cho 1 hàm nhỏ. Verify bằng build + eslint + nghe thử thật, không viết test.

---

## Task 1 — File mới `lib/moodie/voice-chime.ts`

```ts
"use client";

const CHIME_NOTES_HZ = [523.25, 659.25];

export function playMoodieConnectedChime(context?: AudioContext) {
  try {
    const audioContext = context ?? new AudioContext();
    const now = audioContext.currentTime;
    CHIME_NOTES_HZ.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const startAt = now + index * 0.12;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.15, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.2);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.25);
    });
  } catch {
    // Âm thanh chỉ mang tính báo hiệu — lỗi phát chime không được làm hỏng phiên voice.
  }
}
```

Giải thích lựa chọn: 2 nốt C5→E5 (523.25Hz → 659.25Hz) tăng dần, mỗi nốt 0.25s, so le 0.12s — chime ngắn, không gây khó chịu. `try/catch` bọc toàn bộ vì đây là tín hiệu phụ trợ, lỗi phát âm thanh (ví dụ context bị suspended, trình duyệt chặn autoplay) không được phép làm crash hay ảnh hưởng luồng voice chính.

## Task 2 — Sửa `hooks/use-moodie-live-voice.ts`

**2a.** Thêm import (đặt sau dòng `import type { OpenAIRealtimeWebRTCClient } from "@/lib/moodie/realtime/openai-webrtc-client";`):
```ts
import type { OpenAIRealtimeWebRTCClient } from "@/lib/moodie/realtime/openai-webrtc-client";
import { playMoodieConnectedChime } from "@/lib/moodie/voice-chime";
```

**2b.** Sửa `onOpen` OpenAI (dòng 514-519) — thêm đúng 1 dòng trước `setStatus("listening")`:
```ts
            onOpen: () => {
              if (connectTimeoutRef.current !== null) clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
              emitTelemetry("session.connected", { includeTurn: false });
              if (!silent) playMoodieConnectedChime(playbackContextRef.current ?? undefined);
              setStatus("listening");
            },
```

**2c.** Sửa `onopen` Gemini (dòng 573-581) — thêm đúng 1 dòng trước `setStatus("listening")`:
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

**Không sửa dòng nào khác trong file** — kể cả `connect()` signature, kể cả logic `silent`/`stoppedRef` hiện có.

---

## Verify (Codex/coder tự chạy trước khi báo xong)

1. `npx eslint lib/moodie/voice-chime.ts hooks/use-moodie-live-voice.ts` — 0 lỗi, 0 warning.
2. `npm run build` — xanh.
3. Báo diff đầy đủ. **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude)

1. Đọc lại diff, xác nhận đúng phạm vi (1 file mới + 3 điểm trong 1 file sửa).
2. `npm run build` chạy lại độc lập.
3. Nếu khả thi trong phiên: mở `/moodie` trên dev server thật, bấm nút voice, nghe xem có chime phát ra ngay lúc kết nối không. Nếu không tiện thực hiện (cần mic permission + trình duyệt thật), chấp nhận verify bằng đọc code + build xanh, ghi rõ giới hạn.
4. Commit + push sau khi verify đạt.
