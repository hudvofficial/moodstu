# Phase 01: Tạo CurrencyInput Component
Status: ⬜ Pending
Priority: 🔴 Critical

## Objective
Tạo shared component `CurrencyInput` dùng `type="text"` + auto format tiền VNĐ.

## Component Spec

### File: `components/ui/currency-input.tsx`

```tsx
interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}
```

### Behavior:
1. **Display**: Số được format `5.000.000` (dùng `formatCurrency()`)
2. **Editing**: Khi focus → giữ format, user gõ số → strip dots → parse
3. **onChange**: Trả về number thuần (5000000)
4. **Suffix**: KHÔNG hiện trong component (suffix do caller tự thêm nếu cần)
5. **Input**: `type="text"` + `inputMode="numeric"` (mở bàn phím số trên mobile)

### Logic:
```
User nhập "5000000" 
→ Internal state: "5.000.000" (format on change)
→ onChange callback: 5000000 (number)

User xóa → "" 
→ onChange callback: 0
```

### Edge cases:
- Xóa hết → trả 0
- Input "abc" → bỏ qua, giữ giá trị cũ
- Paste "5.000.000" → parse đúng = 5000000
- Max (cho %) → clamp

## Tasks
- [ ] Tạo `components/ui/currency-input.tsx`
- [ ] Export từ component
- [ ] Test cơ bản: format đúng, onChange trả number đúng

## Files to Create
- `components/ui/currency-input.tsx`
