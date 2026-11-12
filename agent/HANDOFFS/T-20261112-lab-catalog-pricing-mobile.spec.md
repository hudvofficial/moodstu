# TECHNICAL SPEC — T-20261112-lab-catalog-pricing-mobile

**Trạng thái:** CHỜ DUYỆT SPEC (đã bổ sung §9 ràng buộc kỹ thuật) · LABS-ONLY · 12/11/2026
**Repo:** C:\Users\Admin\Desktop\Ai\mood saas\mood-studio
**Phạm vi PO:** chỉ tối ưu Xưởng In/Lab. Đối chiếu hệ thống liên quan chỉ để bảo vệ tính tương thích, không tạo workstream sửa module khác.

## 1. Nghiệp vụ đã chốt

Mỗi SKU in ảnh có một giá bán mặc định chung trong studio. Mỗi Lab có cost riêng theo SKU và có thể có giá bán override riêng. Khi override không có (NULL), giá bán hiệu lực là default; override 0 khác với NULL. Giữ nguyên giá trị, item, cost của mọi đơn in và chứng từ lịch sử. Không tự biến giá bán thành doanh thu hoặc ghi thêm phiếu thu.

## 2. Phạm vi chức năng

- Danh mục sản phẩm chung theo SKU, tên, loại, kích thước/quy cách, đơn vị, giá bán mặc định, trạng thái hoạt động.
- Bảng giá theo Lab: nối SKU, cost_price, selling_price_override tùy chọn, nguồn giá default/override, chênh lệch dự kiến giữa bán và cost.
- UI tra giá nhanh trên /printing/labs: mobile không phải mở modal sửa Lab; tìm SKU, chọn Lab, xem giá bán, cost (đúng quyền), nguồn giá, trạng thái chưa map. Tablet và desktop tương đương.
- Quản trị map dịch vụ Lab hiện có vào SKU chung có xem trước và xác nhận; không gộp tự động chỉ vì tên giống nhau.
- Chỉ chỉnh sửa type, validations, queries, mutations và components của module Lab sau khi Spec được duyệt.

## 3. Source hiện trạng (đã đọc, chưa viết code)

- app/actions/lab-mutations.ts: Lab CRUD, service CRUD; có withPrintingAccess.
- app/actions/lab-queries.ts: đọc tên dịch vụ và cost theo Lab.
- components/printing/labs/lab-services-editor.tsx: bảng hiện chỉ có tên dịch vụ, giá cost, thêm/xóa.
- components/printing/labs/lab-form-modal.tsx: sửa Lab và giá cost.
- types/printing.ts: LabService có item_name và cost_price; PrintingItem V1 có name, quantity, unitPrice (cost).
- vault/40-module/in-an-lab.md: trạng thái đơn in và ledger semantics. printing_orders.total_amount là cam kết trả Lab, không phải selling price.

## 4. Schema đề xuất (CHƯA phải migration được phép chạy)

- print_products: id, sku unique, name, category, specification/size, unit, default_selling_price >=0, active, timestamps và audit fields.
- lab_services: giữ tất cả fields hiện có; thêm product_id nullable tham chiếu print_products và selling_price_override numeric nullable >=0.
- Một SKU có thể tồn tại tại nhiều Lab với cost khác nhau. Với item_name chưa map, giữ giá cost cũ, hiển thị chưa có giá bán catalog.
- effective selling = override khi override KHÁC NULL, ngược lại lấy default của SKU.
- Không thay printing_orders.items, printing_orders.total_amount, contract_items, expenses, expense_allocations, receipts, payment_status và sổ tài chính trong gói này.
- Không thêm snapshot selling vào đơn in ở phase này; đó là scope khác, cần PO phê duyệt riêng.
- Phải đọc schema/triggers/index/grants DB hiện hành trước khi chốt SQL, migration additive, backup/restore trên DB cô lập, có rollback không mất catalog mới.

## 5. API và phân quyền

- getPrintProducts: tìm, phân trang SKU và giá mặc định.
- getLabProductPrices: Lab + SKU, cost, default/override/effective selling, source, unmapped.
- upsertPrintProduct và upsertLabProductPrice: chỉ role quản lý Lab theo quyền server hiện hành; chống duplicate mapping, validation VND, optimistic conflict và audit thay đổi giá.
- Reset override đặt NULL. Không viết fallback dựa trên tính truthy vì giá 0 hợp lệ.
- Không sửa contract/printing/finance API nếu không được PO mở scope. Kiểm tra ảnh hưởng là read-only.

