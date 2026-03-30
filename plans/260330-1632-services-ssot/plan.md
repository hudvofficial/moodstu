# Plan: Services SSOT Refactor (Thay thế `<select>`)
Created: 2026-03-30 16:32
Status: 🟢 Near Complete (6/7 phases done, Phase 04 Verify pending)

## Overview
Dọn dẹp vi phạm SSOT trong module `services`. Cụ thể, thay thế toàn bộ thẻ `<select>` native bằng component nội bộ `<SelectForm>` theo đúng tài liệu `components/ui/REGISTRY.md`. 
Vùng ảnh hưởng: Form tạo/sửa dịch vụ (`ServiceInfoSection.tsx` & `ServicePriceSection.tsx`).

Tích hợp Task 3: Làm mượt CategoryManagerModal (Optimistic UI, Đồng bộ Auto-select, Refactor chuẩn SSOT).

## Tech Stack
- Frontend: `<SelectForm>` component.
- Context: `useServiceForm` custom hook.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Refactor UI Components | ✅ Complete | 100% |
| 02 | Database Schema (ABC Framework) | ✅ Complete | 100% |
| 03 | Backend API & Types Update | ✅ Complete | 100% |
| 04 | Verify & Test | ⬜ Pending | 0% |
| 05 | Nâng cấp API Cấp Danh mục (Return Record) | ✅ Complete | 100% |
| 06 | Modal UI Refactor & Optimistic State | ✅ Complete | 100% |
| 07 | Event Sync Auto-Select ra Form | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
