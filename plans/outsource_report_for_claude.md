# Report Bàn Giao: Mảng Hợp Đồng "Outsource" (Gia Công Ảnh Nguồn Ngoài)

File này tóm tắt hiện trạng Codebase (Next.js V2 + Supabase) và các câu hỏi nghiệp vụ để Claude có thể lên Implementation Plan một cách hoàn hảo nhất.

## 1. Yêu Cầu Gốc
- **Mục tiêu:** Thêm loại hợp đồng "Outsource" (nhận hình/video thợ khác sửa để lấy công).

## 2. Hiện Trạng Codebase (V2)
Hệ thống hợp đồng hiện tại được thiết kế cực kỳ chặt chẽ (Zod validation + SSOT split + DB Enum) cho việc **chụp/quay**:

*   **Database (Supabase):** 
    *   Có `service_type_enum` (PostgreSQL ENUM): `studio`, `ngay_cuoi`, `combo`, ...
    *   Hợp đồng có các mốc thời gian: `contract_date`, `work_date`, `delivery_date`.
*   **TypeScript (SSOT):**
    *   Có 2 nơi độc lập định nghĩa ServiceType: `types/contract.ts` (cho Hợp đồng) và `types/service-constants.ts` (cho Service Catalog).
    *   UI text mapping nằm ở `types/contract-constants.ts` và `types/contract-form.ts`.
*   **Automation Logic:**
    *   Sự kiện (Event) tự sinh dựa trên `service_type`. Mặc định sinh `ngay_chup`, `hau_ky`, `giao_san_pham`. Logic nằm ở bảng `event_templates` (nếu DB có data) và fallback ở hàm `fallbackEventTemplates` (`app/actions/contract-event-actions.ts`).
    *   Checklists (`app/actions/checklist-actions.ts`) 100% dựa vào DB (`checklist_templates`), không có fallback cứng.

## 3. Lỗ Hổng / Vấn Đề Cần Xử Lý Trong Plan Mới

Nếu coi Outsource là 1 `service_type` mới, Plan của Claude **bắt buộc** phải cover được các điểm nghẽn kỹ thuật này:\n\n1.  **DB Enum Migration Trap:** Thêm `'outsource'` vào ENUM Postgres thì không thể dùng nó ngay trong cùng 1 transaction migration. (Phải tách migration insert data).
2.  **Zod Validation:** `lib/validations/contract.schema.ts` chặn cứng `serviceTypeSchema`. Quên update = sập lúc save hợp đồng.
3.  **UI Ẩn Hiện Field (`ContractInfoSection`):** Hợp đồng outsource không có "Ngày chụp" mà chỉ có "Ngày nhận file / Deadline". Hàm `workDateLabel` và form UI cần biết điều này. (Dâu rể thì hệ thống đã tự ẩn vì có whitelist `showCoupleFields`).
4.  **Auto Event:** Outsource không có ngày chụp (`ngay_chup`), chỉ có `hau_ky` và `giao_san_pham`. Làm sao để `fallbackEventTemplates` không tự đẻ ra `ngay_chup`?

## 4. Các Câu Hỏi Nghiệp Vụ Cần Claude & User Chốt Trong Plan

*(Gửi phần này cho Claude để nó hỏi User và lên Plan chuẩn business)*

Để implementation sát thực tế vận hành của Mood Studio, Claude cần phân tích và đề xuất:\n\n*   **Đối tác là ai?** (Thợ ngoài) — Có cần lưu tên studio/fanpage của họ không? Lưu chung vào bảng `customers` hay làm gì khác?
*   **Cách tính tiền?** — Tính theo "tấm", "album" hay "giờ công"? UI form thêm dịch vụ có cần thay đổi gì để hỗ trợ việc báo giá này không? (Ví dụ có cần hiện field: Link Drive nhận ảnh ở đâu đó trên form không?)
*   **Flow xử lý sự kiện:** Khi nhận ảnh về, có cần event nào tên là `nhan_source` thay vì chỉ có `hau_ky` không?
*   **Giao trả ảnh:** Sẽ dùng module Gallery hiện tại của hệ thống để trả link cho đối tác, hay chỉ đơn giản là gắn link Drive vào 1 field và báo Done?

---
*Agent Note:* Claude ơi, tao đã scan nát cái validation và event actions rồi. Code ở đây ràng buộc rất chặt (strict typing + DB enum validation). Mày đọc kỹ phần 2 và 3 để lúc viết plan không xúi bậy user sửa sai file nhé. Mày hãy lên plan business (phần 4) rồi xuất lại 1 file `final_plan.md` cho t code.