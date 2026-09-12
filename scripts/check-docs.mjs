#!/usr/bin/env node
/**
 * Keeps the two agent briefs honest.
 *
 * CLAUDE.md and AGENTS.md are the first thing an assistant reads, so a wrong
 * fact in them is worse than no fact: it sends the reader looking for a path
 * that does not exist and quietly discredits everything else on the page.
 * They had drifted — a skills folder spelled wrong, a test count that was
 * roughly half the real one, an environment description that no longer applied.
 *
 * Correcting those by hand fixes today and nothing else. This runs on every
 * check, so the next drift fails loudly instead of ageing in place.
 *
 * Checks:
 *   1. every `npm run x` mentioned is a real script
 *   2. every rooted path mentioned in backticks exists
 *   3. the stated skill count matches the folder
 *   4. paths the docs claim do NOT exist really do not
 *
 * Usage: npm run check:docs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const OFF = '\x1b[0m'

const DOCS = ['CLAUDE.md', 'AGENTS.md']
/**
 * A backticked token counts as a path claim when it has two or more non-empty
 * segments: `src/tests/` and `.agents/skills/` do, bare prose like `hero/` or
 * `@/` does not.
 *
 * The first version of this allowlisted known top-level folders, which missed
 * the very bug that prompted the script — a reference to `.Codex/skills/`, a
 * folder that has never existed. Anchoring on names known to be good cannot
 * catch a name that is wrong.
 */
function isPathClaim(token) {
  return token.split('/').filter(Boolean).length >= 2
}
/** Quoted in the docs precisely because it must never appear. */
const MUST_NOT_EXIST = ['src/app']

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const scripts = new Set(Object.keys(pkg.scripts))

let failures = 0
const fail = (doc, msg) => { console.error(`${RED}[FAIL]${OFF} ${doc}: ${msg}`); failures++ }

for (const doc of DOCS) {
  const file = resolve(root, doc)
  if (!existsSync(file)) { fail(doc, 'file is missing'); continue }
  const text = readFileSync(file, 'utf8')

  for (const [, name] of text.matchAll(/`npm run ([a-z:]+)`/g)) {
    if (!scripts.has(name)) fail(doc, `mentions "npm run ${name}", which is not in package.json`)
  }

  const checked = new Set()
  for (const [, p] of text.matchAll(/`([a-zA-Z0-9_.\-/]+)`/g)) {
    if (!isPathClaim(p) || checked.has(p)) continue
    if (MUST_NOT_EXIST.includes(p.replace(/\/$/, ''))) continue
    checked.add(p)
    if (!existsSync(resolve(root, p))) fail(doc, `mentions "${p}", which does not exist`)
  }

  const skillsDir = doc === 'AGENTS.md' ? '.agents/skills' : '.claude/skills'
  if (existsSync(resolve(root, skillsDir))) {
    const actual = readdirSync(resolve(root, skillsDir)).length
    const claimed = text.match(/there are (\d+) project skills/)
    if (claimed && Number(claimed[1]) !== actual) {
      fail(doc, `claims ${claimed[1]} skills, ${skillsDir} has ${actual}`)
    }
  }
}

for (const p of MUST_NOT_EXIST) {
  if (existsSync(resolve(root, p))) fail('both docs', `state that "${p}" does not exist, but it does`)
}

/* The same 16 skills are kept twice, once per tool. They are byte-identical
   today and the briefs promise they stay that way. Two agents working from
   different rules on one repository is worse than either having no skill at
   all, and nothing else would notice the day they diverge. */
{
  const a = resolve(root, '.claude/skills')
  const b = resolve(root, '.agents/skills')
  if (existsSync(a) && existsSync(b)) {
    const names = new Set([...readdirSync(a), ...readdirSync(b)])
    for (const name of names) {
      const fa = resolve(a, name, 'SKILL.md')
      const fb = resolve(b, name, 'SKILL.md')
      if (!existsSync(fa)) { fail('skills', `"${name}" exists in .agents/skills but not .claude/skills`); continue }
      if (!existsSync(fb)) { fail('skills', `"${name}" exists in .claude/skills but not .agents/skills`); continue }
      if (readFileSync(fa, 'utf8') !== readFileSync(fb, 'utf8')) {
        fail('skills', `"${name}" differs between .claude/skills and .agents/skills`)
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${RED}✖ ${failures} inaccurate statement(s) in the agent briefs.${OFF}`)
  process.exit(1)
}
console.log(`${GREEN}✔ CLAUDE.md and AGENTS.md describe things that actually exist.${OFF}`)
