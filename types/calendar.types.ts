export interface UnifiedCalendarEvent {
  id: string; // id của bản ghi (schedules.id, work_tasks.id, google.id)
  source: "schedule" | "task" | "google";
  sourceId: string; // Trỏ về ID thực gốc db hoặc source system
  title: string;
  start: string; // ISO String (event_date | start_time | google.start)
  end: string | null; // ISO String (end_date | end_time | google.end)
  allDay: boolean; // boolean
  status: string; // Trạng thái db
  employeeId: string | null; // employee_id hoặc assigned_to
  employeeName?: string | null; // Gắn name vào để filter (từ JOIN employees)
  contractId: string | null;
  editable: boolean; // Được sửa hay không (chốt từ RBAC)
  draggable: boolean; // Được kéo hay không (chốt từ nguồn)
  groupKey: string | null; // format: "{contractId}_{ISO_Date}"
  groupLabel: string | null;
  colorToken: string; // Tailwind class
  googleEventId: string | null;
  originalDateField: string; // 'event_date' | 'start_time' | 'deadline'
}

export type CalendarViewMode = "month" | "week" | "day";
