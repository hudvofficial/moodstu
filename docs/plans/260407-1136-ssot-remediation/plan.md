# Plan: Tối Ưu SSOT toàn hệ thống (Fix All Hardcodes)

Created: 2026-04-07 11:36
Status: 🟡 In Progress

## Overview

Đại tu hệ thống giao diện, xóa sổ >150 mã màu hardcode (`#hex`, `rgba()`), quy hoạch toàn bộ về chuẩn Design System bằng biến token (`var(--color-...)` tham chiếu từ `globals.css`). Xử lý thêm các cảnh báo TypeScript ngầm.

## Tech Stack

- Frontend: Next.js, React, Tailwind v4
- Trọng tâm: CSS Variables, Typography & Color Tokens (SSOT)

## Phases

| Phase | Name                        | Status      | Progress |
| ----- | --------------------------- | ----------- | -------- |
| 01    | Setup globals.css Tokens    | ✅ Complete | 100%     |
| 02    | Refactor Core UI Components | ✅ Complete | 100%     |
| 03    | Refactor Layout & Module    | ✅ Complete | 100%     |
| 04    | Fix TypeScript Errors       | ✅ Complete | 100%     |
| 05    | Verify & Test               | ✅ Complete | 100%     |
| 06    | Typo & Spacing Hardcodes    | ✅ Complete | 100%     |
| 07    | Shadow & Shapes (Lesson 64) | ✅ Complete | 100%     |

## Quick Commands

- Start Phase 1: `/code docs/plans/260407-1136-ssot-remediation/phase-01-setup.md`
- Check progress: `/next`
- Save context: `/save-brain`
