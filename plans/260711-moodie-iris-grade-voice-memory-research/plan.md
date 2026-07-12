# Moodie Iris-grade voice, long-term memory, and Brave MCP plan

## Objective

Upgrade Moodie from a Gemini Live voice UI with one `ask_moodie` bridge into a persistent, interruptible voice companion comparable to Iris while preserving Mood Studio's business engine, permissions, audit trail, and governed memory.

The target is not to copy Iris wholesale. Port the proven orchestration patterns:

- one long-lived realtime voice session;
- conversational direct-answer brain plus delegated worker brain;
- explicit proposal/confirmation for consequential actions;
- background task execution with status announcements;
- session continuity and resumption;
- personal/studio/project memory recalled before conversation;
- durable turn capture after conversation;
- research through Brave MCP with citations and provenance.

Moodie remains the worker/business brain. Gemini Live remains the realtime conversational voice. Brave MCP becomes a read-only research capability.

## Current-state audit

### Voice

Moodie already has:

- Gemini Live ephemeral-token issuance;
- browser-side PCM 16 kHz capture and audio playback;
- input/output transcription;
- interruption handling;
- session resumption and goAway reconnect;
- one Live tool: `ask_moodie`;
- cascade fallback;
- a configured voice API key and a successful runtime token request.

Current gaps versus Iris:

- no persistent server-side voice orchestrator;
- no durable voice-session record;
- no guaranteed restoration of conversational context after reconnect;
- no background task protocol;
- no proposal → explicit confirmation → submit gate;
- no task status/result announcement back into the live session;
- no direct research tool exposed to voice;
- no voice-session telemetry proving mic → model → playback;
- business questions block the Live tool call until the full Moodie answer returns;
- voice and text conversation identities are only loosely connected.

### Long-term memory

Moodie already has:

- `moodie_memories` with user/studio/conversation scopes;
- structured `subject`, `predicate`, and JSON `value`;
- memory type, confidence, importance, status, expiry, source message IDs;
- superseding/versioning columns;
- optional embeddings;
- hybrid ranking using semantic similarity, lexical overlap, importance, scope, type, and recency;
- management actions and UI;
- policies rejecting secrets and mutable business data;
- conversation summaries.

Current gaps:

- curator is regex-based and captures only explicit patterns;
- no model-assisted extraction of implicit durable facts, preferences, relationships, projects, or decisions;
- no episodic memory generated from completed conversation windows;
- no entity resolution or robust conflict detection;
- supersede fields exist but are not the default write path;
- no temporal validity model beyond optional expiry;
- embeddings are JSON arrays and ranked in application memory over a small recent candidate pool;
- only five memory lines are injected;
- use count/last-used evidence is incomplete;
- no memory consolidation/decay/reconfirmation worker;
- Live voice receives no authenticated user-memory packet at session start;
- research findings have no dedicated provenance-aware memory class;
- no clear distinction between user fact, inferred belief, instruction, and sourced external knowledge.

### MCP/research

Moodie has a local adapter pattern for Google Workspace-style MCP tools but no generic MCP client/runtime and no Brave integration.

Current gaps:

- no MCP server registry;
- no capability discovery or schema normalization;
- no per-tool role/scope policy;
- no timeout, retry, circuit breaker, or redaction layer;
- no citation normalization;
- no research planner;
- no source quality/freshness scoring;
- no explicit user confirmation policy for network research;
- no audit record tying a claim to Brave result URLs/snippets.

## Target architecture

```text
Microphone / typed input
          ↓
Moodie Voice Orchestrator
  ├─ Gemini Live conversation
  ├─ session/resumption manager
  ├─ turn transcript buffer
  ├─ memory recall packet
  ├─ tool proposal/confirmation gate
  └─ background task announcements
          ↓
Moodie Agent Runtime
  ├─ intent router
  ├─ planner/workflows
  ├─ Studio business tools
  ├─ Brave MCP research tools
  ├─ verifier/evidence policy
  └─ memory read/write service
          ↓
Supabase
  ├─ conversations/messages
  ├─ voice sessions/turns
  ├─ task runs/events
  ├─ governed long-term memories
  └─ research sources/citations
```

## Core design decisions

### D1 — Do not embed Iris Electron into Mood Studio

Accepted. Mood Studio is web/Next.js and must work across mobile and desktop. Port orchestration concepts, not Electron IPC, wake-word, hand tracking, or local desktop control.

