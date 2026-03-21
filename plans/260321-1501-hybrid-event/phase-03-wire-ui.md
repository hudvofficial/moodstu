# Phase 03: Wire UI + Integration
Status: ⬜ Pending
Dependencies: Phase 01 + Phase 02

## Objective
Kết nối AddEventModal vào UI hiện tại:
1. Button "+ Thêm lịch" trên Event Timeline header
2. Wire nút "Thêm sự kiện" trong Quick Actions Grid
3. Thêm chức năng xóa event custom trên timeline card

## Implementation Steps

### 1. Thêm button "+ Thêm lịch" vào Event Timeline header
- [ ] File: `components/contracts/detail/event-timeline.tsx`
- [ ] Vị trí: Header row (L118-128), giữa title và badge
- [ ] Props mới: `onAddEvent?: () => void`
- [ ] Code:
  ```tsx
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <CalendarDays size={16} className="text-primary" />
      <h3>Lịch trình sự kiện</h3>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={onAddEvent} className="btn btn-primary btn-sm">
        + Thêm lịch
      </button>
      <Badge>{completedCount}/{sorted.length}</Badge>
    </div>
  </div>
  ```

### 2. Thêm delete icon cho custom events trên card
- [ ] File: `components/contracts/detail/event-timeline.tsx`
- [ ] Chỉ hiện icon xóa khi `event.is_manual_date === true`
- [ ] Click → confirm → gọi `deleteContractEvent()`
- [ ] Không hiện cho template events

### 3. Wire Quick Actions Grid → AddEventModal
- [ ] File: `components/contracts/detail/contract-detail-client.tsx`
- [ ] Thay thế toast placeholder (L102-104) bằng `setShowAddEventModal(true)`
- [ ] Thêm state: `const [showAddEventModal, setShowAddEventModal] = useState(false)`
- [ ] Thêm modal: `<AddEventModal isOpen={showAddEventModal} .../>`

### 4. Wire Event Timeline → AddEventModal
- [ ] File: `components/contracts/detail/contract-detail-client.tsx`
- [ ] Pass `onAddEvent` prop xuống EventTimeline
- [ ] `onAddEvent={() => setShowAddEventModal(true)}`

## Files to Modify
- `components/contracts/detail/event-timeline.tsx` — EDIT (thêm button + delete icon)
- `components/contracts/detail/contract-detail-client.tsx` — EDIT (wire modal)

## Test Criteria
- [ ] Button "+ Thêm lịch" hiện trên timeline header (desktop + mobile)
- [ ] Click "+ Thêm lịch" → mở AddEventModal
- [ ] Click "Thêm sự kiện" trong Quick Actions → mở AddEventModal
- [ ] Tạo event → xuất hiện trên timeline
- [ ] Icon xóa CHỈ hiện trên custom events
- [ ] Xóa event → biến mất khỏi timeline
- [ ] Template events KHÔNG có icon xóa

## Guard Rails
- ⚠️ event-timeline.tsx hiện 266 lines — thêm ~20 lines → ~286 → CÓ THỂ cần split
  - Nếu > 250: tách helpers ra file riêng (event-timeline-helpers.ts)
- ⚠️ KHÔNG sửa EventTaskModal — giữ nguyên chức năng giao task
- ⚠️ Button style phải match ảnh anh gửi (nút nâu "+ Thêm lịch")

---
End of Plan
