---
name: add-synced-field
description: Use this skill whenever adding a new piece of state to the Zustand store that should persist across devices via Supabase cloud sync — e.g. a new setting, a new counter, a new collection of user data. Also use it whenever the user asks why a field "isn't syncing" or "resets after sync" — that's almost always this pattern being incomplete. Trigger on phrases like "add a new field to the store", "make X sync to the cloud", or "track a new stat".
---

# Add a cloud-synced field

NT2 Planner has **no per-feature Supabase tables**. The entire `useAppStore` state is serialized as one JSONB blob (table `nt2_state`, column `data`, keyed by `user_id`). To make new state cloud-synced, you add it to the store — never a separate table.

## Why this is a skill and not obvious

The sync path touches four files that don't look related at first glance. Missing any one of them means the field works locally but **silently drops on the next cloud sync** — no error, just quietly reverts to default on another device. This has bitten this codebase before.

## The four files — touch all of them

1. **`src/store/types.ts`** — add the field to the `State` interface.
2. **`src/store/migration.ts`** — add it to both `defaultState()` (the seed value) and `applyState()` (sanitization). Both run on local *and* remote state before merge, so both need the field or one side ends up malformed.
3. **`src/features/cloud/merge.ts`** — add it to the `mergeStates(local, remote)` return object. This is an **explicit literal**, not a spread — a field left out here is silently dropped on every sync regardless of what's in `types.ts`. Follow the existing merge strategy conventions: arrays union, counters take the max, settings are newer-wins by `_savedAt`.
4. **`src/store/useAppStore.ts`** — any action that sets this field must call `set(...)` and then `get().save()` so the debounced sync (4s after any change, or on tab focus, in `src/features/cloud/cloudStore.ts`) picks it up.

## Reference implementation

`inburgeringExams` (the 5 exam cards) was shipped exactly this way — grep for it across the four files above as a working example to mirror.

## Don't forget

Cloud sync is optional/lazy — gated by `cloudConfigured()` checking `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. The app must keep working fully offline without them, so don't make the new field's local behavior depend on cloud being configured.