### D2 — Gemini Live is the conversational front brain

Accepted. It handles casual dialogue, interruptions, brief acknowledgements, and spoken presentation. It must not invent Studio facts or research findings.

### D3 — Moodie is the authoritative worker brain

Accepted. Business data, planning, memory, Brave research, and consequential actions go through the Moodie runtime with role checks and audit trails.

### D4 — Every delegated action has a durable run

Accepted. Voice must never wait on an opaque HTTP call without a run ID. The orchestrator creates a durable run, reports progress, and injects terminal results back into the Live session.

### D5 — Memory is typed evidence, not an unbounded transcript dump

Accepted. Store structured durable claims with sources, confidence, temporal validity, and user governance. Conversation transcripts remain separate episodic evidence.

### D6 — Brave research is read-only by default

Accepted. Search/read operations need no confirmation when the user explicitly asks for research. Any future browser action, form submission, purchase, login, or write operation requires a separate high-risk policy and explicit confirmation.

## Phase 1 — Voice observability and end-to-end proof

### Implementation

Add a durable voice session model:

- `moodie_voice_sessions`:
  - `id`, `user_id`, `conversation_id`;
  - Live model/voice/engine;
  - started/ended/last-active timestamps;
  - resumption/reconnect count;
  - status and terminal error;
  - client/device metadata without fingerprinting.
- `moodie_voice_turns`:
  - session ID, turn sequence;
  - user transcript, assistant transcript;
  - first-audio/first-transcript/turn-complete latency;
  - interruption flag;
  - delegated run IDs;
  - playback acknowledgement.

Add client/server telemetry events:

```text
session.token_issued
session.connected
mic.capture_started
input.audio_sent
input.transcript_received
assistant.first_audio_received
assistant.audio_playback_started
assistant.turn_completed
session.interrupted
session.resumed
session.failed
```

Never store raw audio by default.

### Gate

A runtime trace proves:

```text
microphone → Gemini input transcript → assistant audio → browser playback → turn complete
```

at desktop and mobile widths.

## Phase 2 — Server-owned voice orchestration

### Implementation

Introduce a voice orchestration service instead of letting the browser own all business semantics:

- browser still streams audio directly to Gemini using ephemeral tokens;
- server creates the connect config and signed session descriptor;
- session descriptor includes user identity, role, conversation ID, memory packet version, allowed tools, and policy version;
- tool calls are posted to a durable voice-tool endpoint with session/turn IDs;
- server validates every tool call against the issued session descriptor;
- reconnect restores the same Moodie conversation and memory packet.

Suggested modules:

```text
lib/moodie/voice/orchestrator.ts
lib/moodie/voice/session-store.ts
lib/moodie/voice/tool-gate.ts
lib/moodie/voice/telemetry.ts
app/api/moodie/voice/session/route.ts
app/api/moodie/voice/tools/route.ts
app/api/moodie/voice/events/route.ts
```

### Gate

A refreshed browser or goAway reconnect resumes the same voice/session context without forgetting the user, active project, or last topic.

## Phase 3 — Iris-style delegation protocol

### Live tools

Replace the single opaque `ask_moodie` experience with explicit tools:

```text
answer_with_moodie
propose_moodie_task
submit_moodie_task
get_moodie_task_status
cancel_moodie_task
remember_user_fact
forget_user_fact
research_with_brave
```

### Routing policy

- casual chat: Gemini Live answers directly;
- stable personal context: use recalled memory packet;
- Studio fact/data: call `answer_with_moodie`;
- multi-step or slow operation: propose a task;
- consequential action: proposal + explicit confirmation in a separate user turn;
- status request: fetch durable run status;
- research request: create a read-only research run.

### Durable run model

Create `moodie_agent_runs` and `moodie_agent_run_events` with:

- objective, route, tool plan, status;
- user/session/conversation IDs;
- proposal and confirmation evidence;
- progress events;
- source IDs and result summary;
- cancellation/error state.

### Voice behavior

Gemini says a short acknowledgement, remains conversational, and receives server-generated events:

```text
SYSTEM_EVENT_MOODIE_RUN_STARTED
SYSTEM_EVENT_MOODIE_RUN_PROGRESS
SYSTEM_EVENT_MOODIE_RUN_COMPLETED
SYSTEM_EVENT_MOODIE_RUN_FAILED
```

It may only speak facts present in terminal run results.

### Gate

