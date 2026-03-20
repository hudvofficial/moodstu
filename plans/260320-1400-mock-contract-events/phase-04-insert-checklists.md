# Phase 04: INSERT Mock Checklists
Status: ⬜ Pending
Dependencies: Phase 01 (CONTRACT_ID)

## Objective
Tạo contract_checklists mô phỏng danh sách chuẩn bị cho ngày cưới.

## Mock Data Design

| # | event_stage | category | item_name | is_completed |
|---|-------------|----------|-----------|--------------|
| 1 | ngay_chup | Trang phục | Kiểm tra 3 bộ váy cưới | true |
| 2 | ngay_chup | Trang phục | Chuẩn bị phụ kiện (vương miện, giày) | true |
| 3 | ngay_chup | Concept | Họp concept với cặp đôi | true |
| 4 | ngay_chup | Logistics | Book xe đi Đà Lạt | false |
| 5 | ngay_to_chuc | Trang phục | Ướm đồ lần 2 (trước 2 tuần) | false |
| 6 | ngay_to_chuc | Logistics | Xác nhận địa điểm nhà hàng | false |
| 7 | ngay_to_chuc | Thiết bị | Kiểm tra thiết bị quay phim | false |
| 8 | hau_ky | Chỉnh sửa | Chọn 200 ảnh để retouch | false |
| 9 | giao_san_pham | In ấn | Đặt in album + frame | false |
| 10 | giao_san_pham | Giao hàng | Xác nhận địa chỉ giao | false |

## SQL Template
```sql
INSERT INTO contract_checklists (contract_id, event_stage, category, item_name, is_completed)
VALUES
  ('<CONTRACT_ID>', 'ngay_chup', 'Trang phục', 'Kiểm tra 3 bộ váy cưới', true),
  ('<CONTRACT_ID>', 'ngay_chup', 'Trang phục', 'Chuẩn bị phụ kiện (vương miện, giày)', true),
  ('<CONTRACT_ID>', 'ngay_chup', 'Concept', 'Họp concept với cặp đôi', true),
  ('<CONTRACT_ID>', 'ngay_chup', 'Logistics', 'Book xe đi Đà Lạt', false),
  ('<CONTRACT_ID>', 'ngay_to_chuc', 'Trang phục', 'Ướm đồ lần 2 (trước 2 tuần)', false),
  ('<CONTRACT_ID>', 'ngay_to_chuc', 'Logistics', 'Xác nhận địa điểm nhà hàng', false),
  ('<CONTRACT_ID>', 'ngay_to_chuc', 'Thiết bị', 'Kiểm tra thiết bị quay phim', false),
  ('<CONTRACT_ID>', 'hau_ky', 'Chỉnh sửa', 'Chọn 200 ảnh để retouch', false),
  ('<CONTRACT_ID>', 'giao_san_pham', 'In ấn', 'Đặt in album + frame', false),
  ('<CONTRACT_ID>', 'giao_san_pham', 'Giao hàng', 'Xác nhận địa chỉ giao', false);
```

## Test Criteria
- [ ] ContractChecklistManager hiện 10 items
- [ ] 3 items checked (30% progress)
- [ ] Grouped by event_stage

---
Next Phase: [phase-05-verify.md](./phase-05-verify.md)
