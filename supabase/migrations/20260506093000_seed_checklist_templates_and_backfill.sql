-- Restore operational checklist templates used by the contracts "Thong tin" badge.
-- Without templates, post-save automation generates zero contract_checklists and the
-- contracts table only shows the neutral clock/dash placeholder.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_templates_service_stage_category_item
  ON public.checklist_templates(service_type, event_stage, category, item_name);

WITH templates(service_type, event_stage, category, item_name, sort_order) AS (
  VALUES
    ('studio', 'Ngày chụp', 'Lễ tân', 'Xác nhận concept và gói chụp', 10),
    ('studio', 'Ngày chụp', 'Lễ tân', 'Xác nhận lịch hẹn và địa điểm', 20),
    ('studio', 'Ngày chụp', 'Makeup', 'Xác nhận makeup và trang phục', 30),
    ('studio', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('studio', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('ngay_cuoi', 'Ngày cưới', 'Lễ tân', 'Xác nhận timeline ngày cưới', 10),
    ('ngay_cuoi', 'Ngày cưới', 'Lễ tân', 'Xác nhận địa điểm và người liên hệ', 20),
    ('ngay_cuoi', 'Ngày cưới', 'Makeup', 'Xác nhận lịch makeup', 30),
    ('ngay_cuoi', 'Ngày cưới', 'Photo', 'Xác nhận shot list gia đình', 40),
    ('ngay_cuoi', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 50),
    ('ngay_cuoi', 'Bàn giao', 'Photo', 'Xác nhận file/album bàn giao', 60),

    ('combo', 'Ngày chụp', 'Lễ tân', 'Xác nhận lịch chụp pre-wedding', 10),
    ('combo', 'Ngày cưới', 'Lễ tân', 'Xác nhận timeline ngày cưới', 20),
    ('combo', 'Ngày cưới', 'Makeup', 'Xác nhận makeup và trang phục', 30),
    ('combo', 'Ngày cưới', 'Photo', 'Xác nhận shot list gia đình', 40),
    ('combo', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 50),
    ('combo', 'Bàn giao', 'Photo', 'Xác nhận file/album bàn giao', 60),

    ('baby', 'Ngày chụp', 'Lễ tân', 'Xác nhận tuổi bé và tình trạng sức khỏe', 10),
    ('baby', 'Ngày chụp', 'Lễ tân', 'Xác nhận concept và phụ kiện', 20),
    ('baby', 'Ngày chụp', 'Photo', 'Xác nhận lịch ăn/ngủ của bé', 30),
    ('baby', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('baby', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('gia_dinh', 'Ngày chụp', 'Lễ tân', 'Xác nhận số thành viên tham gia', 10),
    ('gia_dinh', 'Ngày chụp', 'Lễ tân', 'Xác nhận concept và trang phục', 20),
    ('gia_dinh', 'Ngày chụp', 'Photo', 'Xác nhận địa điểm chụp', 30),
    ('gia_dinh', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('gia_dinh', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('sinh_nhat', 'Ngày chụp', 'Lễ tân', 'Xác nhận timeline tiệc sinh nhật', 10),
    ('sinh_nhat', 'Ngày chụp', 'Lễ tân', 'Xác nhận địa điểm và người liên hệ', 20),
    ('sinh_nhat', 'Ngày chụp', 'Photo', 'Xác nhận nhân vật chính và khoảnh khắc cần chụp', 30),
    ('sinh_nhat', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('sinh_nhat', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('bau', 'Ngày chụp', 'Lễ tân', 'Xác nhận tuần thai và tình trạng sức khỏe', 10),
    ('bau', 'Ngày chụp', 'Lễ tân', 'Xác nhận concept và trang phục', 20),
    ('bau', 'Ngày chụp', 'Makeup', 'Xác nhận makeup và lịch chuẩn bị', 30),
    ('bau', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('bau', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('concept', 'Ngày chụp', 'Lễ tân', 'Xác nhận moodboard/concept', 10),
    ('concept', 'Ngày chụp', 'Lễ tân', 'Xác nhận đạo cụ và bối cảnh', 20),
    ('concept', 'Ngày chụp', 'Makeup', 'Xác nhận makeup và styling', 30),
    ('concept', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('concept', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('couple', 'Ngày chụp', 'Lễ tân', 'Xác nhận concept và địa điểm', 10),
    ('couple', 'Ngày chụp', 'Lễ tân', 'Xác nhận trang phục của cặp đôi', 20),
    ('couple', 'Ngày chụp', 'Photo', 'Xác nhận shot list chính', 30),
    ('couple', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('couple', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('ky_yeu', 'Ngày chụp', 'Lễ tân', 'Xác nhận lớp/nhóm và số lượng người', 10),
    ('ky_yeu', 'Ngày chụp', 'Lễ tân', 'Xác nhận lịch trình và địa điểm', 20),
    ('ky_yeu', 'Ngày chụp', 'Photo', 'Xác nhận danh sách ảnh nhóm/cá nhân', 30),
    ('ky_yeu', 'Hậu kỳ', 'Photo', 'Chốt danh sách ảnh cần chỉnh', 40),
    ('ky_yeu', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50),

    ('media', 'Ngày sản xuất', 'Lễ tân', 'Xác nhận brief nội dung', 10),
    ('media', 'Ngày sản xuất', 'Lễ tân', 'Xác nhận bối cảnh và người phụ trách', 20),
    ('media', 'Ngày sản xuất', 'Photo', 'Xác nhận shot list/kịch bản', 30),
    ('media', 'Hậu kỳ', 'Photo', 'Chốt phiên bản duyệt', 40),
    ('media', 'Bàn giao', 'Photo', 'Xác nhận định dạng bàn giao', 50),

    ('khac', 'Thực hiện', 'Lễ tân', 'Xác nhận yêu cầu dịch vụ', 10),
    ('khac', 'Thực hiện', 'Lễ tân', 'Xác nhận lịch hẹn và địa điểm', 20),
    ('khac', 'Thực hiện', 'Photo', 'Xác nhận hạng mục cần bàn giao', 30),
    ('khac', 'Hậu kỳ', 'Photo', 'Chốt danh sách nội dung cần xử lý', 40),
    ('khac', 'Bàn giao', 'Photo', 'Xác nhận hình thức bàn giao sản phẩm', 50)
)
INSERT INTO public.checklist_templates (
  service_type,
  event_stage,
  category,
  item_name,
  sort_order,
  is_active
)
SELECT
  service_type,
  event_stage,
  category,
  item_name,
  sort_order,
  true
FROM templates
ON CONFLICT (service_type, event_stage, category, item_name) DO UPDATE
SET sort_order = EXCLUDED.sort_order,
    is_active = true;

WITH missing_checklists AS (
  SELECT c.id, c.service_type::text AS service_type
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND c.status <> 'da_huy'
    AND NOT EXISTS (
      SELECT 1
      FROM public.contract_checklists cc
      WHERE cc.contract_id = c.id
    )
)
INSERT INTO public.contract_checklists (
  contract_id,
  event_stage,
  category,
  item_name,
  is_completed
)
SELECT
  c.id,
  ct.event_stage,
  ct.category,
  ct.item_name,
  false
FROM missing_checklists c
JOIN public.checklist_templates ct
  ON ct.service_type = c.service_type
 AND ct.is_active = true
ORDER BY c.id, ct.sort_order
ON CONFLICT DO NOTHING;

COMMIT;
