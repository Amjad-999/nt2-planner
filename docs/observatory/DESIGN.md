# Living Language Observatory — design package

The daily-learning layer of NT2 Planner: four workspaces (Today, Practice, Words,
My Learning) plus Settings, built into the existing Vite + React app without
removing any of its ten original tools.

Status legend used throughout: **Implemented** (in the code, verified),
**Simulated** (works, but is scripted or rule-based rather than intelligent),
**Proposed** (designed, not built).

---

## 1. Direction

**One idea:** the learner is an observer charting language in the real world.
Editorial type and generous paper planes carry the reading; a dark "night" plane
carries the moments that orient (Today's hero, the speaking stage, the recall
call-to-action). Words become tactile satin tokens that sit in small
*constellations* — lines that join a word to the situations where it can be used.

| Quality | How it shows up |
|---|---|
| Fresh | warm paper `#F5F3EB` page, cobalt/mint/lime light, no chrome or heavy glass |
| Intelligent | mono Dutch metadata (`WO 23 SEP · SESSIE 04 · ≈ 27 MIN`), evidence instead of scores |
| Dimensional | satin tokens with a real edge, shallow lesson layers, a speaking lens |
| Calm | every motion settles and stops; nothing loops |
| Adult | no mascots in the new layer, no streak shaming, no invented percentages |

Arabic stays the voice of the interface (Tajawal 800 for display), Dutch is the
material (Fraunces for display, Inter for text), always wrapped in
`lang="nl" dir="ltr"` so mixed lines render correctly.

## 2. Information architecture

```
                         ┌──────────── المزيد (dialog) ────────────┐
 اليوم  تدريب  كلماتي  تعلّمي │ الإعدادات · محاكاة الامتحان · تمارين · قواعد │
   │      │      │      │   │ لوحة التحكم · خطة الكتب · التحليلات          │
   │      │      │      │   │ المفردات+AI · الكتب · مصادر DUO · منصّتي     │
   │      │      │      │   └──────────────────────────────────────────┘
 Today  Practice Words  My Learning           Settings (also the ⚙ in the top bar)
   │
   └─▶ Lesson (focused mode inside Today; not a tab)
```

* Desktop/tablet: a sticky row under the top bar. Phones (<768 px): a bottom bar
  (safe-area aware) that steps aside during a lesson.
* Nothing was removed: every original section is one tap further, and each
  workspace links to the tools that belong to it (Practice → exam simulator and
  exercises; Words → flash-card vocabulary; My Learning → book plan, stats, grammar).
* The app now opens on **Today** (`?tab=` deep links still work).

### Primary flow

```
Today ──start/resume──▶ Lesson
  1 Listen/Read ─▶ 2 Questions (×3, one at a time, help ladder)
  ─▶ 3 Words (×2–4: open · recall · own sentence · save)
  ─▶ 4 Build sentences (×2) ─▶ 5 Retell (speak or type)
  ─▶ 6 Recall (×2 earlier items) ─▶ 7 Review ──finish──▶ Today (done)
                                                   └──▶ one optional role-play
Leave at any point: position, answers and unsent drafts are kept.
```

The four daily questions are answered on Today: **what** (hero title + Dutch
line + constellation), **next** (the single lime action and its label),
**help** (the three-rung ladder card), **evidence** (counts of actual work).

## 3. Tokens (`src/styles/tokens.css`)

All values live in tokens; a test fails the suite if a colour literal appears in
`src/components/obs` or `src/features/observatory`.

### Colour — semantic roles

| Token | Light | Dark | Role |
|---|---|---|---|
| `--o-page` | `#ECE9DF` | `#0C1319` | page |
| `--o-paper` / `-2` | `#F5F3EB` / `#FBFAF6` | `#17232B` / `#1E2C36` | reading + answering planes / raised inputs |
| `--o-night` | `#101820` | `#101820` | structural dark plane |
| `--o-ink` / `-2` / `--o-muted` | `#101820` / `#2E3A42` / `#56625F` | `#F5F3EB` / `#C9CFC9` / `#9DABA9` | text |
| `--o-cobalt` · `-ink` · `-wash` | `#6D8AFF` · `#3149C4` · `#DFE4FA` | `#6D8AFF` · `#9DB0FF` · `#1F2B52` | learning / selection / focus (light) |
| `--o-mint` · `-ink` · `-wash` | `#7CE1BB` · `#17684A` · `#D5F1E4` | … `#7CE1BB` · `#143A32` | correct / saved / done |
| `--o-lime` · `--o-on-lime` | `#D7FF72` · `#101820` | same | **primary action only** (focus ring in dark) |
| `--o-coral` · `-ink` | `#D58A65` · `#94472A` | … `#E7A98A` | own production ("use it yourself") |
| `--o-warn` · `-ink` | `#FFD081` · `#7A5000` | … `#FFD081` | close / caution |
| `--o-error` · `-ink` | `#FF8B8B` · `#B02A2A` | … `#FF9B9B` | wrong / failure |

