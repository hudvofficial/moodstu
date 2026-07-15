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
