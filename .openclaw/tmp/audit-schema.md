# Báo cáo Khảo sát Schema Database: Contracts & Services (V2)
**Workspace:** `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`\n\nBáo cáo này tổng hợp chi tiết cấu trúc database Supabase, TypeScript Types, Constants, và các Migration liên quan đến module **Contracts (Hợp đồng)** và **Services (Dịch vụ)**. Dự án hiện tại đang áp dụng thiết kế **V2** với cơ chế lưu trữ chuẩn `snake_case` ở database và mapping sang tiếng Việt (display labels) tại phía UI.

---

## 1. Cấu trúc Database (Tables)

### 1.1. Core Contract Tables
- **`contracts`**: Bảng gốc lưu thông tin hợp đồng.
  - Cột chính: `id`, `contract_code`, `customer_id`, `service_type` (Enum), `transaction_type`, `contract_date`, `work_date`, `delivery_date`, `status` (Enum), `payment_status` (Enum), `total_amount`, `discount_amount`, `paid_amount`, `remaining_amount`, `assigned_to`.
- **`contract_items`**: Lưu các dịch vụ, sản phẩm, và addon trong một hợp đồng.
  - Cột chính: `id`, `contract_id`, `service_id` (FK -> services), `dress_id` (FK -> dresses), `type` (Enum), `is_addon`, `addon_category`, `quantity`, `unit_price`, `total_amount`, `export_type`.
- **`contract_events`**: Lịch trình sự kiện (chụp, tổ chức, giao sản phẩm) theo từng hợp đồng.
  - Cột chính: `id`, `contract_id`, `event_type` (Enum), `event_date`, `end_date`, `location`, `status`, `deadline`, `sync_to_google`, `google_event_id`, `google_sync_status`.
- **`work_tasks`**: Các tác vụ công việc (chụp ảnh, makeup, hậu kỳ, v.v.).
  - Cột chính: `id`, `contract_id`, `event_id`, `work_type` (Enum), `assigned_to` (nhân viên), `vendor_id`, `status`, `start_date`, `completion_date`, `cost`.
- **`contract_checklists`**: Các hạng mục cần kiểm tra theo hợp đồng.
  - Cột chính: `id`, `contract_id`, `category`, `item_name`, `is_completed`, `event_stage`.
- **`contract_notes`**: Ghi chú nội bộ cho hợp đồng.
  - Cột chính: `id`, `contract_id`, `content`, `created_by`.

### 1.2. Financials & Payments
- **`payments`**: Bảng ghi nhận thanh toán tổng quát.
  - Cột chính: `id`, `contract_id`, `customer_id`, `amount`, `payment_method` (Enum), `payment_stage`, `payment_date`.
- **`payment_plans`**: Kế hoạch/lịch thu tiền theo từng giai đoạn (đợt 1, đợt 2, tất toán).
  - Cột chính: `id`, `contract_id`, `amount`, `stage_key`, `stage_name`, `status`, `due_date`, `receipt_id`.
- **`payment_plan_allocations`**: Kết nối số tiền từ `payments` vào `payment_plans` (SSOT Allocation V2).

### 1.3. Services & Pricing Tables
- **`services`**: Bảng danh mục dịch vụ chuẩn.
  - Cột chính: `id`, `service_code`, `name`, `service_type` (Enum), `category_id`, `selling_price`, `cost_price`, `unit` (Enum), `fulfillment_type` (single/bundle), `status`, `image_url`.
- **`service_categories`**: Phân loại dịch vụ.
  - Cột chính: `id`, `name`, `slug`, `parent_id`, `icon`.
- **`service_bundles`**: Thành phần trong một gói combo.
  - Cột chính: `id`, `parent_service_id`, `child_service_id`, `quantity`, `adjustment_price`.
- **`service_relations`** & **`price_rules`**: Định nghĩa mối liên hệ (bắt buộc/gợi ý) và các rule về giá, hỗ trợ builder.

### 1.4. Related Fulfillment & Workflows
- **`dress_reservations`**: Đặt lịch giữ váy/phụ kiện theo hợp đồng.
- **`printing_orders`**: Lệnh in ấn album/ảnh liên kết qua hợp đồng.
- **`gallery_selection_batches`**: Các batch lọc ảnh/chọn ảnh giao cho khách hàng (`contract_id`).

---

## 2. Supabase RPC Functions (SQL Methods)

Các luồng tác vụ chính đều sử dụng "Atomic RPC" để đảm bảo tính toàn vẹn dữ liệu (transactional).
- **Queries/Read**:
  - `get_contract_list_v2`, `get_contract_detail_v2` (có join labs/vendors), `contract_stats`, `contract_stats_simple`