Measured contrast (enforced by `observatory-tokens.test.ts`, light and dark):
all ink tokens ≥ 4.5:1 on page and paper planes; each semantic ink ≥ 4.5:1 on
its own wash; night-plane text ≥ 4.5:1 on all night planes; token text ≥ 4.5:1
on every satin gradient stop; input boundaries and focus ≥ 3:1. Lime is never
text on paper; the lime button carries an olive edge and obsidian label.

**Skin.** `data-skin="observatory"` (default) remaps the legacy tokens so the
ten older sections share the palette; «الكلاسيكية البرتقالية» in Settings
restores the original burnt-orange look. The skin blocks are contrast-tested
with the same matrix as the classic palette.

### Type

| Use | Face | Size / weight |
|---|---|---|
| Arabic display | Tajawal 800 (OFL, already bundled) | `clamp(2.1rem, 5.4vw, 3.6rem)`, lh 1.12 |
| Dutch display | Fraunces Variable (OFL) | wght 560, opsz 72, often italic |
| Interface | Tajawal (Arabic) · Inter (Dutch) | body 1rem; reading passages 1.125rem, lh 1.8, 62ch |
| Metadata | IBM Plex Mono 400/500 (OFL) | 0.75rem, +0.06em, uppercase, always LTR |

All sizes are `rem`, so the existing A−/A+ setting scales the whole layer.

### Space · radius · elevation · materials · focus

* Spacing 4-px base: `--o-s1…s8` = 4, 8, 12, 16, 24, 32, 48, 64.
* Radius: 8 · 12 · 18 · 26 · 34 · pill.
* Elevation: three soft, obsidian-tinted layered shadows + a token drop shadow.
* Materials: `--o-satin` (paper token), `--o-satin-cobalt/-mint/-lime` with
  matching `-edge` colours for thickness, `--o-frost` details on night planes,
  atmospheric glows (`--o-glow-*`). No chrome, no heavy blur on reading planes.
* Focus: 3 px ring (`--o-focus`: cobalt ink in light, lime in dark) + 6 px halo.

## 4. Components (`src/components/obs/`)

| Component | Notes |
|---|---|
| `Button` (primary · secondary · ghost · night · danger) | 48 px min height; primary = lime satin key with a tactile edge |
| `Chip`, `StageBadge` | colour always paired with an icon and words |
| `Notice`, `Feedback` | info/success/warn/error/offline; feedback right/close/wrong/info |
| `WorkspaceHead` | mono kicker · Arabic display title · Dutch italic line · lede |
| `WordToken` | 3D satin word object; interactive tokens morph (layoutId) into their detail |
| `Constellation` | SVG links + HTML word nodes; compact variant for phones; accessible caption |
| `LessonLayers` | seven shallow planes; finished ones reopen read-only |
| `SpeakingObject` + `VoiceRecorder` | satin lens driven by the real analyser level; all voice states |
| `Sheet` | modal bottom sheet / side drawer / centred panel with focus trap and return |
| `TileBuilder` | tap-to-order sentence tiles (no dragging), undo + clear |
| `StatusStrip` | offline and failed-save notices, shown only when true |
| `RecordingPlayer` | plays a saved take, or says it is not on this device |

## 5. Motion specification

Reference: After Effects choreography (staggered layers, easy-ease, depth
settle), delivered with transform/opacity only (framer-motion + CSS), so every
sequence is interruptible. Levels: **Reduced · Standard · Expressive**
(+ "follow system"). The OS reduce-motion preference always wins; «مخفّفة»
applies app-wide, old sections included.

