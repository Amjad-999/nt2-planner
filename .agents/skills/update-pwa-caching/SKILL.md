---
name: update-pwa-caching
description: Use this skill whenever adding a new external API domain, a new font source, or a new static asset type that the app fetches at runtime — trigger on "add a new API call", "use a new font", "fetch from a new service". NT2 Planner is a PWA with an offline-caching allowlist that must be updated manually or the new resource silently breaks offline / gets cached wrong.
---

# Update PWA runtime caching

`vite.config.ts` configures `VitePWA` with `registerType: 'autoUpdate'` and a Workbox `runtimeCaching` allowlist plus `globPatterns` for precached build assets. This allowlist is explicit per-domain — Workbox does not cache what it doesn't know about, so a new external dependency is invisible to it by default.

## When you must update this

- **New third-party API domain** — e.g. adding another translation/dictionary service alongside the existing Google Translate (NetworkOnly) and MyMemory (CacheFirst) entries. Add a matching `runtimeCaching` rule with a caching strategy appropriate to the data (translations that must be fresh → `NetworkOnly`; static lookups → `CacheFirst`; things that should update in the background but work offline meanwhile → `StaleWhileRevalidate`, as used for Google Fonts).
- **New font source or static asset type** — extend `globPatterns` so it gets precached in the service-worker install step, or it silently won't be available offline.

## Why this is easy to miss

The app works fine in dev and even in a first production load without this update — the failure only shows up offline or on a second load after the service worker takes over, which makes it a "silently breaks later" class of bug rather than something that fails immediately during development.

## After changing

Manually test with the network offline (or throttled) to confirm the new resource behaves as intended — this isn't covered by the automated test suite.
