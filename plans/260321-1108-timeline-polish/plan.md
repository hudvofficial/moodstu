# Plan: Fix All Audit — Timeline Cards Polish
Created: 2026-03-21T11:08
Status: 🟡 Chờ duyệt

## Overview
Fix 2 logic warnings + 3 UX improvements từ audit report.

## Fixes

| # | Type | Issue | Fix |
|---|------|-------|-----|
| W1 | 🟡 Logic | 0 tasks → auto-reset status "chua_lam" | Bỏ auto-reset khi 0 tasks |
| W2 | 🟡 Logic | Header "2/8" nhầm event vs task | Đổi text → "2/8 sự kiện xong" |
| S1 | 🟢 UX | Card 0 tasks → trống | Thêm "Chưa phân công" |
| S2 | 🟢 UX | "DL:" khó hiểu | Đổi → "Hạn:" |
| S3 | 🟢 UX | Progress track quá nhạt | Background đậm hơn |

## Phases

| Phase | Name | File | Dòng sửa |
|-------|------|------|----------|
| 01 | Fix W1: checkAndCompleteEvent | work-task-actions.ts | ~3 dòng |
| 02 | Fix W2 + S1 + S2 + S3: UI polish | event-timeline.tsx | ~5 dòng |
| 03 | Build + Restart | — | — |
| 04 | Browser verify | — | — |

---

## Phase 01: Fix checkAndCompleteEvent (W1)

### File: `app/actions/work-task-actions.ts` L144-149

**Hiện tại (bug):**
```ts
if (!tasks || tasks.length === 0) {
  await supabase.from("contract_events")
    .update({ status: "chua_lam" })
    .eq("id", eventId);
  return;
}
```

**Sửa thành:**
```ts
if (!tasks || tasks.length === 0) {
  // Không tự reset status khi 0 tasks — giữ nguyên manual status
  return;
}
```

**Lý do:** Nếu admin thủ công đánh dấu "XONG" 1 event, rồi ai đó thêm/xóa task → sẽ mất status.

---

## Phase 02: UI Polish (W2 + S1 + S2 + S3)

### File: `event-timeline.tsx`

**W2 — Header text rõ hơn (L126):**
```diff
- {completedCount}/{sorted.length} hoàn thành
+ {completedCount}/{sorted.length} sự kiện xong
```

**S1 — Hint "Chưa phân công" khi 0 tasks (sau L225, trước `</div>`):**
```tsx
{eventTasks.length === 0 && event.status !== "hoan_thanh" && (
  <p className="text-caption text-text-muted mt-1 italic">
    Chưa phân công
  </p>
)}
```

**S2 — "DL:" → "Hạn:" (L190):**
```diff
- {isOnSet ? "" : "DL: "}{displayDate}
+ {isOnSet ? "" : "Hạn: "}{displayDate}
```

**S3 — Progress track đậm hơn (L209):**
```diff
- <div className="flex-1 h-1.5 bg-bg-card rounded-full overflow-hidden">
+ <div className="flex-1 h-1.5 bg-border-primary/30 rounded-full overflow-hidden">
```

---

## Phase 03: Build + Restart
- [ ] `npx next build` → pass
- [ ] `npx kill-port 3000`
- [ ] `npm run dev`

## Phase 04: Browser Verify
- [ ] "Chuẩn bị Pre-wedding" (XONG, 0 tasks) → badge "XONG", không có "Chưa phân công"
- [ ] "Chuẩn bị lễ cưới" (0 tasks) → hiện "Chưa phân công"
- [ ] Header badge = "2/8 sự kiện xong"
- [ ] "Hậu kỳ Pre-wedding" → "Hạn: 22/04/2026" (không phải "DL:")
- [ ] Progress bar track visible trên cards 0/N
