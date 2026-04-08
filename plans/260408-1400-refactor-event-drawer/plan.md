# Plan: Refactor Event Form Drawer (SSOT)
Created: 2026-04-08 14:00
Status: 🟡 In Progress

## Overview
Làm sạch kỹ thuật file `components/calendar/drawers/event-form-drawer.tsx`, đưa toàn bộ component vi phạm quy tắc SSOT về chuẩn, thay thế input cơ bản thành hệ sinh thái token được duyệt (DatePicker). Loại bỏ Type Safety vulnerabilities `err: any`.

## Tech Stack
- Frontend: Next.js + Tailwind v4 + SSOT `DatePicker`

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Setup & UI Tokens Standardization | ✅ Complete | 100% |
| 02 | DatePicker & Logic Split | ✅ Complete | 100% |
| 03 | Type Safety Clean up & Debug | ✅ Complete | 100% |
| 04 | DatePicker Layout Alignment | ✅ Complete | 100% |
| 04c | Date/Time Vertical Alignment (Input CSS Fix) | ✅ Complete | 100% |
| 04d | Input Baseline Normalization (forms.css) | ✅ Complete | 100% |
| 04e | DatePicker SSOT Compliance | ✅ Complete | 100% |
| 05 | Testing & Verification | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
