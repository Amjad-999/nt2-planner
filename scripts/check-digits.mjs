#!/usr/bin/env node
// Fails with exit 1 if any Arabic-Indic or Extended-Persian digits are found in src/
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/* fileURLToPath, not URL.pathname: pathname keeps the leading slash of a
   Windows file URL ("/c:/project/src") and percent-encodes spaces. The old
   hand-rolled strip only matched an UPPERCASE drive letter, so under Git Bash
   — which reports "c:" — the slash survived and every path resolved against
   the current drive as "c:\c:\project\src". Same idiom as check-exams.mjs. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const PATTERN = /[٠-٩۰-۹٪٫]/

let found = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) { walk(full); continue }
    if (!/\.(ts|tsx|js|jsx|json|md|css)$/.test(name)) continue
    const src = readFileSync(full, 'utf8')
    const lines = src.split('\n')
    lines.forEach((line, i) => {
      if (PATTERN.test(line)) {
        const rel = relative(ROOT, full)
        console.error(`\x1b[31m[FAIL]\x1b[0m ${rel}:${i + 1}  ${line.trim()}`)
        found++
      }
    })
  }
}

walk(ROOT)

if (found > 0) {
  console.error(`\n\x1b[31m✖ ${found} line(s) with Arabic-Indic digits found in src/\x1b[0m`)
  process.exit(1)
} else {
  console.log('\x1b[32m✔ No Arabic-Indic digits found in src/\x1b[0m')
}
