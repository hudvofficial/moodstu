# Plan: Debts V2 Upgrade (V1 Parity + Tối Ưu)

Created: 2026-04-16
Status: 🟡 In Progress (1/6 phases done)
Brief: [BRIEF_debts.md](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/docs/BRIEF_debts.md)

## Tình Trạng Hiện Tại (Audit Nhanh)

| Layer | Có sẵn V2 | Thiếu |
|-------|-----------|-------|
| **DB** `credit_cards` | ✅ Bảng đã tồn tại | — |
| **DB** `debts` | ✅ Core columns | ❌ 8 cột installment/link |
| **Actions** CRUD debts | ✅ Hardened (Zod + Audit + PeriodLock) | — |
| **Actions** CRUD credit_cards | ✅ Đã có 3 actions | — |
| **Actions** markInstallmentPaid | ✅ Đã có | — |
| **UI** DebtFormModal | ⚠️ Chỉ khoản thường | ❌ Toggle Trả góp, chọn sàn, chọn thẻ |
| **UI** Toolbar (Tab/Filter/Sort/Search) | ❌ | ❌ Toàn bộ |
| **UI** Stats + Aging | ⚠️ StatsBar đơn giản | ❌ 4 metrics + Aging 5 nhóm |
| **UI** Row actions (QR, Nhắc nợ, Quick pay kỳ) | ❌ | ❌ Toàn bộ |
| **UI** Credit Card management | ❌ | ❌ Toàn bộ |

> **Tin vui:** Backend logic V2 đã hardened ~80%. Chủ yếu cần DB migration + UI rebuild.

---

## Phases

| Phase | Name | Status | Ước tính |
|-------|------|--------|----------|
| 01 | DB Migration (8 cột) | ✅ Complete | ⚡ Done |
| 02 | DebtFormModal (toggle trả góp) | ✅ Complete | ⚡ Done |
| 03 | DebtToolbar (tab + filter + search) | ✅ Complete | ⚡ Done |
| 04 | Stats + Aging | ✅ Complete | ⚡ Done |
| 05 | Row Actions (QR, nhắc nợ, quick pay) | ✅ Complete | ⚡ Done |
| 06 | Credit Card UI | ✅ Complete | ⚡ Done |

---

## Quick Commands

- Bắt đầu Phase 1: `/code phase-01`
- Check progress: `/next`
