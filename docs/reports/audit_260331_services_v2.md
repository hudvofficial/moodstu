# Audit Report: `/services/[id]` SSOT Compliance - 31/03/2026

## Summary
- 🔴 Critical Issues: 3 (Vi phạm Component Sharing & Tokens)
- 🟡 Warnings: 2 (Vi phạm Hardcoded Shadow & Padding)
- 🟢 Suggestions: 1 

## 🔴 Critical Issues (Phải sửa ngay - Tránh phá vỡ Component SSOT)

1. **[ServiceContentEditor.tsx] - Dùng `input`/`button` Native thay vì UI Components**
   - File: `components/services/form/ServiceContentEditor.tsx`
   - Triệu chứng: Dòng 134, 141, 156, 174, 187 đang dùng thẻ `<input>`, `<button>` "chay" với hàng tá CSS inline (ví dụ: `p-1.5 hover:bg-danger/10 text-text-muted opacity-0 group-hover:opacity-100...`).
   - Nguy hiểm: Khi đổi biến UI, hoặc đổi style base của `<Input>`/`<Button>` trong Design System, Content Editor này sẽ MẤT ĐỒNG BỘ hoàn toàn với các form khác! Làm App bị rác UI.
   - Cách sửa: Migrated toàn bộ sang `<Button variant="ghost" size="sm">` và dùng CSS Class chuẩn `input-base`.

2. **[SaveActionPanels.tsx] - Dùng `button` Native và Hardcode Inline Drop-Shadow Layer**
   - File: `components/services/form/SaveActionPanels.tsx`
   - Triệu chứng: Dòng 86 (`shadow-[0_-8px_30px_rgba...]`) và thẻ `<button>` Dòng 90 với outline drop-shadow hardcode cực dài (`shadow-[0_-4px_12px_rgba...]`).
   - Nguy hiểm: Tuỳ biến bóng đổ Tailwind (Arbitrary values) làm bành trướng cục bộ. Bóng đổ sẽ không theo theme/dark mode hay SSOT UI của dự án.
   - Cách sửa: Move những shadow này vào Design Token hoặc chuẩn hoá Button.

3. **[ServiceBundleSection.tsx] - Inline Layout Utilities (shadow-xl)**
   - File: `components/services/form/ServiceBundleSection.tsx`
   - Triệu chứng: Dòng 131 Modal dropdown search đang sử dụng `shadow-xl`. 
   - Nguy hiểm: Bị lệch nhẹ về phong cách với ComboboxSearchDropdown đã được chuẩn hoá ở các module khác (Contracts/Employees) nơi bóng đổ được tuỳ biến ở biến `combobox-dropdown`.
   - Cách sửa: Thay vì inline classes cho Dropdown Panel, gán CSS block chuẩn SSOT v2.

## 🟡 Warnings (Nên sửa để Code Clean hơn)

1. **[ServiceBundleSection.tsx] - Breakpoint Hell logic**
   - Triệu chứng: Dòng 112 `<div className="p-0 lg:p-4 lg:border lg:rounded-soft-md shadow-none lg:shadow-inner -mx-4 lg:mx-0...">` đang trộn quá nhiều Tailwind breakpoint vào inline, rất khó đọc.
   - Cách sửa: Layout responsive này hoạt động đúng, nhưng nên trừu tượng hoá vào thẻ con của `components.css`.

## Next Steps

1️⃣ Xem báo cáo chi tiết trước
2️⃣ Sửa lỗi Critical ngay (dùng /code)
3️⃣ Dọn dẹp code smell (dùng /refactor)
4️⃣ Bỏ qua, lưu báo cáo vào /save-brain
5️⃣ 🔧 FIX ALL - Bác sĩ khuyên chọn 5 để tự động phẫu thuật sửa TẤT CẢ các lỗi vi phạm SSOT này về chuẩn Vàng. Mời anh chọn!
