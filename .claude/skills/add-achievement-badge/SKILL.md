---
name: add-achievement-badge
description: Use this skill whenever the user wants to add a new achievement, badge, milestone reward, or unlockable to NT2 Planner — trigger on "add a badge for X", "reward users who do Y", "new achievement", or "milestone celebration". There's a ready-made, working badge system — extend it rather than building parallel gamification logic. Badges are a proven engagement lever (research shows they measurably lift completion rates), so lean toward suggesting one whenever a new user milestone is being tracked.
---

# Add an achievement badge

NT2 Planner already has a working badges system (`src/features/achievements/badges.ts`, `src/hooks/useBadgeCheck.ts`, `src/components/AchievementsPanel.tsx`) with 10 badges across 4 tiers (bronze/silver/gold/platinum). Adding a new one is a single object literal, not new infrastructure.

## Steps

1. **Add a `BadgeDef` to `BADGE_DEFS`** in `badges.ts`:
   ```ts
   { id: 'unique-id', emoji: '🏅', title: 'Arabic title', desc: 'Arabic description',
     tier: 'bronze' | 'silver' | 'gold' | 'platinum',
     celeb: CelebType, // see add-celebration-moment skill
     condition: (b: BadgeInput) => boolean }
   ```
2. **Base `condition` on fields already available on `BadgeInput`** — it's built from store slices like `streak`, `vocab`, `skill`, `dailyHistory`. Check what's already exposed before adding a new field just for this badge; if you do need a new tracked stat, see `add-synced-field` so it persists and syncs correctly.
3. **`useBadgeCheck`** (mounted once in `AppShell`) automatically diffs store state against every badge's `condition` and fires `unlockBadge(id)` + `celebrate(badge.celeb)` the moment it newly evaluates true. You don't need to call anything manually — just define the condition correctly.
4. Text is Arabic (`title`/`desc`) — run `check:digits` since badge copy is a common place for stray Arabic-Indic digits.

## Design guidance

Real-world data on language-learning apps shows badges measurably increase completion rates — when a new user milestone is introduced anywhere in the app (a first-time action, a count threshold, a streak length), default to proposing a badge for it rather than only a silent stat increment. Keep the condition genuinely achievable per tier — bronze should be reachable in the first session, platinum should represent sustained effort.