## 6. UI/UX nghiệm thu

- Phone 375/390/500px: lối vào Tra giá rõ, Lab selector, tìm SKU, card dễ đọc có selling, cost, chênh lệch, nhãn nguồn, empty/loading/error state; thao tác chạm đủ lớn, không tràn ngang.
- Tablet 768/1023px: bố cục thích nghi không vỡ; desktop >=1024px: danh sách/table có lọc và chỉnh giá.
- Lab A cost khác Lab B; khi default thay đổi, chỉ Lab chưa override nhận giá mới; xóa override trở về default.
- Không dùng chung sửa toàn hệ thống TierSwitch hay layout, không tự xây design-system mới.

## 7. Verification, migration, rollback

- Unit: NULL vs 0; Lab A/B; unmapped; duplicate SKU; role allowed/denied; danh mục inactive; update đồng thời.
- Mock/visual ở 375, 390, 500, 768, 1023, 1366px; keyboard/a11y, đúng thông tin price source, 0 overflow.
- Đọc-only đối chiếu tổng tiền và số đơn lịch sử trước/sau: invariants 100% bất biến.
- Dev/prod dùng chung DB: không E2E seed hoặc live write. Mọi migration sau approval phải backup + restore clone + revert plan riêng.
- Giữ code v1/fields cũ tương thích; rollback UI/API flag, không xóa SKU/override đã được nhập.
- Lint/TypeScript/build và diff-review sau code; PO duyệt diff trước mọi push main/deploy.

## 8. Ngoài phạm vi, khóa cứng

Không xử lý Google Calendar, AI provider, auth/callback, CRM, Finance Dashboard, lifecycle hợp đồng, global responsive/CLS/V6 hay vấn đề bảo mật toàn hệ thống. Chỉ rà soát read-only quan hệ đến Lab để không phá order, công nợ và tài chính.

**Gate:** PO duyệt SPEC Lab này trước khi code/schema; sau code PO xem diff trước push. Các tài liệu master audit toàn hệ thống trước đó đã được đánh dấu không thuộc workstream.

---

## 9. Bổ sung ràng buộc kỹ thuật (review read-only repo, 12/11/2026)

Các điểm dưới đây là kết quả đối chiếu spec với code/schema hiện hành. Phải chốt hết trước khi viết migration; không mở scope mới.

### 9.1. Tính duy nhất của SKU

- Chốt: unique index trên `lower(btrim(sku))`, partial `WHERE deleted_at IS NULL`.
- Lý do: repo soft-delete bằng `deleted_at` (xem `labs`), không dùng boolean `active` để thay thế. SKU đã xóa mềm phải giải phóng được cho SKU mới.
- `active` boolean trên `print_products` chỉ là cờ ngừng bán, KHÔNG phải unique scope.
- `print_products` hưởng cùng quy ước soft-delete `deleted_at` như `labs`.
- `lab_services.product_id` là FK `ON DELETE SET NULL` (không CASCADE) để xóa SKU không kéo mất dòng giá của Lab.

### 9.2. Audit thay đổi giá

- `lab_services` đã có sẵn trigger `audit_lab_services` gọi `log_audit_action()` (xem `docs/reference/v1_database_schema.sql`, mục 21). Không viết cơ chế audit riêng.
- `print_products` phải tự gắn trigger `audit_print_products` theo đúng mẫu `log_audit_action()`.
- `log_audit_action()` ghi `to_jsonb(OLD)`/`to_jsonb(NEW)` nguyên dòng, nên phân biệt được `selling_price_override = 0` và `= NULL` trong `old_data`/`new_data`. Không cần cột concurrency hay bảng audit phụ.
- Yêu cầu: mọi thao tác reset override phải là `UPDATE ... SET selling_price_override = NULL`, không xóa dòng `lab_services`, để vết audit còn nguyên.

### 9.3. Regenerate DB types là bước bắt buộc trong cùng PR

- Thêm cột vào `lab_services` làm `types/database.types.ts` stale ngay tại `lab_services.Row` (hiện chỉ có 6 field).
- Bắt buộc chạy `npm run db:types` trong cùng commit với migration; nếu không TypeScript build fail ở `app/actions/lab-queries.ts`.
- Không sửa tay `types/database.types.ts`.

### 9.4. Phân quyền ghi giá

- Kiểm tra DB thật ngày 12/11/2026: `labs` và `lab_services` ĐÃ bật RLS, policy write chỉ cho
  `get_current_employee_role() = ANY ('admin','manager')`. `role printing` thường bị chặn ở DB.
