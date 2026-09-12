import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'

/**
 * WCAG AA على ألوان النصّ، محسوبًا لا مُقدَّرًا.
 *
 * Critical rule 1 of this project asks for 4.5:1 on text. That was being broken
 * silently: --orange as a text colour measured 2.31:1 over the tinted washes.
 * Eyeballing a palette cannot catch that, so this test computes every text
 * token against every surface it can land on and fails the suite if any pair
 * drops below the threshold — in BOTH themes.
 *
 * Translucent surfaces are composited onto --bg first, because that is what the
 * eye actually sees; comparing against an rgba() value directly would flatter
 * the result and hide real failures.
 */

const CSS = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

const AA_TEXT = 4.5

/** Tokens used as `color:` somewhere in the app. */
const TEXT_TOKENS = [
  'text', 'text2', 'muted',
  'orange-text', 'green-text', 'red-text', 'amber-text', 'blue-text', 'purple-text',
] as const

/** Backgrounds those tokens can sit on. */
const SURFACES = [
  'bg', 'surface', 'surface2', 'surface3',
  'btn-bg', 'glass-bg', 'glass-bg-strong',
  'green-l', 'red-l', 'orange-l', 'amber-l', 'blue-l', 'purple-l',
  'modal-bg', 'topbar-bg',
] as const

/**
 * Surfaces owned by a single component, audited against exactly the text
 * tokens that land on them. Keeping them out of the cartesian sweep above is
 * deliberate: --pass-btn-bg is a .22 wash, denser than every -l tint, and
 * holding EVERY text token to it would over-constrain the palette for a
 * surface only one button uses. Listing the real pairs is both tighter and
 * honest about intent.
 */
const SCOPED_SURFACES: { surface: string; text: readonly string[] }[] = [
  { surface: 'pass-bg', text: ['text', 'text2', 'green-text'] },
  { surface: 'pass-btn-bg', text: ['text'] },
]

/**
 * Tokens calibrated for FILLS, borders and icons (WCAG 1.4.11, 3:1) — never
 * for `color:`. Every one of them was measured below 4.5:1 as text on at
 * least one surface it actually landed on, so the guard below reads the
 * source and fails rather than trusting review to catch the next one.
 */
const FILL_ONLY = [
  'orange', 'orange-d', 'orange-m', 'orange-ink',
  'green', 'red', 'amber', 'blue', 'purple', 'teal',
] as const

type Rgb = [number, number, number]
interface Color { rgb: Rgb; a: number }

function blockOf(re: RegExp): string {
  const m = CSS.match(re)
  return m ? m[0] : ''
}

