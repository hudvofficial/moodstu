# Plan: Calendar V1 Freeze & Hardening
Created: 26-04-08 19:50
Status: 🟡 In Progress (Phase 04 manual test chưa chạy)
Build: Pass (exit code 0) — `npm run build` chạy lúc 20:57 sau code changes, trước commit `5232a2d` (20:59)
Commit: `5232a2d` — `feat(calendar): Calendar V1 Freeze & Mobile UX/UI Remediation`

## Overview
Đóng băng module Calendar cho phiên bản V1. Áp dụng các thay đổi bắt buộc để đảm bảo an toàn dữ liệu (Zod Validation), giữ vững luồng đồng bộ màu 2 chiều (2-way sync) cho Google external events, sửa lỗi lệch Timezone và dọn dẹp các cảnh báo Lint từ React.

## Tech Stack
- Frontend: Next.js + TailwindCSS + date-fns
- Backend: Supabase Server Actions
- Utilities: Zod (Schema Validation)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | [Security Validation & RBAC](phase-01-security-rbac.md) | ✅ Complete | 100% |
| 02 | [Hardened Google 2-Way Sync](phase-02-google-two-way-sync.md) | ✅ Complete | 100% |
| 03 | [Timezone & Linting](phase-03-timezone-lint.md) | ✅ Complete | 100% |
| 04 | [Testing & Verification](phase-04-testing.md) | 🟡 In Progress | 33% |

## Review Evidence

### Phase 01 — Security & RBAC

**File: `app/actions/calendar-task-actions.ts`** — `assignCalendarTask` (line 17-69)

| Check | Status | Evidence (line) |
|-------|--------|----------------|
| Zod validation trước khi xử lý | ✅ | L22-25: `z.object({ taskId, assignToEmployeeId }).parse()` |
| Fetch employee role từ auth_user_id | ✅ | L27-31: `supabase.from("employees").select("id, role").eq("auth_user_id", userId)` |
| ROLE_PERMISSIONS check | ✅ | L36-38: reject nếu role không có quyền `calendar` |
| Fetch oldTask trước khi update | ✅ | L42-46: `select("assigned_to").eq("id", parsed.taskId).single()` |
| Non-admin không thể steal task người khác | ✅ | L52-54: `oldTask.assigned_to !== null && !== employee.id` → reject |
| Non-admin không thể giao cho người khác | ✅ | L55-57: `assignToEmployeeId !== employee.id` → reject |
| Update dùng validated values | ✅ | L62-63: `parsed.assignToEmployeeId`, `parsed.taskId` |

**File: `app/actions/calendar-task-actions.ts`** — `updateCalendarTaskDetails` (line 136-225)

| Check | Status | Evidence (line) |
|-------|--------|----------------|
| Zod validation | ✅ | L145-150: validate taskId + updates object |
| Fetch oldTask ownership check | ✅ | L168-174: `select("assigned_to, contract_id, work_type, status")` |
| Non-admin cannot edit other's task | ✅ | L176-178: `oldTask.assigned_to !== employee.id` → reject |
| Non-admin cannot reassign | ✅ | L184-186: `assigned_to` field change blocked for non-admin |

**File: `app/actions/calendar-mutations.ts`** — All mutation functions

| Function | Zod Validation | Evidence |
|----------|---------------|----------|
| createCalendarEvent | ✅ | L149: `calendarScheduleSchema.parse()` — validates title, event_date, end_date, employee_id, color_id, sync_to_google |
| updateCalendarEvent | ✅ | L212: `calendarScheduleSchema.parse()` — same schema as create |
| deleteCalendarEvent | ✅ | L302: `z.string().trim().min(1).parse(eventId)` — validates eventId only |
| updateDragDropDate | ✅ | L29-34: `z.object({ eventId, source, newDateIso, oldDateIso }).parse()` — validates eventId, source (enum), newDateIso, oldDateIso |
| patchGoogleCalendarEvent | ✅ | L366-373: `z.object({ colorId: z.enum(...) }).strict().parse()` — whitelist colorId "1".."11", rejects unknown keys |

> **Note:** `calendarScheduleSchema` (L134-145) không có field `source` và không dùng `.strict()`. Schema chỉ validate: `title` (min 1), `event_date` (ISO date), `end_date` (nullable ISO date), `employee_id` (min 1), `color_id` (optional string), `sync_to_google` (optional boolean). ID fields dùng `z.string().trim().min(1)`, bắt empty/space nhưng không bắt invalid UUID format.

### Phase 02 — Google 2-Way Color Sync

| Check | Status | Evidence |
|-------|--------|----------|
| patchGoogleCalendarEvent uses `.strict()` | ✅ | L370: Zod schema rejects unknown keys like `{ summary }` |
| colorId whitelisted "1".."11" only | ✅ | L367-369: `z.enum(["1","2",...,"11"])` |
| originalGoogleEvent data contract | ✅ | `{ id, htmlLink, colorId }` in calendar-queries.ts |
| Type updated in calendar.types.ts | ✅ | `colorId?: string` added to originalGoogleEvent |
| EventFormDrawer color init | ✅ | L88-93: `colorId` → fallback match from `colorToken` → fallback `"9"` |

### Phase 03 — Timezone & Linting

| Check | Status | Evidence |
|-------|--------|----------|
| date-fns replaces `.toISOString().split()` | ✅ | `format(date, "yyyy-MM-dd'T'HH:mm")` in event-form-drawer.tsx |
| DayView lint warning fixed | ✅ | `EMPTY_EVENTS` constant outside component, no eslint-disable |
| Scoped ESLint pass | ✅ | 0 warnings, 0 errors |
| TypeScript `tsc --noEmit` pass | ✅ | Clean |
| `npm run build` pass | ✅ | Exit code 0 (ran at 20:57 after code changes, before commit `5232a2d` at 20:59) |

### Phase 04 — Testing & Verification

| Check | Status | Evidence |
|-------|--------|----------|
| Scoped Lint Verification | ✅ | 0 warnings, 0 errors |
| Manual Google Sync Test | ⬜ Pending | Chưa chạy - cần user test trên browser |
| Manual RBAC Assessment | ⬜ Pending | Chưa chạy - cần user test với nhiều role |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
