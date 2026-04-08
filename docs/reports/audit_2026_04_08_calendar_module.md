# Audit Report - Calendar Module

**Ngày Audit:** 08/04/2026
**Phạm vi:** Toàn bộ `app/(protected)/calendar`, `components/calendar/*`, và `app/actions/calendar-*.ts`.
**Mục tiêu:** Đánh giá Business Logic, Security (Bảo mật), Tính đồng bộ Design System (SSOT) và Performance.

---

## 🔴 Blocker Issues (Bắt buộc fix cho V1 Freeze)

### 1. Thiếu Schema Validation (Zod) toàn diện cho Server Actions
- **Tình trạng:** Hiện backend phân tán logic manual check (nếu dùng), rủi ro sập DB 500 do payload rác. Bắt buộc phải check type thông qua Zod để clean payload.
- **Phạm vi xử lý:** Cần phải `import { z } from "zod"` (đã có sẵn trong package.json) và định nghĩa các schema chuẩn:
  - `calendar-mutations.ts`: Validate `updateDragDropDate`, `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`.
  - `calendar-task-actions.ts`: Validate `assignCalendarTask`, `checkEmployeeAvailability`, `updateCalendarTaskDetails`.
  - Trọng tâm Validate: uuid/id non-empty, `source` phải là enum chuẩn, parse được datetime hợp lệ, `title` phải trim space, check các key `employee_id`, `assigned_to`, `status`, `deadline`, `color_id`.
  - Flow Xử Lý: Zod parse/throw inside `withAuth` để tận dụng core catch exception và trả về struct lỗi sạch `{ success: false, error: ... }`.

### 2. Validation `patchGoogleCalendarEvent` (Google 2-way Sync)
- **Tình trạng:** Hàm `patchGoogleCalendarEvent` đang nhận `updates: Record<string, any>` không có validation, dễ bị payload injection làm sập Google API nếu request chứa mảng data rác.
- **Cách xử lý chốt mặc định V1:** 
  - GIỮ LẠI chức năng đổi màu cho Google Event (Live-time sync). Color cập nhật trên Mood sẽ được sync sang Google.
  - Áp dụng Zod schema cho payload API của `patchGoogleCalendarEvent` (`z.object({ colorId: z.string() })`).
  - Dọn dẹp code dư thừa trong Drawer (ví dụ ref của HTML link nếu không dùng tới, tuỳ thuộc xác nhận người dùng).

### 3. Rủi ro lệch Timezone (Local Date Parsing)
- **Tình trạng:** Hàm `formatDatetimeLocal` dùng `toISOString().slice(0,16)` nguy cơ lệch múi giờ Local. Quá trình fallback `new Date().toISOString().split("T")[0]` trong drawer cũng cực kỳ rủi ro ở Asia timezone.
- **Yêu cầu:** Sửa timezone fix bằng cách sử dụng `date-fns format(..., "yyyy-MM-dd'T'HH:mm")` và dùng local date fallback. Không bao giờ sử dụng logic slice hay split.

### 4. Lỗi Dependency Hook ở View Component
- **Tình trạng:** Cảnh báo Scoped lint ở `day-view.tsx` do `allEvents = eventsByDate.get(dateIso) || []` reload constant array mỗi render.
- **Yêu cầu:** Dùng empty array const stable hoặc bọc trong `useMemo` tuyệt đối không được dùng lệnh `eslint-disable`.

### 5. RBAC Missing cho Status Check
- **Tình trạng:** Hàm `checkGoogleCalendarStatus` không có check Auth Role. Cần thêm RBAC để sale/media không xem được status bừa bãi hoặc làm minh bạch log hệ thống.

---

## 🟢 Suggestions (Tạm gác - Defer sau V1)
1. **Skeleton Loading:** Hiện `CalendarSkeleton` khá sơ sài. (Tạm defer).
2. **Prefetching:** Trigger SWR prefetch. (Tạm defer).

---

## Next Steps / Test Plan cho V1 Freeze

1. **Lint Rules:** Chạy lại scoped lint (mục tiêu 100% linter rules pass (Không any, không deps hooks)).
2. **Manual RBAC Test:** 
   - Role Sale/Media KHÔNG THỂ tạo/sửa/kéo thả (drag) sự kiện của employee khác.
   - Admin/Manager thì THAO TÁC ĐƯỢC trơn tru.
3. **Google Test:** Drawer mở ra read-only, không có nút `Lưu thay đổi`.
4. **Timezone Test:** Event tạo giờ nào save giờ đó, không jump giờ sau khi load DB.
