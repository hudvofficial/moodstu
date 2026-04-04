# Audit Report — Module Productivity

**Date:** 2026-04-03  
**Scope:** Full Audit (Code Quality + SSOT Compliance + Performance + Security + Visual)  
**Module:** `/productivity` (18 files)

---

## Summary

| Severity      | Count |
| ------------- | ----- |
| 🔴 Critical   | 1     |
| 🟡 Warning    | 5     |
| 🟢 Suggestion | 5     |

**Tổng quan:** Module Productivity hoạt động đúng chức năng, RBAC enforcement tốt, component splitting hợp lý trừ file actions. Có 1 vi phạm nghiêm trọng (file quá lớn), 5 warnings (SSOT violations, potential TWv4 conflicts), và 5 suggestions cải thiện.

---

## 🔴 Critical Issues (Phải sửa)

### C1: `productivity-actions.ts` vượt giới hạn 514 lines (max 250)

- **File:** `app/actions/productivity-actions.ts` — **514 lines** (gấp 2x ngưỡng)
- **Nguy hiểm:** Vi phạm quy tắc max 250 lines/file (Lesson #7). File chứa quá nhiều concerns: auth resolution, timezone logic, data transformation, workload calculation, sorting, 2 RPC fetchers, 2 public actions.
- **Cách sửa:** Tách thành 3 files:

| File mới                              | Chứa                                                                                                                                | ~Lines |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `app/actions/productivity-actions.ts` | `fetchProductivityData()`, `fetchEmployeeJobDetails()` (public API)                                                                 | ~120   |
| `lib/productivity-transforms.ts`      | `transformEmployeeRow()`, `transformJobRows()`, `buildSummary()`, `sortTasks()`, `sortJobGroups()`, `sortEmployeesDefault()`        | ~180   |
| `lib/productivity-auth.ts`            | `resolveProductivityViewerContext()`, `getStudioTimezone()`, helpers (`toNumber`, `isAllowedProductivityRole`, `canViewTeam`, etc.) | ~120   |

---

## 🟡 Warnings (Nên sửa)

### W1: Border violation — `productivity-mobile-cards.tsx:88`

- **File:** `components/productivity/productivity-mobile-cards.tsx`
- **Dòng 88:** `className="col-span-2 mt-1 border-t border-dashed border-text-muted/20 pt-3"`
- **Vi phạm:** Lesson #64 — V2 TUYỆT ĐỐI KHÔNG DÙNG BORDER, CHỈ SHADOW
- **Cách sửa:** Thay `border-t border-dashed border-text-muted/20` bằng divider visual khác (ví dụ: `bg-border/20 h-px` hoặc bỏ hẳn separator, dùng spacing `mt-3 pt-0`)

---

### W2: Inline `style={{}}` — `productivity-team-table.tsx:192-194`

- **File:** `components/productivity/productivity-team-table.tsx`
- **Dòng 192-194:**
  ```tsx
  style={{
    width: `${Math.min(100, Math.round(employee.workload_ratio * 100))}%`,
    background: getProgressColor(employee.workload_level),
  }}
  ```
- **Vi phạm:** Gate Section 9 — ZERO INLINE. Inline `style={{}}` cho `width` (dynamic) được chấp nhận, nhưng `background` phải dùng CSS variable/class.
- **Cách sửa:** `getProgressColor()` đã trả `var(--color-*)` — đây là CSS variable, **chấp nhận được** cho dynamic coloring. Tuy nhiên, `background` property nên thống nhất dùng `backgroundColor` để rõ ràng hơn. **Severity: Low-Warning** — không cần fix ngay nhưng nên ghi nhận.

---

### W3: `text-overline uppercase` — Potential TWv4 prefix conflict

- **Files:** `productivity-mobile-cards.tsx` (4 lần), `productivity-team-table.tsx` (1 lần)
- **Pattern:** `className="text-overline text-text-muted"` hoặc `text-overline uppercase text-text-secondary`
- **Rủi ro:** Lesson #95 — Trong TWv4, `text-*` prefix conflict giữa font-size và color. Nếu `text-overline` là custom token (font-size) và `text-text-muted` là color, TWv4 chỉ giữ property cuối.
- **Cách verify:** Kiểm tra xem `text-overline` có phải token font-size trong `@theme` không. Nếu có → conflict với `text-text-muted`.
- **Cách sửa (nếu conflict):** Dùng `style={{ color: 'var(--color-text-muted)' }}` hoặc tách class.

---

### W4: `productivity-page-client.tsx` — 247 lines (gần ngưỡng 250)

- **File:** `components/productivity/productivity-page-client.tsx` — **247 lines**
- **Rủi ro:** 3 lines nữa là vượt. Nếu thêm feature sẽ buộc phải split.
- **Cách sửa:** Tách search/sort logic ra `useProductivityFilters()` custom hook (~40 lines) để giảm xuống ~200 lines. Hoặc giữ nguyên nếu không thêm feature.

---

### W5: Loading skeleton không dùng `<Skeleton>` component (SSOT)

- **File:** `app/(protected)/productivity/loading.tsx`
- **Pattern:** Dùng raw `<div className="skeleton ..." />` thay vì shared `<Skeleton>` component từ `components/ui/skeleton.tsx`
- **Cách sửa:** Import `Skeleton` từ `@/components/ui/skeleton` để đồng bộ.

---

## 🟢 Suggestions (Tùy chọn)

### S1: Thiếu `loading.tsx` cho route-level spinner trên period switch

- **Hiện tại:** Dùng `isPending` + `Loader2` icon inline. Route-level `loading.tsx` chỉ dùng cho initial load.
- **Đề xuất:** Đã đủ tốt. Không cần thay đổi.

### S2: BRIEF file names khác thực tế

- **BRIEF mô tả:** `productivity-list-page.tsx`, `productivity-filters.tsx`, `productivity-table.tsx`, `productivity-card.tsx`
- **Thực tế:** `productivity-page-client.tsx`, `productivity-toolbar.tsx`, `productivity-team-table.tsx`, `productivity-mobile-cards.tsx`
- **Đề xuất:** Update BRIEF hoặc giữ nguyên — tên thực tế rõ ràng hơn. **Không ảnh hưởng chức năng.**

### S3: `use-productivity.ts` — `revalidateOnMount: false` cho cả 2 hooks

- **Hiện tại:** SWR không tự revalidate on mount vì đã có server-prefetched fallbackData.
- **Rủi ro nhỏ:** Nếu user navigate bằng browser back/forward, data có thể stale.
- **Đề xuất:** Thêm `revalidateOnMount: !fallbackData` để chỉ skip mount revalidation khi có fallback.

### S4: Mobile UI — Stats Bar bị cắt ngang

- **Quan sát visual:** Trên mobile 375px, Stats Bar 4 items bị cắt, chỉ hiển thị ~2.5 items (không cuộn ngang).
- **Đề xuất:** Thêm `overflow-x-auto` hoặc wrap thành grid 2x2 trên mobile.

### S5: `text-h2` trong error boundary

- **File:** `app/(protected)/productivity/error.tsx:14`
- **Pattern:** `className="text-h2"` — nếu `text-h2` là custom font-size token, có thể conflict TWv4 giống W3.
- **Đề xuất:** Verify và fix cùng lúc W3.

---

## ✅ Đánh giá tích cực

| Tiêu chí                   | Đánh giá                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **RBAC Security**          | ✅ Enforce đúng trong actions (không chỉ UI). Admin/manager xem team, media xem self, viewer/ctv bị block        |
| **TypeScript**             | ✅ Full typed, KHÔNG `any`. Interface rõ ràng, tách types/constants riêng                                        |
| **Component Architecture** | ✅ Tách tốt: 13 files nhỏ ≤ 223 lines (trừ actions). Reuse `ProductivityDetailContent` cho cả drawer + self-view |
| **SSOT Compliance**        | ✅ Dùng `TableWrapper`, `StatsBar`, `Badge`, `Drawer`, `EmptyState`, `TabsFilter`, `Button` đúng chuẩn           |
| **SWR Pattern**            | ✅ Dedicated hooks, fallbackData, keepPreviousData, dedupingInterval                                             |
| **Realtime**               | ✅ Component riêng lẻ, invalidate đúng tables                                                                    |
| **Route Structure**        | ✅ Có page + loading + error boundary                                                                            |
| **Icon System**            | ✅ Chỉ dùng `lucide-react`, không Material Symbols                                                               |
| **Date Logic**             | ✅ Timezone-aware via `studio-date.ts`                                                                           |
| **Responsive**             | ✅ Desktop table ↔ Mobile cards, responsive breakpoint `lg:`                                                     |

---

## Tổng kết ưu tiên sửa

| Priority | Issue                                | Effort           |
| -------- | ------------------------------------ | ---------------- |
| 1        | C1: Split `productivity-actions.ts`  | Medium (~30 min) |
| 2        | W1: Xóa border trong mobile-cards    | Low (~5 min)     |
| 3        | W3+S5: Verify TWv4 `text-*` conflict | Low (~10 min)    |
| 4        | S4: Fix Stats Bar mobile overflow    | Low (~10 min)    |
| 5        | W4: Tách search/sort hook (optional) | Low (~15 min)    |
| 6        | W5: Dùng `<Skeleton>` component      | Low (~5 min)     |
| 7        | W2: Inline style (acceptable)        | Skip             |

---

## Visual Reference

### Desktop (1424x805)

![Desktop UI](file:///C:/Users/Admin/.gemini/antigravity/brain/22d053b8-7547-41bc-b484-dd3fd98a72d3/productivity_module_desktop_1775210450164.png)

### Mobile (375x812)

![Mobile UI](file:///C:/Users/Admin/.gemini/antigravity/brain/22d053b8-7547-41bc-b484-dd3fd98a72d3/productivity_module_mobile_1775210464246.png)
