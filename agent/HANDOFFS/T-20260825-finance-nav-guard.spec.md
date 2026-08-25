# T-20260825 (tiếp) — `/finance/*`: watchdog phía client tự sửa lại URL khi bị "đá" nhầm

**Owner:** claude (fallback, user chỉ định "rồi viết spec rồi triển khai code bám chi tiết đi bạn") · **Trạng thái:** đã trace + đã duyệt hướng, viết spec để implement
**Module:** hạ tầng chung (điều hướng) · **Bối cảnh:** tiếp nối T-20260825-finance-nav-redirect-bug (đã `blocked` — 2 hướng "ngăn nguyên nhân" không đo được cải thiện rõ, xem spec đó mục 6). User duyệt hướng thứ 3: không cố ngăn nguyên nhân (nằm 1 phần ngoài code ứng dụng), mà phát hiện + tự sửa lại triệu chứng ngay khi xảy ra — phù hợp quy mô thật của Mood Studio (công cụ nội bộ, không phải SaaS traffic cao) và đúng ràng buộc dự án (không mở lại đợt perf diện rộng).

**Locks:**
- `components/finance/finance-nav-guard.tsx` (file mới)
- `components/layout/app-shell.tsx`

**Không đổi:** không đụng lại `next.config.ts`, `lib/swr.ts`, `finance-realtime-refresh.tsx` — giữ nguyên trạng thái đã có ở T-20260825-finance-nav-redirect-bug.

---

## 0. Vì sao chọn hướng này (đã trace, xem phân tích đầy đủ trong chat trước khi duyệt)

- Bug xảy ra ngay cả với **1 người dùng duy nhất** (không phải vấn đề nhiều người dùng cùng lúc) — quy mô thật của Mood Studio (vài nhân viên, ít khi >2-3 người cùng vào `/finance/*`) không đòi hỏi phải "chịu được tải cao."
- Gốc rễ (response Server Action bị trộn giữa 2 request đồng thời) nằm **1 phần ở tầng Next.js/Vercel**, ngoài tầm code ứng dụng — 2 lần sửa trước (`staleTimes`, chuyển `FinanceRealtimeRefresh` sang `AppShell`) đều nhắm "ngăn nguyên nhân" và đều không đo được cải thiện rõ so với baseline gốc (2/8 → 7/15 tệ hơn → 4/15 không khác biệt).
- Refactor gộp 17 hook `useSWR` của dashboard tài chính (hướng "sửa tận gốc") đi ngược ràng buộc dự án đã chốt: *"Perf: coi như đủ tốt — KHÔNG mở lại đợt perf diện rộng"* (CLAUDE.md).
- Hướng đúng cho quy mô này: **không cố thắng lỗi tầng hạ tầng — phát hiện đúng dấu hiệu của nó và tự sửa lại trước khi người dùng kịp nhận ra.**

## 1. Dấu hiệu nhận diện bug (đã trace + verify nhiều lần, xem T-20260825-finance-nav-redirect-bug.spec.md)

Mọi lần tái hiện quan sát được đều có chung 1 hình dạng: URL **tự nhảy lên đúng 1 route cha** (VD `/finance/debts` → `/finance`) **mà không có bất kỳ thao tác thật nào của người dùng** (không click, không gõ phím, không bấm back) ngay trước đó — đúng đặc điểm của 1 response bị áp nhầm route-state từ request khác, không phải người dùng chủ động rời trang.

## 2. Thiết kế watchdog

**File mới:** `components/finance/finance-nav-guard.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// T-20260825: watchdog cho bug tự điều hướng nhầm về route cha trong /finance/*
// (đã trace kỹ — xem agent/HANDOFFS/T-20260825-finance-nav-redirect-bug.spec.md).
// Next.js/Vercel đôi khi trộn response giữa 2 request Server Action đồng thời,
// khiến trình duyệt tự nhảy lên route cha mà không có thao tác thật nào của
// người dùng. Không sửa được gốc (nằm 1 phần ngoài code ứng dụng, đã thử 2
// hướng ngăn nguyên nhân, đo không cải thiện rõ) — chỉ phát hiện đúng dấu hiệu
// và tự sửa lại URL trước khi người dùng kịp nhận ra.
const USER_INTENT_WINDOW_MS = 800;
const MAX_AUTO_CORRECTIONS = 2; // tránh vòng lặp nếu bản thân lần sửa cũng bị trộn response

export function FinanceNavGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);
  const lastUserIntentAtRef = useRef(0);
  const correctionCountRef = useRef(0);

  // Bất kỳ thao tác thật nào của người dùng (click, phím, back/forward) đều
  // được coi là "có ý định điều hướng" trong 800ms tiếp theo.
  useEffect(() => {
    const markIntent = () => {
      lastUserIntentAtRef.current = Date.now();
    };
    document.addEventListener("click", markIntent, true);
    document.addEventListener("keydown", markIntent, true);
    window.addEventListener("popstate", markIntent, true);
    return () => {
      document.removeEventListener("click", markIntent, true);
      document.removeEventListener("keydown", markIntent, true);
      window.removeEventListener("popstate", markIntent, true);
    };
  }, []);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;
    if (!prevPath || prevPath === pathname) return;

    // Chỉ quan tâm trường hợp nhảy LÊN route cha (vd /finance/debts -> /finance).
    const jumpedToAncestor = prevPath.startsWith(`${pathname}/`);
    if (!jumpedToAncestor) return;

    const hadRecentUserIntent = Date.now() - lastUserIntentAtRef.current < USER_INTENT_WINDOW_MS;
    if (hadRecentUserIntent) return;

    if (correctionCountRef.current >= MAX_AUTO_CORRECTIONS) return;
    correctionCountRef.current += 1;

    // Không có thao tác thật nào đứng trước — khớp đúng dấu hiệu bug đã trace.
    // Tự sửa lại URL, không toast — người dùng không nên nhận ra sự cố.
    router.replace(prevPath);
  }, [pathname, router]);

  return null;
}
```

