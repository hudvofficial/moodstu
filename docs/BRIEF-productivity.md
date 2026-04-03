# 💡 BRIEF: Productivity Module V2 (Năng suất nhân sự)

**Ngày tạo:** 2026-04-03  
**Revision:** v3 — Final spec (RBAC enforced, self-view, cost sanitization)  
**Audit:** ✅ Deep audit hoàn tất (16+ files V1/V2, SQL verified trên production DB)  
**Primitives:** ✅ Tất cả đều tồn tại — `StatsBar`, `TabsFilter`, `TableWrapper`, `Drawer`, `Badge`, `EmptyState`

---

## 1. SUMMARY

Build `/productivity` as a **role-aware, read-only dashboard** with server-prefetched data + SWR revalidation.

| Role                | View                                | Cost visible? |
| ------------------- | ----------------------------------- | :-----------: |
| `admin` / `manager` | Full team                           |      ✅       |
| `media`             | Self only                           |      ❌       |
| `viewer` / `ctv`    | **Blocked** (redirect `/dashboard`) |       —       |

---

## 2. NGUỒN DỮ LIỆU (Verified on V2 DB)

### RPC 1: `get_employee_productivity(start, end)`

- Table: `work_tasks` ✅ · Status: snake_case (`chua_lam`, `dang_lam`, `hoan_thanh`, `da_huy`) ✅
- Filter: `employees.status = 'active'` + `deleted_at IS NULL`
- Returns: `employee_id`, `full_name`, `role`, `onsite_hours`, `active_tasks`, `completed_tasks`, `post_production_active`, `overdue_tasks`, `total_cost`

### RPC 2: `get_employee_job_details(employee_id, start, end)`

- JOINs: `contracts` → `contract_code`, `service_type` · `customers` → `client_name` · `contract_events` → `event_date`

### Workload (action layer):

```
ratio = max(weeklyTasks/8, weeklyHours/40)
>0.9 = overloaded | >0.7 = high | >0.4 = medium | else = low
```

---

## 3. PUBLIC INTERFACES

### `types/productivity.ts` (SSOT)

```typescript
ProductivityPeriod     = "week" | "month" | "quarter"
WorkloadLevel          = "low" | "medium" | "high" | "overloaded"
ProductivityViewMode   = "team" | "self"

EmployeeProductivity {
  employee_id, full_name, role
  onsite_hours, active_tasks, completed_tasks, post_production_active
  overdue_tasks
  total_cost: number | null    // null for media (sanitized)
  workload_level: WorkloadLevel
  workload_ratio: number       // NEW: raw ratio for sorting
}

ProductivitySummary {
  total_onsite_hours, total_active_tasks, total_completed_tasks
  overloaded_count, completion_rate
  total_cost: number | null    // null for media
}

ProductivityData {
  employees, summary, period, date_range
  // UI metadata (camelCase):
  viewMode: ProductivityViewMode
  canViewCost: boolean
  currentEmployeeId: string | null
}

EmployeeJobGroup {
  contract_id, contract_code, client_name, service_type, event_date
  tasks: { work_type, status, deadline, cost: number | null }[]
  total_cost: number | null
  completed, active, overdue
}
```

### `types/productivity-constants.ts`

- `PERIOD_LABELS`: `{ week: "Tuần này", month: "Tháng này", quarter: "Quý này" }`
- Workload badge/progress mappings: `low=neutral`, `medium=info`, `high=warning`, `overloaded=error`
- Default sort config

### Cache Keys (`lib/swr.ts`)

```typescript
productivity: (period, viewMode) => `productivity:${period}:${viewMode}`;
productivityJobDetails: (id, start, end) =>
  `productivity:detail:${id}:${start}:${end}`;
```

### Dedicated Hook: `lib/hooks/use-productivity.ts`

### Action Signatures (unchanged):

```typescript
fetchProductivityData(period): Promise<ActionResult<ProductivityData>>
fetchEmployeeJobDetails(employeeId, startDate, endDate): Promise<ActionResult<EmployeeJobGroup[]>>
```

---

## 4. SECURITY MODEL

> [!IMPORTANT]
> **RBAC enforced in ACTIONS, not only UI.**

- `admin/manager` → receive full team data + cost
- `media` → resolved to own `employee_id` first → receives only own row → **no cost fields** (set null) → **no team KPIs** sent
- `viewer/ctv` → action returns `{ success: false, error: "Không có quyền" }`
- Detail requests forcibly scoped: `media` can ONLY fetch own `employee_id`

### Route Layer:

- `page.tsx`: gate with `getAuthenticatedUserContext()`
- `viewer/ctv` → `redirect("/dashboard")`
- Navigation: **untouched** (already in `navigation.ts` L61)

---

## 5. DATE LOGIC

> [!WARNING]
> **`week` = calendar week starting Monday** (NOT rolling 7 days)

- Replace raw `toISOString().split("T")[0]` with timezone-safe local date
- Timezone: `Asia/Ho_Chi_Minh` (studio timezone from `studio_info` or fallback)
- `month` = 1st of current month → today
- `quarter` = 1st of current quarter → today

---

## 6. FLOW LOGIC

### Team View (`admin/manager`):

