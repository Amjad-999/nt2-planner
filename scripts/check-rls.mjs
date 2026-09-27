#!/usr/bin/env node
/**
 * Verifies that row-level security really is protecting the synced state.
 *
 * Why this exists: the anon key is public by design and committed to this
 * repository. Everything that keeps one user's data private is the RLS policy
 * set in supabase/migrations/. Nothing used to confirm that those policies were
 * actually applied to the live project — and a missing policy fails silently,
 * with the app working perfectly either way.
 *
 * The probe is deliberately the same one an attacker would run first: ask the
 * table for rows using nothing but the public key, with no user signed in.
 *
 *   PASS  the request is rejected, or returns an empty list
 *   FAIL  any row comes back — RLS is off or a policy is wrong
 *
 * Read-only, uses only credentials that already ship in the browser bundle.
 *
 * Usage: npm run check:rls
 * Skips (exit 0) when no backend is configured, so it is safe in a pipeline
 * that has no secrets.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const OFF = '\x1b[0m'

/** Minimal .env reader — avoids adding a dependency for two variables. */
function readEnvFile(name) {
  const file = resolve(root, name)
  if (!existsSync(file)) return {}
  const out = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const fileEnv = { ...readEnvFile('.env.production'), ...readEnvFile('.env') }
const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.log(`${YELLOW}- check:rls skipped — no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY found.${OFF}`)
  process.exit(0)
}

const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/nt2_state?select=user_id&limit=5`

const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 15000)

try {
  const res = await fetch(endpoint, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    signal: controller.signal,
  })

  // Rejected outright: RLS (or the API gateway) refused an anonymous caller.
  if (res.status === 401 || res.status === 403) {
    console.log(`${GREEN}✔ RLS active — anonymous read rejected (${res.status}).${OFF}`)
    process.exit(0)
  }

  if (!res.ok) {
    console.error(`${RED}✖ Unexpected response ${res.status} from nt2_state.${OFF}`)
    console.error('  Could not determine whether RLS is protecting the table.')
    process.exit(1)
  }

  const rows = await res.json()
  if (Array.isArray(rows) && rows.length === 0) {
    console.log(`${GREEN}✔ RLS active — anonymous read returned no rows.${OFF}`)
    process.exit(0)
  }

  console.error(`${RED}✖ SECURITY: anonymous read returned ${Array.isArray(rows) ? rows.length : '?'} row(s).${OFF}`)
  console.error('  Every user\'s synced data is readable with the public key.')
  console.error('  Apply supabase/migrations/20260907000000_nt2_state.sql to the project.')
  process.exit(1)
} catch (err) {
  const reason = err?.name === 'AbortError' ? 'timed out' : err?.message ?? String(err)
  console.error(`${RED}✖ Could not reach the backend to verify RLS (${reason}).${OFF}`)
  process.exit(1)
} finally {
  clearTimeout(timer)
}