function varsOf(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of text.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const LIGHT_BLOCK = blockOf(/:root\s*\{[\s\S]*?\n\}/)
const DARK_BLOCK = blockOf(/(\[data-theme=["']?dark["']?\]|html\.dark|\.dark)\s*\{[\s\S]*?\n\}/)

const LIGHT = varsOf(LIGHT_BLOCK)
const DARK = { ...varsOf(LIGHT_BLOCK), ...varsOf(DARK_BLOCK) }

function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

function parseColor(value: string | undefined, map: Record<string, string>, depth = 0): Color | null {
  if (!value || depth > 8) return null
  const v = value.trim()
  const ref = v.match(/var\(\s*--([a-z0-9-]+)/)
  if (ref) return parseColor(map[ref[1]], map, depth + 1)
  if (/^#[0-9a-fA-F]{3,6}$/.test(v)) return { rgb: hexToRgb(v), a: 1 }
  const rgba = v.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/)
  if (rgba) return { rgb: [+rgba[1], +rgba[2], +rgba[3]], a: rgba[4] === undefined ? 1 : +rgba[4] }
  return null
}

function composite(fg: Color, bg: Rgb): Rgb {
  return fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a)) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const f = (x: number) => {
    const c = x / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function auditTheme(map: Record<string, string>): { pair: string; ratio: number }[] {
  const page = parseColor('var(--bg)', map)
  expect(page, '--bg must resolve to a colour').not.toBeNull()
  const pageRgb = page!.rgb
  const failures: { pair: string; ratio: number }[] = []

  for (const sName of SURFACES) {
    const s = parseColor(`var(--${sName})`, map)
    if (!s) continue
    const surface = composite(s, pageRgb)
    for (const tName of TEXT_TOKENS) {
      const t = parseColor(`var(--${tName})`, map)
      if (!t) continue
      const ratio = contrast(composite(t, surface), surface)
      if (ratio < AA_TEXT) failures.push({ pair: `--${tName} on --${sName}`, ratio })
    }
  }

  for (const { surface: sName, text } of SCOPED_SURFACES) {
    const s = parseColor(`var(--${sName})`, map)
    if (!s) continue
    const surface = composite(s, pageRgb)
    for (const tName of text) {
      const t = parseColor(`var(--${tName})`, map)
      if (!t) continue
      const ratio = contrast(composite(t, surface), surface)
      if (ratio < AA_TEXT) failures.push({ pair: `--${tName} on --${sName}`, ratio })
    }
  }

  return failures
}

describe('the token file parses at all', () => {
  it('finds both theme blocks', () => {
    expect(LIGHT_BLOCK.length).toBeGreaterThan(0)
    expect(DARK_BLOCK.length).toBeGreaterThan(0)
  })

  it('resolves every token this test audits, so nothing is skipped silently', () => {
    for (const map of [LIGHT, DARK]) {
      for (const t of TEXT_TOKENS) expect(parseColor(`var(--${t})`, map), t).not.toBeNull()
      for (const s of SURFACES) expect(parseColor(`var(--${s})`, map), s).not.toBeNull()
    }
  })
})

describe('WCAG AA — text tokens on every surface they can land on', () => {
  it('passes in the light theme', () => {
    const failures = auditTheme(LIGHT)
    expect(
      failures.map((f) => `${f.pair} = ${f.ratio.toFixed(2)}`),
      'these text/surface pairs are below 4.5:1',
    ).toEqual([])
  })

  it('passes in the dark theme', () => {
    const failures = auditTheme(DARK)
    expect(
      failures.map((f) => `${f.pair} = ${f.ratio.toFixed(2)}`),
      'these text/surface pairs are below 4.5:1',
    ).toEqual([])
  })
})

describe('the accent tokens are still distinguishable from body text', () => {
  it('keeps each state colour visibly different from --text', () => {
    for (const map of [LIGHT, DARK]) {
      const text = parseColor('var(--text)', map)!
      for (const t of ['orange-text', 'green-text', 'red-text'] as const) {
        const c = parseColor(`var(--${t})`, map)!
        // Darkening for contrast must not collapse the hue into plain body text.
        const diff = Math.abs(c.rgb[0] - text.rgb[0]) + Math.abs(c.rgb[1] - text.rgb[1]) + Math.abs(c.rgb[2] - text.rgb[2])
        expect(diff, `${t} is too close to --text`).toBeGreaterThan(40)
      }
    }
  })
})

/**
 * The audit above proves the PALETTE is sound. It cannot see a component that
 * reaches past the palette and paints text with a fill token — which is
 * exactly how --blue (4.18:1), --purple (4.12:1), --orange on hover (2.45:1)
 * and --orange-ink on a tint (4.01:1) all shipped. This guard closes that gap
 * by reading the source instead of the stylesheet.
 */
describe('no fill-only token is ever used as a text colour', () => {
  const SRC = resolve(process.cwd(), 'src')

  function tsxFiles(dir: string): string[] {
    const out: string[] = []
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) out.push(...tsxFiles(full))
      else if (e.name.endsWith('.tsx')) out.push(full)
    }
    return out
  }

  /** Matches `color: 'var(--x)'` and every `…text-[var(--x)]` variant. */
  const INLINE_COLOR = /color:\s*['"`]var\(--([a-z0-9-]+)\)['"`]/g
  const CLASS_COLOR = /text-\[var\(--([a-z0-9-]+)\)\]/g

  it('finds no offender in any component', () => {
    const offenders: string[] = []
    const fill: readonly string[] = FILL_ONLY

    for (const file of tsxFiles(SRC)) {
      const rel = file.slice(SRC.length + 1).split(sep).join('/')
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        for (const re of [INLINE_COLOR, CLASS_COLOR]) {
          re.lastIndex = 0
          for (const m of line.matchAll(re)) {
            if (fill.includes(m[1])) offenders.push(`src/${rel}:${i + 1} paints text with --${m[1]}`)
          }
        }
      })
    }

    expect(
      offenders,
      'these are fill/border tokens (3:1) used as text (needs 4.5:1) — switch to the matching --*-text token',
    ).toEqual([])
  })

  it('guards a token set that actually exists in the stylesheet', () => {
    // A typo in FILL_ONLY would silently disarm the guard.
    for (const t of FILL_ONLY) expect(parseColor(`var(--${t})`, LIGHT), t).not.toBeNull()
  })
})
