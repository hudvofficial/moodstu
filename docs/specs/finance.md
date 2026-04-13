# Spec: Finance (Master Module)
Status: 📋 Draft — chờ User duyệt

## 1. Tổng Quan Kiến Trúc (Logic-Integrated Core)
Module Finance của Mood Studio V2 là một hệ sinh thái lớn, không chỉ quản lý thu chi mà còn tích hợp chặt chẽ việc đo lường hiệu quả (Goals), trả lương (Payroll), và chống thất thoát (Reconciliation).
- **Pattern "Directory Component Pattern" (DCP)**: Các components như Bảng Cân đối, Danh sách Nợ, tính Lương sẽ tách **Desktop View** (ví dụ `DebtDesktopTable.tsx`) thành file riêng, và dùng `index.tsx` làm **Smart Orchestrator + Mobile View**.
- **Data Integrity First**: Chống "Ghost Payments", bắt buộc có Audit Log, tính toán Lương/Goal qua Database RPC thay vì tính toán Client-side.

## 2. Cấu Trúc Các Sub-Modules (10 Pillars)
Bao gồm các phân hệ sau (dựa trên base hệ thống và nâng cấp chuẩn V2):

1. **Dashboard & Variance Analysis (`/finance`)**
   - Phân tích biến động (kỳ trước vs hiện tại), Lợi nhuận gộp, Tổng quan dòng tiền.
2. **Receipts & Expenses (`/finance/receipts`, `/finance/expenses`)**
   - Phiếu Thu / Phiếu Chi.
3. **Categories (`/finance/categories`)**
   - Danh mục định khoản thu chi.
4. **Debts & Receivables (`/finance/debts`)**
   - Công nợ khách hàng (Aging Analysis: 0-30, 31-60, 61-90, 90+ ngày).
   - Tích hợp QR Payments.
5. **Lab Debts (`/finance/lab-debts`)**
   - Quản lý công nợ với các đối tác In Ấn, Váy cưới (Payables).
6. **Payroll & Salaries (`/finance/salaries`)**
   - Quản lý Lương cứng, Lương sản phẩm, Ứng lương (Advance), Thưởng/Phạt.
7. **Fixed Costs & Investments (`/finance/fixed-costs`, `/finance/investments`)**
   - Các chi phí cố định hàng tháng (Tiền mặt bằng, Điện nước), Khoản đầu tư.
8. **Goals & Budget (`/finance/goals`, `/finance/budget`)**
   - Phân tích tính khả thi và tiến độ mục tiêu doanh thu (Feasibility Analysis).
9. **Close Management & Reconciliation (`/finance/closes`)**
   - Chốt sổ tháng 8 bước theo chuẩn Kế toán (Close Management). Đối soát Hợp đồng vs Phiếu Thu.

## 3. Database Schema & Data Integrity Rules
*(Tất cả các bảng có các cột Audit Audit: `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`)*

### 3.1 Giao Dịch Dòng Tiền (Cashflow)
- **`receipts`**: `id`, `contract_id` (tuỳ chọn), `receipt_amount`, `payment_type`, `status`. (SoT thu ngoài hợp đồng)
- **`payments`**: `amount`, `payment_date`, `payment_method`, `contract_id`, `receipt_code` (SoT thu trong hợp đồng)
- **`expenses`**: `id`, `category_id`, `amount`, `payment_method`, `approved_by` (KHÔNG CÓ CỘT STATUS). (SoT chi).
- **System Type Group B (VARCHAR ENUM/LOGIC)**:
  - Payment Method: `tien_mat`, `chuyen_khoan`, `the_tin_dung`, `vi_dien_tu`.
  - Expenses Approval: Dùng `approved_by IS NOT NULL` để lấy trạng thái "Đã duyệt", `IS NULL` là "Chờ duyệt".
- 🛡️ **Data Integrity (Ghost Payments Prevention)**:
  - Mọi record trong `payment_plans` của hợp đồng nếu status = `"paid"` **BẮT BUỘC** phải có `receipt_id` mapping. Nếu `null` = Ghost Payment. Sử dụng RPC `run_integrity_scan` để check.

