# Moodie Memory Contract

## Purpose

Memory preserves stable preferences, instructions, and confirmed context across conversations. It never replaces live business data tools.

## Scopes

- `user`: private preference or instruction owned by one authenticated user.
- `conversation`: durable summary for one conversation; user owned and conversation linked.
- `studio`: manager/admin-managed operating instruction visible to active studio users.

## Write policy

1. The model may propose a candidate, never directly activate a memory.
2. New extracted records default to `pending`.
3. A user or an authorized manager must activate, edit, archive, or delete it.
4. Every active memory has a source message or an explicit manual source marker.
5. Financial values, contract balances, schedules, and mutable customer facts are rejected from memory extraction.

## Recall policy

At most five active records can enter a model request:

1. active conversation summary
2. up to two user preferences/instructions
3. up to two studio instructions

Records are compacted, expiry-filtered, scope-authorized, and injected separately from raw chat history. Retrieval failure never blocks a chat response.

## Lifecycle

`pending → active → archived/deleted`

- `pending`: extracted candidate, not used by the model.
- `active`: allowed to be recalled.
- `archived`: retained for audit but not recalled.
- `deleted`: logical deletion, never recalled.

## Prohibited content

- API keys, passwords, tokenized credentials.
- Bank/card/account full numbers.
- Raw personal contact data unless an explicit user preference requires it.
- Live financial figures, balances, schedules, contract status, or other mutable operational facts.

