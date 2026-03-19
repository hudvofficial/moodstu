# Plan: Accent Card System
Created: 2026-03-18 18:40
Status: 🟡 In Progress

## Overview
Tạo hệ thống `.accent-card` reusable trong design-system.css, thay thế `.couple-card-*` riêng lẻ. Kế thừa pattern `border-left accent` từ V1, earth-tone hóa cho V2.

## Nguyên nhân
- `.couple-card-bride/groom` dùng `rgba(…, 0.4)` quá mờ, không thấy card
- Không có border → card "trôi" vào nền
- Không reusable cho card khác

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `app/design-system.css` | Xóa `.couple-card-*`, thêm `.accent-card` system |
| `components/contracts/form/ContractCustomerSection.tsx` | Đổi class name |

## Task 1: CSS — Tạo accent-card system trong design-system.css

### Xóa:
```css
.couple-card-bride { ... }   /* line 138-143 */
.couple-card-groom { ... }   /* line 144-149 */
```

### Thêm:
```css
/* Accent Card System — reusable card với viền màu bên trái */
.accent-card {
  padding: 20px;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* Variants — chỉ đổi border-left */
.accent-card-rose   { border-left: 3px solid #e88ca0; }
.accent-card-sky    { border-left: 3px solid #7db4d4; }
.accent-card-gold   { border-left: 3px solid var(--color-accent); }
.accent-card-green  { border-left: 3px solid #6dba82; }
.accent-card-orange { border-left: 3px solid var(--color-interactive); }
```

## Task 2: TSX — Update ContractCustomerSection.tsx

### Thay đổi:
```diff
- <div className="couple-card-bride space-y-3">
+ <div className="accent-card accent-card-rose space-y-3">

- <div className="couple-card-groom space-y-3">
+ <div className="accent-card accent-card-sky space-y-3">
```

## Test Criteria
- [ ] Card Cô dâu: solid bg + border + rose left accent
- [ ] Card Chú rể: solid bg + border + sky left accent
- [ ] Card nổi rõ trên nền trắng
- [ ] Build pass
- [ ] Visual verify trên browser
