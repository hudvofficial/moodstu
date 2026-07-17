# T-20260717-moodie-voice-error-state — Sửa trạng thái `error` hiển thị y hệt `listening` trong voice overlay

**Owner:** Claude (fallback `coder` — Codex CLI lỗi hạ tầng lần 3, xem TASKS.yaml) · **Spec:** Claude · **Status:** MERGED (xem `agent/TASKS.yaml` mục `done`)

**Locks (1 file):** `components/moodie/moodie-voice-overlay.tsx` — CHỈ 2 điểm: label (khoảng dòng 524-530) và dot màu (dòng 537).

**KHÔNG đụng `hooks/use-moodie-live-voice.ts`, KHÔNG đụng `MoodieVoiceCascade` (đường dự phòng, không dùng chung state machine này), KHÔNG đổi logic đóng overlay khi lỗi.**

---

## Bối cảnh — đã đọc code thật, không suy đoán

`VoiceStatus` ([`hooks/use-moodie-live-voice.ts:15`](hooks/use-moodie-live-voice.ts#L15)) có 5 giá trị: `"idle" | "connecting" | "listening" | "speaking" | "error"`. Trong `MoodieVoiceOverlay`, cả **label** (dòng 524-530) và **màu chấm trạng thái** (dòng 537) chỉ phân biệt `connecting`/`speaking`/`muted` — còn lại (bao gồm cả `listening` VÀ `error`) rơi vào chung 1 nhánh `else`, nên khi `status === "error"` thì UI hiện y hệt lúc đang nghe bình thường: chữ "Đang nghe" + chấm xanh `bg-success animate-pulse`.

`VoiceTextComposer` ([dòng 561](components/moodie/moodie-voice-overlay.tsx#L561)) đã đúng — nó disable khi `status === "error"` — tức là code coi `error` là trạng thái có ý nghĩa riêng ở đây nhưng KHÔNG ở label/dot. Đây là chỗ không nhất quán, không phải chủ ý.

**Lưu ý về mức độ ảnh hưởng thực tế (để không phóng đại):** `onError` callback truyền vào hook ([dòng 448-451](components/moodie/moodie-voice-overlay.tsx#L448)) gọi `toast.error(...)` rồi `onCloseRef.current()` đóng overlay ngay — nên trong luồng hiện tại, trạng thái `error` hầu như không tồn tại lâu trên UI cố định của overlay này (thường chỉ 1 frame thoáng qua trước khi unmount, nếu có). Việc sửa vẫn đáng làm vì: (1) đúng về mặt logic/code — `error` là 1 giá trị hợp lệ của type `VoiceStatus`, không nên hiển thị sai; (2) phòng ngừa cho các luồng gọi `onError` khác trong tương lai không nhất thiết đóng overlay ngay; (3) rẻ, không rủi ro.

`bg-error` đã là token màu có sẵn trong theme (dùng ở `components/contracts/progress-badge.tsx`, `components/ui/date-picker.tsx`... — tái dùng, không tạo màu mới).

---

## Task 1 — Sửa label (dòng 524-530)

Thay:
```tsx
  const label = status === "connecting"
    ? "Đang kết nối"
    : status === "speaking"
      ? "Moodie đang nói"
      : muted
        ? "Đã tắt tiếng"
        : "Đang nghe";
```
bằng:
```tsx
  const label = status === "connecting"
    ? "Đang kết nối"
    : status === "error"
      ? "Lỗi kết nối"
      : status === "speaking"
        ? "Moodie đang nói"
        : muted
          ? "Đã tắt tiếng"
          : "Đang nghe";
```

## Task 2 — Sửa màu chấm trạng thái (dòng 537)

Thay:
```tsx
            <span className={`h-2 w-2 rounded-full ${muted ? "bg-white/35" : status === "connecting" ? "bg-warning animate-pulse" : "bg-success animate-pulse"}`} aria-hidden="true" />
```
bằng:
```tsx
            <span className={`h-2 w-2 rounded-full ${muted ? "bg-white/35" : status === "connecting" ? "bg-warning animate-pulse" : status === "error" ? "bg-error" : "bg-success animate-pulse"}`} aria-hidden="true" />
```
(Chấm đỏ KHÔNG `animate-pulse` — pulse xanh đọc như "đang sống bình thường", đỏ đứng yên đọc như "dừng/lỗi", đúng ý nghĩa hơn.)

**Không sửa bất kỳ dòng nào khác trong file** — kể cả `VoiceTextComposer disabled={...}` (đã đúng sẵn), kể cả `MoodieVoiceCascade`.

---

## Verify (Codex/coder tự chạy trước khi báo xong)

1. `npx eslint components/moodie/moodie-voice-overlay.tsx` — 0 lỗi, 0 warning.
2. `npm run build` — xanh.
3. Báo diff đầy đủ (chỉ 2 chỗ đổi). **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude)

1. Đọc lại diff, xác nhận đúng 2 điểm, không thừa.
2. `npm run build` chạy lại độc lập.
3. Chrome DevTools: nếu tái hiện được trạng thái lỗi kết nối voice trên dev server (ví dụ chặn network tới endpoint token/WebRTC), chụp screenshot xác nhận chấm đỏ + label "Lỗi kết nối" xuất hiện đúng lúc thay vì "Đang nghe". Nếu không tái hiện được dễ dàng (do auto-close ngay), chấp nhận verify bằng đọc code + build xanh, ghi rõ giới hạn này.
4. Commit + push sau khi verify đạt.
