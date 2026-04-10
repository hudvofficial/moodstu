# Phase 01: LeadDetailDrawer → Gold Standard
Status: ⬜ Pending
Dependencies: Audit Brief + SSOT Lookup Table (plan.md)

## Objective
Tái cấu trúc `lead-detail-drawer.tsx` đạt parity 1:1 với `printing-detail-drawer.tsx` — **100% dùng SSOT tokens**, zero inline.

## ⚠️ SSOT ENFORCEMENT (Bắt buộc đọc trước khi code)
> Tham chiếu bảng SSOT Lookup Table trong `plan.md`. Mỗi element PHẢI tra bảng trước khi viết class.

---

## Checklist Thay Đổi

### 1. Drawer Shell (Printing L303-L321)
- [ ] `width` → `"650px"` (hiện tại: `"max-w-md w-full"`)
- [ ] `title` → `lead.contact_name` (hiện tại: `"Chi tiết Lead"`)
- [ ] `titleBadge` → `<Badge variant={getStatusVariant(lead.status)}>` **(SSOT: dùng `Badge` + `getStatusVariant`)**
  - ❌ Xoá: `STATUS_BADGE_COLORS` custom map, `<span className="px-2.5 py-1 rounded-full ...">` inline

### 2. Hero Section (Printing L337-L348)
- [ ] Thêm hero block: `className="p-4 bg-bg-hover rounded-xl mb-4 shadow-sm flex items-center justify-between"`
  - Bên trái: `text-xs text-text-muted uppercase tracking-wider` (label) + `text-h3` (tên lead) — **SSOT: `form-section-heading` không cần vì đây là hero, nhưng `text-h3` = SSOT TW token**
  - Bên phải: SĐT + Email compact
  - ⚠️ Class hero section **lấy nguyên từ Printing L338**, KHÔNG viết riêng

### 3. Loading State → Skeleton (SSOT)
- [ ] **Thay** inline animate-pulse divs → `<Skeleton>` component
  - ❌ Xoá: `<div className="h-6 w-2/3 bg-bg-muted/40 rounded" />` (L168)
  - ✅ Dùng: `<Skeleton className="h-6 w-2/3" />` (shared component)

### 4. DataRow Card (SSOT: InfoRow helper)
- [ ] **Giữ nguyên** card wrapper: `bg-surface border border-border/50 rounded-xl overflow-hidden shadow-xs` (đã OK)
- [ ] **Tạo InfoRow helper** inline function (tránh lặp 10 lần class):
  ```tsx
  const InfoRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-center justify-between p-3.5 border-b border-border/50">
      <div className="flex items-center gap-2.5 text-text-muted shrink-0">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      {children}
    </div>
  );
  ```
- [ ] **Desktop 2-col**: Wrap cặp trường ngắn trong `<div className="form-grid-2col">` **(SSOT token)**
  - Cặp 1: Phone + Email
  - Cặp 2: Potential + Score
  - Cặp 3: Deal Value + Next Contact
  - Mobile tự stack 1 cột nhờ `form-grid-2col` responsive
- [ ] **Badge values** (Potential, Score) → dùng `<Badge>` **(SSOT component)**
  - ❌ Xoá: `<span className="px-2.5 py-0.5 text-xs font-bold rounded-md ${POTENTIAL_BADGE_COLORS[...]}">`
  - ✅ Dùng: `<Badge variant="error" solid>Hot</Badge>`

### 5. Notes → InfoRow hoặc card riêng gọn
- [ ] **Label** → `className="label-base"` **(SSOT token)**
  - ❌ Xoá: `className="text-xs font-semibold text-text-muted uppercase"` inline (L314)

### 6. Status Dropdown → Compact trong card
- [ ] **Bỏ** khung `bg-bg-muted/30 p-3 rounded-lg shadow-xs` bự (L324)
- [ ] **Chuyển** SelectForm vào **1 InfoRow** trong card chung
  - Label: "Giai đoạn" | Value: `<SelectForm>` compact

### 7. Sticky Footer (Printing L504)
- [ ] **Giữ nguyên class** footer (đã gần đúng L346)
- [ ] **Fix layout**: Printing dùng `flex-wrap items-center justify-between`
  - ❌ Hiện tại: `flex-col gap-3` (stack dọc) — sai pattern
  - ✅ Desktop: `[Huỷ Lead]` trái, `[Đóng] + [Chốt]` cụm phải (`ml-auto`)
- [ ] **Nút Huỷ** → dùng `variant="danger"` **(SSOT: Button)**
  - ❌ Xoá: `className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"` inline (L368)
- [ ] **Label huỷ** → `className="label-base text-error"` **(SSOT token + semantic color)**
  - ❌ Xoá: `className="text-sm font-medium text-red-600"` inline (L349)

### 8. SWR Performance (SSOT: lib/swr.ts)
- [ ] **Nhận prop `initialData?: CrmLead`** từ LeadListPage
- [ ] **SWR fallbackData**: `useSWR(key, fetcher, { fallbackData: initialData })` — zero-loading
- [ ] **Cache keys** đã đúng: `cacheKeys.leadDetail(leadId)` ✅
- [ ] **Mutate** đã đúng: `globalMutate(cacheKeys.leads())` ✅
- [ ] ❌ Xoá: `useRouter` + `router.refresh()` nếu còn (dùng SWR mutate thay)

---

## Files to Modify
- `components/crm/lead-detail-drawer.tsx` — Refactor toàn bộ
- `components/crm/lead-list-page.tsx` — Truyền `initialData`

## SSOT Violation Checklist (POST-WRITE grep)
Sau khi code xong, grep verify:
```bash
# KHÔNG được tìm thấy trong file đã sửa:
grep "bg-gray-100\|text-red-600\|text-green-\|animate-pulse.*bg-bg-muted" lead-detail-drawer.tsx
# Kết quả PHẢI = 0 matches
```

## Test Criteria
- [ ] **Mobile 375px**: Drawer full-screen, 1 cột, footer sticky
- [ ] **Desktop 1440px**: Drawer 650px, `form-grid-2col` cặp trường, footer `justify-between`
- [ ] Zero skeleton flash khi mở (SWR fallbackData)
- [ ] Tất cả Badge dùng `<Badge>` component, KHÔNG inline class
- [ ] Label dùng `label-base`, KHÔNG inline
- [ ] Loading dùng `<Skeleton>`, KHÔNG inline animate-pulse
- [ ] ESLint: 0 errors, 0 warnings

---
Next Phase: phase-02-customer-drawer.md
