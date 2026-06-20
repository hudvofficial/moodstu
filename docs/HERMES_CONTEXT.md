# HERMES_CONTEXT

Tài liệu này ghi lại các context nghiệp vụ quan trọng cần nhớ khi làm việc với codebase Mood Studio. Nội dung dưới đây được bổ sung từ Batch 2 và giữ vai trò như domain memory cho các tác vụ tiếp theo.

## 1. CRM → Contract là luồng chuyển đổi cốt lõi
- CRM không chỉ để lưu lead/customer; nó là đầu vào của toàn bộ pipeline kinh doanh.
- Lead sau khi đủ điều kiện có thể được convert thành customer/contract.
- Các file đáng chú ý:
  - `app/actions/lead-actions.ts`
  - `app/actions/lead-lifecycle.ts`
  - `app/actions/customer-actions.ts`
  - `app/actions/contract-lifecycle.ts`
  - `app/actions/contract-mutations.ts`
- Ý nghĩa vận hành:
  - CRM nuôi lead.
  - Khi chốt sale, dữ liệu được đẩy sang Contracts.
  - Sau đó contract trở thành trung tâm cho timeline, payment, gallery, printing và các nghiệp vụ downstream.

## 2. Contract là hub nghiệp vụ sau bán hàng
- Contract không đứng riêng lẻ; nó liên kết nhiều module:
  - payments / refunds
  - checklist / assignments / notes
  - events / schedule
  - gallery
  - printing
- Các route như `app/(protected)/contracts/[id]/gallery` và `app/(protected)/contracts/[id]/print` cho thấy contract là entry point của vận hành hậu bán hàng.
- Khi phân tích bug hoặc thêm feature, nên xem contract như business hub thay vì một CRUD độc lập.

## 3. Gallery download dùng client-side ZIP để bypass giới hạn Vercel
- Luồng tải batch ảnh không nên phụ thuộc vào việc server nén zip lớn rồi trả file.
- Lý do: serverless/Vercel có giới hạn thời gian, memory và payload; zip album lớn phía server dễ timeout hoặc fail.
- Các điểm chính trong code:
  - `app/api/gallery-download-batch/*`
  - `app/api/gallery-download/*`
  - `components/gallery/download-manager.tsx`
  - `lib/gallery-download.ts`
  - `lib/utils/export-pack-generator.ts`
- Mental model đúng:
  - server cấp quyền/token hoặc metadata tải;
  - client tải từng file/batch trực tiếp;
  - zip được tạo phía client để né bottleneck backend.
- Đây là quyết định kiến trúc quan trọng, không nên vô tình “đơn giản hóa” lại thành server-side zip nếu chưa đánh giá lại hạ tầng.

## 4. Finance có cơ chế khóa sổ, mọi mutation phải tôn trọng checkPeriodLock
- Module tài chính không chỉ là CRUD giao dịch.
- Sau khi chốt kỳ, dữ liệu trong kỳ đó phải được bảo vệ khỏi sửa/xóa/phát sinh sai lệch.
- Các file đáng chú ý:
  - `app/actions/finance-close-actions.ts`
  - `app/actions/expense-actions.ts`
  - `app/actions/receipt-actions.ts`
  - `app/actions/payment-actions.ts`
  - `lib/finance-utils.ts`
- Context cần nhớ:
  - bất kỳ mutation tài chính nào theo ngày/kỳ đều có khả năng cần check lock;
  - nếu thêm feature mới cho receipts, expenses, debts, salaries, cashflow... cần xác minh có đi qua logic khóa sổ hay chưa;
  - bỏ qua check này có thể phá tính toàn vẹn báo cáo.

## 5. Printing có workflow + payment state riêng, không chỉ là danh sách đơn in
- Printing gồm nhiều lớp: đơn in, group, trạng thái workflow, payment history, deposit/final payment.
- Các file đáng chú ý:
  - `app/actions/printing-actions.ts`
  - `app/actions/printing-mutations.ts`
  - `app/actions/printing-workflow-mutations.ts`
  - `components/printing/payment-history-section.tsx`
  - `components/printing/deposit-payment-modal.tsx`
  - `components/printing/final-payment-modal.tsx`
- Khi sửa module printing cần xem cả logic workflow và trạng thái thanh toán, không chỉ UI list/filter.

## 6. Dresses và Inventory là hai domain khác nhau nhưng đều có vòng đời vật lý
- Dresses tập trung vào tài sản cho thuê, rental lifecycle, return flow, QR scan.
- Inventory tập trung vào vật tư/stock movement, approval requests, transaction history.
- Không nên gộp mental model của hai module này thành một “warehouse” đơn giản.

