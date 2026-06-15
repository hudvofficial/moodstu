# Kế Hoạch Triển Khai: Loại Hợp Đồng "Outsource" (Gia Công Hậu Kỳ Ngoài)

## 1. Phân Tích Hiện Trạng & Yêu Cầu

- **Mục đích:** Bổ sung nghiệp vụ "Nhận edit ảnh/video từ nguồn ngoài (thợ khác)" vào hệ thống hợp đồng hiện tại.
- **Hiện trạng:**
  - `transaction_type_enum` trong Database đang có 2 loại: `hop_dong` (Hợp đồng thông thường) và `hoa_don` (Hóa đơn bán lẻ).
  - `service_type_enum` có các loại: `studio`, `ngay_cuoi`, `combo`, `baby`, `gia_dinh`, `sinh_nhat`, `bau`, `concept`, `couple`, `ky_yeu`, `media`, `khac`.
  - Hợp đồng hiện tại phục vụ chính cho việc **chụp/quay** (sinh ra các event `chuan_bi`, `ngay_chup`, `ngay_to_chuc`, `hau_ky`, `giao_san_pham`).
- **Phân loại Outsource:**
  - Nhận edit ngoài **không có ngày chụp** (không có on-set events), chỉ có giai đoạn **hậu kỳ** và **giao sản phẩm**.
  - Nó vẫn tạo ra doanh thu (có bảng giá, thanh toán).
  - Vẫn có quy trình quản lý task (giao cho Editor/Retoucher), quản lý Gallery (trả ảnh cho đối tác).

## 2. Giải Pháp Data Model (Brainstorm)

Có 2 hướng tiếp cận để đưa "Outsource" vào hệ thống:

### Hướng 1: Thêm vào `transaction_type_enum` (Đề xuất: KHÔNG NÊN)
- Thay vì `hop_dong`, `hoa_don`, thêm `outsource`.
- **Nhược điểm:** `transaction_type` dùng để phân biệt "cách thức giao dịch" (kí hợp đồng chính quy vs bán lẻ nhanh). Outsource bản chất vẫn là một "hợp đồng dịch vụ" giữa studio và đối tác, có công nợ, có trả file. Nếu đưa vào transaction, UI logic sẽ phải sửa rất nhiều chỗ đang check `transaction_type === 'hop_dong'`.

### Hướng 2: Thêm vào `service_type_enum` (Đề xuất: TỐI ƯU NHẤT)
- Thêm value mới: `outsource` (hoặc `gia_cong`) vào DB Enum `service_type_enum`.
- Ánh xạ hiển thị: **"Gia công / Outsource"**.
- Nhóm dịch vụ (Group): Có thể tạo group mới "B2B" hoặc nhét chung vào "Media/Khác".
- **Ưu điểm:**
  - Re-use lại TOÀN BỘ luồng Hợp đồng (Contracts), Công nợ (Finance), Thống kê (Dashboard).
  - Re-use quy trình giao task hậu kỳ (`work_type: retouch / bien_tap / hau_ky_anh`).
  - Phân luồng UI dễ dàng: Ẩn các field không cần thiết (Ngày chụp, Giờ chụp, Thông tin dâu rể) nếu `service_type === 'outsource'`.
  - Gallery module vẫn chạy chuẩn để giao trả file cho đối tác.

---

## 3. Các Bước Implement Chi Tiết (Implementation Plan)

> ✅ **Đã verify với codebase (2026-06-15).** Các path/symbol dưới đây đã đối chiếu file thật. Hai chỗ draft cũ ghi SAI đã sửa và đánh dấu 🔴.

### Bước 1: Database Migration (Supabase)
Tạo file migration mới (`..._add_outsource_service_type.sql`) để update ENUM:
```sql
-- Cập nhật service_type_enum an toàn (PostgreSQL)
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'outsource';
```
Sau đó regenerate Supabase types nếu workflow dự án có script generate types, hoặc cập nhật thủ công `types/database.types.ts` nếu dự án đang commit generated types.

> ⚠️ **Postgres gotcha (transaction):** KHÔNG được *dùng* enum value mới (`'outsource'`) trong cùng transaction vừa `ADD VALUE` nó — lỗi `unsafe use of new value "outsource"`. Migration này chỉ làm đúng 1 việc: `ADD VALUE`. Nếu sau này muốn seed dữ liệu tham chiếu `'outsource'` (vd seed bảng `event_templates` ở Bước 4) → để ở **migration file RIÊNG, chạy sau**.

*(Nếu là Group B Services trong V2, cần update cả logic check Group B nếu có).*

### Bước 2: Cập Nhật Types & Constants

> 🔴 **Có 2 SSOT `ServiceType` độc lập**, draft cũ chỉ thấy 1. Module Hợp đồng dùng `types/contract.ts`; module Dịch vụ (catalog) dùng `types/service-constants.ts` với type RIÊNG. Phải sửa **cả 2** (item 1 và item 4 dưới đây).

