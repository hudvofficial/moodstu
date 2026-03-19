# Phase 02: CRM Pages Đọc URL Params
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
CRM pages đọc `?q=xxx` từ URL thay vì local `useState(search)`.
fetchData nhận search từ URL param.

## Files to Modify
- `app/(protected)/crm/customers/page.tsx`
- `app/(protected)/crm/leads/page.tsx`

## Implementation Steps

### customers/page.tsx
1. [ ] Import `useSearchParams` từ `next/navigation`
2. [ ] Xóa `const [search, setSearch] = React.useState("")`
3. [ ] Thêm `const searchParams = useSearchParams()`
4. [ ] Thêm `const search = searchParams.get('q') || ""`
5. [ ] `fetchData` useCallback dependency: `search` (từ URL)
6. [ ] Xóa prop `onSearchChange={setSearch}` khi truyền xuống CustomerList 
7. [ ] Xóa prop `search={search}` khi truyền xuống CustomerList

### leads/page.tsx
1. [ ] Tương tự customers — import useSearchParams
2. [ ] Xóa useState(search)
3. [ ] Đọc search từ URL
4. [ ] Xóa props search/onSearchChange khi truyền xuống LeadList

## Test Criteria
- [ ] Thay đổi URL `?q=test` → data filters immediately
- [ ] CRUD (thêm/sửa/xóa) vẫn refresh data đúng
- [ ] Stats vẫn load đúng

---
Next Phase: phase-03-remove-inline-search.md
