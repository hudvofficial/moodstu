# Phase 03b: CRM UI Polish — Stitch Design Compliance

**Status:** ⬜ Pending
**Dependencies:** Phase 03 ✅ (CRM backend + basic UI done)
**Est.:** 3-4 hours
**SSOT:** Stitch Project `3342062284752503492`
**Audit:** `crm_ui_audit_report.md` (2026-03-16)

---

## 🎯 Objective

Sửa CRM UI cho khớp 100% với Stitch mockup. Backend đã OK, chỉ fix UI.

---

## 🔴 Critical Fixes (Must Do)

### C1. Fix dark mode `bg-white` → `bg-bg-card`
- **File:** `components/crm/customers/CustomerStats.tsx:41`
- **Change:** `bg-white` → `bg-bg-card`
- **Effort:** 2 min

### C2. Thêm Search Bar inline với button
- **File:** `app/(protected)/crm/customers/page.tsx`
- **Stitch:** Search input + "Thêm khách hàng" button cùng hàng, phía trên table
- **Current:** Không có search, button nằm riêng
- **Change:** Thêm toolbar row: `[🔍 Tìm kiếm...] [+ Thêm khách hàng]`
- **Effort:** 15 min

### C3. LTV column — hiện giá trị thật thay vì `—`
- **File:** `components/crm/customers/CustomerList.tsx:98`
- **Current:** Hardcode `—`
- **Change:** Query linked contracts SUM hoặc truyền từ getCustomers
- **Stitch:** `25.000.000đ`
- **Effort:** 30 min (cần update server action + query)

### C4. Check CRM Hub page (`/crm`)
- **File:** `app/(protected)/crm/page.tsx`
- **Stitch:** "CRM Nerve Center" = overview dashboard
- **Decision:** Redirect to `/crm/customers` hoặc build hub page?
- **Effort:** 5 min redirect, 2h nếu build hub

---

## 🟡 Warning Fixes (Should Do)

### W1. Stats Card icon — thêm background circle
- **File:** `components/crm/customers/CustomerStats.tsx:43-44`
- **Current:** Icon raw kế bên label
- **Stitch:** Icon trong `bg-primary/10 rounded-lg p-2`
- **Effort:** 5 min

### W2. Pagination — right-align
- **File:** `components/crm/customers/CustomerList.tsx:158`
- **Change:** `justify-center` → `justify-end`
- **Effort:** 2 min

### W3. Empty state — thêm CTA button
- **File:** `components/crm/customers/CustomerList.tsx:146-154`
- **Change:** Thêm "Thêm khách hàng" button bên dưới text
- **Effort:** 5 min

### W4. Mobile Card — thêm LTV value
- **File:** `components/crm/customers/CustomerList.tsx:107-143`
- **Stitch:** Card có giá trị LTV góc phải
- **Effort:** 10 min (depends on C3)

### W5. Table header — verify sentence case
- **Check:** `table-header` class trong CSS
- **Stitch:** Sentence case (không uppercase)
- **Effort:** 5 min verify + fix

### W6. Lead List page — audit against Stitch
- **Stitch screens:**
  - Desktop: `559cb5e58f554229bc7a383f013ab3b6` (Kanban)
  - Mobile: `3c78b9a22120486987e1fd7966ea55da` (Lead List)
- **Action:** Pull HTML, compare, list gaps
- **Effort:** 30 min

---

## 🟢 Suggestions (Optional)

### S1. Avatar ring shadow
- Add `ring-1 ring-primary/20` to avatar circles

### S2. Tag badge color mapping
- Map tag name → color (VIP=gold, Wedding=primary)

### S3. Table row hover accent
- Add left border accent on hover

### S4. Mobile FAB shadow
- Verify CrmFab matches Stitch shadow

---

## 📋 Implementation Order

| # | Task | File(s) | Time |
|---|------|---------|------|
| 1 | C1: Fix bg-white | CustomerStats.tsx | 2m |
| 2 | W1: Stats icon bg | CustomerStats.tsx | 5m |
| 3 | W2: Pagination right | CustomerList.tsx | 2m |
| 4 | W3: Empty state CTA | CustomerList.tsx | 5m |
| 5 | C2: Search bar inline | customers/page.tsx + CustomerList.tsx | 15m |
| 6 | C3: LTV column real data | crm.ts + CustomerList.tsx | 30m |
| 7 | W4: Mobile LTV | CustomerList.tsx | 10m |
| 8 | W5: Table header case | globals.css | 5m |
| 9 | C4: CRM hub decision | crm/page.tsx | 5m-2h |
| 10 | W6: Lead list audit | leads/*.tsx | 30m |

**Total estimate:** ~2-3 hours (excl. CRM Hub build)

---

## ✅ Test Criteria

- [ ] Dark mode: stats cards không còn `bg-white`
- [ ] Search bar visible trên desktop above table
- [ ] LTV hiện số tiền thật (hoặc `0đ` nếu chưa có HĐ)
- [ ] Pagination nằm bên phải
- [ ] Empty state có button CTA
- [ ] Mobile card có LTV value
- [ ] Table headers sentence case
- [ ] Lead list matches Stitch layout

---
**Next:** `/code phase-03b` để implement