1.  **`types/contract.ts`** (`ServiceType` ~dòng 21):
    - Thêm `"outsource"` vào union `ServiceType`.
    - ✅ *Lưới an toàn:* việc này khiến 2 map `Record<ServiceType, …>` (`SERVICE_TYPE_MAP` ở item 2, `SERVICE_TYPE_LABELS` ở item 3) **báo lỗi compile** cho tới khi điền key → compiler tự ép không sót.
2.  **`types/contract-constants.ts`** (`SERVICE_TYPE_MAP` ~dòng 45):
    - Thêm: `outsource: { label: "Outsource (Gia công)", icon: "Scissors" }`.
    - ℹ️ Field `icon` hiện **không được render ở đâu** (grep toàn repo: chỉ `.label` được dùng). Nên "Scissors" chỉ là metadata, an toàn, không cần đăng ký map string→component nào.
3.  **`types/contract-form.ts`**:
    - Thêm `outsource: "Outsource (Gia công)"` vào `SERVICE_TYPE_LABELS` (`Record<ServiceType,…>` → compiler ép).
    - Thêm `outsource` vào `SERVICE_TYPE_GROUPS`. ⚠️ Đây là **array, KHÔNG phải Record** → compiler **không** bắt nếu quên; quên là outsource biến mất khỏi dropdown form mà build vẫn pass.
      ```typescript
      // ✅ Khuyến nghị: Option A — 0 thay đổi type (ServiceTypeGroup.color hiện chỉ "gold"|"rose"|"sky")
      {
        groupName: "Media",
        color: "sky",
        types: ["media", "outsource", "khac"],
      }

      // Option B (đẹp hơn nhưng tốn công): tạo group B2B, phải mở rộng union color thêm "slate"
      // + cập nhật GroupedSelect để hiểu màu "slate" → bỏ qua trừ khi thực sự cần.
      ```
    - Cập nhật `workDateLabel` (switch ~dòng 149): thêm `case "outsource": return "Ngày nhận source";` (switch có `default` nên không bị ép, phải tự thêm).
4.  🔴 **`types/service-constants.ts`** (SSOT thứ 2 — module Dịch vụ):
    - Thêm `"outsource"` vào array `SERVICE_TYPES` (~dòng 1). Type `ServiceType` ở đây derive từ array này.
    - `SERVICE_TYPE_LABELS` (`Record<ServiceType,…>` ~dòng 18) sẽ báo lỗi compile cho tới khi thêm `outsource: "Outsource (Gia công)"`.
    - **Bỏ qua bước này = Bước 5 bất khả thi** (form tạo dịch vụ không có option outsource).

### Bước 3: Cập Nhật UI Form Tạo/Sửa Hợp Đồng (`components/contracts/form/`)
-   **`ContractInfoSection.tsx`** (label work_date ~dòng 151):
    -   Field "Ngày chụp" **luôn render** (không có nhánh ẩn theo service_type). Cách ít đụng code nhất = **đổi label** qua `workDateLabel('outsource')` đã thêm ở Bước 2 → hiển thị "Ngày nhận source". KHÔNG cần thêm logic ẩn field.
    -   `showCoupleFields()` / `showWeddingDate()` đã là whitelist (chỉ `studio`/`ngay_cuoi`/`combo`) → outsource **tự động `false`**, field "Ngày cưới" tự ẩn. ĐÃ verify, không cần sửa.
-   **`ContractCustomerSection.tsx`**:
    -   Form dâu rể gate bằng `showCoupleFields()` → tự ẩn cho outsource. Chỉ cần verify field cơ bản (Tên đối tác, SĐT) vẫn hiện.

### Bước 4: Cập Nhật Logic Tự Động Hóa (Automation)

> 🔴 **Sửa so với draft cũ:** event KHÔNG hardcode trong `_generateContractEventsInternal`. Hàm đó query bảng `event_templates` (WHERE `service_type`=X, `is_active`) rồi **fallback** sang `fallbackEventTemplates()` khi DB rỗng (`app/actions/contract-event-actions.ts:223-240`). Service_type lạ rơi vào nhánh `return` default của fallback → **vẫn đẻ ra `ngay_chup`** (đúng cái cần tránh). Sửa đúng chỗ là `fallbackEventTemplates`, KHÔNG branch trong `_generateContractEventsInternal`.

