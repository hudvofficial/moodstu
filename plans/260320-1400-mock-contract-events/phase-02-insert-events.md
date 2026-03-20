# Phase 02: INSERT Mock Events (4 events)
Status: ⬜ Pending
Dependencies: Phase 01 (CONTRACT_ID)

## Objective
Tạo 4 contract_events cho CONTRACT_ID, mô phỏng workflow thực tế studio áo cưới.

## Mock Data Design

### Event 1: Ngày Chụp (📸 Pre-wedding shoot)
```json
{
  "event_type": "ngay_chup",
  "title": "Chụp Pre-wedding Đà Lạt",
  "event_date": "2026-04-10",
  "end_date": "2026-04-11",
  "location": "Đà Lạt",
  "status": "dang_lam",
  "notes": "Chụp outdoor + studio. Chuẩn bị 3 bộ trang phục."
}
```

### Event 2: Ngày Tổ Chức (💒 Wedding day)
```json
{
  "event_type": "ngay_to_chuc",
  "title": "Tiệc cưới nhà hàng Diamond Palace",
  "event_date": "2026-05-15",
  "end_date": "2026-05-15",
  "location": "Diamond Palace, Q.7, TP.HCM",
  "status": "chua_lam",
  "notes": "Tiệc tối 150 khách. Setup 14h, tiệc bắt đầu 18h."
}
```

### Event 3: Hậu Kỳ (✏️ Post-production)
```json
{
  "event_type": "hau_ky",
  "title": "Chỉnh sửa ảnh + dựng phim",
  "event_date": "2026-05-20",
  "end_date": "2026-06-15",
  "location": null,
  "status": "chua_lam",
  "notes": "200 ảnh retouch + 1 clip highlight 3 phút + 1 full film 20 phút"
}
```

### Event 4: Giao Sản Phẩm (📦 Delivery)
```json
{
  "event_type": "giao_san_pham",
  "title": "Giao album + USB + frame",
  "event_date": "2026-07-01",
  "end_date": null,
  "location": null,
  "status": "chua_lam",
  "notes": "2 album 30x40, 1 USB 64GB, 1 frame 60x90. Giao tận nơi."
}
```

## SQL Template
```sql
INSERT INTO contract_events (contract_id, event_type, title, event_date, end_date, location, status, notes)
VALUES
  ('<CONTRACT_ID>', 'ngay_chup', 'Chụp Pre-wedding Đà Lạt', '2026-04-10', '2026-04-11', 'Đà Lạt', 'dang_lam', 'Chụp outdoor + studio. Chuẩn bị 3 bộ trang phục.'),
  ('<CONTRACT_ID>', 'ngay_to_chuc', 'Tiệc cưới nhà hàng Diamond Palace', '2026-05-15', '2026-05-15', 'Diamond Palace, Q.7, TP.HCM', 'chua_lam', 'Tiệc tối 150 khách. Setup 14h, tiệc bắt đầu 18h.'),
  ('<CONTRACT_ID>', 'hau_ky', 'Chỉnh sửa ảnh + dựng phim', '2026-05-20', '2026-06-15', NULL, 'chua_lam', '200 ảnh retouch + 1 clip highlight 3 phút + 1 full film 20 phút'),
  ('<CONTRACT_ID>', 'giao_san_pham', 'Giao album + USB + frame', '2026-07-01', NULL, NULL, 'chua_lam', '2 album 30x40, 1 USB 64GB, 1 frame 60x90. Giao tận nơi.')
RETURNING id, event_type;
```

## Test Criteria
- [ ] 4 events xuất hiện trong EventTimeline
- [ ] DrawerEventTimeline hiện đúng 4 bước stepper
- [ ] WorkflowStepper hiện progress

---
Next Phase: [phase-03-insert-tasks.md](./phase-03-insert-tasks.md)
