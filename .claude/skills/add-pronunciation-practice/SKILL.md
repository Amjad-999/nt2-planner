---
name: add-pronunciation-practice
description: Use this skill whenever adding speaking, pronunciation, or "say this word/sentence" practice to any part of NT2 Planner — trigger on "add speaking practice to X", "let users record themselves", or "check pronunciation". There's a ready-made, reusable component for this already used in two unrelated places — drop it in rather than building recording/scoring logic from scratch.
---

# Add pronunciation practice to a feature

`src/components/SpeakAndCheck.tsx` is a **drop-in pronunciation-practice component** built on `react-speech-recognition`. It's already proven portable — it's independently used in `WordCard.tsx` (vocab review) and `Exam.tsx` (speaking exam simulation), two otherwise unrelated features.

## How to add it to a new feature

1. Import and render `SpeakAndCheck` wherever you want a "say this" moment, passing it the target Dutch text to match against.
2. Scoring is handled for you by `src/features/speaking/similarity.ts` — `speakScore()` blends 60% token-Jaccard + 40% Levenshtein edit-distance similarity into a 0-100 score, and `scoreLabel()` maps that score to Arabic feedback text + a color.
3. Audio playback of the target pronunciation goes through the TTS layer (`src/features/tts/`): `speakDutch.ts` does a 3-tier fallback (online Google Translate TTS → browser SpeechSynthesis → both), with `voices.ts` picking the best installed Dutch voice and `audioQueue.ts` chunking long text.
4. `SpeakAndCheck` already handles the unhappy paths — unsupported browser, no microphone, offline — with Arabic error copy. Don't re-implement those checks; if a new context needs different error messaging, extend the component's existing state handling rather than duplicating it.
5. It also already respects `useReducedMotion` for its feedback animation — no extra work needed there.

## When NOT to build a new recording UI

If a feature needs "user says a Dutch word/phrase and gets feedback," that's this component, full stop — don't reach for `react-speech-recognition` directly in a new file unless the interaction is genuinely different (e.g. free-form conversation practice rather than match-a-target).
