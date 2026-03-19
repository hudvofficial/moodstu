# Plan: Radix Select System
Created: 2026-03-19T13:13
Status: 🟡 In Progress

## Overview
Migrate toàn bộ Select components sang Radix UI primitive.
Mục tiêu: 1 unified system, 3 variants — `form`, `grouped`, `pill`.
Phục vụ toàn bộ ~18-30 filter dropdowns trên 6+ modules.

## Tech Stack
- Primitive: `@radix-ui/react-select`
- Styling: existing design-system.css tokens
- Zero breaking change: giữ nguyên SimpleSelect / GroupedSelect API

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Install + Build Radix Primitives | ⬜ Pending | 0% |
| 02 | SelectForm — Migrate SimpleSelect | ⬜ Pending | 0% |
| 03 | SelectPill — New Filter Pill | ⬜ Pending | 0% |
| 04 | Migrate contracts module | ⬜ Pending | 0% |

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
