# T-20260824 — Deploy skew: lỗi "Server Action … was not found" bị toast nuốt, không tự reload

**Owner:** claude (fallback) · **Trạng thái:** đã implement + verify xanh (fallback, 2026-08-24) — commit trên `main` local, **chờ user chốt thời điểm push** (push = deploy = tab đang mở sẽ skew thêm 1 lần, lần này tự reload)
**Module:** shared (`lib/`) — thay đổi **additive** · **Locks:** `lib/toast-manager.ts`
**Kèm theo (one-liner, cùng commit):** `components/gallery/image-viewer.tsx:781` placeholder `"Vd: Dịu Êm"` → `"Vd: Minh Anh"` (user yêu cầu bỏ tên đó).

---

## 0. Hiện trạng đo được

User gắn link album Drive ở trang hợp đồng → toast đỏ:
`Server Action "78f6308c058e90bf79f6d9bcc81a09837ff07cf1be" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action`, lặp lại mỗi lần bấm.

- **Nguyên nhân gốc = deploy skew.** Tab mở từ trước; sau đó `main` được push 2 lần (`7b67da5`, `5fd651a`) → Vercel build lại → ID server action đổi theo build (ID `78f6308c…` không có trong manifest build hiện tại: `.next/server/server-reference-manifest.json`, 411 action). Client cũ gọi ID cũ → server mới không biết → lỗi. **Reload trang là hết.**
- **Vì sao không tự reload dù đã có cơ chế:** `components/layout/stale-server-action-recovery.tsx` (mount ở `app/layout.tsx:161`) chỉ nghe `window` `unhandledrejection` + `error`. Luồng này: `drive-link-modal.tsx:60` → `useCreateGalleryMutation` (`hooks/use-gallery-queries.ts:123-133`) → React Query **bắt** lỗi → `onError` dòng 210-217 `toast(error.message, "error")`. Lỗi đã bị bắt → không có unhandled rejection → recovery không chạy.
- Grep: **66 chỗ** `toast(…, "error")` / `toastManager.error(…)` trong `app/ components/ hooks/ lib/` — tất cả mutation qua React Query, `runOptimisticMutation` (`lib/optimistic-mutation.ts:38-40`), try/catch thủ công đều cùng kiểu. Vá từng chỗ = 66 lần và sẽ sót.

## 1. Quyết định: gắn recovery tại điểm nghẽn `ToastManager.error()`

Mọi lỗi hiển thị cho user đều đi qua `lib/toast-manager.ts` `error()` (`lib/toast-utils.ts:30` chỉ là wrapper). Gọi `recoverFromStaleServerAction(message)` ở đó:
- Helper có sẵn (`lib/client/stale-server-action-recovery.ts`): nhận `unknown` (Error/string/object), khớp regex `was not found on the server` / `failed-to-find-server-action`, reload **1 lần / build** (`sessionStorage` key theo `NEXT_PUBLIC_BUILD_DATE`) → không loop. Nếu đã reload rồi mà vẫn lỗi → trả `false`, toast hiển thị như cũ (đường lùi giữ nguyên).
- `lib/toast-manager.ts` không được import từ `app/actions`, `app/api` (đã grep = 0) → chỉ chạy client; helper cũng tự guard `typeof window`.
- Tradeoff chấp nhận: reload làm mất dữ liệu đang gõ trong modal — nhưng không reload thì **mọi** action đều fail, người dùng cũng không lưu được gì. Đây chính là hành vi listener toàn cục hiện có.
- Không chọn `MutationCache.onError` của React Query vì chỉ phủ React Query, sót `runOptimisticMutation` + try/catch thủ công.

## 2. Diff (`lib/toast-manager.ts`)

```ts
import { toast as sonnerToast } from "sonner";
import { recoverFromStaleServerAction } from "@/lib/client/stale-server-action-recovery";
…
  error(message: string, options?: ToastOptions) {
    // Deploy skew: … (comment giải thích)
    recoverFromStaleServerAction(message);
    return this._showToast("error", message, options);
  }
```

## 3. Verify

1. Regex khớp đúng chuỗi lỗi thật (node one-liner) — ✅ `match: true`.
2. `npx jest tests/unit/stale-server-action-recovery.test.ts` — suite có sẵn.
3. `npx eslint lib/toast-manager.ts components/gallery/image-viewer.tsx` — 0 error mới (image-viewer có 2 warning pre-existing "unused eslint-disable").
4. `npm run build` — exit 0.
5. Hành vi thật chỉ tái hiện được khi có skew (tab cũ + deploy mới): sau lần deploy này, tab cũ bấm action → toast lỗi **kèm reload tự động 1 lần** thay vì lặp vô hạn.

## 5. Kết quả thực thi (2026-08-24)

| Gate | Kết quả |
|---|---|
| Regex khớp chuỗi lỗi thật | ✅ match: true |
| `npx jest tests/unit/stale-server-action-recovery.test.ts` | ✅ 7/7 pass |
| `npx eslint lib/toast-manager.ts components/gallery/image-viewer.tsx` | ✅ 0 error (2 warning pre-existing ở image-viewer: unused eslint-disable L270/L286) |
| `npm run build` | ✅ exit 0, PWA artifact pass |
| Tái hiện skew thật | chỉ xảy ra sau deploy kế tiếp với tab cũ — kỳ vọng: toast lỗi + reload tự động 1 lần |

## 4. Ngoài phạm vi — nền tảng

- **Vercel Skew Protection** (Project Settings → Advanced; cần plan Pro/Enterprise): giữ client cũ nói chuyện với deployment cũ trong cửa sổ thời gian → hết lớp lỗi này tận gốc, không cần reload. Nên bật nếu plan cho phép — đây là quyết định hạ tầng của user.
- Mỗi lần push `main` (kể cả commit chỉ đổi `agent/*.md`) đều tạo build mới và làm mọi tab đang mở bị skew. Cân nhắc `vercel.json` `ignoreCommand` bỏ qua commit chỉ đụng `agent/**`, `vault/**`, `plans/**` — mở task riêng nếu muốn.
