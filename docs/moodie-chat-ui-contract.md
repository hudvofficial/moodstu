# Moodie chat UI contract

This contract keeps Moodie aligned with the interaction patterns users already understand from ChatGPT, Claude, and Gemini while preserving Mood Studio-specific tools and data.

## Principles

1. One state, one surface. A turn must never show two progress labels for the same work.
2. Content first. Assistant answers do not need a repeated avatar or decorative card.
3. Progressive disclosure. Tool traces, diagnostics, destructive actions, and long model catalogs stay behind an explicit disclosure control.
4. Local control. Model choice lives in the composer where it affects the next message; provider credentials live in Studio settings.
5. Stable geometry. Streaming, completed, and error states must not cause large vertical jumps.
6. Mobile parity. Mobile keeps every core action without copying desktop spacing.

## Composer

- One rounded input surface with attachment and skill controls on the left.
- Model picker, dictation, voice mode, send, and stop controls on the right.
- The model trigger is a compact pill. The popup opens above the composer, is searchable for large catalogs, marks the active model, and scrolls independently.
- The selected model is sent with the turn and remembered locally. Settings retain only the provider fallback needed by background jobs.

## Thinking and streaming

- Render exactly one compact row: spinner, current phase, elapsed seconds, optional disclosure chevron.
- Do not render the assistant avatar or execution summary while the turn is pending.
- Only meaningful tool steps or errors make the row expandable.
- Streamed answer text appears directly below the same row without a second status component.

## Completed answers

- Render answer content directly on the page without a speech-bubble card or repeated assistant avatar.
- Use readable body typography and structured blocks only when the response data benefits from them.
- Show execution/source summary only after completion and only when evidence exists.
- Primary actions: copy, read aloud, feedback, regenerate.
- Secondary actions: diagnostics, continue, delete. These belong in the overflow menu.
- Follow-up prompts use compact wrapping chips rather than full-width rows.

## Responsive behavior

- Desktop content width remains bounded for reading; data tables can use the available width.
- Mobile pending rows stay 32px high, composer controls remain reachable, and model names truncate without pushing voice/send controls off-screen.
- Popovers use viewport-aware width and bounded height.

## Acceptance checks

- No duplicate pending label or duplicate spinner/avatar.
- Selecting a model changes the model used by the backend turn.
- Model catalogs with 100+ entries remain searchable and do not exceed the viewport.
- Completed action bars do not wrap under normal mobile widths.
- Escape and outside click close open menus; selected options expose accessible state.
- TypeScript, ESLint, UTF-8 verification, focused tests, and production build pass.
