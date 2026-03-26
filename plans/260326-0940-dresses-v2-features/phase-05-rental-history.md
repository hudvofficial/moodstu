# Phase 05: Rental History Page `/dresses/rentals`
Status: ⬜ Pending
Dependencies: Phase 01 (reservation data)
Effort: ~45 min

## Audit Context
- V1 `rentals/page.tsx` layout = good reference (mobile cards + desktop table)
- V1 tables = `dress_rentals` → V2 = `inventory_reservations`
- V2 pattern: SWR client component (not SSR page)

## Performance Rules
- **P-5:** SWR + `keepPreviousData` for filtered list
- **P-6:** Responsive grid — mobile cards + desktop table
- Server action for data fetching (withAuth)

## Implementation Steps

### 1. Server Action: `fetchRentalHistory()`
- File: `app/actions/dress-queries.ts` (add to existing)
- Query: `inventory_reservations` JOIN `inventory_items` JOIN `contracts` JOIN `customers`
- Filters: status, item_id, date range
- Pagination: `.range(from, to)` with count
- Return: `{ data: RentalHistoryItem[], count: number }`

### 2. Types
- File: `types/dress.ts` (add to existing)
- ```ts
  export interface RentalHistoryItem {
    id: string; status: string; rental_price: number;
    start_date: string | null; end_date: string | null;
    created_at: string;
    inventory_items?: { name: string; item_code: string; image_url: string | null } | null;
    contracts?: { contract_code: string; customers?: { full_name: string } | null } | null;
  }
  ```

### 3. SWR Cache Key
- Add to `lib/swr.ts`: `dressRentals: () => "dress-rentals"`

### 4. Page: `/dresses/rentals/page.tsx`
- SSR wrapper → renders client component

### 5. Client Component: `rentals-list-client.tsx`
- File: `components/dresses/rentals-list-client.tsx` [NEW]
- Pattern: clone `dresses-list-client.tsx` structure
- SWR: `useSWR([cacheKeys.dressRentals(), filters], fetchRentalHistory, { keepPreviousData: true })`
- Filter bar: TabsFilter (status: Tất cả | Đã đặt | Đã lấy | Đã trả) + SelectPill (sort)
- Mobile: cards layout (clone V1 concept — image + name + code + customer + dates + status)
- Desktop: table layout (columns: Trang phục | Khách hàng/HĐ | Ngày lấy/trả | Trạng thái)
- Pagination via URL searchParams

### 6. Navigation Link
- Add "Lịch thuê" link to `dresses-list-client.tsx` header area (desktop only)
- Icon: lucide `Calendar`

## SSOT Tokens
- `main-container` — page wrapper
- `table-header` — table thead
- `tag-badge` — item code
- `badge badge-{variant}` — status
- `card-interactive` — mobile cards
- `text-body-sm`, `text-caption` — typography
- `btn btn-ghost` — filter actions
- `EmptyState` from `@/components/ui/ux-states`
- `Pagination` from `@/components/ui/pagination`

## Files to Create/Modify
- [MODIFY] `app/actions/dress-queries.ts` — add `fetchRentalHistory` (~30 lines)
- [MODIFY] `types/dress.ts` — add `RentalHistoryItem` type
- [MODIFY] `lib/swr.ts` — add `dressRentals` cache key
- [NEW] `app/(protected)/dresses/rentals/page.tsx` (~15 lines)
- [NEW] `components/dresses/rentals-list-client.tsx` (~120 lines)
- [MODIFY] `components/dresses/dresses-list-client.tsx` — add nav link

## Test Criteria
- [ ] `/dresses/rentals` shows reservation history
- [ ] Mobile: card layout | Desktop: table layout
- [ ] Filter by status works (URL params persist)
- [ ] Pagination works
- [ ] Empty state when no rentals
- [ ] Navigation link from dresses list page

---
End of Plan
