import { motion } from 'framer-motion'
import { useAppStore, weakestSkill } from '@/store/useAppStore'
import { isFsrsLearned } from '@/features/vocab/fsrs-lite'
import { LEARNED_BOX, SKILL_AR } from '@/data/phases'
import { useNow } from '@/hooks/useNow'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { breathePulse, pressSpring, pressTransition, springCardAt } from '@/lib/animations'
import { SKILL_NL, headlineMock } from './lastMock'
import type { TabId } from '@/store/types'

interface CardProps {
  index: number
  icon: string
  label: string
  value: string
  hint: string
  tone: 'brand' | 'warn' | 'good'
  onClick: () => void
  cta: string
}

function FocusCard({ index, icon, label, value, hint, tone, onClick, cta }: CardProps) {
  const reduced = useReducedMotion()
  /* Every colour-coded state is paired with its own icon (critical rule 1) —
     the border tint is a reinforcement, never the signal itself. */
  const accent = tone === 'warn' ? 'var(--amber)' : tone === 'good' ? 'var(--green)' : 'var(--orange)'

  return (
    /* الدخول النابض على الغلاف؛ الضغط على الزرّ نفسه بنابض أسرع بلا تأخير */
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springCardAt(index)}
      style={{ display: 'flex' }}
    >
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduced ? undefined : pressSpring}
      transition={pressTransition}
      aria-label={`${label}: ${value}. ${cta}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4, minHeight: 44,
        padding: '14px 16px', borderRadius: 'var(--r-sm)', textAlign: 'start',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderInlineStart: `3px solid ${accent}`,
        cursor: 'pointer', fontFamily: 'inherit', width: '100%',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.78rem', color: 'var(--muted)' }}>
        <span aria-hidden="true" style={{ fontSize: '1rem' }}>{icon}</span>
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)', fontSize: '1.25rem',
          fontWeight: 700, color: 'var(--text)', lineHeight: 1.25,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.5 }}>{hint}</span>
    </motion.button>
    </motion.div>
  )
}

/**
 * The bottom half of the landing slab: what to actually DO today. Rendered
 * flush against JourneyHero (no top border, no gap) so the hero flows
 * straight into real exam-prep content instead of ending at a divider.
 */
export function TodayFocus({ onStartSession }: { onStartSession: () => void }) {
  const vocab = useAppStore((s) => s.vocab)
  const skill = useAppStore((s) => s.skill)
  const mockRuns = useAppStore((s) => s.mockRuns)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const reduced = useReducedMotion()
  const now = useNow()

  const focus = weakestSkill(skill)
  const due = vocab.filter((w) => (w.due ?? 0) <= now && !(w.fsrs_state !== undefined ? isFsrsLearned(w) : w.box >= LEARNED_BOX)).length
  const last = headlineMock(skill, mockRuns)

  const go = (tab: TabId) => () => setActiveTab(tab)

  const links: { label: string; icon: string; tab: TabId }[] = [
    { label: 'القواعد', icon: '📐', tab: 'grammar' },
    { label: 'محاكاة الامتحان', icon: '📝', tab: 'exam' },
  ]

  return (
    <section
      aria-label="تركيز اليوم"
      style={{
        padding: '20px 28px 24px',
        borderRadius: '0 0 calc(var(--r) + 4px) calc(var(--r) + 4px)',
        background: 'var(--surface3)',
        border: '1px solid var(--glass-border)',
        borderTop: 'none',
        boxShadow: 'var(--elev-2)',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: 'grid', gap: 12, marginBottom: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        }}
      >
        <FocusCard
          index={0} icon="🧭" tone="brand"
          label="مهارة اليوم"
          value={`${SKILL_NL[focus]} · ${SKILL_AR[focus]}`}
          hint="أضعف مهاراتك حاليًّا — ابدأ بها اليوم."
          cta="افتح تمارين هذه المهارة"
          onClick={go('exercises')}
        />
        <FocusCard
          index={1} icon={due > 0 ? '⏰' : '✅'} tone={due > 0 ? 'warn' : 'good'}
          label="مفردات مستحقّة"
          value={due > 0 ? `${due} كلمة` : 'لا شيء الآن'}
          hint={due > 0 ? 'وصلت موعد المراجعة وفق جدولة FSRS.' : 'أضف كلمات جديدة لتوسيع رصيدك.'}
          cta="افتح المفردات"
          onClick={go('vocab')}
        />
        <FocusCard
          index={2} icon={last ? '🎯' : '🚀'} tone={last ? 'good' : 'brand'}
          label="آخر محاكاة"
          value={last ? `${last.score}%` : 'لم تبدأ بعد'}
          hint={last ? last.label : 'أول محاكاة امتحان تعطيك خطّ الأساس.'}
          cta="افتح محاكاة الامتحان"
          onClick={go('exam')}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* الإجراء الأساسي الوحيد في الصفحة — نبضة تنفّس هادئة تجذب العين
            بلا دوران ولا وميض */}
        <motion.button
          type="button"
          onClick={onStartSession}
          animate={reduced ? undefined : breathePulse}
          whileTap={reduced ? undefined : pressSpring}
          transition={pressTransition}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            minHeight: 48, padding: '0 24px', borderRadius: 14,
            background: 'var(--grad-primary)', color: 'var(--on-primary)',
            border: '1px solid var(--btn-border)', boxShadow: 'var(--elev-2)',
            fontFamily: 'inherit', fontSize: '.95rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">▶</span>
          ابدأ جلسة اليوم
        </motion.button>

        {links.map((l) => (
          <motion.button
            key={l.tab}
            type="button"
            onClick={go(l.tab)}
            whileTap={reduced ? undefined : pressSpring}
            transition={pressTransition}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              minHeight: 44, padding: '0 18px', borderRadius: 14,
              background: 'var(--btn-bg)', border: '1px solid var(--btn-border)',
              color: 'var(--text2)', fontFamily: 'inherit', fontSize: '.88rem',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">{l.icon}</span>
            {l.label}
          </motion.button>
        ))}
      </div>
    </section>
  )
}
