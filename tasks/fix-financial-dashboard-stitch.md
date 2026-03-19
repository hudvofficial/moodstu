# Fix: FinancialDashboard → Đúng Stitch SSOT

**Ngày:** 2026-03-17
**Stitch HTML gốc:** `C:\tmp\stitch_contract_detail.html` line 344-382

---

## Nguồn SSOT (Stitch HTML)

```html
<section class="bg-white rounded-xl shadow-sm border p-6">
  <h3 class="text-lg font-semibold mb-2">Tài chính</h3>
  <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Tổng cộng</p>
  <p class="text-3xl font-bold text-slate-900 mb-6">25.000.000 ₫</p>
  
  <!-- Progress -->
  <span class="text-sm font-medium text-primary">Đã thanh toán: 15.000.000 ₫</span>
  <span class="text-xs text-slate-500">60%</span>
  <div class="h-2 bg-slate-100 rounded-full">
    <div class="bg-primary" style="width: 60%"></div>
  </div>
  
  <!-- Đợt TT -->
  <div>
    check_circle + Đợt 1: Cọc hợp đồng / 15/10/2025 → 5.000.000 ₫
    check_circle + Đợt 2: Ngày chụp ngoại cảnh / 20/11/2025 → 10.000.000 ₫
  </div>
  
  <!-- CTA -->
  <button class="bg-primary text-white rounded-lg font-bold">Thu tiền</button>
</section>
```

---

## Task 1: Thêm design tokens vào design-system.css

**File:** `app/design-system.css`

### Tokens cần thêm:

| Token | Stitch class | Mục đích |
|-------|-------------|----------|
| `.text-overline` | `text-xs uppercase tracking-wider` | Label "TỔNG CỘNG" |
| `.text-amount` | `text-3xl font-bold` | Số tiền lớn |
| `.progress-track` | `h-2 bg-slate-100 rounded-full` | Track progress bar |
| `.progress-fill` | `h-full bg-primary rounded-full` | Fill progress bar |

### CSS cần thêm:

```css
/* Overline label (TỔNG CỘNG, MÃ HĐ, etc.) */
.text-overline {
  font-size: var(--font-size-caption);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

/* Large amount display (25.000.000 ₫) */
.text-amount {
  font-size: clamp(24px, 3.5vw, 30px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
}

/* Progress bar */
.progress-track {
  height: 8px;
  background: var(--color-bg-hover);
  border-radius: 9999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 9999px;
  transition: width 700ms ease-out;
}
```

### Tokens tận dụng (đã có):
- `.text-h3` → header "Tài chính"
- `.text-body-sm` → "Đã thanh toán: X ₫", tên đợt TT
- `.text-caption` → ngày, %
- `.card-base` → card wrapper
- `text-primary` (Tailwind) → màu primary

---

## Task 2: Rewrite FinancialDashboard component

**File:** `components/contracts/detail/financial-dashboard.tsx`

### Thay đổi:

| Hiện tại (SAI) | Stitch (ĐÚNG) |
|----------------|---------------|
| 3 MetricCards (Tổng, Đã thu, Còn nợ) | ❌ Bỏ → `.text-overline` + `.text-amount` |
| "Tiến độ thanh toán" + progress bar riêng | Sửa → "Đã thanh toán: X ₫" + % + `.progress-track` |
| "+ Thu thêm" button có icon Plus | Sửa → "Thu tiền" button không icon |
| Payments inline (đã gộp) | ✅ Giữ — đã đúng |

### Cấu trúc JSX mới:

```
card-base p-6
├── text-h3: "Tài chính"
├── text-overline: "TỔNG CỘNG"
├── text-amount: "45.000.000 ₫"
├── div (flex between)
│   ├── text-body-sm text-primary font-medium: "Đã thanh toán: 20.000.000 ₫"
│   └── text-caption: "44%"
├── progress-track > progress-fill (width: 44%)
├── border-t divider
├── payments.map → check_circle + text + amount
└── button: "Thu tiền" (bg-primary, full-width, font-bold)
```

---

## Checklist

- [ ] Task 1: Thêm `.text-overline`, `.text-amount`, `.progress-track/fill` vào design-system.css
- [ ] Task 2: Rewrite FinancialDashboard dùng tokens, khớp Stitch
- [ ] Verify: Screenshot so sánh với Stitch
