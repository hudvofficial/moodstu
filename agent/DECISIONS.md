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
