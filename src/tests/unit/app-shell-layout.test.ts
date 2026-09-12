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
const NAVCSS = read('styles/navigation.css')
const TOPBAR = read('components/TopBar.tsx')
const HERO = read('components/hero/JourneyHero.tsx')
const TOKENS = read('styles/tokens.css')
const GLOBALS = read('styles/globals.css')

describe('the tab bar stays under the top bar while the page scrolls', () => {
  it('declares sticky', () => {
    expect(NAV).toContain('sticky')
  })

  it('never re-declares position inline, which would silently cancel it', () => {
    // An inline style beats a Tailwind class. This exact line is what broke it.
    expect(NAV).not.toMatch(/position:\s*['"]relative['"]/)
    expect(NAV).not.toMatch(/position:\s*['"]static['"]/)
  })

  it('offsets itself with the shared bar height, not a copied number', () => {
    expect(NAV).toContain("top: 'var(--topbar-h)'")
    expect(TOKENS).toContain('--topbar-h:')
    // The literal used to live in two files at once.
    expect(NAV).not.toContain("'62px'")
    expect(TOPBAR).not.toContain('h-[62px]')
  })

  it('never scrolls: five destinations, in a fixed grid on a phone', () => {
    /* The old bar scrolled ten tabs sideways and needed a fade to admit it.
       The five groups fit every phone width, so nothing can be out of view —
       and on a phone the bar moves to the bottom, within thumb reach. */
    const groups = [...NAV.matchAll(/\{ id: '[a-z]+', label:/g)].length
    expect(groups, 'primary navigation must stay at five destinations').toBe(5)
    expect(NAVCSS).toMatch(/@media \(max-width: 639px\)[\s\S]*position: fixed/)
    expect(NAVCSS).toMatch(/grid-template-columns: repeat\(5/)
    expect(NAVCSS, 'the fixed bar must clear the home indicator').toContain('env(safe-area-inset-bottom')
    expect(NAVCSS, 'the page must reserve room for the fixed bar').toMatch(/\.app-layout \{[^}]*padding-bottom/)
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
    const at = NAV.indexOf('<span>{group.label}</span>')
    expect(at, 'the visible label is gone').toBeGreaterThan(-1)
    const around = NAV.slice(Math.max(0, at - 260), at)
    expect(around, 'the label must not be behind a focusMode check').not.toContain('focusMode')
  })

  it('names every destination on hover as well as to assistive tech', () => {
    expect(NAV).toContain('title={group.label}')
    expect(NAV).toContain('aria-label={group.label}')
  })

  it('marks the open destination, in both rows', () => {
    const marks = [...NAV.matchAll(/aria-current=\{/g)].length
    expect(marks, 'the group row and the section row each need aria-current').toBeGreaterThanOrEqual(2)
  })

  it('keeps the practice group together, including the situations section', () => {
    expect(NAV).toContain("tabs: ['exercises', 'situations', 'exam']")
    expect(NAV).toContain('situations:')
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
