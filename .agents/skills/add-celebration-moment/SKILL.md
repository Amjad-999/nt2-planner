---
name: add-celebration-moment
description: Use this skill whenever a user action deserves visual celebration — completing a milestone, unlocking a badge, finishing a streak threshold, passing an exam simulation, mastering a word. Trigger on "celebrate when X happens", "add confetti", "make this feel rewarding", or when defining a new achievement's `celeb` field. Small celebratory moments are a proven engagement driver in learning apps — default to proposing one for any new milestone rather than a silent success state.
---

# Add a celebration moment

`src/lib/celebrate.ts` is a lazy-imported `canvas-confetti` wrapper with 5 distinct celebration types (`CelebType`): `word | tasks | streak | exam | badge`. Each has its own particle burst pattern, timing, and colors pulled from the app's design tokens — so celebrations already feel visually consistent with the rest of the UI rather than looking like a generic confetti library default.

## How to use it

Call `celebrate(type)` with the closest matching existing `CelebType` at the moment of success — e.g. after a badge unlocks (already wired via `useBadgeCheck`, see `add-achievement-badge`), after completing a task list, after a streak milestone, after passing a practice exam, or after a vocab word is marked learned.

## When to add a new `CelebType` instead of reusing one

Only add a new type if the moment is genuinely a new category of achievement, not a new instance of an existing one — e.g. mastering your first word ever is still `'word'`, it doesn't need its own type. Follow the existing pattern in `celebrate.ts`: distinct particle burst/timing/colors, sourced from design tokens rather than new hardcoded hex values (see `add-themed-component`).

## Accessibility is already handled — don't second-guess it

`celebrate.ts` already no-ops entirely when the user has reduced motion enabled. You don't need to wrap calls in a `useReducedMotion()` check yourself — that would be redundant. If a celebration needs a *non-motion* fallback (e.g. a static success message) for reduced-motion users, add that separately rather than trying to make `celebrate()` itself do double duty.

## Why this is worth doing proactively

External research on engagement in learning apps (Duolingo etc.) consistently shows that celebrating small, frequent milestones — not just big ones — is a major driver of daily return visits. When implementing a new success state anywhere in the app, ask whether it deserves a `celebrate()` call before shipping it as a plain state change.
