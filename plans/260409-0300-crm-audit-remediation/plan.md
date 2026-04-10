# Plan: CRM Audit Remediation
Created: 2026-04-09T03:00
Status: 🟡 In Progress

## Overview
Kế hoạch khắc phục 4 điểm code smells và vi phạm rules từ Báo cáo Audit toàn diện của module CRM, bao gồm: Type Safety, Inconsistent UX Navigation (Leads), Brittle Layout CSS, và Safe Date Parsing. Mục tiêu là chuẩn hóa 100% mã nguồn CRM theo Gold Standard mà không làm thay đổi Business Logic hiện tại.

## Tech Stack
- Frontend: Next.js App Router, React (useTransition)
- TypeScript: Strict Type Definitions
- Styling: Tailwind v4 (Flexbox layout)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Chuẩn hóa Type Safety (LTV) | ✅ Complete | 100% |
| 02 | Đồng bộ UX Navigation (Leads) | ✅ Complete | 100% |
| 03 | Refactor Layout CSS (Customers) | ✅ Complete | 100% |
| 04 | Chuẩn hóa Safe Date Parsing | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code plans/260409-0300-crm-audit-remediation/phase-01-type-safety.md`
- Check progress: `/next`
- Save context: `/save-brain`
