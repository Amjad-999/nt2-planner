---
name: add-content-pack
description: Use this skill whenever adding a new batch of static content to NT2 Planner — quotes, example sentences, question banks, reference lists, or any dataset that isn't user-generated. Trigger on "add a data file for X", "add a list of Y", or "add content like dutchQuotes.ts". There's an established, lightweight convention for these files — no build step, no schema library, just typed arrays.
---

# Add a content pack

`src/data/*.ts` files all follow the same shape: a typed array or record, a matching TypeScript interface, and static asset paths where relevant. No database, no CMS, no build-time content pipeline — content ships as plain TypeScript.

## The convention

- **Typed array**: e.g. `dutchQuotes.ts` — `QUOTES: {nl, ar}[]`, plus a small deterministic helper (`dayOfYear()`) for rotating content by day rather than randomly, so a user sees a consistent quote per day across sessions/devices.
- **Typed record keyed by id**: e.g. `examAudio.ts` — `EXAM_AUDIO: Record<examId, AudioTrack[]>`, referencing static files under `/exams/audio/<id>/` rather than embedding audio data.
- **Bilingual/Arabic content inline**: Arabic strings live directly in the data file (`ar` field alongside `nl`), not in a separate i18n/locale system — this app doesn't have one, so don't introduce a translation-key indirection layer for a single content file.

## Steps for a new content pack

1. Define an interface for one entry.
2. Export a typed array or record of entries, matching the interface.
3. If it references static assets (audio, PDFs, images), put them under `public/` and reference by path — see `scripts/check-exams.mjs` for the existing pattern of validating that referenced asset paths actually exist (extend that script if the new content type should also be validated this way).
4. Run `check:digits` — content files are a very common place for Arabic-Indic digits to slip into example sentences or labels.

## Note on `dutchQuotes.ts`

As of this skill being written, `dutchQuotes.ts` exists in the repo but is untracked and not yet wired into any UI — treat it as a live example of the *format* to follow, but confirm with the user whether it's finished/intentional before assuming it's already shipped.
