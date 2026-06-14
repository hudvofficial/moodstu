---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior — before proposing fixes
---

# Systematic Debugging

## Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.
Random fixes waste time and create new bugs. Quick patches mask underlying issues.

## When to Use

ANY technical issue: bugs, test failures, unexpected behavior, perf regressions, build failures.

**Especially when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- You don't fully understand the issue

## The Four Phases

Complete each phase before proceeding.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read error messages carefully** — don't skip. Note line numbers, file paths, error codes. Read stack traces completely.

2. **Reproduce consistently** — can you trigger it reliably? If not reproducible → gather more data, don't guess.

3. **Check recent changes** — git diff, recent commits, new dependencies, config changes.

4. **Gather evidence in multi-component systems** — for each component boundary: log what enters, what exits, verify env/config propagation. Run once to gather evidence showing WHERE it breaks.

5. **Trace data flow** — where does the bad value originate? What called this with the bad value? Keep tracing up until you find the source. Fix at source, not at symptom.

   **Root-cause tracing technique:**
   - Observe symptom → find immediate cause → ask "what called this?" → trace up the chain
   - Add `console.error()` instrumentation before dangerous operations (log directory, cwd, env, stack)
   - Never fix just where the error appears — trace backward to the original trigger

### Phase 2: Pattern Analysis

1. **Find working examples** — locate similar working code in the same codebase.
2. **Compare against references** — read reference implementations completely, don't skim.
3. **Identify differences** — list every difference, however small. Don't assume "that can't matter."
4. **Understand dependencies** — what other components, settings, config does this need?

### Phase 3: Hypothesis and Testing

1. **Form single hypothesis** — "I think X is the root cause because Y." Be specific.
2. **Test minimally** — smallest possible change. One variable at a time.
3. **Verify before continuing** — worked → Phase 4. Didn't work → new hypothesis. DON'T stack fixes.

### Phase 4: Implementation

1. **Implement single fix** — address root cause. ONE change. No "while I'm here" improvements.

2. **Verify fix (mood-studio style):**
   - UI/layout → render + screenshot chrome-devtools
   - Perf → Network tab, measure improvement
   - Data/logic → run relevant test or verify in browser
   - Responsive → check @768px + @1024px if layout-related

3. **If fix doesn't work:**
   - Count attempts. If < 3 → return to Phase 1 with new information.
   - **If ≥ 3 → STOP and question architecture.** Each fix revealing new problems = wrong architecture, not wrong fix. Discuss with user before attempting more.

## Defense-in-Depth (after fixing)

When root cause is invalid data flowing through layers:

1. **Entry point validation** — reject invalid input at API boundary
2. **Business logic validation** — ensure data makes sense for this operation
3. **Environment guards** — prevent dangerous operations in specific contexts (e.g. refuse destructive ops outside temp dir in tests)
4. **Debug instrumentation** — log context for forensics

All four layers are necessary. Different code paths bypass different layers.

## Condition-Based Waiting (for flaky/timing issues)

```
WRONG:  await new Promise(r => setTimeout(r, 50)); expect(result)
RIGHT:  await waitFor(() => getResult() !== undefined); expect(result)
```

Wait for actual conditions, not arbitrary delays. Arbitrary timeouts only when testing actual timing behavior (debounce, throttle) — always document WHY.

## Red Flags — STOP and Return to Phase 1

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow
- "One more fix attempt" (when already tried 2+)
- Each fix reveals new problem in different place

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple" | Simple issues have root causes too |
| "Emergency, no time" | Systematic is FASTER than guess-and-check |
| "Just try this first" | First fix sets the pattern. Do it right. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "I see the problem" | Seeing symptoms ≠ understanding root cause |
| "One more fix" (after 2+ failures) | 3+ failures = architectural problem |
