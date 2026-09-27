import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import '@/components/obs/obs.css'
import { useAppStore } from '@/store/useAppStore'
import { useObs, useMotionLevel } from '@/hooks/useObs'
import { ROLEPLAYS, findRoleplay } from '@/data/observatory/roleplays'
import { startRoleplay, closeRoleplay } from '@/features/observatory/roleplay'
import { peekIntent, takeIntent } from '@/features/observatory/intent'
import { CONTEXT_AR, DRILL_TITLE, shortDate } from '@/features/observatory/format'
import { stagger } from '@/features/observatory/motion'
import { LESSON_ITEMS } from '@/data/observatory/items'
import type { BuildRule } from '@/features/observatory/types'
import { RoleplayView } from '@/components/obs/practice/RoleplayView'
import { RoleplayReview } from '@/components/obs/practice/RoleplayReview'
import { DrillView } from '@/components/obs/practice/DrillView'
import { StatusStrip } from '@/components/obs/StatusStrip'
import { WorkspaceHead, Button, Chip, Meta } from '@/components/obs/ui'
import { IArrowRight, IChatsCircle, IArrowSquareOut, ITarget } from '@/components/obs/icons'

/* ── Practice ───────────────────────────────────────────────────────────────
   Immediate access to real-life situations: pick the one you are preparing
   for and you are in the conversation. Focused drills for recurring
   difficulties sit below; the exam simulator and older exercises are linked,
   not duplicated. */

type View = { kind: 'list' } | { kind: 'drill'; rule: BuildRule }

