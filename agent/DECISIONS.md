# DECISIONS.md — Nhật ký quyết định kiến trúc (ADR)

> **Append-only.** Chỉ Claude ghi, sau khi user duyệt. Codex/Roo CẤM tự quyết kiến trúc —
> gặp chỗ cần đổi → viết HANDOFF trả Claude để mở một ADR ở đây.
> Format: mỗi quyết định = 1 khối. Không sửa quyết định cũ; muốn đổi → thêm ADR mới "Supersedes ADR-x".

---

## ADR-001 — Áp dụng pipeline 3-agent (Claude / Codex / Roo)
- **Ngày:** 2026-07-14 · **Trạng thái:** Accepted
- **Bối cảnh:** Chạy trên IDE Antigravity với 3 agent (Roo Code, Claude, Codex). Rủi ro: 3 agent cùng tự quyết kiến trúc + cùng sửa 1 vùng code.
- **Quyết định:** Pipeline tuyến tính có cổng người (xem `AGENT_RULES.md §1`); bộ docs chung bắt buộc trong `agent/`.
- **Hệ quả:** Mọi việc phải qua spec (Claude) → duyệt (user) → implement (Codex) → test (Roo) → review (Claude) → CI → merge.

## ADR-002 — Single-writer: chỉ Codex ghi source; Roo read-only
- **Ngày:** 2026-07-14 · **Trạng thái:** Accepted
- **Quyết định:** Codex là WRITER DUY NHẤT của source ứng dụng, chỉ trong `locks` của task + worktree riêng. Roo chỉ chạy/debug/test + báo cáo, **không sửa source**; tìm bug → HANDOFF trả Codex.
- **Lý do:** Khớp ràng buộc user "không cho 3 agent cùng chỉnh một vùng code".

## ADR-003 — Giữ subagent Claude (coder/reviewer) làm FALLBACK
- **Ngày:** 2026-07-14 · **Trạng thái:** Accepted
- **Quyết định:** `.claude/agents/coder.md` + `reviewer.md` giữ lại, chỉ dùng khi chạy Claude một mình (không có Codex/Roo). Có Codex/Roo → theo pipeline 3-agent.

## ADR-004 — Khóa kiến trúc thuộc về Claude; DECISIONS.md là cổng
- **Ngày:** 2026-07-14 · **Trạng thái:** Accepted
- **Quyết định:** Chỉ Claude đề xuất kiến trúc, mọi đổi kiến trúc (data-flow, thêm lib, đổi state pattern, đổi schema, client-direct/RLS) phải có ADR ở đây + user duyệt trước khi Codex chạm.

## ADR-005 — Perf: coi như "đủ tốt", đo trước khi làm thêm; ưu tiên PPR hơn client-direct
- **Ngày:** 2026-07-14 · **Trạng thái:** Accepted (định hướng)
- **Bối cảnh:** Phần lớn perf đã ship; repo đã pivot sang feature. PLAN `260603` lỗi thời.
- **Quyết định:** Không mở lại đợt perf diện rộng. Nếu tiếp: đo (Speed Insights + `perf:*`) → chỉ sửa cái số đo chỉ ra. Lever nav còn lại (force-dynamic) → dùng **PPR/`cacheComponents`**, KHÔNG client-direct (né rào RLS). Bất kỳ triển khai PPR nào cần mở ADR riêng.

