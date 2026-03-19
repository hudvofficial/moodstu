# Phase 12: Debts & Financial Goals

**Status:** ⬜ Backlog
**Dependencies:** Phase 05 (Payments), Phase 11 (Expenses)
**Est.:** 1.5 days

## Objective

Công nợ 2 chiều (studio nợ nhà cung cấp + khách nợ studio). Mục tiêu tài chính với state machine + atomic RPC.

## Implementation Steps

### Công nợ (Debts)
- [ ] DB: Bảng `debts` (name, type ENUM 'short_term'|'long_term', debtor, creditor, amount, due_date, status)
- [ ] CRUD công nợ
- [ ] 2 chiều: Receivable (khách nợ) + Payable (studio nợ)
- [ ] Aging report: quá hạn 30/60/90+ ngày
- [ ] Liên kết lab (tổng hợp công nợ từ printing_orders chưa TT)
- [ ] Dashboard summary: tổng nợ phải thu / phải trả

### Mục tiêu Tài chính (Goals)
- [ ] DB: Bảng `financial_goals` (name, target_amount, current_amount, status ENUM, deadline)
- [ ] CRUD goals
- [ ] State machine: ACTIVE → COMPLETED (khi current >= target) → REVERTED (khi giảm dưới target)
- [ ] **Atomic increment RPC** — KHÔNG client-side calculate (v1 lesson!)
- [ ] Progress bar visual
- [ ] Auto-link: mỗi phiếu thu → check + update goals liên quan

## V1 Lessons (CRITICAL)
```
❌ Client đọc current → tính → gửi lại (race condition!)
✅ RPC: UPDATE goals SET current = current + :amount WHERE id = :id
```

## Test Criteria
- [ ] Tạo debt 2 chiều OK
- [ ] Aging tính đúng ngày quá hạn
- [ ] Goal chuyển COMPLETED khi đủ target
- [ ] Goal REVERT khi xoá phiếu thu khiến current < target
- [ ] Concurrent updates không bị race condition

---
**Next Phase:** → Phase 13 (Reports)
