# Printing Workflow - Visual Diagrams

## State Machine Diagram

```
┌─────────────┐
│  cho_xu_ly  │ ← Order created
│ (Chờ xử lý) │
└──────┬──────┘
       │ [Thu đặt cọc]
       │ • Create receipt (deposit)
       │ • Create receivable (remaining)
       ↓
┌─────────────┐
│   dat_coc   │
│ (Đã đặt cọc)│ 💰 Deposit recorded
└──────┬──────┘
       │ [Bắt đầu in]
       │ • Reserve inventory
       │ • Check availability
       ↓
┌─────────────┐
│   dang_in   │
│  (Đang in)  │ 🔒 Inventory reserved
└──────┬──────┘
       │ [Hoàn thành in]
       │ • Stock out (auto/manual)
       │ • Fulfill reservations
       ↓
┌─────────────┐
│    da_in    │
│ (Đã in xong)│ 📦 Stock deducted
└──────┬──────┘
       │ [Giao hàng]
       │ • Mark delivered
       │ • Send payment reminder
       ↓
┌─────────────┐
│   da_giao   │
│ (Đã giao)   │ 🚚 Delivered to customer
└──────┬──────┘
       │ [Thu tất toán]
       │ • Create receipt (final)
       │ • Clear receivable
       ↓
┌─────────────┐
│ hoan_thanh  │
│(Hoàn thành) │ ✅ Fully paid & closed
└─────────────┘

      ❌ Any status → [Hủy đơn]
                       ↓
                 ┌─────────────┐
                 │   huy_don   │
                 │    (Hủy)    │
                 └─────────────┘
                 • Rollback inventory
                 • Refund payments
                 • Cancel reservations
```

## Payment Flow

```
Order Total: 1,000,000 VND
    │
    ├─→ Deposit (dat_coc): 300,000 VND
    │   └─→ Receivable created: 700,000 VND
    │
    ├─→ Status: dang_in, da_in, da_giao
    │   └─→ Receivable still: 700,000 VND
    │
    └─→ Final Payment (hoan_thanh): 700,000 VND
        └─→ Receivable cleared: 0 VND
        └─→ Order status: hoan_thanh ✅
```

## Inventory Flow

```
Available Stock: 100 units
    │
    ├─→ Reserve (dang_in): -20 units
    │   ├─→ Current: 100
    │   ├─→ Reserved: 20
    │   └─→ Available: 80 ⚠️
    │
    └─→ Stock Out (da_in): -20 units
        ├─→ Current: 80 ✅
        ├─→ Reserved: 0
        └─→ Available: 80

If Cancelled (huy_don):
    └─→ Rollback Stock Out: +20 units
        └─→ Current: 100 (restored)
```

## Data Model Relationships

```
┌──────────────────┐
│ printing_orders  │
│                  │
│ - id             │
│ - status         │────┐
│ - total_amount   │    │
│ - paid_amount    │    │
│ - inventory_     │    │
│   status         │    │
└──────┬───────────┘    │
       │                │
       ├────────────────┼──────────────┐
       │                │              │
       ↓                ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│order_payments│ │inventory_    │ │inventory_            │
│              │ │reservations  │ │transactions          │
│ - order_id   │ │              │ │                      │
│ - payment_   │ │ - order_id   │ │ - source_id          │
│   type       │ │ - item_id    │ │   (= order_id)       │
│ - amount     │ │ - reserved_  │ │ - reservation_id ───→│
│ - receipt_id │ │   quantity   │ │ - quantity           │
└──────┬───────┘ │ - status     │ │ - is_rollback        │
       │         └──────┬───────┘ └──────────────────────┘
       │                │
       ↓                ↓
┌──────────────┐ ┌──────────────┐
│  receipts    │ │inventory_    │
│              │ │items         │
│ - id         │ │              │
│ - amount     │ │ - id         │
│ - payment_   │ │ - current_   │
│   method     │ │   stock      │
└──────────────┘ └──────────────┘
```

## Example Scenario: Complete Order Lifecycle

### Initial State
```
Order #ORD001
├─ Total: 2,000,000 VND
├─ Items: 
│  ├─ Mực in: 50 units
│  └─ Giấy A4: 100 sheets
└─ Status: cho_xu_ly
```

### Step 1: Deposit
```
Action: Thu đặt cọc 500,000 VND (cash)

Result:
├─ Receipt: REC_001 (500,000 VND)
├─ Order Payment: {order: ORD001, type: deposit, amount: 500k}
├─ Receivable: 1,500,000 VND
└─ Status: dat_coc 💰
```

### Step 2: Start Production
```
Action: Bắt đầu in

Check Availability:
├─ Mực in: 100 available → Reserve 50 ✅
└─ Giấy A4: 200 available → Reserve 100 ✅

Result:
├─ Reservation #1: {item: Mực in, qty: 50, order: ORD001}
├─ Reservation #2: {item: Giấy A4, qty: 100, order: ORD001}
├─ Available stock:
│  ├─ Mực in: 100 - 50 = 50 available
│  └─ Giấy A4: 200 - 100 = 100 available
└─ Status: dang_in 🔒
```

### Step 3: Complete Production
```
Action: Hoàn thành in (Auto stock out)

Result:
├─ Transaction #1: Stock out Mực in -50 (from 100 → 50)
├─ Transaction #2: Stock out Giấy A4 -100 (from 200 → 100)
├─ Reservations: fulfilled
├─ Inventory status: stocked_out
└─ Status: da_in 📦
```

### Step 4: Deliver
```
Action: Giao hàng

Result:
├─ Delivered_at: 2025-05-24
├─ Payment reminder: 1,500,000 VND due
└─ Status: da_giao 🚚
```

### Step 5: Final Payment
```
Action: Thu tất toán 1,500,000 VND (transfer)

Result:
├─ Receipt: REC_002 (1,500,000 VND)
├─ Order Payment: {order: ORD001, type: final, amount: 1,500k}
├─ Total paid: 500k + 1,500k = 2,000,000 VND ✅
├─ Receivable cleared: 0 VND
└─ Status: hoan_thanh ✅
```

## Cancellation Scenario

### Cancel after stock out (da_in → huy_don)

```
Order #ORD002 (Status: da_in)
├─ Already stocked out:
│  ├─ Mực in: -30 units
│  └─ Giấy A4: -50 sheets
├─ Paid deposit: 300,000 VND
└─ Customer requests cancellation

Action: Hủy đơn (Refund 300k)

Rollback Steps:
├─ 1. Reverse stock out:
│  ├─ Stock in Mực in: +30 (restore)
│  └─ Stock in Giấy A4: +50 (restore)
│  └─ Mark as is_rollback: true
│
├─ 2. Create refund:
│  ├─ Expense: -300,000 VND
│  └─ Order Payment: {type: refund, amount: -300k}
│
└─ 3. Update order:
   ├─ Status: huy_don ❌
   ├─ Inventory status: cancelled
   └─ Cancellation reason: "Khách hàng hủy"

Result:
✅ Inventory restored
✅ Payment refunded
✅ Order cancelled
```
