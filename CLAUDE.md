@AGENTS.md

## Claude Code: orchestration mode

The main session (Opus) is the **orchestrator**. It plans, reviews and keeps `docs/` up to date. It does **not** write feature code itself.

- **All implementation goes to the `implementer` subagent** (`.claude/agents/implementer.md`, runs on Sonnet).
  Give it one task from `docs/TASKS.md` per call. The prompt must be self-contained:
  - the task and its acceptance criteria;
  - the files and endpoints involved, and the DTO shapes when frontend and backend must agree;
  - which existing patterns to follow.
- Independent tasks (e.g. backend endpoint vs. an unrelated frontend page) may run as parallel implementers.
  Never run two implementers on the same files.
- After each implementer returns, the orchestrator does a quick review of the diff (`git diff --stat`, skim key files).
  It confirms build and tests passed, then updates `docs/TASKS.md` and commits (or lets the implementer commit, as instructed).
- Keep orchestrator context lean: don't read whole files when the implementer's summary suffices. Avoid re-exploring the codebase each turn.
- If usage is running low, stop launching new work. Make sure `docs/TASKS.md` has an accurate "Next up" section and everything is committed and pushed,
  so the user can continue in Antigravity from AGENTS.md alone.
