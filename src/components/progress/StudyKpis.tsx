import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, totalLearnedWords, avgBestScore, sumLastNDays, sumPrevNDays } from '@/store/useAppStore'
import { PASS_THRESHOLD } from '@/data/phases'
import { weeklyChange } from '@/features/progress/insights'
import { KpiCard } from '@/components/KpiCard'
import { todayKey, dayKeyOffset } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { springCardAt } from '@/lib/animations'

type KpiItem = {
  cls: string; icon: string; label: string; value: string | number; delta: string; dCls: 'up' | 'down' | 'flat'
  editable?: boolean; editKind?: 'number' | 'date'; editRaw?: string; min?: number; max?: number
  onSave?: (v: string) => void; onEditClick?: () => void
}

/**
 * مؤشّرات الدراسة — the five numbers (minutes today and this week, words
 * mastered, exam average, streak), with in-place correction of logged
 * minutes. Moved from the home screen to Progress: they describe the past,
 * while home is about the next action.
 */
export function StudyKpis() {
  const vocab = useAppStore((s) => s.vocab)
  const skill = useAppStore((s) => s.skill)
  const streak = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const setDayMinutes = useAppStore((s) => s.setDayMinutes)
  const studyDayMinutes = useAppStore((s) => s.prefs.studyDayMinutes)
  const [weekEdit, setWeekEdit] = useState(false)
  const reduced = useReducedMotion()

  const todayM = dailyHistory[todayKey()]?.mins ?? 0
  const weekM = sumLastNDays(dailyHistory, 'mins', 7)
  const lastWM = sumPrevNDays(dailyHistory, 'mins', 7, 7)
  const dWeek = weekM - lastWM
  const totW = totalLearnedWords(vocab)
  const hasAttempts = Object.values(skill).some(s => s.attempts > 0 || s.best > 0)
  const bestNT2 = avgBestScore(skill)

  const kpis: KpiItem[] = [
    { cls: 'k2', icon: '⏱️', label: 'دقائق اليوم', value: todayM, delta: todayM >= studyDayMinutes ? 'هدف اليوم محقّق' : `تحتاج ${Math.max(0, studyDayMinutes - todayM)} د`, dCls: todayM >= studyDayMinutes ? 'up' : 'flat',
      editable: true, editKind: 'number', editRaw: String(todayM), min: 0, max: 600,
      onSave: (v) => { setDayMinutes(todayKey(), parseInt(v) || 0) } },
    { cls: 'k3', icon: '📊', label: 'دقائق الأسبوع', value: weekM, delta: `${weeklyChange(weekM, lastWM)}${lastWM ? ' مقابل الأسبوع الماضي' : ''}`, dCls: dWeek > 0 ? 'up' : dWeek < 0 ? 'down' : 'flat',
      editable: true, onEditClick: () => setWeekEdit((o) => !o) },
    { cls: 'k4', icon: '📚', label: 'كلمات متقنة', value: `${totW.learned}/${totW.all}`, delta: totW.learned ? `${Math.round((totW.learned / Math.max(1, totW.all)) * 100)}% نسبة الإتقان` : 'ابدأ المراجعة', dCls: 'flat' },
    { cls: 'k5', icon: '🎯', label: 'متوسط أفضل نتائج التدريب', value: hasAttempts ? `${bestNT2}%` : '—', delta: !hasAttempts ? 'ابدأ بمحاولة تدريب' : bestNT2 >= PASS_THRESHOLD ? '✓ بلغت هدف التدريب' : '◐ واصل التدريب وراجع الأخطاء', dCls: hasAttempts && bestNT2 >= PASS_THRESHOLD ? 'up' : 'flat' },
    { cls: 'k6', icon: '🔥', label: 'مواظبة', value: `${streak.count} يوم`, delta: 'أيام الدراسة المتتالية', dCls: 'flat' },
  ]

  return (
    <>
      {/* دخول نابض متدرّج — البطاقات تستقرّ كأجسام */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(165px, 100%),1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
        {kpis.map((k, i) => (
          <motion.div
            key={k.cls}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springCardAt(i)}
            /* display:flex يمرّر تمدّد صفّ الشبكة إلى البطاقة، فتنتهي بطاقات
               الصفّ الواحد عند الارتفاع نفسه. */
            style={{ display: 'flex' }}
          >
            <KpiCard cls={k.cls} icon={k.icon} label={k.label} value={k.value} delta={k.delta} deltaClass={k.dCls} editable={k.editable} editKind={k.editKind} editRaw={k.editRaw} min={k.min} max={k.max} onSave={k.onSave} onEditClick={k.onEditClick} />
          </motion.div>
        ))}
      </div>

      {weekEdit && (
        <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--text)' }}>عدّل دقائق آخر 7 أيام</div>
            <button type="button" className="btn btn--ghost" onClick={() => setWeekEdit(false)} aria-label="إغلاق تعديل الأسبوع">✕</button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {Array.from({ length: 7 }, (_, i) => {
              const key = dayKeyOffset(-i)
              const mins = dailyHistory[key]?.mins ?? 0
              const lbl = i === 0 ? 'اليوم' : i === 1 ? 'أمس' : `قبل ${i} يوم`
              return (
                <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', fontSize: 'var(--text-xs)', color: 'var(--text2)' }}>
                  <span>{lbl}</span>
                  <input type="number" min={0} max={600} defaultValue={mins}
                    onChange={(e) => setDayMinutes(key, parseInt(e.target.value) || 0)}
                    aria-label={`دقائق ${lbl}`}
                    style={{ width: 72, minHeight: 44, padding: 'var(--sp-2)', border: '1px solid var(--border2)', borderRadius: 'var(--r-xs)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }} />
                </label>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
