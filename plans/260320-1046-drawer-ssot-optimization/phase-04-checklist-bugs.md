# Phase 04: Drawer Checklist — Bug Fixes
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Fix 2 bugs critical: race condition + state drift. Giữ nguyên UI.

## Bug 1: Race Condition (Critical 🔴)
```typescript
// ❌ HIỆN TẠI: Không lock → double-click → 2 requests ngược nhau
const handleToggle = useCallback(async (item: ChecklistItem) => {
  const newVal = !item.is_completed;
  setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: newVal } : i));
  await toggleChecklist(item.id, newVal);  // ← Nếu click lần 2 trước khi xong???
}, []);
```

### Fix:
```typescript
const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

const handleToggle = useCallback(async (item: ChecklistItem) => {
  if (pendingIds.has(item.id)) return; // ← LOCK nếu đang toggle

  const newVal = !item.is_completed;
  setPendingIds(prev => new Set(prev).add(item.id));
  setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: newVal } : i));

  try {
    const res = await toggleChecklist(item.id, newVal);
    if (!res.success) { /* revert */ }
  } finally {
    setPendingIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
  }
}, [pendingIds]);
```

## Bug 2: State Drift (Warning 🟡)
```typescript
// ❌ HIỆN TẠI: Chỉ init 1 lần từ props
const [items, setItems] = useState(initialItems);  // ← Đóng/mở drawer → state cũ
```

### Fix:
```typescript
const [items, setItems] = useState(initialItems);

// Sync khi props thay đổi (SWR revalidate)
useEffect(() => {
  setItems(initialItems);
}, [initialItems]);
```

## Implementation Steps
1. [ ] Thêm `pendingIds` state
2. [ ] Wrap `handleToggle` với pending check
3. [ ] Thêm `useEffect` sync `initialItems` → `items`
4. [ ] Thêm visual indicator: item đang pending → opacity-50 + cursor-wait
5. [ ] Import `useEffect` (hiện chỉ có `useState, useCallback, useMemo`)

## Files to Modify
- `components/contracts/drawer-checklist.tsx`

## Test Criteria
- [ ] Double-click nhanh → chỉ 1 request
- [ ] Đóng drawer → mở lại → state đúng với DB
- [ ] Item đang toggle → hiện loading indicator
- [ ] Revert đúng khi API fail

---
Next Phase: phase-05 (Drawer Notes)
