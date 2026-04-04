# Phase 06: Actions UI & Sync Policies

Status: ⬜ Pending

## Objective

Giao diện Create / Update và hoàn thiện liên kết Google Calendar theo chuẩn MVP.

## Requirements

### Functional

- [ ] Mở `<EventFormDrawer>` dùng chung cho Tạo & Sửa nội bộ `schedules`.
- [ ] Google Sync Checkbox UI (chỉ khả dụng nếu cấu hình Google connected).
- [ ] Form Validation: Cấm đổi ngày DatePicker nếu event.editable == false.

### Non-Functional

- [ ] Google Sync Policy (STRICT):
  - Async Catcher: Bất kỳ call nào tới `lib/googleCalendarService.ts` phải được bọc trong block `try-catch`.
  - Fail Policy: Nếu throw error bên API Google thì kệ (chỉ log error, hiển thị Toast cảnh báo nhẹ UI), BẮT BUỘC vẫn thực hiện persist data xuống Database Local bằng xong.
  - Delete Policy: Hàm xoá local `schedules` TỰ KÍCH HOẠT hàm xóa Google Event ID tương ứng.

## Implementation Steps

1. [ ] Viết giao diện Form `event-form-drawer.tsx` sử dụng SSOT `SelectForm`.
2. [ ] Wrap Server actions với Catch Google Sync block.
3. [ ] Hoàn thiện toàn bộ luồng tạo, xoá sự kiện và refresh SWR.

## Files to Create/Modify

- `components/calendar/drawers/event-form-drawer.tsx`
- Giữa Frontend (Mutate) và Backend (Action Sync).

---

All Phases Defined.
