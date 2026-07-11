# Moodie vNext — Engine-led UX plan

> Audit code ngày 2026-07-10. Mục tiêu: đưa năng lực thật của Moodie ra UI, không sao chép ảnh Open WebUI.

## Kết luận trace

Moodie đã có intent router, agent profiles, execution planner, tool manifest, live-data tools, memory policy, approvals, typed artifacts, provider/fallback, verifier, trace, summary checkpoint và SSE. Vấn đề chính là hợp đồng engine → UI:

1. SSE chỉ phát status tĩnh quanh một server action blocking; chưa có token delta, tool lifecycle, artifact lifecycle, source hay approval event thật.
2. UI suy activity từ trace sau khi hoàn tất nên người dùng không thấy Moodie đang làm gì.
3. Composer chỉ nhận text; nút `+` chỉ mở prompt gợi ý, chưa hỗ trợ attachment, context, tools hay commands.
4. Message parts chưa có ID/status/provenance/error/retry riêng.
5. Chưa có cancel, retry, edit-resend, regenerate, branch hay reconnect.
6. Sources, agent, memory, permission và plan là metadata ẩn thay vì interaction surface.

## Kiến trúc đích

- Runtime events là nguồn sự thật; UI không đoán trạng thái.
- Assistant message là cây parts; text chỉ là một part.
- Composer là capability surface, không phải model settings.
- Tool/provider/trace dùng progressive disclosure.
- Role, approval, memory và side effects tiếp tục do server quyết định.
- Học Open WebUI ở streaming, actions, branches, sources và composer ergonomics; không port model registry, arbitrary HTML hay unrestricted functions.

## P0 — Runtime event contract

Thay `MoodieStreamEvent` hiện tại bằng envelope có `version`, `request_id`, `turn_id`, `sequence`, `timestamp`.

Events tối thiểu:

- `turn.accepted`, `route.resolved`;
- `context.started/completed`, `plan.created`;
- `tool.started/progress/completed/failed`;
- `text.delta`, `part.created/updated`;
- `approval.required/resolved`, `memory.candidate`;
- `turn.completed/failed/cancelled`.

Yêu cầu:

- engine nhận `emit(event)` tại nơi công việc thật xảy ra;
- parallelize context độc lập, start sớm/await muộn;
- heartbeat, AbortSignal, reconnect cursor;
- sequence monotonic và reducer idempotent;
- persist final turn đúng một lần theo `turn_id`.

Files: `types/moodie.ts`, `lib/moodie/engine.ts`, `lib/moodie/tools.ts`, `lib/moodie/providers/types.ts`, `app/api/moodie/messages/stream/route.ts`, `lib/moodie/stream-client.ts`, `app/actions/moodie-mutations.ts`.

Gate: UI render timeline thật route → tool → text → persisted result; cancel và provider failure không tạo hai completion.

## P1 — Turn store và parts v2

Mỗi part có `id`, `type`, `status`, timestamps, provenance, actions, error/retry policy và payload typed.

Thêm parts: `text`, `reasoning_summary` an toàn, `tool_activity`, `source_list`, `file`, `approval`, `memory_candidate`, `error`; giữ metric/chart/timeline/table/gallery/diagram.

- Xây `useMoodieTurnStore` bằng reducer thay vì nhiều boolean state.
- Streaming text và incremental structured parts.
- Error/retry cục bộ: chart lỗi không làm mất text.
- Source registry map source ↔ tool run ↔ part.
- Adapter đọc metadata cũ; không phá conversation hiện có.

Files: `lib/moodie/message-parts.ts`, `lib/moodie/records.ts`, `components/moodie/moodie-message-parts.tsx`, `components/moodie/moodie-message-bubble.tsx`, store/hook mới.

Gate: mỗi part có lifecycle độc lập, provenance đúng và không rerender toàn thread theo từng delta.

## P2 — Composer capability hub

Tách composer thành input, toolbar, attachment tray, context tray và command menu.

- Textarea tự giãn; IME-safe Enter; Shift+Enter newline.
- Paste/drop ảnh và file; chips có upload/progress/error/remove.
- Draft theo conversation trong localStorage có schema version.
- Nút send chuyển thành stop trong active turn.
- Nút `+`: `Đính kèm`, `Ngữ cảnh`, `Công cụ`, `Tác vụ`, `Lệnh nhanh`.
- Context chips: hợp đồng, khách hàng, kỳ báo cáo, lịch, gallery, file.
- Capability list lấy từ manifest đã lọc server-side theo role.
- Prompt suggestions chuyển ra contextual starters/follow-ups.

