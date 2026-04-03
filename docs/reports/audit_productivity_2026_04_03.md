# Deep Audit Report: Productivity Module

**Date:** 2026-04-03  
**Scope:** Full Audit — V1 source + V2 actions + Database RPCs + Types

---

## Summary

- 🔴 Critical Issues: **3**
- 🟡 Warnings: **5**
- 🟢 Suggestions: **4**

**Files Audited (16+ files):**

- V1: `page.tsx`, `EmployeeTable.tsx` (311L), `EmployeeDetailModal.tsx` (304L), `ProductivityStats.tsx` (195L), `OverloadAlerts.tsx` (55L), `constants.ts`, `types/productivity.ts`, `actions/productivity.ts` (234L)
- V1 SQL: `20260301_productivity_rpc.sql`, `20260310_employee_job_details_rpc.sql`
- V2: `productivity-actions.ts` (269L), `database.types.ts` (RPC section), `types/roles.ts`, `lib/swr.ts`, `components/layout/*`

---

## 🔴 Critical Issues (3)

### C1: Status Enum Mismatch — RPC vs V2 Action (POTENTIAL DATA BUG)

**V1 RPC SQL** (`20260301_productivity_rpc.sql` L40, L49, L57):

```sql
wp.status IN ('Chưa làm', 'Đang làm')   -- Tiếng Việt có dấu
wp.status = 'Hoàn thành'                  -- Tiếng Việt có dấu
```

**V2 Action** (`productivity-actions.ts` L258):

```typescript
if (task.status === "hoan_thanh") {   // snake_case KHÔNG dấu
```

**V2 DB `work_tasks.status`** (`database.types.ts` L3341): `status: string | null` — Không có ENUM type, chỉ là VARCHAR.

**Nguy hiểm:** Nếu V2 database RPCs đã được migrate để dùng giá trị snake_case mới (vd: `cho_xu_ly`, `dang_lam`, `hoan_thanh`) thì V2 action code đúng. Nhưng nếu RPC chưa được update, nó vẫn đang check tiếng Việt có dấu → **hàm `fetchEmployeeJobDetails` sẽ đếm sai data** (completed luôn = 0, active luôn = tổng).

**Cần xác minh:**

```sql
-- Chạy trên V2 DB để check giá trị status thực tế:
SELECT DISTINCT status FROM work_tasks LIMIT 20;
-- Và check RPC source:
SELECT prosrc FROM pg_proc WHERE proname = 'get_employee_productivity';
```

---

### C2: V2 Action Thiếu `withAuth()` Pattern

**V1 action** (`productivity.ts` L85):

```typescript
const supabase = await createClient(); // Direct client creation
```

**V2 action** (`productivity-actions.ts` L127):

```typescript
return withAuth(async (supabase) => { ... });  // ✅ Đã dùng withAuth
```

Nhưng V2 action đang **inline export types** (L13-56) thay vì import từ `types/productivity.ts` → V2 chưa có file `types/productivity.ts`. Các types được gom chung trong action file → **vi phạm domain isolation** (v2-module-template §4).

---

### C3: V1 RPC Trỏ `work_progress` — V2 Table Là `work_tasks`

V1 RPC SQL dùng:

```sql
FROM work_progress wp2          -- V1 table name
```

V2 database.types.ts chỉ có table `work_tasks` — **KHÔNG CÓ `work_progress`**.

**Nguy hiểm:** Nếu RPCs trên V2 DB chưa được migrate để trỏ `work_tasks`, chúng sẽ fail ngay lập tức.

**Cần xác minh:** Kiểm tra RPCs hiện có trên V2 DB, đảm bảo chúng reference `work_tasks`, KHÔNG `work_progress`.

---

## 🟡 Warnings (5)

### W1: Thiếu Navigation Sidebar Entry

`/productivity` **KHÔNG có trong sidebar navigator** (`components/layout/*`). Dashboard `quick-access-grid.tsx` có reference (`L15: productivity: { bg: "bg-teal-50", text: "text-teal-600" }`) nhưng sidebar chưa.

**Cần:** Thêm nav link vào sidebar khi build UI.

---

### W2: Thiếu SWR Cache Key

`lib/swr.ts` **KHÔNG có cache key cho productivity**. V1 dùng React Query (`commonKeys.productivity.byPeriod(period)`).

**Cần:** Tạo `cacheKeys.productivity(period)` và `cacheKeys.productivityJobDetails(id, start, end)` trong `lib/swr.ts`.

---

### W3: V2 Types Inline — Chưa Tách File

