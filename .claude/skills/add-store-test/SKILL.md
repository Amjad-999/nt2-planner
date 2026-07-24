---
name: add-store-test
description: Use this skill whenever writing a new unit test that touches the Zustand store (useAppStore) in NT2 Planner — trigger on "add a test for the store", "test this action", or "write a regression test for X". Store tests need a specific isolation pattern or they leak state between test cases.
---

# Add a store regression test

Store unit tests live in `src/tests/unit/*.test.ts` (vitest + jsdom). Because `useAppStore` persists to `localStorage` and the module has top-level state, tests need to reset both the module registry and storage before each run, or state leaks across test files and causes flaky failures that are hard to reproduce.

## The `freshStore()` pattern

This pattern currently appears copy-pasted independently in at least three files (`exam-record.test.ts`, `persist-rehydrate.test.ts`, `inburgering.test.ts`) — replicate the same shape rather than inventing a variant:

```ts
async function freshStore() {
  vi.resetModules();
  localStorage.clear();
  const mod = await import('@/store/useAppStore');
  return mod.useAppStore;
}
```

Call this at the start of each test (or in a `beforeEach`) that needs a clean store, then drive the returned store's actions/state directly.

## Where to put the test

- Pure logic / store behavior → `src/tests/unit/*.test.ts` using `freshStore()`.
- Component rendering / user interaction → `src/tests/smoke/*.test.tsx` using `@testing-library/react` — these generally don't need `freshStore()` unless they exercise store-dependent components in isolation.

## Note

Because this pattern is duplicated rather than shared, if you're adding a fourth or fifth copy, consider whether it's worth proposing a shared test helper — but don't do that unprompted as part of an unrelated test addition; flag it separately.
