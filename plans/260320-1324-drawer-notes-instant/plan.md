# Plan: Drawer Notes Instant Load (V1→V2 Port)
Created: 2026-03-20 13:24
Status: ✅ Complete

## Context
- V1 include `contract_notes` trong list query → drawer mở instant
- V2 bỏ sót `contract_notes` → DrawerNotes fetch riêng bằng SWR → skeleton loading 1-2s
- V2 list query đã có 5 nested tables (27+ cột) → thêm notes (~4 cột) = negligible

## Approach: Hybrid (V1 Instant + V2 SWR Real-time)
1. ✅ Thêm `contract_notes` vào list select query
2. ✅ Truyền notes từ list data → DrawerNotes qua `initialNotes` prop
3. ✅ SWR hook dùng `fallbackData` = hiện ngay + auto-revalidate ngầm
4. ✅ Thêm/xóa note vẫn dùng SWR optimistic (giữ nguyên logic hiện tại)

## Files Modified
- `app/actions/contracts.ts` — thêm `contract_notes` vào list select
- `components/contracts/contract-drawer.tsx` — thêm type + truyền initialNotes
- `components/contracts/contracts-list-client.tsx` — map contract_notes
- `components/contracts/drawer-notes.tsx` — nhận initialNotes prop
- `lib/hooks/use-contract-notes.ts` — support fallbackData
