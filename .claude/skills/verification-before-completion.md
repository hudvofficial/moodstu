---
name: verification-before-completion
description: Use when about to claim work is complete or fixed — requires running verification and confirming output before making any success claims
---

# Verification Before Completion

## Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this response, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What proves this claim? (render, Network, build, test)
2. RUN: Execute the FULL check (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Mood-Studio Verification Commands

| Change type | Verify with | Not sufficient |
|-------------|-------------|----------------|
| UI/layout | Render + screenshot chrome-devtools | "Should look right" |
| CSS/responsive | Render @375px + @768px + @1024px | Checking one breakpoint |
| Performance | Network tab, measure vs baseline | "Should be faster" |
| Data mutation | Test in browser, verify server state | "Code looks correct" |
| Build | `npm run build` exit 0 | Linter passing |
| Lint | `npm run lint` 0 errors | Previous run |
| Deploy | `npx vercel --prod` + live check | Local dev server |
| Responsive | Check @768px AND @1023px | Only checking desktop |

## Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Done!")
- About to commit/push/PR without verification
- Relying on partial verification
- Thinking "just this once"
- ANY wording implying success without having run verification

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Linter passed" | Linter ≠ build ≠ render |
| "Just this once" | No exceptions |
| "Partial check is enough" | Partial proves nothing |
| "Code looks correct" | Looking ≠ running |

## When to Apply

**ALWAYS before:**
- Any variation of success/completion claims
- Any expression of satisfaction about the work
- Committing, PR creation, task completion
- Moving to next task
- Reporting to user that something is "done" or "fixed"

## The Bottom Line

Run the command. Read the output. THEN claim the result.
Non-negotiable.
