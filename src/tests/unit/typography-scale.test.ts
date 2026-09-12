import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'

/**
 * الطباعة: سلّم واحد، وأرضية قراءة عربية.
 *
 * Before this suite the app carried 530 sizing declarations spread over 43
 * ad-hoc rem values, 137 of them under the Arabic reading floor, while the
 * --text-* tokens that were supposed to own the scale sat almost unused.
 * The rules below keep that from coming back, and each is checked against
 * the source rather than against intent.
 */

const SRC = resolve(process.cwd(), 'src')
const CSS = readFileSync(resolve(SRC, 'styles/tokens.css'), 'utf8')

/** Every size step the design system offers, smallest first. */
const TYPE_STEPS = [
  '--text-2xs', '--text-xs', '--text-sm', '--text-base',
  '--text-md', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl', '--text-4xl',
] as const
/** Emoji-as-artwork sizes. Deliberately not part of the type ramp. */
const GLYPH_STEPS = ['--glyph-sm', '--glyph-md', '--glyph-lg'] as const

/**
 * Arabic needs more vertical room than Latin at the same nominal size: the
 * script joins, and tashkeel sits above and below the baseline, so both stop
 * resolving on screen well before Latin does. 0.75rem (12px at the 16px
 * root) is the floor this app commits to.
 */
const FLOOR_REM = 0.75

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'tests') out.push(...tsxFiles(full))
    } else if (e.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

const FILES = tsxFiles(SRC)

/**
 * `fontSize: '<value>'` is always a size. `text-[<value>]` is Tailwind's
 * arbitrary-value escape hatch and carries BOTH sizes and colours, so a class
 * hit only counts as typography when it names a size unit or one of the
 * scale's own tokens. Colour tokens (--text, --text2, --muted, --orange-text)
 * share that syntax and belong to the contrast suite, not this one.
 */
const INLINE = /fontSize:\s*'([^']+)'/g
const CLASSY = /text-\[([^\]]+)\]/g
const SIZE_TOKEN = /^var\(\s*--(?:text|glyph)-[a-z0-9]+\s*\)$/
const RAW_SIZE = /\d(?:rem|px|em)\b|^\.\d+(?:rem|em)$|clamp\(/

interface Hit { file: string; line: number; value: string }

function scan(): Hit[] {
  const hits: Hit[] = []
  for (const file of FILES) {
    const rel = file.slice(SRC.length + 1).split(sep).join('/')
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      INLINE.lastIndex = 0
      for (const m of line.matchAll(INLINE)) hits.push({ file: rel, line: i + 1, value: m[1].trim() })
      CLASSY.lastIndex = 0
      for (const m of line.matchAll(CLASSY)) {
        const v = m[1].trim()
        if (SIZE_TOKEN.test(v) || RAW_SIZE.test(v)) hits.push({ file: rel, line: i + 1, value: v })
      }
    })
  }
  return hits
}

const HITS = scan()

/** Values that are legitimately not a scale step. */
const ALLOWED_LITERALS = new Set(['1em', '.84em', 'inherit'])

describe('the typography system exists in the stylesheet', () => {
  it('declares every step this suite guards', () => {
    for (const t of [...TYPE_STEPS, ...GLYPH_STEPS]) {
      expect(CSS.includes(`${t}:`), `${t} is missing from tokens.css`).toBe(true)
    }
  })

  it('declares the four weight steps', () => {
    for (const w of ['--fw-body', '--fw-medium', '--fw-heading', '--fw-cta']) {
      expect(CSS.includes(`${w}:`), `${w} is missing from tokens.css`).toBe(true)
    }
  })

  it('declares the line-height ladder', () => {
    for (const l of ['--lh-none', '--lh-tight', '--lh-heading', '--lh-ui', '--lh-arabic']) {
      expect(CSS.includes(`${l}:`), `${l} is missing from tokens.css`).toBe(true)
    }
  })

  it('leaves no raw weight or line-height in any component', () => {
    /* 149 literal weights and 77 literal line-heights used to live in the
       components, which is how the app ended up rendering two visible weights
       and 22 different leadings. Literal regexes only — an earlier guard in
       this repo was assembled from a template string, `\s` collapsed to `s`,
       and it passed green while matching nothing. */
    const WEIGHT = /fontWeight:\s*'?[1-9]00'?/
    const LEADING = /lineHeight:\s*(1\.?\d*)(?=[,\s}])/
    expect(WEIGHT.test("fontWeight: 700"), 'the weight matcher is broken').toBe(true)
    expect(WEIGHT.test("fontWeight: 'var(--fw-cta)'"), 'the weight matcher is too greedy').toBe(false)
    expect(LEADING.test('lineHeight: 1.6,'), 'the leading matcher is broken').toBe(true)
    expect(LEADING.test("lineHeight: 'var(--lh-ui)',"), 'the leading matcher is too greedy').toBe(false)

    const bad: string[] = []
    for (const file of FILES) {
      const rel = file.slice(SRC.length + 1).split(sep).join('/')
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        const w = line.match(WEIGHT)
        if (w) bad.push(`src/${rel}:${i + 1} ${w[0]}`)
        // 0 (an icon-wrapper reset) and 2 (one deliberate gap-fill row) stay literal.
        const l = line.match(LEADING)
        if (l) bad.push(`src/${rel}:${i + 1} lineHeight ${l[1]}`)
      })
    }
    expect(bad, 'use --fw-* and --lh-* tokens').toEqual([])
  })

  it('actually loads the medium face, or --fw-medium renders as body text', () => {
    const main = readFileSync(resolve(SRC, 'main.tsx'), 'utf8')
    expect(main, 'tajawal/500 must be imported for --fw-medium to render').toContain('tajawal/500.css')
  })

  it('scans a real set of components', () => {
    expect(FILES.length).toBeGreaterThan(40)
    expect(HITS.length).toBeGreaterThan(200)
  })
})

