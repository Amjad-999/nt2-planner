#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# بيئة تحقق للمساعد فقط — لا تشغّلها على جهازك.
#
# Assistant-only verification harness (Linux sandbox).
#
# Why: node_modules in the mounted project is built for Windows, so the
# assistant cannot run the test suite against it. This script mirrors the
# source into a throwaway Linux workspace that has its own node_modules,
# then runs every quality gate defined in CLAUDE.md.
#
# The user's folder is never written to. public/exams/ is never copied.
#
# Usage (inside the sandbox):
#   bash scripts/verify-sandbox.sh static     # typecheck + lint + digits + build
#   bash scripts/verify-sandbox.sh test       # test suite only (~42 s on its own)
#   bash scripts/verify-sandbox.sh test1      # first half of the suite
#   bash scripts/verify-sandbox.sh test2      # second half of the suite
#   bash scripts/verify-sandbox.sh sync       # sync only
#   bash scripts/verify-sandbox.sh all        # everything (may exceed a 45 s call)
#
# The sandbox caps a single command at 45 s and the suite alone needs ~42 s,
# so run "static" and "test" as two separate calls. Both must pass.
# ---------------------------------------------------------------------------
set -uo pipefail

SRC="${NT2_SRC:-/sessions/awesome-compassionate-dirac/mnt/nt2-planner}"
DST="${NT2_VERIFY_DIR:-/tmp/nt2-verify}"
MODE="${1:-static}"

CONFIGS=(
  package.json package-lock.json
  tsconfig.json tsconfig.app.json tsconfig.node.json
  vite.config.ts vitest.config.ts
  eslint.config.js postcss.config.js tailwind.config.js
  index.html .env.example
)

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
fail=0
gate() { # gate <name> <cmd...>
  local name="$1"; shift
  step "$name"
  if "$@" > /tmp/nt2-gate.log 2>&1; then
    printf '\033[32mPASS\033[0m  %s\n' "$name"
    tail -n "${GATE_TAIL:-3}" /tmp/nt2-gate.log | sed 's/\x1b\[[0-9;]*m//g'
  else
    printf '\033[31mFAIL\033[0m  %s\n' "$name"
    tail -n 40 /tmp/nt2-gate.log | sed 's/\x1b\[[0-9;]*m//g'
    fail=1
  fi
}

# --- sync -------------------------------------------------------------------
sync_sources() {
  step "sync sources -> $DST"
  mkdir -p "$DST/public"
  rsync -a --delete "$SRC/src/" "$DST/src/"
  rsync -a --delete "$SRC/scripts/" "$DST/scripts/"
  # public without the ~300 MB exams folder
  rsync -a --delete --exclude 'exams/' "$SRC/public/" "$DST/public/"
  for f in "${CONFIGS[@]}"; do
    [ -f "$SRC/$f" ] && cp "$SRC/$f" "$DST/$f"
  done
  echo "synced: $(du -sh "$DST/src" | cut -f1) of source"
}

install_deps() {
  if [ ! -x "$DST/node_modules/.bin/tsc" ]; then
    step "install dependencies (first run, may need a few passes)"
    (cd "$DST" && npm install --no-audit --no-fund --prefer-offline)
  fi
}

sync_sources
install_deps
cd "$DST" || exit 1

case "$MODE" in
  sync)  exit 0 ;;
  test)  GATE_TAIL=4 gate "tests" ./node_modules/.bin/vitest run ;;
  # The full suite sits right on the 45 s ceiling, so it can be halved.
  test1) GATE_TAIL=4 gate "tests 1/2" ./node_modules/.bin/vitest run --shard=1/2 ;;
  test2) GATE_TAIL=4 gate "tests 2/2" ./node_modules/.bin/vitest run --shard=2/2 ;;
  build) GATE_TAIL=6 gate "build" ./node_modules/.bin/vite build ;;
  static)
    gate "typecheck"      ./node_modules/.bin/tsc -b
    gate "lint"           ./node_modules/.bin/eslint .
    gate "check:digits"   node scripts/check-digits.mjs
    GATE_TAIL=6 gate "build" ./node_modules/.bin/vite build
    ;;
  all)
    gate "typecheck"      ./node_modules/.bin/tsc -b
    gate "lint"           ./node_modules/.bin/eslint .
    gate "check:digits"   node scripts/check-digits.mjs
    GATE_TAIL=4 gate "tests" ./node_modules/.bin/vitest run
    GATE_TAIL=6 gate "build" ./node_modules/.bin/vite build
    ;;
  *) echo "unknown mode: $MODE"; exit 2 ;;
esac

step "result"
if [ "$fail" -eq 0 ]; then
  printf '\033[32mALL GATES PASSED\033[0m\n'
else
  printf '\033[31mSOME GATES FAILED\033[0m\n'
fi
exit "$fail"
