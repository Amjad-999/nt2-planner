#!/usr/bin/env node
/**
 * Launcher for the test suite.
 *
 * Why this exists — a Windows-only trap that is very expensive to diagnose:
 *
 * The drive letter reported by process.cwd() depends on the shell the command
 * was started from. PowerShell and cmd report "C:\...", Git Bash (and anything
 * launched from it) reports "c:\...". Vite keys its module graph by absolute
 * path and treats the two spellings as different modules, so the test file and
 * the test runner end up importing two separate copies of "vitest". The runner
 * context is then missing in the copy the test file sees, and EVERY file fails
 * to collect with:
 *
 *   TypeError: Cannot read properties of undefined (reading 'config')
 *
 * The whole suite appears broken while nothing is actually wrong with it.
 *
 * Neither the `root` option nor a chdir inside vitest.config.ts fixes this —
 * both are read after Vitest has already captured the working directory. The
 * normalisation has to happen before Vitest starts, which is what this file
 * does. It also lets `npm test` work from any subdirectory.
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'

/** Windows only: "c:\..." and "C:\..." must not both reach Vite. */
const normalize = (p) => (/^[a-z]:/.test(p) ? p[0].toUpperCase() + p.slice(1) : p)

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = normalize(path.resolve(here, '..'))

/* Built from the normalised root, not from import.meta.url: module resolution
   inherits the casing of whatever path it starts from, and a lowercase binary
   path re-creates the very duplication this script exists to prevent. */
const require = createRequire(pathToFileURL(path.join(projectRoot, 'package.json')).href)

function resolveVitestBin() {
  // Preferred: ask Node where the package really is, so a hoisted or nested
  // install both work.
  try {
    const pkgPath = require.resolve('vitest/package.json')
    const pkg = require('vitest/package.json')
    const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.vitest
    if (rel) {
      const bin = normalize(path.join(path.dirname(pkgPath), rel))
      if (existsSync(bin)) return bin
    }
  } catch {
    // exports map may hide package.json — fall through to the known layout
  }
  const fallback = path.join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs')
  if (existsSync(fallback)) return fallback
  return null
}

const bin = resolveVitestBin()
if (!bin) {
  console.error('Could not locate the vitest binary. Run "npm install" first.')
  process.exit(1)
}

const child = spawn(process.execPath, [bin, 'run', ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
})
child.on('error', (err) => {
  console.error('Failed to start vitest:', err.message)
  process.exit(1)
})
child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1))
})
