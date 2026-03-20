# Plan: Mock Contract Events & Tasks cho Demo Sếp
Created: 2026-03-20T14:00:00+07:00
Updated: 2026-03-20T14:11:00+07:00
Status: ✅ Complete (All phases executed 20/03/2026)

## Overview
Tạo **full mock data** cho HĐ-2026-0003 (Lê Thị Y Linh, Combo 68M) để demo sếp.
Contract Detail page sẽ hiển thị đầy đủ MỌI section UI:

- ✅ **Event Timeline** — 4 events (Chụp → Cưới → Hậu kỳ → Giao SP)
- ✅ **Work Tasks** — 9 tasks gắn vào events
- ✅ **Checklists** — 10 items chuẩn bị
- ✅ **Payment Plans** — 3 đợt thanh toán (2 đã trả)
- ✅ **Inventory Reservations** — 2 trang phục
- ✅ **Contract Notes** — 3 ghi chú timeline
- ✅ **Delivery Date** — Update ngày giao

## Target Contract
```
CONTRACT_ID = b9dcca30-de58-46d1-ab3a-44b610a5bbb2
CONTRACT_CODE = HĐ-2026-0003
CUSTOMER = Lê Thị Y Linh
SERVICE = Combo (68,000,000 VND)
STATUS = Đang thực hiện
PAID = 35,000,000 / 68,000,000 (sau giảm 5M → còn 28M)
```

### Existing Data (Không cần mock)
- ✅ 3 contract_items (Combo cưới 55M + Cameraman 8M + Vest 5M)
- ✅ 2 payments (Cọc 20M + Đợt 2: 15M)

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 01 | ~~Xác định Contract~~ | ✅ Done | — |
| 02 | INSERT 4 events | ✅ Done | 2 min |
| 03 | INSERT 9 tasks | ✅ Done | 2 min |
| 04 | INSERT 10 checklists | ✅ Done | 2 min |
| 05 | INSERT 3 payment plans | ✅ Done | 2 min |
| 06 | INSERT 2 reservations + delivery_date | ✅ Done | 2 min |
| 07 | INSERT 3 notes | ✅ Done | 1 min |
| 08 | Verify trên browser | ✅ Done | 5 min |

**Tổng:** ~16 phút | ✅ Hoàn tất

## UI Coverage Map

| UI Component | Data Source | Phase |
|---|---|---|
| WorkflowStepper | contract_events | 02 |
| EventTimeline | contract_events + work_tasks | 02, 03 |
| DrawerEventTimeline | contract_events | 02 |
| ChecklistBlock | work_tasks | 03 |
| ContractChecklistManager | contract_checklists | 04 |
| FinancialDashboard (lịch TT) | payment_plans | 05 |
| CostumesBlock | inventory_reservations | 06 |
| SummaryCard (delivery_date) | contracts | 06 |
| NotesTimeline | contract_notes | 07 |

## Quick Commands
- Execute all: `/code` (chạy Phase 02→07 liên tục qua Supabase MCP)
- Verify: `/run` + browser check
