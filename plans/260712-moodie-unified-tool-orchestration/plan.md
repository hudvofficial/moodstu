# Moodie unified tool orchestration plan

Updated: 2026-07-12
Status: READY FOR IMPLEMENTATION

## Objective

Make Moodie reliably decide when to use tools, execute them under one permission and evidence policy, and present results clearly in both text and voice.

The target is not merely to expose Brave Search. Moodie must have one coherent tool-use loop for:

- internal Studio data;
- external web/news/local research through Brave Search;
- long-running background tasks;
- consequential actions requiring explicit confirmation;
- skills/workflows that compose multiple tools;
- progress, sources, failures, and audit evidence.

## Current-state evidence

### Already working

- Text engine has a provider tool loop through `getMoodieToolDefinitions`, `planMoodieExecution`, `executeMoodieTool`, output normalization, verification, tracing, and SSE events.
- Internal tools are filtered by role/domain through `MOODIE_TOOL_MANIFEST` and `routeMoodieIntent`.
- Voice exposes durable-run tools: propose, submit, status, and cancel.
- Durable `research` runs execute Brave Search and persist normalized result/source refs.
- Brave paid REST key is stored encrypted, enabled, and live-tested with HTTP 200.
- Research queries are redacted before leaving the Studio boundary.
- Source normalization, URL safety, deduplication, prompt-injection omission, timeout, response-size limit, and honest no-source failure exist.
- Text UI already has execution activity, `sources_v2`, an execution summary, and a source drawer.
- Durable agent runs already support leases, heartbeat, monotonic progress, retries, terminal states, and ownership/RLS.

### Gaps

1. Brave research is not registered as a text-engine tool.
2. `MoodieContextPlanner` does not expose `research_required`, allowed tools, budgets, or research trace fields described by the Iris-grade plan.
3. The text intent router has no explicit current/external/research domain.
4. Voice can propose research, but text cannot create or observe a research run through its normal stream lifecycle.
5. The worker endpoint requires `CRON_SECRET`/`INTERNAL_API_KEY`; there is no proven scheduler or safe in-process dispatch after enqueue.
6. Research completion is stored in the run but not converted into the same answer metadata/source schema used by text messages.
7. The model is not given a concise policy distinguishing internal Studio facts, remembered facts, model knowledge, and current external facts.
8. Tool selection depends too heavily on the model. Deterministic routing is needed for clear freshness requests and private-data boundaries.
9. There is no single tool capability descriptor covering role, data boundary, side effects, confirmation, execution mode, timeout, and source expectations.
10. No benchmark proves that Moodie chooses tools when needed and avoids them when not needed.

## Design principles

1. One orchestrator, multiple execution modes.
   - Keep the existing text tool loop as the foreground orchestrator.
   - Register research as a capability in the same manifest.
   - Delegate long-running work to durable runs without creating a second conversational brain.

2. Deterministic safety, model-assisted selection.
   - Hard rules decide permission, confirmation, privacy, and freshness requirements.
   - The model may choose among already-allowed tools.

3. Start simple research synchronously, escalate expensive research asynchronously.
   - One Brave call with a small result count may run in the active turn.
   - Multi-query/deep research becomes a durable run.

4. One source schema.
   - Internal database evidence, documents, web URLs, memories, and run results must normalize to `MoodieMessageSourceV2`.

5. No hidden work.
   - Tool start/progress/completion/failure must emit SSE/voice events and remain visible in trace/audit metadata.

6. Fail closed and answer honestly.
   - Current-information requests must not fall back to unsourced model memory after Brave failure.

## Target flow

```text
User turn (text or voice)
  → unified intent/freshness classifier
  → context planner
      identity + history + memory + Studio retrieval
      allowed capabilities + budgets + privacy policy
  → orchestration decision
      direct answer
      foreground internal tool
      foreground Brave search
      background research/task run
      confirmed action
  → execute
  → verify evidence and claim coverage
  → normalize parts + sources + trace
  → stream/present answer
  → persist messages, run lineage, sources, and audit
```

## Capability contract

Introduce a unified capability descriptor:

```ts
type MoodieCapability = {
  name: string;
  label: string;
  domains: MoodieIntentDomain[];
  minimumRoles: Role[];
  boundary: "internal" | "external" | "mixed";
  sideEffect: "none" | "reversible" | "consequential";
  confirmation: "never" | "policy" | "always";
  execution: "foreground" | "background" | "adaptive";
  timeoutMs: number;
  maxCallsPerTurn: number;
  requiresSources: boolean;
  enabled: (context) => Promise<boolean> | boolean;
};
```

The same contract must drive:

- text tool definitions;
- voice tool instruction;
- role exposure;
- confirmation policy;
- foreground/background choice;
- activity labels;
- trace fields;
- audit metadata.

## Phase 1 — Unified research intent and freshness policy

### Work

- Add `research` to the intent domain or add an orthogonal `externalResearch` decision.
- Implement deterministic recognition for:
  - latest/current/today/recent/news/price/law/schedule/version;
  - explicit “search web”, “find sources”, “verify online”, “Brave” requests;
  - local search requests;
  - source/citation requests.
