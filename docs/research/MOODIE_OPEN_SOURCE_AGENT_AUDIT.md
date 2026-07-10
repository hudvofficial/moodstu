# Moodie Open-Source Agent Audit

> Research snapshot: 2026-07-10. The repositories below were shallow-cloned into a temporary research workspace. This document records patterns, not vendored code.

## Sources audited

| Repository | Commit audited | License | Primary value for Moodie |
| --- | --- | --- | --- |
| alibaba/page-agent | `e8c8ab0d78c5b737db7a62380e72fa9108bbaf19` | MIT | Observe-think-act loop, activity stream, browser/UI action boundaries |
| stripe/ai | `dc8faf805e6d351be7991f9e4c3d5dc1a1cfdcda` | MIT | Provider-neutral usage metering, skills distribution, MCP/OAuth patterns |
| msitarzewski/agency-agents | `9f3e401ccd09aa0ee0ef8e015226d0647908e01e` | MIT | Explicit agent role contracts, orchestration quality gates, memory handoffs |

## 1. Page Agent

### Evidence

- `PageAgentCore` implements an observe → think → act loop with a bounded `maxSteps` configuration.
- It separates persistent history events used as agent memory from transient activity events intended only for UI feedback.
- Tool registration is allow-list based; custom configuration can remove a tool, and experimental script execution is disabled by default.
- The project documents DOM-content transformation before LLM submission for masking sensitive data.
- Its security guidance separates forbidden actions from actions requiring explicit confirmation.

### Moodie decision

| Pattern | Decision | Moodie implementation |
| --- | --- | --- |
| Persistent execution history vs transient UI activity | **Adopt** | Keep traces/audit durable; make user-facing activity ephemeral and concise. |
| Observe-think-act execution state | **Adapt** | Use `route → plan → tool/action → verify → respond`, not browser DOM observation. |
| Tool allow-list | **Adopt** | Existing manifest becomes the sole tool exposure boundary. |
| Data masking pre-LLM | **Adapt** | Apply to customer contact data, bank details, secrets, and sensitive tool output. |
| Browser-wide DOM automation | **Defer** | Add only after server-side action preview/approval exists. |
| Script execution in the page | **Reject** | Too broad for Moodie financial/CRM workflows. |

## 2. Stripe AI

### Evidence

- `llm/token-meter` detects response/provider type and logs usage asynchronously after completions or streams finish.
- The AI SDK wrapper normalizes streaming text, tool-call deltas, finish reason, and usage into a stable event contract.
- The repository treats MCP access as an OAuth-protected external tool surface.
- Skills are distributed as concise, versionable instructions rather than runtime business logic.
- Benchmark directories keep solution evaluation separate from the product runtime.

### Moodie decision

| Pattern | Decision | Moodie implementation |
| --- | --- | --- |
| Normalized model usage events | **Adopt** | Extend Moodie trace with prompt/output/total tokens when gateway returns usage. |
| Fire-and-forget usage persistence | **Adapt** | Persist to Moodie telemetry without blocking chat response. |
| Streaming event contract | **Adapt** | Prepare provider adapters for response streaming; do not add UI streaming until contract is stable. |
| OAuth/MCP boundary | **Adopt** | Treat every external integration as an authenticated capability, never as an unrestricted model tool. |
| Skills as versioned instruction packages | **Adopt** | Store Moodie agent profiles and task rules as code-owned definitions with IDs and versions. |
| Stripe billing implementation | **Reject** | Moodie needs neutral telemetry first, not Stripe dependency. |

## 3. Agency Agents

### Evidence

- Agent files use a repeatable identity, mission, operating rules, workflow, deliverables, and success-metric structure.
- The orchestration agent requires evidence-based phase gates, specific handoffs, bounded retries, and final integration validation.
- Its MCP memory guide recommends recall, remember, search, and rollback across sessions and agent handoffs.
- The repository is a prompt/workflow catalogue, not a production execution engine.

### Moodie decision

| Pattern | Decision | Moodie implementation |
| --- | --- | --- |
| Agent role contract | **Adopt** | Define Finance Analyst, Operations Assistant, Studio Advisor, and Codebase Analyst profiles. |
| Mission/workflow/output/success metrics | **Adopt** | Each agent profile declares its allowed skills, data policy, and answer contract. |
| Evidence-based quality gates | **Adopt** | Expand evaluator benchmark cases per agent/skill. |
| Cross-session memory concept | **Adapt** | Build governed DB memory with scope, confidence, source, expiry, and user controls. |
| Free-form memory writes by prompt | **Reject** | Moodie must use policy-checked extraction and explicit user confirmation for sensitive facts. |
| Large multi-agent roster | **Defer** | Start with four roles selected deterministically; avoid agent-to-agent chatter. |

## Current Moodie gap analysis

| Capability | Current state | Next change |
| --- | --- | --- |
| Provider adapter | Present | Normalized usage is now captured when gateway returns it; combo aliases remain opaque. |
| Intent router | Present | Route into named agent profiles, not only domains. |
| Tool manifest | Present | Add action risk/approval policy separate from read tools. |
| Context | Thread history only | Add conversation summaries and governed long-term memory. |
| Trace | Present | Separate public status, technical debug, and durable audit. |
| Evaluation | Present | Agent-role checks, normalized token telemetry, and latency observability are now wired. |
| UI automation | Absent | Add safe app-navigation preview only after approval framework. |

## Architecture guardrails

1. Business data is always live-tool sourced; it is never treated as durable memory.
2. A model cannot execute a write action without an explicit action policy and approval state.
3. Long-term memory is scoped, source-linked, confidence-rated, expirable, and user-editable.
4. Tool/action permissions are server-enforced, not prompt-enforced.
5. Telemetry must not block the chat path.
6. Model/provider aliases such as `gpt` remain opaque runtime configuration; Moodie does not hardcode the upstream model behind a combo.

## Phase gates

- **R1 complete:** source audit and decisions captured in this document.
- **R2 complete:** capability matrix and import decisions captured above.
- **R3 gate:** Agent Core definitions compile and routing tests prove deterministic profile selection.
- **R4 gate:** three POC tasks pass direct-chat, finance-tool, and safe-navigation benchmarks.
- **R5 gate:** memory writes are policy-approved, recall is scoped, and deletion is verified.
- **R6 gate:** every side-effect action shows preview + approval + audit record.
- **R7 gate:** benchmark, latency, security, and UX acceptance checks pass for the current scope; full-suite validation still has one unrelated pre-existing gallery assertion mismatch.
