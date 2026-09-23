import { motion } from 'framer-motion'
import '@/components/obs/obs.css'
import { useAppStore } from '@/store/useAppStore'
import { useObs, useMotionLevel } from '@/hooks/useObs'
import { useNow } from '@/hooks/useNow'
import { observations, type Observation } from '@/features/observatory/insights'
import { stageCounts, STAGE_AR, STAGE_ORDER } from '@/features/observatory/evidence'
import { setIntent } from '@/features/observatory/intent'
import { stagger } from '@/features/observatory/motion'
import { mins } from '@/features/observatory/format'
import { demoHistory } from '@/data/observatory/demo'
import { StatusStrip } from '@/components/obs/StatusStrip'
import { HistoryList } from '@/components/obs/learning/HistoryList'
import { NotesPanel } from '@/components/obs/learning/NotesPanel'
import { PlanEditor } from '@/components/obs/learning/PlanEditor'
import { ResourcesPanel } from '@/components/obs/learning/ResourcesPanel'
import { WorkspaceHead, Button, Notice, Meta } from '@/components/obs/ui'
import { IArrowRight, IArrowSquareOut, IInfo } from '@/components/obs/icons'

/* ── My Learning ────────────────────────────────────────────────────────────
   Evidence of actual work, a few observations that each lead to a practice
   activity, notes, resources and a plan the learner edits. Demonstration
   data, when switched on, lives in its own labelled block and is never
   mixed into real counts. */

export default function Learning() {
  const [o] = useObs()
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const now = useNow()
  const level = useMotionLevel()
  const { container, item } = stagger(level)
  const obs = observations(o)
  const counts = stageCounts(o)
  const totalMin = o.history.reduce((n, h) => n + h.actualMin, 0)
  const recordings = o.attempts.filter((a) => a.recordingId).length
  const written = Object.values(o.expressions).reduce((n, e) => n + e.uses.filter((u) => u.kind === 'independent').length, 0)

  const act = (ob: Observation) => {
    const a = ob.action
    if (a.kind === 'drill') { setIntent({ kind: 'drill', rule: a.rule }); setActiveTab('practice') }
    else if (a.kind === 'roleplay') { setIntent({ kind: 'roleplay', scenarioId: a.scenarioId }); setActiveTab('practice') }
    else if (a.kind === 'recall') { setIntent({ kind: 'recall' }); setActiveTab('words') }
    else if (a.kind === 'use-words') { setIntent({ kind: 'use-words' }); setActiveTab('words') }
    else setActiveTab('today')
  }

  const demo = o.settings.showDemo ? demoHistory(now) : null

  return (
    <div className="o-root">
      <motion.div className="o-page" variants={container} initial="hidden" animate="show">
        <StatusStrip />
        <motion.div variants={item}>
          <WorkspaceHead kicker="LEREN · WAT U ECHT DEED" title="تعلّمي" nl="Uw bewijs, uw plan"
            lede="سجل عملك الفعلي، وملاحظات قليلة تقودك إلى تدريب محدد، وخطة بسيطة تعدّلها بنفسك. لا نسب مئوية ولا توقعات." />
        </motion.div>

        <motion.section variants={item} className="o-evidence o-evidence--wide" aria-label="ملخص الأدلة">
          <div><b>{o.history.length}</b><span>جلسات مكتملة</span></div>
          <div><b>{mins(totalMin)}</b><span>دقائق فعلية مقيسة</span></div>
          <div><b>{written}</b><span>جمل استخدام مستقل</span></div>
          <div><b>{recordings}</b><span>تسجيلات محفوظة</span></div>
          <div><b>{o.roleplays.length}</b><span>حوارات مكتملة</span></div>
          <div><b>{counts.active}</b><span>تعابير «نشِطة»</span></div>
        </motion.section>
        <p className="o-small" style={{ margin: '6px 0 24px' }}>
          التعابير حسب الحالة: {STAGE_ORDER.map((s) => `${STAGE_AR[s]} ${counts[s]}`).join(' · ')}
        </p>

        <div className="o-learning-grid">
          <div className="o-stack">
            <motion.section variants={item} className="o-plane" aria-labelledby="obs-title">
              <h2 className="o-h3" id="obs-title">ملاحظات من عملك</h2>
              {obs.length === 0 ? (
                <p className="o-small">لا ملاحظات بعد. تظهر هنا فقط صعوبات تكرّرت مرتين على الأقل في تمارينك المسجّلة.</p>
              ) : (
                <ul className="o-list" style={{ marginTop: 10 }}>
                  {obs.map((ob) => (
                    <li key={ob.id} className="o-card">
                      <strong>{ob.titleAr}</strong>
                      <span className="o-small">{ob.evidenceAr}</span>
                      <div><Button size="sm" variant="secondary" iconEnd={IArrowRight} flipEnd onClick={() => act(ob)}>{ob.actionAr}</Button></div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>

            <motion.section variants={item} className="o-plane" aria-labelledby="hist-title">
              <h2 className="o-h3" id="hist-title" style={{ marginBottom: 10 }}>سجلّ العمل</h2>
              <HistoryList sessions={o.history} roleplays={o.roleplays} attempts={o.attempts} />
            </motion.section>

            {demo && (
              <motion.section variants={item} className="o-plane o-demo" aria-labelledby="demo-title">
                <Notice tone="warn" title="مثال — ليس تقدّمك.">
                  بيانات تجريبية لتوضيح شكل السجل بعد أسابيع. لا تُحفظ ولا تُزامَن ولا تدخل في أي عدد. أطفئها من «الإعدادات».
                </Notice>
                <h2 className="o-h3" id="demo-title" style={{ margin: '12px 0 10px' }}>سجلّ تجريبي</h2>
                <HistoryList sessions={demo.sessions} roleplays={demo.roleplays} demo />
              </motion.section>
            )}

            <motion.section variants={item} className="o-plane" aria-labelledby="notes-title">
              <h2 className="o-h3" id="notes-title" style={{ marginBottom: 10 }}>ملاحظاتي</h2>
              <NotesPanel />
            </motion.section>
          </div>

          <div className="o-stack">
            <motion.section variants={item} className="o-plane" aria-labelledby="plan-title">
              <h2 className="o-h3" id="plan-title" style={{ marginBottom: 10 }}>خطتي</h2>
              <PlanEditor />
              <hr className="o-divider" />
              <Meta>MEER PLANNING</Meta>
              <div className="o-row" style={{ marginTop: 8 }}>
                <Button size="sm" variant="secondary" icon={IArrowSquareOut} onClick={() => setActiveTab('plan')}>خطة الكتب (184 درسًا)</Button>
                <Button size="sm" variant="secondary" icon={IArrowSquareOut} onClick={() => setActiveTab('stats')}>التحليلات</Button>
                <Button size="sm" variant="secondary" icon={IArrowSquareOut} onClick={() => setActiveTab('grammar')}>القواعد</Button>
              </div>
            </motion.section>

            <motion.section variants={item} className="o-plane" aria-labelledby="res-title">
              <h2 className="o-h3" id="res-title" style={{ marginBottom: 4 }}>مصادر</h2>
              <p className="o-small o-row" style={{ gap: 6, marginBottom: 12 }}><IInfo size={16} />روابط خارجية كما هي في التطبيق، بلا تواريخ تحقّق مخترعة.</p>
              <ResourcesPanel />
            </motion.section>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
