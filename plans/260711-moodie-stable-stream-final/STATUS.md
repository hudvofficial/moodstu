# Status — Moodie stable streaming → final

Updated: 2026-07-11

## Overall

Status: IMPLEMENTED AND VERIFIED

Moodie now renders an active turn as one optimistic assistant message inside the normal message list. The same React key, derived from `request_id`, is used by the persisted assistant message, so the streaming surface hands off to final state without rendering a separate thinking answer beneath the list.

## Completed implementation

- [x] `text.reset` retains the last visible draft until the first replacement delta arrives.
- [x] Replacement delta atomically replaces the previous revision.
- [x] Consecutive `text.delta` events are batched to at most one React dispatch per animation frame.
- [x] Semantic events flush queued deltas first, preserving SSE order.
- [x] `MoodieThread` creates an optimistic assistant message in the branch message list.
- [x] Optimistic and persisted assistant messages use a stable `request_id` React key.
- [x] Persisted-turn detection prevents simultaneous optimistic and final surfaces.
- [x] `MoodieMessageBubble` renders pending activity, streamed text, and streamed parts.
- [x] Separate trailing `MoodieThinkingState` answer surface was removed from `MoodieThread`.
- [x] Assistant final no longer replays entrance animation.
- [x] Structured parts use deterministic semantic keys instead of raw array indexes.
- [x] Near-bottom scroll anchoring reacts to streamed text and part growth.
- [x] User-scrolled-up state remains respected.
- [x] DOM instrumentation attributes were added for runtime stability verification.
- [x] Mobile E2E observer checks visible surface identity, blank transitions, and duplicates.

## Verification evidence

- [x] TypeScript application check passed: `npx tsc --noEmit`.
- [x] TypeScript test check passed: `npx tsc --noEmit -p tsconfig.test.json`.
- [x] ESLint passed for all touched implementation and test files.
- [x] Unit and integration stream lifecycle tests passed.
- [x] Multi-reset integration test proves no non-empty → empty draft transition.
- [x] Mobile Chromium E2E passed at 390×844.
- [x] Full Moodie activity responsive Chromium E2E file passed.
- [x] Runtime observer reported no visible duplicate surface, no root replacement, and no blank-after-content transition.
- [x] Production build completed successfully.
- [x] `git diff --check` reported no whitespace errors.

## Architecture result

```text
Before:
message list → separate MoodieThinkingState → unmount → persisted MoodieMessageBubble

After:
message list → optimistic MoodieMessageBubble → patch content/status/parts → persisted MoodieMessageBubble
```

Verifier, tools, memory, business workflows, and Supabase persistence remain unchanged. Only the client turn/message lifecycle and visual commit behavior were optimized.
