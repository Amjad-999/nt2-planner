import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'

/**
 * نظام التصميم: حاوية واحدة، سلّم أقطار واحد، إيقاع مسافات واحد.
 *
 * The app previously carried the page container as an inline style copied into
 * ten files (so no media query could reach it), nine hand-written copies of the
 * section heading, fourteen hand-rolled copies of the callout box, 22 distinct
 * corner radii and 25 distinct spacing values. Everything below is checked
 * against the source, because every one of those drifted silently.
 */

const SRC = resolve(process.cwd(), 'src')
const CSS = readFileSync(resolve(SRC, 'styles/tokens.css'), 'utf8')
const GLOBALS = readFileSync(resolve(SRC, 'styles/globals.css'), 'utf8')

const RADIUS_STEPS = ['--r-2xs', '--r-xs', '--r-sm', '--r', '--r-lg', '--r-pill', '--r-full'] as const
/* A scale may skip steps — it must not carry ones nothing uses. --sp-10 (40px)
   and --sp-16 (64px) were declared and never reached a call site, so the token
   hygiene suite flagged them and they were removed rather than decorated. */
const SPACE_STEPS = [
  '--sp-0', '--sp-1', '--sp-2', '--sp-3', '--sp-4',
  '--sp-5', '--sp-6', '--sp-8', '--sp-12',
] as const

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

const FILES = tsxFiles(SRC).map((f) => ({
  rel: f.slice(SRC.length + 1).split(sep).join('/'),
  text: readFileSync(f, 'utf8'),
}))

function offenders(re: RegExp, skip?: (rel: string, line: string) => boolean): string[] {
  const out: string[] = []
  for (const { rel, text } of FILES) {
    text.split('\n').forEach((line, i) => {
      re.lastIndex = 0
      for (const m of line.matchAll(re)) {
        if (skip?.(rel, line)) continue
        out.push(`src/${rel}:${i + 1} ${m[0].trim()}`)
      }
    })
  }
  return out
}

describe('the design system exists in the stylesheets', () => {
  it('declares the radius ladder and the spacing rhythm', () => {
    for (const t of RADIUS_STEPS) expect(CSS.includes(`${t}:`), `${t} missing`).toBe(true)
    for (const t of SPACE_STEPS) expect(CSS.includes(`${t}:`), `${t} missing`).toBe(true)
  })

  it('declares the page shell and the section heading', () => {
    expect(GLOBALS).toContain('.page {')
    expect(GLOBALS).toContain('.section-title {')
    for (const t of ['--page-max', '--page-pad-x', '--page-pad-top']) {
      expect(CSS.includes(`${t}:`), `${t} missing`).toBe(true)
    }
  })

  it('keeps the page padding fluid rather than a fixed desktop value', () => {
    // A hard 28px inline padding ate 17.5% of a 320px viewport, and being
    // inline it could not be overridden by any media query.
    const at = CSS.indexOf('--page-pad-x:')
    expect(at, '--page-pad-x missing').toBeGreaterThan(-1)
    const value = CSS.slice(at + 13, CSS.indexOf(';', at))
    expect(value, 'the page gutter must respond to viewport width').toContain('clamp(')
  })
})

describe('one page container, defined once', () => {
  it('has no section rebuilding the shell inline', () => {
    expect(offenders(/maxWidth:\s*(1100|820|760)\b/g)).toEqual([])
  })

  it('gives every top-level section the shared container', () => {
    const sections = FILES.filter((f) => f.rel.startsWith('sections/'))
    expect(sections.length).toBeGreaterThan(8)
    const missing = sections.filter((f) => !f.text.includes('className="page')).map((f) => f.rel)
    expect(missing, 'these sections do not use the .page shell').toEqual([])
  })
})

describe('one radius ladder', () => {
  it('has no numeric borderRadius left in any component', () => {
    // Chart.js draws to a canvas, where borderRadius is a pixel NUMBER and a
    // CSS var would be a type error — those live in chart option objects.
    const isChartOption = (_rel: string, line: string) =>
      line.includes('new Chart(') || line.includes('borderSkipped')
    expect(offenders(/borderRadius:\s*\d+/g, isChartOption)).toEqual([])
  })

  it('has no arbitrary pixel radius class', () => {
    expect(offenders(/rounded-\[\d+px\]/g)).toEqual([])
  })
})

describe('one spacing rhythm', () => {
  it('has no ad-hoc gap or block margin in any component', () => {
    // 0 is the absence of spacing, not a step on the scale, so it stays literal.
    expect(offenders(/\b(gap|rowGap|columnGap|marginBottom|marginTop):\s*[1-9]\d*/g)).toEqual([])
  })
})

describe('one callout, not fourteen', () => {
  it('routes every state banner through the shared component', () => {
    // QuoteTicker and Lesson use an accent edge on a CARD (--surface2 / --r),
    // which is a different pattern and stays deliberately outside this rule.
    const allowed = new Set(['components/dashboard/QuoteTicker.tsx', 'components/Lesson.tsx'])
    const hits = offenders(/borderInlineStart:\s*'3px solid var\(--(orange|blue|green|amber|red|purple)\)'/g)
      .filter((h) => ![...allowed].some((a) => h.includes(a)))
    expect(hits, 'use <Callout> instead of rebuilding the box').toEqual([])
  })

  it('pairs every state tone with an icon, so colour is never the only signal', () => {
    const callout = readFileSync(resolve(SRC, 'components/ui/Callout.tsx'), 'utf8')
    for (const tone of ['success', 'warn', 'danger']) {
      const at = callout.indexOf(`${tone}:`)
      expect(at, `${tone} tone missing`).toBeGreaterThan(-1)
      const spec = callout.slice(at, callout.indexOf('\n', at))
      expect(spec.includes("icon: '"), `${tone} has no default icon (WCAG 1.4.1)`).toBe(true)
    }
  })
})
