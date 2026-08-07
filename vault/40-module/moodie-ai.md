---
title: "Module Moodie (trợ lý AI)"
tags: [module, moodie, ai]
cap-nhat: 2026-08-07
---

# Module Moodie (trợ lý AI)

Trợ lý AI trong app: chat, giọng nói, chạy hành động thay người dùng, có bộ nhớ dài hạn. **Mọi vai trò đều truy cập được** (kể cả `viewer`), nhưng kỹ năng bị giới hạn theo vai.

Quy mô: 15 bảng, 4.153 dòng — nhóm bảng lớn thứ ba sau gallery và hệ thống. Chủ yếu là log giọng nói (3.279 `moodie_voice_events`).

## Route

Trang: `/moodie`

API (13 route — nhiều nhất app):

| Nhóm | Route |
|---|---|
| Chat | `api/moodie/messages/stream` (SSE) |
| Agent run | `api/moodie/runs`, `runs/worker`, `runs/[runId]/{cancel,confirm,retry}` |
| Giọng nói | `api/moodie/voice/{token,ask,events}`, `api/moodie/audio/transcription` |
| Khác | `api/moodie/attachments`, `api/moodie/provider/config`, `api/moodie/memory/maintenance` |

## Bốn hệ con

### 1. Hội thoại
`ai_conversations` (60) → `ai_messages` (367) → `ai_turns` (144) · `moodie_message_feedback`

### 2. Agent run (hành động có thể tự chạy)
`moodie_agent_runs` (22) + `moodie_agent_run_events` (22) + `moodie_action_approvals`
Vòng đời qua RPC: `claim_moodie_agent_run` → `heartbeat_moodie_agent_run` → `finish_moodie_agent_run` (hoặc `retry_moodie_agent_run`).
Hành động chạm dữ liệu thật (`schedules`, `galleries`, `google_sync_queue`) → có bảng phê duyệt riêng.

**Quyền của Moodie bị chặn bởi chính vai trò người dùng** — `action-planner.ts` gọi `canAccess(role, rule.module)`. Moodie không được vượt quyền chủ nhân.

### 3. Giọng nói
`moodie_voice_sessions` (42) → `moodie_voice_turns` (143) → `moodie_voice_events` (3.279)
Hook: `use-moodie-live-voice.ts`, `use-moodie-wake-phrase.ts`, `use-moodie-turn.ts`

### 4. Bộ nhớ
`moodie_memories` · `moodie_memory_relations` · `moodie_observations` (62)
RPC: `match_moodie_memories` (hybrid retrieval), `finalize_moodie_memory_consolidation`, `maintain_moodie_memory_lifecycle`, `moodie_jsonb_cosine_similarity`

**Công thức xếp hạng** kiểu Generative Agents: relevance + importance + recency.
`recency` dùng **`last_used_at`** (lần truy hồi cuối), **không phải `updated_at`** — [[adr-index|ADR-009]]. Không có số hạng tần suất riêng, cố ý.

**Supersession đã có sẵn:** memory mới trùng `subject`+`predicate` với bản cũ nhưng khác nội dung → tự archive bản cũ (`status: archived`, **không hard-delete**) + ghi quan hệ `supersedes`. Xem `lib/moodie/memory-store.ts`.

⚠️ **Đừng xây thêm cơ chế phát hiện mâu thuẫn** — [[adr-index|ADR-010]] đã quyết định HOÃN. Rủi ro đã biết: đường implicit để LLM tự đặt `subject`/`predicate` nên supersession (so khớp EXACT) có thể trượt. Nhưng lúc quyết định, bảng chỉ có **1 dòng active trong toàn hệ thống** → chưa có bằng chứng cần sửa. Mở lại khi đo được near-duplicate tích luỹ. Nếu làm: ưu tiên fix rẻ (ràng buộc predicate về vocabulary đóng) trước khi thêm LLM call.

## Nhà cung cấp AI

- **Gemini** (`@google/genai`) — `MOODIE_GEMINI_API_KEY`, `MOODIE_GEMINI_MODEL`. Cấu hình động lưu trong `system_settings`, sửa qua `api/moodie/provider/config`.
- **Brave Search** — có hạn mức, đếm ở `moodie_brave_usage_daily` + `moodie_brave_audit_events`.

## Verify

`npm run verify:moodie-runtime` · `verify:moodie-ui` · `npm run moodie:map` / `moodie:map:status`

## Bảng

[[luoc-do-moodie-ai]] · [[tich-hop-ngoai]]
