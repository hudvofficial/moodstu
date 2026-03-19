# 💡 BRIEF: FIX CRM LEAD DETAIL VISIBILITY

**Ngày tạo:** 2026-03-16
**Trạng thái:** Chờ duyệt Plan

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Lead Detail (Panel/Page) không hiển thị khi truy cập trực tiếp bằng ID hoặc khi Lead không nằm trong danh sách `initialLeads` hiện tại (do pagination).
- Lỗi Runtime do import `.ts` trong file `.tsx`.
- Sai lệch cấu trúc dữ liệu trả về từ Server Action `getLeadById` so với kỳ vọng của Client.

## 2. GIẢI PHÁP ĐỀ XUẤT (KẾ THỪA V1)
- **Mô hình Discovery**: Cài đặt logic "Smart Fetch" tại `LeadListClient`. Nếu ID trong URL không khớp với dữ liệu cục bộ, sẽ tự động gọi API lấy dữ liệu từ Server.
- **Normalization**: Đồng bộ hóa `ActionResult` của tất cả CRM actions.
- **Cleanup**: Gỡ bỏ các lỗi cú pháp và tối ưu `z-index`.

## 3. TÍNH NĂNG CHÍNH
- [ ] Tự động Fetch Lead khi vào link trực tiếp.
- [ ] Hiển thị Loading state khi đang lấy dữ liệu.
- [ ] Hiển thị Panel Detail trơn tru trên cả Desktop và Mobile.

## 4. PHÂN CHIA PHASE DỰ KIẾN
- **Phase 01**: Implementation of Smart Fetch Logic & Server Action Update.
- **Phase 02**: Syntax Clean-up & UI Z-index Fix.
- **Phase 03**: Direct Link Navigation & Search Param Sync.

---
➡️ Bước tiếp theo: Chốt Plan và thực hiện.
