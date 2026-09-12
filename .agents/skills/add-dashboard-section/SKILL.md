---
name: add-dashboard-section
description: Use this skill whenever adding a new top-level tab/section to NT2 Planner (like Dashboard, Plan, Vocab, Books, Exam sim, Exercises, Grammar, Stats, Resources, Platform) — trigger on phrases like "add a new section", "add a new tab", "create a new page for X". This is a fixed multi-file wiring pattern, not just "create a component" — missing a step leaves the section unreachable or crashes navigation.
---

# Add a new dashboard section

NT2 Planner's top-level sections (Dashboard, Plan, Vocab+AI, Books, Exam sim, Exercises, Grammar, Stats, Resources/DUO, Platform) all follow the same wiring pattern across three files plus the new section itself.

## Steps

1. **`src/store/types.ts`** — add the new id to the `TabId` union type.
2. **`src/components/NavTabs.tsx`** — add `{id, Icon, label}` to the `TABS` array so it shows up in navigation.
3. **`src/components/AppShell.tsx`** — add `lazy(() => import('@/sections/<NewSection>'))` and register it in `SECTION_MAP` so the router can find it. Lazy-loading matters here — this app tracks bundle size closely (recent perf-hardening focus), so a new section must not be eagerly bundled into the main chunk.
4. **`src/sections/<NewSection>.tsx`** — the new section component itself.
5. **Supporting files as needed**, mirroring the existing pattern: a `src/data/*.ts` content file if the section needs static content (see the `add-content-pack` skill), and a `src/features/<domain>/*.ts` logic module if it needs non-trivial logic (mirrors existing domains: `achievements`, `ai`, `cloud`, `exam`, `exercises`, `speaking`, `tts`, `vocab`).

## After wiring it up

- If the section has any state that should persist or sync across devices, see the `add-synced-field` skill — don't reinvent persistence.
- If the section needs themed styling, use the existing design tokens (`src/styles/tokens.css`) rather than hardcoding colors — see `add-themed-component`.
- Run through `check-before-pr` before considering it done, especially `check:digits` since new UI text is a common place for Arabic-Indic digits to sneak in.
