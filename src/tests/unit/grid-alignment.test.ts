import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * تساوي ارتفاع البطاقات داخل الشبكة.
 *
 * A grid item stretches to its row height by default; a card nested inside a
 * motion wrapper does not inherit that. Five KPI cards in one row therefore
 * ended at five different heights, and the insight row had ragged bottoms —
 * visible in a screenshot, invisible to a type check and to every render test.
 * TodayFocus had already solved it with display:flex on the wrapper plus a
 * full-width child; these assertions hold the other two grids to that.
 */

const SRC = resolve(process.cwd(), 'src')
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8')

/* The KPI grid and the insight grid moved off the home screen to the Progress
   tab; the grids themselves are unchanged, so the guards follow them. */
const KPIS = read('components/progress/StudyKpis.tsx')
const INSIGHTS = read('components/progress/SmartInsights.tsx')

describe('cards in one row end at the same height', () => {
  it('passes the row stretch through the KPI motion wrapper', () => {
    // the wrapper that carries springCardAt for the KPI grid
    const at = KPIS.indexOf('<KpiCard')
    expect(at, 'KpiCard is no longer rendered').toBeGreaterThan(-1)
    const wrapper = KPIS.slice(Math.max(0, at - 420), at)
    expect(wrapper, 'the KPI grid item must pass its stretch to the card').toContain("display: 'flex'")
  })

  it('passes it through Reveal for the insight grid', () => {
    const at = INSIGHTS.indexOf('<InsightCard')
    expect(at, 'InsightCard is no longer rendered').toBeGreaterThan(-1)
    const wrapper = INSIGHTS.slice(Math.max(0, at - 160), at)
    expect(wrapper, 'use <Reveal stretch> so the cards share a height').toContain('stretch')
  })

  it('offers that stretch on Reveal at all', () => {
    const fx = read('components/MotionFx.tsx')
    expect(fx).toContain('stretch')
    expect(fx, 'stretch must actually set display:flex on the wrapper').toMatch(/stretch \?\s*\{\s*display:\s*'flex'/)
  })

  it('makes the cards fill what the wrapper hands them', () => {
    for (const [file, name] of [['components/KpiCard.tsx', 'KpiCard'], ['components/InsightCard.tsx', 'InsightCard']]) {
      const src = read(file)
      // the flex child needs an explicit width or it collapses to content
      expect(src, `${name} must fill its flex wrapper`).toMatch(/className="[^"]*\bw-full\b/)
    }
  })

  it('pins the card action to the bottom instead of leaving dead space', () => {
    /* Equal-height rows are only half the job: once every card is as tall as
       the tallest, a short card stacks its content at the top and leaves a
       hole underneath, and each row's edit buttons sit at a different height.
       ExamCountdowns already solved this with marginTop:auto on its button
       row — the screenshot showed KpiCard had not. */
    const kpi = read('components/KpiCard.tsx')
    expect(kpi, 'the card must be a flex column for mt-auto to mean anything')
    // Substring checks, not regexes. The first version of this line carried
    // a literal backspace (0x08) where a word-boundary escape was intended,
    // so it looked correct in every listing and matched nothing at all.
      .toContain('flex flex-col')
    /* Anchored on the edit BUTTON, not on "mt-auto anywhere in the file":
       the editing hint below it also carries mt-auto, so a loose check passed
       even after the button lost it. */
    const editAt = kpi.indexOf('aria-label={`تعديل ${label}`}')
    expect(editAt, 'the edit button is gone').toBeGreaterThan(-1)
    const editBlock = kpi.slice(editAt, editAt + 400)
    expect(editBlock, 'the edit action must be pushed to the card foot')
      .toContain('className="mt-auto')

    const countdowns = read('components/ExamCountdowns.tsx')
    expect(countdowns, 'the pattern this was copied from').toMatch(/marginTop:\s*'auto'/)
  })

  it('gives every answer choice the full row, so options line up', () => {
    const css = read('styles/components.css')
    const at = css.indexOf('.choice {')
    expect(at, '.choice is not defined').toBeGreaterThan(-1)
    expect(css.slice(at, css.indexOf('}', at))).toContain('inline-size: 100%')
  })
})

describe('segmented view switches do not clip their labels', () => {
  it('wraps instead of hiding overflow behind a hidden scrollbar', () => {
    // On a phone the exam strip cut "الاستماع (Luisteren)" mid-word with no
    // scrollbar and no fade — nothing said there was more to reach. One
    // component now owns that strip everywhere.
    for (const file of ['sections/Exam.tsx', 'sections/Vocab.tsx']) {
      const src = read(file)
      expect(src, `${file} must use the shared switch, not a hand-rolled strip`).toContain('<Segmented')
      expect(src, `${file}: a hand-rolled tablist is back`).not.toContain('role="tablist"')
    }
    const css = read('styles/components.css')
    const at = css.indexOf('.segmented {')
    expect(at, '.segmented is not defined').toBeGreaterThan(-1)
    const rule = css.slice(at, css.indexOf('}', at))
    expect(rule, 'let the strip wrap').toContain('flex-wrap: wrap')
    expect(rule, 'a hidden scrollbar gives no hint that labels are cut').not.toContain('scrollbar-width: none')
  })

  it('marks the chosen view for assistive tech', () => {
    expect(read('components/ui/Segmented.tsx')).toContain('aria-pressed={value === o.id}')
  })
})
