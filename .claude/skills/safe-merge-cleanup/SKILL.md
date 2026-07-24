---
name: safe-merge-cleanup
description: Use this skill whenever you are about to delete a git branch after a PR merge, whenever the user says a PR "merged" or pastes something like "✓ Merged pull request", or whenever cleaning up branches after work lands on master. This repo has had a real incident where an unverified branch delete closed an unmerged PR — always run this before deleting a branch, even if the user seems certain it merged.
---

# Safe merge cleanup

A user pasting "✓ Merged pull request" or saying "that one's merged" is **not proof**. GitHub's UI can show that text for a squash-merge that hasn't actually landed, or the user can misremember which PR they mean. Trust the API, not the screenshot.

## Why this matters

This repo (`Amjad-999/nt2-planner`) had an incident: a branch was deleted based on an unverified claim of merge, and because the delete was chained with the verification in one batch, `git push origin --delete` of the still-open PR's head branch **closed the PR** instead of just tidying up. Recovering required reconstructing the branch from the surviving local commit and reopening the PR.

## Steps

1. **Verify on GitHub, authoritatively:**
   ```bash
   gh pr view <N> --json state,mergedAt
   ```
   Only proceed if `state` is exactly `MERGED` and `mergedAt` is non-null. `state: OPEN` or `CLOSED` (without merge) means stop — do not delete.

2. **Verify locally that the commit is actually reachable from master:**
   ```bash
   git merge-base --is-ancestor <commit-sha> origin/master
   ```
   Exit code `0` confirms the commit is an ancestor of `origin/master`.

3. **Only after both checks pass**, delete the branch — as a **separate step**, not chained in the same command or the same tool-call batch as the verification. Look at the verification output first, then decide to delete.

4. **If you already deleted a branch and discover the PR is now closed but unmerged:** the commit survives locally as long as you haven't garbage-collected it.
   ```bash
   git branch <branch-name> <sha>
   git push origin <branch-name>
   gh pr reopen <N>
   ```

## Related note

Auto-mode in this environment blocks `gh pr merge` — the user merges PRs themselves. This skill is about cleanup *after* that happens, not about performing the merge.