Moodie can accept a long-running research/business task, continue chatting, answer status questions honestly, and announce the verified result when done.

## Phase 4 — Long-term memory v3

### Memory taxonomy

Use explicit classes:

- `identity`: name, role, preferred address;
- `preference`: presentation, communication, workflow preferences;
- `instruction`: stable do/don't rules;
- `goal`: active objectives and success criteria;
- `project`: active project, phase, participants, constraints;
- `decision`: accepted decision with date and rationale;
- `relationship`: people/entities and their relationship to the user/studio;
- `episodic_summary`: bounded summary of a completed interaction window;
- `skill_learning`: reusable workflow learned from corrections;
- `external_fact`: sourced research claim with validity/freshness metadata;
- `studio_policy`: manager-approved shared rule.

### Memory write pipeline

```text
completed turn/window
→ candidate extractor model
→ deterministic policy validator
→ entity/predicate normalizer
→ duplicate/conflict detector
→ confidence/importance/expiry assignment
→ auto-activate safe classes OR request user approval
→ embedding/indexing
→ source-linked memory record
```

Auto-activation policy:

- explicit “remember this”: activate safe user memory;
- inferred preference/identity: pending unless confidence is high and non-sensitive;
- goals/projects/decisions: activate when explicit;
- studio policy: manager approval required;
- external facts: never masquerade as personal memory; require source and expiry;
- mutable Studio data: never long-term memory; fetch via tools.

### Conflict and superseding

For the same `(user, subject, predicate)`:

- equivalent value: merge evidence and update confidence;
- newer explicit correction: archive old, create new with `supersedes_memory_id`;
- ambiguous conflict: keep both pending and ask user;
- expired external fact: exclude from recall until refreshed.

### Retrieval architecture

Move from a small recent JSON-vector scan to hybrid database retrieval:

- pgvector or managed vector index;
- lexical/full-text index;
- filters by user, studio, role, scope, status, validity;
- reranking by semantic relevance, recency, importance, confidence, usage, and memory type;
- diversity by subject/predicate;
- token-budgeted memory packet.

Memory packet sections:

```text
Who the user is
How to work with them
Current goals/projects
Recent decisions
Relevant episodic context
Relevant sourced external knowledge
```

Each recalled item carries an internal memory ID and source evidence. The model sees concise text; telemetry records which memories influenced the turn.

### Consolidation worker

Nightly/on-threshold worker:

- merge duplicates;
- summarize related episodes;
- decay low-importance stale items;
- flag memories for reconfirmation;
- refresh embeddings;
- expire sourced external facts;
- never silently rewrite explicit user instructions.

### Voice integration

Before opening Gemini Live:

- load a small baseline packet: identity, address, communication preferences, active goals/projects;
- inject it into the system instruction;
- expose `recall_memory(query)` for topic-specific retrieval during the session;
- capture completed voice exchanges into the same curator pipeline;
- on reconnect, retain both Gemini resumption and server-side transcript summary.

### User controls

Moodie memory UI must support:

- “Moodie remembers…” grouped by type;
- source conversation and date;
- why it was recalled;
- edit, confirm, archive, forget;
- conflicting-memory resolution;
- private user vs shared studio distinction;
- export/delete all user memory.

### Gate

Across a brand-new conversation and a new voice session, Moodie correctly recalls the user's identity, preferred communication style, active project, and prior decision without being reminded, while refusing to treat stale business data as memory.

## Phase 5 — Brave MCP integration

### Generic MCP client

Create a server-only MCP runtime:

```text
lib/moodie/mcp/client.ts
lib/moodie/mcp/registry.ts
lib/moodie/mcp/policy.ts
lib/moodie/mcp/audit.ts
lib/moodie/mcp/adapters/brave.ts
```

Registry entry includes:

- server ID and transport;
- allowed tools;
- read/write classification;
- role requirements;
- timeout and result-size limits;
- secret reference, never raw key in prompts/logs;
- health and circuit-breaker state.

### Brave tool surface

Normalize Brave MCP capabilities into a small Moodie contract:

```text
research.search(query, freshness, count)
research.news(query, freshness, count)
research.local(query, location, count)
research.fetch(url)
```

Expose only tools actually supported by the configured Brave MCP server.

### Research workflow

```text
user question
→ decide whether current external information is required
→ create research plan
→ Brave search
→ fetch/read selected sources
→ deduplicate and rank sources
→ synthesize claims
→ evidence verifier checks every important claim
→ return answer with citations and freshness date
→ optionally propose provenance-aware external_fact memories
```