```
[Route] → [Server prefetch period=month] → [SWR hydrate]
  ↓
[Stats Bar] — 4 KPI: Giờ on-set | Task đang xử lý | Tỷ lệ hoàn thành | Nhân sự quá tải
  ↓
[Overload Banner] — Cảnh báo đỏ → CTA: mở detail employee đầu tiên (NOT link /calendar)
  ↓
[Period Filter] — Tuần này / Tháng này / Quý này → SWR refetch (keepPreviousData)
  ↓
[Search + Sort] — Client-side · Default sort: workload_ratio↓, overdue↓, active↓, name↑
  ↓
[Employee List] — Desktop: TableWrapper sortable | Mobile: Cards
  ↓
[Click Employee] → [Drawer (desktop) / Bottom Sheet (mobile)]
  ├── Mini Stats: Tổng job, On-set, Thu nhập
  ├── Overdue Section (nếu có)
  └── Job Cards: Grouped by contract, sort overdue-first → nearest event_date → code
```

### Self View (`media`):

```
[Route] → [Server prefetch period=month, scoped to own employee_id]
  ↓
[Stats Bar] — 4 KPI: Giờ on-set | Task đang xử lý | Tỷ lệ hoàn thành | Task quá hạn
  ↓
[Personal Overload Warning] — Khi workload = high/overloaded
  ↓
[Period Filter] — Tuần này / Tháng này / Quý này
  ↓
[Inline Detail Content] — Mini Stats + Overdue + Job Cards (trực tiếp, không cần drawer)
  ↓
❌ KHÔNG hiển thị: team banner, other employees, cost
```

---

## 7. COMPONENT STRUCTURE

| File                                                      | Responsibility                         |
| --------------------------------------------------------- | -------------------------------------- |
| `app/(protected)/productivity/page.tsx`                   | Server: gate, prefetch, pass to client |
| `app/(protected)/productivity/loading.tsx`                | Route-level skeleton                   |
| `app/(protected)/productivity/error.tsx`                  | Error boundary                         |
| `components/productivity/productivity-list-page.tsx`      | Client orchestrator (SWR, state)       |
| `components/productivity/productivity-stats-bar.tsx`      | Wraps shared `StatsBar`                |
| `components/productivity/productivity-filters.tsx`        | Period `TabsFilter`                    |
| `components/productivity/productivity-table.tsx`          | Desktop `TableWrapper` (sortable)      |
| `components/productivity/productivity-card.tsx`           | Mobile cards                           |
| `components/productivity/productivity-detail-content.tsx` | **Shared** between drawer + self-view  |
| `components/productivity/productivity-detail-drawer.tsx`  | Wraps Drawer + detail-content          |
| `lib/hooks/use-productivity.ts`                           | SWR hook                               |

---

## 8. UI TOKEN MAPPING

| Element       | Primitive                        | Token                                        |
| ------------- | -------------------------------- | -------------------------------------------- |
| Stats         | `StatsBar` + `StatItem`          | Design system colors                         |
| Period filter | `TabsFilter`                     | variant `pills` (mobile) / `tabs` (desktop)  |
| Table         | `TableWrapper`, `TH`, `TD`, `TR` | `.card-base`                                 |
| Cards         | `.card-base`                     | Border, shadow, rounded                      |
| Badges        | `Badge` variant                  | `neutral`/`info`/`warning`/`error`           |
| Drawer        | `Drawer`                         | Side panel (desktop) / bottom sheet (mobile) |
| Icons         | `lucide-react`                   | ❌ NO material-symbols                       |
| Empty state   | `EmptyState`                     | Standard                                     |

---

## 9. REALTIME / PERF

- Revalidate `productivity(period)` on `work_tasks` and `employees` mutations
- While detail open → also revalidate detail key on `contract_events`, `contracts`, `customers`
- Detail fetch: **lazy** in team view (on click only)
- Server prefetch default `period=month` → SWR `keepPreviousData` for period switches

---

## 10. SCOPE BOUNDARIES

### ✅ IN SCOPE:

- Read-only dashboard (team + self view)
- RBAC enforcement (action + UI)
- All features from V1 (stats, table, cards, detail, overload alert)

### ❌ OUT OF SCOPE:

- No CRUD
- No charts/biểu đồ
- No export Excel
- No navigation/sidebar edits
- No DB migration

---

## 11. TEST PLAN

| Category     | Tests                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| **Access**   | admin/manager see full · media sees self · viewer/ctv blocked · tampered detail calls rejected          |
| **Dates**    | Default month works · week starts Monday local TZ · quarter boundaries correct                          |
| **Team UX**  | Search by name/role · default sort (overloaded first) · header sorts work · mobile + desktop same order |
| **Self UX**  | No team KPI leakage · no cost in payload/DOM · personal overload warning · inline detail                |
| **Detail**   | Overdue section conditional · grouped counts match RPC · drawer + inline share rendering                |
| **States**   | Route skeleton · smooth period switch · empty states · error boundary                                   |
| **Realtime** | Task/employee changes refresh list · contract/customer/event changes refresh detail only                |

---

## 12. ASSUMPTIONS

- V2 RPCs point to `work_tasks` with snake_case status ✅ (SQL verified)
- Studio timezone: `Asia/Ho_Chi_Minh` (fallback)
- `ctv` → `viewer` → blocked
- No DB migration needed

---

## NEXT STEP

```
BRIEF v3 ✅ (file này)
  ↓
/plan → Chia implementation phases
  ↓
/code → Implement
  ↓
/test → Verify
```
