# Printing Workflow - Business Logic & Actions

## Status Transitions & Actions

### 1️⃣ **cho_xu_ly → dat_coc** (Thu đặt cọc)

**Staff Action:** Nhập số tiền cọc & payment method

**System Actions:**
```typescript
async function recordDepositPayment(orderId, depositAmount, paymentMethod) {
  // 1. Create receipt
  const receipt = await createReceipt({
    receipt_type: 'sale_receipt',
    receipt_amount: depositAmount,
    payment_method: paymentMethod,
    category: 'Đặt cọc đơn in'
  });
  
  // 2. Link to order
  await createOrderPayment({
    order_id: orderId,
    payment_type: 'deposit',
    amount: depositAmount,
    receipt_id: receipt.id
  });
  
  // 3. Update order status
  await updateOrder(orderId, {
    status: 'dat_coc',
    deposit_amount: depositAmount,
    paid_amount: depositAmount,
    payment_status: depositAmount >= total ? 'paid' : 'partial'
  });
  
  // 4. Create receivable if partial
  if (depositAmount < totalAmount) {
    await createReceivable({
      order_id: orderId,
      amount: totalAmount - depositAmount,
      due_date: expectedDate
    });
  }
}
```

**UI:**
- Modal: `DepositPaymentModal`
- Fields: Số tiền cọc, Phương thức thanh toán, Ghi chú
- Validation: `0 < deposit <= total_amount`

---

### 2️⃣ **dat_coc → dang_in** (Bắt đầu in)

**Staff Action:** Click "Bắt đầu in"

**System Actions:**
```typescript
async function startProduction(orderId) {
  const order = await getOrder(orderId);
  
  // 1. Check if materials available
  const items = order.items; // [{item_id, quantity}, ...]
  for (const item of items) {
    const available = await getAvailableStock(item.item_id);
    if (available < item.quantity) {
      throw new Error(`Vật tư ${item.name} không đủ tồn`);
    }
  }
  
  // 2. Reserve inventory
  for (const item of items) {
    await createReservation({
      item_id: item.item_id,
      order_id: orderId,
      reserved_quantity: item.quantity,
      expires_at: addDays(order.expected_date, 7) // Auto-release after 7 days
    });
  }
  
  // 3. Update order
  await updateOrder(orderId, {
    status: 'dang_in',
    inventory_status: 'reserved'
  });
  
  // 4. Audit log
  await fireAuditLog({
    action: 'START_PRODUCTION',
    tableName: 'printing_orders',
    recordId: orderId,
    description: `Bắt đầu in đơn, đã reserve ${items.length} vật tư`
  });
}
```

**UI:**
- Confirm dialog with material availability check
- Show reserved items table

---

### 3️⃣ **dang_in → da_in** (Hoàn thành in)

**Staff Action:** Click "Hoàn thành in" (có option manual adjust)

