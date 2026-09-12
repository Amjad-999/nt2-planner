---
name: add-motion-microinteraction
description: Use this skill whenever adding hover effects, scroll-reveal animations, tilt/parallax, or any small UI motion to NT2 Planner — trigger on "add an animation", "make this feel more alive", "add a hover effect", or "this feels static". There are shared, accessibility-safe motion primitives already built — reuse them instead of writing new framer-motion or CSS keyframes from scratch, and never skip the reduced-motion handling.
---

# Add a motion micro-interaction

`src/components/MotionFx.tsx` exports shared framer-motion primitives — `Reveal` (scroll fade-up) and `Tilt` (3D pointer tilt with spring physics) — that already handle the accessibility escape hatch correctly. `src/hooks/useCountUp.ts` (RAF-based animated counter, eases with `easeOutCubic`) and ~15 CSS `@keyframes` in `src/styles/globals.css` (flame-flicker, ember-rise, blob-drift, staggered reveal, toast/skeleton/pulse-ok/shake) cover most common motion needs already.

## The core rule: hooks always run, only output branches

Every existing motion primitive in this app follows the same pattern: **the hook itself is always called** (never conditionally, which would violate React's rules of hooks), but what it *renders or animates* changes based on `useReducedMotion()` (`src/hooks/useReducedMotion.ts`). `celebrate.ts`, `MotionFx.tsx`, `useCountUp.ts`, `Stats.tsx`, and `SpeakAndCheck.tsx` all do this consistently — copy this shape for any new motion, don't invent a different one.

## Before writing new animation code

1. Check if `Reveal`, `Tilt`, `useCountUp`, or an existing keyframe in `globals.css` already covers what you need — this app's animation system is intentionally small and shared rather than per-component bespoke.
2. If you do need something new, gate it on `useReducedMotion()` from the start, not as an afterthought.
3. Keep timing in the 200–500ms range — shorter reads as a glitch, longer reads as sluggish and starts to annoy rather than delight. This app's existing transitions (toast, stagger reveal) sit in this range; match it.
4. Source colors from design tokens (`src/styles/tokens.css`), not hardcoded values — see `add-themed-component`.

## Why the reduced-motion discipline matters here specifically

This codebase went through a dedicated a11y-hardening pass (focus traps, contrast, landmark fixes) — motion that ignores `prefers-reduced-motion` would undo that work for motion-sensitive users, who are a meaningful fraction of any real user base.