describe('every font size comes from the scale', () => {
  it('finds no ad-hoc rem, px or inline clamp in any component', () => {
    const offenders = HITS.filter((h) => {
      if (ALLOWED_LITERALS.has(h.value)) return false
      if (h.value.startsWith('var(')) return false
      return true
    })
    expect(
      offenders.map((o) => `src/${o.file}:${o.line} = ${o.value}`),
      'these bypass the type scale — use a --text-* / --glyph-* token',
    ).toEqual([])
  })

  it('only ever references steps that exist', () => {
    // Catches a typo like --text-4xl: it is shaped like a size token, so the
    // scan keeps it, and it is not a declared step, so this fails.
    const known = new Set<string>([...TYPE_STEPS, ...GLYPH_STEPS])
    const unknown = HITS
      .map((h) => ({ ...h, m: h.value.match(/^var\(\s*(--(?:text|glyph)-[a-z0-9]+)\s*\)$/) }))
      .filter((h) => h.m && !known.has(h.m[1]))
    expect(
      unknown.map((o) => `src/${o.file}:${o.line} = ${o.value}`),
      'these point at a token that is not part of the type or glyph scale',
    ).toEqual([])
  })
})

/**
 * Reads one declaration out of tokens.css without building a RegExp from a
 * template string. That indirection is how the first version of these two
 * checks silently became `s*` instead of `\s*`, matched nothing, and passed
 * green while auditing zero tokens — so the assertions below also prove they
 * actually parsed every step.
 */
function declValue(token: string): string | null {
  const at = CSS.indexOf(`${token}:`)
  if (at === -1) return null
  const end = CSS.indexOf(';', at)
  if (end === -1) return null
  return CSS.slice(at + token.length + 1, end).trim()
}

/** The minimum a step can ever render at: a clamp is floored by its 1st arg. */
function minRem(value: string): number {
  return value.startsWith('clamp(') ? parseFloat(value.slice(6).split(',')[0]) : parseFloat(value)
}

describe('nothing renders Arabic below the reading floor', () => {
  it('keeps every declared step at or above the floor', () => {
    const tooSmall: string[] = []
    let parsed = 0
    for (const t of TYPE_STEPS) {
      const v = declValue(t)
      expect(v, `${t} did not parse out of tokens.css`).not.toBeNull()
      parsed++
      const rem = minRem(v!)
      expect(Number.isNaN(rem), `${t} = "${v}" is not a readable length`).toBe(false)
      if (rem < FLOOR_REM) tooSmall.push(`${t} = ${v}`)
    }
    // Guards the guard: a parse that silently matched nothing used to look
    // identical to a clean pass.
    expect(parsed, 'every step must have been read').toBe(TYPE_STEPS.length)
    expect(tooSmall, `below the ${FLOOR_REM}rem Arabic floor`).toEqual([])
  })

  it('keeps the ladder strictly ascending', () => {
    const sizes = TYPE_STEPS.map((t) => ({ t, rem: minRem(declValue(t)!) }))
    const out: string[] = []
    for (let i = 1; i < sizes.length; i++) {
      if (sizes[i].rem <= sizes[i - 1].rem) out.push(`${sizes[i].t} (${sizes[i].rem}) <= ${sizes[i - 1].t} (${sizes[i - 1].rem})`)
    }
    expect(out, 'the scale must grow at every step or it is not a hierarchy').toEqual([])
  })

  it('keeps the fluid steps reachable by the A-/A+ control', () => {
    // A clamp whose middle term is bare vw ignores the root font size, so the
    // user's text-size preference silently stops applying to it (WCAG 1.4.4).
    const bare: string[] = []
    let fluid = 0
    for (const t of TYPE_STEPS) {
      const v = declValue(t)!
      if (!v.startsWith('clamp(')) continue
      fluid++
      const mid = v.slice(6, v.lastIndexOf(')')).split(',')[1].trim()
      if (!mid.includes('rem')) bare.push(`${t} middle term is "${mid}"`)
    }
    expect(fluid, 'the scale is supposed to contain fluid steps').toBeGreaterThan(0)
    expect(bare, 'fluid steps must be written as `rem + vw`, never bare vw').toEqual([])
  })
})
