---
name: add-spaced-repetition-content
description: Use this skill whenever adding a new content type that users should review over time (vocab-like cards, grammar drills, exam question banks) — trigger on "make this reviewable", "add spaced repetition to X", "schedule reviews for Y", or "why isn't this exercise type using FSRS". Spaced repetition is the pedagogical core of this app; new reviewable content should plug into the existing FSRS scheduling rather than reinventing an ad-hoc repeat mechanism.
---

# Add spaced-repetition scheduling to new content

NT2 Planner uses `ts-fsrs` for vocab review scheduling, split across two files for a deliberate reason — respect the split.

## The two-file FSRS split

- **`src/features/vocab/fsrs-lite.ts`** — dependency-free constants and helpers (state enum, `isFsrsLearned`, Leitner→FSRS migration, Arabic interval formatting). This is what the boot path uses so the app doesn't eagerly pull in the ~59KB `ts-fsrs` package before it's needed.
- **`src/features/vocab/fsrs.ts`** — lazily wraps the real `ts-fsrs` (`fsrs()`, `Rating`, `createEmptyCard`). `scheduleCard(word, quality)` maps a 4-value `FsrsQuality` (0-3) to an FSRS `Grade` and returns `{due, intervalDays, fsrsFields}`.

When adding review scheduling to a new content type, follow this same split: keep cheap/boot-critical logic dependency-free, and lazy-import the heavy FSRS machinery only where actual scheduling happens.

## Known gap in this codebase — check before assuming it's handled

`src/features/exercises/logic.ts` (the match/sort/gap exercise builders) is **not** FSRS-scheduled today — it's pure, seed-shuffled, one-shot logic with no `due`/`interval` state. If you're asked to make an exercise type "spaced" or "reviewable over time", that's new wiring, not an existing pattern to copy — model it after how `vocab` cards do it (card gets `due`/`fsrsFields`, review action calls `scheduleCard`, next occurrence is filtered/sorted by `due`), rather than bolting a simple repeat-counter onto the exercise builder.

## Why this matters pedagogically

Spaced repetition — reviewing material right before you're about to forget it — is the single most effective mechanism this app has for actual retention, more so than any UI polish. When proposing new learning content, default to asking whether it should be reviewable over time, not just a one-time exercise.
