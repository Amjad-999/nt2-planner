# ECC layer — what was adopted and why

Source: https://github.com/affaan-m/ECC (MIT, see `LICENSE` next to this file)
Commit: 8321021c54d670126ce3b2969d5deb880b4b0c2a (adopted 2026-09-12)

ECC ships 68 agents, 292 skills, 122 rule files and 24 hooks for every language.
This project took a curated subset by hand instead of running the ECC installer:
the installer's smallest profile writes 489 files, loads rules for every language
into each session, and would have broken `npm run check:docs`.

## Installed

Agents in `.claude/agents/` (Claude Code only):
planner, code-reviewer, typescript-reviewer, react-reviewer, security-reviewer,
tdd-guide, build-error-resolver, react-build-resolver, a11y-architect, silent-failure-hunter

Skills, in both `.claude/skills/` and `.agents/skills/` (byte-identical, as check:docs requires):
react-patterns, react-testing, vite-patterns, accessibility, tdd-workflow, verification-loop

Rules in `.claude/rules/ecc/` (load only when a matching file is touched):
react/hooks.md, web/performance.md, typescript/coding-style.md

## Changed from upstream

- Every agent `description:` that said "Use PROACTIVELY" or "MUST BE USED" now says
  "Use when the user asks". Those phrases make Claude start a paid subagent on its own.
- `rules/ecc/typescript/coding-style.md`: the Zod and logging-library sections were
  replaced, because both would mean adding a dependency.

Everything else is byte-for-byte upstream.

## Deliberately left out

- Hooks (all 24): an extra round trip before the first edit of every file, `tsc` after
  every reply, a block on editing lint config, and a watcher on every tool call.
  CI and `npm run doctor` already cover the checks.
- `security-review` skill: same name as Claude Code's built-in command and hid it.
  The `security-reviewer` agent covers the same ground.
- `security-scan` skill: runs the external AgentShield package through npx.
- `performance-optimizer` agent, `react-performance` skill: built around webpack,
  CRA and Next.js.
- `refactor-cleaner` agent: conflicts with the rule against splitting large files.
- `rules/common/*`: not path-scoped, so it loads into every session, and it mandates
  splitting files over 800 lines, 80% coverage and forking open-source projects.
- React rules on server components and session cookies: this is a Vite SPA and
  Supabase keeps its session in localStorage by design.
- Commands, MCP configs, memory runtime, and every non-web language.

## Updating or removing

Update: re-copy the files above from a newer ECC commit, re-apply the two changes,
copy each skill to both skill folders, then run the Definition of done gates.
Remove: delete the files listed above plus this folder, set the skill count in
CLAUDE.md and AGENTS.md back to 16, and delete the "ECC layer" section in both.
