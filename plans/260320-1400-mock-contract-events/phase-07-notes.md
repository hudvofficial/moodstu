# Phase 07: INSERT Contract Notes
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tạo 3 ghi chú timeline mô phỏng trao đổi trong quá trình thực hiện hợp đồng.

## Mock Data

| # | content | created_at | created_by |
|---|---------|------------|------------|
| 1 | Khách yêu cầu concept vintage, tone màu pastel. Cô dâu thích style Hàn Quốc. | 2026-02-15 10:30 | (current user) |
| 2 | Đã book studio Đà Lạt ngày 10-11/04. Xác nhận với chủ homestay. Chuẩn bị 3 bộ trang phục (2 váy + 1 vest). | 2026-03-01 14:00 | (current user) |
| 3 | Khách muốn thêm 1 clip TikTok 30s từ behind-the-scene. Đã báo giá phát sinh 2M, khách đồng ý. | 2026-03-15 16:45 | (current user) |

## SQL
```sql
-- Need to get current user ID (or any employee ID)
INSERT INTO contract_notes (contract_id, content, created_by, created_at)
VALUES
  ('b9dcca30-de58-46d1-ab3a-44b610a5bbb2',
   'Khách yêu cầu concept vintage, tone màu pastel. Cô dâu thích style Hàn Quốc.',
   (SELECT id FROM auth.users LIMIT 1),
   '2026-02-15T10:30:00+07:00'),
  ('b9dcca30-de58-46d1-ab3a-44b610a5bbb2',
   'Đã book studio Đà Lạt ngày 10-11/04. Xác nhận với chủ homestay. Chuẩn bị 3 bộ trang phục (2 váy + 1 vest).',
   (SELECT id FROM auth.users LIMIT 1),
   '2026-03-01T14:00:00+07:00'),
  ('b9dcca30-de58-46d1-ab3a-44b610a5bbb2',
   'Khách muốn thêm 1 clip TikTok 30s từ behind-the-scene. Đã báo giá phát sinh 2M, khách đồng ý.',
   (SELECT id FROM auth.users LIMIT 1),
   '2026-03-15T16:45:00+07:00');
```

## Test Criteria
- [ ] NotesTimeline hiện 3 ghi chú
- [ ] Sắp xếp theo thời gian (cũ → mới)
- [ ] Mỗi note có timestamp + content

---
Next Phase: [phase-08-verify.md](./phase-08-verify.md)
