---
name: rtl-icon-check
description: Use this skill whenever adding a directional icon (arrow, chevron, external-link, back/forward, undo/redo) to NT2 Planner's UI. The app is Arabic-RTL and directional icons that aren't explicitly flipped point the visually wrong way in RTL layout — this is currently documented only in a CSS comment, easy to miss.
---

# RTL directional icon check

NT2 Planner sets `direction: rtl` globally (`src/styles/globals.css`). Icons that convey direction — arrows, chevrons, external-link glyphs, back/forward controls — are drawn LTR by default in most icon sets and need an explicit flip in RTL mode or they point backwards relative to the reading direction.

## What to do

Add the `.icon-flip-rtl` utility class to any new directional icon:

```css
[dir="rtl"] .icon-flip-rtl { transform: scaleX(-1); }
```

Non-directional icons (checkmarks, stars, badges, most UI glyphs) do **not** need this — only apply it to icons where left/right conveys meaning (e.g. "next" vs "back", "expand outward").

## Also check while you're touching UI text

Any new string literal is a place where Arabic-Indic digits (٠-٩) can accidentally slip in instead of ASCII digits — this repo's `npm run check:digits` will fail the build over it. See `check-before-pr` for the full pre-PR gate.
