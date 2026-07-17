# T-20260717-auth-employee-context-retry-timeout — Retry "upstream request timeout" khi tải hồ sơ nhân viên

**Owner:** Claude (fallback `coder` — Codex CLI lỗi hạ tầng cả phiên) · **Spec:** Claude · **Status:** MERGED (xem `agent/TASKS.yaml` mục `done`)

**Locks (2 file — 1 sửa, 1 mới):**
- SỬA: `lib/auth_utils.ts`
- MỚI: `tests/unit/auth-utils-retryable-error.test.ts`

**KHÔNG đổi retry delay (150/450/900ms), KHÔNG đổi số lần retry, KHÔNG đụng `getEmployeeByAuthUserId`/`profileAuthShell`/`getEmployeeContextByAuthUserId` ngoài việc gọi đúng hàm đổi tên.**

---

## Bối cảnh — bug report Sentry (production, lặp lại nhiều lần/nhiều user, user xác nhận 17/07)

```
Error: Không thể tải hồ sơ nhân viên: upstream request timeout
  at getEmployeeByAuthUserId (lib/auth_utils.ts:140)
  at profileAuthShell (lib/auth_utils.ts:91)
```

**Root cause đã xác định bằng đọc code, không suy đoán:** `getEmployeeByAuthUserId` ([`lib/auth_utils.ts:116-144`](lib/auth_utils.ts#L116)) chỉ retry khi lỗi khớp `isRetryableSchemaCacheError` ([dòng 101-110](lib/auth_utils.ts#L101)) — điều kiện này CHỈ bắt lỗi `PGRST002`/`PGRST003`/message chứa `"schema cache"`/`"retrying"`. Lỗi thật gặp trên prod có `lastError.message === "upstream request timeout"` — **không khớp bất kỳ điều kiện nào** → vòng lặp thoát ngay ở lần thử đầu tiên (dòng 132: `if (!isRetryableSchemaCacheError(error) || attempt === ...) break;`), bỏ qua toàn bộ 3 lần retry đã thiết kế sẵn (150/450/900ms).

Query bị lỗi (`.from("employees").select(...).eq("auth_user_id", userId).maybeSingle()`) là lookup đơn giản, có index — "upstream request timeout" là lỗi hạ tầng thoáng qua giữa Vercel/Supabase, đúng loại lỗi NÊN được retry-with-backoff, không phải lỗi logic cần fail nhanh.

**Phạm vi fix:** mở rộng đúng 1 hàm để coi `"upstream request timeout"` là retryable, thêm vào cùng danh sách với các check schema-cache hiện có (KHÔNG xóa check cũ, KHÔNG đổi logic retry-loop, KHÔNG đổi delay).

**Đã kiểm trước khi đổi tên hàm** ([grep xác nhận](lib/auth_utils.ts)): `isRetryableSchemaCacheError` chỉ dùng ĐÚNG 1 chỗ (dòng 132) trong toàn repo — an toàn để đổi tên phản ánh đúng phạm vi mới (không còn chỉ là "schema cache" nữa).

---

## Task 1 — Sửa `lib/auth_utils.ts`

**1a.** Đổi tên + export + thêm điều kiện (dòng 101-110 hiện tại):

Thay:
```ts
function isRetryableSchemaCacheError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  return (
    error.code === "PGRST002" ||
    error.code === "PGRST003" ||
    message.includes("schema cache") ||
    message.includes("retrying")
  );
}
```
bằng:
```ts
export function isRetryableEmployeeContextError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  return (
    error.code === "PGRST002" ||
    error.code === "PGRST003" ||
    message.includes("schema cache") ||
    message.includes("retrying") ||
    message.includes("upstream request timeout")
  );
}
```

**1b.** Cập nhật đúng 1 call site (dòng 132 hiện tại):

Thay:
```ts
    if (!isRetryableSchemaCacheError(error) || attempt === EMPLOYEE_CONTEXT_RETRY_DELAYS_MS.length) {
```
bằng:
```ts
    if (!isRetryableEmployeeContextError(error) || attempt === EMPLOYEE_CONTEXT_RETRY_DELAYS_MS.length) {
```

**Không sửa dòng nào khác trong file.**

---

## Task 2 — File test mới `tests/unit/auth-utils-retryable-error.test.ts`

**Lưu ý bắt buộc:** `lib/auth_utils.ts` import `next/headers` (gián tiếp qua `lib/supabase/server.ts` cũng import `next/headers`). Cả 2 chỉ gọi `headers()`/`cookies()` BÊN TRONG hàm async lazy (không có side-effect ở module top-level), nhưng để an toàn tuyệt đối khi import trong Jest (`testEnvironment: 'node'`, không có mock `next/headers` sẵn trong `jest.config.js`), PHẢI mock `next/headers` ở đầu file test — đúng pattern đã có sẵn cho `server-only` trong `tests/unit/internal-api-auth.test.ts:1`.

Nội dung đầy đủ:
```ts
jest.mock("next/headers", () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));

import { describe, expect, it } from "@jest/globals";
import { isRetryableEmployeeContextError } from "@/lib/auth_utils";

describe("isRetryableEmployeeContextError", () => {
  it("retries known Supabase schema-cache errors", () => {
    expect(isRetryableEmployeeContextError({ code: "PGRST002" })).toBe(true);
    expect(isRetryableEmployeeContextError({ code: "PGRST003" })).toBe(true);
    expect(isRetryableEmployeeContextError({ message: "Schema cache is stale" })).toBe(true);
    expect(isRetryableEmployeeContextError({ message: "Retrying request" })).toBe(true);
  });

  it("retries upstream request timeout errors (regression: seen repeatedly in production Sentry 17/07)", () => {
    expect(isRetryableEmployeeContextError({ message: "upstream request timeout" })).toBe(true);
    expect(isRetryableEmployeeContextError({ message: "Upstream Request Timeout" })).toBe(true);
  });

  it("does not retry unrelated or missing errors", () => {
    expect(isRetryableEmployeeContextError(null)).toBe(false);
    expect(isRetryableEmployeeContextError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(false);
    expect(isRetryableEmployeeContextError({ message: "permission denied for table employees" })).toBe(false);
  });
});
```

---

## Verify (Codex/coder tự chạy trước khi báo xong)

1. `npx jest tests/unit/auth-utils-retryable-error.test.ts` — 3/3 test pass.
2. `npx eslint lib/auth_utils.ts tests/unit/auth-utils-retryable-error.test.ts` — 0 lỗi, 0 warning.
3. `npm run build` — xanh.
4. Báo diff đầy đủ. **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude)

1. Đọc lại diff, xác nhận đúng phạm vi (1 file sửa 2 điểm, 1 file test mới).
2. Chạy lại 3 verify trên độc lập.
3. Đây là fix hạ tầng/retry, không đổi UI — không cần chrome-devtools. Commit + push sau khi verify đạt.
4. Theo dõi Sentry sau deploy (không phải việc tự động hoá được — ghi chú cho user tự kiểm tra issue này có còn tái diễn sau khi fix lên prod không).