**File sửa:** `components/layout/app-shell.tsx` — mount cạnh `FinanceRealtimeRefresh` (cùng điều kiện `pathname.startsWith("/finance")`, cùng lý do: cần 1 instance ổn định, không remount theo từng trang con):

```tsx
{pathname.startsWith("/finance") && <FinanceRealtimeRefresh />}
{pathname.startsWith("/finance") && <FinanceNavGuard />}
```

## 3. Đánh đổi đã cân nhắc

- **Trường hợp hiếm có thể bị sửa nhầm:** nếu 1 điều hướng hợp lệ do người dùng bấm nhưng round-trip server chậm hơn 800ms trước khi URL đổi (VD `/finance/closes` chuyển hướng `redirect("/finance")` cho vai trò không đủ quyền, xem `app/(protected)/finance/closes/page.tsx`), watchdog có thể hiểu nhầm là bug và bấm quay lại trang cũ — nhưng trang cũ sẽ tự redirect lại đúng như cũ ngay lập tức (server vẫn chặn), chỉ gây 1 nhịp chớp nhẹ, không kẹt trạng thái sai. Chấp nhận đánh đổi này vì tần suất bug thật (~25%) cao hơn nhiều so với trường hợp hiếm này.
- **Không giải quyết gốc rễ** — nếu Next.js/Vercel sửa lỗi trộn response ở bản sau, watchdog trở thành code không bao giờ kích hoạt (vô hại, để nguyên, không cần dọn ngay).
- **`MAX_AUTO_CORRECTIONS`** chặn vòng lặp nếu bản thân lần `router.replace()` sửa lỗi cũng bị trộn response (khả năng thấp nhưng không phải zero).

## 4. Verify

1. `npx eslint` 2 file trong locks — 0 error.
2. `npm run build` — exit 0.
3. Render thật production (seed E2E admin rồi xóa):
   - **Không phá điều hướng hợp lệ**: từ `/finance/debts`, bấm link "Tài chính" (breadcrumb hoặc sidebar) → phải điều hướng thật về `/finance`, không bị watchdog kéo lại.
   - **Đo lại tỉ lệ URL sai tồn tại đủ lâu để đo được**: lặp lại đúng kịch bản cũ (bấm `/finance` → "Công nợ KH" → theo dõi URL mỗi giây trong 15s) **15 lần** — so với 3 lần đo trước (gốc 2/8, sau Fix1 7/15, sau Fix AppShell 4/15). Kỳ vọng: watchdog sửa lại trong vài trăm mili-giây, nhanh hơn hẳn chu kỳ đo 1 giây/lần — nên tỉ lệ đo được lần này phản ánh đúng mục tiêu thật (URL sai có tồn tại đủ lâu để người dùng nhận ra hay không), không nhất thiết phải bằng 0.
4. Không tạo dữ liệu thật khi verify.

---

## 5. Kết quả thực thi (2026-08-25)

**Trạng thái:** merged vào `main` (`652caf6`), đã deploy, đã verify thật trên production.

### Verify

1. `npx eslint` (2 file trong locks) → 0 error.
2. `npm run build` → exit 0.
3. Render thật production (seed E2E admin rồi xóa):
   - **Điều hướng hợp lệ không bị chặn nhầm**: từ `/finance/debts`, click thật link "Tài chính" (breadcrumb) → điều hướng đúng về `/finance`; từ `/finance`, click thật link "Công nợ KH" → điều hướng đúng về `/finance/debts` — cả 2 chiều đều hoạt động bình thường, watchdog không can thiệp vào điều hướng thật.
   - **Đo lại tỉ lệ URL sai tồn tại đủ lâu để nhận ra**, đúng kịch bản 15 lần đã dùng cho 3 lần đo trước: **0/15 (0%)** — so với gốc 2/8 (25%), Fix 1 (`staleTimes`) 7/15 (47%, tệ hơn, đã lùi), Fix 2 (`AppShell`) 4/15 (27%, không đổi rõ).
4. Không tạo dữ liệu thật khi verify.

**Kết luận:** đây là hướng "giảm triệu chứng" đúng như thiết kế — không xóa được nguyên nhân gốc (1 phần nằm ở tầng Next.js/Vercel, ngoài tầm code ứng dụng), nhưng đo được hiệu quả rõ rệt so với cả baseline gốc lẫn 2 lần thử trước. Phù hợp quy mô thật của Mood Studio và đúng ràng buộc dự án (không cần refactor lớn gộp 17 hook `useSWR`).
