# Calendar V2 Grid Uniformity & Architecture Fix

## Status: 🟡 Pending Approval

### Core Objective
Sửa triệt để lỗi độ cao các row trong Calendar Grid không đều nhau do Flex_Chain rò rỉ (intrinsic max-content evaluation), áp dụng kiến trúc "App View" nhằm đảm bảo Grid chỉ lấy % viewport tuyệt đối mà không có side-effect lên toàn hệ thống.

---

## 📋 Implementation Checklist

### Phase 1: Hệ thống Orchestration (AppShell)
- [x] Mở file `components/layout/app-shell.tsx`
- [x] Thêm mảng Regex `APP_VIEW_PATTERNS` cho route `/^\/calendar$/`
- [x] Bổ sung biến kiểm tra `isAppView`
- [x] Tại thẻ `<main>`, cập nhật className: thêm `flex flex-col min-h-0`, đổi sang `overflow-hidden` nếu là App View (ngược lại giữ nguyên `overflow-y-auto`).

### Phase 2: Page Route (CalendarPage)
- [x] Mở file `app/(protected)/calendar/page.tsx`
- [x] Truyền thuộc tính tiếp nối chuỗi Flex: đổi `w-full h-full` thành `flex-1 min-h-0 flex flex-col`.

### Phase 3: Bounding & Scoping (CalendarWrapper)
- [x] Mở file `components/calendar/calendar-wrapper.tsx`
- [x] Tại thẻ cha ngoài cùng của desktop view, xoá `overflow-auto` -> thay bằng `overflow-hidden flex-col min-h-0`.
- [x] Tại thẻ bọc desktop view (`hidden lg:flex...`), xoá `min-h-[600px]`, đảm bảo truyền xuống `min-h-0 flex-1`.
- [x] Tại thẻ bọc mobile view (`flex lg:hidden...`), xoá `min-h-[400px]`, thay bằng `min-h-0 flex-1 overflow-y-auto` (Mobile được phép scroll List, nhưng desktop bị cấm tuyệt đối).

### Phase 4: Validation (Local Testing)
- [x] Compile không lỗi ESLint.
- [x] Xác minh Desktop Month Grid: Các ô trong 1 cột đều chằn chặn 100% (cả 4/5/6 tuần). (Đã verified bằng Subagent với Absolute Inset Pattern).
- [x] Áp dụng Absolute Bounding Pattern (`absolute inset-0`) cho lưới Grid để ngắt Flexbox min-content.
- [x] **Giải quyết vắn tắt:** Cập nhật Tailwind config class thành `auto-rows-fr` (`grid-auto-rows: minmax(0, 1fr)`) trong MonthGrid, khắc phục lỗi Hydration Mismatch do Next.js hot-reload cache lỗi, xoá sạch `.next`. Khẳng định Equal Heights bằng toán học tuyệt đối.
- [x] Kiểm tra "+ N more" popover hoặc event clipping (có scroll đè ra ngoài lưới không).
- [x] Chuyển qua Route khác (Ví dụ `/contracts`) xem cuộn trang có bình thường không.

---

**REVIEW:** _Đợi lệnh `[Go]` từ Product Owner để bắt đầu execution._
