# NT2 Planner — Claude Brain

## What this is
Arabic-language PWA for Dutch **NT2 B1** exam prep. Single-user, offline-capable, RTL UI.
The owner is not a professional developer: prefer simple, working, verified solutions over clever ones.

## Answer style (owner's requirement)
- Reply in **Arabic**.
- Never put Arabic and English on the same line. Each English term, command, filename, URL or env var goes on its own line.
- Be brief. No long preambles.

## Stack (verified — do not assume otherwise)
- **Vite 8** + `@vitejs/plugin-react` — **NOT Next.js**, no App Router, no `src/app/`, no server components
- React 19 + TypeScript (`~6.0`)
- Tailwind CSS 3 + custom CSS variables — **NOT shadcn/ui**, no component library
- Zustand 5 (single store) — no Redux, no Context state
- Supabase JS (auth + cloud sync) + `idb-keyval` (local persistence)
- Framer Motion 12, Chart.js 4, `ts-fsrs` 5 (spaced repetition), `fuse.js` (search)
- `vite-plugin-pwa` (service worker, `registerType: 'autoUpdate'`)
- Vitest 4 + Testing Library
- Path alias: `@/` → `src/`
- Deploy: Vercel (`vercel.json`) and Netlify (`netlify.toml`) both present

## Structure (real paths)
- `src/App.tsx` — thin shell, registers the service worker, renders `AppShell`
- `src/components/AppShell.tsx` — tab shell + navigation
- `src/sections/` — top-level tabs: `Dashboard` `Plan` `Vocab` `Books` `Exam` `Exercises` `Grammar` `Stats` `Resources` `Platform`
- `src/components/` — reusable UI (+ subfolders: `hero/` `mascot/` `auth/` `countdown/` `themes/`)
- `src/features/` — feature logic: `achievements` `ai` `cloud` `exam` `exercises` `mascot` `speaking` `tts` `vocab` `world`
- `src/store/useAppStore.ts` — the Zustand store (+ `types.ts`, `migration.ts`)
- `src/hooks/` — `useNow` `useTheme` `useAuth` `useMascot` `useCountdown` …
- `src/lib/` — `supabase.ts` `idb.ts` `auth.ts` `utils.ts` `animations.ts` `celebrate.ts` `pdfWorker.ts`
- `src/data/` — static typed content: `dutchQuotes.ts` (30 quotes) `themas.ts` `grammarExercises.ts` `examPdfs.ts` `examAudio.ts` …
- `src/styles/tokens.css` — **every color lives here**; `globals.css` for base styles
- `src/tests/` — `unit/` and `smoke/`
- `public/exams/` — ~300 MB of PDFs and audio. **Never read, list, grep or open these files.** Only their filenames matter, and `npm run check:exams` verifies those.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc -b`
- `npm run lint` — eslint
- `npm test` — vitest run
- `npm run check:digits` — fails if Arabic-Indic digits appear in source
- `npm run check:exams` — verifies exam filenames exist under `public/exams/`

There is **no CI**. These scripts are the only quality gate — see the `check-before-pr` skill.

### Verifying from a Linux sandbox (assistant only)
The checked-in `node_modules/` is built for the owner's Windows machine, so an assistant
running in a Linux sandbox cannot execute the suite against it. Use the mirror harness:

- `bash scripts/verify-sandbox.sh static` — typecheck + lint + check:digits + build
- `bash scripts/verify-sandbox.sh test` — the 237-test suite (~42 s, needs its own call)
- `... test1` / `... test2` — the same suite in halves, when one call is too slow

It rsyncs `src/`, `scripts/`, `public/` (minus `exams/`) and the config files into
`/tmp/nt2-verify`, which keeps its own Linux `node_modules/`. It never writes to the
project folder and never touches `public/exams/`. Run **both** modes before claiming done.
The owner still runs the plain `npm` scripts on Windows.

## Critical rules (NEVER break)
1. WCAG AA contrast ≥ 4.5:1 for text; pair every color-coded state with an icon.
2. Colors come from `src/styles/tokens.css` only. Hard-coded hex breaks dark mode silently.
3. Dutch quotes and UI copy: formal Dutch only (`u`/`uw`), never `je`/`jij`.
4. ASCII digits only in source. Arabic-Indic digits (٠-٩) fail `npm run check:digits`.
5. RTL + mobile-first. Directional icons must flip — see the `rtl-icon-check` skill.
6. Never call `Date.now()` during React render — use `useNow()`.
7. Never commit secrets. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public by design.
8. New store fields that must sync need the full pattern — see the `add-synced-field` skill.
9. After any change: run lint, typecheck and test before saying it is done.

## Working style (keeps sessions fast and accurate)
- Read only the files you need. Never open `node_modules/`, `dist/`, `.git/`, `public/exams/`, `package-lock.json`.
- Prefer targeted search over reading whole files; `src/data/themas.ts` alone is 1300 lines.
- Some existing files are large (`Exercises.tsx` ~800 lines, `useAppStore.ts` ~700). Do **not** refactor or split them unless explicitly asked. New components: aim under ~200 lines.
- One task per session. Run `/clear` between unrelated tasks — a long session makes answers slower and less accurate.
- Check `.claude/skills/` first: there are 16 project skills covering most recurring tasks.

## When a screenshot is sent
1. Describe the visual problem precisely.
2. Propose the fix in Plan Mode.
3. Ask if anything is ambiguous.
4. Only then implement, then verify with the commands above.
