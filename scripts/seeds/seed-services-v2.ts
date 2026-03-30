import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase variables missing in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🚀 Starting mock data seed...');

  // 1. DELETE EXISTING DATA
  console.log('🗑️ Deleting existing data...');
  await supabase.from('service_bundles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('studio_info').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. SEED STUDIO INFO
  console.log('🏢 Seeding studio info...');
  const { error: studioErr } = await supabase.from('studio_info').insert({
    id: '11111111-1111-1111-1111-111111111111', 
    name: 'MOOD STUDIO WEDDING', 
    address: '123 Nguyễn Văn Cừ, Phường 2, Quận 5, TP.HCM', 
    hotline: '0909123456', 
    representative: 'Trần Nguyễn Hoàng Tâm', 
    logo_url: 'https://ui-avatars.com/api/?name=Mood+Studio&background=111111&color=ffffff&size=200',
    bank_info: {bank_name: "Vietcombank", branch: "Hồ Chí Minh", account_number: "000011112222", account_name: "MOOD STUDIO CO LTD"},
    social_links: {facebook: "facebook.com/moodstudio", instagram: "instagram.com/mood.wedding", website: "moodstudio.vn"},
    working_hours: {monday_friday: "09:00 - 21:00", saturday_sunday: "08:00 - 22:00"},
    timezone: 'Asia/Ho_Chi_Minh',
  });
  if (studioErr) console.error('Error studio info:', studioErr);

  // 3. SEED SERVICES
  console.log('📸 Seeding services...');
  const servicesData = [
    {
      id: 'b1111111-1111-1111-1111-111111111111', 
      category_id: '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
      service_code: 'SV-2401-0001', 
      name: 'Gói Cưới Premium (Full Day)', 
      service_type: 'dich_vu', 
      unit: 'goi', 
      selling_price: 25000000, 
      cost_price: 10000000, 
      fulfillment_type: 'bundle', 
      status: 'active', 
      description: '[{"title": "Bao gồm", "items": ["1 Photographers + 1 Videographer", "Thời gian làm việc: 10 tiếng liên tục", "Giao 400 - 600 file gốc", "Chỉnh sửa 40 hình tiệc"]}, {"title": "Trang phục", "items": ["2 Váy cưới (1 Premium, 1 Basic)", "2 Vest chú rể"]}, {"title": "Lưu ý", "items": ["Chi phí chưa bao gồm phát sinh đi lại ngoại thành", "Làm thêm giờ tính 1.000.000đ/giờ"]}]', 
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222', 
      category_id: '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
      service_code: 'SV-2401-0002', 
      name: 'Pre-wedding Đà Lạt (2 Ngày 1 Đêm)', 
      service_type: 'dich_vu', 
      unit: 'goi', 
      selling_price: 18000000, 
      cost_price: 8000000, 
      fulfillment_type: 'single', 
      status: 'active', 
      description: '[{"title": "Bao gồm", "items": ["Ê kíp: 1 Photo, 1 Makeup, 1 Trợ lý", "Địa điểm: 4 điểm quanh Đà Lạt (Rừng thông, Đồi cỏ, Cafe, Phố đêm)", "Makeup & Hair tùy biến suốt dòng tiệc"]}, {"title": "Sản phẩm", "items": ["Photobook Cao cấp 30x30", "1 Ảnh ép gỗ 60x90cm"]}, {"title": "Lưu ý", "items": ["Khách hàng tự túc vé máy bay/xe di chuyển lên Đà Lạt", "Bao gồm chi phí ở cho ê kíp 1 đêm"]}]', 
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333', 
      category_id: '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
      service_code: 'SV-2401-0003', 
      name: 'Pre-wedding Studio Indoor', 
      service_type: 'dich_vu', 
      unit: 'goi', 
      selling_price: 8000000, 
      cost_price: 2000000, 
      fulfillment_type: 'single', 
      status: 'active', 
      description: '[{"title": "Bao gồm", "items": ["1 Photographer, 1 Makeup", "3 Concept background trơn/minimalist", "2 Váy cưới, 1 Vest tại Studio"]}, {"title": "Sản phẩm nhận được", "items": ["Toàn bộ file gốc (Khoảng 200+ tấm)", "25 ảnh retouch kĩ", "1 Cuốn HD Photobook mini 20x20"]}]', 
    },
    {
      id: 'c4444444-4444-4444-4444-444444444444', 
      category_id: 'f3815144-b231-4ce4-912e-8d638356d4ec', 
      service_code: 'SV-2401-0004', 
      name: 'Chụp Gia Đình Gold (Gia đình 4-6 người)', 
      service_type: 'dich_vu', 
      unit: 'goi', 
      selling_price: 5000000, 
      cost_price: 1500000, 
      fulfillment_type: 'single', 
      status: 'active', 
      description: '[{"title": "Bao gồm", "items": ["Cung cấp 2 váy công chúa cho mẹ & bé gái", "Cung cấp Vest cho bố & bé trai (nếu có size)", "Makeup cơ bản cho mẹ"]}, {"title": "Kết quả", "items": ["10 Ảnh Retouch chuẩn", "1 Khung ảnh lớn treo tường 50x75cm"]}]', 
    },
    {
      id: 'c5555555-5555-5555-5555-555555555555', 
      category_id: 'b705adf9-4266-4ff7-9970-1ad5907a86d5', 
      service_code: 'SV-2401-0005', 
      name: 'Chụp Baby Newborn (Tại Nhà)', 
      service_type: 'dich_vu', 
      unit: 'goi', 
      selling_price: 3500000, 
      cost_price: 800000, 
      fulfillment_type: 'single', 
      status: 'active', 
      description: '[{"title": "Gói chụp", "items": ["Ê kíp tới tận nhà setup (đảm bảo sức khoẻ cho bé)", "3 Concept (ủ kén, rổ gỗ, giường vintage)", "Đạo cụ sạch sẽ, vệ sinh 100% trước set up"]}, {"title": "Lưu ý", "items": ["Dành cho bé từ 7 - 14 ngày tuổi", "Ba mẹ nên bôi kem dưỡng cho bé trước 1 tiếng"]}]', 
    },
    {
      id: 'c6666666-6666-6666-6666-666666666666', 
      category_id: '9d9def8e-7989-4cd4-a171-ca1d35835322', 
      service_code: 'SV-2401-0006', 
      name: 'Quay Phóng Sự Cưới (Traditional + Cinematic)', 
      service_type: 'dich_vu', 
      unit: 'goi', 
      selling_price: 12000000, 
      cost_price: 5000000, 
      fulfillment_type: 'single', 
      status: 'active', 
      description: '[{"title": "Quy cách", "items": ["2 Máy quay chất lượng 4K", "Drone quay cảnh từ trên cao (Nếu điều kiện không gian cho phép)"]}, {"title": "Thành phẩm", "items": ["1 Clip highlight điện ảnh 3-5 phút", "1 Clip Phóng sự Full 15-20 phút", "Lưu trữ Google Drive 2 năm"]}]', 
    },
    {
      id: 'c7777777-7777-7777-7777-777777777777', 
      category_id: 'c202ad48-c13e-47cb-884f-e11d127f4b69', 
      service_code: 'SV-2401-0007', 
      name: 'Album Cưới Cao Cấp 30x30 (20 trang)', 
      service_type: 'san_pham', 
      unit: 'cuon', 
      selling_price: 2500000, 
      cost_price: 1200000, 
      fulfillment_type: 'single', 
      status: 'active', 
      description: '[{"title": "Chất liệu", "items": ["Bìa Mica kính cường lực tráng gương trong suốt", "Giấy in Ultra Luster siêu nét", "Gáy đóng xoắn siêu bền chống cong viền"]}]', 
    },
    {
      id: 'c8888888-8888-8888-8888-888888888888', 
      category_id: '52f603c6-c9da-47a3-894e-0486fed5cb2b', 
      service_code: 'SV-2401-0008', 
      name: 'Bộ Vest Nam Lịch Lãm (Bao Gồm Cavat)', 
      service_type: 'cho_thue', 
      unit: 'bo', 
      selling_price: 1500000, 
      cost_price: 300000, 
      fulfillment_type: 'single', 
      status: 'inactive', 
      description: '[{"title": "Chi tiết", "items": ["Vest nam phong cách Châu Âu slimfit", "Có đủ màu sắc: Đen, Kem, Xanh Đen Navy, Trắng", "Chỉnh sửa đo ni bóp gấu miễn phí 1 lần"]}, {"title": "Lưu ý cho thuê", "items": ["Khách đặt cọc CMND/CCCD", "Giặt sấy miễn phí sau khi trả"]}]', 
    },
    {
      id: 'c9999999-9999-9999-9999-999999999999', 
      category_id: '52f603c6-c9da-47a3-894e-0486fed5cb2b', 
      service_code: 'SV-2401-0009', 
      name: 'Áo Dài Cô Dâu Lụa Tây Thi', 
      service_type: 'cho_thue', 
      unit: 'bo', 
      selling_price: 2000000, 
      cost_price: 500000, 
      fulfillment_type: 'single', 
      status: 'active', 
      description: '[{"title": "Chi tiết", "items": ["Vải Lụa Tây Thi đính đá pha lê Swarovski thủ công", "Bao gồm kèm cả Đũa, Mấn hoa cài đầu tone sur tone"]}, {"title": "Quy định thuê", "items": ["Hỗ trợ giặt ủi khô trước và sau thuê", "Trả đồ sau 3 ngày kể từ ngày lấy"]}]', 
    },
    {
      id: 'b0000000-0000-0000-0000-000000000000', 
      category_id: '4fc9b9ba-93ca-4d9a-9755-9d621fce8bdd', 
      service_code: 'SV-2401-0010', 
      name: 'Gói Cưới Trọn Vẹn (Combo Siêu Tiết Kiệm)', 
      service_type: 'dich_vu', 
      unit: 'goi', 
      selling_price: 45000000, 
      cost_price: 20000000, 
      fulfillment_type: 'bundle', 
      status: 'active', 
      description: '[{"title": "Combo Tối Ưu Nhất", "items": ["Kết hợp tất cả những gì tốt nhất để bạn không phải lo nghĩ", "Lưu trọn vẹn từng khoảnh khắc từ Pre-wedding đến Ngày Tiệc"]}, {"title": "Ưu đãi tặng kèm", "items": ["Tặng khung ký tên 3D cao cấp trị giá 1.500.000đ", "Giảm 15% cho dịch vụ thuê thêm cho Bố Mẹ 2 bên"]}, {"title": "Hình thức thanh toán", "items": ["Cọc 30% khi ký Hợp đồng", "Thanh toán 50% trước ngày cưới 1 tuần", "Thanh toán 20% khi lấy toàn bộ thành phẩm"]}]', 
    }
  ];

  const { error: servErr } = await supabase.from('services').insert(servicesData);
  if (servErr) console.error('Error seeding services:', servErr);

  // 4. SEED BUNDLE ITEMS
  console.log('🔗 Seeding bundle links...');
  const bundleItems = [
    {parent_service_id: 'b1111111-1111-1111-1111-111111111111', child_service_id: 'c3333333-3333-3333-3333-333333333333', quantity: 1, sort_order: 1},
    {parent_service_id: 'b1111111-1111-1111-1111-111111111111', child_service_id: 'c6666666-6666-6666-6666-666666666666', quantity: 1, sort_order: 2},
    {parent_service_id: 'b1111111-1111-1111-1111-111111111111', child_service_id: 'c7777777-7777-7777-7777-777777777777', quantity: 1, sort_order: 3},

    {parent_service_id: 'b0000000-0000-0000-0000-000000000000', child_service_id: 'c2222222-2222-2222-2222-222222222222', quantity: 1, sort_order: 1},
    {parent_service_id: 'b0000000-0000-0000-0000-000000000000', child_service_id: 'c6666666-6666-6666-6666-666666666666', quantity: 1, sort_order: 2},
    {parent_service_id: 'b0000000-0000-0000-0000-000000000000', child_service_id: 'c7777777-7777-7777-7777-777777777777', quantity: 1, sort_order: 3},
    {parent_service_id: 'b0000000-0000-0000-0000-000000000000', child_service_id: 'c8888888-8888-8888-8888-888888888888', quantity: 2, sort_order: 4},
    {parent_service_id: 'b0000000-0000-0000-0000-000000000000', child_service_id: 'c9999999-9999-9999-9999-999999999999', quantity: 2, sort_order: 5},
  ];

  const { error: bundleErr } = await supabase.from('service_bundles').insert(bundleItems);
  if (bundleErr) console.error('Error seeding bundle items:', bundleErr);

  console.log('✅ Mock data seeded successfully!');
}

main().catch(console.error);