- **`app/actions/contract-event-actions.ts` → hàm `fallbackEventTemplates(serviceType)` (dòng 74–104):**
    -   Thêm nhánh `outsource` **trước** câu `return` default cuối hàm, chỉ trả hậu kỳ + giao sản phẩm (không on-set):
        ```typescript
        if (serviceType === "outsource") {
          return [
            { event_type: "hau_ky", event_name: "Hậu kỳ (Gia công)", default_days_offset: 0, sort_order: 1 },
            { event_type: "giao_san_pham", event_name: "Giao sản phẩm", default_days_offset: 3, sort_order: 2 },
          ];
        }
        ```
    -   ✅ Đã trace `buildContractEvents` (dòng 106–200): không có on-set → `lastOnSetType` để `null` → deadline 2 event tính theo `work_date` ("ngày nhận source") nếu có, hoặc `null` nếu trống. Tuy nhiên, logic hiện tại ở nhánh `else` của `buildContractEvents` (dòng 180) tính toán deadline như sau:
        ```typescript
        let deadline: string | null = null;
        if (lastOnSetType === "ngay_to_chuc" && ceremonyDate) {
          deadline = addDays(ceremonyDate, offset);
        } else if (lastOnSetType !== "ngay_to_chuc" && baseDate) {
          deadline = addDays(baseDate, offset);
        }
        ```
        Với `outsource`, `lastOnSetType` là `null`, nó sẽ rơi vào nhánh `else if (lastOnSetType !== "ngay_to_chuc" && baseDate)` và set deadline dựa trên `baseDate` (chính là `workDate` / ngày nhận source). Logic này đúng và không cần sửa thêm `buildContractEvents`.
-   **`app/actions/checklist-actions.ts`**:
    -   Logic gen checklists ở `_generateChecklistsInternal` hoàn toàn dựa vào DB query bảng `checklist_templates` theo `service_type`.
    -   Do đó, **không cần sửa code**. Khi setup hệ thống, Admin chỉ cần tạo các records trong bảng `checklist_templates` với `service_type = 'outsource'` là đủ.
-   **`lib/validations/contract.schema.ts`**:
    -   Cập nhật `serviceTypeSchema` z.enum() thêm `"outsource"`. Nếu không thêm, quá trình submit form tạo hợp đồng mới sẽ bị Zod chặn lại ngay ở server action.

### Bước 5: Tạo Dữ Liệu Catalog (Dịch vụ)

> ⚠️ **Phụ thuộc Bước 2 item 4:** module Dịch vụ dùng SSOT riêng `types/service-constants.ts`. Chưa thêm `"outsource"` vào `SERVICE_TYPES` ở đó thì form tạo dịch vụ **không có option outsource** → bước này không làm được. Làm item 4 trước.

-   Hướng dẫn User vào Cài đặt -> Quản lý Dịch vụ:
    -   Tạo một Service Category mới tên: **Gia công / Outsource**.
    -   Tạo các Service Catalog item (ví dụ: *Retouch ảnh phóng sự*, *Edit highlight*, *Retouch ảnh tiệc theo tấm*) và gán `service_type` là `outsource`. Để khi lên hợp đồng, nhân viên có thể gõ tìm giá chuẩn.

### Bước 6: Cập Nhật Reports / Dashboard (Nếu cần)
-   Verify các query Dashboard/Doanh thu xem có filter cứng các `service_type` cũ không (thường V2 đang `select *` hoặc `sum total` → tự động cover thêm outsource).
-   ✅ Filter dropdown ở `/contracts` (`contracts-dropdown-filters.tsx:17` + `contracts-list-client.tsx:82`) **derive động từ `SERVICE_TYPE_MAP`** qua `Object.entries` → outsource **tự xuất hiện** sau Bước 2, KHÔNG cần sửa. Chỉ cần verify hiển thị + lọc đúng.

---

## 4. Rủi Ro & Lưu Ý (Doubt-Driven)
-   **Enum Migration trong PostgreSQL:** Không thể gỡ bỏ ENUM value một khi đã add bằng `ADD VALUE`. Do đó cần thống nhất chính xác key name: `'outsource'` (tiếng Anh chuẩn theo convention snake_case của team; `'outsource'` là từ phổ thông, không cần `'gia_cong'`).
-   **🔴 Hai SSOT service-type độc lập:** `types/contract.ts` (Hợp đồng) và `types/service-constants.ts` (Dịch vụ) định nghĩa `ServiceType` RIÊNG. Thêm outsource bên này KHÔNG báo lỗi compile bên kia → rất dễ sót. Phải sửa cả 2 (Bước 2). Các `Record<ServiceType,…>` được compiler ép, nhưng `SERVICE_TYPE_GROUPS` (array) thì KHÔNG.
-   **🔴 Transaction enum:** add enum value và dùng nó phải ở 2 migration tách biệt (chi tiết ở Bước 1).
-   **Event generation là template-driven, không hardcode:** điểm sửa nằm ở `fallbackEventTemplates()` (Bước 4), không phải `_generateContractEventsInternal`.
-   **Icon `Scissors` — moot:** grep toàn repo, `SERVICE_TYPE_MAP.icon` hiện không được render ở đâu (chỉ `.label`). Icon chỉ là metadata, "Scissors" an toàn; lo "icon mobile" là thừa. (Nếu sau này có UI render icon service mới cần map string→lucide component.)
-   **Phân quyền (RLS):** Các bảng `contracts`, `contract_events` dùng RLS base trên `id` hợp đồng hoặc `assigned_to`, không bind cứng với `service_type`, nên RLS pass an toàn.
