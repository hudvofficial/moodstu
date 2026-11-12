# SCOPE LOCK — Mood Studio Xưởng In/Labs

**PO xác nhận 12/11/2026:** CHỈ tối ưu phần Labs.

Mục tiêu: catalog in ảnh giá bán mặc định chung, cost riêng theo Lab, selling override tùy chọn, UI tra giá ngay trên mobile/tablet/desktop, dữ liệu Lab có mapping SKU rõ. Giữ đơn hàng lịch sử, chi phí cam kết Lab và sổ tài chính như cũ.

Phạm vi module được đề xuất sau duyệt: lab_services, labs, print_products mới, app/actions/lab-queries.ts, lab-mutations.ts, types/validation Lab, components/printing/labs và route /printing/labs. Module liên quan (printing_orders, contracts, finance, RBAC) chỉ đọc/so sánh để giữ tương thích, KHÔNG chủ động sửa.

Ngoài phạm vi: Google Calendar, Drive, AI providers, CRM, đăng nhập, bảo mật toàn hệ thống, lifecycle hợp đồng, V6 performance, thay shared UI ngoài Lab, tự cập nhật giá bán vào hợp đồng/đơn in hay ghi ledger.

**Spec duy nhất để xin duyệt:** agent/HANDOFFS/T-20261112-lab-catalog-pricing-mobile.spec.md.
Các tài liệu plans/261112-master-audit-architecture và Technical Spec toàn Mood Studio ngày 12/11 đã vượt scope: chỉ lưu để truy nguyên, không là backlog/ADR yêu cầu triển khai.

Quy trình: Lab spec -> PO duyệt -> sửa đúng scope Lab -> unit/UI/compatibility tests -> PO xem diff -> mới push/deploy. Không chạy DB live write/e2e seed khi chưa có duyệt migration và phương án rollback.
