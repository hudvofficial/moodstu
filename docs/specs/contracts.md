# Contract Module Spec (V2)

> **Status:** Gold Standard ✅ (Audited 2026-03-24)
> **Goal:** Hợp đồng là trung tâm của hệ thống, quản lý toàn bộ vòng đời từ khi ký đến khi hoàn tất các dịch vụ.

---

## 1. Folder Structure

```
app/
├── (protected)/contracts/
│   ├── page.tsx                  # Danh sách hợp đồng (Server Component)
│   ├── [id]/
│   │   ├── page.tsx              # Chi tiết hợp đồng (SSR)
│   │   └── edit/page.tsx         # Trang chỉnh sửa
│   └── error.tsx                 # Error Boundary riêng cho Module
│
components/contracts/
├── contracts-list-client.tsx     # Client logic cho danh sách (SWR + Filter)
├── contracts-table.tsx           # UI bảng danh sách
├── contract-drawer.tsx           # Drawer xem nhanh thông tin HĐ
├── detail/                       # Các component con của trang Chi tiết
│   ├── contract-detail-client.tsx
│   ├── event-task-modal.tsx      # Modal quản lý Event & Task của HĐ
│   └── ...
├── form/                         # Module tạo/sửa hợp đồng
│   ├── index.tsx                 # Orchestrator
│   ├── ContractCustomerSection.tsx
│   ├── ContractItemsSection.tsx
│   ├── ContractPaymentSection.tsx
│   └── hooks/
│       ├── useContractForm.ts    # Main composition hook
│       └── useContractCustomer.ts
│
app/actions/
├── contract-queries.ts           # READ actions (getNextContractCode, getContractList...)
├── contract-mutations.ts         # WRITE actions (createContract, updateContract)
├── contract-lifecycle.ts         # Status transition logic & delete
```

---

## 2. Server Actions Pattern

### 2.1 Queries (`contract-queries.ts`)
- `getContractList(filters)`: Lấy danh sách HĐ (có phân trang & search).
- `getContractDetail(id)`: Lấy full dữ liệu HĐ cho trang chi tiết.
- `getNextContractCode()`: Sinh mã HĐ tiếp theo (HĐ-2026-0001).

### 2.2 Mutations (`contract-mutations.ts`)
- **`createContract(rawData)`**: 
    - Validate qua `contractSubmissionSchema`.
    - **Race Prevention**: Loop retry 3 lần nếu trùng mã HĐ.
    - **Atomic Operations**: Lưu HĐ -> Lưu Items -> Tạo phiếu thu -> Tự động sinh Checklist.
    - **Audit Log**: `fireAuditLog` hành động "CREATE".
- **`updateContract(id, rawData, expectedUpdatedAt)`**:
    - **Optimistic Locking**: Kiểm tra `updated_at` để chống ghi đè.
    - Sync thông tin cô dâu/chú rể sang bảng `customers`.

### 2.3 Lifecycle (`contract-lifecycle.ts`)
- **Status Machine**: Sử dụng `VALID_TRANSITIONS` để quản lý luồng trạng thái.
    - `cho_xu_ly` -> `dang_thuc_hien` -> `hoan_thanh`.
- `deleteContract(id)`: Xóa mềm (`soft_delete`).

---

## 3. Data Validation (`contract.schema.ts`)

Sử dụng **Zod** để đảm bảo tính toàn vẹn của dữ liệu phức tạp:
- `contractSubmissionSchema`: Schema tổng hợp bao gồm `formData`, `items`, `paymentInfo` và `financials`.
- Các Enums khớp 100% với PostgreSQL ENUMs (`cho_xu_ly`, `dang_thuc_hien`, ...).

---

## 4. Đặc điểm nổi bật (V2 Improvements)

1. **Hybrid Event-Task**: Event là mốc thời gian, Task là đầu việc con. Trạng thái Event tự động cập nhật theo tiến độ Task.
2. **Atomic Financials**: Tính toán `total`, `paid`, `remaining` ngay tại Server Action, đảm bảo không lệch dữ liệu.
3. **Optimistic Locking**: Ngăn chặn lỗi khi 2 nhân viên cùng sửa 1 hợp đồng.
4. **Audit Logs**: Lưu lại "Ai đã sửa gì, khi nào" cho mọi thao tác.
5. **SEO & Metadata**: Trang chi tiết HĐ có metadata động (Title: "HĐ-XXXX | Mood Studio").

---

## 5. Module Compliance Checklist

- [x] Actions split: queries / mutations / lifecycle
- [x] All actions use `withAuth()`
- [x] Zod validation `safeParse()`
- [x] `fireAuditLog` integration
- [x] Optimistic Locking implemented
- [x] `error.tsx` separate boundary
- [x] No file > 300 lines (Splitted)
