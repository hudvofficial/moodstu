# Phase B: Customer Module Fix
**Status:** ⬜ Pending
**Dependencies:** Phase A ✅
**Est.:** 1 hour

---

## Objective
Fix Customer module: server render, inline search, LTV thật, dark mode, pagination.

## V1 Source Files
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\app\(protected)\crm\customers\page.tsx` (33 lines, Server Component)
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\app\(protected)\crm\customers\data.ts`
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\crm\CRMSearch.tsx` (40 lines)
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\customers\CustomersTable.tsx`
- `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\customers\CustomersStats.tsx`

## V2 Target Files
- `app/(protected)/crm/customers/page.tsx`
- `components/crm/customers/CustomerList.tsx`
- `components/crm/customers/CustomerStats.tsx`

---

## Implementation Steps

### B1. Customer page → Server Component
- [ ] Đọc V1 `customers/page.tsx` — nó là `async function` (server)
- [ ] Chuyển V2 `customers/page.tsx` từ `"use client"` → server component
- [ ] Data fetch bằng server action call trực tiếp (không useEffect)
- [ ] Pass data xuống client components (CustomerList, CustomerStats)

### B2. Port inline search bar
- [ ] Port V1 `CRMSearch.tsx` pattern (debounced 300ms + URL params)
- [ ] Tạo search bar inline với "Thêm KH" button (Stitch layout: `[🔍 Search...] [+ Thêm KH]`)
- [ ] Integrate vào CustomerList hoặc page layout
- [ ] **Đổi:** Material Symbols `search` → Lucide `Search` icon

### B3. Fix CustomerStats dark mode
- [ ] `CustomerStats.tsx:41` — `bg-white` → `bg-bg-card` (hoặc `bg-elevated`)
- [ ] Verify icon container: thêm `bg-primary/10 rounded-lg p-2` (Stitch pattern)

### B4. Fix LTV query
- [ ] Trong `getCustomers` action: LEFT JOIN `contracts` table
- [ ] SUM(`contracts.total_amount`) WHERE `customer_id` matches
- [ ] Trả về `ltv` field (number, default 0)
- [ ] CustomerList hiện `formatCurrency(customer.ltv)` thay vì `—`

### B5. Pagination right-align
- [ ] `CustomerList.tsx` pagination: `justify-center` → `justify-end`
- [ ] Verify Stitch reference

### B6. Empty state CTA
- [ ] Khi customer list rỗng: hiện "Thêm khách hàng đầu tiên →" button
- [ ] Port V1 pattern (icon + text + link)

### B7. Verify Customer Detail 360
- [ ] Check V2 `CustomerDetail.tsx` có đủ fields V1 hay không
- [ ] Verify: tên, phone, email, address, tags, notes, created_at, ltv, linked contracts

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `app/(protected)/crm/customers/page.tsx` | **MODIFY** — server component |
| `components/crm/customers/CustomerList.tsx` | **MODIFY** — search, pagination, LTV, empty state |
| `components/crm/customers/CustomerStats.tsx` | **MODIFY** — dark mode fix |
| `app/actions/crm.ts` | **MODIFY** — LTV query join |

## Test Criteria
- [ ] Customer page renders server-side (no `"use client"`)
- [ ] Search bar visible above table, debounced 300ms
- [ ] LTV hiện số tiền thật (hoặc `0đ` nếu chưa có HĐ)
- [ ] Stats cards render đúng trong dark mode
- [ ] Pagination nằm bên phải
- [ ] Empty state có CTA button
- [ ] Build pass: `npm run build`

---
**Next Phase:** → Phase C (Lead Core)
