# Phase 02: Optimistic List SWR Update
Status: ⬜ Pending

## Objective
Khi tick checkbox, nếu `MissingInfoBadge` ngoài danh sách (List) đang hiển thị trạng thái của checklist đó, ta cần cập nhật trực tiếp biến nhớ đệm của SWR (mutate) cho đúng hợp đồng đó thay vì yêu cầu máy chủ gửi lại nguyên danh sách.

## Implementation Steps
1. [ ] Cập nhật hàm mutate của `contractKeys.list` trong file `components/contracts/drawer-checklist.tsx`.
2. [ ] Viết hàm helper nhỏ duyệt qua mảng `contracts`, tìm đúng ID và cập nhật `is_completed` cho checklist cụ thể để UI bên ngoài ăn theo ngay lập tức.
