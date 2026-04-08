# Phase 05: Sidebar + Navigation + Polish
Status: ⬜ Pending
Dependencies: Phase 04

## Objective
Wire the CRM V2 module securely into the app shell and execute the final SSOT compliance verification and polish tasks exactly matching the spec constraints.

## Requirements & Constraints
**Implementation MUST follow `docs/specs/crm.md` Section 4 exactly; this phase file is only an execution checklist.**
- **0 Hardcoded Hex Colors**: Use `@theme` tokens exclusively.
- **Strict Verification Boundary**: The codebase structure must comply fundamentally with the cross-module integrity checkpoints defined in Phase 05 of the spec.

## Implementation Steps
1. [ ] **Navigation Integration**: Update `components/layout/sidebar.tsx` and `components/layout/bottom-nav.tsx` to point to `/crm`. Default route redirects to `/crm/leads`.
2. [ ] **Code File Analysis**: Polish code elements to remain within file size constraints (<300 lines) and run final grep checks for prohibited CSS/HTML attributes (inline hexes, `style={{`, `<th`, etc.).

## Verification (Cross-Module Integrity)
- [ ] Command sequence validation: `npm run build && npx tsc --noEmit`.
- [ ] Hardcoded hex colors validation returns exactly `0`.
- [ ] Inline token audit blocks `<select`, Native tables, `style={{`. 
- [ ] Complete UI audit passes successfully.

---
**Module Complete upon verification pass.**
