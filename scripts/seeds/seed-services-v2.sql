-- ==============================================================================
-- 🚀 MOCK DATA SEED: SERVICES MODULE V2 & STUDIO INFO
-- ==============================================================================

-- 1. DELETE EXISTING DATA (Services & Studio Info)
DELETE FROM service_bundle_items;
DELETE FROM services;
DELETE FROM studio_info;

-- 2. SEED STUDIO INFO
INSERT INTO studio_info (id, name, address, hotline, representative, logo_url, bank_info, social_links, working_hours, timezone, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'MOOD STUDIO WEDDING', 
  '123 Nguyễn Văn Cừ, Phường 2, Quận 5, TP.HCM', 
  '0909123456', 
  'Trần Nguyễn Hoàng Tâm', 
  'https://ui-avatars.com/api/?name=Mood+Studio&background=111111&color=ffffff&size=200',
  '{"bank_name": "Vietcombank", "branch": "Hồ Chí Minh", "account_number": "000011112222", "account_name": "MOOD STUDIO CO LTD"}'::jsonb,
  '{"facebook": "facebook.com/moodstudio", "instagram": "instagram.com/mood.wedding", "website": "moodstudio.vn"}'::jsonb,
  '{"monday_friday": "09:00 - 21:00", "saturday_sunday": "08:00 - 22:00"}'::jsonb,
  'Asia/Ho_Chi_Minh',
  now(),
  now()
);

-- 3. SEED SERVICES
-- Constants for Readability: We use named variables/UUIDs for categories and services

-- -- Categories IDs (Already existing)
-- 4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd (Chụp ảnh cưới)
-- f3815144-b231-4ce4-912e-8d638356d4ec (Chụp ảnh gia đình)
-- b705adf9-4266-4ff7-9970-1ad5907a86d5 (Chụp ảnh Baby)
-- 9d9def8e-7989-4cd4-a171-ca1d35835322 (Quay phim)
-- c202ad48-c13e-47cb-884f-e11d127f4b69 (In ấn & Sản phẩm)
-- 52f603c6-c9da-47a3-894e-0486fed5cb2b (Trang phục)

-- Generate fixed IDs for the 10 services so we can link bundles
-- SV 1 (Bundle): Gói Cưới Premium - 'b1111111-1111-1111-1111-111111111111'
-- SV 2 (Single): Pre-wedding Đà Lạt - 's2222222-2222-2222-2222-222222222222'
-- SV 3 (Single): Pre-wedding Studio Indoor - 's3333333-3333-3333-3333-333333333333'
-- SV 4 (Single): Chụp Gia Đình Gold - 's4444444-4444-4444-4444-444444444444'
-- SV 5 (Single): Chụp Baby Newborn - 's5555555-5555-5555-5555-555555555555'
-- SV 6 (Single): Quay Phóng Sự Cưới - 's6666666-6666-6666-6666-666666666666'
-- SV 7 (Single): Album Cưới 40x60 - 's7777777-7777-7777-7777-777777777777'
-- SV 8 (Single): Bộ Vest Nam Cao Cấp - 's8888888-8888-8888-8888-888888888888'
-- SV 9 (Single): Áo Dài Cô Dâu Premium - 's9999999-9999-9999-9999-999999999999'
-- SV 10 (Bundle): Gói Cưới Trọn Vẹn (Combo) - 'b0000000-0000-0000-0000-000000000000'

