#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# بيئة تحقق للمساعد فقط — لا تشغّلها على جهازك.
#
# Assistant-only verification harness (Linux sandbox).
#
# Why: node_modules in the mounted project is built for Windows, so the
# assistant cannot run the test suite against it. This script mirrors the
# source into a throwaway Linux workspace that uses cached Linux dependencies,
# then runs the requested quality gates.
#
# The user's folder is never written to. public/exams/ is never copied.
#
# Usage (inside the sandbox):
#   bash scripts/verify-sandbox.sh static     # typecheck + lint + digits + build
#   bash scripts/verify-sandbox.sh test       # test suite only (~42 s on its own)
#   bash scripts/verify-sandbox.sh test1      # first half of the suite
#   bash scripts/verify-sandbox.sh test2      # second half of the suite
#   bash scripts/verify-sandbox.sh sync       # validate source mirroring only
#   bash scripts/verify-sandbox.sh exams      # referenced exam files only
#   bash scripts/verify-sandbox.sh all        # every gate (may exceed a 45 s call)
#
# The sandbox caps a single command at 45 s and the suite alone needs ~42 s,
# so run "static" and "test" as two separate calls. Both must pass.
# ---------------------------------------------------------------------------
set -euo pipefail

die() {
  printf '\033[31mERROR\033[0m  %s\n' "$*" >&2
  exit 1
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SOURCE_INPUT="${NT2_SRC:-$SCRIPT_DIR/..}"
[ -d "$SOURCE_INPUT" ] || die "source directory not found: $SOURCE_INPUT"
SRC="$(cd -- "$SOURCE_INPUT" && pwd -P)"
VERIFY_ROOT="${NT2_VERIFY_DIR:-${TMPDIR:-/tmp}/nt2-verify}"
MODE="${1:-static}"

case "$MODE" in
  sync|test|test1|test2|build|static|exams|all) ;;
  *) printf 'unknown mode: %s\n' "$MODE" >&2; exit 2 ;;
esac

for command_name in rsync node npm mktemp sha256sum awk sed tail du cut cp mkdir rm ln; do
  command -v "$command_name" >/dev/null 2>&1 || die "required command not found: $command_name"
done

[ -f "$SRC/package.json" ] || die "source does not contain package.json: $SRC"
[ -f "$SRC/package-lock.json" ] || die "source does not contain package-lock.json: $SRC"
[ -d "$SRC/src" ] || die "source does not contain src/: $SRC"
[ -d "$SRC/scripts" ] || die "source does not contain scripts/: $SRC"

mkdir -p "$VERIFY_ROOT/runs" "$VERIFY_ROOT/dependencies"
RUN_DIR="$(mktemp -d "$VERIFY_ROOT/runs/run.XXXXXX")"
DST="$RUN_DIR/project"
LOG_FILE="$RUN_DIR/gate.log"
DEPS_DIR="$VERIFY_ROOT/dependencies"

cleanup() {
  [ -n "${RUN_DIR:-}" ] && [ -d "$RUN_DIR" ] && rm -rf -- "$RUN_DIR"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

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
  if "$@" > "$LOG_FILE" 2>&1; then
    printf '\033[32mPASS\033[0m  %s\n' "$name"
    tail -n "${GATE_TAIL:-3}" "$LOG_FILE" | sed 's/\x1b\[[0-9;]*m//g'
  else
    printf '\033[31mFAIL\033[0m  %s\n' "$name"
    tail -n 40 "$LOG_FILE" | sed 's/\x1b\[[0-9;]*m//g'
    fail=1
  fi
}

# --- sync -------------------------------------------------------------------
sync_sources() {
  step "sync sources -> $DST"
  mkdir -p "$DST/public"
  rsync -a --delete "$SRC/src/" "$DST/src/"
  rsync -a --delete "$SRC/scripts/" "$DST/scripts/"
  [ ! -d "$SRC/supabase" ] || rsync -a --delete "$SRC/supabase/" "$DST/supabase/"
  # public without the ~300 MB exams folder
  rsync -a --delete --exclude 'exams/' "$SRC/public/" "$DST/public/"
  for f in "${CONFIGS[@]}"; do
    [ -f "$SRC/$f" ] || die "required config not found: $f"
    cp "$SRC/$f" "$DST/$f"
  done
  [ -f "$DST/src/main.tsx" ] || die "source sync is incomplete: src/main.tsx is missing"
  echo "synced: $(du -sh "$DST/src" | cut -f1) of source"
}

install_deps() {
  local deps_hash recorded_hash=""
  deps_hash="$(sha256sum "$SRC/package.json" "$SRC/package-lock.json" | sha256sum | awk '{print $1}')"
  [ -f "$DEPS_DIR/.source-hash" ] && recorded_hash="$(<"$DEPS_DIR/.source-hash")"

  if [ "$deps_hash" != "$recorded_hash" ] || [ ! -x "$DEPS_DIR/node_modules/.bin/tsc" ]; then
    step "install dependencies"
    cp "$SRC/package.json" "$DEPS_DIR/package.json"
    cp "$SRC/package-lock.json" "$DEPS_DIR/package-lock.json"
    (cd "$DEPS_DIR" && npm ci --no-audit --no-fund --prefer-offline)
    printf '%s\n' "$deps_hash" > "$DEPS_DIR/.source-hash"
  fi

  ln -s "$DEPS_DIR/node_modules" "$DST/node_modules"
}

check_exams() {
  (cd "$SRC" && node scripts/check-exams.mjs)
}

sync_sources

if [ "$MODE" = "sync" ]; then
  step "result"
  printf '\033[32mSOURCE SYNC PASSED\033[0m\n'
  exit 0
fi

if [ "$MODE" = "exams" ]; then
  gate "check:exams" check_exams
else
  install_deps
  cd "$DST"
fi

case "$MODE" in
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
    gate "check:exams" check_exams
    ;;
  exams) ;;
esac

step "result"
if [ "$fail" -eq 0 ]; then
  printf '\033[32mALL GATES PASSED\033[0m\n'
else
  printf '\033[31mSOME GATES FAILED\033[0m\n'
fi
exit "$fail"
