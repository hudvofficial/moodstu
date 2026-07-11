# Moodie × Open WebUI — Full Experience Port Plan

## Objective

Port the interaction quality of Open WebUI into Moodie without copying its Svelte runtime, backend, model registry, or security model. Moodie keeps its existing provider aliases, Supabase conversations, tools, memory, approvals, typed artifacts, and Studio permissions.

## Evidence reviewed

- Open WebUI chat shell: `src/lib/components/chat/Chat.svelte`
- Sticky chat navbar: `src/lib/components/chat/Navbar.svelte`
- Floating composer: `src/lib/components/chat/MessageInput.svelte`
- Message scrolling and branch behavior: `src/lib/components/chat/Messages.svelte`
- Assistant and user actions: `src/lib/components/chat/Messages/ResponseMessage.svelte`, `UserMessage.svelte`
- Follow-up presentation: `src/lib/components/chat/Messages/ResponseMessage/FollowUps.svelte`
- Resizable history navigation: `src/lib/components/layout/Sidebar.svelte`
- Conversation row interactions: `src/lib/components/layout/Sidebar/ChatItem.svelte`, `ChatMenu.svelte`

## UX principles to port

1. Conversation is the primary canvas; dashboard cards are secondary.
2. Use a calm document-width content column instead of full-width bubbles.
3. Keep the composer visually floating and always reachable.
4. Place history on the left and make collapse state persistent.
5. Keep assistant content mostly unboxed; reserve cards for structured artifacts.
6. Put copy, retry, debug, source, and approval actions next to the message they affect.
7. Render follow-ups as a quiet vertical list, not prominent pills.
8. Auto-scroll only while the user is already near the bottom.
9. Provide an explicit jump-to-latest control when the user scrolls upward.
10. Use one responsive architecture: desktop sidebar, mobile drawer, same thread/composer.

## Port matrix

| Open WebUI behavior | Moodie target | Implementation |
|---|---|---|
| Left navigation rail | Conversation history | Search, new chat, grouped history, rename/delete menu |
| Sticky model navbar | Moodie context bar | Sidebar toggle, Moodie identity, active conversation title |
| Document-width messages | Moodie thread | Centered `max-w-3xl/4xl`, assistant unboxed, user compact bubble |
| Response controls | Message action row | Copy, repeat prompt, sources/debug affordances |
| Follow-up questions | Suggested next turns | Vertical low-emphasis rows |
| Floating input | Moodie composer | Rounded panel, growing textarea, add/tools affordance, send state |
| Smart scroll | Thread controller | Near-bottom tracking and jump-to-latest button |
| Mobile sidebar overlay | History drawer | Same grouped conversation list and search |
| Content visibility | Long conversation performance | `content-visibility: auto` per message with stable intrinsic size |

## Deliberate exclusions

- Open WebUI model IDs and model management UI: Moodie keeps opaque provider combos.
- Arbitrary HTML/SVG/Mermaid rendering: Moodie keeps typed safe artifacts.
- Open WebUI authentication and backend APIs: Mood Studio permissions remain authoritative.
- Tool execution without approval: Moodie approval ledger remains mandatory.
- Svelte source code: only interaction patterns are reimplemented in React/Next.js.

## Delivery phases

### Phase 1 — Shell and hierarchy

- Move history sidebar to the left.
- Remove dashboard-like empty-state cards.
- Introduce compact sticky context bar.
- Center the reading column.

### Phase 2 — Thread and message ergonomics

- Unbox assistant messages.
- Add message actions and vertical follow-ups.
- Improve code, lists, sources, typed artifacts, and status presentation.
- Add smart scrolling and jump-to-latest.

### Phase 3 — Composer

- Floating rounded composer with expanding textarea.
- Keyboard behavior: Enter send, Shift+Enter newline.
- Add action affordance for future attachments/tools without exposing unsupported actions.
- Keep suggestions contextual and lightweight.

### Phase 4 — History navigation

- Search and status filters in sidebar.
- Group conversations by recency.
- Keep rename/delete accessible without hover-only ambiguity.
- Persist collapsed state locally.

### Phase 5 — Responsive and performance

- Mobile drawer parity.
- Lazy-load secondary panels.
- Use content visibility for long threads.
- Avoid new client waterfalls and broad bundle imports.

### Phase 6 — Verification

- Type-check and targeted lint.
- Production build.
- Browser QA at desktop, tablet, and mobile widths.
- Verify new chat, send, history selection, rename, delete, copy, follow-up, scroll, visual artifacts, approval actions, and locked conversations.

## Definition of done

- The Moodie screen reads visually as a focused chat product rather than a dashboard.
- The primary layout and interaction hierarchy match the strengths visible in Open WebUI.
- All existing Moodie business tools, memory, approvals, provider aliases, and typed artifacts continue to work.
- Desktop and mobile workflows are visually verified in the running application.
- Production build and relevant regression tests pass.