| Interaction | Motion | Trigger | Standard | Expressive | Reduced | Purpose |
|---|---|---|---|---|---|---|
| Enter Today | layers stagger in, y 14→0, scale .985→1 | mount | 450 ms, 50 ms stagger, expo-out | 560 ms, 70 ms, travel 22 px | fade ≤120 ms, no stagger | hierarchy |
| Constellation | links draw, nodes settle | mount | 700 ms draw, 40–480 ms delays | same | drawn, static | connect word ↔ situation |
| Resume lesson | shared element: Today "next" card → activity plane (`layoutId`) | tap | 450 ms tween, expo-out | 560 ms | no morph (instant) | continuity |
| Open a word | token → detail (`layoutId`) | tap | 280 ms | 350 ms | instant | item ↔ detail |
| Show a hint | rung reveals beside the question | tap | 280 ms, y −8→0 | 350 ms | fade | keep context |
| Submit answer | feedback panel fades/settles; options stay put | submit | 280 ms | 350 ms | fade | legible result |
| Complete activity | plane settles back (y −8, scale .97), next rises (y 20→0) | tap | exit 280 ms, enter 450 ms | 350 / 560 | fades ≤120 ms | progression |
| Enter speaking mode | orb + controls replace the choice; rings follow real level | tap | per frame (rAF), no easing on data | same | rings static; timer + dot | mode change |
| Finish session | word objects assemble, rotateX 30→0, y 26→0 | review | 550 ms, 60 ms stagger (≤700 ms total) | same | fade | summarise |
| Control feedback | lift/press on buttons and tiles | hover/press | 150 ms ease-out | same | none | affordance |

Rules: reading passages, subtitles and answer fields never move while in use;
repeated taps cannot stack sequences (`AnimatePresence mode="wait"`, disabled
submit after a check); nothing rotates continuously; rendering loops run only
while recording or playing and stop on hidden tabs (rAF).

## 6. 3D asset and material system

All 3D is CSS/SVG (no WebGL): light, crisp text, and it degrades to a flat but
attractive object.

| Object | Construction | States | Static fallback |
|---|---|---|---|
| Word token | satin gradient face, 6 px edge shadow = thickness, specular sweep, `perspective(700px) rotateX(10°) rotateY(−8°)` | rest · hover/focus lift (flattens) · pressed · saved (mint) · centre (cobalt) | same object, no tilt |
| Lesson layers | 7 planes, `rotateX(22–28°)` for done/upcoming, current flat and raised (translateZ 24 px) | done (mint, reopenable) · current · next · upcoming | flat pills |
| Context constellation | SVG quadratic links (non-scaling stroke) + token nodes; contexts as mono chips | drawn on enter, then still | fully drawn |
| Speaking object | radial-lit satin lens + two rings scaled by `--level` from the analyser | ready (cobalt) · requesting (3 soft pulses) · recording (lime) · recorded (mint) · playing · denied/error (desaturated) | rings fixed; state in text + timer |

One light direction (top-left), one shadow language, four satin materials.

## 7. Learning model (evidence, not scores)

* **Stages:** شوهِد Seen → تدرّب عليه Practised → استُخدم باستقلال Used
  independently → نشِط Active. Opening, watching or saving never counts.
* **Active rule (editable):** ≥ 3 independent uses, in ≥ 2 contexts, on ≥ 2 days.
* **Independent** = a learner sentence that contains the expression (split verbs
  handled), is a real sentence, and is not a copy of anything on screen
  (compared sentence by sentence). Recall right after seeing = practised.
* **Self-report** («استخدمتها خارج التطبيق») is stored separately and counts
  only if the learner enables it in the rule.
* **Time:** planned minutes (estimate) and measured minutes (only while the
  lesson is visible and the learner is active) are always shown side by side;
  after three sessions the estimate is calibrated by the learner's own median.
* **Observations** appear only for difficulties recorded at least twice, and
  each links to a concrete activity (drill, role-play, recall, new session).

## 8. State coverage

| State | Where | Status |
|---|---|---|
| First use, no history | Today hero «لنبدأ من موقف حقيقي», honest empty evidence | Implemented |
| Session in progress | Today «تابِع من حيث توقفت» + next step label | Implemented |
| Interrupted on an earlier day | «جلسة الاثنين ما زالت محفوظة» — continue, or start today's and park it | Implemented |
| Completed session | Today «أنجزت جلسة اليوم», facts, one optional role-play | Implemented |
| Wrong / close answer | per-option why; second try; typo = "close, counted" with spelling | Implemented |
| Help opened | three rungs, never the answer | Implemented |
| Missing content | «محتوى هذه الجلسة لم يعد متاحًا» + start new; parked runs removable | Implemented |
| Microphone denied / unsupported | instructions + typed alternative | Implemented |
| Speech unavailable | notice, transcript revealed automatically | Implemented |
| Failed saving | alert with retry and «نزّل نسخة احتياطية الآن» | Implemented |
| Offline | notice; everything local keeps working (PWA) | Implemented |
| Empty search | «لا نتائج لـ…» + clear filters | Implemented |
| Invalid import | rejected with a specific reason, data untouched; valid import previewed, undoable | Implemented |

