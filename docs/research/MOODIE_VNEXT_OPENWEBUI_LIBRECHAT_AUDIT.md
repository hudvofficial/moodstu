# Moodie vNext — Open WebUI and LibreChat audit

> Local source audit performed on 2026-07-10. Moodie ports contracts and product patterns, not source code or framework architecture.

## Problem observed

- Assistant responses arrive as one blocking server-action result.
- The renderer treats model text as custom paragraphs/lists and leaks malformed Markdown markers in headings.
- Status UI is inferred after completion instead of driven by runtime events.
- Conversation summaries are overwritten rather than checkpointed.
- Business tools, widgets, sources and actions are metadata attached to a text blob instead of explicit message parts.

## Open WebUI patterns

### Adopt

- Threshold/checkpoint-oriented context compaction that keeps previous summary, compacted history and recent messages separate.
- Ephemeral status events such as context compaction and tool progress.
- Follow-ups rendered only near the latest completed response.
- Memory management as a dedicated personalization surface.

### Adapt

- Moodie stores a compact rolling checkpoint on the conversation row and keeps recent messages verbatim.
- Status events use a small typed SSE contract; no socket dependency.
- Memory remains governed and approval-based because Moodie handles studio and financial workflows.

### Reject

- Broad workspace/plugin administration inside the chat screen.
- Browser-wide tool execution and unrestricted user-defined functions.

## LibreChat patterns

### Adopt

- Typed message/event contracts with explicit completion and error states.
- A generation lifecycle independent from the mounted client.
- Message content rendered as parts rather than assuming every response is plain text.
- Reconciliation of message layout when streaming content expands.

### Adapt

- Moodie starts with SSE over the existing Next.js runtime and can later add replay/resume storage.
- Existing Moodie widgets, sources and actions become first-class parts without adopting LibreChat's full agent schema.
- Provider aliases remain opaque; the event contract is provider-neutral.

### Reject

- Redis job infrastructure until Moodie needs multi-instance resumable generation.
- Multi-endpoint/model configuration inside the conversation UI.
- Artifact execution that can run arbitrary HTML or scripts.

## Moodie vNext contract

1. The client submits once and receives typed SSE events.
2. Runtime status is ephemeral and is not persisted as assistant prose.
3. Final conversation persistence remains authoritative in Supabase.
4. Identity, permission and memory policy are server-owned.
5. Conversation context uses a rolling checkpoint plus recent verbatim messages.
6. Stable memory candidates require explicit language and user approval.
7. Business data always comes from live tools.
8. The normal UI hides provider, token and tool internals unless diagnostics are relevant.

## Delivery state

- SSE status/result/error/done contract implemented.
- Compact streaming state implemented in desktop and mobile chat shells.
- Markdown headings, bold text and inline code render without leaking syntax.
- Rolling conversation summary checkpoint implemented.
- Identity and memory regression gates remain active.
- True provider token streaming and resumable replay are the next infrastructure step if latency measurements justify them.
