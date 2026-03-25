# Audit: Stats Bar — Trước khi extract shared component

## MỤC TIÊU
Audit kĩ 2 stats bar hiện tại để thiết kế shared `components/ui/stats-bar.tsx` chính xác.

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/contracts` → screenshot stats bar contracts
2. Mở browser `/employees` → screenshot stats bar employees
3. So sánh 2 screenshots: ghi ra **giống** vs **khác**
4. Viết plan → trình anh duyệt

---

## BƯỚC 1: Audit `contracts/compact-stats.tsx` (Gold Standard)

### Check desktop layout
- [ ] Layout type: flex inline hay grid?
- [ ] Gap giữa items: `gap-?`
- [ ] Divider giữa items: element gì? class gì?
- [ ] Icon container: size? rounded? bg class?
- [ ] Value: font-size? font-weight? color class?
- [ ] Label: font-size? color class? uppercase?
- [ ] Trend badge: có/không? class?

### Check mobile layout
- [ ] Layout type: flex scroll hay grid?
- [ ] Card min-width? padding? rounded?
- [ ] Label style: uppercase? tracking? size?
- [ ] Value style: class?

### Ghi chú đặc biệt
- [ ] `formatCompact()` — có dùng chung được không?
- [ ] `mobileItems` khác `items` (thêm "nợ") — logic này có general không?
- [ ] Trend display logic — optional hay required?

---

## BƯỚC 2: Audit `employees/employee-stats-bar.tsx`

### Check desktop layout
- [ ] Giống contracts không? Liệt kê sai lệch
- [ ] Divider có chưa?
- [ ] Font size đúng chưa?

### Check mobile layout
- [ ] Giống contracts mobile không?
- [ ] Card style khớp chưa?

---

## BƯỚC 3: Scan các module khác có stats bar không

```
grep -r "StatsBar\|stats-bar\|CompactStats\|stat-card" components/ --include="*.tsx" -l
```

Ghi lại: module nào có, module nào chưa có.

---

## BƯỚC 4: Thiết kế shared interface

Dựa trên audit, đề xuất Props interface:

```ts
interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
  trend?: number;         // optional growth %
}

interface StatsBarProps {
  items: StatItem[];
  mobileItems?: StatItem[];  // nếu mobile cần thêm/bớt items
  className?: string;
}
```

### Câu hỏi cần trả lời:
1. `mobileItems` có cần tách riêng không? Hay mobile = desktop items?
2. `formatCompact()` (format tiền) nên nằm ở đâu? Trong component hay caller tự format?
3. Trend badge — optional prop hay bỏ hẳn cho đơn giản?

---

## OUTPUT
Tạo plan ngắn gồm:
1. Danh sách **giống/khác** giữa 2 stats bar
2. Proposed interface cho shared component
3. Migration plan: contracts + employees refactor thế nào
4. Trình anh duyệt trước khi code
