import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useObs, useMotionLevel } from '@/hooks/useObs'
import { useNow } from '@/hooks/useNow'
import { todayKey } from '@/lib/utils'
import { LESSON_ITEMS, findItem } from '@/data/observatory/items'
import { findRoleplay, ROLEPLAYS } from '@/data/observatory/roleplays'
import {
  estTotal, remainingEst, paceRatio, pickItemId, startSession, parkSession, resumeDeferred,
  discardDeferred, plannedCounts, EST, minutesToday, stepLabel,
} from '@/features/observatory/session'
import { stageCounts } from '@/features/observatory/evidence'
import { arWeekday } from '@/features/observatory/format'
import { setIntent } from '@/features/observatory/intent'
import { stagger } from '@/features/observatory/motion'
import { TodayHero, type HeroVariant } from './TodayHero'
import { SessionSequence } from './SessionSequence'
import { TopicPicker } from './TopicPicker'
import { StatusStrip } from '../StatusStrip'
import { Button } from '../ui'
import { ILightbulb, IArrowRight } from '../icons'

/* Today home: hero (what + next), then the session sequence and unfinished
   work, then two quiet cards (help, evidence). Scheduled time and actual time
   are always labelled as such and never summed together. */

export function TodayHome({ onOpenLesson }: { onOpenLesson: () => void }) {
  const [o, update] = useObs()
  const vocab = useAppStore((s) => s.vocab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const now = useNow()
  const day = todayKey(new Date(now))
  const level = useMotionLevel()
  const { container, item: itemV } = stagger(level)
  const [picking, setPicking] = useState(false)

  const run = o.session
  const runItem = run ? findItem(run.itemId) : undefined
  const nextItem = findItem(pickItemId(o, LESSON_ITEMS))!
  const doneToday = o.history.filter((h) => todayKey(new Date(h.finishedAt)) === day)
  const pace = paceRatio(o.history)

  const variant: HeroVariant = run
    ? (!runItem ? 'missing' : run.dayKey !== day ? 'earlier' : 'resume')
    : doneToday.length ? 'done' : o.history.length === 0 ? 'first' : 'start'
  const heroItem = run ? runItem : variant === 'done' ? findItem(doneToday[doneToday.length - 1].itemId) : nextItem

  const c = plannedCounts(o.settings.sessionMinutes)
  const planned = run ? estTotal(run)
    : Math.round((heroItem?.kind === 'listen' ? EST.listen : EST.read) + c.q * EST.question + c.w * EST.word + c.b * EST.build + EST.retell + 2 * EST.recall + EST.review)
  const baseEst = run && variant !== 'missing' ? remainingEst(run) : planned
  const est = pace ? Math.round(baseEst * pace) : baseEst
  const estLabel = pace
    ? `≈ ${est} دقيقة — تقدير معدَّل حسب جلساتك الأخيرة (${pace.toFixed(1)}× التقدير الأساسي). يُحفظ مكانك إن توقفت.`
    : `≈ ${est} دقيقة (تقدير) — توقّف متى شئت، ويُحفظ مكانك.`

  const begin = (itemId = nextItem.id) => {
    const it = findItem(itemId)!
    update((x) => startSession(x, it, vocab.map((v) => ({ id: v.id, dutch: v.dutch, arabic: v.arabic, example: v.example, due: v.due })), Date.now(), todayKey()))
    onOpenLesson()
  }
  const extension = variant === 'done' && heroItem
    ? ROLEPLAYS.find((r) => r.context === heroItem.context || r.expressionIds.some((id) => heroItem.expressions.some((x) => x.id === id)))
    : undefined

  const primary = {
    first: { label: 'ابدأ جلستك الأولى', onClick: () => begin() },
    start: { label: 'ابدأ جلسة اليوم', onClick: () => begin() },
    resume: { label: 'تابِع الجلسة', onClick: onOpenLesson },
    earlier: { label: `أكمِل جلسة ${run ? arWeekday(run.dayKey) : ''}`, onClick: onOpenLesson },
    missing: { label: 'ابدأ جلسة جديدة', onClick: () => begin() },
    done: extension
      ? { label: `اختياري: حوار «${extension.titleAr}»`, onClick: () => { setIntent({ kind: 'roleplay', scenarioId: extension.id }); setActiveTab('practice') } }
      : { label: 'راجع كلماتك', onClick: () => setActiveTab('words') },
  }[variant]

  const secondary = variant === 'resume'
    ? { label: 'ليس الآن', onClick: () => update((x) => parkSession(x, Date.now())) }
    : variant === 'earlier'
      ? { label: 'ابدأ موضوع اليوم', onClick: () => begin() }
      : variant === 'first' || variant === 'start'
        ? { label: 'موضوع آخر', onClick: () => setPicking(true) }
        : undefined

  const counts = stageCounts(o)
  const independent = Object.values(o.expressions).reduce((n, e) => n + e.uses.filter((u) => u.kind === 'independent').length, 0)
  const recordings = o.attempts.filter((a) => a.recordingId).length
  const rpLive = o.roleplay && !o.roleplay.done ? findRoleplay(o.roleplay.scenarioId) : undefined

  return (
    <motion.div className="o-page" variants={container} initial="hidden" animate="show">
      <StatusStrip />
      <motion.div variants={itemV}>
        <TodayHero
          variant={variant} item={heroItem} now={now} sessionNo={o.history.length + (variant === 'done' ? 0 : 1)}
          estMin={est} estLabel={estLabel} nextLabel={run ? stepLabel(run) : undefined}
          earlierDay={run ? arWeekday(run.dayKey) : undefined}
          done={doneToday[doneToday.length - 1]} primary={primary} secondary={secondary}
          extensionNote={variant === 'done' ? `منجز اليوم: ${Math.round(minutesToday(o, day))} دقيقة فعلية. ${extension ? 'الحوار اختياري — يمكنك التوقف هنا.' : ''} غدًا: «${nextItem.topicAr}».` : undefined}
        />
      </motion.div>

      <div className="o-today-grid">
        <motion.section variants={itemV} className="o-plane" aria-labelledby="seq-title">
          <SessionSequence
            title={variant === 'done' ? `جلسة الغد: ${nextItem.topicAr}` : undefined}
            run={variant === 'done' || variant === 'missing' ? null : run}
            item={variant === 'done' ? nextItem : heroItem} planned={c} pace={pace} minutesToday={minutesToday(o, day)} />
          {(o.deferred.length > 0 || rpLive) && (
            <>
              <hr className="o-divider" />
              <h2 className="o-h3" id="unfinished-title">أعمال غير مكتملة</h2>
              <p className="o-small">محفوظة كما تركتها — بلا مواعيد نهائية.</p>
              <ul className="o-list" style={{ marginTop: 10 }} aria-labelledby="unfinished-title">
                {o.deferred.map((d) => {
                  const it = findItem(d.itemId)
                  return (
                    <li key={d.id} className="o-card">
                      <strong>{it ? it.topicAr : 'محتوى غير متاح'} <span className="o-small">· من يوم {arWeekday(d.dayKey)}</span></strong>
                      <span className="o-small">{it ? `توقفت عند: ${stepLabel(d)}` : 'أُزيل هذا النص من التطبيق؛ إجاباتك السابقة في السجل.'}</span>
                      <div className="o-row">
                        {it && <Button size="sm" variant="secondary" onClick={() => { update((x) => resumeDeferred(x, d.id, Date.now())); onOpenLesson() }}>تابِعها</Button>}
                        <Button size="sm" variant="ghost" onClick={() => update((x) => discardDeferred(x, d.id, Date.now()))}>أزِلها من القائمة</Button>
                      </div>
                    </li>
                  )
                })}
                {rpLive && (
                  <li className="o-card">
                    <strong>حوار: {rpLive.titleAr}</strong>
                    <span className="o-small">{o.roleplay!.turns.length} من {rpLive.turns.length} ردود مكتوبة</span>
                    <div className="o-row"><Button size="sm" variant="secondary" onClick={() => setActiveTab('practice')}>تابِع الحوار</Button></div>
                  </li>
                )}
              </ul>
            </>
          )}
        </motion.section>

        <div className="o-stack">
          <motion.section variants={itemV} className="o-plane o-plane--quiet" style={{ border: '1px solid var(--o-line)' }} aria-labelledby="help-title">
            <h2 className="o-h3 o-row" id="help-title" style={{ gap: 8 }}><ILightbulb size={20} />إن تعثّرت</h2>
            <p className="o-small">في كل سؤال مساعدة على ثلاث درجات، تفتحها أنت عند الحاجة:</p>
            <ol className="o-ladder">
              <li><span className="o-help__n">1</span>تلميح: الكلمة المفتاحية ومكان البحث</li>
              <li><span className="o-help__n">2</span>السؤال نفسه بهولندية أبسط</li>
              <li><span className="o-help__n">3</span>{o.settings.assistLang === 'ar' ? 'شرح المطلوب بالعربية' : 'الشرح بالعربية (مُطفأ في الإعدادات)'}</li>
            </ol>
            <p className="o-small" style={{ marginTop: 8 }}>لا تُكشف الإجابة قبل أن تحاول. النص والمفردات متاحة في «لوحة السياق» داخل الدرس.</p>
          </motion.section>

          <motion.section variants={itemV} className="o-plane o-plane--quiet" style={{ border: '1px solid var(--o-line)' }} aria-labelledby="ev-title">
            <h2 className="o-h3" id="ev-title">دليل تعلّمك</h2>
            {o.history.length === 0 && independent === 0 ? (
              <p className="o-small">لا يوجد سجل بعد. بعد جلستك الأولى ستظهر هنا أعمالك الفعلية — لا نسب ولا تقديرات.</p>
            ) : (
              <div className="o-evidence">
                <div><b>{o.history.length}</b><span>جلسات مكتملة</span></div>
                <div><b>{independent}</b><span>جمل كتبتها بنفسك</span></div>
                <div><b>{recordings}</b><span>تسجيلات صوتية</span></div>
              </div>
            )}
            {counts.active > 0 && <p className="o-small">{counts.active} تعابير صارت «نشِطة» حسب قاعدتك.</p>}
            <Button size="sm" variant="ghost" iconEnd={IArrowRight} flipEnd onClick={() => setActiveTab('learning')}>كل الأدلة في «تعلّمي»</Button>
          </motion.section>
        </div>
      </div>

      {picking && <TopicPicker o={o} onClose={() => setPicking(false)} onPick={(id) => { setPicking(false); begin(id) }} />}
    </motion.div>
  )
}
