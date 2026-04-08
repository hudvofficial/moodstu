# Phase 04: Testing & Verification
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 03

## Objective
Kiểm soát chất lượng bằng manual checklist để dồn Module Calendar vào trạng thái V1 Freeze chuẩn nhất.

## Requirements
### Functional
- [ ] 100% vượt qua Code Linter. (Không ANY, không Rule Warning).
- [ ] Matrix RBAC cho Backend phải chứng minh được tính an toàn trên từng Role.

## Implementation Steps
1. [x] **Scoped Lint Verification**: Chạy command Terminal: `npx eslint app/actions/calendar-mutations.ts app/actions/calendar-queries.ts app/actions/calendar-task-actions.ts components/calendar hooks/use-calendar-data.ts hooks/use-calendar-keyboard.ts lib/googleCalendarService.ts types/calendar.types.ts`.
2. [ ] **Manual Google Sync Test:**
   - Mở 1 Google Event có màu mặc định (VD Blueberry).
   - Drawer mở ra, chọn sang màu mới (VD Tomato), bấm Lưu.
   - Chờ hệ thống gọi SWR refresh lại lưới grid. Test xem thẻ hiển thị đúng màu Tomato không.
   - Thử gửi payload ảo `{ summary: "Hacked!" }` thay vì `{ colorId }` qua DevTools/Network xem server có reject bằng Zod không.
3. [ ] **Manual RBAC Assessment**:
   - Sử dụng 1 user Sale hoặc Media -> Tạo 1 event / DragDrop / Edit của ng khác -> Confirm Server quăng `{ success: false, error: ... }` rành mạch do cơ chế owner (từ API + DB).
   - Sử dụng Admin/Manager -> Kéo thả thoải mái mọi data của team (thành công 100%).

## Test Criteria
- Giao diện V1 Calendar thể hiện rõ sự ổn định. Quá trình V1 Audit Freeze hoàn thành!
