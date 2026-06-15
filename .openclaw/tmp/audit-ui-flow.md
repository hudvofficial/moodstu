# Khảo sát UI/Flow Module Hợp Đồng (Contracts) & Dịch Vụ (Services)

## 1. Cấu trúc Route/Page của Module Contracts

Module `contracts` sử dụng App Router, được bọc trong `app/(protected)/contracts/layout.tsx` (kiểm tra quyền truy cập qua `canAccess`).

*   **/contracts (`page.tsx`)**: Trang danh sách hợp đồng. Fetch dữ liệu cơ bản ở server-side và bọc vào `ContractsListClient` để render UI, có real-time sync.
*   **/contracts/create (`create/page.tsx`)**: Trang tạo hợp đồng mới. Sử dụng component `ContractForm` với `mode="create"`.
*   **/contracts/[id] (`[id]/page.tsx`)**: Trang chi tiết hợp đồng. Render `ContractDetailClient`. Fetch SSR danh sách gallery trước để optimize hiển thị.
*   **/contracts/[id]/edit (`[id]/edit/page.tsx`)**: Trang chỉnh sửa hợp đồng. Tái sử dụng `ContractForm` với `mode="edit"`.
*   **/contracts/[id]/gallery**: Quản lý ảnh/gallery của hợp đồng.
*   **/contracts/[id]/print**: In ấn, xuất file PDF hợp đồng.

## 2. Danh sách Components Chính

### Vùng danh sách (List)
*   **`ContractsListClient`**: Component chính quản lý danh sách. Hiển thị tabs trạng thái, danh sách (Table/Card tùy thiết bị), thanh toán, sync realtime (`useRealtimeMulti`).
*   **`ContractsDropdownFilters`**: Các bộ lọc nâng cao (thời gian, dịch vụ).
*   **`ContractsTable`**: Bảng dữ liệu desktop hiển thị các hợp đồng.

### Vùng Form Tạo/Sửa (`components/contracts/form/`)
*   **`ContractForm` (`index.tsx`)**: Shell chính của form, kết hợp 5 phần: Info, Customer, Items, Financial, Payment.
*   **`ContractInfoSection`**: Chọn loại giao dịch, nhóm dịch vụ (Studio, Cưới, Bầu, ...), chọn ngày hợp đồng/ngày chụp, phân công nhân viên.
*   **`ContractCustomerSection`**: Search hoặc tạo nhanh khách hàng. Mở rộng thông tin dâu rể (nếu loại dịch vụ là cưới hỏi).
*   **`ContractItemsSection`**: Quản lý danh sách dịch vụ/sản phẩm của hợp đồng.
*   **`ContractFinancialSummary`**: Bảng tính toán tổng tiền, chiết khấu (VNĐ hoặc %).
*   **`ContractPaymentSection`**: Form nhập số tiền thanh toán ban đầu (chỉ hiện khi tạo mới).

### Vùng Chi tiết (`components/contracts/detail/`)
*   **`ContractDetailClient`**: Component chính cho trang chi tiết, chia layout thành 2 cột (Desktop) hoặc tab (Mobile). Lắng nghe realtime các update.
*   **`ServiceDetailsBlock`**: Hiển thị bảng các dịch vụ, sản phẩm, phụ thu đã chọn kèm đơn giá, thành tiền.
*   **Các Block khác**: `FinancialDashboard`, `ChecklistManager`, `EventTimeline`, `PaymentReceiptsCard`, ...

## 3. Flow Tạo Hợp Đồng Mới

1.  **Truy cập**: User vào `/contracts/create`. Component tự động gọi `getNextContractCode()` để sinh mã tạm thời.
2.  **Thông tin chung (Section 1)**: Chọn loại dịch vụ, giao dịch, ngày làm, nhân viên phụ trách.
3.  **Khách hàng (Section 2)**: 
    *   Tìm kiếm khách hàng cũ hoặc tạo nhanh khách hàng mới.
    *   Điền thêm thông tin (chiều cao, cân nặng dâu rể) nếu dịch vụ yêu cầu.
4.  **Dịch vụ & Sản phẩm (Section 3)**:
    *   Bấm "Thêm dịch vụ / sản phẩm".
    *   Modal (`ItemModal` -> `ServiceItemForm`) mở ra để tìm kiếm catalog. User có thể chọn batch nhiều dịch vụ một lúc.
    *   Nếu dịch vụ chưa có, chọn "Tạo dịch vụ mới" (`CreateServiceModal`).
    *   Có thể thêm phụ thu (`AddonItemForm`).
5.  **Tổng kết tài chính (Section 4)**: Tính tổng tự động dựa trên items. Nhập chiết khấu nếu có.
6.  **Thanh toán (Section 5)**: Nhập số tiền thanh toán trước, phương thức (tiền mặt/chuyển khoản).
7.  **Lưu**: Click "Lưu" -> Validate (khách hàng, items, ngày tháng) -> Gọi Server Action `createContract` -> Invalid cache & redirect về chi tiết.

## 4. Flow Quản Lý Dịch Vụ Trong Hợp Đồng

*   **Catalog Search**: Khi thêm dịch vụ, hệ thống query từ bảng catalog (`services`/`dresses`). Có caching phía client (`catalog-cache.ts`).
*   **Thêm/Sửa/Xóa**: User chỉnh sửa số lượng, đơn giá, chiết khấu trực tiếp trên form hợp đồng mà không ảnh hưởng tới giá gốc catalog.
*   **Batch Action**: Được phép tick chọn nhiều dịch vụ từ kết quả tìm kiếm và add tất cả vào hợp đồng trong 1 lần.

## 5. Cách Dịch Vụ Được Gắn Vào Hợp Đồng

Dịch vụ được gắn vào hợp đồng theo mô hình **Snapshot (Copy Data)** thông qua một bảng trung gian hoặc mảng `items`:
*   Mỗi item lưu trữ tham chiếu (`service_id` hoặc `dress_id`).
*   Đồng thời lưu luôn **dữ liệu tĩnh** tại thời điểm chọn: `item_name`, `unit_price`, `quantity`, `discount_amount`, `total_amount`, `type`, `export_type`.
*   Vì copy data, nếu catalog thay đổi giá bán thì hợp đồng cũ không bị ảnh hưởng.
*   Mối quan hệ là **Một (Hợp đồng) - Nhiều (ContractItems)**, trong đó ContractItem references về Service Catalog.

## 6. Hooks / Queries Được Sử Dụng

### Form State Hooks (chia nhỏ logic)
*   `useContractForm`: Hook orchestrator, gom các sub-hook và quản lý validation, submit.
*   `useContractCustomer`: Xử lý search khách hàng, auto-fill.
*   `useContractItems`: CRUD các items local trong form, quản lý state modal thêm dịch vụ.
*   `useContractFinancials`: Tính toán tổng tiền, chiết khấu, số dư.

### Data Fetching & Sync
*   **React Query**: `useContracts`, `useContractDetail`, `useContractStats`, `useActiveEmployees` dùng để fetch data và update optimistic UI (sử dụng Server Actions bọc trong SWR/React Query).
*   **Filter URL**: `useContractFilters` và `useListFilters` (base trên `nuqs`) đồng bộ state bộ lọc (status, sort, date, search) với URL params một cách tức thời, không giật lag.
*   **Real-time**: `useRealtimeMulti`, `useRealtimeSignal` lắng nghe Supabase realtime events (INSERT/UPDATE/DELETE) ở bảng `contracts`, `contract_events`, `work_tasks`, `contract_checklists` để tự động refresh data.