## ADR-006 — Codex trên Windows: cấm apply_patch, ghi qua write_file; Claude giao qua plugin + effort-per-task
- **Ngày:** 2026-07-15 · **Trạng thái:** Accepted
- **Bối cảnh:** Task dogfood đầu (T-20260715-image-viewer-lint): Codex phân tích đúng nhưng KHÔNG ghi được file. Root cause (đã trace, không đoán): (1) `apply_patch` qua PowerShell 5.1 heredoc → mojibake UTF-8/CRLF; (2) `max` effort quá chậm → dính Bash timeout 10' của harness; (3) global `~/.codex/config.toml` có filesystem MCP trỏ nhầm `Mood Pro panel` (project config trỏ đúng nên override, nhưng là footgun).
- **Quyết định:**
  1. `AGENTS.md` thêm **Windows file-editing protocol**: cấm `apply_patch`, ghi cả file qua MCP `filesystem write_file` hoặc Node `fs.writeFileSync(...,'utf8')`; sửa nhỏ/ít file.
  2. **Claude giao Codex qua plugin** `/codex:rescue` (subagent `codex:codex-rescue`) — không còn copy-paste sang panel. Vẫn giữ single-writer=Codex + branch riêng + PR/CI.
  3. **Effort-per-task:** giữ global `max`; Claude ép `--effort medium` cho task cơ học, `max` cho task khó. KHÔNG sửa global config.
- **Chưa làm (footgun):** global filesystem MCP trỏ nhầm project — KHÔNG tự sửa global config của user; chỉ ghi nhận. Nếu write_file lỗi lại → cân nhắc sửa với sự đồng ý user.

