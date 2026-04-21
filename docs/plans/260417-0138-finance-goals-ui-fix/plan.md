# Plan: Finance Goals UI + Logic (v1 parity)
Created: 2026-04-17
Status: ✅ Complete

## Overview
Làm sạch và đồng bộ lại UI cho module Finance Goals theo SSOT:
- Header chuẩn Finance (Receipt-style): `StatsBar` + action button trong unified container.
- Filter row chuẩn: `TabsFilter` + `SelectPill` (sort).
- UX states chuẩn: `EmptyState`, `ConfirmDialog`, progress tokens.
- Tối ưu fetch để nhẹ hơn (không kéo nested contributions nếu không cần).
- Bổ sung nghiệp vụ v1: huỷ/khôi phục, sửa, xem lịch sử góp + hoàn tác (24h), guard status khi góp.
- Bổ sung UX v1: contribute mode (commitment/surplus/custom), milestone celebration 25/50/75/100.
- Bổ sung create/edit parity: templates + icon/color selection, render icon/color trên card.
- Bổ sung advisor parity: overview cards (cashflow/progress/feasibility) + so sánh mục tiêu.
- Đồng bộ finance SSOT sang `/reports`, `/finance/goals`, `/finance/closes`: realized inflow = payments + standalone receipts; outflow = expenses + salary + fixed costs; close snapshot lưu cùng công thức.

## Tech Stack
- Frontend: Next.js + React
- Styling: TailwindCSS + Apple/Stripe-style components

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Cập nhật SSOT UI Tokens | ✅ Complete | 100% |
| 02 | Header + Filters parity | ✅ Complete | 100% |
| 03 | Performance polish | ✅ Complete | 100% |
| 04 | Business logic parity (v1+) | ✅ Complete | 100% |
| 05 | UX parity (v1 templates + contribute) | ✅ Complete | 100% |
| 06 | Cross-module Finance SSOT sync | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
