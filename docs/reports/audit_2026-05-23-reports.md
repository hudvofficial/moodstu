# Audit Report - 2026-05-23

## Summary
- 🔴 Critical Issues: 1
- 🟡 Warnings: 2
- 🟢 Suggestions: 1

## 🔴 Critical Issues (Phải sửa ngay)

1. **Hiệu năng kém và lỗi tràn bộ nhớ (Memory/N+1 Query) ở môi trường không có RPC**
   - **File**: `app/actions/finance-reports-queries.ts`
   - **Nguy hiểm**: Khi hàm RPC `finance_reports_snapshot` bị lỗi hoặc chưa được tạo trong database, hệ thống sẽ tự động chuyển sang tính toán thủ công bằng code JS. Nó tải toàn bộ danh sách hợp đồng, lấy ra mảng `contractIds`, sau đó dùng `.in("contract_id", contractIds)` để query các bảng con (tasks, prints, expenses, inventory). Nếu khoảng thời gian báo cáo lớn (ví dụ cả năm), danh sách `contractIds` có thể lên tới hàng ngàn, gây lỗi quá giới hạn URL query, hoặc tràn bộ nhớ do tải quá nhiều dữ liệu vào RAM chỉ để cộng tổng.
   - **Cách sửa**: Tốt nhất nên đảm bảo hàm RPC luôn tồn tại ở mọi môi trường. Nếu bắt buộc phải giữ lại logic tính toán bằng code (fallback), cần chia nhỏ danh sách `contractIds` ra thành từng mẻ (chunking) khi query, hoặc giới hạn khoảng ngày tối đa cho phép tính toán thủ công.

## 🟡 Warnings (Nên sửa)

1. **Xuất file báo cáo (Export) bị chậm do tải dữ liệu tuần tự**
   - **File**: `components/reports/reports-export.ts` (hàm `collectAllPages`)
   - **Nguy hiểm**: Hàm này dùng vòng lặp `while (true)` để tải từng trang dữ liệu một cách tuần tự (đợi trang 1 xong mới tải trang 2). Nếu báo cáo có 5000 dòng (khoảng 25 trang), app sẽ mất thời gian chờ 25 lần request nối tiếp nhau, gây cảm giác app bị treo.
   - **Cách sửa**: Nên tải trang đầu tiên để biết tổng số trang (total), sau đó dùng `Promise.all` để tải song song các trang còn lại cùng một lúc nhằm tăng tốc độ tải.

2. **Hàm tính toán quá dài và phức tạp (Code Smell)**
   - **File**: `app/actions/finance-reports-queries.ts` (hàm `getReportsSnapshot`)
   - **Nguy hiểm**: Hàm này dài hơn 200 dòng, chứa logic tính toán của rất nhiều nghiệp vụ (salaries, inventory, printing, tasks). Việc gom tất cả vào một hàm khiến code khó đọc, khó bảo trì và dễ sinh lỗi khi sửa đổi.
   - **Cách sửa**: Tách logic tính toán thủ công thành các hàm con nhỏ hơn (ví dụ: `calculateDirectCosts`, `calculateOperatingCosts`, v.v.).

## 🟢 Suggestions (Tùy chọn)

1. **Khen ngợi: Tối ưu hóa Frontend rất tốt**
   - **File**: `components/reports/reports-client.tsx`
   - **Nhận xét**: Module Reports được viết Frontend rất tốt. Đã áp dụng `next/dynamic` để lazy-load các component lớn (`ProfitReportTable`, `ReportsCashflowView`), và sử dụng `useSWR` rất khéo léo để chỉ gọi API tương ứng khi người dùng chuyển sang Tab đó. Cần duy trì pattern này ở các module khác.

## Next Steps
Anh có thể chọn các tùy chọn từ menu bên ngoài để tiến hành sửa lỗi.
