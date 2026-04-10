# 🏥 Báo cáo Audit Toàn diện Module CRM (Leads & Customers)

Dựa trên quá trình kiểm tra toàn bộ mã nguồn của module `/crm` (Server Actions, Schemas, UI Components, Lifecycle Logic), dưới đây là báo cáo đánh giá sự tuân thủ các quy tắc Gold Standard và kế hoạch hành động.

## 1. Đánh giá Tổng quan (General Overview)

- **Cấu trúc thư mục:** Chuẩn xác (`app/(protected)/crm/`, `components/crm/`, `lib/validations/crm.schema.ts`).
- **Kiểm soát truy cập:** Tốt. Các Server Actions đều có `withAuth` và `requireCrmAccess`.
- **Thiết kế UI:** Cơ bản tuân thủ V2 Earth-tone layout và hạn chế tối đa Inline Styles.
- **Data Fetching:** Tuân theo kiến trúc: SSR cho Danh sách (Lists) qua `searchParams` + SWR cho Chi tiết (Detail Drawers).

---

## 2. Các điểm Vi phạm & Có mùi (Code Smells & Violations)

### 🔴 2.1. Tính không nhất quán trong UX điều hướng (Inconsistent UX Navigation)
- **Vấn đề:** Trong `CustomerListPage`, việc thay đổi filter và `page` được bao bọc bằng `useTransition` kết hợp trạng thái `isPending` để tạo trải nghiệm tải mượt mà, chống giật khựng giao diện. Nhưng trong `LeadListPage`, các hành động tương tự (chuyển trang, lọc status, thay đổi search) gọi router push truyền thống, khiến trang có thể bị đơ hoặc tải lại toàn bộ bảng.
- **Rules vi phạm:** *Sự đồng bộ hệ thống (Consistency).* Các page cùng cấp trong hệ sinh thái (được render giống nhau thông qua SSR List) cần đồng bộ UX. 

### 🟡 2.2. Vi phạm Type Safety & Đoán kiểu dữ liệu (Type Cast)
- **Vấn đề:** Trong `customer-table.tsx` có ép kiểu cực đoan: `((customer as Customer & { ltv?: number }).ltv || 0)`. Điều này vi phạm nguyên tắc định nghĩa dữ liệu đồng nhất. Cột LTV (Lifetime Value) cần được cung cấp rõ ràng qua `Customer` type nếu API trả về.
- **Rules vi phạm:** *Strict TypeScript.* Hạn chế dùng từ khóa `as` để đè type trừ phi có adapter.

### 🟡 2.3. Cấu trúc Layout Hardcode có rủi ro vỡ (Brittle Layout CSS)
- **Vấn đề:** Trong `customer-list-page.tsx`, layout chính dùng: `<div className="h-[calc(100vh-64px)] ...">`.
- **Hệ lụy:** Cách set fixed px này có rủi ro rất cao nếu header của hệ thống thay đổi chiều cao (như khi hiện thông báo quá hạn, mobile v.v...). Các layout con sẽ bị overflow không đoán trước được.
- **Cách khắc phục:** Nên tận dụng cấu trúc Flexbox toàn trang từ file `layout.tsx` cha (`flex-1 min-h-0 overflow-hidden` thay vì `calc()`).

### 🟡 2.4. Phân tích cú pháp Ngày/Tháng (Date Parsing Fragility)
- **Vấn đề:** Tại `customer-table.tsx`, việc dùng trực tiếp `new Date(customer.wedding_date)` không bọc error boundary hay safe parsing là điểm rủi ro. Mặc dù Supabase có thể trả về đúng chuẩn ISO, nhưng trên một số platform hàm `new Date()` có thể không parse đúng chuỗi gốc.
- **Khắc phục:** Xem xét cách sử dụng `parseISO` để parse từ database nếu gặp ISO datestring thay vì truyền thẳng constructor.

---

## 3. Rủi ro về Hiệu suất (Performance Risk)

Việc tận dụng SSR 100% qua RSC (`app/crm/leads/page.tsx` và `customers/page.tsx`) cho việc sort + filter có nghĩa là với tập data 10,000 dòng, server có thể sẽ chậm trong việc trả HTML về. Tuy nhiên điều này hiện phù hợp với chuẩn bảo mật và đơn giản hóa Client state. Để chắc chắn việc này ổn, `getLeadStats` / `getCustomerStats` cần có Index phía Supabase cho count.

---

## 4. Kế hoạch Hành động (Remediation Plan)

| Giai đoạn | Nhiệm vụ (Tác vụ / Target) | Yêu cầu nghiệp vụ |
| :--- | :--- | :--- |
| **P1** | **Chuẩn hóa Type Safety (Types & Schema)** | Bổ sung `ltv?: number` vào type `Customer` trong `types/crm.ts` để xóa bỏ error typecasting trong toàn bộ các Component bảng và card. |
| **P2** | **Đồng bộ Transition UX Component (Leads)** | Áp dụng `useTransition` vào `Components/crm/lead-list-page.tsx` để đồng bộ hoàn toàn với logic loading của `customer-list-page.tsx`. |
| **P3** | **Cải thiện UI Layout Resiliency** | Sửa đổi `h-[calc(...)]` nội tuyến của layout trong `customer-list-page` thành các class flex (ví dụ: `flex-1 min-h-0`) để UI được linh hoạt trên mọi độ phân giải. |
| **P4** | **Review lại Date format (UI Tables)** | Wrap logic `format(new Date(...))` hoặc làm tròn với Safe Parse Date fallback cho tất cả các table render date của `/crm`. |

> **KẾT LUẬN:** Module CRM có cấu trúc chặt chẽ, API an toàn và tuân thủ đúng định hướng của SSOT. Tuy nhiên còn một số "code smell" UX và Type Safety cần được giải quyết, đặc biệt là đồng bộ cơ chế chuyển trang mượt (useTransition) và loại bỏ fix cứng CSS Layout.
