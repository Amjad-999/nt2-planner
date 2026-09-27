import { describe, it, expect } from 'vitest'
import { LESSON_ITEMS, findItem } from '@/data/observatory/items'
import { ROLEPLAYS } from '@/data/observatory/roleplays'
import { defaultObs, sanitizeObs, mergeObs } from '@/features/observatory/state'
import { checkTyped, checkBuild, tileOrder, usesExpression, classifyOwnSentence, retellCoverage, buildSentence } from '@/features/observatory/evaluate'
import { checkTurn, checkInversion, checkVerbFinal, checkFormal, checkPoliteness } from '@/features/observatory/checks'
import { evidenceOf, addUse, saveExpression } from '@/features/observatory/evidence'
import {
  startSession, completeStep, recordQuestion, setDraft, finishSession, pickItemId, paceRatio, parkSession,
  resumeDeferred, plannedCounts, estTotal, pickRecall, addActive,
} from '@/features/observatory/session'
import { noteDifficulty, observations } from '@/features/observatory/insights'
import { validateBackup } from '@/features/observatory/backup'
import { recReducer, initialRec } from '@/features/observatory/useRecorder'
import { resolveMotion } from '@/features/observatory/motion'
import type { ObsState } from '@/features/observatory/types'

const DAY = '2026-09-23'
const T0 = new Date('2026-09-23T09:00:00').getTime()
const apotheek = findItem('obs-apotheek')!

