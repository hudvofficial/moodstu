# Status — Moodie Iris-grade voice, memory, and Brave MCP

Updated: 2026-07-12

## Overall

Status: IN PROGRESS

## Implemented and verified

- [x] Durable voice session, turn, and sanitized event schema.
- [x] Voice event ingestion API with authenticated ownership checks.
- [x] Gemini Live client telemetry for connect, reconnect, transcripts, audio checkpoints, completion, interruption, and failure.
- [x] Voice token issuance creates or resumes a durable server-owned session.
- [x] Text and voice share one authenticated context planner.
- [x] Gemini Live receives baseline identity, conversation summary, and approved-memory context.
- [x] Deterministic explicit memory extraction remains on the request path.
- [x] Model-assisted implicit memory extraction runs after the visible response via `after()`.
- [x] Memory validation rejects secrets and mutable business data.
- [x] Memory persistence supports source links, embedding, duplicate suppression, conflict superseding, and archiving.
- [x] Durable agent-run and ordered run-event schema added with RLS and idempotency index.
- [x] Confirmation policy and request contracts added for read-only research versus consequential actions.
- [x] Authenticated propose/status/confirm/cancel APIs added.
- [x] Confirmation evidence uses a random single-use token whose SHA-256 hash alone is persisted.
- [x] Confirm and cancel transitions use conditional database updates so stale terminal runs cannot be reopened.
- [x] Service-role worker RPCs provide `FOR UPDATE SKIP LOCKED` claim, expiring lease, heartbeat, monotonic progress, bounded attempts, and lease-bound terminal completion/failure.
- [x] Generic server-only MCP JSON-RPC client includes timeout, response-size limit, external abort propagation, and circuit breaker.
- [x] Brave adapter supports read-only web/news/local research, private-query redaction, SSRF-safe URLs, source dedupe, provenance, and prompt-injection omission.
- [x] Durable research worker connects queued research runs to Brave and persists progress, normalized results, source references, and honest failures.
- [x] Gemini Live exposes propose/confirm/status/cancel tools and polls active durable runs for progress/terminal reinjection.
- [x] Voice confirmation is enforced twice: model instruction plus client-side explicit-user-utterance evidence before submit.
- [x] Memory v3 recall excludes expired and reconfirmation-due records even before maintenance runs.
- [x] Memory lifecycle maintenance archives expired records and moves stale records to `needs_confirmation`.
- [x] Governance panel exposes reconfirm, inline edit, archive, forget, supersede notice, and next-review date.
- [x] Completed voice turns feed their authenticated user transcript into the same non-blocking memory curator as text.
- [x] Voice-derived memories retain durable lineage through `source_voice_turn_id`.
- [x] Voice telemetry checkpoint fields are filled individually, including when earlier events created the turn row.
- [x] Episodic consolidation uses model summarization plus an atomic DB RPC that creates one active summary and archives all validated sources with lineage.
- [x] Users can export their complete personal memory set as schema-versioned JSON.
- [x] Personal-memory hard deletion requires an exact destructive confirmation phrase and emits an audit event; studio memory is excluded.
- [x] Durable `task` runs execute through the existing Moodie engine with the run owner's active employee identity, role, conversation summary, history, memory, tools, and permissions.
- [x] Transient worker failures use exponential backoff and bounded retry; exhausted runs become terminal failed and cannot loop forever.
- [x] Generic `action` runs remain fail-closed until a dedicated, confirmation-aware handler exists.
- [x] Memory retrieval is database-native hybrid ranking: semantic cosine, lexical rank, importance, scope, goal/project boost, and recency under RLS/lifecycle filters.
- [x] App retrieval prefers the SQL RPC and retains the prior bounded in-process scorer only as migration/failure fallback.
- [x] Admin can configure Brave Search directly in Moodie Settings: enable/disable, encrypted API key, REST endpoint, optional MCP fallback/token, timeout, response-size limit, and live connection test.
- [x] Research runtime prefers the configured Brave Search REST API and retains MCP as an optional advanced fallback; environment configuration remains a server-side fallback.

## Verification evidence