**System Actions:**
```typescript
async function completeProduction(orderId, options = { manualStockOut: false, adjustedItems: [] }) {
  const order = await getOrder(orderId);
  const reservations = await getReservations(orderId);
  
  if (options.manualStockOut) {
    // Manual mode: Staff đã xuất kho rồi, chỉ cần update status
    await updateOrder(orderId, {
      status: 'da_in',
      inventory_status: 'stocked_out'
    });
    
    // Mark reservations as fulfilled
    await updateReservations(reservations, { status: 'fulfilled' });
    return;
  }
  
  // Auto mode: System xuất kho theo reservation
  const itemsToStockOut = options.adjustedItems.length > 0 
    ? options.adjustedItems 
    : reservations.map(r => ({ item_id: r.item_id, quantity: r.reserved_quantity }));
  
  // 1. Stock out each item
  for (const item of itemsToStockOut) {
    const reservation = reservations.find(r => r.item_id === item.item_id);
    
    const txn = await stockOutAtomic({
      item_id: item.item_id,
      quantity: item.quantity,
      source_type: 'printing_order',
      source_id: orderId,
      reason: `Xuất cho đơn in #${order.id.slice(0, 8)}`,
      notes: `Auto stock out khi hoàn thành in`
    });
    
    // Link transaction to reservation
    if (reservation) {
      await updateTransaction(txn.id, { reservation_id: reservation.id });
      await updateReservation(reservation.id, { status: 'fulfilled' });
    }
  }
  
  // 2. Update order
  await updateOrder(orderId, {
    status: 'da_in',
    inventory_status: 'stocked_out'
  });
  
  // 3. Audit
  await fireAuditLog({
    action: 'COMPLETE_PRODUCTION',
    tableName: 'printing_orders',
    recordId: orderId,
    description: `Hoàn thành in, đã xuất ${itemsToStockOut.length} vật tư`,
    newData: { items: itemsToStockOut }
  });
}
```

**UI:**
- Default: Auto stock out button
- Advanced: "Chỉnh sửa vật tư" → Show adjustable table
- Option: "Tôi đã xuất kho thủ công" checkbox

---

### 4️⃣ **da_in → da_giao** (Giao hàng)

**Staff Action:** Click "Đã giao hàng"

**System Actions:**
```typescript
async function markDelivered(orderId, deliveryDate = new Date()) {
  await updateOrder(orderId, {
    status: 'da_giao',
    delivered_at: deliveryDate
  });
  
  // Check if fully paid
  const summary = await getPaymentSummary(orderId);
  if (summary.remaining > 0) {
    // Send payment reminder (optional)
    await notifyPaymentDue(orderId, summary.remaining);
  }
}
```

**UI:**
- Simple confirm dialog
- Show payment status warning if unpaid

---

### 5️⃣ **da_giao → hoan_thanh** (Thu tất toán)

**Staff Action:** Nhập số tiền thanh toán cuối

**System Actions:**
```typescript
async function recordFinalPayment(orderId, finalAmount, paymentMethod) {
  const summary = await getPaymentSummary(orderId);
  
  if (finalAmount < summary.remaining) {
    throw new Error('Số tiền thanh toán không đủ tất toán');
  }
  
  // 1. Create receipt
  const receipt = await createReceipt({
    receipt_type: 'sale_receipt',
    receipt_amount: finalAmount,
    payment_method: paymentMethod,
    category: 'Thanh toán đơn in'
  });
  
  // 2. Link to order
  await createOrderPayment({
    order_id: orderId,
    payment_type: 'final',
    amount: finalAmount,
    receipt_id: receipt.id
  });
  
  // 3. Update order
  await updateOrder(orderId, {
    status: 'hoan_thanh',
    paid_amount: summary.total_paid + finalAmount,
    payment_status: 'paid'
  });
  
  // 4. Clear receivable
  await clearReceivable(orderId);
}
```

**UI:**
- Modal: `FinalPaymentModal`
- Auto-fill remaining amount
- Show payment history

---

### ❌ **Hủy đơn (Cancellation) - Rollback Logic**

**Staff Action:** Click "Hủy đơn" + nhập lý do

**System Actions:**
```typescript
async function cancelOrder(orderId, reason, options = { refundAmount: 0, refundMethod: 'cash' }) {
  const order = await getOrder(orderId);
  const currentStatus = order.status;
  
  // 1. Rollback inventory based on current status
  if (order.inventory_status === 'stocked_out') {
    // Đã xuất kho → Nhập lại (rollback stock out)
    const txns = await getInventoryTransactions({ source_id: orderId });
    
    for (const txn of txns) {
      await stockInAtomic({
        item_id: txn.item_id,
        quantity: txn.quantity,
        unit_cost: txn.unit_cost || 0,
        reason: `Hoàn trả do hủy đơn #${orderId.slice(0, 8)}`,
        notes: `Rollback transaction ${txn.id}`,
        is_rollback: true,
        rolled_back_txn_id: txn.id
      });
    }
  } else if (order.inventory_status === 'reserved') {
    // Chỉ reserve → Cancel reservation
    await cancelReservations({ order_id: orderId });
  }
  
  // 2. Handle refund if customer paid
  const summary = await getPaymentSummary(orderId);
  if (summary.total_paid > 0 && options.refundAmount > 0) {
    // Create refund expense
    const refund = await createExpense({
      expense_type: 'refund',
      amount: options.refundAmount,
      payment_method: options.refundMethod,
      category: 'Hoàn tiền hủy đơn',
      notes: `Refund đơn in #${orderId.slice(0, 8)}`
    });
    
    // Link refund to order
    await createOrderPayment({
      order_id: orderId,
      payment_type: 'refund',
      amount: -options.refundAmount, // Negative
      expense_id: refund.id
    });
  }
  
  // 3. Update order
  await updateOrder(orderId, {
    status: 'huy_don',
    inventory_status: 'cancelled',
    cancelled_at: new Date(),
    cancellation_reason: reason
  });
  
  // 4. Audit
  await fireAuditLog({
    action: 'CANCEL_ORDER',
    tableName: 'printing_orders',
    recordId: orderId,
    description: `Hủy đơn: ${reason}`,
    severity: 'WARNING',
    oldData: { status: currentStatus, inventory_status: order.inventory_status },
    newData: { refund: options.refundAmount }
  });
}
```

**UI:**
- Modal: `CancelOrderModal`
- Fields:
  - Lý do hủy (required)
  - Checkbox: "Đã xuất kho" (show rollback warning)
  - Refund section: Số tiền hoàn, Phương thức
- Warning: Red alert về ảnh hưởng inventory

---

## Additional Features

### 🔧 Manual Stock Out Override

```typescript
// Staff có thể xuất kho thủ công bất kỳ lúc nào
async function manualStockOutForOrder(orderId, items: {item_id, quantity}[]) {
  for (const item of items) {
    await stockOutAtomic({
      item_id: item.item_id,
      quantity: item.quantity,
      source_type: 'printing_order',
      source_id: orderId,
      reason: 'Xuất kho thủ công'
    });
  }
  
  // Update order inventory status
  await updateOrder(orderId, { inventory_status: 'stocked_out' });
}
```

### 📊 Receivables Report

```sql
-- Outstanding receivables
SELECT 
  o.id,
  o.contract_code,
  o.customer_name,
  o.total_amount,
  ps.total_paid,
  ps.remaining as amount_due,
  o.expected_date as due_date,
  DATE_PART('day', NOW() - o.expected_date) as days_overdue
FROM printing_orders o
JOIN order_payment_summary ps ON o.id = ps.order_id
WHERE ps.remaining > 0 
  AND o.status NOT IN ('huy_don', 'hoan_thanh')
ORDER BY days_overdue DESC;
```

---

## Implementation Priority

### Phase 1: Core (Week 1-2) ⚡
- [ ] Database migrations
- [ ] Basic status flow (cho_xu_ly → dat_coc → dang_in → da_in)
- [ ] Deposit payment modal
- [ ] Inventory reservation on start production

### Phase 2: Stock Out (Week 2-3) 🔨
- [ ] Auto stock out on complete
- [ ] Manual stock out override
- [ ] Adjust items before stock out

### Phase 3: Payment & Delivery (Week 3-4) 💰
- [ ] Final payment modal
- [ ] Payment history view
- [ ] Receivables tracking

### Phase 4: Cancellation (Week 4-5) ❌
- [ ] Cancel order modal
- [ ] Inventory rollback logic
- [ ] Refund handling

### Phase 5: Reporting (Week 5-6) 📊
- [ ] Payment summary widgets
- [ ] Receivables report
- [ ] Inventory reservation dashboard