describe('content integrity', () => {
  it('every supporting sentence is an exact substring of its paragraph', () => {
    for (const item of LESSON_ITEMS) for (const q of item.questions) {
      const p = item.paragraphs[q.support.paragraph]
      expect(p, q.id).toBeTruthy()
      for (const s of q.support.sentences) expect(p.includes(s), `${q.id}: ${s}`).toBe(true)
      expect(q.options.some((o) => o.id === q.correct), q.id).toBe(true)
    }
  })
  it('ids are unique across items, questions, expressions, builds, role-plays', () => {
    const ids = [
      ...LESSON_ITEMS.map((i) => i.id),
      ...LESSON_ITEMS.flatMap((i) => i.questions.map((q) => q.id)),
      ...LESSON_ITEMS.flatMap((i) => i.expressions.map((x) => x.id)),
      ...LESSON_ITEMS.flatMap((i) => i.builds.map((b) => b.id)),
      ...ROLEPLAYS.map((r) => r.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('each expression example uses its own expression, and each cloze answer is recallable', () => {
    for (const item of LESSON_ITEMS) for (const x of item.expressions) {
      expect(usesExpression(x.example, x), x.id).toBe(true)
      expect(x.clozeNl.includes('___'), x.id).toBe(true)
      expect(checkTyped(x.answer, x.answer)).toBe('correct')
    }
  })
  it('role-play model answers raise no rule issue (the model must model correct Dutch)', () => {
    for (const rp of ROLEPLAYS) rp.turns.forEach((t, i) => {
      expect(checkTurn(t.modelNl, t, rp.formal), `${rp.id} turn ${i}`).toEqual([])
    })
  })
  it('UI-facing Dutch content is formal: no je/jij in texts, questions, models', () => {
    const texts = [
      ...LESSON_ITEMS.flatMap((i) => [...i.paragraphs, ...i.questions.map((q) => q.promptNl), ...i.expressions.map((x) => x.clozeNl)]),
      ...ROLEPLAYS.flatMap((r) => r.turns.flatMap((t) => [t.partnerNl, t.modelNl])),
    ]
    for (const t of texts) expect(checkFormal(t), t).toBeNull()
  })
})

describe('evaluate', () => {
  it('typed recall: exact, close (typo) and wrong', () => {
    expect(checkTyped('Verzetten', 'verzetten')).toBe('correct')
    expect(checkTyped('verzeten', 'verzetten')).toBe('close')
    expect(checkTyped('afzeggen', 'verzetten')).toBe('wrong')
    expect(checkTyped('  ', 'verzetten')).toBe('')
  })
  it('sentence build: correct, alternative order, targeted verb hint', () => {
    const b = apotheek.builds[0] // Morgen haal ik mijn medicijnen op
    expect(checkBuild([0, 1, 2, 3, 4], b).correct).toBe(true)
    const wrong = checkBuild([0, 2, 1, 3, 4], b) // Morgen ik haal …
    expect(wrong.correct).toBe(false)
    expect(wrong.hint).toBe('verb-second')
    const alt = findItem('obs-afspraak')!.builds[1]
    expect(checkBuild([0, 1, 2, 4, 3], alt).correct).toBe(true)
    expect(checkBuild([0, 1, 3, 2, 4], alt).hint).toBe('verb-final')
    expect(buildSentence([0, 1, 2, 3, 4], apotheek.builds[1])).toBe('Ik bel de apotheek, omdat ik een vraag over mijn medicijn heb.')
  })
  it('tile order is shuffled deterministically and never already solved', () => {
    for (const item of LESSON_ITEMS) for (const b of item.builds) {
      const o = tileOrder(b)
      expect(o).toEqual(tileOrder(b))
      expect(o.every((v, i) => v === i)).toBe(false)
      expect([...o].sort()).toEqual(b.tokens.map((_, i) => i))
    }
  })
  it('expression use handles split verbs', () => {
    const x = apotheek.expressions[0] // medicijnen ophalen
    expect(usesExpression('Ik haal morgen mijn medicijnen op.', x)).toBe(true)
    expect(usesExpression('Ik heb gisteren mijn medicijnen opgehaald.', x)).toBe(true)
    expect(usesExpression('Ik ga naar de apotheek.', x)).toBe(false)
  })
  it('own sentence: copies and immediate repetition do not count as independent', () => {
    const x = apotheek.expressions[0]
    const shown = [x.example, x.clozeNl.replace('___', x.answer)]
    expect(classifyOwnSentence('Dan kunt u uw medicijnen ophalen bij de apotheek.', x, shown)).toBe('copied')
    expect(classifyOwnSentence('Ik wil graag mijn medicijnen ophalen.', x, shown)).toBe('copied')
    expect(classifyOwnSentence('medicijnen ophalen', x, shown)).toBe('too-short')
    expect(classifyOwnSentence('Mijn buurvrouw is ziek, dus ik ga vanmiddag haar medicijnen ophalen.', x, shown)).toBe('independent')
    expect(classifyOwnSentence('Mijn buurvrouw is ziek en blijft thuis vandaag.', x, shown)).toBe('missing')
  })
  it('a near-copy of ONE sentence inside a long passage paragraph is still a copy', () => {
    const recept = apotheek.expressions[1]
    expect(classifyOwnSentence('De huisarts stuurt het recept naar de apotheek.', recept, apotheek.paragraphs)).toBe('copied')
    expect(classifyOwnSentence('Gisteren gaf mijn tandarts mij een recept voor pijnstillers.', recept, apotheek.paragraphs)).toBe('independent')
  })
  it('retell coverage finds key points by keyword only', () => {
    const hits = retellCoverage('De huisarts stuurt het recept. Ik neem mijn paspoort mee.', apotheek.retell.points)
    expect(hits).toEqual([0, 1])
  })
})

describe('language checks (conservative)', () => {
  it('flags the classic inversion error and leaves correct sentences alone', () => {
    expect(checkInversion('Morgen ik kan niet komen.')?.key).toBe('v2-inversion')
    expect(checkInversion('Op vrijdag ik moet werken.')?.key).toBe('v2-inversion')
    expect(checkInversion('Morgen kan ik niet komen.')).toBeNull()
    expect(checkInversion('Ik kan morgen niet komen.')).toBeNull()
  })
  it('flags a finite verb too early after omdat', () => {
    expect(checkVerbFinal('Ik bel u, omdat ik wil mijn afspraak verzetten.')?.key).toBe('verb-final')
    expect(checkVerbFinal('Ik bel u, omdat ik mijn afspraak wil verzetten.')).toBeNull()
  })
  it('formal address and politeness', () => {
    expect(checkFormal('Kun je mij helpen?')?.key).toBe('formal-u')
    expect(checkPoliteness('Ik wil mijn medicijnen.')?.key).toBe('politeness')
    expect(checkPoliteness('Ik wil graag mijn medicijnen.')).toBeNull()
  })
})

describe('evidence stages', () => {
  const rule = defaultObs().settings.activeRule
  const seed = apotheek.expressions[0]
  const base = saveExpression(defaultObs(), seed, apotheek, T0, true)
  it('saving or seeing is not mastery', () => {
    expect(evidenceOf(base.expressions[seed.id], rule).stage).toBe('seen')
  })
  it('seen → practised → used → active needs uses, contexts AND days', () => {
    let o: ObsState = addUse(base, seed.id, 'practised', 'gezondheid', 'ophalen', 'lesson', T0, DAY)
    expect(evidenceOf(o.expressions[seed.id], rule).stage).toBe('practised')
    o = addUse(o, seed.id, 'independent', 'gezondheid', 'a', 'lesson', T0 + 1, DAY)
    expect(evidenceOf(o.expressions[seed.id], rule).stage).toBe('used')
    o = addUse(o, seed.id, 'independent', 'gezondheid', 'b', 'words', T0 + 2, DAY)
    o = addUse(o, seed.id, 'independent', 'gezondheid', 'c', 'words', T0 + 3, DAY)
    const ev = evidenceOf(o.expressions[seed.id], rule)
    expect(ev.stage).toBe('used') // 3 uses but 1 context, 1 day
    expect(ev.missing).toEqual({ uses: 0, contexts: 1, days: 1 })
    o = addUse(o, seed.id, 'independent', 'thuis', 'd', 'words', T0 + 86400000, '2026-09-24')
    expect(evidenceOf(o.expressions[seed.id], rule).stage).toBe('active')
  })
  it('self-reports are shown but only count when the rule allows it', () => {
    let o = base
    for (let i = 0; i < 3; i++) o = addUse(o, seed.id, 'self-report', i ? 'werk' : 'thuis', 'x', 'words', T0 + i * 86400000, `2026-09-2${3 + i}`)
    expect(evidenceOf(o.expressions[seed.id], rule).stage).toBe('seen')
    expect(evidenceOf(o.expressions[seed.id], { ...rule, countSelfReports: true }).stage).toBe('active')
  })
})

describe('session flow', () => {
  const start = () => startSession(defaultObs(), apotheek, [], T0, DAY)
  it('plans honest counts and estimates by session length', () => {
    expect(plannedCounts(20)).toEqual({ q: 3, w: 2, b: 2 })
    expect(plannedCounts(25)).toEqual({ q: 3, w: 4, b: 2 })
    const o = start()
    expect(o.session!.questionIds).toHaveLength(3)
    expect(o.session!.wordIds).toHaveLength(4)
    expect(estTotal(o.session!)).toBeGreaterThanOrEqual(20)
    expect(estTotal(o.session!)).toBeLessThanOrEqual(30)
  })
  it('keeps position, answers and drafts; survives sanitising (reload)', () => {
    let o = start()
    o = completeStep(o, T0 + 1000)
    o = recordQuestion(o, 'q-apotheek-1', { choice: 'a', tries: 1, correct: false, help: 1 }, T0 + 2000)
    o = setDraft(o, 'retell', 'De huisarts stuurt', T0 + 3000)
    const back = sanitizeObs(JSON.parse(JSON.stringify(o)))
    expect(back.session!.stepIndex).toBe(1)
    expect(back.session!.answers.questions['q-apotheek-1'].help).toBe(1)
    expect(back.session!.drafts.retell).toBe('De huisarts stuurt')
  })
  it('an unfinished session from another day is parked, never dropped', () => {
    const o = startSession(start(), findItem('obs-afspraak')!, [], T0 + 86400000, '2026-09-24')
    expect(o.deferred).toHaveLength(1)
    expect(o.deferred[0].itemId).toBe('obs-apotheek')
    const back = resumeDeferred(o, o.deferred[0].id, T0 + 86400001)
    expect(back.session!.itemId).toBe('obs-apotheek')
    expect(back.deferred[0].itemId).toBe('obs-afspraak')
    expect(parkSession(back, T0).session).toBeNull()
  })
  it('finishing records actual time separately from the estimate', () => {
    let o = start()
    o = addActive(o, 5 * 60000, T0 + 1)
    const { o: done, record } = finishSession(o, ['x-recept'], T0 + 10)
    expect(done.session).toBeNull()
    expect(record!.actualMin).toBe(5)
    expect(record!.estMin).toBe(estTotal(o.session!))
    expect(done.history).toHaveLength(1)
  })
  it('picks the next unfinished item, then the least recent', () => {
    const o = defaultObs()
    expect(pickItemId(o, LESSON_ITEMS)).toBe(LESSON_ITEMS[0].id)
    const seen = { ...o, history: LESSON_ITEMS.map((it, i) => ({ ...finishSession(startSession(o, it, [], T0, DAY), [], T0 + i).record! })) }
    expect(pickItemId(seen, LESSON_ITEMS)).toBe(LESSON_ITEMS[0].id)
  })
  it('recall prefers earlier expressions, then vocab, then this session', () => {
    let o = defaultObs()
    expect(pickRecall(o, apotheek, []).map((t) => t.source)).toEqual(['session', 'session'])
    const vocab = [{ id: 'w1', dutch: 'huis', arabic: 'بيت', example: 'Mijn huis is groot.', due: 0 }]
    expect(pickRecall(o, apotheek, vocab)[0]).toMatchObject({ source: 'vocab', cue: 'Mijn ___ is groot.' })
    const other = findItem('obs-afspraak')!
    o = saveExpression(o, other.expressions[0], other, T0, true)
    o = addUse(o, other.expressions[0].id, 'practised', 'afspraken', 'verzetten', 'lesson', T0, DAY)
    expect(pickRecall(o, apotheek, vocab)[0].source).toBe('expression')
  })
  it('pace ratio appears only after three measured sessions', () => {
    const rec = (a: number) => ({ id: String(a), itemId: 'x', dayKey: DAY, finishedAt: a, estMin: 20, actualMin: a, questions: 3, firstTry: 0, builds: 2, buildsRight: 0, saved: [], retell: 'typed' as const, recalled: 0, recallTotal: 2 })
    expect(paceRatio([rec(10), rec(30)])).toBeNull()
    expect(paceRatio([rec(10), rec(30), rec(24)])).toBeCloseTo(1.2)
  })
})

describe('insights', () => {
  it('observations need repetition and always carry an action', () => {
    let o = defaultObs()
    o = noteDifficulty(o, 'v2-inversion', 'Morgen ik kan', T0)
    expect(observations(o)).toHaveLength(0)
    o = noteDifficulty(o, 'v2-inversion', 'Op vrijdag ik moet', T0 + 1)
    const obs = observations(o)
    expect(obs).toHaveLength(1)
    expect(obs[0].action).toEqual({ kind: 'drill', rule: 'v2' })
  })
})

describe('persistence contracts', () => {
  it('sanitize drops junk without dropping good evidence', () => {
    const o = sanitizeObs({
      settings: { motion: 'wild', skin: 'classic', sessionMinutes: 99 },
      history: [{ id: 'h1', itemId: 'obs-apotheek', dayKey: DAY, finishedAt: T0 }, { bad: true }],
      expressions: { 'x-recept': { nl: 'een recept', uses: [{ id: 'u1', at: T0, dayKey: DAY, kind: 'independent', context: 'gezondheid' }, 7] }, broken: 5 },
      notes: [{ id: 'n1', text: 'hallo' }, null],
    })
    expect(o.settings.motion).toBe('system')
    expect(o.settings.skin).toBe('classic')
    expect(o.settings.sessionMinutes).toBe(25)
    expect(o.history).toHaveLength(1)
    expect(Object.keys(o.expressions)).toEqual(['x-recept'])
    expect(o.expressions['x-recept'].uses).toHaveLength(1)
    expect(o.notes).toHaveLength(1)
  })
  it('merge unions evidence, keeps deletions, and never revives a finished session', () => {
    const a = startSession(defaultObs(), apotheek, [], T0, DAY)
    const finished = finishSession(a, [], T0 + 5)
    const b = {
      ...finished.o,
      notes: [{ id: 'n1', text: 'x', ref: '', createdAt: 1, updatedAt: 5, deleted: true }],
    }
    const aWithNote = { ...a, notes: [{ id: 'n1', text: 'x', ref: '', createdAt: 1, updatedAt: 2, deleted: false }] }
    const m = mergeObs(aWithNote, b, false)
    expect(m.session).toBeNull()
    expect(m.history).toHaveLength(1)
    expect(m.notes[0].deleted).toBe(true)
  })
})

describe('backup validation', () => {
  it('rejects empty, non-JSON, unrelated JSON and wrong types — before anything is applied', () => {
    expect(validateBackup('')).toEqual({ ok: false, problem: 'empty' })
    expect(validateBackup('{nope')).toEqual({ ok: false, problem: 'json' })
    expect(validateBackup('{}')).toEqual({ ok: false, problem: 'shape' })
    expect(validateBackup('{"foo":1,"bar":2,"baz":3}')).toEqual({ ok: false, problem: 'shape' })
    expect(validateBackup('{"vocab":"x","dailyHistory":{},"prefs":{}}')).toEqual({ ok: false, problem: 'types' })
  })
  it('accepts a wrapped real save and summarises it', () => {
    const r = validateBackup(JSON.stringify({ state: { vocab: [{}, {}], dailyHistory: { [DAY]: {} }, prefs: {}, observatory: { history: [1], expressions: { a: {} }, notes: [{ id: 'n' }, { id: 'm', deleted: true }] } }, version: 6 }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.summary).toMatchObject({ vocab: 2, sessions: 1, expressions: 1, notes: 1, days: 1 })
  })
})

describe('voice states', () => {
  it('walks ready → recording → processing → recorded ⇄ playing, with denied/error exits', () => {
    let s = initialRec()
    expect(s.status).toBe('idle')
    s = recReducer(s, { type: 'request' }); expect(s.status).toBe('requesting')
    expect(recReducer(s, { type: 'denied' }).status).toBe('denied')
    s = recReducer(s, { type: 'granted' }); expect(s.status).toBe('recording')
    s = recReducer(s, { type: 'tick', elapsed: 12 }); expect(s.elapsed).toBe(12)
    s = recReducer(s, { type: 'stop' }); expect(s.status).toBe('processing')
    s = recReducer(s, { type: 'saved', id: 'r1', durationSec: 12 }); expect(s.status).toBe('recorded')
    s = recReducer(s, { type: 'play' }); expect(s.status).toBe('playing')
    s = recReducer(s, { type: 'ended' }); expect(s.status).toBe('recorded')
    expect(recReducer(s, { type: 'error', error: 'missing' }).status).toBe('error')
    expect(recReducer(s, { type: 'reset' }).status).toBe('idle')
  })
  it('a saved recording id restores as "recorded" on return', () => {
    expect(initialRec('r9', 40).status).toBe('recorded')
  })
})

describe('motion preference', () => {
  it('the OS reduce-motion setting always wins', () => {
    expect(resolveMotion('expressive', true)).toBe('reduced')
    expect(resolveMotion('system', false)).toBe('standard')
    expect(resolveMotion('expressive', false)).toBe('expressive')
  })
})
