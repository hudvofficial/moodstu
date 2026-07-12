# Moodie Open-style activity UI — desktop + mobile port plan

## Scope

Port the calm, compact activity treatment visible in the supplied Open reference into Moodie for both desktop and mobile. This covers the active-turn indicator, expandable activity history, completed execution disclosure, message spacing, and responsive behavior. It does not expose chain-of-thought and does not replace Moodie's typed SSE/tool events.

## Evidence traced

### Supplied reference

The Open reference presents an active turn as one quiet inline row:

- a small animated brand glyph;
- one short status such as `Sleuthing`;
- no avatar card, border, shadow, timestamp, elapsed duration, or permanent chevron;
- animation is localized to the glyph instead of pulsing the whole label;
- the row occupies one text line and does not look like an assistant message before content exists.

The current Moodie capture differs:

- a filled 28px bot tile plus a second spinner;
- low-contrast, verbose copy (`Moodie đã nhận yêu cầu`);
- the row behaves like a rounded button even when there is nothing to expand;
- completed direct answers can retain unnecessary operational chrome;
- visual weight is duplicated across identity, spinner, label, chevron, duration, and timestamp.

### Current implementation

- `MoodieThinkingState` owns active status, history expansion, streamed text, and streamed parts.
- `MoodieExecutionSummary` owns completed activity/source disclosure and timestamp.
- `MoodieThread` is shared by desktop and mobile, so the status primitive should remain shared.
- Desktop and mobile have separate workspace shells but feed the same thread and composer contracts.
- Runtime already emits typed activities; UI should map them to concise phases rather than invent rotating text.
- Existing tests cover presentation/footer, but there is no dedicated 375px/390px Moodie activity E2E gate.

## Target behavior

### Active turn — collapsed

- One unboxed inline row aligned with assistant text.
- One 16px Moodie activity glyph; remove the filled bot tile and separate loader.
- Animate only the glyph and respect `prefers-reduced-motion`.
- One concise phase label, maximum one line: `Đang hiểu yêu cầu`, `Đang tra dữ liệu`, `Đang dùng công cụ`, `Đang tổng hợp`, or `Đang soạn câu trả lời`.
- Do not show duration while pending.
- Do not show chevron/hover surface unless at least two meaningful activities exist.

### Active turn — expanded

- Expansion exists only when activity history has useful detail.
- Quiet vertical timeline below the inline row.
- Show sanitized business labels, success/error state, and optional per-step duration.
- Never show raw tool names, prompts, provider internals, or chain-of-thought.
- Streamed answer content stays below the activity row without remounting on phase changes.

### Completed response

- Direct answer with no tool/source/activity: response plus timestamp only.
- Tool/data answer: one collapsed disclosure such as `Đã tra dữ liệu` or `Đã dùng 2 công cụ`.
- Duration appears only inside expanded execution details/diagnostics.
- Errors stay visible and actionable.

### Desktop

- Align the row to the assistant document column, not a standalone avatar/card column.
- Hit target is at least 32px only when expandable; otherwise render non-button status text.
- Hover may reveal a subtle affordance, but essential information does not depend on hover.

### Mobile

- Same semantic component and event mapping as desktop; no duplicated mobile status logic.
- At 320–430px, use full text width and keep the glyph fixed at 16px.
- Truncate collapsed phase to one line; expanded labels wrap naturally.
- No hover-only controls. Keep disclosure visible when expandable.
- Minimum interactive target 44px without adding a visible card.
- Timeline and streamed typed parts must not create horizontal overflow.
- Composer/keyboard must not cover active status; jump-to-latest stays reachable above composer.

## Implementation phases

### P1 — Activity presentation model

Create a pure presenter mapping runtime events to stable UI phases and deciding whether details are meaningful.

Files: `lib/moodie/activity-presentation.ts`, `types/moodie.ts` only if needed, `tests/unit/moodie-activity-presentation.test.ts`.

Gate: deterministic Vietnamese labels; no raw tool identifiers; direct/session fast paths create no fake history; failures remain distinguishable.

### P2 — Shared active-turn primitive

Refactor `MoodieThinkingState` into an unboxed inline status plus optional detail timeline. Keep streamed text and parts stable during phase updates.

Files: `components/moodie/moodie-thinking-state.tsx`, optional `moodie-activity-glyph.tsx`, `tests/unit/moodie-presentation.test.ts`.

Gate: one glyph/one label; no filled avatar tile or duplicate spinner; no chevron without details; reduced motion covered; no streamed-content flicker.

### P3 — Completed disclosure cleanup

Make operational metadata progressive: trivial answers keep timestamp only; tool/data answers expose compact disclosure; duration moves into details.

Files: `components/moodie/moodie-execution-summary.tsx`, `moodie-message-bubble.tsx`, `tests/unit/moodie-response-footer.test.ts`.

Gate: identity/direct answer has no `Đã hoàn tất · Xs`; tool answer still exposes sources/history; errors remain visible; actions stay adjacent to their response.

### P4 — Mobile parity and spacing

Audit the shared thread inside the mobile shell and tune layout tokens/breakpoints, not business behavior.

Files: `components/moodie/moodie-thread.tsx`, `moodie-workspace-mobile.tsx`, `moodie-composer.tsx` if keyboard overlap is confirmed, `tests/e2e/moodie-activity-responsive.spec.ts`.

Viewports: 320×568, 375×812, 390×844, 430×932, 768×1024, and desktop 1440×900.

Gate: no overflow; no status clipped under composer; touch-accessible expansion; timeline wraps without card nesting; orientation change preserves turn and scroll position.

### P5 — Runtime and visual E2E

Exercise real flows: direct session answer, model-only answer, one-tool lookup, multi-tool workflow, tool failure, stop generation, and reconnect to an active durable turn.

Capture collapsed, expanded, streaming-text, completed, and error states at desktop/mobile widths.

Gate: first status arrives before model text; labels change only on semantic phases; identity fast path has no prolonged thinking; details match actual events; TypeScript, lint, unit, build, and responsive E2E pass.

## Performance constraints

- No client fetch/effect to derive labels; use pure functions over existing turn state.
- Keep static glyph JSX hoisted; do not define components inline.
- Do not subscribe the full message list to high-frequency transient values.
- No broad/barrel imports or heavy animation package.

## Definition of done

- Active state matches the supplied Open reference's quiet hierarchy while retaining real tool transparency.
- Desktop/mobile use one semantic status component and differ only in responsive layout.
- Trivial answers never display fake/heavy execution chrome.
- Tool/data answers preserve expandable evidence and errors.
- All runtime flows are visually verified at the listed viewports.
