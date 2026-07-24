---
name: check-before-pr
description: Use this before opening a PR, right after finishing a feature or fix, or whenever the user asks "is this ready", "can we PR this", "run the checks", or "did I break anything". NT2 Planner has NO GitHub Actions CI (no .github/workflows directory exists) — every quality gate is a manual npm script, so this skill is the substitute for CI. Make sure to run it proactively before suggesting a PR is ready, don't wait to be asked.
---

# Pre-PR check gate

There is no CI in this repo. `npm run lint`, `typecheck`, `test`, `check:digits`, and `check:exams` all exist as scripts but nothing runs them automatically — a PR can be opened with a broken build and nothing will flag it except a human eyeballing the diff. Treat this checklist as mandatory before saying a change is "done" or ready to PR.

## Steps — run in this order, stop and fix at the first failure

1. `npm run lint`
2. `npm run typecheck`
3. `npm test` (runs `vitest run`)
4. `npm run check:digits` — fails if any Arabic-Indic or Extended-Persian digit (٠-٩, ۰-۹) sneaks into `src/**/*.{ts,tsx,js,jsx,json,md,css}`. This app is Arabic-RTL but code must use ASCII digits only — a fix that "looks right" with Arabic numerals in a string literal will fail this check.
5. `npm run check:exams` — verifies every PDF/audio filename referenced in `src/data/examPdfs.ts` and `src/data/examAudio.ts` actually exists under `public/exams/`. Relevant if you touched exam content, not general code changes.

## Extra manual check (not scriptable)

If you touched any component that renders during React's render phase, confirm you didn't call `Date.now()` directly in render — the `react-hooks/purity` eslint rule (via `eslint-plugin-react-hooks`) is configured for this, but double-check: use the `useNow()` hook (`src/hooks/useNow.ts`) for anything time-based in render, and `getDaysLeft(iso)` from the store for day-countdown math.

## Reporting back

Summarize pass/fail per step, not just "all good" — if `check:digits` or `check:exams` weren't relevant to the change, say so rather than silently skipping them.
