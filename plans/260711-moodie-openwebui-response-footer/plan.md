# Moodie response footer parity with Open WebUI

## Objective and evidence

Port Open WebUI's response-end behavior into Moodie: persistent execution history, useful sources, complete branch-safe actions, follow-ups, and identical live/reload behavior. Visual similarity alone is not completion.

Screenshots require a collapsed `Đã tra N nguồn · duration` summary with chevron/timestamp; expanded history and source row; then branch, edit, copy, speech, info, feedback, continue, regenerate, delete and Follow up.

Open WebUI trace: `ResponseMessage.svelte` owns response actions/composition; `StatusHistory.svelte` and `StatusItem.svelte` own collapsed/full timeline; `Citations.svelte` and `ToolCallDisplay.svelte` normalize sources/tool states; `Chat.svelte` appends status/follow-up events; streaming plus backend middleware/chat/tools/message models emit and persist state; evaluations API persists feedback.

Moodie trace: types, turn store, stream client, engine/trace, stream route/mutations, and message bubble/debug/thinking/thread/page. Moodie has event v2, sources, trace, follow-ups, feedback, regenerate and branches, but live activities are flattened into a diagnostic trace after completion.

## Gap matrix

| Concern | Current gap | Required result | Proof |
|---|---|---|---|
| Lifecycle | Runtime activities vanish; saved UI invents stages from trace | Persist typed `activity_history`; same live/saved renderer | Reducer + reload equality tests |
| Time | Only total trace duration | Per-entry start/end/duration and message timestamp | Fake clock + screenshots |
| Sources | Flat label/value and count | Canonical source v2, dedupe, compact trigger, lazy drawer | URL/duplicate/mobile tests |
| Persistence | Transient reducer and saved metadata can diverge | One terminal snapshot persisted before completion | Compare stream, fetched JSON, reload UI |
| Branches | Siblings scanned per bubble | O(n) grouping and atomic active-leaf mutations | Three-sibling/nested tests |
| Copy/TTS/details | Raw copy; no TTS; debug mixed with normal UI | Visible copy, cancellable TTS, sanitized details | Browser mocks/security test |
| Feedback | Submit exists; state not hydrated | Upsert/change/clear with rollback and reload state | Integration test |
| Continue/delete | Missing or incomplete | Branch-safe continue and transactional subtree delete | Mutation/tree tests |
| Regenerate | Basic sibling path | Busy/dedupe state and atomic leaf switch | One sibling/request |
| Follow-ups | Lifecycle/rhythm incomplete | Persist prompts; active-leaf-only display; standard send | Reload/branch/click-once |
| Responsive/perf | Dense actions; O(n²) risk | Desktop inline/mobile overflow; memoized bubbles; lazy drawers | Playwright/Profiler |

## Target contract

Add `response_ui_version: 2`, `activity_history`, `sources_v2`, sanitized usage/details and persisted feedback to `MoodieMessageMeta`. Keep `trace` for observability, never as sole UI history. Read legacy metadata via adapter; write only v2.

Activity entries need stable id, kind, action, label, running/completed/failed state, start/end/duration, optional tool/source links and safe error code. Source v2 needs stable id, web/database/document/internal kind, title, optional safe URL/domain/snippet/tool link and sanitized metadata.

## Implementation phases

### 1. Contracts and invariants

Modify `types/moodie.ts`, turn store, trace and tests. Create `lib/moodie/response-metadata.ts` and tests. Stable lifecycle transitions preserve start data; source IDs/sanitization/dedupe are deterministic; duplicate/out-of-order SSE is idempotent; terminal stream snapshot equals persisted metadata; legacy messages render.

### 2. Engine, SSE and persistence

Modify engine, stream route, mutations, stream client and query mapping. Emit exact lifecycle data, normalize sources server-side, persist one terminal assistant snapshot before `turn.completed`, use returned persisted conversation as authority, preserve useful failed/cancelled state, and add no request waterfall.

### 3. Summary and sources

Create `moodie-execution-summary.tsx`, `moodie-activity-timeline.tsx`, `moodie-source-trigger.tsx`, and dynamically loaded `moodie-source-drawer.tsx`; update thinking/debug/bubble. One component serves live/saved states, defaults collapsed, matches expanded hierarchy, separates technical trace, and passes aria/focus plus 1440px/390px visual checks.

### 4. Footer actions

Create `moodie-response-actions.tsx`, message details, delete dialog, `use-moodie-speech.ts`, `message-copy.ts`, and `branch-tree.ts`; update bubble/thread/page/mutations. Order controls as branch, edit, copy, speech, details, feedback, continue, regenerate, delete. Add per-message pending/dedupe/rollback, precompute siblings once, memoize saved bubbles, use desktop inline/mobile overflow, and atomically update displayed branch/active leaf.

### 5. Follow-ups

Persist follow-ups with terminal assistant metadata, show below actions for active leaf, route click through standard send, and match screenshot separators/line clamp/focus.

### 6. Verification

Add response-action/branch-tree unit tests, persistence integration test and `tests/e2e/moodie-response-footer.spec.ts`. Run type-check, lint, unit tests, desktop/iPhone 14/Pixel 7 Playwright and production build. Cover plain answer; tool/source success; tool failure/duplicate sources; cancel/continue; three regenerate siblings; feedback reload; branch delete; follow-up; keyboard desktop.

Performance/security gates: streaming does not rerender completed bubbles; sibling grouping O(n); drawers dynamically imported; independent reads parallel; no raw tool payload, credential, prompt or internal DB field reaches normal UI metadata.

## Definition of done

All five layers pass: visual, interaction, typed contract, reconnect-safe engine/event lifecycle, and persistence/reload parity. A screenshot alone is insufficient: final audit compares live state, persisted conversation JSON and post-reload UI for the same turn.