## 7. Moodie AI dùng tool-calling có ràng buộc RBAC
- Moodie không nên được hiểu như chatbot text-only.
- Nó có lớp engine/tooling riêng trong:
  - `lib/moodie/engine.ts`
  - `lib/moodie/core-engine.ts`
  - `lib/moodie/tools.ts`
  - `lib/moodie/catalog.ts`
  - `app/actions/moodie-queries.ts`
  - `app/actions/moodie-mutations.ts`
- Context quan trọng:
  - model có thể gọi tool để lấy hoặc thao tác dữ liệu;
  - nhưng quyền thực thi phải bám theo RBAC/session thực của user;
  - không được để Moodie bypass permission boundary của app.
- Khi thêm tool mới cho Moodie, phải kiểm tra cả domain permission, auditability và error handling.

## 8. Settings là điểm gom cấu hình hệ thống và tích hợp quản trị
- Settings không chỉ là trang profile.
- Nó gom các phần như:
  - studio info
  - members / user linking
  - notification prefs
  - Google Calendar
  - Moodie AI card
  - audit log
- Điều này khiến settings là module quản trị chéo nhiều domain, cần cẩn thận khi đổi schema hoặc quyền.

## 9. Batch 1 + Batch 2 cho thấy cấu trúc app theo pattern nhất quán
- Route/UI: `app/(protected)/<domain>` + `components/<domain>`
- Server logic: `app/actions/<domain>-*.ts`
- Shared logic: `lib/*`, `hooks/*`, `contexts/*`
- Data backbone: Supabase qua `lib/supabase/*`
- Pattern này nên được giữ khi mở rộng codebase để tránh business logic trôi vào component hoặc route handler một cách tùy tiện.

## 10. Local Dev & QA: Hiện tượng "Ghost App" do Port Conflict & PWA Service Worker
- Dự án Mood Studio tích hợp `next-pwa`, nghĩa là có Service Worker cache lại giao diện frontend.
- Cảnh báo cực kỳ quan trọng cho các agent (như Hermes) khi debug lỗi HMR (WebSocket) hoặc UI trên local:
  - **ĐỪNG TIN VÀO GIAO DIỆN:** Kể cả khi Playwright / Browser load thành công giao diện Đăng nhập Mood Studio ở `http://127.0.0.1:3000`, có thể server đứng sau port 3000 **KHÔNG PHẢI** là Next.js (có thể là Remotion hoặc app khác). Service Worker đã hứng request và trả về bản cache giao diện cũ (Ghost App).
  - Khi đó, JS của Next.js sẽ cố gắng bắn WebSocket `_next/webpack-hmr` vào port 3000, đâm trúng app lạ và sinh ra lỗi `net::ERR_INVALID_HTTP_RESPONSE`.
  - Hậu quả: Hydration chết, Splash Screen không tắt, nút Submit bị liệt. Không phải do Next.js code lỗi.
- **Hành động bắt buộc (Mandatory Check):** Trước khi kết luận Next.js Middleware hoặc HMR bị lỗi, hãy luôn chạy `netstat -ano | findstr :3000` và `wmic process` để xác minh chính xác tiến trình (PID) nào đang thực sự chiếm giữ port 3000. Đừng để Service Worker đánh lừa!

## 11. Tablet Design Foundation & Rules
- Dành riêng cho iPad/Tablet (đặc biệt `1024-1279px` landscape).
- **Rule 1:** Tablet landscape KHÔNG ĐƯỢC coi là desktop. Bắt buộc dùng `TierSwitch` hoặc prop `desktopAt="xl"` để chuyển thiết kế.
- **Rule 2:** Sidebar trên tablet-wide bắt buộc ở dạng **icon-only** (`forcedCollapsed`). KHÔNG dùng sidebar full text vì sẽ chiếm mất diện tích của bảng dữ liệu.
- **Rule 3:** Dữ liệu dạng bảng (Table) trên tablet nên được gộp cột (composite/stacked cell) thay vì ép hiển thị >6 cột như desktop. Ví dụ: Contracts list từ 7 cột desktop chuyển thành 5 cột trên tablet, gộp (Thông tin + Tiến độ + Trạng thái) thành 1 cột "Tình trạng" để tránh cảm giác bị "bụ" (chật chội).
- **Rule 4:** Pagination/Footer cần làm dạng compact, sát mép dưới, không bọc trong card lớn. Button size nhỏ (`w-8 h-8`), font size nhỏ (`text-xs`).
