import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ميزانية الحركة: المُركِّب فقط، ونظام تدرّج واحد لكل شبكة.
 *
 * Three real defects motivated this file:
 *  · the shine sweep on every glass button animated `left`, so a hover ran
 *    layout on each frame;
 *  · every progress bar grew by animating `width` — the exact thing the hero
 *    bar already avoided, with a comment explaining why;
 *  · the page mesh repainted the whole viewport on a 15s infinite loop.
 * None of it is visible to a type check or a render test.
 */

const SRC = resolve(process.cwd(), 'src')
const GLOBALS = readFileSync(resolve(SRC, 'styles/globals.css'), 'utf8')

/** Properties whose animation forces layout on every frame. */
const LAYOUT_PROPS = [
  'left', 'right', 'top', 'bottom', 'width', 'height',
  'inset', 'inset-block-start', 'inset-inline-start', 'margin', 'padding',
]

interface Frame { name: string; props: string[] }

function keyframes(css: string): Frame[] {
  const out: Frame[] = []
  const re = /@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g
  for (const m of css.matchAll(re)) {
    const props = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1])
    out.push({ name: m[1], props: [...new Set(props)] })
  }
  return out
}

const FRAMES = keyframes(GLOBALS)

describe('the stylesheet still declares animations at all', () => {
  it('parses a realistic number of keyframes', () => {
    expect(FRAMES.length).toBeGreaterThan(15)
  })
})

describe('no animation forces layout', () => {
  it('keeps every keyframe off layout-triggering properties', () => {
    const bad = FRAMES
      .filter((f) => f.props.some((p) => LAYOUT_PROPS.includes(p)))
      .map((f) => `@keyframes ${f.name} animates ${f.props.filter((p) => LAYOUT_PROPS.includes(p)).join(', ')}`)
    expect(bad, 'animate transform/opacity instead — these run layout per frame').toEqual([])
  })

  it('keeps every transition off layout-triggering properties', () => {
    /* One literal regex, never a RegExp built from a template string. An
       earlier version of this check was assembled that way, `\s` collapsed to
       a bare `s`, and it matched nothing — it passed green while auditing the
       very transition it existed to catch. `all` is in the alternation too:
       `transition: all` sweeps every layout property in silently. */
    const LAYOUT_RE =
      /(^|[\s,])(left|right|top|bottom|width|height|inset|inset-block-start|inset-inline-start|margin|padding|all)([\s,]|$)/
    const bad: string[] = []
    for (const m of GLOBALS.matchAll(/transition:\s*([^;]+);/g)) {
      if (LAYOUT_RE.test(m[1])) bad.push(`transition: ${m[1].trim()}`)
    }
    // Proves the matcher itself still works, so a green result means "clean"
    // and not "the regex fell apart again".
    expect(LAYOUT_RE.test('left .55s ease'), 'the layout matcher is broken').toBe(true)
    expect(LAYOUT_RE.test('transform .55s ease'), 'the matcher is too greedy').toBe(false)
    expect(bad, 'transition transform/opacity instead').toEqual([])
  })

  it('drifts the page mesh on the compositor', () => {
    const at = GLOBALS.indexOf('@keyframes mesh-move')
    expect(at, 'mesh-move missing').toBeGreaterThan(-1)
    const body = GLOBALS.slice(at, GLOBALS.indexOf('}\n', GLOBALS.indexOf('{', at)))
    expect(body, 'a full-viewport repaint per frame, forever').not.toContain('background-position')
    expect(body).toContain('translate3d')
  })
})

describe('one entrance system per grid', () => {
  it('never stacks the CSS stagger on framer-driven children', () => {
    // Both own `opacity` on the same node, and a CSS animation outranks the
    // inline style framer writes — so they fight for the same property.
    const dash = readFileSync(resolve(SRC, 'sections/Dashboard.tsx'), 'utf8')
    const lines = dash.split('\n')
    const bad: string[] = []
    lines.forEach((line, i) => {
      if (!line.includes('className="stagger"')) return
      const window = lines.slice(i, i + 6).join('\n')
      if (/<Reveal|motion\./.test(window)) bad.push(`src/sections/Dashboard.tsx:${i + 1}`)
    })
    expect(bad, 'pick one: the CSS .stagger class or <Reveal>, not both').toEqual([])
  })
})

describe('the count-up is the shared, cancelled one', () => {
  it('leaves no hand-rolled rAF loop in KpiCard', () => {
    const kpi = readFileSync(resolve(SRC, 'components/KpiCard.tsx'), 'utf8')
    expect(kpi, 'use the tested useCountUp hook').not.toContain('requestAnimationFrame')
    expect(kpi).toContain('useCountUp')
  })

  it('cancels the frame in the shared hook', () => {
    const hook = readFileSync(resolve(SRC, 'hooks/useCountUp.ts'), 'utf8')
    expect(hook).toContain('cancelAnimationFrame')
  })

  it('hands the real figure over quickly on the dashboard', () => {
    // 2000ms meant the card showed a wrong number for most of the time a user
    // spent looking at it. These are the numbers the app exists to report.
    const kpi = readFileSync(resolve(SRC, 'components/KpiCard.tsx'), 'utf8')
    const m = kpi.match(/useCountUp\(\s*target\s*,\s*(\d+)\s*\)/)
    expect(m, 'KpiCard should pass an explicit duration').not.toBeNull()
    expect(Number(m![1])).toBeLessThanOrEqual(1000)
  })
})
