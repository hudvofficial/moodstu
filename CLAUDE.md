# CLAUDE.md — mood-studio

Nguyên tắc hành vi + ràng buộc dự án. **Đọc trước khi code.**

> 📚 **Hệ thống mood-studio được mô tả đầy đủ trong [`vault/`](vault/README.md) — nguồn chân lý về kiến trúc & nghiệp vụ.**
> Vào việc lạ → mở [`vault/00-INDEX.md`](vault/00-INDEX.md) trước. Sửa module X → đọc `vault/40-module/X.md` + `vault/30-du-lieu/luoc-do-X.md`.
> Cần biết ai ghi vào bảng nào → [`vault/20-ban-do-code/bang-doc-ghi.md`](vault/20-ban-do-code/bang-doc-ghi.md).
> Trước khi viết spec → [`vault/60-bay/`](vault/60-bay/). Tài liệu trong `docs/` đã cũ hơn vault; mâu thuẫn thì tin vault.
> Vault sinh lại được: `node scripts/vault-gen-schema.mjs` + `node scripts/vault-gen-codemap.mjs`.
Nguồn 4 nguyên tắc: Karpathy-inspired guidelines (MIT) — github.com/multica-ai/andrej-karpathy-skills.
**Tradeoff:** thiên về *cẩn trọng hơn tốc độ* cho việc non-trivial. Typo/one-liner hiển nhiên → dùng judgment.

## 0. Phân công vai trò (Orchestration 3-agent)
> **NGUỒN CHÂN LÝ: [`agent/AGENT_RULES.md`](agent/AGENT_RULES.md).** Đọc nó + `agent/CURRENT_STATE.md` trước khi bắt đầu. Mục này là bản tóm tắt vai trò của Claude.

*Chạy trên IDE Antigravity với 3 agent: **Claude** (spec+review+điều phối) · **Codex** (writer duy nhất của source) · **Roo** (chạy/test, read-only).*

**Pipeline:** Claude spec → **user duyệt** → Codex implement (branch/worktree riêng) → Roo chạy+test → Claude review-vs-spec → Codex fix → CI gate (Actions `lint`+`build` + verify local) → merge.

- **Claude (mình):** phân tích + viết **specification** (`agent/HANDOFFS/<task>.spec.md`) + **review diff so với spec** + cập nhật `agent/*` + điều phối. **KHÔNG** tự viết source ứng dụng trong luồng 3-agent.
- **Khóa kiến trúc:** chỉ Claude đề xuất kiến trúc, ghi `agent/DECISIONS.md`, user duyệt. Codex/Roo cấm tự đổi kiến trúc.
- **Chống va chạm:** 1 task = 1 `owner`; `locks` không chồng nhau (`agent/TASKS.yaml`); mỗi lần chuyển bước = ghi `agent/HANDOFFS/` + update status.
- **FALLBACK (chỉ có Claude, không Codex/Roo):** được dùng subagent `coder` (`.claude/agents/coder.md`) + `reviewer` (`.claude/agents/reviewer.md`) để tự code+review. Đây là đường lùi.
- Phạm vi "code" = source ứng dụng (Codex, hoặc coder-subagent khi fallback). Claude VẪN làm: spec/docs, sửa config (CLAUDE.md, `agent/*`, agent định nghĩa), verify/git, phân tích — không phải "code".

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
- **Debugging:** dùng `.claude/skills/systematic-debugging.md` — 4 phase bắt buộc, KHÔNG được đoán fix trước khi trace root cause.
- **Claim "done":** dùng `.claude/skills/verification-before-completion.md` — chạy verify rồi mới được nói "xong". Không "should work".

## 5. Plan Quality *(extract từ superpowers/writing-plans)*
*Plan rõ = execute đúng. Plan mơ hồ = chạy sai hướng.*
- **Bite-sized tasks:** mỗi bước 2–5 phút, 1 action rõ ràng (không gộp).
- **Exact paths:** mọi bước phải có file path cụ thể + code thực tế nếu là code step.
- **No placeholders:** cấm "TBD", "TODO", "implement later", "add appropriate error handling", "similar to Task N". Mỗi bước phải đủ thông tin để execute mà không cần đoán.
- **Self-review trước khi trình user:** (1) spec coverage — mỗi yêu cầu có task? (2) placeholder scan — có pattern cấm không? (3) type consistency — tên hàm/type ở task sau match task trước? Sai → fix inline.
- **Verify trước khi push:** verify pass (render/Network/build) → rồi mới push. ⚠️ **Không còn cổng tự động nào chặn** (ADR-007 gỡ branch protection) — `push main` = deploy thẳng. Kỷ luật này giờ **tự giác**; Vercel chỉ chặn build hỏng, không chặn lỗi hành vi.

---

## Ràng buộc dự án (cứng)
- **Perf: coi như "đủ tốt" — KHÔNG mở lại đợt perf diện rộng** (chốt ADR-005, `agent/DECISIONS.md`). `plans/260603-native-feel-performance/PLAN.md` đã **lỗi thời**, chỉ đọc để tham khảo lịch sử. Muốn làm perf tiếp → **đo trước** (Speed Insights + `perf:*`), chỉ sửa cái số đo chỉ ra, và mở ADR riêng. **`plans/260603-native-feel-performance/LESSONS.md` thì VẪN đọc trước mỗi task** — nhật ký lỗi + checklist còn giá trị.
- **Tách module, không liên đới** — 1 task / 1 module; file shared (`lib/swr.ts`, `bottom-nav.tsx`, `server-cache-invalidation.ts`) chỉ **additive** hoặc verify đa module.
- **Finance: GIỮ `revalidatePath`** (FinanceRealtimeRefresh chỉ là chuông báo READ additive — số luôn từ server, xem LESSONS A17). Optimistic **KHÔNG patch giá trị server tính lại** (mã tự sinh, recalc totals, tồn kho, status atomic) → "đóng modal + revalidate".
- **Verify trước deploy:** CSS/layout → render + screenshot chrome-devtools **TRƯỚC** deploy. **Deploy = `git push origin main`** (Vercel auto-deploy nhánh main); KHÔNG dùng `npx vercel --prod` (CLI chưa auth, không có `VERCEL_TOKEN`).
- **Node:** đã có sẵn trên PATH (`C:\Program Files\nodejs`, v24). Gọi thẳng `node` / `npx` / `npm`. *(Chỗ cũ ghi prepend `C:\Users\Admin\.nodejs\...` là SAI — thư mục đó rỗng.)*
- **Package manager: dùng `npm`** cho verify local (`npm run lint`, `npm run build`) — khớp CI (`npm ci`). ⚠️ **Repo có CẢ `package-lock.json` lẫn `pnpm-lock.yaml`**: CI chạy npm, còn Vercel deploy tự bắt `pnpm-lock.yaml` → hai bên có thể cài cây phụ thuộc **khác nhau** (đã từng cháy: commit `1fa1a38 fix(deploy): sync pnpm lockfile for Google GenAI`). Thêm/đổi dependency → **cập nhật CẢ HAI lockfile**, nếu không CI xanh mà prod vẫn vỡ.
- **Responsive 3-tier** (chốt 2026-06-06, xem `plans/260606-tablet-design-layer/PLAN.md` + `lib/breakpoints.ts`): Phone `<768px` (base) · Tablet `768–1023px` (`md:`) · Desktop `≥1024px` (`lg:`). Layout density (bảng↔card, 1↔2 cột) toggle ở **`md:`**; chrome full-width giữ `lg:`; overlay/modal căn giữa ở `sm:` (640px). Verify mọi đổi responsive @768px + @1023px.