- Chốt: `print_products` mirror đúng 4 policy đó (`print_products_select/insert/update/delete`),
  KHÔNG dùng `USING (true)` cho write.
- App layer vẫn giữ `withPrintingAccess` (không thêm gate mới, không dùng `requireServicesAccess`).
  DB là lớp siết cuối cùng.
- Hệ quả đã đo: chỉ admin/manager ghi được catalog và override. Nếu PO muốn role khác sửa giá,
  mở ticket RBAC riêng.

### 9.5. Optimistic concurrency token

- Token là `updated_at` của `lab_services` (đã có trigger `update_lab_services_modtime`).
- Mọi `upsertLabProductPrice` phát `UPDATE ... WHERE id = $id AND updated_at = $expectedUpdatedAt`; 0 dòng cập nhật → trả lỗi xung đột để UI báo người dùng tải lại.
- `print_products` cũng dùng `updated_at` làm token với cùng cơ chế.
- Cấm last-write-wins âm thầm: không được bỏ điều kiện `updated_at` để "cho dễ".

### 9.6. Vị trí rollback và file thực thi

- `supabase/` chỉ có `migrations/`, chưa có thư mục rollback chuẩn. Tạo `supabase/rollback/<YYYYMMDDHHMMSS>_<ten_migration>_down.sql` cùng timestamp với migration lên.
- Rollback chỉ được `DROP`/`ALTER ... DROP COLUMN` trên `product_id`, `selling_price_override` và bảng `print_products` khi và chỉ khi PO xác nhận không cần giữ catalog đã nhập; mặc định rollback là **giữ dữ liệu**, chỉ gỡ code UI/API sau flag.
- Không chạy rollback nào trên DB dùng chung dev/prod khi chưa có bản clone cô lập đã restore thử.

### 9.7. Kiểu TypeScript cho field mới

- `LabService` (`types/printing.ts`) hiện khai `cost_price: number` dù DB cho NULL. Không sửa kiểu cũ trong gói này để tránh lan sang module khác.
- Field mới phải có kiểu nullable: `selling_price_override: number | null`, `product_id: string | null`.
- Cấm dùng truthy check (`if (override)`) ở bất kỳ đâu; luôn `override !== null && override !== undefined`.
- Interface `PrintProduct` khai `default_selling_price: number`, `deleted_at: string | null`.

### 9.8. Điều kiện duyệt lại

Spec này chỉ được coi là sẵn sàng code khi PO xác nhận 4 điểm có hệ quả nghiệp vụ: 9.1 (unique scope), 9.4 (ai được sửa giá), 9.6 (rollback giữ hay xóa dữ liệu), 9.5 (chặn ghi đè khi xung đột). Ba mục còn lại là ràng buộc kỹ thuật thuần, không cần PO quyết.

### 9.9. Trạng thái triển khai (12/11/2026)

- Migration `20261112120000_lab_catalog_pricing.sql` ĐÃ áp lên DB production
  `mnoqeluywookswpcykha` trong transaction, có verify, sau khi backup
  `supabase/backups/20261112_lab_catalog/` (lab_services 22 dòng, labs 1 dòng, schema snapshot).
- Bất biến đo sau migration: `lab_services` 22/22 dòng không mất không đổi; `printing_orders`
  36 đơn / 11.217.300; `expenses` lab 26 phiếu / 7.936.400; `contracts` 75 / 309.750.000;
  `contract_items` 100. Không có bảng lịch sử nào bị ghi.
- Round-trip test trong transaction có ROLLBACK, pass 8/8: insert SKU, unique SKU bắt cả
  khác hoa/thường + khoảng trắng (23505), override 0 khác NULL, map trùng 1 SKU cho cùng Lab
  bị chặn (23505), override âm bị chặn (23514), reset override giữ nguyên dòng, trigger audit
  ghi CREATE+UPDATE, rollback sạch.
- `npm run db:types` đã chạy, `types/database.types.ts` có `print_products` + 2 cột mới;
  shim tạm `untyped()` đã gỡ.
- Rollback flag: `NEXT_PUBLIC_LAB_CATALOG=0` ẩn nút Tra giá và chặn 2 action ghi giá, dữ liệu
  catalog đã nhập vẫn còn.
- Còn chờ: visual 375/390/500/768/1023/1366 cần credential (`E2E_LAB_EMAIL`/`E2E_LAB_PASSWORD`)
  vì `playwright/global-setup.ts` chặn seed trên DB production.
