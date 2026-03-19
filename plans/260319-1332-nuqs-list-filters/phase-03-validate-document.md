# Phase 03: Validate + Document Pattern
Status: ⬜ Pending
Dependencies: Phase 02 done

## Objective
Verify toàn bộ hoạt động + viết pattern docs để các modules sau dùng.

## Implementation Steps

### Task 1: Visual QA qua browser
- Mở /contracts trên mobile + desktop
- Test tất cả tabs, filters, search, pagination
- Chụp screenshot trước/sau

### Task 2: Document pattern cho modules sau
File: `docs/patterns/list-filter-pattern.md`

```md
# List Filter Pattern (nuqs)

## Dùng cho module mới:
import { useListFilters } from "@/hooks/useListFilters"

const { params, setParam, setParams } = useListFilters({
  status: "all",
  sort: "newest",
  // ... fields khác
})

## Contract module example:
Xem: hooks/useContractFilters.ts
```

## Test Criteria
- [ ] Contracts module: tất cả filters instant
- [ ] Không có regression so với trước
- [ ] Pattern docs đủ rõ để dev khác follow

## Notes
Pattern này sẽ dùng cho:
- /crm (nếu chưa có filter hook)
- /finance (period, type filters)
- /inventory (category, status filters)
- /schedules (date, status filters)
- /reports (module, period filters)
