- **Findings**:
  - `lib/swr.ts` (Lines 125-131): Global SWR config không có handler `onError` hay `onErrorRetry` chứa logic redirect về `/dashboard`. Nó chỉ có thiết lập `revalidateOnFocus: true` và `revalidateOnReconnect: true`.
  - `components/contracts/detail/contract-detail-client.tsx` (Lines 621-645): Component này KHÔNG có `useEffect` gọi `router.push('/dashboard')` khi fetch data fail. Nó bắt biến `contractError` từ hook để hiển thị Inline Error UI (Card lỗi, nút back về danh sách `/contracts`).
  - `app/(protected)/contracts/layout.tsx` (Lines 10-13): Layout RSC chứa lệnh `if (!canAccess(context.shellRole, "contracts")) redirect("/dashboard");`.
  - `lib/hooks/use-contract-queries.ts` (React Query) / `lib/hooks/use-contracts.ts` (SWR): Cả hai đều không chứa redirect onError. Tuy nhiên, React Query (`useContractDetail`) sử dụng `staleTime: 5 mins` nhưng không vô hiệu hóa `refetchOnWindowFocus`, trong khi bản SWR cũ thiết lập rõ `revalidateOnFocus: false`.

- **Root Cause**:
  - Lỗi "giựt về dashboard" **không phải** do SWR/React Query trigger redirect phía client hay `useEffect` lỗi trong Contract Detail.
  - Vấn đề gốc rễ nằm ở **Server-Side Navigation & Auth Layout**: Khi người dùng mở chi tiết hợp đồng hoặc focus lại tab, Next.js có thể chạy lại Server Components (do prefetch, Server Action revalidation, hoặc router soft-reload). Lúc này, `contracts/layout.tsx` gọi `getAuthenticatedUserContext()` để lấy quyền (role). Nếu database query chậm, timeout hoặc bị lỗi mất role tạm thời, hàm `canAccess` sẽ trả về `false`, và Layout Server sẽ `redirect("/dashboard")` đẩy người dùng ra ngoài ngay lập tức.
  - Vấn đề mạng/focus có thể kích hoạt re-fetch/re-render, vô tình phơi bày điểm yếu dễ vỡ của bước kiểm tra Role ở cấp độ Layout.

- **Recommended Fix**:
  1. **Nới lỏng Layout Role Check**: Tại `app/(protected)/contracts/layout.tsx`, nếu việc lấy `context` hoặc `shellRole` gặp lỗi do network, không nên ngay lập tức `redirect("/dashboard")`. Nên lưu trữ (cache) Role trực tiếp trong JWT claims của Supabase session hoặc xử lý hiển thị `<ErrorBoundary>` thay vì redirect cưỡng bức.
  2. **Tắt Revalidate on Focus (React Query)**: Cập nhật `lib/hooks/use-contract-queries.ts` (và kiểm tra lại `useContracts`), thêm thuộc tính `refetchOnWindowFocus: false` cho `useContractDetail` giống cách SWR từng làm để tránh spam API gây nghẽn kết nối khi người dùng chuyển qua lại các tab.
  3. **Global Error Boundary / SWR Config**: Thêm global `onError` trong React Query/SWR để kiểm soát tốt hơn các lỗi HTTP 401/403 (e.g. im lặng refresh token thay vì throw lỗi làm sập / reload Server Layout).