- `npx tsc --noEmit` — pass on 2026-07-12.
- Targeted ESLint for memory/run/action files — pass on 2026-07-12.
- Full Jest gate — 49/49 suites and 450/450 tests pass on 2026-07-12.
- Full integration gate — 5/5 suites and 31/31 tests pass on 2026-07-12.
- Production build — pass with `BUILD_EXIT=0` on 2026-07-12; `/admin/vendors` reports only the existing non-fatal cookies/dynamic-route warning.
- `moodie-memory-curator` and `moodie-run-policy` unit suites — 6/6 tests pass.
- Voice observability migration was previously applied and its three tables verified.
- Agent-run migration applied; direct service-role inspection confirms both `moodie_agent_runs` and `moodie_agent_run_events` exist.
- Agent-run confirmation/security suites — 4/4 tests pass.
- Database lifecycle probe proves queue → claim → heartbeat at 42% → complete at 100%; the probe row was deleted afterward.
- MCP/Brave modules pass TypeScript and targeted ESLint.
- Voice async-tool/config/hook changes pass TypeScript and targeted ESLint.
- Memory lifecycle unit suite — 2/2 tests pass.
- Combined curator/lifecycle suites — 5/5 tests pass after voice-lineage integration.
- Database inspection confirms `source_voice_turn_id` exists.
- Consolidation DB probe proves two active episodic sources become one active summary and two archived/consolidated sources atomically; all probe rows were deleted.
- Retry DB probe proves attempt 1 requeues with `next_attempt_at`, while attempt 2/2 becomes terminal failed; probe run was deleted.
- Hybrid retrieval DB probe ranks `[1,0]` above `[0,1]` for the matching query and excludes an otherwise identical expired record; probe rows were deleted.
- Database lifecycle probe proves one expired memory becomes `archived/expired` and one due memory becomes `needs_confirmation`; probe rows were deleted.
- Local environment check: Brave MCP URL/token and worker auth secret are not configured, so live Brave E2E remains unproven.
- Authenticated Moodie activity E2E — Chromium desktop 1440x900 and mobile 390x844 pass: compact unboxed activity state, no horizontal overflow, bounded user/assistant spacing, and one stable answer surface without post-content disappearance.
- WebKit tablet E2E — both `iPad A16 Portrait` and `iPad A16 Landscape` projects pass after installing the required Playwright WebKit runtime; `.last-run.json` records `status: passed` with no failed tests.
- Brave Settings implementation — TypeScript and targeted ESLint pass; MCP/Brave safety suite passes 5/5 including nested Brave REST response normalization; production build emits BUILD_ID `XV9P3Yc9nWNcqrGzfaaY3`.
- Live paid Brave Search credential check — encrypted key was read server-side without disclosure; Brave REST returned HTTP 200 with 3 sources in 647ms on 2026-07-12. The stored feature flag was found disabled and was enabled after the user confirmed Moodie should use Brave.
- Migration `20260712101000_moodie_brave_settings.sql` was created. Applying it is pending because the Supabase CLI remote Postgres connection currently returns `LegacyDbConnectError`.

## In progress

- [x] Connect non-research Moodie task handler and bounded retry/exhaustion workflow.
- [x] Feed completed voice transcripts into the memory curation pipeline.
- [x] Episodic consolidation worker, memory export, and personal-memory hard-delete workflow.

## Remaining

- [ ] Execute the final authenticated Moodie research-run → worker → citation UI/voice E2E using the now-valid and enabled paid Brave Search configuration.
- [x] Memory governance UI.
- [ ] Complete authenticated voice/research diagnostics and runtime evidence.
- [x] Database-native hybrid vector/lexical retrieval.
- [ ] Real authenticated multi-turn audio E2E including reconnect and interruption.
- [x] Desktop/mobile Moodie text/activity responsive E2E.
- [x] Memory/security unit and database probes, full tests, integration, type, targeted lint, and build gates.
- [ ] Desktop/mobile real-audio voice, live MCP, and final benchmark gates.

## Current completion assessment

The implementation is functionally complete across unified context, Memory v3/governance, durable background runs, MCP/Brave policy/runtime, and async Gemini Live tools. Automated code, database, build, integration, and responsive Moodie UI gates are green. The goal is still not complete because the Definition of Done explicitly requires (1) a real authenticated multi-turn audio session proving reconnect/interruption/topic continuity and (2) a live Brave MCP cited-research run; this environment currently lacks the Brave endpoint/token/worker secret, and controlled browser E2E does not substitute for real microphone/audio proof.
