-- 1. updated_at: user chốt "sửa được ghi chú của mình" → xưởng cần biết sửa lúc nào.
ALTER TABLE public.gallery_comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Unique cho upsert (image_id, client_identifier) — mỗi người 1 ghi chú/ảnh.
CREATE UNIQUE INDEX IF NOT EXISTS uq_gallery_comments_image_client
  ON public.gallery_comments (image_id, client_identifier);

-- 3. Backfill 148 ghi chú cũ. IDEMPOTENT — chạy lại nhiều lần vô hại.
--    client_identifier='legacy': không UUID nào trùng → khách không sửa/xoá nhầm ghi chú cũ.
--    author_name='Khách': dữ liệu cũ KHÔNG lưu tên, không bịa được.
--    created_at: lấy mốc gần đúng nhất đang có (selected_at → created_at của ảnh).
INSERT INTO public.gallery_comments
  (image_id, gallery_id, content, author_name, client_identifier, created_at, updated_at)
SELECT gi.id, gi.gallery_id, btrim(gi.client_note), 'Khách', 'legacy',
       COALESCE(gi.selected_at, gi.created_at, now()),
       COALESCE(gi.selected_at, gi.created_at, now())
FROM public.gallery_images gi
WHERE gi.client_note IS NOT NULL AND btrim(gi.client_note) <> ''
ON CONFLICT (image_id, client_identifier) DO NOTHING;