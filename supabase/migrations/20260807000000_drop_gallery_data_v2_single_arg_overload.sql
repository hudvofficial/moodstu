-- Gỡ overload 1 tham số của get_gallery_data_v2.
--
-- Bối cảnh: 20260523100000 tạo get_gallery_data_v2(p_gallery_id uuid).
-- 20260529000001 dùng CREATE OR REPLACE nhưng ĐỔI chữ ký thành
-- (p_gallery_id uuid, p_limit int DEFAULT 200, p_offset int DEFAULT 0).
-- Postgres coi chữ ký khác = hàm MỚI → bản 1 tham số vẫn còn, thành overload ngoài ý muốn.
--
-- Hậu quả đo được: vì bản 3 tham số có DEFAULT, lời gọi chỉ truyền p_gallery_id
-- khớp CẢ HAI hàm → PostgREST trả HTTP 300 PGRST203
-- "Could not choose the best candidate function".
--
-- Không call-site nào dùng bản 1 tham số: app/actions/gallery-composite-actions.ts
-- luôn truyền đủ 3 tham số; không SQL function nào gọi nó.
--
-- Phụ: hàm overload khiến `supabase gen types` bỏ qua get_gallery_data_v2 hoàn toàn.
-- Gỡ xong thì `npm run db:types` sẽ đưa được nó vào types/database.types.ts.

DROP FUNCTION IF EXISTS public.get_gallery_data_v2(uuid);
