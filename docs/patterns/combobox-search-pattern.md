# Searchable Combobox Pattern (v1.0.0)

## 🎯 Mục tiêu
Thay thế `SelectForm` (Radix UI Select) tiêu chuẩn trong các trường hợp danh sách lựa chọn lớn (>10 items) để tăng tốc độ tìm kiếm và cải thiện trải nghiệm người dùng.

## 🏗️ Kiến trúc
- **Component**: `components/ui/combobox-search.tsx`
- **Logic**: 
  - Sử dụng `input` text để lọc danh sách realtime.
  - Render dropdown qua `createPortal(document.body)` để tránh bị cắt bởi `overflow: hidden` của các container cha (như Modal).
  - Vị trí được tính toán động bằng `getBoundingClientRect()` + `useLayoutEffect`.
  - Hỗ trợ phím tắt: ↑↓ để duyệt, Enter để chọn, Esc để đóng.

## 🎨 Design System (SSOT)
- **Token**: Sử dụng `input-base`, `label-base`, `bg-card`, `border-border`.
- **Z-index**: Mặc định `z-9999` cho portal dropdown.
- **Animations**: Sử dụng `animate-fade-in`.

## 📦 Cách sử dụng
```tsx
import { ComboboxSearch } from "@/components/ui/combobox-search";

<ComboboxSearch
  label="Chọn vật tư"
  options={items.map(i => ({ value: i.id, label: i.name }))}
  onChange={(val) => console.log(val)}
  placeholder="Tìm..."
/>
```

## ⚠️ Lưu ý kỹ thuật
1. **Portal**: Luôn dùng portal cho dropdown nếu nằm trong Modal.
2. **Performance**: Danh sách > 1000 items nên xem xét ảo hóa (virtualization).
3. **Accessibility**: Đã hỗ trợ keyboard navigation cơ bản, cần bổ sung `aria-activedescendant` nếu cần chuẩn A11y cao hơn.