Không đưa provider/model, temperature, max tokens, raw schemas hay tool bị cấm vào composer.

Files: `components/moodie/moodie-composer.tsx`, `components/moodie/composer/*`, `lib/moodie/catalog.ts`, `components/moodie/moodie-page-client.tsx`, upload API/storage policy.

Gate: gửi text + context + attachment, hủy được, retry được và không mất draft.

## P3 — Activity, sources và actions

- Thay thinking text luân phiên bằng live activity events.
- Activity row compact; mở rộng xem tool label, elapsed time, nguồn; không lộ chain-of-thought.
- Source badge cạnh part liên quan; drawer phân biệt live data, memory, upload và model knowledge.
- User actions: edit, copy, resend.
- Assistant actions: copy, regenerate, feedback, sources, activity/debug.
- Approval và memory candidate là parts trong đúng turn.
- Actions keyboard accessible, không phụ thuộc hover.

Files: `components/moodie/moodie-thinking-state.tsx`, `moodie-activity-panel.tsx`, `moodie-debug-panel.tsx`, `moodie-action-previews.tsx`, `moodie-memory-panel.tsx`.

Gate: người dùng biết Moodie đang làm gì, dùng nguồn nào, chờ duyệt gì và xử lý lỗi tại đúng vị trí.

## P4 — Branches và durable turns

- Message có `parent_message_id`, `revision`; conversation có active leaf.
- Regenerate tạo sibling branch, không ghi đè.
- Edit-and-resend tạo branch từ user message.
- Branch navigator và follow-ups chỉ ở latest completed leaf.
- Durable turn row hỗ trợ refresh/reconnect.
- Chỉ thêm Redis/queue khi đo được nhu cầu multi-instance; trước đó dùng Supabase + idempotency.

Gate: refresh giữa generation recover được; đổi branch không mất lịch sử.

## P5 — Performance, accessibility, telemetry

- Dynamic import chart/gallery/diagram và panels phụ.
- Parallel fetching, cached capability manifest, request dedupe.
- `content-visibility` hoặc virtualization theo đo lường.
- Live region, focus return, keyboard command menu, reduced motion.
- Đo time-to-first-event/text, tool/completion latency, cancel rate, retry success.

Gate: không thêm waterfall; desktop/mobile parity; composer không bị block bởi thread render; artifact bundles không nằm trong initial chunk.

## Schema dự kiến

Chưa migrate trước P0 review. Dự trù `ai_turns`, message revisions/active leaf, tool runs, sources, attachments, feedback; chỉ tách `ai_message_parts` khi reconnect/query/audit chứng minh JSON metadata không đủ. Approval ledger vẫn là nguồn sự thật.

## Verification

- Contract: order/version/sequence/idempotency, abort, fallback, reconnect, permission filtering.
- Component: IME, draft, upload, stop/send, part retry, sources, approval, branch navigation.
- E2E: new chat → stream → tool → source → persistence; attachment/context; cancel/retry; edit/regenerate; approval; refresh; locked conversation; desktop/tablet/mobile.
- Performance: first status <300ms local/staging bình thường; không chờ tool xong mới render activity; long thread không rerender toàn bộ mỗi delta.

## Thứ tự bắt buộc

1. P0 event contract.
2. P1 turn store/parts lifecycle.
3. P2 composer capability hub.
4. P3 activity/sources/actions.
5. P4 branches/durable turns.
6. P5 hardening.

Không bắt đầu bằng việc làm composer giống Open WebUI. Nếu P0/P1 chưa có, toolbar mới chỉ là vỏ UI không nối được engine.

## Definition of done

- Progress đến từ event thật.
- Text/artifacts stream, lỗi độc lập và retry được.
- Composer hỗ trợ context/attachment/capability an toàn.
- Cancel, retry, edit, regenerate và branch hoạt động.
- Source, memory và approval nằm đúng message/part.
- Server-side role/policy không bị nới lỏng.
- Refresh/reconnect không mất hoặc duplicate lượt.
- Desktop/mobile, accessibility, performance và regression gates qua.
