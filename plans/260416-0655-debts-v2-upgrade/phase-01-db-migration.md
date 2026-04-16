# Phase 01: DB Migration — Thêm cột Installment + Link

Status: ✅ Complete (2026-04-16)
Dependencies: Không

## Objective

Bổ sung 8 cột còn thiếu vào bảng `debts` để hỗ trợ **Trả góp** và **Liên kết thẻ tín dụng / hợp đồng**.

> **Lưu ý:** Bảng `credit_cards` đã tồn tại trong DB V2, KHÔNG cần tạo mới.
> Server actions (markInstallmentPaid, CRUD credit_cards) đã code sẵn, chỉ cần migration DB.

## Cột cần thêm vào `debts`

| Cột | Type | Default | Mô tả |
|-----|------|---------|-------|
| `installment_total` | INT | NULL | Tổng số kỳ trả góp |
| `installment_paid` | INT | 0 | Số kỳ đã trả |
| `installment_amount` | NUMERIC | NULL | Số tiền mỗi kỳ |
| `platform` | TEXT | NULL | Sàn TMĐT (Shopee, Kredivo...) |
| `card_id` | UUID FK→credit_cards | NULL | Liên kết thẻ tín dụng |
| `contract_id` | UUID FK→contracts | NULL | Liên kết hợp đồng (thay LIKE matching) |
| `debt_date` | DATE | NULL | Ngày phát sinh nợ |
| `payment_date` | DATE | NULL | Ngày thanh toán |

## Implementation Steps

1. [ ] Chạy ALTER TABLE `debts` thêm 8 cột
2. [ ] Tạo INDEX trên `card_id`, `contract_id` (WHERE NOT NULL)
3. [ ] Backfill `contract_id` từ bảng `contracts` (nếu có dữ liệu cũ match)
4. [ ] Verify: query thử `SELECT * FROM debts LIMIT 5` — confirm cột mới xuất hiện

## Files to Modify

- **DB Migration** (via Supabase MCP `apply_migration`)

## Test Criteria

- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'debts'` → thấy 8 cột mới
- [ ] `INSERT` 1 row installment test → thành công
- [ ] `markInstallmentPaid` action gọi thành công (đã có sẵn, chỉ cần DB support)

---
Next Phase: [phase-02](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/plans/260416-0655-debts-v2-upgrade/phase-02-form-modal.md)
