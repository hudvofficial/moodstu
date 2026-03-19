# Phase G: Lead Detail Page (Page-view)
**Status:** ⬜ Pending
**Dependencies:** Phase E ✅
**Est.:** 45 min

---

## Objective
Tạo trang chi tiết Lead toàn màn hình tại `/crm/leads/[id]` hỗ trợ SSR, Breadcrumbs và SEO.

## Implementation Steps

### G1. Setup Route
- [ ] Tạo `app/(protected)/crm/leads/[id]/page.tsx`
- [ ] Tạo `app/(protected)/crm/leads/[id]/loading.tsx` (dùng `DetailSkeleton`)

### G2. Server Action Fetching
- [ ] Tạo server action `getLeadById(id)` trong `app/actions/crm.ts` (nếu chưa có)
- [ ] Fetch dữ liệu: data, care history, liên quan.

### G3. Lead Detail Page UI
- [ ] Render `LeadDetail` component.
- [ ] Thêm Breadcrumbs phía trên header.
- [ ] Thêm nút "Back" quay lại danh sách.
- [ ] Wrap trong `CrmLayout` (đã có ở layout cha).

### G4. Wiring Navigation
- [ ] Cập nhật link trong Kanban Card và Table Row để trỏ tới `/crm/leads/[id]`.
- [ ] (Optional) Giữ Panel View làm tùy chọn nhanh, hoặc chuyển hẳn sang Page View.

---

## Test Criteria
- [ ] Truy cập trực tiếp link `/crm/leads/abc-123` hoạt động.
- [ ] Dữ liệu load SSR (kiểm tra View Source).
- [ ] Nút Back quay lại đúng trạng thái trước đó.
- [ ] UI đồng nhất với Panel View.
