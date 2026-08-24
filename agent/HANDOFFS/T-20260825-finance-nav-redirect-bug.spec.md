# T-20260825 — `/finance/*`: sửa bug tự động bật lại `/finance` sau vài giây

**Owner:** claude (fallback, user chỉ định "ok duyệt, viết spec rồi triển khai đi bạn") · **Trạng thái:** đã trace + verify kỹ bằng render thật nhiều lần, viết spec để implement
**Module:** hạ tầng chung (router cache + SWR) · **Bối cảnh:** user báo bấm vào `/finance/debts` thì 5-10s sau tự động bật lại `/finance`, kèm toast đỏ "An unexpected response was received from the server."

**Locks:**
- `next.config.ts`
- `lib/swr.ts`

**Không đổi:** không đụng bất kỳ file nào trong `components/finance/dashboard/**` (17 hook `useSWR` ở đó là nạn nhân, không phải nguồn gây lỗi).

---

## 0. Bằng chứng đã verify thật (không suy đoán)

Đã dùng Playwright bắt trực tiếp trên production, lặp lại nhiều lần cho tới khi tái hiện:

1. **Tái hiện được chính xác hiện tượng user báo**: seed 1 tài khoản test, bấm từ `/finance` sang "Công nợ KH" (giống hệt thao tác thật) → 2-6 giây sau, `page.url()` tự đổi về `/finance`, kèm toast lỗi y hệt.
2. **Bắt được bằng chứng gốc rễ bằng cách log từng request/response Server Action (header `next-action`) kèm mốc thời gian mili-giây**: ngay khi vừa vào `/finance/debts`, có hàng loạt request bắn đi xen kẽ tới **cả `/finance/debts` lẫn `/finance`** trong chưa đầy 2 giây — trước khi trình duyệt thật sự điều hướng (bắt bằng sự kiện `framenavigated` thật của trình duyệt, không phải suy luận từ URL bar).
3. **Đọc trực tiếp nội dung JSON trả về, phát hiện response bị trộn giữa 2 request đồng thời**: 1 request gửi tới `/finance/debts` nhận về đúng dữ liệu widget "Ngân sách vs Thực tế" của trang `/finance` (dashboard); 1 request khác gửi tới `/finance` lại nhận về đúng dữ liệu "Ghost scan" của trang `/finance/debts`. Xác nhận thêm qua header `x-matched-path` của Vercel — cũng lệch so với URL request thật ở đúng 2 trường hợp này.
4. **Xác định vì sao có nhiều request đồng thời đến vậy**: `/finance` (dashboard) có tới **17 lời gọi `useSWR` độc lập** rải khắp `finance-dashboard-client.tsx` (7), `finance-intelligence-section.tsx` (6), `profit-detail-drawer.tsx` (2), `profit-report-table.tsx` (2).
5. **Tìm ra vì sao 17 hook đó vẫn hoạt động sau khi đã rời trang**: `next.config.ts` có cấu hình `experimental.staleTimes.dynamic = 180` (3 phút) — đây là **Client Router Cache** của Next.js App Router, cố tình giữ cây component của trang vừa rời **sống ngầm trong bộ nhớ** (không hủy hẳn) tới 3 phút để lần quay lại (back) không phải fetch lại — comment gốc trong code ghi rõ mục đích: *"Client Router Cache — reduce SSR re-renders on navigation"*. Giá trị 180 giây dài gấp 6 lần mặc định thường dùng của Next.js (30 giây) — được cấu hình vậy từ ngày đầu file này được tạo (không phải tinh chỉnh dần), theo hướng tối ưu hiệu năng.

**Kết luận về cơ chế lỗi:** trang `/finance` bị giữ "nóng" quá lâu (180s) → 17 hook vẫn tiếp tục tự fetch song song với trang mới `/finance/debts` → lượng request Server Action đồng thời tăng vọt trong vài giây đầu → dưới điều kiện đồng thời cao này, Next.js 16 / hạ tầng Vercel đôi khi trả **nhầm response giữa 2 request khác nhau** (đã chứng minh bằng nội dung JSON thật, không phải giả thuyết) → khi client nhận response mang theo cây route-state của **trang khác**, router tự đối chiếu và **điều hướng theo route-state trong response nhận nhầm đó** — biểu hiện ra ngoài đúng là "tự bật lại /finance".

## 1. Quyết định phạm vi

Đây là lỗi có tính **ngắt quãng / phụ thuộc thời điểm** (race condition) — không giống các bug dữ liệu xác định trong các task trước của phiên này. Mình **không sửa được tận gốc** hành vi trộn response ở tầng Next.js/Vercel (nằm ngoài code ứng dụng), nhưng **giảm mạnh điều kiện kích hoạt nó** bằng 2 thay đổi nhỏ, đúng chỗ:

1. Rút ngắn thời gian giữ trang cũ "nóng" — giảm số request đồng thời có thể xảy ra.
2. Không để 1 lần lỗi thoáng qua biến thành bão retry (SWR mặc định tự retry ngay khi lỗi — mà chính retry ngay lập tức lại làm TĂNG THÊM request đồng thời, đúng điều kiện gây lỗi).

