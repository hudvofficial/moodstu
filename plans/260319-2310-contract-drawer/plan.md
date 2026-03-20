# Plan: Contract Drawer — Quick Preview từ List

Created: 2026-03-19T23:11:00+07:00
Status: 🟡 Chờ duyệt

## Overview

Thêm drawer xem nhanh hợp đồng khi bấm vào card trên trang `/contracts`:
- **Desktop:** Side drawer trượt từ phải, width 480px
- **Mobile:** Bottom sheet trượt từ dưới lên, height 85vh

**100% UI-only** — reuse `useContractDetail()` SWR hook + `prefetchContract()`.

## Verified Data Sources

| Resource | File | Status |
|----------|------|--------|
| `getContractById()` | `app/actions/contracts.ts:199` | ✅ Có sẵn — full join 5 tables |
| `useContractDetail()` | `lib/hooks/use-contracts.ts:83` | ✅ Có sẵn — SWR wrapper |
| `prefetchContract()` | `lib/hooks/use-contracts.ts:132` | ✅ Có sẵn — hover pre-warm |
| `contractKeys.detail()` | `lib/hooks/use-contracts.ts:22` | ✅ Có sẵn — cache key |
| Click handler | `contracts-list-client.tsx:104` | ⚠️ Cần sửa handleView → mở drawer |
| Desktop table row | `contracts-table.tsx:108` | ✅ Đã có `onView(id)` onClick |
| Mobile card | `contracts-table.tsx:192` | ✅ Đã có `onView(id)` onClick |

## Quy tắc
- REUSE `useContractDetail()` — KHÔNG tạo query/hook mới
- REUSE `prefetchContract()` — hover pre-warm cache
- KHÔNG inline styles → dùng CSS tokens
- KHÔNG Material icons → Lucide-react only
- Max 250 LOC/file
- Desktop: click row → drawer (KHÔNG navigate đi trang detail)
- Mobile: click card → drawer (KHÔNG navigate)
- Close: overlay click, Escape key, X button
- Animation: slide-in 200ms ease-out

## Phases

| Phase | Name | Files | Effort |
|-------|------|-------|--------|
| **01** | Drawer UI Component | `components/ui/drawer.tsx` [NEW] | 30m |
| **02** | Contract Preview Content | `components/contracts/contract-drawer.tsx` [NEW] | 30m |
| **03** | Integration + Prefetch | `contracts-list-client.tsx` [MODIFY] | 15m |

**Tổng:** 3 phases | 2 new + 1 modify | ~1h15m

---

## Phase 01: Drawer UI Component (Shared/Reusable)

### Objective
Tạo shared `<Drawer>` component dùng cho toàn app (contracts, CRM, v.v.).

### [NEW] `components/ui/drawer.tsx` (~180 LOC)

**Props:**
```ts
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;        // desktop width, default "480px"
  position?: "right";    // future: "left"
}
```

**Behavior:**
- Desktop (≥1024px): slide-in from right, `width` prop, overlay `bg-black/30`
- Mobile (<1024px): slide-up bottom sheet, `height: 85vh`, rounded-t-2xl, drag handle
- Scroll: content area scrollable, header+footer fixed
- Close: overlay click, Escape, X button
- Animation: `transition-transform 200ms ease-out`
- Portal: render via `createPortal(document.body)` — outside scroll container
- Lock body scroll when open
- Focus trap (Escape key)

**Desktop HTML structure:**
```
<div class="overlay" onClick={onClose}>
  <aside class="drawer-panel right-0 w-[480px]">
    <header> {title} + X button </header>
    <div class="drawer-content overflow-y-auto"> {children} </div>
  </aside>
</div>
```

**Mobile HTML structure:**
```
<div class="overlay" onClick={onClose}>
  <aside class="drawer-sheet bottom-0 h-[85vh] rounded-t-2xl">
    <div class="drag-handle" /> <!-- w-10 h-1 bg-border mx-auto -->
    <header> {title} + X button </header>
    <div class="drawer-content overflow-y-auto"> {children} </div>
  </aside>
</div>
```

---

## Phase 02: Contract Preview Content

### Objective
Tạo content component hiển thị preview hợp đồng bên trong drawer.

### [NEW] `components/contracts/contract-drawer.tsx` (~200 LOC)

**Props:**
```ts
interface ContractDrawerProps {
  contractId: string | null;
  isOpen: boolean;
  onClose: () => void;
}
```

**Sections hiển thị:**

1. **Header:** Mã HĐ (`contract_code`) + Badge trạng thái + X button
2. **Khách hàng:** Tên, SĐT, Loại dịch vụ (badge)
3. **Tài chính:**
   - Tổng tiền, Đã thu, Còn lại
   - Progress bar (paid / total %)
4. **Timeline thanh toán:** (từ `paymentPlans[]`)
   - Mỗi đợt: tên giai đoạn + số tiền + ✅ đã thu / ⬜ chưa thu
   - Nếu không có plan → hiện "Chưa có lịch thanh toán"
5. **Footer:** 2 nút
   - `[Xem chi tiết →]` → `router.push(/contracts/{id})`
   - `[Sửa hợp đồng ✏️]` → `router.push(/contracts/{id}/edit)`

**Data source:** `useContractDetail(contractId)` — đã có sẵn

**Loading:** Skeleton khi `isLoading` (simple pulse animation)

**Reuse helpers:** `formatCurrency`, `formatDate`, `getStatusLabel`, `getServiceLabel` từ codebase hiện tại

---

## Phase 03: Integration + Prefetch

### Objective
Nối drawer vào trang list, thay navigate bằng mở drawer.

### [MODIFY] `contracts-list-client.tsx`

**Changes:**

1. Thêm state: `const [selectedId, setSelectedId] = useState<string | null>(null)`
2. Đổi `handleView`: `router.push(...)` → `setSelectedId(id)` (mở drawer)
3. Thêm `handleViewDetail`: link "Xem chi tiết" trong drawer → `router.push`
4. Prefetch on hover: pass `onHover={prefetchContract}` cho `ContractsTable`
5. Render `<ContractDrawer>` ở cuối JSX

### [MODIFY] `contracts-table.tsx`

**Changes:**

1. Thêm prop `onHover?: (id: string) => void` vào `ContractsTableProps`
2. Desktop rows: `onMouseEnter={() => onHover?.(id)}`
3. Mobile cards: không cần hover (touch devices)

---

## Verification Plan

### Browser Testing (Visual)

1. Desktop (1440px):
   - Navigate `http://localhost:3000/contracts`
   - Click 1 contract row → drawer slides in from right
   - Verify: overlay appears, content shows, progress bar renders
   - Click overlay or X → drawer closes
   - Press Escape → drawer closes
   - Click "Xem chi tiết" → navigates to detail page

2. Mobile (375px):
   - Click 1 contract card → bottom sheet slides up
   - Verify: drag handle visible, rounded top corners, 85vh height
   - Content scrollable inside sheet
   - Click overlay → sheet closes

3. Hover prefetch (Desktop):
   - Hover 1 row → wait 1s → click → drawer opens INSTANTLY (no loading)
   - Verify via browser DevTools Network tab: request fires on hover

### Anh test thủ công
- Mở `/contracts` trên cả desktop và mobile
- Bấm vài HĐ khác nhau để verify drawer hiển thị đúng data
- Confirm nút "Xem chi tiết" và "Sửa hợp đồng" navigate đúng
