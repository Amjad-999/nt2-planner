import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * هيكل التطبيق: الشريط اللاصق، وشبكة البطل على الهاتف.
 *
 * Both regressions guarded here actually shipped:
 *  · NavTabs declared `sticky` in a class and then cancelled it with an inline
 *    `position: 'relative'`, so the navigation scrolled off the page.
 *  · The hero pinned four columns at every width, leaving roughly 24px of
 *    usable space per tile on a 320px screen.
 * Neither is visible in a type check and neither breaks a render test, so
 * they are asserted against the source.
 */

const SRC = resolve(process.cwd(), 'src')

/**
 * Comments explaining a past bug quote the broken code verbatim, so a guard
 * that greps raw text flags the explanation and not the defect. Strip block
 * comments and whole-line `//` comments first; leaving `//` alone mid-line
 * keeps URLs intact.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n')
}

const read = (p: string) => stripComments(readFileSync(resolve(SRC, p), 'utf8'))

const NAV = read('components/NavTabs.tsx')
const TOPBAR = read('components/TopBar.tsx')
const HERO = read('components/hero/JourneyHero.tsx')
const TOKENS = read('styles/tokens.css')
const GLOBALS = read('styles/globals.css')

/** The body of the first `selector {` rule in a stylesheet. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`)
  expect(at, `${selector} is not defined`).toBeGreaterThan(-1)
  return css.slice(at, css.indexOf('}', at))
}

describe('the tab bar stays under the top bar while the page scrolls', () => {
  it('declares sticky', () => {
    expect(rule(GLOBALS, '.o-topnav')).toContain('position: sticky')
  })

  it('never re-declares position inline, which would silently cancel it', () => {
    // An inline style beats a stylesheet rule. This exact line is what broke it.
    expect(NAV).not.toMatch(/position:\s*['"]relative['"]/)
    expect(NAV).not.toMatch(/position:\s*['"]static['"]/)
  })

  it('offsets itself with the shared bar height, not a copied number', () => {
    expect(rule(GLOBALS, '.o-topnav')).toContain('top: var(--topbar-h)')
    expect(TOKENS).toContain('--topbar-h:')
    // The literal used to live in two files at once.
    expect(NAV).not.toContain("'62px'")
    expect(TOPBAR).not.toContain('h-[62px]')
  })

  it('never scrolls on a phone: four workspaces + «المزيد» in a fixed bottom bar', () => {
    /* The old bar scrolled ten tabs sideways and needed a fade to admit it.
       Five buttons fit every phone width, so nothing can be out of view —
       and on a phone the bar moves to the bottom, within thumb reach. */
    const primary = NAV.slice(NAV.indexOf('const PRIMARY'), NAV.indexOf('const MORE_GROUPS'))
    const workspaces = [...primary.matchAll(/\{ id: '[a-z]+',/g)].length
    expect(workspaces, 'primary navigation must stay at four workspaces + «المزيد»').toBe(4)
    expect(GLOBALS).toMatch(/@media \(max-width: 767px\)[\s\S]*\.o-bottomnav \{[^}]*position: fixed/)
    expect(rule(GLOBALS, '  .o-bottomnav'), 'the fixed bar must clear the home indicator').toContain('env(safe-area-inset-bottom')
    expect(GLOBALS, 'the page must reserve room for the fixed bar').toMatch(/main#main-content \{[^}]*padding-bottom: calc\(var\(--o-bnav-h\)/)
  })
})

describe('the hero fits a phone', () => {
  it('does not pin four columns at every width', () => {
    expect(HERO).not.toContain('repeat(4, 1fr)')
  })

  it('uses the responsive stat grid, which starts at two columns', () => {
    expect(HERO).toContain('className="hero-stats"')
    const at = GLOBALS.indexOf('.hero-stats {')
    expect(at, '.hero-stats is not defined').toBeGreaterThan(-1)
    const rule = GLOBALS.slice(at, GLOBALS.indexOf('}', at))
    expect(rule).toContain('repeat(2, 1fr)')
    // and only widens once there is room for it
    expect(GLOBALS).toMatch(/@media \(min-width: 560px\)[\s\S]{0,120}repeat\(4, 1fr\)/)
  })

  it('has no fixed gutter left in the hero or the page shell', () => {
    expect(HERO).not.toMatch(/padding:\s*'24px 28px'/)
    for (const t of ['--hero-pad-x', '--hero-pad-y', '--page-pad-x']) {
      const at = TOKENS.indexOf(`${t}:`)
      expect(at, `${t} missing`).toBeGreaterThan(-1)
      expect(TOKENS.slice(at, TOKENS.indexOf(';', at)), `${t} must be fluid`).toContain('clamp(')
    }
  })
})

describe('touch targets', () => {
  it('raises the floor for coarse pointers only', () => {
    expect(TOKENS).toContain('--tap-min:')
    expect(GLOBALS).toMatch(/@media \(pointer: coarse\)[\s\S]{0,80}--tap-min:\s*44px/)
  })

  it('leaves no hand-written sub-44px min-height on a control', () => {
    const files = [
      'components/dashboard/TodayPlan.tsx', 'components/ExamPdfViewer.tsx',
      'components/plan/ProgramSections.tsx', 'components/plan/ProgramTimer.tsx',
      'components/SpeakAndCheck.tsx', 'sections/Exercises.tsx', 'components/TopBar.tsx',
    ]
    const bad: string[] = []
    for (const f of files) {
      read(f).split('\n').forEach((line, i) => {
        const m = line.match(/minHeight:\s*(\d+)/)
        if (m && Number(m[1]) < 44) bad.push(`src/${f}:${i + 1} minHeight ${m[1]}`)
        if (/\bw-9 h-9\b/.test(line)) bad.push(`src/${f}:${i + 1} 36px icon button`)
      })
    }
    expect(bad, 'use var(--tap-min) so touch gets 44px').toEqual([])
  })
})

describe('navigation always says where you are and where you can go', () => {
  it('keeps every destination labelled in words, never icon-only', () => {
    /* globals.css states the rule: only "purely decorative/motivational"
       elements may opt out, explicitly "not core content or navigation".
       An earlier version hid the labels in Focus Mode, leaving ten unlabelled
       icons — heavier on memory, not lighter on attention. */
    const at = NAV.indexOf('<span className="o-nav-label">{e.label}</span>')
    expect(at, 'the visible label is gone').toBeGreaterThan(-1)
    const around = NAV.slice(Math.max(0, at - 260), at)
    expect(around, 'the label must not be behind a focusMode check').not.toContain('focusMode')
  })

  it('marks the open destination, for workspaces and for «المزيد»', () => {
    const marks = [...NAV.matchAll(/aria-current=\{/g)].length
    expect(marks, 'the workspace buttons and the «المزيد» button each need aria-current').toBeGreaterThanOrEqual(2)
  })

  it('keeps the situations section reachable under «المزيد»', () => {
    expect(NAV).toContain("{ id: 'situations',")
  })
})

describe('the hero scene stays behind the content, not inside it', () => {
  it('drives the skyline from one token', () => {
    expect(TOKENS).toContain('--hero-sky-h:')
    expect(HERO, 'the front skyline height must come from the token')
      .toContain("height: 'var(--hero-sky-h)'")
    expect(HERO, 'no literal skyline heights left').not.toMatch(/bottom: -1, height: \d+,/)
  })

  it('reserves room for it under the content', () => {
    // Before: 60px of silhouette against 24px of bottom padding, so the
    // skyline climbed 36px into the stat tiles.
    expect(HERO).toContain("calc(var(--hero-sky-h) + var(--sp-2))")
  })
})