- **Mutations/Write Atomic**:
  - `save_contract_atomic` (tạo/sửa hợp đồng kèm items, events, payment plans)
  - `save_service_atomic` (tạo/sửa dịch vụ kèm bundles)
  - `create_contract_inventory_addon_sale_atomic`
  - `cancel_contract_cascade`, `delete_contract_cascade`
  - `recalc_contract_totals`
- **Payment & Plans**:
  - `process_contract_payment_v2`, `void_contract_payment_v2`, `create_default_payment_schedule_v2`, `sync_payment_plan_statuses_v2`, `contract_payment_health_checks`

---

## 3. Database Enums (snake_case)

- `service_type_enum`: `studio`, `ngay_cuoi`, `combo`, `baby`, `gia_dinh`, `sinh_nhat`, `bau`, `concept`, `couple`, `ky_yeu`, `media`, `khac`
- `event_type_enum`: `chuan_bi`, `ngay_chup`, `ngay_to_chuc`, `hau_ky`, `giao_san_pham`
- `item_type_enum`: `dich_vu`, `san_pham`, `trang_phuc`, `phat_sinh`
- `work_type_enum`: `concept`, `kich_ban`, `chup_anh`, `quay_phim`, `makeup`, `tro_ly`, `cameraman`, `hau_ky_anh`, `dung_phim`, `retouch`, `premiere`, `bien_tap`, `khac`
- `payment_method_enum`: `tien_mat`, `chuyen_khoan`
- `transaction_type_enum`: `hop_dong`, `hoa_don`
- `export_type_enum`: `xuat_ban`, `xuat_thue`
- `addon_category_enum`: `makeup`, `trang_phuc`, `phu_kien`, `them_gio`, `khac`

---

## 4. TypeScript Types & Constants (V2 Logic)

### 4.1. Core Types (`types/contract.ts`, `types/service.ts`)
- TypeScript models đối chiếu chính xác cấu trúc bảng Database (`Contract`, `ContractItem`, `ContractEvent`, `WorkTask`, `ServiceRecord`, v.v.).
- Tái sử dụng type từ CRM qua `import type { Customer } from "./crm"`.

### 4.2. Display Mapping Constants (`types/contract-constants.ts`, `types/service-constants.ts`)
Là tầng hiển thị duy nhất (SSOT display layer) ánh xạ (map) từ DB Enum sang UI Tiếng Việt.
- **`CONTRACT_STATUS_MAP`**: `dang_thuc_hien` -> "Đang thực hiện" (kèm UI variant `info`, `success`, `error`).
- **`SERVICE_TYPE_MAP`**: `ngay_cuoi` -> "Ngày Cưới" (kèm Icon).
- **`PAYMENT_STAGE_MAP`**: Xử lý normalize label (VD: `dat_coc`, `tien_coc` -> "Cọc"; `dot_1`, `installment_1` -> "Đợt 1").
- Tách bạch phần form input bằng `types/contract-form.ts` và `types/service-form.ts` hỗ trợ react-hook-form.

---

## 5. Các Migration Gần Đây Nổi Bật

Dựa trên thư mục `supabase/migrations/`, module Contracts và Services đã trải qua nhiều đợt Hardening (bảo mật/hiệu suất) và V2 Upgrade:
- **Core Security & Production Hardening**:
  - `20260421153000_contracts_production_hardening.sql`
  - `20260428183000_services_security_atomic_writes.sql`
  - `20260605000000_contracts_rls_hardening.sql`
- **Business Logic & Backfills**:
  - `20260422160000_contracts_business_logic_backfill.sql`
  - `20260422170000_contract_work_tasks_backfill.sql`
  - `20260506093000_seed_checklist_templates_and_backfill.sql`
- **Thanh toán & Kế hoạch (Payment V2)**:
  - `20260503080000_contract_payment_completion.sql`
  - `20260504103000_payment_plan_ssot_allocations.sql`
  - `20260505093000_contract_payment_flexible_stages.sql`
- **Tối ưu RPC Queries**:
  - `20260502151500_contract_list_v2_rpc.sql`
  - `20260509140000_contract_detail_v2_rpc.sql`
  - `20260530000000_contract_detail_v3_single_query.sql` (Chuyển sang cơ chế query duy nhất tăng tốc độ tải file chi tiết)
- **Tích hợp bên ngoài (Sync & Vendors)**:
  - `20260426170000_contract_event_google_sync.sql`
  - `20260527000000_add_vendors_to_contract_detail_v2.sql`

---
*Báo cáo hoàn tất - Generated by OpenClaw Agent.*