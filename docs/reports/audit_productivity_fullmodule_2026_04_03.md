# Full Module Audit: /productivity

**Date:** 2026-04-03 07:25  
**Scope:** Full Audit — 13 files (11 module + 1 SQL migration + 1 SWR)

---

## Summary

- 🔴 Critical: **2**
- 🟡 Warning: **4**
- 🟢 Info: **2**
- ⚠️ Blocker (DB): **1**

**Files Audited:**

| File                               | Lines | Verdict                                   |
| ---------------------------------- | ----: | ----------------------------------------- |
| `page.tsx`                         |    80 | ✅ RBAC gate + server-prefetch            |
| `loading.tsx`                      |    42 | ✅                                        |
| `error.tsx`                        |    22 | ✅                                        |
| `productivity-page-client.tsx`     |   430 | 🔴 Too long + inline SearchBar            |
| `productivity-stats-bar.tsx`       |    57 | ✅ Uses shared StatsBar                   |
| `productivity-overload-banner.tsx` |    61 | 🟡 border violation                       |
| `productivity-team-table.tsx`      |   214 | ✅ Uses TableWrapper                      |
| `productivity-mobile-cards.tsx`    |    99 | ✅                                        |
| `productivity-detail-content.tsx`  |   268 | 🟡 Slightly over 250L + border violations |
| `productivity-detail-drawer.tsx`   |    61 | ✅ Uses shared Drawer                     |
| `utils.ts`                         |    46 | ✅                                        |
| `use-productivity.ts`              |    91 | ✅ But depends on missing cache keys      |
| `productivity-v2.1.sql`            |   120 | ⚠️ NOT YET APPLIED                        |

---

## ⚠️ BLOCKER: DB Migration Not Applied

File `docs/migrations/productivity-v2.1.sql` creates 2 new RPCs chưa tồn tại trên V2 DB:

| RPC                                        | Purpose                                                  |
| ------------------------------------------ | -------------------------------------------------------- |
| `get_my_employee_productivity(start, end)` | Self-view: returns ONLY calling user's row, cost = NULL  |
| `get_my_employee_job_details(start, end)`  | Self-view: returns ONLY calling user's jobs, cost = NULL |

**Impact:** Self-view mode hiện đang dùng **app-layer filtering** (action tự filter) thay vì DB-level RBAC. Sau khi apply SQL + refresh typegen → đổi action internals sang RPC mới.

---

## 🔴 Critical Issues (2)

### C1: Inline `SearchBar` Trùng Header Global Search

**File:** `productivity-page-client.tsx` L347-354

```tsx
<SearchBar
  placeholder="Tìm theo tên hoặc vai trò"
  value={searchQuery}
  onChange={setSearchQuery}
/>
```

**Vấn đề:** Header (`components/layout/header.tsx` L190-202) đã có global search bar với `?q=` URL param. Trang Productivity có thêm inline `SearchBar` → **2 ô tìm kiếm cùng lúc** trên UI.

**Bug này đã lặp lại** ở module Printing (đã fix trong conversation `3a316c7e`).

**Fix:** Xóa inline `SearchBar`, wire filter logic vào `?q=` URL param từ header hoặc dùng `hideSearch` prop trên header + giữ inline (chọn 1 trong 2 pattern).

---

### C2: `productivity-page-client.tsx` Quá Dài (430L > Max 250L)

**Vi phạm:** Lesson #7 — "God files 500+ lines → v2 max 250 lines, split sớm"

**File hiện tại chứa:**

- Realtime bindings (L47-65) → tách `productivity-realtime.tsx`
- Sort logic (L67-102) → move vào `utils.ts`
- Client state orchestration (L104-428) → giữ nhưng sẽ nhỏ hơn sau khi tách

---

## 🟡 Warnings (4)

### W1: `border` Vi Phạm Lesson #64 (5 occurrences)

**Lesson #64:** "V2 TUYỆT ĐỐI KHÔNG DÙNG BORDER — CHỈ SHADOW"

| File                  | Line     | Code                                                |
| --------------------- | -------- | --------------------------------------------------- |
| `page-client.tsx`     | 264      | `border border-warning/20`                          |
| `page-client.tsx`     | 313      | `border border-warning/20`                          |
| `overload-banner.tsx` | 29       | `border border-error/20`                            |
| `detail-content.tsx`  | 160      | `border border-error/20`                            |
| `detail-content.tsx`  | 169, 237 | `border border-error/15`, `border border-border/60` |

**Fix:** Replace `border border-*/20` → chỉ dùng `shadow-xs` hoặc `bg-*/5` cho visual separation.

---

### W2: `detail-content.tsx` Slightly Over Limit (268L > 250L)

Không nghiêm trọng nhưng nên tách: `OverdueSection` (L159-188) và `JobGroupCard` (L191-263) thành sub-components.

---

### W3: SWR Cache Keys Missing From `lib/swr.ts`

Hook `use-productivity.ts` gọi:

```typescript
cacheKeys.productivity(period, viewMode); // L35
cacheKeys.productivityJobDetails(id, s, e); // L63
```

Nhưng `lib/swr.ts` **KHÔNG CÓ** 2 keys này. Build hiện tại sẽ fail TypeScript nếu keys chưa được thêm ở đâu đó.

**Cần kiểm tra:** Có thể keys đã được thêm động (monkey-patch) hoặc qua type augmentation. Nếu không → phải thêm vào `lib/swr.ts` cacheKeys object.

---

### W4: `useRealtime` Hook Dependencies Not Verified

`productivity-page-client.tsx` L47-65 gọi `useRealtime("work_tasks", ...)` cho realtime updates. Cần verify `useRealtime` hook tồn tại và hoạt động đúng.

---

## 🟢 Info / Đánh giá tích cực (2)

### I1: Architecture Tổng Thể Đúng Gold Standard ✅

- Types đã tách: `types/productivity.ts` + `types/productivity-constants.ts`
- Dedicated hook: `lib/hooks/use-productivity.ts`
- Shared primitives: StatsBar ✅, TabsFilter ✅, TableWrapper ✅, Drawer ✅, Badge ✅, EmptyState ✅, Button ✅
- Icons: lucide-react only ✅
- Detail content shared giữa drawer + self-view ✅

### I2: Server-Side RBAC Gate Đúng Pattern ✅

`page.tsx` dùng `getAuthenticatedUserContext()` + `PRODUCTIVITY_ALLOWED_ROLES` + redirect. Đúng chuẩn.

---

## Action Items

| #   |    Priority    | Hành động                                                                           | File                                 |
| --- | :------------: | ----------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | ⚠️ **BLOCKER** | Apply `productivity-v2.1.sql` → refresh typegen → đổi action self-mode sang RPC mới | Supabase + `productivity-actions.ts` |
| 2   |       🔴       | Xóa inline `SearchBar` hoặc wire vào `?q=` header param                             | `page-client.tsx` L347-354           |
| 3   |       🔴       | Tách `page-client.tsx` (430L → ~250L)                                               | `page-client.tsx`                    |
| 4   |       🟡       | Xóa `border` class → dùng `shadow-xs`                                               | 5 files (see W1)                     |
| 5   |       🟡       | Thêm `cacheKeys.productivity()` vào `lib/swr.ts`                                    | `lib/swr.ts`                         |
| 6   |       🟡       | Tách detail sub-components                                                          | `detail-content.tsx`                 |
