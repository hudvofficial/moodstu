# Phase 01: UI Reordering
Status: ✅ Complete

## 🚦 V-GATE & SSOT PRE-CHECK (MANDATORY)
*Xác nhận đã thực hiện đầy đủ các bước trong `tasks/gates/before-edit.md` trước khi sửa file:*

- [x] **1. 👁️ SEE IT FIRST:** Chụp UI hiện tại của `/crm/leads` và tiến hành so sánh.
- [x] **2. 🎯 COMPARE WITH DESIGN:** Xác định được Desktop & Mobile đang bị sai lệch thứ tự xếp gạch so với hệ thống V1.
- [x] **3. 🔍 SSOT AUTO-SCAN:** Do chỉ đổi chỗ component React, không thêm thẻ DOM HTML/CSS nào mới, nên không phát sinh `.class` hay custom tokens mới (không cần token request).
- [x] **4. 📋 PLAN BEFORE FIX:** Plan đã viết (chính là file này).
- [x] **5. 🧠 READ LESSONS:** Đã nắm được các lỗi tránh dùng timeout hay layout shift đã xử lý ở task trước.
- [x] **6, 7, 8, 9, 10, 11 (Other Constraints):** Không đụng chạm Database, không inline CSS, không tạo Modal hay Token mới ở Phase này.

---

## Objective
Thay đổi thứ tự hiển thị của các widgets sidebar trong CRM Dashboard để trùng khớp với trải nghiệm người dùng của V1.

## Requirements
### Functional
- [x] Kéo `WidgetSourceDonut` (Biểu đồ Nguồn khách) lên vị trí đầu tiên.
- [x] Cố định `WidgetCTA` (Kịch bản Sales) ở vị trí thứ hai.
- [x] Đẩy `WidgetUpcoming` (Lịch sắp tới) xuống vị trí cuối cùng dưới dạng danh sách việc cần check.

## Implementation Steps
1. [x] **Thực hiện V-GATE Screenshot**: Mở browser (Web & Mobile mode), xem `/crm/leads` và chụp screenshot trước khi sửa code.
2. [x] Mở file `components/crm/lead-list-page.tsx`.
3. [x] Tìm biến `widgetsContent`.
4. [x] Đổi thứ tự khai báo components bên trong biến đó sang đúng thứ tự `Donut` -> `CTA` -> `Upcoming`.

## Files to Modify
- `components/crm/lead-list-page.tsx`

## Test Criteria
- [ ] Desktop Layout render chính xác theo thứ tự trên trình duyệt.
---
Next Phase: phase-02-verify.md