- Distinguish:
  - current external fact → research required;
  - stable general knowledge → research optional;
  - internal Studio fact → internal tools only;
  - mixed comparison → internal retrieval plus external research.
- Include current date and requested freshness window.
- Refuse to place raw emails, phone numbers, customer names, contract IDs, tokens, or private notes into external queries without a safe transformed query.

### Files

- `lib/moodie/intent-router.ts`
- `lib/moodie/context-planner.ts`
- new `lib/moodie/research-intent.ts`
- `lib/moodie/mcp/policy.ts`
- `types/moodie.ts`

### Gate

A table-driven test suite must correctly classify at least 30 Vietnamese/English prompts, including negative cases where web search must not run.

## Phase 2 — Register Brave as a first-class Moodie capability

### Work

- Add foreground tools:
  - `search_web`
  - `search_news`
  - `search_local`
- Expose only when Brave is enabled and configured.
- Define strict Zod schemas for query, count, freshness, and optional country/language.
- Execute through `researchWithBrave`.
- Normalize output into concise tool content plus `MoodieMessageSourceV2` web sources.
- Add query and source count to the trace, never the API key.
- Enforce per-turn call and result limits.

### Files

- `lib/moodie/tool-manifest.ts`
- `lib/moodie/tools.ts`
- `lib/moodie/tool-planner.ts`
- `lib/moodie/tool-output-normalizer.ts`
- `lib/moodie/mcp/adapters/brave.ts`
- `lib/moodie/response-metadata.ts`

### Gate

Text Moodie answering “OpenAI có tin gì mới nhất?” must emit tool start/completion, return cited sources, and never answer from model memory when the tool fails.

## Phase 3 — Upgrade the context planner into a tool planner

### Work

Extend the planner output with:

```text
identity_context_used
conversation_summary_used
memory_ids_used
studio_sources_used
research_required
research_mode
research_query_redacted
allowed_tool_names
foreground_call_budget
background_run_budget
research_source_ids
context_tokens
```

- Resolve available capabilities once per turn.
- Pass only allowed tool definitions to the provider.
- Add a compact instruction stating why research is required/optional/forbidden.
- Avoid dumping all tool schemas into every prompt.
- Cache stable capability resolution per request where appropriate.

### Files

- `lib/moodie/context-planner.ts`
- `lib/moodie/engine.ts`
- `lib/moodie/model-prompt.ts`
- `lib/moodie/trace.ts`

### Performance rules

- Start independent memory/retrieval/capability checks together.
- Await only the branches needed for the chosen route.
- Do not serialize settings lookup, memory lookup, and intent classification unnecessarily.
- Keep client bundle unchanged; Brave and secret resolution remain server-only.

### Gate

Trace inspection must prove which tools were available, why research was required, which sources were used, and how many calls occurred.

## Phase 4 — Adaptive foreground versus background research

### Foreground criteria

Run in the active text turn when all are true:

- one query;
- expected one Brave call;
- count ≤ 8;
- no page crawling/deep synthesis;
- latency budget ≤ configured threshold;
- user did not ask for a report/comparison across many sources.

### Background criteria

Create a durable research run when any are true:

- multiple queries or research modes;
- deep comparison/report;
- expected duration exceeds the foreground budget;
- voice conversation should remain responsive;
- retry/resume is valuable.

### Work

- Add an orchestration decision type: `direct | foreground_tool | background_run | confirmed_action`.
- Text stream emits `run.proposed`, `run.started`, `run.progress`, and terminal events.
- For safe read-only research, proposal should auto-queue without confirmation.
- Consequential actions retain explicit confirmation.
- Add an authenticated internal dispatch path after enqueue for local/dev and a scheduler route for production.
- The dispatcher must use the same claim/lease RPC; never execute a run twice.

### Files

- new `lib/moodie/orchestrator.ts`
- `lib/moodie/engine.ts`
- `app/api/moodie/messages/stream/route.ts`
- `app/api/moodie/runs/route.ts`
- `app/api/moodie/runs/worker/route.ts`
- `lib/moodie/runs/*`
- `lib/moodie/stream-client.ts`

### Gate

A background research request must continue conversation, show honest progress, survive retry, and eventually attach the result to the originating conversation.

## Phase 5 — Unify text and voice tool behavior

### Work

- Generate Gemini Live tool declarations/instructions from the unified capability registry rather than maintaining a separate manual policy.
- Give voice the same freshness classifier and sanitized query builder.
- Foreground quick lookup may call research directly when latency permits.
- Deep research uses durable runs and reinjects progress/result into Gemini Live.
- Reconnect must resume run polling without duplicate announcements.
- Voice must say it is checking sources before claiming a current fact.

### Files

- `lib/moodie/voice-live-config.ts`
- `hooks/use-moodie-live-voice.ts`
- `lib/moodie/context-planner.ts`
- unified capability registry

### Gate

