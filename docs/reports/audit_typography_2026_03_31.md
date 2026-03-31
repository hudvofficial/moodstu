# Audit Report - 2026-03-31

## Vấn đề hiện tại: Khủng hoảng cỡ chữ nhỏ (Typography readability crisis)
Trong khi em giúp anh chuẩn hóa chữ Đơn vị tính ("goi" -> "Gói", 10px -> 12px), anh đã có lý khi bảo chữ đó vẫn khá nhỏ và module /services còn nhiều text như thế.
Em đã chạy lệnh quét **Full Audit (Typography & Accessibility Focus)** cho toàn bộ `components/services` và phát hiện ra vấn đề rất nghiêm trọng: Module này đang lạm dụng quá tay các thẻ chữ cực kỳ nhỏ, vi phạm UI/UX tiêu chuẩn và quy ước SSOT của hệ thống.

## Summary
- 🔴 Critical Issues: 17 files đang dùng sai chuẩn Typography.
- 🟡 Warnings: Hơn 39 vị trí text siêu nhỏ (10px, 11px) gây khó đọc trên mobile.
- 🟢 Suggestions: Cần nâng cấp đồng loạt để giải cứu "thị lực" người dùng.

---

## 🔴 Critical Issues (Phải sửa ngay)

### 1. Vi phạm chuỗi SSOT Typography (`text-xs`)
- **Nguy hiểm**: Trong project, size hệ thống được quy định là `text-micro` (10px), `text-tiny` (11px), `text-caption` (12px)... Tuy nhiên, coder đã lạm dụng class `text-xs` (thuộc về thư viện mặc định của Tailwind) cực kỳ nhiều. Việc dùng lạc loài `text-xs` này làm vỡ sự đồng bộ typography SSOT.
- **Tập trung ở**:
  - `service-mobile-list.tsx` (Status badges, Buttons)
  - `service-grid.tsx` (Price badges)
  - `form/ServiceBundleSection.tsx` (Nút thêm dịch vụ lẻ)
  - `form/SaveActionPanels.tsx` (Tiêu đề sticky)
  - `category-manager-modal.tsx` (Ký tự Avatar Mặc định)
  - `builder/QuoteModernView.tsx` (Tên dịch vụ, tổng giá, chú thích)
- **Cách sửa**: Thay thế TẤT CẢ `text-xs` bằng `text-caption` (12px chuẩn SSOT) để bảo vệ tính nhất quán của thiết kế. Hoặc nếu cần to hẳn ra thì dùng `text-body-sm` (14px).

---

## 🟡 Warnings (Nên sửa)

### 2. Cỡ chữ mù mịt ở Tiêu đề & Subtext (`text-micro` 10px)
- **Vấn đề**: Module này dùng quá thói quen chữ 10px - nhỏ xíu đến lòi mắt. 
- **Tập trung ở**:
  - `quote-preview.tsx` & `quote-modal.tsx` (Đoạn chữ "Mood Studio · Báo giá dịch vụ"). Text phụ nhưng 10px là quá nhỏ để đọc được.
  - `builder/RuleManager.tsx` (Các rule logic như Requires, Excludes). Chữ 10px làm quá đỗi bé tẹo cho người builder.
- **Cách sửa**: Nâng tối thiểu lên `text-tiny` (11px) hoặc ưu tiên dùng `text-caption` (12px), kết hợp phối màu `text-text-muted` để giữ độ mờ nhạt làm phụ trợ, nhưng không được phép thu hẹp kích cỡ font.

### 3. Cỡ chữ báo giá & thành phần con (`text-tiny` 11px)
- **Vấn đề**: Ngay cả cái dấu `VNĐ`, hay các Badge báo giá, hoặc gợi ý tính năng đang để 11px. Chỗ này không sai token, nhưng với UI Mobile (375px) chữ 11px vẫn rất "đau mắt" khi xài thực tế.
- **Tập trung ở**:
  - `quote-view.tsx` & `quote-modal.tsx` (Dấu VNĐ, Unit).
  - `builder/SmartSuggestions.tsx` (Gợi ý AI).
  - `builder/QuoteModernView.tsx` (Tiêu đề các hạng mục, ví dụ: 1 Váy Cưới, 2 Váy Tiệc).
- **Cách sửa**: Thay đồng bộ sang tối thiểu `text-caption` (12px) hoặc sử dụng hiệu ứng chữ in hoa `uppercase tracking-wider` nếu bắt buộc dùng `text-tiny`. Nhất là Đơn vị hiển thị và VNĐ (12px là đẹp).

---

## 🟢 Suggestions (Tùy chọn)

1. Tái cấu trúc (Refactor) lại luồng phân cấp: Nhất quán sử dụng **text-caption (12px)** cho mọi footnote, badge con số, chữ "VNĐ".
2. Bỏ sạch `text-xs` đang hardcode khắp nơi để app nhẹ, chạy tốt và tuân thủ tuyệt đối chuẩn SSOT.

---

## Next Steps: Action Plan

Theo chỉ đạo của Workflow The Code Doctor:

📋 Anh muốn làm gì tiếp theo?

1️⃣ Xem báo cáo chi tiết xem sai ở chính xác dòng nào.
2️⃣ **🔧 FIX ALL - Tự động dọn dẹp và nâng cấp Typography cho 17 files (+ 40 dòng) ngay lập tức.** (Mọi chữ quá li ti sẽ biến thành 12px gọn gàng, mọi lỗi `text-xs` sai SSOT sẽ bị diệt trừ).
3️⃣ Bỏ qua, cứ để font lỗi như vậy, /save-brain.

*Gõ số (1-3) để chọn anh nhé:*