**Cố tình KHÔNG làm:**
- **Không sửa 17 hook `useSWR` trong `components/finance/dashboard/**`** — chúng là nạn nhân, không phải nguồn gây lỗi; sửa từng cái sẽ tốn công lớn mà không chạm đúng gốc.
- **Không tắt hẳn `staleTimes.dynamic`** (đưa về 0) — sẽ mất hoàn toàn lợi ích cache điều hướng mà phần hiệu năng trước đây đã cố tình đánh đổi lấy, đi ngược "KHÔNG mở lại đợt perf diện rộng" (ràng buộc dự án). Chỉ rút về đúng mức mặc định gốc của Next.js.
- **Không thể khẳng định đây là fix 100% dứt điểm** — vì bản chất là race condition phụ thuộc tải/thời điểm mạng thật, khác hẳn các bug dữ liệu xác định (VD Cọc/P&L) đã sửa trong phiên này. Sẽ nêu rõ trong verify.

## 2. Fix 1 — rút ngắn thời gian giữ trang "nóng" sau khi rời

**File:** `next.config.ts`

```ts
// Trước:
experimental: {
  staleTimes: {
    dynamic: 180, // 3 min — reduce 2/3 SSR calls
    static: 600,  // 10 min — static content rarely changes
  },
  ...
},

// Sau:
experimental: {
  staleTimes: {
    // T-20260825: 180s (3 phút) giữ trang vừa rời "nóng" quá lâu — 17 hook useSWR
    // của /finance dashboard tiếp tục tự fetch song song với trang mới, tạo bão
    // request đồng thời trong vài giây đầu, dẫn tới bug response bị trộn giữa 2
    // request khác nhau (Next.js 16 / Vercel) → tự điều hướng nhầm về /finance.
    // Rút về mốc mặc định gốc của Next.js — vẫn còn lợi ích cache back-nav, chỉ
    // không giữ "nóng" đủ lâu để 17 hook đó kịp dồn cùng lúc với trang mới.
    dynamic: 30,
    static: 600,  // 10 min — static content rarely changes, không liên quan bug này
  },
  ...
},
```

## 3. Fix 2 — không để 1 lỗi thoáng qua biến thành bão retry

**File:** `lib/swr.ts`

```ts
// Trước:
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 2,
  keepPreviousData: true,
};

// Sau:
const SWAPPED_RESPONSE_PATTERN = /unexpected response was received from the server/i;

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 2,
  keepPreviousData: true,
  onErrorRetry: (error, key, config, revalidate, revalidateOpts) => {
    const retryCount = revalidateOpts.retryCount ?? 0;

    // T-20260825: "unexpected response..." = Next.js trả nhầm response giữa 2 request
    // Server Action đồng thời (đã trace + verify kỹ bằng render thật — không phải lỗi
    // dữ liệu). Retry ngay như mặc định SWR sẽ CHỒNG THÊM request đồng thời, làm tăng
    // khả năng trộn tiếp — lùi retry ra xa hơn nhiều + giới hạn còn 1 lần cho đúng lỗi này.
    if (SWAPPED_RESPONSE_PATTERN.test(String((error as Error)?.message ?? error))) {
      if (retryCount >= 1) return;
      setTimeout(() => revalidate(revalidateOpts), 4000);
      return;
    }

    // Hành vi cho các lỗi khác — giữ đúng số lần thử lại đã cấu hình (errorRetryCount),
    // giãn cách tăng dần theo cấp số nhân.
    const maxRetryCount = config.errorRetryCount ?? 2;
    if (retryCount >= maxRetryCount) return;
    const timeout = (config.errorRetryInterval ?? 5000) * Math.pow(2, retryCount);
    setTimeout(() => revalidate(revalidateOpts), timeout);
  },
};
```

`onErrorRetry` là điểm chốt duy nhất trong `SWRConfig` toàn cục (`components/providers/swr-provider.tsx` đã bọc `swrConfig` cho toàn app) — sửa đúng 1 chỗ, áp dụng cho mọi `useSWR` trong app, không cần đụng file riêng lẻ nào.

## 4. Verify

1. `npx eslint` 2 file trong locks — 0 error.
2. `npm run build` — exit 0.
3. Render thật (production, seed E2E admin rồi xóa) — **vì đây là race condition, không thể "chứng minh hết lỗi" bằng 1 lần chạy không tái hiện**. Verify bằng thống kê trước/sau:
   - Trước fix (đã đo ở bước trace): tái hiện **2/8 lần** thử (bấm /finance → Công nợ KH → theo dõi URL 15s).
   - Sau fix: chạy lại đúng kịch bản đó **tối thiểu 15 lần liên tiếp** trên production đã deploy — kỳ vọng **0/15** tái hiện. Nếu vẫn tái hiện dù ít hơn hẳn, báo lại tỉ lệ thật, không làm tròn thành "đã hết".
4. Không tạo dữ liệu thật nào khi verify — chỉ dùng tài khoản E2E tạm.

## 5. Ghi chú trung thực khi báo cáo kết quả

Không dùng chữ "đã fix dứt điểm" nếu sau fix vẫn tái hiện dù chỉ 1 lần trong loạt test — phải báo đúng tỉ lệ đo được, kèm giải thích đây là giảm mạnh điều kiện kích hoạt một race condition có gốc rễ 1 phần nằm ngoài code ứng dụng (hành vi Next.js 16 / Vercel dưới tải đồng thời cao), không phải xóa sổ hoàn toàn khả năng xảy ra.