## 9. Implemented · simulated · proposed

**Implemented:** all workspaces and states above; persistence in the existing
store (localStorage + IndexedDB + optional cloud sync, with a merge that never
drops evidence); recordings in a device-only IndexedDB store; validated JSON
backup/restore with undo; motion levels; skins; keyboard and screen-reader
paths; responsive layouts 360–1440.

**Simulated (honestly labelled in the UI):**
* Role-play partner — scripted lines in a fixed order; it does not understand
  replies. Language review = five conservative rules + a model answer.
* Listening — generated speech (online Google TTS, then the device voice).
* Retell of a recording — self-assessment checklist; typed retell = keyword check.
* Lesson texts — original practice texts with fictional places and people.

**Proposed (not built):**
* Speech recognition / pronunciation assessment (the app has a browser speech
  API elsewhere; not connected here on purpose until it can be verified).
* Real video items; more lesson items (4 today) and role-plays (5 today).
* Interface in Dutch/English (the setting exists; only Arabic is available).
* Feeding recall results into the legacy FSRS vocabulary schedule.
* An adaptive partner (LLM) for role-plays, with the same review contract.

## 10. Verification (actual results)

| Check | Result |
|---|---|
| `tsc -b`, `eslint .`, `check:digits`, `vite build` (mirror harness) | pass |
| Vitest suite | 43 files / 537 tests pass (baseline 39 / 477; +3 unit files, +1 smoke file, 60 new tests) |
| Contrast matrix (classic + observatory, light + dark) | pass |
| Central journey in Chromium (Playwright), 1440 and 360 px | Today → resume → wrong answer → help → feedback → save expression → practise → build → retell → recall → finish → reload shows «أنجزت جلسة اليوم»; 0 console errors |
| Persistence | mid-lesson reload keeps position, answers and the unsent choice; parked session keeps its draft; recordings survive reload |
| Keyboard | 15/15 checks: skip link, tab order to the primary action, More dialog trap + Escape + focus return, focus moves to each new step, arrows + Enter answer, sheet focus return, bottom bar hides in lesson |
| Edge states | offline, speech unavailable, failed save, mic denied, recording (real analyser level), missing content, earlier day, invalid + valid import with undo — all behave as specified |
| Reduced motion | 0 running animations > 50 ms after load |
| No horizontal overflow | 30 screens × (360, 768, 1024 px), incl. old sections: pass |
| `check:exams` | not run: no exam files were touched (and `public/exams/` is not in this checkout) |
| Performance (production build, headless Chromium, software GL) | unthrottled: Today→Lesson, step change, submit — p95 frame 16.8 ms, no long tasks; 4× CPU throttle @390 px: p95 16.8 ms, one 71–83 ms long task when a new step mounts |
| Bundle | boot JS +3.7 KB (+1.2 KB gzip); boot CSS +3.3 KB gzip; workspace styles (34 KB) and content load lazily; PWA precache +24 entries (+410 KB, mostly new font subsets) |

### Known limitations

* The mount of a new lesson step costs one 70–80 ms task on a 4× throttled CPU.
* Headless measurements use software rendering; real-device profiling is still
  worth doing on a low-end Android phone.
* Content is small (4 items, 5 role-plays): enough for the loop, not for weeks.
* The old sections take the new palette through tokens but keep their own
  layouts and emoji-led style.
* A pre-existing issue in the old Dashboard (a card drawn above the exam-date
  dialog) is unchanged by this work.

## 11. Where things live

```
src/features/observatory/   types, state (sanitize/merge), session, evaluate, checks,
                            evidence, insights, roleplay, backup, motion, speech,
                            recordings, useRecorder, intent, format
src/data/observatory/       items.ts (lesson content), roleplays.ts, demo.ts
src/components/obs/         design-system components, today/, lesson/, practice/,
                            words/, learning/, settings/, obs.css, icons.tsx
src/sections/               Today, Practice, Words, Learning, LearnSettings
src/styles/tokens.css       --o-* tokens + data-skin="observatory"
src/tests/unit/observatory-*.test.ts, src/tests/smoke/observatory-flow.test.tsx
```

Owner's update note: after pulling, run `npm install` once — two font packages
were added (`@fontsource-variable/fraunces`, `@fontsource/ibm-plex-mono`).
