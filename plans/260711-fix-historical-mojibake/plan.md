# Plan — Fix historical mojibake ngoài Moodie Voice

Ngày lập: 2026-07-11

## Mục tiêu

Loại bỏ mojibake lịch sử đã commit mà Claude ghi nhận trong `plans/260711-moodie-voice/STATUS.md`, không làm thay đổi logic nghiệp vụ và không sửa nhầm những chuỗi chỉ dùng làm ví dụ/signature kiểm tra encoding.

## Baseline đã xác minh

### Nhóm A — Runtime source, hỏng thật

1. `lib/auth_utils.ts`
   - Một thông báo lỗi tại vùng `requireSettingsAccess`.
   - Chuỗi hiện tại: `Báº¡n khĂ´ng cĂ³ quyá»n quáº£n trá»‹ cĂ i Ä‘áº·t`.
   - Chuỗi đích: `Bạn không có quyền quản trị cài đặt`.

2. `app/actions/user-management.ts`
   - Hai thông báo lỗi ở luồng tự thay đổi quyền và tự hủy liên kết tài khoản.
   - Chuỗi đích dự kiến:
     - `Không thể tự thay đổi quyền của chính bạn`.
     - `Không thể hủy liên kết tài khoản của chính bạn`.

### Nhóm B — Migration đã commit, có rủi ro dữ liệu

3. `supabase/migrations/20260505100000_contract_payment_stage_key_vietnamese.sql`

4. `supabase/migrations/20260505101000_contract_payment_adjustment_stage_key.sql`

Hai migration chứa bảng ký tự tiếng Việt bị mojibake bên trong `translate(...)`, comment/display examples và nhánh `replace(...)`. Đây không chỉ là lỗi hiển thị: nếu migration/function đã được apply, normalization có thể đang map sai Unicode tiếng Việt thật.

Không được chỉ sửa hai migration cũ rồi coi như hoàn tất. Migration đã chạy trên môi trường nào đó sẽ không tự chạy lại.

### Nhóm C — Tài liệu cần phân loại trước khi sửa

Ghi chú Claude nói có “3 docs”, nhưng scan worktree hiện tại chỉ xác nhận hai file tài liệu chứa mẫu mojibake ngoài các file hướng dẫn Voice:

5. `docs/reports/dashboard_audit_2026_04_29.md`
   - Có mẫu ``Tá»•ng quan`` trong đoạn mô tả một lỗi mojibake cũ.
   - Cần quyết định giữ mẫu lịch sử hay chuyển thành diễn giải không chứa signature hỏng.

6. `mood-studio-architecture-overview.md`
   - Có các mẫu như ``CĂ³ lá»—i...`` để mô tả fallback/error boundary từng bị hỏng.
   - Đây có thể là ví dụ có chủ đích, không phải toàn file bị encode sai.

Các file sau chứa signature mojibake có chủ đích để hướng dẫn agent quét lỗi và không được tính là file hỏng:

- `plans/260711-moodie-voice/PLAN.md`
- `plans/260711-moodie-voice/PHASE1-TASK.md`
- `plans/260711-moodie-voice/PHASE2-TASK.md`
- `plans/260711-moodie-voice/STATUS.md` (byte-pattern trong code span)

Do chưa tìm thấy tài liệu thứ ba phù hợp với mô tả Claude, Phase 0 bắt buộc phải tái tạo inventory từ tracked files và lịch sử Git. Không tự chọn một file thứ ba chỉ để đủ số lượng bảy.

## Nguyên tắc sửa

1. Đọc và ghi UTF-8 trực tiếp; không dựa vào output `Get-Content` trên codepage Windows để kết luận file hỏng.
2. Xác nhận bằng code point/byte hoặc Node/Python đọc `utf8`.
3. Mỗi chuỗi phải có bản dịch đích được kiểm tra theo ngữ cảnh nghiệp vụ.
4. Không dùng biến đổi encoding tự động trên toàn file migration hoặc tài liệu.
5. Không sửa logic, query, quyền, RLS hoặc cấu trúc migration trong cùng patch.
6. Không sửa các signature nằm trong tài liệu kiểm thử nếu chúng được dùng có chủ đích.
7. Không sửa migration cũ như biện pháp duy nhất cho database đã apply.

## Kế hoạch thực thi

### Phase 0 — Chốt inventory bảy file

- Quét toàn bộ tracked text files bằng tập signature chính xác:
  - UTF-8 bị decode sai: `Ã`, `Â`, `áº`, `á»`, `Ä‘`, `Æ°`, `Ă´`, `â€`.
  - Replacement character: `U+FFFD`.
  - Control character C1 bất thường trong source/document.
- Với mỗi hit, ghi:
  - file và dòng;
  - code point/byte xung quanh;
  - nội dung là lỗi thật, ví dụ lịch sử hay regex/signature kiểm thử;
  - commit đầu tiên đưa chuỗi vào repo (`git log -S`/`git blame`).
- Đối chiếu với session/status của Claude.
- Gate: inventory phải giải thích được vì sao từng file được sửa hoặc bị loại. Nếu chỉ có sáu file hỏng thật, cập nhật `STATUS.md` để sửa lại con số thay vì tạo file thứ bảy giả.

