# Moodie Runtime Design

## Product contract

Moodie has one primary chat provider at a time. A provider combo resolves to a runtime configuration containing provider type, endpoint, API key, chat model, optional embedding model, and display label. The chat model is always responsible for normal conversation and reasoning. Tools only provide trusted business data.

## Settings UI

The Moodie card follows progressive disclosure:

1. The collapsed card always shows the active provider, chat model, embedding model, endpoint, and configuration readiness.
2. Expanding the card exposes the primary combo selector and chat model.
3. Endpoint, API key, and embedding settings stay in Advanced.
4. Gemini legacy stays in its own collapsed compatibility section and is not presented as a second active provider.
5. Saving a combo is not considered successful until a real chat health-check returns successfully.

Configuration readiness only means required fields exist. Runtime health means the provider has completed a real request. The UI must not confuse these states.

## Engine state machine


The engine executes these states in order:

- route: classify the request and decide whether trusted business data is required.
- resolve_provider: resolve the active combo into a provider adapter.
- model: send conversational context and the allowed tool definitions to the provider.
- tool: execute only authorized tools selected by the model.
- verify: reject unsupported data answers and retry once with a corrective instruction.
- complete: return the model answer and full trace.
- degraded: return a transparent fallback when the provider is unavailable or fails.

General conversation never requires a tool. Business-data questions must use a tool or ask a short clarification question.

## Failure contract

- provider_unavailable: the active combo cannot create a runnable provider, usually because the API key or endpoint is missing.
- provider_error: the provider existed but a network, API, response-format, empty-response, or tool-loop error occurred.

A general-chat failure must never be described as an unmatched business intent. The degraded response tells the user that the chat model is unavailable. Business routes may continue through the deterministic core engine when it can answer safely.

## Trace contract

Every response trace records:

- total duration
- provider latency
- fallback latency
- route intent and reason
- provider label
- model steps
- tool calls and tool latency
- verifier corrections
- fallback reason
- provider error

The trace shown to users must use total duration. Provider and fallback duration are diagnostic details and must not overwrite total duration.

## Acceptance scenarios

1. A configured combo answers hi using the model with zero tools and no fallback.
2. A finance question calls an authorized finance tool before presenting factual values.
3. A missing API key fails the settings health-check and produces provider_unavailable in chat.
4. A bad endpoint or invalid model fails the health-check and produces provider_error in chat.
5. A provider failure on general chat displays a transparent connection message, not the core business suggestion list.
6. Gemini legacy cannot silently override a configured OpenAI-compatible combo.
