# Plan: Event Timeline — Horizontal Cards V2
Created: 2026-03-21T10:22
Updated: 2026-03-21T10:45
Status: 🟡 Chờ anh duyệt

## Overview
Chuyển Event Timeline từ vertical list → horizontal grid cards.
Port layout V1 + bỏ inline expand + click card = mở EventTaskModal.
Fix luôn 3 bugs phát hiện trong brainstorm + test thực tế.

## Bugs phát hiện

| # | Bug | Root Cause | File |
|---|-----|------------|------|
| BUG-1 | Thêm nhân sự OK nhưng không refresh | Parent không truyền `onRefresh` | contract-detail-client.tsx |
| BUG-2 | `contractId` fallback rỗng `""` | Không cần fallback, event có `contract_id` | event-timeline.tsx |
| BUG-3 | Progress bar không hiện trên cards | Server action thiếu `event_id` trong work_tasks select | contracts.ts (server action) |

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Rewrite event-timeline.tsx | ✅ Đã code (chờ duyệt) | event-timeline.tsx |
| 02 | Fix parent onRefresh prop | ✅ Đã code (chờ duyệt) | contract-detail-client.tsx |
| 03 | Fix server action thiếu event_id | ✅ Đã code (chờ duyệt) | app/actions/contracts.ts |
| 04 | Build + Kill port + Restart | ⬜ Chờ duyệt | — |
| 05 | Browser verify (desktop + mobile) | ⬜ Chờ duyệt | — |

---

## Phase 01: Rewrite event-timeline.tsx (ĐÃ CODE)

### Đã xóa
- [x] `TimelineDot` component
- [x] `InlineTaskList` component
- [x] `expandedId` state + `toggleExpand`
- [x] Vertical timeline line
- [x] `ChevronDown` import

### Đã thêm — Header
- [x] Overall progress badge: "2/8 hoàn thành"

### Đã thêm — Grid Layout
- [x] CSS: `repeat(auto-fill, minmax(160px, 1fr))`
- [x] Tự động 2 cột mobile, 3-4 cột desktop

### Đã thêm — Card Component
```
┌─ border-l-3 ──────────────────┐
│ ● XONG                       │  ← status badge
│ 📸 Chụp Pre-wedding Đà Lạt   │  ← Lucide icon + title
│ 📅 10/04 • 08:00-17:00       │  ← date
│ 📍 Đà Lạt                    │  ← location
│ ████████░░  2/3              │  ← progress bar
└───────────────────────────────┘
```

### Card States (SSOT Tokens)
| Status | border-l | bg | badge |
|--------|----------|-----|-------|
| `hoan_thanh` | `border-l-success` | `bg-success/5` | "XONG" (success) |
| `dang_lam` / active | `border-l-primary` | `bg-interactive-light` | "ĐANG LÀM" (warning) |
| `chua_lam` | `border-l-border-primary` | `bg-bg-card` | — |
| overdue (quá hạn) | + Badge variant="error" | | "Trễ Xd" |

### Card Interaction
- [x] Click → `setModalEvent(event)` → Modal
- [x] Hover: `shadow-sm transition-all`
- [x] KHÔNG expand inline

### Lucide Icon Mapping (thay emoji)
| event_type | Icon |
|------------|------|
| chuan_bi | ClipboardList |
| ngay_chup | Camera |
| ngay_to_chuc | Church |
| hau_ky | Pencil |
| giao_san_pham | Package |
| fallback | CalendarDays |

### Logic giữ nguyên
- [x] Sort by `sort_order` → fallback `event_date`
- [x] Active event = first non-complete
- [x] `getDaysOverdue()` — chỉ báo khi ĐÃ TRỄ
- [x] Empty state

### Modal props
```tsx
contractId={modalEvent.contract_id}  // bỏ || ""
onSaved={() => onRefresh?.()}
```

### Kết quả: 314 dòng → 210 dòng

---

## Phase 02: Fix parent onRefresh prop (ĐÃ CODE)

### File: `contract-detail-client.tsx` — 3 dòng thêm:
1. Destructure `mutate: refreshContract` từ `useContractDetail`
2. Desktop EventTimeline: `onRefresh={() => refreshContract()}`
3. Mobile EventTimeline: `onRefresh={() => refreshContract()}`

---

## Phase 03: Fix server action thiếu event_id (ĐÃ CODE)

### File: `app/actions/contracts.ts` L230
```diff
 work_tasks (
-  id, work_type, assigned_to, status, deadline,
+  id, event_id, work_type, assigned_to, status, deadline,
   start_date, completion_date, cost, notes
 ),
```

**Tại sao cần:** EventTimeline filter `tasks.filter(t => t.event_id === event.id)` để hiện progress bar trên mỗi card. Thiếu `event_id` → filter luôn trả `[]` → progress bar không hiện.

---

## Phase 04: Build + Kill port + Restart

- [ ] `npx next build` → pass
- [ ] `npx kill-port 3000` (KHÔNG kill MCP)
- [ ] `npm run dev`

## Phase 05: Browser Verify

- [ ] Desktop: grid 3-4 cột, 8 cards đều
- [ ] Cards có progress bar (VD: "Chụp Pre-wedding" = 2/2)
- [ ] Click card → Modal mở đúng
- [ ] Thêm nhân sự → data tự refresh (KHÔNG cần F5)
- [ ] Status badges: "XONG", "ĐANG LÀM" đúng màu
- [ ] Overdue badge: chưa hiện (đúng — deadline chưa tới)
