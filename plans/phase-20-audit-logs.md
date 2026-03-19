# Phase 20: Audit Logs

**Status:** ⬜ Backlog
**Dependencies:** Phase 02 (Database)
**Est.:** 0.5 day

## Objective

Audit trail: ai sửa gì, khi nào. JSONB old/new data. Trigger-based cho tables nhạy cảm.

## Implementation Steps

- [ ] DB: Bảng `audit_logs` (employee_id, action ENUM, table_name, record_id, old_data JSONB, new_data JSONB)
- [ ] DB: Trigger function `log_audit_action()` — copy v1 pattern
- [ ] Apply triggers: contracts, receipts, expenses, inventory, payment_plans
- [ ] Audit log viewer UI (Admin only)
- [ ] Filter: theo table, action, user, date range
- [ ] Diff view: hiển thị old vs new (highlight changes)

## V1 Carry-over
- `log_audit_action()` PL/pgSQL function — copy nguyên
- SECURITY DEFINER cho trigger function

## Test Criteria
- [ ] Create/Update/Delete → auto log
- [ ] JSONB old/new data chính xác
- [ ] Only Admin can view audit logs

---
**Next Phase:** → Phase 21 (Notifications)