The same prompt in text and voice must select an equivalent capability and enforce the same privacy/confirmation policy.

## Phase 6 — Evidence-aware answer synthesis

### Work

- Convert Brave results to the existing `sources_v2` schema.
- Require inline citation markers or stable source references for external claims.
- Add claim coverage verification:
  - each current/external factual paragraph must map to at least one source;
  - unsupported current claims are removed or explicitly qualified.
- Include retrieval date/freshness.
- Preserve a separation between:
  - Studio database source;
  - personal memory;
  - external web source;
  - model inference.
- Persist run/source lineage in message metadata.

### Files

- `lib/moodie/answer-verifier.ts`
- `lib/moodie/presentation.ts`
- `lib/moodie/response-metadata.ts`
- `lib/moodie/records.ts`
- `components/moodie/moodie-execution-summary.tsx`
- `components/moodie/moodie-source-drawer.tsx`

### Gate

A user can open the source drawer and identify exactly which external sources support the answer and when they were retrieved.

## Phase 7 — Tool-use UX

### Work

- Keep activity compact:
  - “Đang kiểm tra nguồn mới nhất”;
  - “Đã tra 3 nguồn”;
  - “Đang tổng hợp kết quả”.
- Show background run progress without replacing/disappearing assistant content.
- Add cancel/retry for long runs.
- Show a clear external-search indicator without exposing implementation secrets.
- On failure, show “Không thể truy cập nguồn bên ngoài” and offer retry; do not silently produce an uncited answer.
- Ensure mobile spacing and source drawer usability.

### Gate

Desktop, 390px mobile, iPad portrait, and iPad landscape E2E show stable answer surfaces, usable progress controls, and no overflow.

## Phase 8 — Security, permission, and cost controls

### Work

- Admin setting determines whether external research is available.
- Role policy determines who may use external research and optional per-role quotas.
- Add per-user/per-studio rate limits and daily call counters.
- Limit query count, result count, timeout, bytes, and retries.
- Audit:
  - user;
  - conversation/turn/run;
  - tool name;
  - sanitized query hash or safe summary;
  - source domains/count;
  - latency/status/cost metadata.
- Never log API key, authorization headers, or raw private query content.
- Add domain denylist and optional allowlist.
- Prevent internal URLs and redirects to private networks.

### Gate

Security tests prove secret non-disclosure, SSRF rejection, private query redaction, RLS ownership, confirmation enforcement, and bounded retries/cost.

## Phase 9 — Benchmark and rollout

### Benchmark scenarios

1. Stable knowledge question → direct answer, no Brave call.
2. “Tin mới nhất hôm nay” → Brave required.
3. “Doanh thu studio tháng này” → internal tool only.
4. “So sánh doanh thu studio với xu hướng ngành” → mixed internal + external tools.
5. Prompt includes customer email/phone → external query is safely transformed or blocked.
6. Brave returns 401/429/500 → honest failure, retry policy, no fabrication.
7. Deep report → background run with progress.
8. Consequential action → confirmation required.
9. Voice reconnect during research → no duplicate run/result.
10. Source drawer → complete citation lineage.

### Metrics

- tool selection precision/recall;
- unnecessary tool-call rate;
- unsupported-current-claim rate;
- citation coverage;
- foreground p50/p95 latency;
- background completion/retry rate;
- Brave calls and estimated cost per user/studio;
- duplicate execution rate;
- user cancellation rate.

### Rollout

Feature flags:

```text
moodie_unified_capabilities
moodie_text_research
moodie_adaptive_background_runs
moodie_evidence_verifier_v2
moodie_voice_unified_tools
```

Roll out:

1. Admin only with verbose tracing.
2. Managers with quota.
3. Selected staff.
4. General availability after benchmark thresholds pass.

## Recommended delivery order

1. Research intent/freshness classifier.
2. First-class foreground Brave tools in text engine.
3. Unified context/capability planner and trace.
4. Source normalization and evidence verifier.
5. Adaptive background run dispatch for text.
6. Voice generation from unified capability registry.
7. UX cancel/retry/progress polish.
8. Security/cost controls and benchmark rollout.

This order gives Moodie useful text web research early while preserving the final unified architecture.

## Definition of Done

The optimization is complete only when all are proven:

- Text and voice resolve tools from one capability policy.
- Moodie deterministically requires research for current external facts.
- Stable/general questions do not waste Brave calls.
- Internal Studio questions never leak private data to external search.
- Paid Brave Search can be selected and executed by Moodie without manual developer intervention.
- Foreground research returns cited answers in the same turn.
- Deep research runs asynchronously with honest progress, retry, cancel, and terminal result.
- Consequential actions still require explicit confirmation.
- External claims have visible source lineage and retrieval time.
- Brave/tool failures never produce fabricated current facts.
- Role, RLS, rate, timeout, bytes, retry, and audit policies pass.
- Desktop/mobile/tablet text E2E and real voice E2E pass.
- TypeScript, lint, unit, integration, security, build, and benchmark gates pass.
