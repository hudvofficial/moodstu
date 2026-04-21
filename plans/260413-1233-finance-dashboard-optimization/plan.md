# Plan: Finance Dashboard UI Optimization & Blueprint Parity
Created: 2026-04-13T12:33:00+07:00
Status: 🟡 Reopened after 2026-04-21 audit

## Overview
Tối ưu hóa toàn diện UI/UX của Finance Dashboard để bám sát "Module Blueprint". Loại bỏ triệt để các token/spacing không chuẩn, dọn dẹp các Inline Styles giả mạo, gộp Filters vào header của thẻ Tổng quan (Stats), và đồng bộ kích thước (Visual Parity) với các module hiện hành (Inventory/Contracts).

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Chuẩn hóa Tokens & Stats Container | ✅ Complete | 100% |
| 02 | Đồng bộ Khối Đồ thị (Charts Parity) | ✅ Complete | 100% |
| 03 | Đồng bộ Khối Danh sách & Bảng (Lists) | ✅ Complete | 100% |
| 04 | Intelligence, Alerts & UI Polish | ✅ Complete | 100% |

## Summary
Đã loại bỏ toàn bộ `p-5`, `mb-5` và các padding hardcode ra khỏi toàn bộ Dashboard (Stats, Charts, Lists, Tables). Đã đồng bộ sử dụng `p-4` (`var(--spacing-base)`) và `stats-card` để giao diện Finance thống nhất 100% với chuẩn UI của hệ thống (Apple HIG + Stripe phong cách).

## 2026-04-21 Reopen Scope

UI token cleanup alone is not enough to call `/finance/dashboard` done. The plan is reopened to include:

- Business formula parity: revenue, outflow, debt, salary/fixed-cost, soft delete, and profit report columns must match the finance SSOT.
- Route parity: dedicated `/finance/dashboard` must exist and be linked from the smart banner without 404.
- Production data: smart dashboard must not use mock action responses.
- Performance parity: use Server Components, Suspense streaming zones, request-level cache/dedupe, bounded SWR revalidation, and dynamic chart islands.
- SSOT token enforcement: V1 visual classes are reference only; V2 must use system tokens/components.

Detailed audit: `docs/reports/audit_2026-04-21_finance_dashboard_v1_parity.md`