### Safety and quality

- read-only tools only in v1;
- block internal/private data from being inserted into public web queries unless explicitly approved and redacted;
- domain allow/deny policy;
- maximum calls, time, bytes, and redirects;
- prompt-injection filtering for fetched pages;
- source diversity requirement;
- current-date awareness;
- citations stored in `moodie_research_sources` and linked to answer/run;
- Brave failure falls back to a transparent “research unavailable” result, never model invention.

### Voice UX

For quick research, Gemini Live may say:

> “Mình kiểm tra nguồn mới nhất một chút nhé.”

The run happens asynchronously. On completion, the orchestrator injects a concise sourced result into the Live session. The detailed citation list appears in the text conversation/source drawer.

### Gate

A voice request for current information produces a Brave-backed answer with visible citations, exact research date, source audit records, and no unsupported claims.

## Phase 6 — Unified context planner

Introduce `MoodieContextPlanner` that decides, per turn:

- authenticated user context;
- conversation summary/history window;
- baseline and query-specific memories;
- Studio retrieval context;
- Brave research requirement;
- allowed tools and token budgets.

The planner must avoid context dumping and produce a trace:

```text
identity_context_used
conversation_summary_used
memory_ids_used
studio_sources_used
research_required
research_source_ids
context_tokens
```

Voice and text must call the same planner. This prevents Moodie from being smart in text but forgetful in voice.

## Phase 7 — Testing and evaluation

### Voice E2E

- authenticated Live token and session descriptor;
- real mic/audio loopback or controlled PCM fixture;
- first-audio latency;
- multi-turn direct conversation;
- barge-in;
- goAway resumption;
- task proposal/confirmation;
- background task completion announcement;
- mobile Safari/Chrome permission and playback behavior;
- cascade fallback.

### Memory tests

- explicit identity/preference/goal/decision capture;
- implicit candidate requires approval where appropriate;
- secret and mutable business-data rejection;
- cross-conversation recall;
- cross-voice-session recall;
- conflict/supersede behavior;
- expiry and reconfirmation;
- user/studio RLS separation;
- deletion/export;
- stale or irrelevant memory not injected.

### Brave MCP tests

- tool discovery and health;
- auth secret never leaked;
- timeout/circuit breaker;
- result normalization;
- source dedupe/diversity;
- prompt-injection page;
- citation/claim coverage;
- private-data query redaction;
- voice async research flow.

### Evaluation suite

Create a benchmark with scored scenarios:

- remembers who Admin is in a new session;
- remembers preferred answer style;
- resumes an active project and its last decision;
- distinguishes memory from live Studio facts;
- researches a current external question with Brave;
- refuses to invent when research fails;
- proposes before consequential action;
- continues conversation while a worker run executes;
- accurately reports run status and result.

## Delivery order

1. Voice telemetry and real E2E proof.
2. Durable voice session/session descriptor.
3. Unified context planner baseline.
4. Long-term memory v3 extraction, conflict, retrieval, and voice recall.
5. Durable agent runs and Iris-style delegation gate.
6. Generic MCP runtime and Brave read-only adapter.
7. Async voice research/result announcements.
8. Memory governance UI and consolidation worker.
9. Full benchmark, security audit, and production rollout.

## Rollout strategy

Feature flags:

```text
moodie_voice_orchestrator_v2
moodie_memory_v3
moodie_agent_runs
moodie_brave_mcp
moodie_voice_async_tools
```

Roll out to admin first, then managers, then selected staff. Keep current `ask_moodie` and cascade voice as fallback until benchmarks and telemetry meet thresholds.

## Definition of done

Moodie reaches the target only when all are proven:

- a real multi-turn audio conversation succeeds end to end;
- reconnect preserves the active topic and user context;
- voice and text use the same Moodie context planner;
- a new conversation recalls identity, preferences, active goals/projects, and decisions correctly;
- memory conflicts, expiry, deletion, and permissions are enforced;
- long-running tasks execute in the background with honest status and terminal announcements;
- consequential actions require explicit confirmation;
- Brave MCP research returns cited, fresh, auditable answers;
- private Studio data is not leaked into web queries;
- failures never lead to fabricated data/results;
- desktop and mobile voice E2E, memory evaluation, MCP integration, security, type, lint, test, and build gates pass.
