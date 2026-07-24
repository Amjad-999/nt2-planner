---
name: commit-and-branch
description: Use this skill whenever creating a git commit or a new branch in NT2 Planner, or when the user asks "what should I name this branch" / "write a commit message". The repo has a real, consistent convention in its history that isn't written down anywhere — follow it so history stays scannable.
---

# Commit message and branch naming convention

This isn't a convention imposed from outside — it's mined from this repo's actual git history, so following it keeps `git log` consistent with the last 60+ commits.

## Commit messages

Format: `type(scope): short description`

Observed types, most to least common: `feat`, `fix`, `perf`, `chore`, `a11y`, `docs`. Occasionally combined types like `perf+a11y(lighthouse): ...` when a single commit legitimately serves two goals — don't force this, use it only when splitting the commit would be artificial.

Examples from real history:
- `feat(dashboard): replace 3D hero with SmartGreeting + stat chips + quiet board`
- `fix(a11y): keyboard-dismissable toasts, restore main landmark + skip link`
- `fix(a11y): trap focus in modals, fix label + low-contrast colors`

Keep the description in the imperative, lowercase after the colon, no trailing period, and specific enough that someone skimming `git log --oneline` understands the change without opening the diff.

## Branch names

Format: `type/scope-description`, matching the commit type/scope — e.g. `fix/a11y-toast-and-landmarks`, `feat/inburgering-cloud-sync`. Keep branch and commit scope in sync so a `gh pr list` / `git branch` skim tells a consistent story.

## Why this matters here specifically

This repo has no `.github/` PR template or CODEOWNERS to enforce structure automatically — the convention only holds if every commit follows it by habit. Don't default to generic conventional-commits scopes (`ui`, `api`, `core`) — use the scopes already established in this repo's history (`a11y`, `dashboard`, `bundle`, `lighthouse`, etc.), and check `git log --oneline -20` if unsure which scope an area of the code has been using.