### 3.2 Lương & Thu Nhập (Salaries)
- **`employee_salaries`**: `employee_id`, `base_salary`, `advance_payment`, `net_salary` (calculated).
- **`salary_adjustments`**: `id`, `employee_id`, `type` (bonus/penalty), `amount`, `reason`.
- 🛡️ **Data Integrity**: `net_salary` được tính bằng RPC: `(base_salary + product_salary + sum(bonuses) - sum(penalties)) - advance_payment`. Không tính bằng component UI Client-side.

### 3.3 Chốt Sổ Tháng (Close Management)
- **`finance_monthly_closes`**: `id`, `period`, `status`, `snapshot_metrics` (JSONB), `locked_by`.
- **`finance_close_tasks`**: `id`, `close_id`, `step_number` (1..8), `status`, `assignee_id`.

## 4. Quy Chuẩn Server Actions & Validation

- **`finance-queries.ts`**: Đơn thuần chỉ để `SELECT`. Ví dụ `fetchDebtsList()`, `getVarianceMetrics()`.
- **`finance-mutations.ts`**:
  - Toàn bộ đều được bọc qua **`requireAdmin()`** hoặc **`withAuth()`**.
  - **Zod safeParse** mọi tham số đầu vào (KHÔNG dùng type `any`).
  - **Optimistic Locking**: Bắt buộc truyền timestamp hiện tại (`expectedUpdatedAt`) nếu thực hiện chỉnh sửa, để DB query check chống race condition (đặc biệt khi sửa Phiếu thu / Mục tiêu ngân sách đồng thời).
  - Kết thúc thao tác Data, BẮT BUỘC gọi hàm **`fireAuditLog`** lưu lại dấu vết tài chính, kèm object `oldData` / `newData`.

## 5. UI / UX Standards & Apple/Stripe Vibe

Để UI mang cảm giác Premium, Data-heavy nhưng Clean:
- **Tabular Font**: Mọi con số hiển thị tiền tệ/tỷ lệ BẮT BUỘC dùng class `tabular-nums font-black` (để các con số thẳng hàng khi xếp cột dọc).
- **Currency Input**: Form nhập số tiền TUYỆT ĐỐI không dùng `<input type="number">`. Bắt buộc sử dụng `<CurrencyInput>` component đã chuẩn hoá (có mask `VNĐ`, block chữ cái).
- **Profit Summary Cards**: Card tổng quan được quy định bo góc `rounded-soft-lg`, đổ bóng `shadow-lg`, và text có sắc độ `text-primary`.
- **Color Variables**: KHÔNG dùng mã HEX cứng. Dùng `--color-primary`, `--color-success` lấy từ `@theme`.
- **SWR**: Dùng SWR để lấy danh sách (kết hợp `useInfiniteScroll` hoặc Pagination component nếu table dài).

## 6. Sơ Đồ Chuyển Trạng Thái (State Machine Transitions)
- **Finance Goals**: `active` -> `completed` (khi current >= target) -> `reverted` (nếu hạch toán làm balance bị âm lùi).
- **Close Tasks**: `chua_bat_dau` -> `dang_thuc_hien` -> `cho_duyet` -> `hoan_thanh` (Có chu trình loop: nếu `co_van_de` -> rollback về `dang_thuc_hien`).

## 7. Phân bổ công việc triển khai
Do Finance cực kỳ lớn, em sẽ chia việc build thành các Phase nhỏ (Ví dụ: Sub-Phase 1: Categories & Receipts/Expenses; Sub-Phase 2: Debts & Payroll; Sub-Phase 3: Close Management & Goals). 

## 8. Compliance Check (V2 Module Boilerplate)
- [x] Database sử dụng FK trỏ tới `auth.users(id)`.
- [x] Áp dụng Soft delete (`deleted_at`).
- [x] Audit columns có mặt đầy đủ trên tables (`created_by`, `updated_by`, `created_at`, `updated_at`).
- [x] Trạng thái business lưu database dưới dạng string tương thích Group B.
- [x] Zod Safeparse cho mọi Mutation Payload.
- [x] Optimistic Locking khi update (`updated_at` checking).
- [x] Bắn system log `fireAuditLog()` khi mutation (ghi oldData, newData).
- [x] Không sử dụng material/emoji icons, chỉ dùng `lucide-react`.
- [x] SWR only (không xài React Query / useQuery).
- [x] Tách file logic < 250 lines/file (chia ra các view partials: `*DesktopTable.tsx`).