INSERT INTO services (id, category_id, service_code, name, service_type, unit, selling_price, cost_price, fulfillment_type, status, description, created_at, updated_at) VALUES 
(
  'b1111111-1111-1111-1111-111111111111', 
  '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
  'SV-2401-0001', 
  'Gói Cưới Premium (Full Day)', 
  'dich_vu', 
  'goi', 
  25000000, 
  10000000, 
  'bundle', 
  'active', 
  '[{"title": "Bao gồm", "items": ["1 Photographers + 1 Videographer", "Thời gian làm việc: 10 tiếng liên tục", "Giao 400 - 600 file gốc", "Chỉnh sửa 40 hình tiệc"]}, {"title": "Trang phục", "items": ["2 Váy cưới (1 Premium, 1 Basic)", "2 Vest chú rể"]}, {"title": "Lưu ý", "items": ["Chi phí chưa bao gồm phát sinh đi lại ngoại thành", "Làm thêm giờ tính 1.000.000đ/giờ"]}]', 
  now(), now()
),
(
  's2222222-2222-2222-2222-222222222222', 
  '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
  'SV-2401-0002', 
  'Pre-wedding Đà Lạt (2 Ngày 1 Đêm)', 
  'dich_vu', 
  'goi', 
  18000000, 
  8000000, 
  'single', 
  'active', 
  '[{"title": "Bao gồm", "items": ["Ê kíp: 1 Photo, 1 Makeup, 1 Trợ lý", "Địa điểm: 4 điểm quanh Đà Lạt (Rừng thông, Đồi cỏ, Cafe, Phố đêm)", "Makeup & Hair tùy biến suốt dòng tiệc"]}, {"title": "Sản phẩm", "items": ["Photobook Cao cấp 30x30", "1 Ảnh ép gỗ 60x90cm"]}, {"title": "Lưu ý", "items": ["Khách hàng tự túc vé máy bay/xe di chuyển lên Đà Lạt", "Bao gồm chi phí ở cho ê kíp 1 đêm"]}]', 
  now(), now()
),
(
  's3333333-3333-3333-3333-333333333333', 
  '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
  'SV-2401-0003', 
  'Pre-wedding Studio Indoor', 
  'dich_vu', 
  'goi', 
  8000000, 
  2000000, 
  'single', 
  'active', 
  '[{"title": "Bao gồm", "items": ["1 Photographer, 1 Makeup", "3 Concept background trơn/minimalist", "2 Váy cưới, 1 Vest tại Studio"]}, {"title": "Sản phẩm nhận được", "items": ["Toàn bộ file gốc (Khoảng 200+ tấm)", "25 ảnh retouch kĩ", "1 Cuốn HD Photobook mini 20x20"]}]', 
  now(), now()
),
(
  's4444444-4444-4444-4444-444444444444', 
  'f3815144-b231-4ce4-912e-8d638356d4ec', 
  'SV-2401-0004', 
  'Chụp Gia Đình Gold (Gia đình 4-6 người)', 
  'dich_vu', 
  'goi', 
  5000000, 
  1500000, 
  'single', 
  'active', 
  '[{"title": "Bao gồm", "items": ["Cung cấp 2 váy công chúa cho mẹ & bé gái", "Cung cấp Vest cho bố & bé trai (nếu có size)", "Makeup cơ bản cho mẹ"]}, {"title": "Kết quả", "items": ["10 Ảnh Retouch chuẩn", "1 Khung ảnh lớn treo tường 50x75cm"]}]', 
  now(), now()
),
(
  's5555555-5555-5555-5555-555555555555', 
  'b705adf9-4266-4ff7-9970-1ad5907a86d5', 
  'SV-2401-0005', 
  'Chụp Baby Newborn (Tại Nhà)', 
  'dich_vu', 
  'goi', 
  3500000, 
  800000, 
  'single', 
  'active', 
  '[{"title": "Gói chụp", "items": ["Ê kíp tới tận nhà setup (đảm bảo sức khoẻ cho bé)", "3 Concept (ủ kén, rổ gỗ, giường vintage)", "Đạo cụ sạch sẽ, vệ sinh 100% trước set up"]}, {"title": "Lưu ý", "items": ["Dành cho bé từ 7 - 14 ngày tuổi", "Ba mẹ nên bôi kem dưỡng cho bé trước 1 tiếng"]}]', 
  now(), now()
),
(
  's6666666-6666-6666-6666-666666666666', 
  '9d9def8e-7989-4cd4-a171-ca1d35835322', 
  'SV-2401-0006', 
  'Quay Phóng Sự Cưới (Traditional + Cinematic)', 
  'dich_vu', 
  'goi', 
  12000000, 
  5000000, 
  'single', 
  'active', 
  '[{"title": "Quy cách", "items": ["2 Máy quay chất lượng 4K", "Drone quay cảnh từ trên cao (Nếu điều kiện không gian cho phép)"]}, {"title": "Thành phẩm", "items": ["1 Clip highlight điện ảnh 3-5 phút", "1 Clip Phóng sự Full 15-20 phút", "Lưu trữ Google Drive 2 năm"]}]', 
  now(), now()
),
(
  's7777777-7777-7777-7777-777777777777', 
  'c202ad48-c13e-47cb-884f-e11d127f4b69', 
  'SV-2401-0007', 
  'Album Cưới Cao Cấp 30x30 (20 trang)', 
  'san_pham', 
  'cuon', 
  2500000, 
  1200000, 
  'single', 
  'active', 
  '[{"title": "Chất liệu", "items": ["Bìa Mica kính cường lực tráng gương trong suốt", "Giấy in Ultra Luster siêu nét", "Gáy đóng xoắn siêu bền chống cong viền"]}]', 
  now(), now()
),
(
  's8888888-8888-8888-8888-888888888888', 
  '52f603c6-c9da-47a3-894e-0486fed5cb2b', 
  'SV-2401-0008', 
  'Bộ Vest Nam Lịch Lãm (Bao Gồm Cavat)', 
  'cho_thue', 
  'bo', 
  1500000, 
  300000, 
  'single', 
  'inactive', 
  '[{"title": "Chi tiết", "items": ["Vest nam phong cách Châu Âu slimfit", "Có đủ màu sắc: Đen, Kem, Xanh Đen Navy, Trắng", "Chỉnh sửa đo ni bóp gấu miễn phí 1 lần"]}, {"title": "Lưu ý cho thuê", "items": ["Khách đặt cọc CMND/CCCD", "Giặt sấy miễn phí sau khi trả"]}]', 
  now(), now()
),
(
  's9999999-9999-9999-9999-999999999999', 
  '52f603c6-c9da-47a3-894e-0486fed5cb2b', 
  'SV-2401-0009', 
  'Áo Dài Cô Dâu Lụa Tây Thi', 
  'cho_thue', 
  'bo', 
  2000000, 
  500000, 
  'single', 
  'active', 
  '[{"title": "Chi tiết", "items": ["Vải Lụa Tây Thi đính đá pha lê Swarovski thủ công", "Bao gồm kèm cả Đũa, Mấn hoa cài đầu tone sur tone"]}, {"title": "Quy định thuê", "items": ["Hỗ trợ giặt ủi khô trước và sau thuê", "Trả đồ sau 3 ngày kể từ ngày lấy"]}]', 
  now(), now()
),
(
  'b0000000-0000-0000-0000-000000000000', 
  '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
  'SV-2401-0010', 
  'Gói Cưới Trọn Vẹn (Combo Siêu Tiết Kiệm)', 
  'dich_vu', 
  'goi', 
  45000000, 
  20000000, 
  'bundle', 
  'active', 
  '[{"title": "Combo Tối Ưu Nhất", "items": ["Kết hợp tất cả những gì tốt nhất để bạn không phải lo nghĩ", "Lưu trọn vẹn từng khoảnh khắc từ Pre-wedding đến Ngày Tiệc"]}, {"title": "Ưu đãi tặng kèm", "items": ["Tặng khung ký tên 3D cao cấp trị giá 1.500.000đ", "Giảm 15% cho dịch vụ thuê thêm cho Bố Mẹ 2 bên"]}, {"title": "Hình thức thanh toán", "items": ["Cọc 30% khi ký Hợp đồng", "Thanh toán 50% trước ngày cưới 1 tuần", "Thanh toán 20% khi lấy toàn bộ thành phẩm"]}]', 
  now(), now()
);

