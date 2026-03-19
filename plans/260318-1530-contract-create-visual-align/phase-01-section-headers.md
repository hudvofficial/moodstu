# Phase 01: Section Headers + Gold Accent Bar

**Status:** ⬜ Pending
**Dependencies:** None
**Files:** design-system.css, ContractInfoSection, ContractCustomerSection, ContractItemsSection, ContractFinancialSummary, ContractPaymentSection, index.tsx

---

## Objective

Thêm gold accent bar bên trái mỗi section heading (y như Stitch design)
+ đánh số sections 1→5 cho dễ scan.

## Stitch Reference

```html
<!-- Stitch desktop line 52-57 -->
.section-header { border-l-[4px] border-accent-gold pl-4; }
.section-title { text-[15px] font-semibold text-slate-800; }

<!-- Usage -->
<div class="section-header">
  <h2 class="section-title">1. Hợp đồng & Khách hàng</h2>
</div>
```

## Implementation Steps

### Step 1: Thêm `.section-header-gold` vào design-system.css

```css
/* Section Headers — Gold Accent (Stitch-aligned) */
.section-header-gold {
  display: flex;
  align-items: center;
  padding-left: var(--space-4);
  margin-bottom: var(--space-5);
  border-left: 4px solid var(--color-accent, #C9A96E);
}
```

- [ ] Thêm class `.section-header-gold` vào `app/design-system.css`
- [ ] Verify token `--color-accent` đã exists trong globals.css (= `#C9A96E`)

### Step 2: Update section headings trong form index.tsx

Thay:
```tsx
<h2 className="text-h2">Tạo hợp đồng</h2>
```

Bằng:
```tsx
<h1 className="text-h2">
  {mode === "create" ? "Tạo hợp đồng mới" : "Sửa hợp đồng"}
</h1>
```

### Step 3: Update TỪNG section component

Thay mọi section heading hiện tại:
```tsx
<h3 className="text-label font-semibold text-text-primary">Thông tin hợp đồng</h3>
```

Bằng:
```tsx
<div className="section-header-gold">
  <h3 className="text-body font-semibold text-text-primary">
    1. Thông tin hợp đồng
  </h3>
</div>
```

Files cần sửa:
- [ ] `ContractInfoSection.tsx` → "1. Thông tin hợp đồng"
- [ ] `ContractCustomerSection.tsx` → "2. Khách hàng"  
- [ ] `ContractItemsSection.tsx` → "3. Dịch vụ & Sản phẩm"
- [ ] `ContractFinancialSummary.tsx` → "4. Tổng kết tài chính"
- [ ] `ContractPaymentSection.tsx` → "5. Thanh toán & Cọc"
- [ ] Section "Ghi chú" trong index.tsx → "6. Ghi chú"

## Test Criteria

- [ ] Mỗi section heading có gold bar bên trái (4px, #C9A96E)
- [ ] Numbered 1→6
- [ ] Font size = text-body (16px) font-semibold
- [ ] Spacing: mb-5 (20px) dưới heading
- [ ] Responsive: vẫn hiển thị đúng trên mobile

---
Next Phase: Phase 02 (Customer Couple Cards)
