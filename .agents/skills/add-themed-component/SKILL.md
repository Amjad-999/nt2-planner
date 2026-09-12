---
name: add-themed-component
description: Use this skill whenever building or styling a new UI component in NT2 Planner — trigger on "add a new card/panel/modal/button style", "style this component", or anything involving colors, glassmorphism, or light/dark mode. This app supports light and dark themes via a single tokens file; hardcoding colors breaks dark mode silently and is the single most common styling mistake to avoid here.
---

# Add a themed component

All color, elevation, and radius values live in `src/styles/tokens.css` as CSS custom properties, defined twice: once under `:root` (light) and once under `:root[data-theme="dark"]` (dark). Glassmorphism-specific tokens (`--glass-bg`, `--glass-border`, `--btn-bg`, `--modal-bg`) and elevation shadows (`--elev-1/2/3`) follow the same pattern.

## Rules

1. **Never hardcode a color, shadow, or radius value.** Use the existing `var(--token-name)` custom properties. If the exact token you need doesn't exist yet, add it to `tokens.css` in **both** the light and dark blocks in the same change — never add a light-mode-only value and leave dark mode to inherit something wrong by accident.
2. **Check contrast when adding or changing a color token.** Several tokens in `tokens.css` have inline comments citing the exact WCAG AA contrast ratio they were tuned to hit (e.g. near `--pass-text`) — this project went through a dedicated a11y-hardening pass specifically to fix low-contrast colors, so don't reintroduce that class of bug. Verify new text-on-background pairs hit at least 4.5:1 for normal text.
3. **Reuse existing glass/elevation tokens for new surfaces** (cards, modals, panels) rather than inventing new shadow/opacity values per component — visual consistency across the app depends on a small, shared token set.

## After styling

If the component includes any directional icon (arrow, external-link, chevron), see the `rtl-icon-check` skill — RTL layout needs those flipped explicitly.
