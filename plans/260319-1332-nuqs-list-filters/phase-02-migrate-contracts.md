# Phase 02: Migrate useContractFilters sang nuqs
Status: ⬜ Pending
Dependencies: Phase 01 done

## Objective
Swap `useContractFilters` internals sang `useListFilters` (nuqs).
API bên ngoài **giữ nguyên 100%** → contracts-list-client.tsx không cần sửa gì.

## Implementation Steps

### Task 1: Rewrite useContractFilters
File: `hooks/useContractFilters.ts`
- Xóa: `useRouter`, `useTransition`, `router.push`
- Thêm: `useListFilters` với contract config
- Giữ nguyên: tất cả return values (`filters`, `setStatus`, `setSearch`...)

### Task 2: Verify contracts-list-client.tsx không cần sửa
- Check imports vẫn work
- Check filter callbacks vẫn work

### Task 3: Manual QA
- Click tab → instant UI (không reload)
- Reload trang → giữ filter state
- Share URL → đúng state

## Files to Modify
- `hooks/useContractFilters.ts` — REWRITE internals, keep API

## Test Criteria
- [ ] Tab "Tất cả / Đang thực hiện / Hoàn thành / Đã hủy" — instant không lag
- [ ] Filter pills "Dịch vụ / Sắp xếp" — instant
- [ ] Search debounce — vẫn hoạt động
- [ ] Pagination — vẫn hoạt động
- [ ] URL đúng với mọi filter combo

---
Next Phase: phase-03-validate-document.md
