# Phase 02: Dress Detail Drawer
Status: ⬜ Pending
Dependencies: Phase 01 (releaseReservation for action buttons)
Effort: ~45 min

## Objective
Click dress card → slide drawer with dress info + reservation history.
Clone ContractDrawer pattern (0ms — data from list query).

## Performance Rules
- **P-1: 0ms Drawer** — primary data from list query, NO separate fetch
- **P-4: SWR key** — `cacheKeys.dressDetail(id)` for lazy-loaded reservations tab
- **P-2: Revalidate** — after release action: `revalidate(cacheKeys.dresses())`

## Implementation Steps

### 1. `DressDrawer` component
- File: `components/dresses/dress-drawer.tsx`
- Clone from: `components/contracts/contract-drawer.tsx` (123 lines)
- Props: `{ dress: DressItem | null; isOpen: boolean; onClose: () => void }`
- Import: `Drawer` from `@/components/ui/drawer`
- Header: dress name + `Badge` (status) + headerRight (QR icon, edit icon)

### 2. `DrawerContent` — tabs/sections
- File: `components/dresses/dress-drawer-content.tsx`
- Section 1: Info (image, code, category, size, color, price) → from list data (0ms)
- Section 2: Reservations → lazy-fetch via `useSWR(cacheKeys.dressDetail(id), fetchDressDetail)`
- Each reservation row: contract code, customer, dates, status badge, release button

### 3. Integrate into `dresses-list-client.tsx`
- Add state: `drawerItem` + `drawerOpen`
- DressCard onClick → `setDrawerItem(dress); setDrawerOpen(true)`
- Render `<DressDrawer>` at bottom

## SSOT Tokens
- Typography: `text-h3`, `text-body-sm`, `text-caption`
- Badge: `badge badge-{variant}` via `DRESS_STATUS_MAP`
- Section: `section-title`
- Code: `tag-badge`
- Icons: lucide `Shirt`, `Calendar`, `User`, `Pencil`, `QrCode`
- Buttons: `btn btn-ghost`, `icon-btn`

## Files to Create/Modify
- [NEW] `components/dresses/dress-drawer.tsx` (~50 lines)
- [NEW] `components/dresses/dress-drawer-content.tsx` (~80 lines)
- [MODIFY] `components/dresses/dresses-list-client.tsx` — add drawer state + render

## Test Criteria
- [ ] Click card → drawer opens with correct info (0ms, no loading)
- [ ] Reservation tab loads with SWR
- [ ] Mobile: bottom sheet (85vh) | Desktop: side panel (480px)
- [ ] Escape + overlay click closes drawer
- [ ] Release button calls releaseReservation + revalidates

---
Next Phase: phase-03-image-upload.md
