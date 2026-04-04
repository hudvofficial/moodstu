# Phase 01: Setup Types & Dependencies

Status: ⬜ Pending

## Objective

Cung cấp data structure (Source of Truth) cho Calendar và cài đặt package Drag Drop.

## Requirements

### Functional

- [ ] Định nghĩa `UnifiedCalendarEvent` tại `types/calendar.types.ts` với _đúng_ 17 fields sau không được sai lệch:
  ```typescript
  export interface UnifiedCalendarEvent {
    id: string; // id của bản ghi (schedules.id, work_tasks.id, google.id)
    source: "schedule" | "task" | "contract_event" | "google";
    sourceId: string; // Trỏ về ID thực gốc db hoặc source system
    title: string;
    start: string; // ISO String (event_date | start_time | google.start)
    end: string | null; // ISO String (end_date | end_time | google.end)
    allDay: boolean; // boolean
    status: string; // Trạng thái db
    employeeId: string | null; // employee_id hoặc assigned_to
    contractId: string | null;
    editable: boolean; // Được sửa hay không (chốt từ RBAC)
    draggable: boolean; // Được kéo hay không (chốt từ nguồn)
    groupKey: string | null; // format: "{contractId}_{ISO_Date}"
    groupLabel: string | null;
    colorToken: string; // Tailwind class
    googleEventId: string | null;
    originalDateField: string; // 'event_date' | 'start_time' | 'deadline'
  }
  ```
- [ ] Tạo util function `getEventColor(source, type)` dể trả về class SSOT (`.bg-indigo-100`, v.v... KHÔNG dùng HEX nội tuyến).
- [ ] Cài đặt dependencies Drag & Drop.

## Implementation Steps

1. [ ] Install dnd-kit: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
2. [ ] Khởi tạo `types/calendar.types.ts` chứa `UnifiedCalendarEvent`.
3. [ ] Viết helpers mapping: mapping Role, mapping Color.

## Files to Create/Modify

- `package.json`
- `types/calendar.types.ts`
- `lib/utils/calendar-utils.ts`
