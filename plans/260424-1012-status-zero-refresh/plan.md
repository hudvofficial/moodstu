# Plan: Status Update Zero-Refresh
Created: 2026-04-24T10:12
Status: 🟡 In Progress

## Overview
Fix "triple-trigger revalidation storm" — mỗi lần user select trạng thái, hệ thống trigger 3-4 lần re-fetch (revalidatePath + SWR mutate + Realtime echo), gây UI nhấp nháy/lag 2-3 lần trước khi hiện đúng.

**Mục tiêu:** 1 click = 0 re-fetch, UI update tức thì (0ms perceived latency).

## Root Cause

```
User click SelectStatus → Server Action chạy
  ├─ ① revalidatePath("/contracts")       → RSC full re-render
  ├─ ② revalidatePath("/contracts/[id]")  → RSC detail re-render
  ├─ ③ onSaved() → SWR mutate            → Client re-fetch ALL data
  └─ ④ Realtime subscription echo        → SWR mutate AGAIN
```

**1 thao tác nhỏ = 3-4 lần re-fetch toàn bộ contract detail.**

## Phases

| Phase | Name | Status | Files | Mô tả |
|-------|------|--------|-------|--------|
| 01 | Remove Redundant revalidatePath | ✅ Complete | 4 files | Xóa revalidatePath trong status-only server actions |
| 02 | Optimistic UI Everywhere | ✅ Complete | 2 files | Thêm optimistic update cho costumes + print-orders |
| 03 | Mute Echo + Remove Redundant onSaved | ✅ Complete | 3 files | Thread muteRealtimeEcho xuống costumes/print-orders |

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