## ADR-007 — Gỡ branch protection: `main` nhận push thẳng; CI là chuông báo, không phải cổng
- **Ngày:** 2026-07-15 · **Trạng thái:** Accepted · **Supersedes** phần "CI gate chặn merge" của ADR-001
- **Bối cảnh:** Ruleset `main` (id 18942214 — require PR + require check `quality`, 0 approval, no bypass) dựng sáng 2026-07-15, đã **gỡ chiều cùng ngày** theo quyết định của user. Lý do, đo bằng thực tế 1 ngày chạy:
  1. **Gate chưa bắt được gì.** Cả 2 PR (#5, #6) CI xanh ngay lần đầu. Không có lần nào gate ngăn được lỗi.
  2. **Chi phí thật, đổ lên user.** Mọi thay đổi — kể cả docs Claude tự viết — phải branch → PR → chờ CI → **user bấm Merge**. Guardrail chặn agent tự merge PR của chính nó (đúng), nên user thành nút bấm thủ công cho mọi task.
  3. **Trùng lặp:** Vercel vốn **không deploy build hỏng** → prod đã được che khỏi lỗi build mà không cần gate.
  4. **Vi phạm chính CLAUDE.md §2 (Simplicity First):** thêm cơ chế cho rủi ro chưa từng xảy ra.
- **Quyết định:** Gỡ ruleset. `main` nhận push thẳng, **deploy = `git push origin main`** như trước. Giữ nguyên: workflow `ci.yml` (chạy trên PR *và* push main, báo đỏ nhưng không chặn), verify local tầng 2, và **review-vs-spec của Claude**.
- **Hệ quả — điều PHẢI nhớ:** không còn cơ chế **cưỡng chế** nào ngăn code hỏng vào `main`; kỷ luật verify giờ **tự giác**. Lưới còn lại: Vercel chặn build hỏng (lỗi *build*), Claude review chặn lỗi *hành vi*. CI chỉ báo sau.
- **Bằng chứng review là tầng có giá trị nhất:** task dogfood T-20260715-image-viewer-lint — Codex làm mất `fill-` ở icon Heart (đỏ đặc → rỗng ruột). **Lint xanh, build xanh, CI xanh.** Chỉ review-vs-spec bắt được. Gate tự động sẽ **không bao giờ** bắt được lỗi loại này.
- **Mở lại khi nào:** có người thứ 2 commit vào repo, hoặc xảy ra sự cố thật do push thẳng. Bật lại ~2 phút (tạo ruleset require check `quality`) → mở ADR mới.

## ADR-008 — Gallery public: access model 2 tầng (view-token tự do · select-token sau mật khẩu)
- **Ngày:** 2026-07-15 · **Trạng thái:** Accepted (user chốt nghiệp vụ nguyên văn)
- **Nghiệp vụ (lời user):** *"album ngoài giao cô dâu, chú rể, thì họ còn share cho người thân, bạn bè, chúng ta chỉ cần pass khi họ bấm chọn (vì hình họ chọn nhân sự mood phải lọc ra để hậu kì, hoặc in ấn nên chỉ dâu rể có pass mà admin cung cấp mới đc chọn), còn lại xem thì vẫn đc"*
- **Ma trận quyền:** Xem = tự do · Thả tim = tự do (xã giao) · **Chọn ảnh + Ghi chú = cần mật khẩu** (input hậu kỳ/in ấn, chỉ dâu rể).
- **Trước đó code làm NGƯỢC:** tim bị hỏi pass (modal "Mật khẩu thả tim"), chọn thì fail im lặng. `PasswordGate` (chặn xem) là dead code — đúng chủ đích nghiệp vụ nên KHÔNG nối.
- **Thiết kế:** album có pass → `getPublicGallery` cấp **view-token** miễn phí (`buildGalleryAccessToken(data,"view")`); nhập đúng pass (`verifyGalleryPassword`) → **select-token**. Capability so khớp EXACT trong `lib/gallery-access.ts` (KHÔNG đụng — download routes dựa vào); tim chấp nhận view-token bằng 2 lần verify trong `toggleReaction`. Client gate chọn/ghi chú bằng `clientCapability === "view"` (decode sẵn có).
- **Đổi tên UI:** modal → "Mật khẩu chọn ảnh"; toggle admin → "Yêu cầu mật khẩu khi chọn ảnh" (label cũ "Bảo vệ album bằng mật khẩu" gây hiểu nhầm là chặn xem).
- **Hệ quả phụ:** khách chưa nhập pass trên album có pass sẽ KHÔNG thấy nút download trong viewer (view-token → showDownloadButton ẩn) — hợp lý, ghi nhận.
- **Kèm ADR-nhỏ (CSS):** token `--spacing-*` của dự án đụng namespace spacing scale Tailwind v4 → mọi `max-w-sm/md/lg/xl` = 8-32px (18 chỗ vỡ). Đã rename toàn cục `--spacing-*` → `--space-*` (7 token, 12 file) + `min-h-xl` → `min-h-8` (date-picker). CẤM define `--spacing-*`/`--container-*`/namespace utility Tailwind trong `@theme` từ nay.

## ADR-009 — Moodie memory: recency dùng `last_used_at`, không phải `updated_at`
- **Ngày:** 2026-07-17 · **Trạng thái:** Accepted (tuning nhỏ, không đổi kiến trúc/schema)
- **Bối cảnh:** Deep-research kiến trúc memory agent (Generative Agents, Mem0, MemGPT — 16/07) đối chiếu với code thật cho thấy RPC `match_moodie_memories` ([20260712100000](../supabase/migrations/20260712100000_moodie_memory_hybrid_retrieval.sql)) **đã có sẵn** công thức recency+importance+relevance kiểu Generative Agents, nhưng số hạng recency dùng `m.updated_at` (lần sửa cuối) thay vì `last_used_at` (lần truy hồi cuối, đã có cột từ 20260711180000 nhưng chưa bao giờ dùng trong scoring) — memory dùng liên tục không được củng cố thứ hạng.
- **Quyết định:** Đổi đúng 1 dòng công thức: recency = `coalesce(m.last_used_at, m.updated_at)` thay vì `m.updated_at`. KHÔNG thêm số hạng `use_count`/tần suất riêng — không hệ thống nào trong research khảo sát dùng frequency độc lập, thêm vào sẽ là suy đoán không căn cứ (vi phạm Simplicity First).
- **Task:** T-20260717-moodie-memory-recency-last-used (`agent/TASKS.yaml`).

## ADR-010 — Moodie memory: KHÔNG xây thêm cơ chế phát hiện mâu thuẫn (contradiction detection) lúc này
- **Ngày:** 2026-07-17 · **Trạng thái:** Accepted (quyết định HOÃN, không phải từ chối vĩnh viễn)
- **Bối cảnh:** Kế hoạch ban đầu (từ deep-research 16/07, đối chiếu Mem0's ADD/UPDATE/DELETE/NOOP qua LLM so top-N memory tương đồng) giả định Moodie **chưa có** cơ chế cập nhật/archive memory cũ khi có fact mới mâu thuẫn. Đọc lại code thật ([`memory-store.ts:145-211`](../lib/moodie/memory-store.ts#L145), hàm `createPendingMoodieMemory`) phát hiện giả định này **sai một phần**: cơ chế supersession **đã tồn tại** — khi memory mới trùng `subject`+`predicate` với memory pending/active cũ nhưng khác `content`, hệ thống tự động archive bản cũ (`status: archived`, KHÔNG hard-delete) + ghi quan hệ `supersedes` vào `moodie_memory_relations`. Đây thực chất gần với cách Zep xử lý contradiction (invalidate-on-contradiction thay vì expire-on-schedule hoặc hard delete) hơn là "chưa làm gì".
- **Rủi ro còn lại (thật, nhưng chưa có bằng chứng):** cơ chế supersession dựa vào so khớp **EXACT** `subject`+`predicate`. Đường **explicit** (`templateForPrompt` trong [`memory-curator.ts`](../lib/moodie/memory-curator.ts)) luôn dùng predicate cố định theo type nên supersession hoạt động ổn định. Đường **implicit** (LLM suy luận, `curateMoodieMemoriesWithModel`) để model tự đặt `subject`/`predicate` tự do, không ép vocabulary cố định — nếu model diễn đạt lại cùng 1 fact bằng subject/predicate khác lần trước, supersession sẽ KHÔNG khớp và tạo memory trùng thay vì archive bản cũ.
- **Vì sao KHÔNG sửa ngay:** lúc kiểm tra (verify Task A, 17/07), toàn bộ bảng `moodie_memories` trên prod chỉ có **1 dòng active duy nhất trong toàn hệ thống** — chưa có bằng chứng thực tế rằng implicit-predicate-drift đang gây trùng lặp/memory lỗi thời. Xây thêm cơ chế phát hiện mâu thuẫn ngữ nghĩa (LLM call so top-N tương đồng, kiểu Mem0) lúc này là suy đoán cho tình huống chưa xảy ra — vi phạm Simplicity First và đi ngược tinh thần ADR-005 ("đo trước khi tối ưu, chỉ sửa cái số đo chỉ ra").
- **Quyết định:** KHÔNG xây thêm contradiction-detection mới lúc này. Ghi nhận rủi ro ở đây để không ai phải trace lại từ đầu. Cân nhắc lại khi **có bằng chứng đo được** — ví dụ query `moodie_memories` cho thấy nhiều dòng cùng `user_id`+`memory_type` có nội dung gần giống nhau (near-duplicate) tích lũy theo thời gian, hoặc feedback thật từ user rằng Moodie "nhớ nhầm/nhớ cũ".
- **Nếu làm sau này:** ưu tiên fix RẺ trước khi build MỚI — ví dụ ràng buộc predicate của đường implicit về một vocabulary đóng theo `memory_type` (cùng tinh thần với đường explicit đã làm), thay vì thêm hẳn 1 LLM call so sánh ngữ nghĩa mới.

## ADR-011 — Gallery: cổng tải ảnh gốc là UX-gate, KHÔNG phải security-gate (chấp nhận lộ qua URL lh3)
- **Ngày:** 2026-07-21 · **Trạng thái:** Accepted (user chốt phương án A sau audit 20/07)
- **Bối cảnh:** Audit toàn app phát hiện (HIGH) khách có thể tải ảnh gốc full-res né cổng chặn tải + cổng thanh toán: ảnh Drive share public, và `image_url`/`thumbnail_url` khách bắt buộc nhận để XEM ảnh có dạng `lh3.googleusercontent.com/d/<fileId>=sN` — đổi `=sN` → `=s0` là ra ảnh gốc. Phương án "giấu cột `drive_file_id` khỏi payload" bị RÚT ngay khi scope: fileId nằm sẵn trong chính URL ảnh (gallery-helpers.ts còn tự extract bằng regex) → giấu cột riêng là bảo mật hình thức.
- **Quyết định:** Chấp nhận. 2 route download (`gallery-download`, `gallery-download-batch`) với gate view/unlock/payment giữ nguyên vai trò **UX-gate** — hướng khách phổ thông đi đúng luồng trả tiền; KHÔNG coi là security-gate. Phù hợp nghiệp vụ ADR-008 (album chia sẻ tự do cho người thân). Đóng kín thật (Drive restricted + proxy token) chỉ mở lại nếu thu tiền tải ảnh gốc thành nguồn thu quan trọng → ADR mới.
- **Đã làm kèm (cùng đợt audit):** rate-limit `verifyGalleryPassword` 10 sai/15min/gallery (bảng `gallery_password_attempts`, service-role only, verified e2e prod 21/07, commit `1d5a2ca`); các fix HIGH/MEDIUM khác ở commit `26f3eaf`.
- **Điều PHẢI nhớ:** đừng ai "vá" lại kiểu giấu `drive_file_id` — vô nghĩa chừng nào ảnh còn serve thẳng từ lh3.

## ADR-012 — Gallery public: tối ưu LCP mobile theo số đo Speed Insights (đúng phạm vi ADR-005)
- **Ngày:** 2026-07-21 · **Trạng thái:** Accepted (user duyệt sau khi xem số đo; yêu cầu lên plan trước khi code)
- **Số đo (Speed Insights 7 ngày + trace lab tái hiện):** Mobile LCP P75 = 4.92s (đỏ); trace mobile 4xCPU/Fast-4G: LCP 5.76s = TTFB 0.44s (tốt) + **load delay 2.76s** + tải ảnh 1ms + **render delay 2.56s**. LCPDiscovery 3/3 FAILED: ảnh LCP bị coi là script-injected, loading=lazy, không fetchpriority.
- **Root cause (đã trace tới dòng):** (1) `imageSrc` phụ thuộc `columnWidth` runtime (gallery-image-grid.tsx:110-113) → SSR giả định 5 cột desktop, client mobile 2 cột → src đổi sau hydration → img node bị thay, trình duyệt vứt ảnh HTML tải lại bằng JS; (2) `eagerLoad = index < max(columnCount,3)` → mobile chỉ 3 ảnh eager, lại thiếu fetchpriority trong HTML thực tế; (3) img `opacity-0` chờ onLoad JS mới hiện → paint LCP buộc đợi JS.
- **Quyết định:** sửa đúng 3 điểm trên trong module gallery grid (shared admin+public → verify cả 2), theo plan `plans/260721-gallery-mobile-lcp/PLAN.md`. Học albumse: thumbnail dùng MỘT cỡ cố định (họ dùng w601 cho mọi ảnh) → src ổn định tuyệt đối giữa SSR/client.
- **Không làm:** /dashboard TTFB 5.69s (admin-only, task riêng khi cần); desktop TTFB tổng (số gộp nhiễu giai đoạn bug).
- **Success criteria:** trace lab cùng điều kiện: LCP < 2.5s + LCPDiscovery 3/3 PASS; render OK @390/@768/@1280 cả public lẫn admin gallery; Speed Insights mobile LCP xanh sau vài ngày.

## ADR-014 — In ấn: bỏ "đặt cọc"/"giao khách"/kho vật tư khỏi trạng thái đơn; công nợ Lab thành trục độc lập
- **Ngày:** 2026-08-24 · **Trạng thái:** **Accepted** (user xác nhận nghiệp vụ trực tiếp: "chụp xong gửi lab, lab nhận đơn, lab đang in, lab gửi hình về = xong đơn, còn lại là dòng tiền Mood nợ Lab" — không có khái niệm cọc trong quan hệ Mood↔Lab).
- **Bối cảnh:** Trace `/contracts/[id]` → `/printing` phát hiện `printing_orders.status` hiện có 8 giá trị (`cho_xu_ly · dat_coc · dang_in · da_in · da_giao · hoan_thanh · huy_don · gap_su_co` + legacy `da_nhan/da_huy`) mô phỏng luồng "khách trả Mood" (đặt cọc, tất toán) và "kho vật tư nội bộ" (giữ chỗ/xuất kho) — cả hai đều **không tồn tại** trong nghiệp vụ thật: in ấn thuần là Mood gửi hàng cho Lab đối tác, tiền là công nợ Mood nợ Lab, không có kho.
- **Đo được (DB thật qua pooler, 27 đơn in đang hoạt động):**
  - `inventory_reservations`/`inventory_transactions` cho đơn in: **0/27** — nhánh `startProduction`/`completeProduction` (giữ chỗ + xuất kho) chưa từng chạy; nếu bấm "Hoàn thành in" thật trong drawer sẽ throw lỗi (reservation luôn rỗng vì form không có `item_id`).
  - `da_giao` ("Đã giao khách"): **0/27** đơn từng dùng — việc giao khách đã thuộc `contract_events.giao_san_pham` (vault `vong-doi-hop-dong.md` §8), không cần lặp lại ở đơn in.
  - `printing_orders.payment_status` bị ghi bằng **2 từ vựng không tương thích**: `unpaid/partial/paid` (tiếng Anh, từ `recordDepositPayment`/`recordFinalPayment`) vs `chua_thanh_toan/da_thanh_toan` (tiếng Việt, từ `record_lab_payment_atomic`) — không có `CHECK` constraint nào chặn. DB thật 100% chỉ có giá trị tiếng Việt, nhưng `printing_stats()` + 2 tab lọc `/printing` hỏi bằng tiếng Anh → **KPI "Chưa thanh toán" hiển thị 0 ₫, thực tế 5.567.000 ₫** (67% tổng chi phí in); tab lọc "Chưa thanh toán" trả về 0/25 đơn.
  - 2 đơn đang ở `dat_coc` (`IN-260625-00120`, `IN-260702-00121`) có `deposit_amount=0, paid_amount=0`, **0 dòng** `order_payments`/`lab_payment_allocations` — chưa từng có tiền thật, chỉ là nhãn đổi tay qua dropdown không kiểm tiền. Hợp đồng gốc của cả 2 (`HĐ-2026-0029`, `HĐ-2026-0038`) đã `hoan_thanh` từ lâu.
- **Quyết định:** rút gọn trạng thái sản xuất còn 4 bước tuyến tính (`cho_xu_ly → dang_in → da_in → hoan_thanh`, giữ nhánh `huy_don`/`gap_su_co`); gộp `da_nhan` (legacy) vào `hoan_thanh`; xoá `dat_coc`, `da_giao` khỏi trạng thái đơn; công nợ Lab tính động `total_amount − SUM(lab_payment_allocations)` hiển thị độc lập (không gate bước nào) — cơ chế `record_lab_payment_atomic`/`finance_lab_debt_summary` giữ nguyên, đã đúng. Xoá `startProduction`/`completeProduction`/`recordDepositPayment`/`recordFinalPayment` khỏi `printing-workflow-mutations.ts`.
- **Không làm:** không đụng `payment_plans`/`payment_stage_key_v2` (đợt cọc **khách trả Mood** ở module Hợp đồng — đúng, khác domain, giữ nguyên).
- **Chi tiết + diff từng file:** `agent/HANDOFFS/T-20260824-printing-workflow-redesign.spec.md`.

## ADR-015 — In ấn: SSOT cho reason/rollback/overdue; drawer đồng bộ theo key; xoá "Hoàn tiền" khỏi luồng hủy đơn
- **Ngày:** 2026-08-25 · **Trạng thái:** **Accepted** (user duyệt "ok duyệt theo đề xuất, bạn trực tiếp tiến hành triển khai code").
- **Bối cảnh:** Review 2 vòng `/printing` theo ảnh user (dropdown trạng thái đơn `IN-260609-00016`, rồi "phải hard F5 mới thấy update") tìm 6 bug độc lập trong đúng luồng đổi trạng thái mà ADR-014 mới thiết kế lại. Nặng nhất: (1) server bắt buộc `reason` cho `gap_su_co`/`huy_don` nhưng `/printing` không thu thập ở đâu, và `/contracts/[id]` có modal nhưng `requiresReason()` thiếu `huy_don` → "Hủy đơn" fail ở **cả 2 trang**; (2) `selectedContractGroup`/`editingOrder` là snapshot `useState` chụp lúc mở drawer, không đồng bộ lại theo SWR → drawer đang mở không thấy thay đổi do chính nó gây ra. Chi tiết 6 bug: `agent/HANDOFFS/T-20260825-printing-drawer-fixes.spec.md`.
- **Quyết định (a) — SSOT:** "khi nào bắt buộc lý do" (`printingStatusRequiresReason`), "bước lùi" (`isPrintingStatusRollback`) và "quá hạn" (`isPrintingOrderOverdue`) đặt **duy nhất** ở `types/printing-constants.ts`, server + mọi client đọc từ đó — cùng nguyên tắc ADR-014 áp cho `PRINTING_VALID_TRANSITIONS`. Bằng chứng cần thiết: đúng lớp bug "2 nơi tự định nghĩa, lệch nhau" mà ADR-014 vá cho `payment_status` **đã tái diễn** ngay ở logic reason (client thiếu `huy_don`, server còn `dat_coc`/`da_giao` trong mảng rollback).
- **Quyết định (b) — drawer đồng bộ theo key:** giữ `useState` object như hiện tại nhưng thêm `useEffect` tra lại item tươi theo `id`/`contractCode` từ SWR mỗi khi data đổi. KHÔNG chuyển sang derived state thuần — diff nhỏ hơn, không phải viết lại handler/JSX, và tự nhiên an toàn ở edge case item bị lọc khỏi trang hiện tại (giữ bản cuối thay vì đóng drawer/rớt về "tạo mới" giữa chừng).
- **Quyết định (c) — xoá "Hoàn tiền" khỏi `CancelOrderModal`/`cancelOrder()`:** không "vá" bằng cách nạp `paidAmount` thật. Theo ADR-014, khách **không trả tiền Mood qua đơn in** (tiền khách thuộc `payment_plans` ở Hợp đồng) → "hoàn tiền khách khi hủy đơn in" không còn cơ sở nghiệp vụ; đây là tàn dư luồng "đặt cọc" đã xoá, sót vì `cancel-order-modal.tsx` không nằm trong locks của ADR-014.
- **Kèm theo:** badge công nợ lab trong drawer đổi nguồn từ view `order_payment_summary` (← `order_payments`, mô hình cũ, luôn ≈ tổng đơn) sang `lab_payment_allocations` (Trục B thật). Overdue so theo **ngày lịch local** thay vì `new Date(str) < new Date()` (lệch UTC+7). `gap_su_co` đổi màu cam (warning/pending) để tách khỏi `huy_don` đỏ.
- **Không làm:** nhánh "hoàn kho" trong `cancelOrder()` cũng là dead code (kho vật tư đã rời nghiệp vụ in ấn) nhưng không có triệu chứng sai → chỉ ghi nhận (CLAUDE.md §3).

## ADR-013 — Gắn generic `Database` cho Supabase client: làm từng module, KHÔNG làm một lượt
- **Ngày:** 2026-08-07 · **Trạng thái:** **Accepted** (user duyệt 2026-08-07). Phase 1 = module Finance.
- **Bối cảnh:** `types/database.types.ts` vừa được sinh lại khớp DB (T-20260807-regen-database-types). Nhưng type **không bảo vệ phần lớn app**: `createAdminClient()` (`lib/supabase/server.ts:37`) gọi `createServerClient(...)` không generic, và `lib/auth_utils.ts` khai tham số là `SupabaseClient` trần → `SupabaseClient<any>`. Chỉ nhánh Moodie + 4 file `lib/` (`studio-info`, `system-settings`, `settings-studio-admin`, `productivity-transforms`) tự khai `SupabaseClient<Database>`.
- **Đo (thí nghiệm đã hoàn tác, working tree sạch):** gắn `createServerClient<Database>` + đổi `SupabaseClient` → `SupabaseClient<Database>` trong `auth_utils.ts` rồi `npx tsc --noEmit`:
  - baseline **0 lỗi** → sau khi gắn **232 lỗi / 68 file**
  - phân bố: TS2322 93 (chủ yếu `null` vs `undefined`) · **TS2339 57 (truy cập cột KHÔNG tồn tại)** · TS2345 51 · TS18047 11 · khác 20
  - nặng nhất: `export-actions.ts` 43 · `inventory-mutations.ts` 17 · `salary-actions.ts` 10 · `finance-operations-queries.ts` 8 · `work-task-actions.ts` 7 · `printing-workflow-mutations.ts` 7 · `gallery-admin-actions.ts` 7
- **Bằng chứng việc này có giá trị thật, không phải dọn dẹp thẩm mỹ:** 57 lỗi TS2339 dẫn thẳng tới một bug đã xác minh bằng request PostgREST thật — `app/actions/export-actions.ts` select cột không tồn tại ở **4/5** nhánh (`contracts.customer_name`, `expenses.category_name`, `employees.base_salary`, `customers.customer_name` → HTTP 400 `42703`). Code đó `if (error) throw error` nên hỏng hoàn toàn, không phải suy giảm âm thầm. Không ai kêu vì `exportToCSV` không được gọi ở đâu (đã xoá trong T-20260807-cleanup-3-ton-dong — `/reports` có bản export Excel khác đang chạy).
- **Quyết định (đề xuất):**
  1. **KHÔNG** gắn generic một lượt ở `lib/auth_utils.ts`. 232 lỗi trong một PR là công thức bỏ sót — nhất là 57 lỗi TS2339, mỗi cái phải điều tra riêng vì có thể là một `export-actions` khác.
  2. Đi **từng module một**, mỗi module một task, thứ tự theo mức rủi ro dữ liệu: **finance → contracts → inventory/printing → gallery → phần còn lại**.
  3. Cách gắn: khai `SupabaseClient<Database>` **tại từng action file** (tham số của callback `withAuth`), KHÔNG đổi chữ ký `auth_utils.ts` cho tới khi module cuối cùng xong. Như vậy mỗi task tự cô lập, `tsc` luôn xanh giữa các task.
  4. Bước cuối (sau khi mọi module xanh): đổi `createServerClient` → `createServerClient<Database>` + `SupabaseClient` → `SupabaseClient<Database>` trong `auth_utils.ts`, để không ai lùi lại được.
  5. Mỗi task **phải phân loại lỗi trước khi sửa**: `null↔undefined` = cơ học; **TS2339 = dừng lại, query DB xác minh cột, coi như bug tiềm ẩn** cho tới khi chứng minh ngược lại.
- **Vì sao không hoãn hẳn:** khác với các đề xuất "dọn dẹp" thông thường, cái này **đã bắt được bug thật ngay trong lần đo đầu tiên**. Không phải suy đoán theo tinh thần ADR-005 — có bằng chứng đo được.
- **Vì sao không làm ngay toàn bộ:** vi phạm "1 task / 1 module" (CLAUDE.md) và không có cổng tự động nào chặn nữa (ADR-007) → PR 68 file là rủi ro thật.
- **Chưa quyết:** có gắn generic cho `createClient()` (client vai người dùng, dùng ở SSR/browser) hay chỉ `createAdminClient()`. Quyết khi làm tới module đầu tiên.
