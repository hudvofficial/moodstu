# CLAUDE.md — mood-studio

Nguyên tắc hành vi + ràng buộc dự án. **Đọc trước khi code.**
Nguồn 4 nguyên tắc: Karpathy-inspired guidelines (MIT) — github.com/multica-ai/andrej-karpathy-skills.
**Tradeoff:** thiên về *cẩn trọng hơn tốc độ* cho việc non-trivial. Typo/one-liner hiển nhiên → dùng judgment.

## 1. Think Before Coding
*Đừng giả định. Đừng giấu chỗ bối rối. Nêu tradeoff.*
- Nêu giả định rõ ràng; chưa chắc → **hỏi**, đừng đoán.
- Nhiều cách hiểu → trình bày cả, đừng tự chọn thầm.
- Có cách đơn giản hơn → nói ra. **Push back khi đáng.**
- Chỗ nào mơ hồ → dừng, gọi tên cái chưa rõ, hỏi.

## 2. Simplicity First
*Code tối thiểu giải đúng vấn đề. Không speculative.*
- Không thêm tính năng ngoài yêu cầu; không abstraction cho code dùng 1 lần.
- Không "linh hoạt/cấu hình" không ai yêu cầu; không xử lý lỗi cho tình huống bất khả.
- **Trước khi viết util mới → grep xem đã có chưa** (vd `runOptimisticMutation` đã tồn tại). Tái dùng > tạo mới.
- Test: *"Senior engineer có thấy cái này rối rắm không?"* → có thì đơn giản hóa.

## 3. Surgical Changes
*Chỉ động cái buộc phải động. Dọn đúng phần mình bày ra.*
- Đừng "cải thiện" code/comment/format lân cận; đừng refactor cái không hỏng.
- **Match style hiện có** dù mình thích kiểu khác.
- Dead code không liên quan → **mention, ĐỪNG xóa**.
- Chỉ gỡ import/biến/hàm mà *thay đổi của mình* làm thừa.
- Test: **mỗi dòng đổi phải trace thẳng về yêu cầu của user.**

## 4. Goal-Driven Execution *(adapt cho mood-studio)*
*Định nghĩa success criteria, loop tới khi verified.*
- Success criteria dự án này = **`verify:<module>` pass + chrome-devtools render OK + đo Network cải thiện**. KHÔNG cứng nhắc unit-test-first — UI/perf verify bằng render + đo, không phải unit test.
- Logic/data thuần → jest/playwright khi phù hợp.
- Task nhiều bước → nêu plan ngắn: `[bước] → verify: [check]`.

---

## Ràng buộc dự án (cứng)
- **Sáng kiến perf đang chạy:** `plans/260603-native-feel-performance/PLAN.md`. **Đọc `plans/260603-native-feel-performance/LESSONS.md` trước mỗi task** (nhật ký lỗi + checklist).
- **Tách module, không liên đới** — 1 task / 1 module; file shared (`lib/swr.ts`, `bottom-nav.tsx`, `server-cache-invalidation.ts`) chỉ **additive** hoặc verify đa module.
- **Finance: GIỮ `revalidatePath`** (FinanceRealtimeRefresh chỉ là chuông báo READ additive — số luôn từ server, xem LESSONS A17). Optimistic **KHÔNG patch giá trị server tính lại** (mã tự sinh, recalc totals, tồn kho, status atomic) → "đóng modal + revalidate".
- **Verify trước deploy:** CSS/layout → render + screenshot chrome-devtools **TRƯỚC** deploy. Deploy: `npx vercel --prod`.
- **Node:** prepend `C:\Users\Admin\.nodejs\...` vào PATH rồi mới `pnpm`.
- **Responsive 3-tier** (chốt 2026-06-06, xem `plans/260606-tablet-design-layer/PLAN.md` + `lib/breakpoints.ts`): Phone `<768px` (base) · Tablet `768–1023px` (`md:`) · Desktop `≥1024px` (`lg:`). Layout density (bảng↔card, 1↔2 cột) toggle ở **`md:`**; chrome full-width giữ `lg:`; overlay/modal căn giữa ở `sm:` (640px). Verify mọi đổi responsive @768px + @1023px.
