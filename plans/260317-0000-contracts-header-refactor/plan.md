# Plan: Contracts Header — V1 Parity Refactor
Created: 2026-03-17T00:00
Status: 🟡 In Progress

## Overview
Refactor Contracts List Page header area để đạt 100% V1 parity:
- **Bỏ** h1 "Hợp đồng" + subtitle trùng (app-shell header đã có)
- **Bỏ** 4 KPI cards to → thay bằng **compact inline stats** (V1 style)
- **Thêm** nút "+Tạo hợp đồng" vào dòng stats
- **Thêm** 3 dropdown filters từ V1: "Tháng này", "Dịch vụ", "Lọc nâng cao"
- **Giữ nguyên** app-shell header (search + ⌘K + theme + bell)
- **Giữ nguyên** tabs filter với count badges

## Context
- App-shell `header.tsx` = component global, KHÔNG sửa
- V1 reference: `0Moodstudio/webapp/components/contracts/ContractsFilters.tsx`
- V2 hiện tại: `contracts-list-client.tsx` + `contracts-stats.tsx`

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Compact Inline Stats | ⬜ Pending | 0% |
| 02 | Remove Duplicate Header + Wire CTA | ⬜ Pending | 0% |
| 03 | Add V1 Dropdown Filters | ⬜ Pending | 0% |

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
