import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * The observatory layer has two contracts, both measured here:
 *  1. every --o-* text/ink token clears WCAG AA (4.5:1) on every plane it can
 *     sit on, in light AND dark, and interactive boundaries clear 3:1;
 *  2. the legacy tokens remapped by data-skin="observatory" keep the same AA
 *     guarantee token-contrast.test.ts gives the classic palette.
 * Translucent values are composited onto the page colour first — comparing an
 * rgba() directly would flatter the ratio.
 */

const CSS = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function block(selectorRe: string): string {
  const m = CSS.match(new RegExp(selectorRe + '\\s*\\{[\\s\\S]*?\\n\\}'))
  return m ? m[0] : ''
}
function vars(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of text.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

/* Blocks in file order. The first `:root {` is the classic light theme. */
const allRootBlocks = [...CSS.matchAll(/:root\s*\{[\s\S]*?\n\}/g)].map((m) => m[0])
const allDarkBlocks = [...CSS.matchAll(/:root\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/g)].map((m) => m[0])
const SKIN_LIGHT = block(':root\\[data-skin="observatory"\\]')
const SKIN_DARK = block(':root\\[data-skin="observatory"\\]\\[data-theme="dark"\\]')

const BASE_LIGHT = Object.assign({}, ...allRootBlocks.map(vars)) as Record<string, string>
const BASE_DARK = { ...BASE_LIGHT, ...Object.assign({}, ...allDarkBlocks.map(vars)) } as Record<string, string>
const OBS_LIGHT = { ...BASE_LIGHT, ...vars(SKIN_LIGHT) }
const OBS_DARK = { ...BASE_DARK, ...vars(SKIN_LIGHT), ...vars(SKIN_DARK) }

type Rgb = [number, number, number]
interface Color { rgb: Rgb; a: number }

function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}
function parse(value: string | undefined, map: Record<string, string>, depth = 0): Color | null {
  if (!value || depth > 8) return null
  const v = value.trim()
  const ref = v.match(/var\(\s*--([a-z0-9-]+)/)
  if (ref) return parse(map[ref[1]], map, depth + 1)
  if (/^#[0-9a-fA-F]{3,6}$/.test(v)) return { rgb: hexToRgb(v), a: 1 }
  const rgba = v.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/)
  if (rgba) return { rgb: [+rgba[1], +rgba[2], +rgba[3]], a: rgba[4] === undefined ? 1 : +rgba[4] }
  return null
}
const comp = (fg: Color, bg: Rgb): Rgb => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a)) as Rgb
function lum([r, g, b]: Rgb): number {
  const f = (x: number) => { const c = x / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: Rgb, b: Rgb) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

function audit(map: Record<string, string>, pageToken: string, texts: string[], surfaces: string[], min: number) {
  const page = parse(`var(--${pageToken})`, map)
  expect(page, pageToken).not.toBeNull()
  const fails: string[] = []
  for (const s of surfaces) {
    const sc = parse(`var(--${s})`, map)
    expect(sc, s).not.toBeNull()
    const surface = comp(sc!, page!.rgb)
    for (const t of texts) {
      const tc = parse(`var(--${t})`, map)
      expect(tc, t).not.toBeNull()
      const r = ratio(comp(tc!, surface), surface)
      if (r < min) fails.push(`--${t} on --${s}: ${r.toFixed(2)}`)
    }
  }
  return fails
}

const O_THEMES = { light: BASE_LIGHT, dark: BASE_DARK }

describe('observatory tokens: text on planes (AA 4.5:1)', () => {
  for (const [name, map] of Object.entries(O_THEMES)) {
    it(`${name}: ink tokens on page/paper planes`, () => {
      expect(audit(map, 'o-page',
        ['o-ink', 'o-ink-2', 'o-muted', 'o-cobalt-ink', 'o-mint-ink', 'o-coral-ink', 'o-warn-ink', 'o-error-ink'],
        ['o-page', 'o-paper', 'o-paper-2'], 4.5)).toEqual([])
    })
    it(`${name}: semantic ink on its own wash`, () => {
      const pairs: [string, string][] = [
        ['o-cobalt-ink', 'o-cobalt-wash'], ['o-mint-ink', 'o-mint-wash'], ['o-coral-ink', 'o-coral-wash'],
        ['o-warn-ink', 'o-warn-wash'], ['o-error-ink', 'o-error-wash'], ['o-ink', 'o-cobalt-wash'], ['o-ink', 'o-mint-wash'],
      ]
      const fails = pairs.flatMap(([t, s]) => audit(map, 'o-page', [t], [s], 4.5))
      expect(fails).toEqual([])
    })
    it(`${name}: text on the night plane`, () => {
      expect(audit(map, 'o-night',
        ['o-on-night', 'o-on-night-2', 'o-night-cobalt', 'o-night-mint', 'o-night-lime', 'o-night-coral'],
        ['o-night', 'o-night-2', 'o-night-3'], 4.5)).toEqual([])
    })
    it(`${name}: ink on the lime action fill`, () => {
      expect(audit(map, 'o-lime', ['o-on-lime'], ['o-lime'], 4.5)).toEqual([])
    })
    it(`${name}: token/tile text on every satin gradient stop`, () => {
      const pairs: [string, string][] = [['o-satin', 'o-ink'], ['o-satin-cobalt', 'o-on-lime'], ['o-satin-mint', 'o-on-lime'], ['o-satin-lime', 'o-on-lime']]
      for (const [grad, ink] of pairs) {
        const stops = [...map[grad].matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => hexToRgb(m[0]))
        const inkC = parse(`var(--${ink})`, map)!
        expect(stops.length, grad).toBeGreaterThan(1)
        for (const s of stops) expect(ratio(inkC.rgb, s), `${ink} on ${grad}`).toBeGreaterThanOrEqual(4.5)
      }
    })
    it(`${name}: input boundaries and focus reach 3:1 (non-text)`, () => {
      expect(audit(map, 'o-page', ['o-line-2', 'o-focus'], ['o-paper', 'o-paper-2', 'o-page'], 3)).toEqual([])
    })
  }
})

describe('observatory skin: legacy tokens stay AA', () => {
  const TEXT = ['text', 'text2', 'muted', 'orange-text', 'green-text', 'red-text', 'amber-text']
  const SURF = ['bg', 'surface', 'surface2', 'surface3', 'btn-bg', 'glass-bg', 'glass-bg-strong', 'green-l', 'red-l', 'orange-l', 'amber-l']
  it('light skin', () => { expect(audit(OBS_LIGHT, 'bg', TEXT, SURF, 4.5)).toEqual([]) })
  it('dark skin', () => { expect(audit(OBS_DARK, 'bg', TEXT, SURF, 4.5)).toEqual([]) })
  it('white text on the primary gradient stops', () => {
    for (const map of [OBS_LIGHT, OBS_DARK]) {
      const stops = [...map['grad-primary'].matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => hexToRgb(m[0]))
      for (const s of stops) expect(ratio([255, 255, 255], s)).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('hero ink stays readable on every observatory hero phase', () => {
    for (const map of [OBS_LIGHT, OBS_DARK]) {
      for (const k of ['grad-hero', 'hero-dawn', 'hero-day', 'hero-dusk', 'hero-night']) {
        const stops = [...map[k].matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => hexToRgb(m[0]))
        const ink2 = parse(map['hero-ink2'], map)!
        for (const s of stops) expect(ratio(comp(ink2, s), s), k).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('observatory skin: block parity', () => {
  it('light and dark skin blocks define the same properties', () => {
    const a = Object.keys(vars(SKIN_LIGHT)).sort()
    const b = Object.keys(vars(SKIN_DARK)).sort()
    expect(a.length).toBeGreaterThan(40)
    expect(b).toEqual(a)
  })
  it('every --o-* token has a dark value', () => {
    const light = Object.keys(vars(allRootBlocks[1] ?? '')).filter((k) => k.startsWith('o-'))
    const dark = Object.keys(vars(allDarkBlocks[1] ?? ''))
    const themeless = /^o-(r-|s\d|font|fs-|ease|dur|travel|bnav|read)/
    const missing = light.filter((k) => !themeless.test(k) && !dark.includes(k))
    expect(missing).toEqual([])
  })
  it('observatory components and styles carry no hard-coded colours', () => {
    const roots = ['src/components/obs', 'src/features/observatory']
    const files: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(tsx?|css)$/.test(e.name)) files.push(p)
      }
    }
    for (const r of roots) walk(resolve(process.cwd(), r))
    expect(files.length).toBeGreaterThan(5)
    const offenders = files.filter((f) => /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/.test(
      // comments may cite a hex value; code may not
      readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
    ))
    expect(offenders).toEqual([])
  })
})
