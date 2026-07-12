# Moodie stable streaming → final plan

## Objective

Eliminate visible flashing, blank frames, duplicate answer surfaces, unnecessary status churn, and scroll jumps throughout a Moodie turn. Preserve verifier/tool quality while making the answer behave as one continuously updated assistant message from acceptance through persisted final state.

This plan is evidence-driven. A green reducer test alone does not prove the UX is fixed. Completion requires event traces, DOM identity checks, responsive runtime verification, and coverage of plain text, tool, rewrite, and structured-part responses.

## Current evidence

### Confirmed causes

1. `lib/moodie/engine.ts` emits `text.reset` in at least three paths:
   - verifier rejects a streamed answer and requests correction;
   - verifier supplies `replacementContent` after streaming;
   - a model step streamed prose but returned tool calls, so the prose is retracted before tool execution.
2. `lib/moodie/turn-store.ts` previously changed `streamedText` directly to an empty string on every `text.reset`. That guarantees a visible content → blank → content transition.
3. `components/moodie/moodie-thread.tsx` renders the active answer through `MoodieThinkingState`, then removes that surface and renders the persisted assistant through `MoodieMessageBubble` after completion.
4. Both the thinking surface and assistant bubble previously used `animate-fade-in-up`, creating another visual entrance at final commit.
5. Structured parts are streamed with stable event IDs in turn state, but `MoodieMessageParts` renders persisted parts with array-index keys. Identity continuity between streamed and final parts is therefore not guaranteed.
6. `turn.saving` occurs after engine output has finished but before the assistant row and conversation snapshot have been persisted. The user may see a technical saving phase even though answer content already appears complete.

### Open WebUI source comparison

Authoritative Open WebUI documentation and source establish the following pattern:

1. An empty assistant message is inserted into both the chat message list and indexed history before completion starts. It has a stable message ID, `done: false`, and the user message as its parent.
2. Streaming updates mutate `history.messages[messageId].content` for that same assistant message instead of rendering a separate thinking answer and replacing it with a final message.
3. The message tree retains `currentId`, parent IDs, and child IDs, so branch and render identity exist before the first token.
4. Recent Open WebUI performance work batches streaming message-list rebuilds to at most once per animation frame, batches scroll work with `requestAnimationFrame`, skips expensive content comparisons during streaming, and persists only final status updates.
5. Open WebUI documentation also warns that full-content snapshot replacement during native function calling can make tool-emitted updates flicker/disappear. Moodie therefore needs explicit revision/replacement semantics rather than treating every update as an unrelated render.

Moodie's current split `MoodieThinkingState` → persisted `MoodieMessageBubble` lifecycle differs materially from this pattern. The target optimistic assistant design below is based on this evidence.

References inspected on 2026-07-11:

- Open WebUI backend-controlled API flow documentation.
- Open WebUI `Messages.svelte` source showing updates to `history.messages[messageId].content`.
- Open WebUI changelog entries for streaming comparison, rAF scroll batching, message-list batching, and final-only status persistence.
- Open WebUI tool development documentation describing flicker from full snapshot replacement.

### Partial fix already applied

- `text.reset` now retains the last draft until the first replacement delta arrives.
- The first delta after reset atomically replaces the retained draft.
- Entrance animation was removed from the active thinking container and completed assistant bubble.
- Reducer regression test proves no blank state occurs between reset and replacement delta.

This partial fix does not yet prove stable DOM identity, stable scroll, structured-part continuity, or absence of duplicate surfaces during final commit.

## Target invariants

### Content invariants

- Once non-empty assistant content becomes visible, it must not become empty unless the user cancels/deletes the turn.
- A verifier rewrite replaces the visible draft atomically at the first replacement chunk.
- Tool-call retraction never exposes a blank answer frame.
- Completion never renders both a streaming answer and persisted answer simultaneously.
- Final content must equal persisted content.

### DOM invariants

- One assistant answer surface per active turn.
- The assistant surface keeps a stable React/DOM identity from first visible status through final commit.
- Status changes update descendants, not the root answer node.
- Structured parts keep stable keys across streaming and final states.
- Assistant final does not replay an entrance animation.

### Layout invariants

- No horizontal overflow at 320–430px.
- No large scroll jump during rewrite, part creation, saving, or final commit.
- Removing the status row at completion does not collapse the answer enough to visibly jump content.
- Metric grids/tables do not flash, duplicate, or remount when persisted data replaces stream state.

### Status invariants

- Only meaningful user-facing phases change the collapsed label.
- `turn.saving` and persistence internals do not replace visible content or create animation.
- Detailed tool/verifier lifecycle remains available in expandable execution details without exposing chain-of-thought.

## Phase 1 — Capture authoritative event timelines

### Work

Add development/test instrumentation around `sendMoodieStreamingMessage` and `reduceMoodieTurn` that records:

- event type, sequence, turn ID, and timestamp;
- streamed text length before/after each event;
- replacement flag before/after;
- part count;
- active stage and status label;
- completion-to-conversation-commit duration.

Do not log prompts, model text, tool payloads, secrets, or customer data. Instrumentation must be test/dev-only or explicitly gated.

### Required scenarios

1. Model-only text response.
2. One-tool response.
3. Tool response that first streams prose then retracts it.
4. Verifier correction loop.
5. Verifier `replacementContent` path.
6. Metric-grid/table response.
7. Cancel during generation.
8. Error after partial content.

### Files

- `lib/moodie/stream-client.ts`
- `hooks/use-moodie-turn.ts`
- optional `lib/moodie/stream-diagnostics.ts`
- integration tests under `tests/integration/`

### Gate

For each scenario, retain a sanitized timeline proving exactly how many resets, generation passes, parts, and final commits occur.

## Phase 2 — Measure DOM and visual transitions

### Work

Create an E2E observer installed before sending the prompt. Track:

- root assistant node identity;
- mount/unmount count;
- text length snapshots;
- any non-empty → empty transition;
- count of simultaneous assistant answer surfaces;
- bounding-box height changes;
- scrollTop and distance-to-bottom changes;
- animation names applied to assistant surfaces.

Use `MutationObserver`, element references, and `getBoundingClientRect`; do not rely only on screenshots. Sample high-frequency measurements at most once per `requestAnimationFrame`, matching the proven Open WebUI strategy and avoiding the observer itself distorting layout performance.

### Viewports

- 390×844 mobile primary.
- 320×568 constrained mobile.
- 430×932 large mobile.
- 1440×900 desktop.

### Files

- new `tests/e2e/moodie-stream-stability.spec.ts`
- existing seed/setup utilities where available

### Gate

The test must fail against a deliberate content clear or assistant remount. A screenshot alone is insufficient.

## Phase 3 — Introduce one optimistic assistant message

### Design

Represent the active turn as an optimistic assistant message keyed by a stable client/turn identity:

```ts
{
  id: `turn:${turnId}`,
  role: "assistant",
  status: "streaming" | "saving" | "completed" | "failed" | "cancelled",
  content: string,
  parts: Array<{ id: string; part: MoodieMessagePart }>,
  activities: MoodieTurnActivity[],
  sources: MoodieMessageSourceV2[],
  persistedMessageId?: string
}
```

`MoodieThread` should append this optimistic message to the selected branch while the turn is active. It should not append a separate `MoodieThinkingState` after the message list.

### Commit strategy

At `turn.completed`:

- patch the optimistic message with persisted content/metadata;
- map its stable client key to the persisted message ID;
- avoid rendering both optimistic and persisted versions;
- remove optimistic state only after the conversation cache contains the matching persisted request/turn identity;
- keep the React key stable during the handoff.

### Files

- `lib/moodie/turn-store.ts`
- `hooks/use-moodie-turn.ts`
- `components/moodie/moodie-thread.tsx`
- `components/moodie/moodie-message-bubble.tsx`
- `components/moodie/moodie-thinking-state.tsx` (reduce to an inner status block or retire)
- `types/moodie.ts`

### Gate

One root DOM node from accepted state through persisted final state. No overlap and no remount.

## Phase 4 — Make rewrite semantics explicit

### Work

Replace ambiguous reset behavior with an explicit protocol if the existing event contract remains hard to reason about:

```ts
{ type: "text.replacement.started", revision: number }
{ type: "text.delta", revision: number, delta: string }
{ type: "text.replacement.completed", revision: number }
```

Alternative: keep `text.reset`, but add revision IDs and buffer the first replacement chunk before committing it.

### Decisions

- Stream only content suitable for provisional display.
- If verifier commonly rejects first-pass output, consider buffering the first pass until basic deterministic verification succeeds.
- Do not hide long model work entirely; status may remain visible while a replacement is prepared.
- Preserve cancellation and reconnect semantics across revisions.

### Files

- `types/moodie.ts`
- `lib/moodie/engine.ts`
- provider adapters if revision metadata originates there
- `lib/moodie/turn-store.ts`
- `lib/moodie/stream-client.ts`

### Gate

Every delta belongs to a known revision; stale or out-of-order revision chunks cannot corrupt visible content.

## Phase 5 — Structured-part identity and deduplication

### Work

- Preserve `part_id` from SSE through persisted metadata.
- Render parts by stable ID rather than array index.
- Deduplicate text widgets/parts emitted from tool metadata and final metadata.
- Ensure a metric grid shown during streaming is patched, not recreated, at completion.
- Validate dynamic chart loading does not create a second skeleton after final commit.

### Files

- `types/moodie.ts`
- `lib/moodie/engine.ts`
- `components/moodie/moodie-message-parts.tsx`
- `components/moodie/moodie-message-bubble.tsx`
- metadata persistence in `app/actions/moodie-mutations.ts`

### Gate

Metric grid/table/chart nodes retain identity and appear once across stream → final.