-- 4. LINK BUNDLES
-- Gói Cưới Premium (b1111111) = Pre-wedding Indoor (s3333333) + Phóng Sự Cưới (s6666666) + Album (s7777777)
INSERT INTO service_bundle_items (bundle_id, service_id, quantity, created_at, updated_at) VALUES
('b1111111-1111-1111-1111-111111111111', 's3333333-3333-3333-3333-333333333333', 1, now(), now()),
('b1111111-1111-1111-1111-111111111111', 's6666666-6666-6666-6666-666666666666', 1, now(), now()),
('b1111111-1111-1111-1111-111111111111', 's7777777-7777-7777-7777-777777777777', 1, now(), now());

-- Gói Cưới Trọn Vẹn (b0000000) = Pre-wedding Đà Lạt (s2222222) + Phóng Sự Cưới (s6666666) + Album (s7777777) + Vest (s8888888) x2 + Áo Dài (s9999999) x2
INSERT INTO service_bundle_items (bundle_id, service_id, quantity, created_at, updated_at) VALUES
('b0000000-0000-0000-0000-000000000000', 's2222222-2222-2222-2222-222222222222', 1, now(), now()),
('b0000000-0000-0000-0000-000000000000', 's6666666-6666-6666-6666-666666666666', 1, now(), now()),
('b0000000-0000-0000-0000-000000000000', 's7777777-7777-7777-7777-777777777777', 1, now(), now()),
('b0000000-0000-0000-0000-000000000000', 's8888888-8888-8888-8888-888888888888', 2, now(), now()),
('b0000000-0000-0000-0000-000000000000', 's9999999-9999-9999-9999-999999999999', 2, now(), now());

-- BOOM 🎇 Data seeded!
