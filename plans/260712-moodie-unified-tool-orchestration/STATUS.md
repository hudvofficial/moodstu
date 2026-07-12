# Status — Moodie unified tool orchestration

Updated: 2026-07-12
Status: COMPLETE

## Implemented

- [x] Phase 1 research/freshness classifier with 30 Vietnamese/English positive and negative scenarios.
- [x] Research remains orthogonal to Studio domains, allowing mixed internal/external routes without creating a second engine.
- [x] Phase 2 foreground Brave tools registered in the existing text tool loop: `search_web`, `search_news`, and `search_local`.
- [x] Planner exposes only the required Brave mode and does not expose external search for stable/general questions.
- [x] Brave tool results normalize into existing web source metadata and source drawer lineage.
- [x] Phase 3 context planner checks live Brave availability, filters capabilities, and records research requirement/mode, redacted query, allowed tools, and call budgets.
- [x] Current external requests fail closed when Brave is unavailable; core/model fallback cannot invent a current answer.
- [x] Foreground paid-API budget is enforced at one Brave call per turn with at most eight sources.
- [x] Evidence verifier requires a successful external tool plus at least one web source before allowing a current-fact final answer.
- [x] Live authenticated Chromium E2E proves Moodie text selects Brave and exposes citations; final run passes 1/1 in 28.4 seconds.

## Verification

- `npx tsc --noEmit` — pass.
- Targeted ESLint for routing, tools, planner, engine, trace, verifier, and E2E — pass.
- Research intent/MCP/engine/agent targeted suites — pass after classifier fixes.
- Live Brave text E2E — pass; source count remains within the paid API budget.
- Live deep-research Chromium E2E — pass 1/1 in 38.9s; durable run advances through progress, completes, and renders external source links.
- Brave deep-query compatibility — queries are capped to the provider contract (50 words/400 characters); HTTP failure details are safely sanitized for diagnosis.
- Unified capability parity — text manifest and voice declarations derive permission, boundary, side-effect, confirmation, execution mode, and descriptions from one registry; unit/type/lint gates pass.
- Citation lineage — current external answers require valid numeric citation lineage, source cards use matching indexes, and published/retrieved timestamps are visible.
- Foreground citation Chromium E2E — pass 1/1 in 26.3s after eliminating a verifier correction loop that attempted a second paid Brave call.
- Background retry/cancel/progress — retry API clones an owned terminal run, dispatches it immediately, card follows the replacement run, and surfaces the latest durable progress event.
- Desktop/mobile activity responsive E2E — pass 2/2 in 34.7s with no overflow and touch parity.
- Unified orchestration benchmark/security tests — pass for current-news, stable no-search, deep-background routing, capability parity, confirmation policy, and non-reversible query fingerprints.
- Production `next build` — pass, including the new retry route and unified voice capability declarations.
- Remote quota migration — applied successfully on 2026-07-12; foreground and background paid Brave paths pass with server quota/audit enabled.
- Live foreground Brave after quota migration — pass 1/1 in 34.0s.
- Live background durable research after quota migration — pass 1/1 in 35.0s.
- Live retry ownership/dispatch E2E — pass 1/1 in 17.3s.
- Real Google Live voice token + reconnect lineage E2E — pass 1/1 in 53.7s; fixed employee lookup to use `auth_user_id` through the admin profile boundary.
- Tablet-width background research E2E — pass 1/1 in 41.9s with visible-surface selection and no horizontal overflow.
- Final unit suite, non-incremental TypeScript, targeted Moodie lint, and production build — pass.

## Remaining implementation

- [x] Phase 4 adaptive background dispatch for deep/multi-query research in text.
- [x] Phase 5 generate text/voice permissions from one capability descriptor instead of parallel manual declarations.
- [x] Phase 6 claim-level citation coverage and richer retrieval-date presentation.
- [x] Phase 7 background run cancel/retry/progress UX.
- [x] Phase 8 persistent per-user/studio quota counters and audit/cost reporting; remote migration applied successfully.
- [x] Phase 9 benchmark, desktop/mobile/tablet research E2E, background retry E2E, real voice token/reconnect parity, full unit/type/lint/build gates.

## Planning audit

- [x] Audited the existing text tool loop.
- [x] Audited voice durable-run tools.
- [x] Audited Brave Search runtime and live paid-key status.
- [x] Audited worker authorization and dispatch gap.
- [x] Audited source/citation UI reuse path.
- [x] Defined unified capability contract.
- [x] Defined nine implementation phases and gates.
- [x] Defined benchmark, rollout, security, performance, and Definition of Done.

## Key conclusion

Moodie does not need a second tool engine. The correct implementation is to register external research in the existing text tool loop, upgrade the context planner into a capability planner, and use durable runs only when work exceeds the foreground latency/call budget. Text and voice should derive permissions and behavior from one capability registry.

## Next implementation checkpoint

All implementation phases and Definition of Done gates are complete. Continue monitoring paid-call usage and provider quota through the persisted daily usage and audit tables.
