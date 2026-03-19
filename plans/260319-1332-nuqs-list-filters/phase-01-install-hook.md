# Phase 01: Install nuqs + Build useListFilters
Status: ⬜ Pending
Dependencies: none

## Objective
Cài nuqs, tạo hook `useListFilters` generic dùng được cho mọi module.

## Context kỹ thuật
- `nuqs` giải quyết đúng vấn đề: URL search params = state, instant update, no re-render
- API giống `useState` → cực dễ dùng
- `useQueryState` / `useQueryStates` từ nuqs

## Implementation Steps

### Task 1: Install nuqs
```bash
npm install nuqs
```

### Task 2: Wrap NuqsAdapter vào providers
File: `app/providers.tsx` hoặc layout.tsx
```tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app'
// wrap children với <NuqsAdapter>
```

### Task 3: Tạo useListFilters hook
File: `hooks/useListFilters.ts`

```ts
// Config-driven generic hook
// Dùng: const { params, setParam } = useListFilters(config)
// Contracts: { status, service, sort, time, search, page }
// CRM:       { status, stage, assignee }
// Finance:   { type, period }
```

**Key design:**
- `useQueryStates` từ nuqs để batch update (không trigger nhiều URL push)
- Mỗi field có type: `string | number | boolean`
- Support `defaultValue` per field
- Export typed `params` object

### Task 4: Tạo contract filter config
File: `hooks/useContractFilters.ts` (WRAPPER, giữ API cũ)

```ts
// Wrap useListFilters với contract-specific config
// Expose: { filters, setStatus, setSearch, setService, setSort, ... }
// API 100% giống cũ → zero breaking change
```

## Files to Create/Modify
- `hooks/useListFilters.ts` — NEW: generic hook
- `hooks/useContractFilters.ts` — MODIFY: wrap useListFilters
- Root layout hoặc providers — MODIFY: add NuqsAdapter

## Test Criteria
- [ ] Click tab "Hoàn thành" → UI update NGAY (không lag)
- [ ] URL thay đổi: `/contracts?status=hoan_thanh`
- [ ] F5 giữ nguyên tab
- [ ] Back button hoạt động
- [ ] Không có lỗi TypeScript

## Notes
- NuqsAdapter phải wrap ở root layout level (Server Component ok)
- `useQueryStates` = batch update → 1 URL push cho nhiều filter thay đổi cùng lúc
- `shallow: true` trong nuqs = không trigger server re-render (chỉ URL thay đổi)

---
Next Phase: phase-02-migrate-contracts.md