V2 action file (`productivity-actions.ts`) inline tất cả types (L12-56: `ProductivityPeriod`, `WorkloadLevel`, `EmployeeProductivity`, `ProductivitySummary`, `ProductivityData`, `EmployeeJobGroup`).

**Đúng chuẩn V2:** Phải tách ra:

- `types/productivity.ts` — DB types + enums
- `types/productivity-constants.ts` — Display maps (WORKLOAD_STYLES, PERIOD_LABELS)

---

### W4: V1 Feature `OverloadAlerts` Cần Port

V1 có component `OverloadAlerts.tsx` hiển thị cảnh báo "quá tải" nhân sự dạng alert banner + link "Xem lịch" đến `/schedules`. Đây là UX feature quan trọng cần giữ lại trong V2.

---

### W5: V2 Action Return Format Khác V1

- **V1:** Return `ActionResult<T>` wrapper: `{ success: boolean, data?: T, error?: string }`
- **V2:** `fetchProductivityData` return **trực tiếp `ProductivityData`** (throw on error), `fetchEmployeeJobDetails` cũng return trực tiếp.

**Vấn đề:** V2 action không bọc trong `{ success, data }` → UI client không có cách phân biệt success vs error nếu RPC fail.

---

## 🟢 Suggestions (4)

### S1: V1 `EmployeeTable` Quá Lớn (311 lines) — V2 Phải Split

V1 gom Desktop Table + Mobile Cards + Sorting + WorkloadBar vào 1 file.
→ V2 nên tách: `productivity-table.tsx` (Desktop, dùng `<TableWrapper>`), `productivity-card.tsx` (Mobile).

### S2: V1 Dùng `material-symbols-outlined` — V2 Dùng `lucide-react`

V1 sort icons, alert icons, modal icons dùng Material Symbols (500KB font). V2 phải convert sang lucide-react (Lesson #13, #14).

### S3: V1 Stats Có Mobile/Desktop Dual Layout (195L) — V2 Dùng Shared `<StatsBar>`

V1 custom 2 layouts (MobileStatCard + DesktopStatCard) với watermark effect. V2 nên dùng shared `<StatsBar>` + `<KPICard>` cho clean code.

### S4: V1 Period Filter Inline — V2 Nên Dùng `<TabsFilter>`

V1 render inline period buttons (Tuần/Tháng/Quý). V2 nên wrap bằng `<TabsFilter>` component chuẩn hoặc `<SelectPill>` tùy layout.

---

## Action Items (Trước khi build UI)

| #   | Hành động                                                                                                   | Priority   | File/Location             |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------- | ------------------------- |
| 1   | **Xác minh RPC trên V2 DB** — Check `work_tasks` vs `work_progress`, check status values                    | 🔴 BLOCKER | Supabase Dashboard        |
| 2   | **Tách types** — Move inline types từ actions → `types/productivity.ts` + `types/productivity-constants.ts` | 🟡 High    | `types/`                  |
| 3   | **Thêm SWR cache keys** — `productivity`, `productivityJobDetails`                                          | 🟡 High    | `lib/swr.ts`              |
| 4   | **Fix action return format** — Wrap results in `{ success, data }` or confirm throw pattern phù hợp SWR     | 🟡 High    | `productivity-actions.ts` |
| 5   | **Thêm sidebar nav** — `/productivity` link                                                                 | 🟢 Normal  | `components/layout/`      |

---

## V1→V2 Feature Parity Matrix

| Feature                         | V1  |          V2 Action           | V2 UI | Status    |
| ------------------------------- | :-: | :--------------------------: | :---: | --------- |
| Period filter (W/M/Q)           | ✅  |     ✅ `getDateRange()`      |  ❌   | Cần build |
| Stats summary (4 KPIs)          | ✅  |      ✅ `summary` field      |  ❌   | Cần build |
| Employee table (sortable)       | ✅  |        ✅ data ready         |  ❌   | Cần build |
| Mobile cards                    | ✅  |        ✅ data ready         |  ❌   | Cần build |
| Workload badge + bar            | ✅  |     ✅ `workload_level`      |  ❌   | Cần build |
| Overload alerts banner          | ✅  |    ✅ `overloaded_count`     |  ❌   | Cần build |
| Employee detail modal           | ✅  | ✅ `fetchEmployeeJobDetails` |  ❌   | Cần build |
| Job cards (grouped by contract) | ✅  |      ✅ grouping logic       |  ❌   | Cần build |
| Overdue task section            | ✅  |      ✅ `overdue_tasks`      |  ❌   | Cần build |
| Search filter                   | ✅  |       ✅ (client-side)       |  ❌   | Cần build |
| Loading skeleton                | ✅  |              —               |  ❌   | Cần build |
