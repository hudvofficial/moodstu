# Phase 03: INSERT Mock Tasks (8-10 tasks)
Status: ⬜ Pending
Dependencies: Phase 02 (EVENT_IDs)

## Objective
Tạo work_tasks gắn vào từng event, mô phỏng phân công nhân sự studio thực tế.

## Mock Data Design

### Tasks cho Event 1: Ngày Chụp (ngay_chup)
| # | work_type | status | deadline | cost | notes |
|---|-----------|--------|----------|------|-------|
| 1 | chup_anh | dang_lam | 2026-04-10 | 3000000 | Photographer chính — Anh Minh |
| 2 | cameraman | dang_lam | 2026-04-10 | 2500000 | Quay phim behind-the-scene |
| 3 | makeup | hoan_thanh | 2026-04-10 | 2000000 | Makeup artist — Chị Lan |
| 4 | tro_ly | chua_lam | 2026-04-10 | 500000 | Trợ lý set up concept |

### Tasks cho Event 2: Ngày Tổ Chức (ngay_to_chuc)
| # | work_type | status | deadline | cost | notes |
|---|-----------|--------|----------|------|-------|
| 5 | chup_anh | chua_lam | 2026-05-15 | 5000000 | 2 photographer (lễ + tiệc) |
| 6 | quay_phim | chua_lam | 2026-05-15 | 4000000 | 2 cameraman (ceremony + highlight) |

### Tasks cho Event 3: Hậu Kỳ (hau_ky)
| # | work_type | status | deadline | cost | notes |
|---|-----------|--------|----------|------|-------|
| 7 | hau_ky_anh | chua_lam | 2026-06-01 | 3000000 | Retouch 200 ảnh |
| 8 | dung_phim | chua_lam | 2026-06-15 | 4000000 | Highlight 3' + Full film 20' |

### Tasks cho Event 4: Giao Sản Phẩm (giao_san_pham)
| # | work_type | status | deadline | cost | notes |
|---|-----------|--------|----------|------|-------|
| 9 | khac | chua_lam | 2026-07-01 | 0 | Kiểm tra chất lượng in + đóng gói |

## SQL Template
```sql
-- Thay <EVENT_1_ID>, <EVENT_2_ID>, ... bằng ID thực từ Phase 02
INSERT INTO work_tasks (contract_id, event_id, work_type, status, deadline, cost, notes)
VALUES
  -- Event 1: Ngày chụp
  ('<CONTRACT_ID>', '<EVENT_1_ID>', 'chup_anh', 'dang_lam', '2026-04-10', 3000000, 'Photographer chính — Anh Minh'),
  ('<CONTRACT_ID>', '<EVENT_1_ID>', 'cameraman', 'dang_lam', '2026-04-10', 2500000, 'Quay phim behind-the-scene'),
  ('<CONTRACT_ID>', '<EVENT_1_ID>', 'makeup', 'hoan_thanh', '2026-04-10', 2000000, 'Makeup artist — Chị Lan'),
  ('<CONTRACT_ID>', '<EVENT_1_ID>', 'tro_ly', 'chua_lam', '2026-04-10', 500000, 'Trợ lý set up concept'),
  -- Event 2: Ngày tổ chức
  ('<CONTRACT_ID>', '<EVENT_2_ID>', 'chup_anh', 'chua_lam', '2026-05-15', 5000000, '2 photographer (lễ + tiệc)'),
  ('<CONTRACT_ID>', '<EVENT_2_ID>', 'quay_phim', 'chua_lam', '2026-05-15', 4000000, '2 cameraman (ceremony + highlight)'),
  -- Event 3: Hậu kỳ
  ('<CONTRACT_ID>', '<EVENT_3_ID>', 'hau_ky_anh', 'chua_lam', '2026-06-01', 3000000, 'Retouch 200 ảnh'),
  ('<CONTRACT_ID>', '<EVENT_3_ID>', 'dung_phim', 'chua_lam', '2026-06-15', 4000000, 'Highlight 3 phút + Full film 20 phút'),
  -- Event 4: Giao sản phẩm
  ('<CONTRACT_ID>', '<EVENT_4_ID>', 'khac', 'chua_lam', '2026-07-01', 0, 'Kiểm tra chất lượng in + đóng gói');
```

## Test Criteria
- [ ] EventTimeline hiện progress bar (VD: Event 1 = 1/4 = 25%)
- [ ] ChecklistBlock hiện danh sách tasks
- [ ] Total cost = 24,000,000 VND
- [ ] Mixed statuses: 1 hoàn thành, 2 đang làm, 6 chưa làm

---
Next Phase: [phase-04-insert-checklists.md](./phase-04-insert-checklists.md)
