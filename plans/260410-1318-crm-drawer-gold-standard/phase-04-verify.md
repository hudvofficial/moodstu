# Phase 04: Verify & Lint — Mobile + Desktop
Status: ✅ Completed
Dependencies: Phase 01, 02, 03

## Objective
Xác nhận toàn bộ thay đổi hoạt động đúng trên CẢ mobile (375px) VÀ desktop (1440px).

## Checklist

### 1. ESLint
- [ ] `npx eslint components/crm/lead-detail-drawer.tsx` → 0 errors
- [ ] `npx eslint components/crm/customer-detail-drawer.tsx` → 0 errors
- [ ] `npx eslint components/crm/lead-care-log.tsx` → 0 errors
- [ ] `npx eslint components/crm/lead-list-page.tsx` → 0 errors
- [ ] `npx eslint components/crm/customer-list-page.tsx` → 0 errors

### 2. Browser Check — MOBILE 375px (V-GATE)
- [ ] Mở `/crm/leads` → bấm 1 card → Drawer full-screen, mở tức thì
- [ ] DataRow 1 cột, scroll mượt
- [ ] Footer sticky cố định dưới đáy
- [ ] CareLog compact (≤ 60px khi chưa focus)
- [ ] Mở `/crm/customers` → bấm 1 card → tương tự

### 3. Browser Check — DESKTOP 1440px (V-GATE)
- [ ] Mở `/crm/leads` → bấm 1 row table → Drawer 650px bên phải
- [ ] Hero header hiện Tên + SĐT + Email
- [ ] InfoRow 2-col cho cặp trường ngắn
- [ ] Footer: [Huỷ] trái, [Đóng]+[Chốt] cụm phải
- [ ] Mở `/crm/customers` → tương tự, LTV compact inline

### 4. Cross-check Gold Standard
- [ ] Screenshot CRM drawer (mobile) vs Printing drawer (mobile) → cùng tone
- [ ] Screenshot CRM drawer (desktop) vs Printing drawer (desktop) → cùng tone
