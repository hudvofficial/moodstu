# Plan: CRM V2 Upgrade — Port V1 + Nâng Cấp

**Created:** 2026-03-16
**BRIEF:** `docs/BRIEF-crm-v2-upgrade.md`
**Status:** 🟡 In Progress

---

## Overview

Port 100% V1 CRM features → V2 codebase, mặc áo V2 (design tokens + Lucide icons + TypeScript strict), thêm Stitch visual polish.

**Nguyên tắc:** V2 = V1 superset. KHÔNG BAO GIỜ V2 < V1.

## V1 Source
- Path: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\`
- Components: `components/crm/` (24 files)
- Routes: `app/(protected)/crm/` (15 files)
- Types: `types/crm.ts`

## V2 Target
- Path: `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio\`
- Components: `components/crm/` (19 files → 24+ files)
- Routes: `app/(protected)/crm/` (4 files → verify)
- Actions: `app/actions/crm.ts`

## Port Rules
```
1. Đọc V1 code → Copy LOGIC nguyên vẹn
2. Đổi: Material Symbols → Lucide icons
3. Đổi: Hardcode colors → V2 design tokens
4. Đổi: Import paths → V2 paths
5. KHÔNG thêm/bớt feature
6. KHÔNG thay đổi business logic
7. Max 250 lines/file — split nếu cần
```

---

## Phases

| Phase | Name | Status | Tasks | Est. |
|-------|------|--------|-------|------|
| A | Types & Server Actions | ✅ Complete | 6 | 30m |
| B | Customer Module Fix | ✅ Complete | 7 | 1h |
| C | Lead Core (Kanban + List) | ✅ Complete | 9 | 2h |
| D | Lead Analytics | ✅ Complete | 4 | 1h |
| E | Lead Detail & Forms | ✅ Complete | 6 | 1h |
| F | Layout & Polish | ✅ Complete | 6 | 30m |
| G | Lead Detail Page | ✅ Complete | 4 | 45m |

**Total: 38 tasks | ~6-7 hours**

---

## Quick Commands
- Start Phase A: `/code phase-A`
- Check progress: `/next`
- Full BRIEF: `docs/BRIEF-crm-v2-upgrade.md`