### Phase 1 — Sửa source runtime

- Sửa ba thông báo lỗi trong:
  - `lib/auth_utils.ts`;
  - `app/actions/user-management.ts`.
- Không thay đổi control flow hoặc error type.
- Thêm test contract nhỏ hoặc script scan bao phủ hai file này để lỗi không quay lại.

Gate:

- ESLint hai file sạch.
- TypeScript pass.
- Scan byte-level không còn signature mojibake trong hai file.
- Test quyền/user-management hiện có vẫn pass.

### Phase 2 — Sửa normalization migration an toàn

#### 2.1 Sửa source migration lịch sử

- Thay bảng `translate(...)` bằng chuỗi Unicode tiếng Việt đúng.
- Sửa `replace(...)` cho `đ`/`Đ` đúng code point.
- Sửa comment và ví dụ display text.
- Giữ nguyên mapping canonical:
  - `deposit`;
  - `installment_1`;
  - `installment_2`;
  - `final`;
  - `outside`;
  - `adjustment`.

#### 2.2 Tạo migration repair mới

Tạo migration mới có timestamp hiện tại, dùng `CREATE OR REPLACE FUNCTION public.payment_stage_key_v2(text)` với implementation UTF-8 đúng. Migration mới phải idempotent và có cùng revoke/grant như function hiện tại.

Nếu cần backfill:

- Chạy `UPDATE payment_plans` có điều kiện như migration cũ.
- Không ghi đè stage đã cancel nếu invariant hiện tại loại bỏ `cancelled`.
- Trước update phải có query kiểm tra số row bị ảnh hưởng.

Gate migration:

- Kiểm thử trực tiếp các input:
  - `Đặt cọc` → `deposit`;
  - `Thanh toán đợt 1` → `installment_1`;
  - `Thanh toán đợt 2` → `installment_2`;
  - `Tất toán`/`Còn lại` → `final`;
  - `Thu ngoài đợt` → `outside`;
  - `Phát sinh hợp đồng` → `adjustment`.
- Kiểm tra ASCII legacy vẫn hoạt động.
- `REVOKE`/`GRANT service_role` giữ nguyên.
- Không apply production DB nếu chưa có xác nhận của user.

### Phase 3 — Dọn tài liệu có kiểm soát

- Với tài liệu mô tả lỗi lịch sử, thay ví dụ mojibake bằng một trong hai dạng:
  - Unicode escape/code-point notation; hoặc
  - mô tả tiếng Việt đúng kèm chú thích “chuỗi từng bị encode sai”.
- Không làm mất ý nghĩa audit lịch sử.
- Không xóa signature trong các file hướng dẫn Voice nếu signature đó đang là tiêu chí scan.
- Chỉ sửa tài liệu thứ ba sau khi Phase 0 xác nhận chính xác file nào Claude muốn nói tới.

Gate:

- Markdown vẫn đọc đúng.
- Link nội bộ không đổi.
- Scan phân biệt được zero accidental mojibake và intentional test signatures.

### Phase 4 — Thêm regression guard toàn repo

Tạo script, ví dụ `scripts/verify-utf8-mojibake.mjs`, có allowlist rõ ràng cho:

- tài liệu mô tả signature kiểm thử;
- fixtures cố ý chứa mojibake;
- binary/generated directories bị loại khỏi scan.

Script phải:

- chỉ scan tracked source/text files;
- báo file, dòng và context ngắn;
- trả exit code 1 khi có hit không nằm trong allowlist;
- phát hiện cả mojibake phổ biến, `U+FFFD` và C1 controls.

Thêm command package phù hợp, ví dụ `verify:utf8`.

### Phase 5 — Verify cuối

Chạy tối thiểu:

```text
pnpm verify:utf8
pnpm exec eslint lib/auth_utils.ts app/actions/user-management.ts
pnpm exec tsc --noEmit --pretty false
pnpm test -- --runInBand
pnpm build
```

Đối với migration, chạy test function trên database local/staging hoặc bằng verifier SQL độc lập trước khi đề xuất apply production.

## Rollback

- Source/runtime và docs: revert riêng patch encoding; không đụng các thay đổi Moodie WIP khác.
- Migration cũ: vì đã commit/khả năng đã apply, không rollback bằng cách xóa file.
- Migration repair mới: nếu function mới gây regression, tạo migration kế tiếp `CREATE OR REPLACE` về implementation đã biết đúng; không chỉnh lịch sử DB đã apply.

## Definition of Done

- Inventory giải thích chính xác toàn bộ các file Claude đề cập; không còn mơ hồ “3 docs”.
- Ba runtime error messages hiển thị tiếng Việt đúng.
- `payment_stage_key_v2` normalize đúng Unicode tiếng Việt trên DB chưa apply và DB đã apply.
- Không còn accidental mojibake trong tracked source/docs ngoài allowlist có lý do.
- UTF-8 verifier, lint, type-check, tests và production build đều pass.
- `plans/260711-moodie-voice/STATUS.md` được cập nhật với danh sách file thực tế và trạng thái fix.