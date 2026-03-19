# Plan: nuqs — Universal List Filter System
Created: 2026-03-19 13:32
Status: 🟡 In Progress

## Vấn đề
`useContractFilters` dùng `router.push` → mỗi tab click = full server re-render → lag 200-800ms.
Chưa có pattern chung → mỗi module phải tự viết filter hook → code duplicated.

## Giải pháp
Dùng `nuqs` library để sync filter state với URL **instant** (không lag).
Tạo hook generic `useListFilters` dùng được cho tất cả modules.

## Tech Stack
- **nuqs** — URL search params state manager cho Next.js App Router
- **TypeScript** — typed filter config
- Không thay đổi Supabase query layer

## Kết quả mong đợi
- Tab/filter click: **instant** (không lag)
- URL vẫn sync (shareable, F5 giữ state, back button hoạt động)
- 1 hook `useListFilters` → dùng cho Contracts, CRM, Finance, Inventory...

## Phases

| Phase | Name | Status | Scope |
|-------|------|--------|-------|
| 01 | Install nuqs + build useListFilters | ⬜ Pending | Hook generic |
| 02 | Migrate useContractFilters | ⬜ Pending | Contracts module |
| 03 | Validate & document pattern | ⬜ Pending | Pattern docs |

## Quick Commands
- Phase 01: `/code p1`
- Phase 02: `/code p2`
