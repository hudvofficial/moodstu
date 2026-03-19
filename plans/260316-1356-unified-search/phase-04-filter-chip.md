# Phase 04: Mobile Filter Chip
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Khi mobile user search → đóng overlay → hiện filter chip 
cho biết đang filter. Chip có nút xóa (✕).

## Files to Create
- `components/crm/shared/FilterChip.tsx` (NEW)

## Files to Modify
- `app/(protected)/crm/customers/page.tsx`
- `app/(protected)/crm/leads/page.tsx`

## Implementation Steps

### FilterChip.tsx (NEW ~30 lines)
1. [ ] Props: `query: string`, `onClear: () => void`
2. [ ] Chỉ render khi `query` có giá trị
3. [ ] UI: `🔍 "{query}" [✕]` — compact, sticky
4. [ ] Dùng SSOT classes: `tag-badge` base + custom
5. [ ] `onClear` → `router.replace(pathname)` (xóa URL param)
6. [ ] `lg:hidden` — chỉ hiện trên mobile (desktop có header search hiện sẵn)

### CRM Pages
1. [ ] Import FilterChip
2. [ ] Render giữa stats/tabs và content list
3. [ ] Props: `query={search}`, `onClear` → clear URL param

## Design
```
┌─ Mobile (khi có search active) ─┐
│  📊 Stats cards...               │
│  ┌─────────────────────────────┐ │
│  │ 🔍 "Nguyễn"  [✕ Xóa]       │ │ ← FilterChip (lg:hidden)
│  └─────────────────────────────┘ │
│  📋 Customer list (filtered)     │
└──────────────────────────────────┘
```

## Test Criteria
- [ ] Mobile: search → close overlay → chip visible
- [ ] Chip tap ✕ → filter cleared, chip disappears  
- [ ] Desktop: chip NOT visible (lg:hidden)
- [ ] Chip displays truncated text for long queries

---
Next Phase: phase-05-cleanup-layout.md
