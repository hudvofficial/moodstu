# Audit Report — Productivity Module V2 Sync

**Ngày:** 2026-04-03 | **Scope:** Full Audit (Code + Visual + Performance)

## Summary

- 🔴 Critical: 0
- 🟡 Warning: 5
- 🟢 Info (Suggestion): 4

---

## 🟡 Warning Issues (Nên sửa)

### W1. `productivity-page-client.tsx` vượt 250L limit (325L)

- **File:** `components/productivity/productivity-page-client.tsx`
- **Vấn đề:** 325 dòng, vượt giới hạn 250L của V2 Gold Standard (Lesson #7, #40)
- **Hậu quả:** Khó maintain, khó review, vi phạm file-splitting standard
- **Cách sửa:** Extract `ProductivityRealtimeBindings` + `ProductivityDetailRealtime` ra file riêng `productivity-realtime.tsx` (~25L), extract tab/period control section ra `productivity-period-control.tsx` hoặc gom state logic vào custom hook `useProductivityState`

### W2. `productivity-detail-content.tsx` vượt 250L limit (268L)

- **File:** `components/productivity/productivity-detail-content.tsx`
- **Vấn đề:** 268 dòng, vượt giới hạn
- **Cách sửa:** Extract `DetailSkeleton` (L32-54) ra file riêng, hoặc extract logic `overdueEntries` + overdue section (L110-188) ra `productivity-overdue-section.tsx`

### W3. Progress bar dùng inline div — không dùng SSOT token `progress-track`/`progress-fill`

- **File:** `productivity-team-table.tsx` L189-198
- **Vấn đề:** Code hiện tại:
  ```tsx
  <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
    <div className={`h-full rounded-full ${getProgressClass(...)}`} style={{width: `${...}%`}} />
  </div>
  ```
  Gold Standard (financial-dashboard.tsx) dùng:
  ```tsx
  <div className="progress-track h-2">
    <div className="progress-fill" style={{width: `${...}%`}} />
  </div>
  ```
- **Hậu quả:** Bỏ lỡ SSOT transition animation (700ms ease-out) từ `progress-fill`, mất consistency visual
- **Cách sửa:** Thay bằng `progress-track` + tạo `progress-fill-{variant}` cho multi-color (error/warning/info) hoặc dùng inline `style={{ backgroundColor }}` kết hợp `progress-fill`

### W4. Mobile card labels dùng inline `text-xs uppercase tracking-wide` — có SSOT token `text-overline`

- **File:** `productivity-mobile-cards.tsx` L56, L64, L72, L80
- **File:** `productivity-team-table.tsx` L63 (SortHeader)
- **Vấn đề:** 5 instances dùng `text-xs uppercase tracking-wide text-text-muted` thay vì `text-overline text-text-muted`
- **Hậu quả:** Vi phạm SSOT — nếu typography scale thay đổi, 5 chỗ này không được update
- **Cách sửa:** Replace tất cả bằng `text-overline text-text-muted`

### W5. Mobile cards dùng `<Button variant="ghost">` wrap toàn bộ card — không dùng `card-interactive`

- **File:** `productivity-mobile-cards.tsx` L27-33
- **Vấn đề:** Code hiện tại: `<Button variant="ghost" className="card-base h-auto w-full justify-start px-4 py-4 text-left">`
  - `Button ghost` + `card-base` = override lẫn nhau về background, padding, hover state
  - Gold Standard dùng `card-interactive` (có hover lift + shadow transition) hoặc native `<button>` + `card-interactive`
- **Hậu quả:** Visual inconsistency — card không có hover lift effect như các module khác
- **Cách sửa:** Đổi sang `<button className="card-interactive px-4 py-4 w-full text-left">` hoặc wrap bằng `<div className="card-interactive" onClick={...}>`

---

## 🟢 Suggestions (Tùy chọn — tối ưu thêm)

### S1. Stats bar wrapper dùng inline classes — có SSOT token `stats-card`

- **File:** `productivity-page-client.tsx` L251
- **Hiện tại:** `<div className="flex items-center justify-between gap-4 rounded-xl bg-bg-card px-5 py-3 shadow-xs">`
- **SSOT:** Có `stats-card` token (card.css L35-48) với hover animation + mobile compact padding
- **Gợi ý:** Cân nhắc thay nếu muốn hover animation trên stats wrapper

### S2. Semantic color cho giá trị "0" — Hoàn thành/Quá hạn

- **File:** `productivity-team-table.tsx` L163, L167-175
- **Vấn đề:** Khi employee chưa có task:
  - "Hoàn thành" hiển thị `0` + `text-success` (màu xanh) → gây confusion (trông như đã xong)
  - "Quá hạn" hiển thị `0` + `text-text-secondary` → đúng (neutral khi 0)
- **Gợi ý:** Khi `completed_tasks === 0`, dùng `text-text-secondary` thay vì `text-success`

### S3. SWR config: thiếu `dedupingInterval`

- **File:** `lib/hooks/use-productivity.ts` L38-43
- **Hiện tại:** `revalidateOnMount: false, revalidateOnFocus: false` — OK
- **Gợi ý:** Thêm `dedupingInterval: 5000` (hoặc tương tự) để tránh duplicate requests khi user switch periods nhanh liên tục. Các module khác (contracts, CRM) đều có `dedupingInterval`.

### S4. Avatar circle dùng inline đủ classes — cân nhắc token hóa

- **File:** `productivity-team-table.tsx` L141, `productivity-mobile-cards.tsx` L36
- **Hiện tại:** `flex h-10 w-10 items-center justify-center rounded-full bg-bg-hover text-sm font-bold text-text-secondary`
- **Gợi ý:** Pattern này xuất hiện ở nhiều module (employees, CRM, contracts). Nếu cần thống nhất — tạo SSOT `.avatar-circle` token. Tuy nhiên đây là nice-to-have, không bắt buộc ngay.

---

## ✅ Passed Checks

| Check                                | Result                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Border violations (`border border-`) | ✅ 0 instances — shadow-only compliant                                     |
| Icon system (lucide-react only)      | ✅ All icons from lucide-react                                             |
| Font system                          | ✅ Inter via system                                                        |
| TabsFilter SSOT component            | ✅ Dùng `<TabsFilter>` từ `components/ui/`                                 |
| EmptyState SSOT component            | ✅ Dùng `<EmptyState>` từ `components/ui/`                                 |
| Badge SSOT component                 | ✅ Mọi badge dùng `<Badge>` với variant maps                               |
| Table SSOT components                | ✅ Dùng `TableWrapper`, `THead`, `TBody`, `TR`, `TD`, `TH`                 |
| Drawer SSOT component                | ✅ Dùng `<Drawer>` từ `components/ui/`                                     |
| Skeleton SSOT component              | ✅ Dùng `<Skeleton>` từ `components/ui/`                                   |
| Button SSOT component                | ✅ Tất cả dùng `<Button>` với proper variants                              |
| SWR (not React Query)                | ✅ Chỉ SWR                                                                 |
| Server-prefetch + SWR revalidation   | ✅ Page.tsx fetches rồi pass `fallbackData`, SWR revalidate                |
| RBAC enforcement                     | ✅ DB-level via `get_my_*` RPCs                                            |
| Global search integration            | ✅ Search via `?q=` URL params, no local SearchBar                         |
| Realtime bindings                    | ✅ `useRealtime` trên `work_tasks`, `employees`, `contracts`               |
| TypeScript types                     | ✅ Full typed, no `any`                                                    |
| Color tokens                         | ✅ Semantic colors only (text-dark, text-text-secondary, text-error, etc.) |

---

## Phase Mapping (cho /plan)

| Phase                                  | Issues                                                         | Files                                                 | Est.   |
| -------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| **Phase 1: SSOT Token Sync**           | W3 (progress-track), W4 (text-overline), S2 (semantic-0-color) | `team-table.tsx`, `mobile-cards.tsx`                  | 15 min |
| **Phase 2: Mobile Card + Interactive** | W5 (card-interactive)                                          | `mobile-cards.tsx`                                    | 10 min |
| **Phase 3: File Splitting**            | W1 (page-client 325→250), W2 (detail-content 268→250)          | `page-client.tsx`, `detail-content.tsx` + 2 new files | 20 min |
| **Phase 4: Performance** (optional)    | S1 (stats-card), S3 (dedupingInterval)                         | `page-client.tsx`, `use-productivity.ts`              | 10 min |
