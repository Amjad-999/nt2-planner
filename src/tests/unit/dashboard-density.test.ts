import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * كثافة لوحة التحكّم.
 *
 * The home screen had grown to twelve blocks of near-identical weight: a hero,
 * three focus cards, a checklist, five KPI cards, six insight cards, badges,
 * and a quick-actions grid whose buttons led where the same screen already
 * led. It answered "how am I doing" six times and "what do I do now" nowhere
 * in particular.
 *
 * What is guarded here: home carries exactly one primary action, that action
 * is the first unfinished row of the same checklist rendered under it, and the
 * blocks that describe the PAST live on the Progress tab — moved, not deleted.
 */

const SRC = resolve(process.cwd(), 'src')

/**
 * A comment explaining why a section moved quotes that section's name, so a
 * guard that greps raw text flags the explanation instead of a relapse.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n')
}

const read = (p: string) => stripComments(readFileSync(resolve(SRC, p), 'utf8'))
const DASH = read('sections/Dashboard.tsx')
const FOCUS = read('components/dashboard/TodayFocus.tsx')
const PLAN = read('components/dashboard/TodayPlan.tsx')
const STATS = read('sections/Stats.tsx')

describe('home answers "what do I do now" exactly once', () => {
  it('carries a single primary button', () => {
    const primaries = [...FOCUS.matchAll(/variant="primary"/g)].length
    // One in the "next step" state, one in the day-finished state — never two
    // on screen at the same time.
    expect(primaries).toBeLessThanOrEqual(2)
    expect(DASH, 'the page itself must not add a second primary').not.toContain('variant="primary"')
  })

  it('derives that action from the same checklist it renders below', () => {
    expect(FOCUS, 'home must not invent its own ranking').toContain('nextTask(plan)')
    expect(FOCUS).toContain('useTodayPlan()')
    expect(PLAN).toContain('useTodayPlan()')
  })

  it('says why the step matters and what comes after it', () => {
    expect(FOCUS).toContain('WHY[task.id]')
    expect(FOCUS).toContain('بعدها:')
  })

  it('has no quick-actions grid rebuilding what is already on the screen', () => {
    expect(DASH, 'this section duplicated three on-screen destinations').not.toContain('إجراءات سريعة')
  })
})

describe('nothing was orphaned by the cleanup', () => {
  it('keeps the only entry point to the study-time modal', () => {
    // AppShell owns the modal and hands the opener down as a prop; if the
    // dashboard stops calling it, the feature becomes unreachable.
    expect(DASH, 'StudyTimeModal has no other trigger in the app').toContain('onOpenStudyTime?.()')
    const shell = read('components/AppShell.tsx')
    expect(shell).toContain('onOpenStudyTime={() => setShowStudyTime(true)}')
    expect(shell).toContain('StudyTimeModal')
  })

  it('keeps that action a real touch target', () => {
    const at = DASH.indexOf('onOpenStudyTime?.()')
    const block = DASH.slice(at, at + 700)
    expect(block).toContain("minHeight: 'var(--tap-min)'")
  })

  it('moved the KPI cards, the insights and the badges to Progress rather than dropping them', () => {
    for (const [mark, what] of [['<StudyKpis', 'the KPI cards'], ['<SmartInsights', 'the insight cards'], ['<AchievementsPanel', 'the badges']]) {
      expect(STATS, `${what} must still be reachable`).toContain(mark)
    }
    // and home keeps a way to them
    expect(DASH).toContain("setActiveTab('stats')")
  })
})

describe('insights are ranked, capped and disclosed — not hidden', () => {
  const INSIGHTS = read('components/progress/SmartInsights.tsx')

  it('orders them by urgency rather than by construction order', () => {
    expect(INSIGHTS, 'the most actionable insight must come first').toMatch(/RANK[\s\S]{0,120}bad:\s*0/)
    expect(INSIGHTS).toContain('.sort((a, b) => RANK[a.kind] - RANK[b.kind])')
  })

  it('shows a bounded number up front', () => {
    expect(INSIGHTS).toContain('ranked.slice(0, 3)')
  })

  it('still renders every remaining insight behind a disclosure', () => {
    // slice(3) with a <details> means nothing is dropped — the user can open it.
    expect(INSIGHTS).toContain('ranked.slice(3)')
    expect(INSIGHTS).toContain('<details')
    expect(INSIGHTS).toContain('rest.map(')
  })
})

describe('motivational chrome can be switched off', () => {
  it('lets Focus Mode hide the quote', () => {
    expect(read('components/dashboard/QuoteTicker.tsx')).toContain('decor-flourish')
  })
})
