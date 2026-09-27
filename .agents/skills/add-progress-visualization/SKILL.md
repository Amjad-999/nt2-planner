---
name: add-progress-visualization
description: Use this skill whenever adding a chart, progress ring, sparkline, or any visual representation of user progress/stats to NT2 Planner — trigger on "show progress for X", "add a chart", "visualize this stat", or "add to the Stats page". Seeing progress visually is a proven motivator in learning apps, and this codebase already has a consistent charting pattern with memory-leak protection and reduced-motion handling — follow it rather than introducing a new charting library.
---

# Add a progress visualization

`src/sections/Stats.tsx` is the reference implementation for every kind of progress visualization already in this app: 6 Chart.js instances (area/line/bar/sparkline/horizontal-bar/multi-series trend), a hand-built SVG progress ring (`SkillRing`, stroke-dasharray driven by `useCountUp`), and a custom Chart.js plugin (`passLine`) that draws the 65% pass-threshold reference line.

## Use Chart.js, not a new library

This app standardized on `chart.js` + `react-chartjs-2` (dynamically imported, `registerables` registered lazily) — don't introduce recharts, visx, or another charting library for a new visualization; extend the existing Chart.js usage in `Stats.tsx` or mirror its pattern in a new component.

## Two things you must replicate or you'll introduce bugs

1. **Reduced-motion gating.** Chart animations in `Stats.tsx` check `prefers-reduced-motion` and disable/shorten animation accordingly — a new chart that skips this will animate for users who've explicitly asked not to see motion.
2. **Lifecycle cleanup.** Chart.js instances are tracked in a ref (`chartsRef`) and explicitly destroyed (`destroyCharts`) on unmount/re-render. Skipping this leaks memory and, worse, can leave stale chart instances rendering over new ones — a subtle bug that only shows up after navigating away and back a few times, not on first render.

## For non-chart visualizations

For a simple ring/gauge like `SkillRing`, hand-drawn SVG with `<circle>` `stroke-dasharray` driven by `useCountUp` (see `add-motion-microinteraction`) is the established pattern for lightweight progress indicators that don't need a full chart.

## Why this is worth prioritizing

Visualizing progress is one of the more reliable, low-cost motivators in a learning app — when adding a new trackable stat (see `add-synced-field`), consider whether it deserves a visual on the Stats page rather than staying a number buried in a settings panel.
