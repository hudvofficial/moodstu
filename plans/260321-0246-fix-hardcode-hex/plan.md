# Plan: Fix Hardcode Hex → SSOT Tokens
Created: 2026-03-21T02:46
Status: ✅ Hoàn tất

## Vấn đề
Event Timeline + Event Task Modal dùng hardcode hex colors (`#4CAF50`, `#EFF6FF`, `#2563EB`, `#ECFDF5`, `#059669`) thay vì SSOT tokens.

## Scope — 2 files, 6 chỗ

### File 1: `event-task-modal.tsx` (3 chỗ)

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L364 | `bg-[#EFF6FF] text-[#2563EB]` | `bg-info/10 text-info` |
| L370 | `bg-[#ECFDF5] text-[#059669]` | `bg-success/10 text-success` |
| L378 | `bg-[#ECFDF5] text-[#059669]` | `bg-success/10 text-success` |

### File 2: `event-timeline.tsx` (3 chỗ)

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L58  | `text-[#4CAF50] fill-[#4CAF50]/10` | `text-success fill-success/10` |
| L201 | `bg-[#4CAF50]/5` | `bg-success/5` |
| L255 | `bg-[#4CAF50]` | `bg-success` |

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 01 | Fix event-task-modal.tsx | ⬜ | 2 min |
| 02 | Fix event-timeline.tsx | ⬜ | 2 min |
| 03 | Build verify | ⬜ | 2 min |

## Rủi ro
- Cần confirm `text-success`, `text-info`, `bg-success`, `bg-info` tồn tại trong Tailwind theme
- Nếu không → dùng CSS variable: `text-[var(--color-success)]`
