---
name: "claude-executor"
description: "Thực thi implementation plan từ Claude: lên kế hoạch, code, test lỗi và dùng subagent review chéo."
---

# Claude Plan Executor

Use this skill when the user provides an implementation plan (from Claude or another architect) and requests execution. This ensures disciplined, phase-by-phase implementation with built-in Quality Assurance (QA).

## Workflow

1. **Initialize & Plan**
   - Read the provided `<claude_plan>` carefully.
   - Use `update_plan` to map the architectural phases into actionable, trackable steps in the system.

2. **Context Gathering**
   - Use `read` or `exec git grep` to inspect *only* the files needed for the current phase.
   - Use `memory_search` to check for specific codebase conventions if applicable.

3. **Execution (Code)**
   - Apply changes precisely using the `edit` tool. 
   - Avoid `write` unless creating entirely new files. Do not overwrite whole files for small changes.

4. **Self-Correction (Lint/Build)**
   - Run local checks via `exec` (e.g., `npm run lint`, `npm run type-check`, `tsc --noEmit`, or equivalent framework checks) to catch syntax and type errors immediately after edits.

5. **Subagent Peer Review (Multi-Agent)**
   - Spawn a reviewer via `sessions_spawn` with `runtime="subagent"`.
   - Task: "Act as a Senior Reviewer. Review the recent changes/diffs for edge cases, logic bugs, security issues, and code smells. Provide a brief report."
   - Fix any issues identified by the subagent before proceeding.

6. **Checkpoint & Handoff**
   - Complete ONLY ONE phase at a time.
   - Report the outcome of the phase to the user.
   - Wait/Yield for user feedback and explicitly request permission before starting the next phase.
