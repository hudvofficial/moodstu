# 💡 BRIEF: Tối Tưu Hóa Services Detail V2 (Standardization & Cross-Platform UX)

**Ngày cập nhật:** 2026-03-31
**Phạm vi:** `/services/[ID]` & toàn bộ `components/services/form/*`

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT (THE PROBLEM)
Hệ thống Form chi tiết Dịch vụ hiện tại đang vi phạm nghiệm trọng các thiết kế Kiến trúc (Architecture) và Tiêu chuẩn Thiết kế (Design Guidelines) của hệ thống Mood Studio, dẫn đến:
1. **Rác DOM & Rủi Ro Re-render:** Tái lặp 3 bộ Nút Lưu (Save) cho các màn hình khác nhau, code HTML & Tailwind quá nhiều, thiếu tách bạch.
2. **Kém Thân Thiện Trên Mobile (UX Flaws):** Người dùng điện thoại không thể xem được phần "Bản xem trước Báo Giá" (`<QuotePreview>`), và thanh Sticky Button dưới cùng đè lên vùng Safe-Area của hệ điều hành.
3. **Mất Đồng Bộ Giao Diện:** Viết cứng Input, search box, các thẻ `<button>` thủ công mà không tái sử dụng thư viện UI Components chung của toàn hệ thống (Thiếu tính `compernance share`).
4. **Lỗi Tiềm Ẩn State Array:** Xử lý thêm bớt dịch vụ gói (Bundle) dựa trên Array Index thay vì ID, vi phạm nguyên tắc State Management rủi ro cao.

## 2. GIẢI PHÁP ĐỀ XUẤT (THE SOLUTION)
Đại tu lại toàn bộ khu vực chỉnh sửa/thêm mới dịch vụ, tuân thủ **Khung Kiến Trúc Chuẩn Vàng (Gold Standard):**

- **Quy hoạch Layout chuẩn:** Bao trùm bằng `<FullpageFormShell>` để tự chia lưới `8/4` thông minh mà không cần code Tailwind.
- **Hợp nhất Nút Bấm (Dry Components):** Đưa Nút Action thành Component duy nhất, tự động thả vào Right-Sidebar nếu là PC, hoặc thành Sticky Safe-Area ở Mobile.
- **Phục hồi Tính Năng Mobile:** Mang màn `<QuotePreview>` về lại với Mobile thông qua thiết kế Cuộn ngang/Accordion phía trên khối xác nhận Tùy chọn (để KH chốt tổng tiền trước khi Save).
- **Phẫu Thuật State:** Bóc tách mọi Logic API thành các Custom Hook riêng (VD: `useServiceSearch`), và đổi hệ thống xoá Bundle Items sang chuẩn dùng Stable Keys (`item.id`).

## 3. TIÊU CHUẨN KỸ THUẬT (TECHNICAL STANDARDS)
### 🚀 MVP (Bắt buộc đáp ứng):
- [ ] Tuân thủ tuyệt đối chuẩn Bo Góc (Radius Heirarchy: `rounded-soft-2xl` cho vỏ Form, `rounded-lg` cho nội tại List).
- [ ] Gỡ sạch mọi nút HTML thường, thay 100% bằng shared `<Button>`.
- [ ] Xoá sạch thẻ `<div className="lg:hidden ...">` đang kẹp Duplicate nút Save.
- [ ] Chèn Code chặn `e.stopPropagation()` ở Modal Submit Form để triệt tiêu Event Bubbling.
- [ ] Cắt (`Cap`) logic số lượng (Quantity) gắt gao ngay trong onChange: `Math.max(1, value)`. 

### 🎁 Phase 2 (Nên có thêm):
- [ ] Hiển thị Component Tóm tắt nhanh trên Mobile cho Nút Save (tổng tiền chốt).
- [ ] Tối ưu hóa API Call cho khung Search Dịch vụ (Toast thay vì console.error).

## 4. CHIẾN LƯỢC ĐA NỀN TẢNG (CROSS-PLATFORM STRATEGY)
- **Desktop (1440px+):** Đổ Layout trải rộng bề ngang, tận dụng phần đất trống bên phải (1/3 màn hình) làm Sticky Panel báo cáo tức thì (Real-time Preview).
- **Mobile iOS/Android (375px):** Đổ mọi Widget thành cấu trúc Thác nước (Vertical Stack). Ghim cụm Nút xử lý chính xuống cạnh đáy màn hình có chừa ranh giới hệ điều hành (`pb-safe`).

## 5. BƯỚC TIẾP THEO
→ Review bản **Implementation Plan** và bắt đầu quá trình `/code` để tuốt lại toàn bộ 6 file liên đới.
