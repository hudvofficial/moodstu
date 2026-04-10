# Phase 02: CustomerDetailDrawer → Gold Standard
Status: ✅ Completed
Dependencies: Phase 01 + SSOT Lookup Table (plan.md)

## Objective
Áp dụng pattern đã hoàn thiện từ Phase 01 sang `customer-detail-drawer.tsx` — **100% dùng SSOT tokens**, zero inline.

## ⚠️ SSOT ENFORCEMENT
> Tham chiếu bảng SSOT Lookup Table trong `plan.md` + copy InfoRow pattern từ Phase 01.

---

## Checklist Thay Đổi

### 1. Drawer Shell
- [ ] `width` → hardcode: `"650px"` (khác gì Phase 01)
- [ ] Giữ `title="Hồ sơ Khách Hàng"` (OK)
- [ ] `titleBadge` → `<Badge variant="neutral">{customer_code}</Badge>` **(SSOT)**
  - ❌ Xoá: inline `<span className="px-2 py-0.5 text-xs font-bold tracking-wider rounded-md bg-bg-muted">` (L151-153)

### 2. Hero Section — Giữ Avatar, Sửa Layout
- [ ] Giữ Avatar circle `size-14 rounded-full bg-primary/10` (OK — đặc trưng Customer)
- [ ] **Tên** → dùng `text-h3` hoặc `form-section-heading` **(SSOT token)**
  - ❌ Xoá: `text-xl font-bold text-text` inline (L149)
- [ ] SĐT + Email tags → giữ nguyên compact pattern (đã OK)

### 3. LTV Stats → Compact (dùng SSOT)
- [ ] **Xoá** gradient khổng lồ: `bg-linear-to-br from-primary/5 to-primary/10 p-5 rounded-2xl` (L174)
- [ ] **Thay** bằng 1-2 InfoRow hoặc `stats-card` **(SSOT token)**
  - ❌ Xoá: `text-3xl font-black bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent` (L179)
  - ✅ Dùng: `text-h3 text-primary` + `<Badge>` variant

### 4. DataRow Card (SSOT: InfoRow helper)
- [ ] **Copy InfoRow helper** từ Phase 01 (hoặc extract thành shared nếu anh muốn)
- [ ] **Gom** tất cả fields vào 1 card `bg-surface border border-border/50 rounded-xl`
- [ ] **Desktop 2-col**: `form-grid-2col` **(SSOT token)**
  - Cặp 1: Ngày cưới + Ngày sinh
  - Cặp 2: Dâu/Rể + Nguồn
- [ ] **Tags** → dùng `<Badge variant="primary">` **(SSOT component)**
  - ❌ Xoá: `<span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary">` inline (L278)
- [ ] **Notes** label → `className="label-base"` **(SSOT token)**

### 5. Contract History → Verify token compliance
- [ ] Status badge → `<Badge variant={getStatusVariant(status)}>` **(SSOT)**
  - ❌ Xoá: inline template `${c.status === 'completed' ? 'bg-success/10 text-success shadow-xs' : ...}` (L305-306)

### 6. Data Fetching → SWR Migration (SSOT)
- [ ] **Chuyển** từ `useEffect + useState + getCustomerById` → **`useSWR`** pattern
  - Cache key: `cacheKeys.customerDetail(customerId)` **(SSOT)**
  - ✅ Xoá: manual `setIsLoading`, `setData`, `setFetchError` state
- [ ] **Nhận prop `initialData`** → `useSWR(key, fetcher, { fallbackData: initialData })`
- [ ] **Mutate** → `globalMutate(cacheKeys.customerDetail(id))` + `globalMutate(cacheKeys.customers())`
  - ❌ Xoá: `router.refresh()` toàn trang

### 7. Loading State → Skeleton (SSOT)
- [ ] ❌ Xoá: 4x `<Skeleton className="...">` tự render (L120-123) — thay bằng pattern giống Phase 01
- [ ] ❌ Xoá: manual spinner redundant (nếu có)

---

## Files to Modify
- `components/crm/customer-detail-drawer.tsx` — Refactor
- `components/crm/customer-list-page.tsx` — Truyền initialData

## SSOT Violation Checklist (POST-WRITE grep)
```bash
grep "bg-linear-to\|text-3xl font-black\|bg-success/10 text-success\|router\.refresh" customer-detail-drawer.tsx
# Kết quả PHẢI = 0 matches
```

## Test Criteria
- [ ] **Mobile 375px**: Drawer full-screen, LTV compact ≤ 60px cao, 1-col DataRow
- [ ] **Desktop 1440px**: Drawer 650px, `form-grid-2col` cặp trường, LTV inline
- [ ] Zero skeleton flash khi mở (SWR fallbackData)
- [ ] Tất cả `<Badge>` dùng component, KHÔNG inline class
- [ ] Label dùng `label-base`, KHÔNG inline
- [ ] Contract history badge dùng `getStatusVariant()`, KHÔNG custom map
- [ ] ESLint: 0 errors, 0 warnings

---
Next Phase: phase-03-care-log-compact.md