## Phase 6 — Status and saving UX

### Work

Map raw events to a small stable set of visible phases:

- Đang tìm dữ liệu
- Đang phân tích
- Đang soạn câu trả lời

When content is already visible:

- keep status as a quiet inline secondary row;
- do not animate the answer container;
- suppress `Đang lưu câu trả lời` from the primary visible phase;
- retain saving/activity detail in execution history;
- reserve enough status height to avoid layout collapse on completion, or transition without moving already-read content.

### Files

- `lib/moodie/activity-presentation.ts`
- `components/moodie/moodie-thinking-state.tsx` or successor
- `components/moodie/moodie-execution-summary.tsx`

### Gate

No rapid label churn in collapsed UI; technical events remain inspectable in details.

## Phase 7 — Scroll anchoring and render performance

### Work

- Separate high-frequency stream state from the full conversation tree where possible.
- Memoize the optimistic assistant surface so text deltas do not rerender historical messages.
- Keep event handlers stable and avoid rebuilding branch maps due only to transient delta state.
- Use a bottom-distance anchor when the user is near the bottom.
- Never force-scroll when the user has intentionally scrolled upward.
- Batch final cache/active/pending/sending updates into one reducer or one explicit commit action.

### Vercel React guidance applied

- Split hooks by dependency domain.
- Subscribe to derived booleans instead of broad state where possible.
- Use stable components; do not define inline components.
- Use transitions only for non-urgent conversation-list updates, not for visible final answer commit.
- Avoid effect-derived duplicate message state.

### Files

- `components/moodie/moodie-page-client.tsx`
- `components/moodie/moodie-thread.tsx`
- `hooks/use-moodie-turn.ts`

### Gate

Historical bubbles do not rerender on each token; scroll delta stays within the defined E2E threshold.

## Phase 8 — Verification matrix

### Unit

- Reset keeps prior draft until replacement starts.
- First replacement delta atomically replaces prior revision.
- Multiple resets do not create empty content.
- Duplicate/out-of-order events remain idempotent.
- Revision IDs reject stale chunks.
- Stable part IDs deduplicate correctly.
- Completion preserves optimistic message identity mapping.

### Integration

- Engine verifier correction timeline.
- Tool-call retraction timeline.
- Structured-part timeline.
- Saving/persistence timeline.
- Cancel and error after partial content.
- SSE completion result equals stored assistant content.

### E2E

- No non-empty → empty content transition.
- Exactly one assistant answer surface.
- Root node identity stable stream → final.
- No final entrance animation.
- No duplicate metric cards/table.
- No horizontal overflow.
- No unexpected scroll jump.
- User-scrolled-up position preserved.
- Mobile and desktop scenarios pass.

### Commands

```powershell
npx tsc --noEmit
npx eslint <changed-files>
npx jest tests/unit/moodie-turn-store.test.ts --runInBand
npx jest tests/integration/<stream-tests> --runInBand
$env:PLAYWRIGHT_SKIP_WEB_SERVER='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3000'
npx playwright test tests/e2e/moodie-stream-stability.spec.ts --project=chromium
```

## Decision record

### D1 — One optimistic assistant is required

Accepted. A CSS-only transition fix cannot preserve identity because the current architecture uses separate active and persisted answer components.

### D2 — Keep verifier quality

Accepted. Do not remove correction passes merely to make the UI look stable. Buffer or atomically replace revisions.

### D3 — Do not persist every transient status

Accepted. Persist final activity history and diagnostics, but avoid database writes or conversation-list refreshes for token/status churn.

### D4 — Batch visual stream commits

Accepted. Accumulate incoming deltas immediately but schedule visible React updates no more than once per animation frame. Flush synchronously on terminal events so final content is never lost.

### D5 — Final commit is urgent UI state

Accepted. Persisted ID/metadata handoff must not be placed in a non-urgent transition if that would expose both optimistic and persisted messages or an intermediate empty state. Conversation-list sorting may remain deferred.

## Delivery order

1. Capture event and DOM evidence before structural refactor.
2. Add failing tests for blank frame and remount.
3. Introduce optimistic assistant model.
4. Make final commit atomic.
5. Stabilize structured parts.
6. Reduce status churn.
7. Optimize rerenders and scroll anchoring.
8. Run the complete verification matrix and visual QA.

## Definition of done

This work is complete only when all of the following are proven:

- sanitized traces exist for text, tool, verifier rewrite, and structured responses;
- after first visible assistant content, no recorded frame is empty;
- one assistant root node survives from active turn through final state;
- no streaming/final overlap occurs;
- no assistant entrance animation replays at completion;
- structured parts retain identity and do not duplicate;
- collapsed status does not churn through technical persistence phases;
- mobile and desktop have no overflow or unexpected scroll jumps;
- unit, integration, TypeScript, lint, and E2E gates pass;
- runtime visual QA confirms the result at 390×844 and 1440×900.
