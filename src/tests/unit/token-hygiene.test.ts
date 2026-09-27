import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'

/**
 * نظافة الوسوم: لا وسم مُعرَّف بلا مستهلك، ولا سلّمان لشيء واحد.
 *
 * The stylesheet had accumulated 21 tokens with no consumer anywhere —
 * a documented six-step chart ramp that no chart used, a countdown card
 * recipe that had been replaced by the standard glass card, and a whole
 * second shadow ladder with one call site against the real ladder's eighty.
 * Dead design tokens are worse than missing ones: they read as decisions.
 */

const SRC = resolve(process.cwd(), 'src')
const TOKENS = readFileSync(resolve(SRC, 'styles/tokens.css'), 'utf8')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'tests') out.push(...sourceFiles(full))
    } else if (/\.(tsx?|css)$/.test(e.name) && !full.endsWith(`styles${sep}tokens.css`)) {
      out.push(full)
    }
  }
  return out
}

/** Everything that could reference a token, plus the config that maps them. */
const CONSUMERS = [
  ...sourceFiles(SRC).map((f) => readFileSync(f, 'utf8')),
  readFileSync(resolve(process.cwd(), 'tailwind.config.js'), 'utf8'),
].join('\n')

/** Token names declared anywhere in the stylesheet, both themes. */
const DECLARED = [...new Set([...TOKENS.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))]

/**
 * Some tokens are only ever reached through a template literal, e.g.
 * `var(--hero-${phase})` in JourneyHero. A literal-text search cannot see
 * those, so they are declared here with the call site that builds them.
 * Anything added to this list must be justified the same way.
 */
const BUILT_DYNAMICALLY: Record<string, string> = {
  '--hero-dawn': 'JourneyHero: var(--hero-${p})',
  '--hero-day': 'JourneyHero: var(--hero-${p})',
  '--hero-dusk': 'JourneyHero: var(--hero-${p})',
  '--hero-night': 'JourneyHero: var(--hero-${p})',
}

describe('the token file is still readable by this suite', () => {
  it('finds a realistic number of declarations', () => {
    expect(DECLARED.length).toBeGreaterThan(80)
  })

  it('only excuses tokens that really are built dynamically', () => {
    for (const name of Object.keys(BUILT_DYNAMICALLY)) {
      expect(DECLARED, `${name} is excused but no longer declared`).toContain(name)
    }
    // The construction pattern must still exist, or the excuse is stale.
    expect(CONSUMERS).toContain('var(--hero-${p})')
  })
})

describe('every declared token has a consumer', () => {
  it('leaves nothing dead in the stylesheet', () => {
    const dead = DECLARED.filter((name) => {
      if (name in BUILT_DYNAMICALLY) return false
      if (CONSUMERS.includes(`var(${name})`)) return false
      // referenced by another token, e.g. --teal: var(--green)
      if (TOKENS.split(`${name}:`).slice(1).length && TOKENS.includes(`var(${name})`)) return false
      // set from JS, e.g. --font-size-base / the ember custom properties
      if (CONSUMERS.includes(`'${name}'`) || CONSUMERS.includes(`"${name}"`)) return false
      return true
    })
    expect(dead, 'a token nothing consumes reads as a decision that was never made').toEqual([])
  })
})

describe('one ladder per idea', () => {
  it('has a single elevation scale', () => {
    // --shadow-sm/--shadow/--shadow-lg had one call site between them; the
    // --elev-* ladder had eighty.
    for (const legacy of ['--shadow-sm:', '--shadow:', '--shadow-lg:']) {
      expect(TOKENS, `${legacy} is a second elevation ladder`).not.toContain(legacy)
    }
    for (const cur of ['--elev-1:', '--elev-2:', '--elev-3:']) {
      expect(TOKENS).toContain(cur)
    }
  })

  it('points the Tailwind shadow utilities at that same scale', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'tailwind.config.js'), 'utf8')
    const at = cfg.indexOf('boxShadow:')
    expect(at).toBeGreaterThan(-1)
    const block = cfg.slice(at, cfg.indexOf('}', at))
    expect(block).not.toContain('--shadow')
    expect(block).toContain('--elev-')
  })
})
