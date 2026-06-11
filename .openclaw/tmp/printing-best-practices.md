# Printing Orders Workflow - Best Practices Brainstorm

## Scope
Audit/brainstorm workflow cho module Printing Orders trong bối cảnh studio cưới có tác vụ in ấn album/ảnh/vật phẩm. So sánh với các pattern thường thấy ở Printify, Shopify fulfillment/production apps, Odoo Manufacturing, và Trello/kanban production boards.

## 1. State Machine Design

### Observed Mood-style flow
Flow hiện tại trong UI ảnh có vẻ là tuyến tính:

1. `Chờ xử lý`
2. `Đã đặt cọc`
3. `Đang in`
4. `Đã in`
5. `Đã giao`
6. `Hoàn thành`

### Best-practice comparison
- **Printify / print-on-demand**: Thường dùng tuyến tính ở mức customer-facing (`order submitted -> in production -> shipped -> delivered`), nhưng nội bộ có nhiều trạng thái phụ như `on hold`, `failed`, `cancelled`, `quality check`.
- **Shopify fulfillment apps**: Status thường tách 2 trục: financial status (`paid/partially paid/refunded`) và fulfillment status (`unfulfilled/in progress/fulfilled`). Không nên trộn payment status vào production status nếu hệ thống lớn dần.
- **Odoo Manufacturing**: Dùng manufacturing order với work orders/operations. Trạng thái sản xuất không chỉ tuyến tính mà có routing, work centers, quality checks, scrap/rework.
- **Trello production workflows**: Kanban columns rất tốt để nhìn bottleneck hàng loạt, nhưng thiếu state machine guard nếu không có automation/rules.

### Recommendation
- Ngắn hạn: giữ linear state machine vì dễ dùng cho nhân viên và ít rủi ro.
- Trung hạn: tách rõ 3 trục:\n  - `payment_status`: `unpaid | deposited | paid | refunded`
  - `production_status`: `pending | ready_to_print | printing | printed | qc | issue | rework | cancelled`
  - `delivery_status`: `not_ready | ready | delivered | picked_up`
- Nếu chưa muốn thay schema lớn, ít nhất không nên để `Đã đặt cọc` là một status production chính; nên hiển thị như badge điều kiện từ payment/contract data.

## 2. Bulk Operations

### Should Mood allow changing 50 orders at once?
Có, nhưng cần guard rõ. Các hệ thống production thật thường có bulk status updates vì thao tác từng đơn rất chậm khi có batch in 20-100 đơn.

### Recommended bulk patterns
- Cho phép bulk với các trạng thái ít rủi ro:
  - `Chờ xử lý -> Đang in`
  - `Đang in -> Đã in`
  - `Đã in -> Đã giao`
- Không cho bulk hoặc yêu cầu xác nhận mạnh với trạng thái rủi ro:
  - `Hoàn thành`
  - `Đã hủy`
  - `Gặp sự cố`
  - rollback về trạng thái trước
- Bulk action phải ghi audit log từng item: actor, from_status, to_status, timestamp, reason/batch_id.
- UI nên có preview: "Bạn sắp chuyển 37 đơn từ Đang in sang Đã in".

### Recommendation
Implement bulk action sau khi có audit log/status history. Nếu chưa có history, không nên mở bulk rộng vì sai hàng loạt rất khó truy vết.

## 3. Automated Triggers

### Payment confirmation trigger
Best practice là automation nhưng không nên auto-start sản xuất quá sớm.

Recommended rule:
- Khi contract/payment ghi nhận đặt cọc đủ điều kiện, printing order có thể chuyển từ `Chờ xử lý` sang `Sẵn sàng in` hoặc hiển thị CTA "Bắt đầu in".
- Không nên tự động chuyển thẳng sang `Đang in`, vì `Đang in` là hoạt động vật lý cần xác nhận của bộ phận in.

### Barcode / QR scan trigger
Đây là pattern rất đáng làm nếu volume tăng:
- Scan QR trên phiếu in để check-in vào máy in/workstation: `ready_to_print -> printing`.
- Scan sau khi hoàn tất/QC: `printing -> printed` hoặc `qc -> ready_for_delivery`.
- Scan khi giao: `printed -> delivered`.

