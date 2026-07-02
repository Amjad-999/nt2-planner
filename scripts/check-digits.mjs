#!/usr/bin/env node
// Fails with exit 1 if any Arabic-Indic or Extended-Persian digits are found in src/
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
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