export default function Practice() {
  const [o, update] = useObs()
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const level = useMotionLevel()
  const { container, item } = stagger(level)
  const [view, setView] = useState<View>(() => {
    const i = peekIntent()
    return i?.kind === 'drill' ? { kind: 'drill', rule: i.rule } : { kind: 'list' }
  })
  // Hand-offs from Today / My Learning: open the named role-play or drill.
  useEffect(() => {
    const rp = takeIntent('roleplay')
    if (rp && findRoleplay(rp.scenarioId) && o.roleplay?.scenarioId !== rp.scenarioId) update((x) => startRoleplay(x, rp.scenarioId, Date.now()))
    takeIntent('drill')
  }, [o.roleplay?.scenarioId, update])

  const run = o.roleplay
  const sc = run ? findRoleplay(run.scenarioId) : undefined
  const open = (id: string) => {
    if (run && !run.done && run.scenarioId === id) return
    update((x) => startRoleplay(x, id, Date.now()))
    window.scrollTo({ top: 0 })
  }
  const back = () => update((x) => closeRoleplay(x, Date.now()))
  const lastDone = (id: string) => o.roleplays.filter((r) => r.scenarioId === id).map((r) => r.finishedAt).sort().pop()
  const [browsing, setBrowsing] = useState(false)

  if (view.kind === 'drill') {
    return <div className="o-root"><div className="o-page"><DrillView rule={view.rule} onBack={() => setView({ kind: 'list' })} /></div></div>
  }
  if (run && sc && !browsing) {
    return (
      <div className="o-root"><div className="o-page">
        <StatusStrip />
        {run.done
          ? <RoleplayReview sc={sc} run={run} onRestart={() => update((x) => startRoleplay(closeRoleplay(x, Date.now()), sc.id, Date.now()))} onBack={() => { back(); setBrowsing(false) }} />
          : <RoleplayView sc={sc} run={run} onBack={() => setBrowsing(true)} />}
      </div></div>
    )
  }

  const rules: BuildRule[] = ['v2', 'verb-final']
  const count = (r: BuildRule) => LESSON_ITEMS.flatMap((i) => i.builds).filter((b) => b.rule === r).length
  const weak = (r: BuildRule) => o.difficulties[r === 'v2' ? 'v2-inversion' : 'verb-final']?.count ?? 0

  return (
    <div className="o-root">
      <motion.div className="o-page" variants={container} initial="hidden" animate="show">
        <StatusStrip />
        <motion.div variants={item}>
          <WorkspaceHead kicker="OEFENEN · ECHTE SITUATIES" title="تدرّب على موقف حقيقي" nl="Wat gaat u binnenkort doen?"
            lede="اختر الموقف الذي تستعد له وادخل الحوار مباشرة. لا مقاطعة أثناء الكلام — الملاحظات تأتي في النهاية." />
        </motion.div>

        {run && !run.done && sc && (
          <motion.div variants={item} className="o-notice o-notice--info" style={{ marginBottom: 16 }}>
            <span className="o-notice__icon"><IChatsCircle size={20} /></span>
            <div className="o-grow">
              <strong>حوار غير مكتمل: {sc.titleAr}. </strong>{run.turns.length} من {sc.turns.length} ردود محفوظة.
              <div className="o-row" style={{ marginTop: 8 }}><Button size="sm" variant="secondary" onClick={() => setBrowsing(false)}>تابِع الحوار</Button></div>
            </div>
          </motion.div>
        )}

        <motion.ul variants={item} className="o-grid-scn o-list" aria-label="المواقف">
          {ROLEPLAYS.map((r) => {
            const t = lastDone(r.id)
            return (
              <li key={r.id}>
                <button type="button" className="o-card o-card--button o-scenario" onClick={() => { setBrowsing(false); open(r.id) }}>
                  <span className="o-row" style={{ justifyContent: 'space-between' }}>
                    <Chip tone="cobalt">{CONTEXT_AR[r.context]}</Chip>
                    <Meta>{`${r.turns.length} BEURTEN · ≈ ${r.turns.length * 2} MIN`}</Meta>
                  </span>
                  <strong className="o-h3">{r.titleAr}</strong>
                  <span className="o-nl-display is-italic" lang="nl" style={{ fontSize: '1.1rem', color: 'var(--o-cobalt-ink)' }}>{r.titleNl}</span>
                  <span className="o-small">{r.situationAr}</span>
                  <span className="o-row o-small" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <span>{t ? `آخر مرة: ${shortDate(t)}` : 'لم تجرّبه بعد'}</span>
                    <span className="o-link o-row" style={{ gap: 4 }}>ابدأ <IArrowRight size={16} flip /></span>
                  </span>
                </button>
              </li>
            )
          })}
        </motion.ul>

        <motion.section variants={item} style={{ marginTop: 32 }} aria-labelledby="drills-title">
          <h2 className="o-h3" id="drills-title">تمارين مركّزة</h2>
          <p className="o-small" style={{ marginBottom: 10 }}>لقواعد تتكرّر فيها الأخطاء. العدد بين القوسين = مرات تعثّرك المسجّلة.</p>
          <div className="o-grid-2">
            {rules.map((r) => (
              <button key={r} type="button" className="o-card o-card--button" onClick={() => setView({ kind: 'drill', rule: r })}>
                <span className="o-row" style={{ gap: 8 }}><ITarget size={20} /><strong>{DRILL_TITLE[r]}</strong></span>
                <span className="o-small">{count(r)} جمل · {weak(r) ? `تعثّرت ${weak(r)} مرات` : 'لا تعثّر مسجّل بعد'}</span>
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section variants={item} style={{ marginTop: 32 }} aria-labelledby="more-practice">
          <h2 className="o-h3" id="more-practice">تدريب أوسع</h2>
          <div className="o-row" style={{ marginTop: 8 }}>
            <Button variant="secondary" icon={IArrowSquareOut} onClick={() => setActiveTab('exam')}>محاكاة الامتحان (القراءة، الاستماع، الكتابة، التحدث)</Button>
            <Button variant="secondary" icon={IArrowSquareOut} onClick={() => setActiveTab('exercises')}>تمارين القواعد والمفردات</Button>
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
