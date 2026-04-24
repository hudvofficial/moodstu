# Phase 02: Optimistic UI for Costumes & Print Orders
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Costumes block và Print Orders block hiện tại **chờ API xong mới update UI**. Cần chuyển sang Optimistic UI pattern giống event-task-modal đã có.

**Hiện tại (Blocking):**
```
Click status → await API (500ms-1.5s) → revalidateContractCaches → re-fetch → UI update
```

**Sau fix (Optimistic):**
```
Click status → UI update TỨC THÌ → API chạy ngầm → rollback nếu lỗi
```

## Files to Modify

### 1. `components/contracts/detail/costumes-block.tsx`
- Thêm `"use client"` (nếu chưa có)
- Nhận `reservations` qua props, clone thành local state
- `onUpdate` callback: 
  1. Optimistic update local state
  2. Fire-and-forget server action
  3. Rollback nếu lỗi + toast error
- **KHÔNG gọi** `revalidateContractCaches()` sau khi update status

### 2. `components/contracts/detail/print-orders-block.tsx`
- Tương tự costumes-block:
  1. Local state cho orders
  2. Optimistic update on select
  3. Fire-and-forget server action
  4. Rollback + toast on error
- **KHÔNG gọi** `revalidateContractCaches()` sau khi update status

## Implementation Pattern (Copy từ event-task-modal:229-249)
```tsx
const handleStatusUpdate = async (itemId: string, newStatus: string) => {
  const previous = items.find(i => i.id === itemId)?.status;
  if (!previous || previous === newStatus) return;

  // 1. Optimistic update
  setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));

  // 2. Fire-and-forget
  serverAction(itemId, newStatus, contractId).then(result => {
    if (!result.success) {
      // Rollback
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: previous } : i));
      toast.error("Lỗi cập nhật: " + result.error);
    }
  });
};
```

## Implementation Steps
1. [ ] Convert costumes-block → client component with local state
2. [ ] Implement optimistic status handler cho costumes
3. [ ] Convert print-orders-block → client component with local state
4. [ ] Implement optimistic status handler cho print orders
5. [ ] Xóa `revalidateContractCaches()` khỏi cả 2 block's onUpdate

## Test Criteria
- [ ] Click status trên costume → UI update tức thì, không loading
- [ ] Click status trên print order → UI update tức thì, không loading
- [ ] Simulate API error → status rollback về cũ + toast lỗi
- [ ] Data consistency: reload page → status đúng với DB

---
Next Phase: phase-03-mute-echo.md
