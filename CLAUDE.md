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
- `src/sections/` — primary workspaces `Today` `Practice` `Words` `Learning` `LearnSettings` (the default landing is `today`), plus the original tools `Dashboard` `Plan` `Vocab` `Books` `Exam` `Exercises` `Situations` `Grammar` `Stats` `Resources` `Platform` (reached via «المزيد»)
- `src/features/observatory/` + `src/components/obs/` + `src/data/observatory/` — the daily-learning layer (session, evidence, role-play). Design package and rules: `docs/observatory/DESIGN.md`
- `src/components/` — reusable UI (+ subfolders: `ui/` `nav/` `practice/` `progress/` `dashboard/` `exam/` `plan/` `hero/` `mascot/` `auth/` `countdown/` `themes/`)
- `src/components/ui/` — design-system primitives: `Button` `Segmented` `ProgressBar` `Callout`; their CSS lives in `src/styles/components.css` (`.btn` `.segmented` `.card` `.chip` `.choice` `.progress` `.bubble`)
- `src/features/` — feature logic: `achievements` `ai` `cloud` `exam` `exercises` `grammar` `mascot` `observatory` `plan` `progress` `speaking` `tts` `vocab` `world`
- `src/store/useAppStore.ts` — the Zustand store (+ `types.ts`, `migration.ts`)
- `src/hooks/` — `useNow` `useTheme` `useAuth` `useMascot` `useCountdown` …
- `src/lib/` — `supabase.ts` `idb.ts` `auth.ts` `utils.ts` `animations.ts` `celebrate.ts` `pdfWorker.ts`
- `src/data/` — static typed content: `dutchQuotes.ts` (30 quotes) `themas.ts` `situations.ts` (8 real-life dialogues) `grammarExercises.ts` `examPdfs.ts` `examAudio.ts` …
- `src/styles/tokens.css` — **every color lives here** (`--o-*` observatory tokens + `data-skin` remap of the legacy tokens); `globals.css` for base styles; `components.css` for the shared control classes
- `src/tests/` — `unit/` and `smoke/`
- `public/exams/` — ~300 MB of PDFs and audio. **Never read, list, grep or open these files.** Only their filenames matter, and `npm run check:exams` verifies those.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc -b`
- `npm run lint` — eslint
- `npm test` — vitest run
- `npm run doctor` — plain-Arabic health report for the owner; runs every gate and
  ends with the one thing to fix next. Changes nothing.
- `npm run check:digits` — fails if Arabic-Indic digits appear in source
- `npm run check:exams` — verifies exam filenames exist under `public/exams/`
- `npm run check:rls` — proves the cloud table is not readable without a session
  (skips cleanly when no backend is configured)
- `npm run check:docs` — fails if CLAUDE.md or AGENTS.md describes something that
  does not exist

CI runs every gate above on each push and pull request (`.github/workflows/ci.yml`).
Run them locally first anyway — see the `check-before-pr` skill, or just `npm run doctor`.

### Definition of done
A change is done when **all** of these pass, not just the first three:

`npm run typecheck` · `npm run lint` · `npm test` · `npm run check:digits` ·
`npm run check:exams` · `npm run check:docs` · `npm run build`

Never report a task complete on inspection alone. If a gate cannot be run, say which and why.

`npm run check:rls` is an operational check, not a gate — it needs a reachable backend,
so it is expected to fail offline. Run it after a deploy or a cloud schema change.

### Running the gates on Windows
`npm test` goes through `scripts/run-vitest.mjs`, which normalises the drive letter
before Vitest starts. This matters: `process.cwd()` is `C:\...` from PowerShell and cmd
but `c:\...` from Git Bash, and Vite treats those as two different modules — the whole
suite then fails to collect with
`Cannot read properties of undefined (reading 'config')` even though nothing is wrong.

So: run the suite with `npm test`. Calling `npx vitest run` directly bypasses the
launcher and will fail from a Git Bash shell. `src/tests/unit/test-runner-cwd.test.ts`
guards this.

### Dependency policy
Do not add a runtime dependency without asking. Everything needed is already installed.
Build-only tools belong in `devDependencies`. Prefer a small local helper over a package.

## Critical rules (NEVER break)
1. WCAG AA contrast ≥ 4.5:1 for text; pair every color-coded state with an icon.
2. Colors come from `src/styles/tokens.css` only. Hard-coded hex breaks dark mode silently.
3. Dutch quotes and UI copy: formal Dutch only (`u`/`uw`), never `je`/`jij`.
4. ASCII digits only in source. Arabic-Indic digits (٠-٩) fail `npm run check:digits`.
5. RTL + mobile-first. Directional icons must flip — see the `rtl-icon-check` skill.
6. Never call `Date.now()` during React render — use `useNow()`.
7. Never commit secrets. Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
   `VITE_PIXABAY_API_KEY` are public by design.
8. New store fields that must sync need the full pattern — see the `add-synced-field` skill.
9. After any change: run **every** gate in "Definition of done" above — not just three of them.

## Working style (keeps sessions fast and accurate)
- Read only the files you need. Never open `node_modules/`, `dist/`, `.git/`, `public/exams/`, `package-lock.json`.
- Prefer targeted search over reading whole files; `src/data/themas.ts` alone is 1300 lines.
- Some existing files are large (`Exercises.tsx` ~800 lines, `useAppStore.ts` ~700). Do **not** refactor or split them unless explicitly asked. New components: aim under ~200 lines.
- One task per session. Run `/clear` between unrelated tasks — a long session makes answers slower and less accurate.
- Check `.claude/skills/` first: there are 22 project skills covering most recurring tasks (16 written for this app, 6 from ECC).

## ECC layer (curated subset)
A hand-picked subset of the ECC agent system is installed. What, why, and what was left out:
`.claude/ecc/README.md`
- Agents in `.claude/agents/` (10: planner, code/React/TypeScript/security reviewers, tdd-guide,
  build fixers, a11y, silent-failure-hunter). They cost a separate run: use one only when the owner asks.
- Skills: `react-patterns` `react-testing` `vite-patterns` `accessibility` `tdd-workflow` `verification-loop`.
- Rules in `.claude/rules/ecc/` load on their own when matching files are touched.
- No ECC hooks, on purpose (cost and speed).
- ECC is generic. **On any conflict this file wins**: no Next.js or server components; do not run
  Prettier (installed, but no config or script, so it would rewrite whole files); no new dependency
  (Zod, Playwright, MSW, axe …) without asking; never split the large files; never delete
  `package-lock.json`; the Definition of done gates replace ECC's 80% coverage and `npx tsc` checks.

## Do not change these without being asked
- `src/styles/tokens.css` — contrast ratios are calculated and enforced by
  `src/tests/unit/token-contrast.test.ts`. Editing a colour means re-running that test.
- `src/store/migration.ts` and the `_v` version — a mistake here loses real user data.
- The large files named above. Splitting them is not a refactor to slip into another task.
- `vite.config.ts` chunking — the current setup is the result of a measurement recorded
  in the file's own comment.

## When a screenshot is sent
1. Describe the visual problem precisely.
2. Propose the fix and wait for agreement before editing.
3. Ask if anything is ambiguous.
4. Only then implement, then verify with the commands above.