### Recommendation
- Phase 1: automation mềm bằng CTA và suggested status, không auto-mutating quá nhiều.
- Phase 2: QR/barcode event log để tăng tốc thao tác tại xưởng/đội in.

## 4. Issue Tracking

### Should add `Gặp sự cố` red status?
Có. Đây là thiếu sót quan trọng trong workflow sản xuất thực tế.

Common issue cases:
- Thiếu file in / link Drive lỗi
- File sai kích thước hoặc sai màu
- Máy in lỗi
- Hết giấy/vật tư
- Khách đổi yêu cầu
- In lỗi cần làm lại
- Trễ deadline

### Recommended design
- Add status `Gặp sự cố`/`Blocked` màu đỏ.
- Khi set issue, bắt buộc nhập:\n  - issue_type\n  - note/reason\n  - responsible_user/department\n  - next_action hoặc due date\n- Có status riêng `Rework/In lại` nếu phát hiện lỗi sau `Đã in`.
- Issue không nên chỉ là status; nên là entity/log để lưu nhiều sự cố trên cùng order.

### Recommendation
Add issue tracking trước bulk operations. Nó giúp team thấy bottleneck và ngăn đơn lỗi bị "mất hút".

## 5. Analytics & Reporting

### Need timestamp logs?
Có. Nếu không log mỗi lần đổi trạng thái, Mood không thể tính production velocity, SLA, bottleneck, hoặc truy trách nhiệm.

Recommended events to log:
- `printing_order_status_changed`
- actor/user_id
- from_status
- to_status
- timestamp
- reason/note
- source: `manual | bulk | payment_trigger | barcode_scan | realtime_sync`
- optional batch_id/device_id

### Useful metrics
- Avg time from deposit to printing started
- Avg printing duration
- Avg time from printed to delivered
- Number of issue orders by type
- Rework rate
- Orders overdue by promised delivery/work date
- Employee/team throughput

### Recommendation
Implement `printing_order_status_history` or generic `contract_activity_events` integration. UI can later show timeline and reports.

## 6. Rollback Logic

### Should allow revert status?
Có, nhưng phải controlled.

Production reality:
- `Đã in -> Đang in` if print failed/QC failed
- `Đã giao -> Đã in` if marked delivered by mistake
- `Hoàn thành -> Đã giao` should be restricted to manager/admin

### Recommended rules
- Allow backward transition only with reason.
- Role gate:
  - Staff can move forward normal states.
  - Staff can move to `Gặp sự cố` with reason.
  - Manager/admin required for rollback from terminal states (`Hoàn thành`, `Đã hủy`).
- Always write status history.
- UI should show this as "Hoàn tác / Chuyển về bước trước" not a casual dropdown item.

### Recommendation
Keep dropdown for forward transitions. Use a separate confirmation modal for rollback/rework.

## Suggested Target Workflow For Mood

### Practical Phase 1: Low-risk improvement
- Keep current dropdown UI.
- Add `Gặp sự cố` red status.
- Add audit/status history log.
- Require reason for issue/rollback.
- Make `Đã đặt cọc` a badge/condition if possible, not production state.
- Add realtime optimistic patch for status changes.

### Phase 2: Production-speed improvement
- Add bulk select/actions for same-current-status orders.
- Add `Sẵn sàng in` and `QC/In lại` states if needed.
- Add quick filters: `Hôm nay`, `Quá hạn`, `Gặp sự cố`, `Đang in`, `Sẵn sàng giao`.
- Add keyboard/mobile-friendly quick actions.

### Phase 3: Pro workflow
- QR/barcode scan check-in/out.
- Batch IDs for print batches.
- Kanban production view for managers.
- Analytics dashboard: velocity, bottlenecks, rework, overdue, team throughput.

## Verdict
Mood đang đi đúng hướng cho small-to-medium studio vì linear dropdown đơn giản, dễ training nhân viên. Tuy nhiên nếu mục tiêu là vận hành nhanh ngoài thực tế, workflow hiện tại còn thiếu 3 thứ cốt lõi: `issue tracking`, `status history analytics`, và `bulk/scan-based operations`. Không nên nhảy ngay sang kanban/DAG phức tạp; nên nâng cấp theo từng phase, giữ UI nhanh và giảm rủi ro sai nghiệp vụ.
