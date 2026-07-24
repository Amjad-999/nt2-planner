import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { bubbleTransition } from './MascotAnimations'
import { useAppStore, generateTodayPlan } from '@/store/useAppStore'
import { MASCOT_NAME_AR } from '@/data/mascotDialogs'
import { CULTURE_FACTS, cultureFactForDay, type CultureFact } from '@/data/dutchCulture'
import { DUTCH_JOKES, jokeForDay, type DutchJoke } from '@/data/dutchJokes'
import { HELP_TOPICS } from '@/data/botHelp'
import type { WordBatch } from '@/hooks/useMascot'

type View = 'menu' | 'tasks' | 'words' | 'culture' | 'joke' | 'help'

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const itemBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'start',
  background: 'var(--btn-bg)', border: '1px solid var(--glass-border)', borderRadius: 10,
  padding: '9px 10px', cursor: 'pointer', color: 'var(--text)', fontSize: '.85rem',
  fontFamily: 'inherit', lineHeight: 1.5,
}

const smallBtn: CSSProperties = {
  background: 'var(--btn-bg)', border: '1px solid var(--glass-border)', borderRadius: 8,
  padding: '4px 10px', cursor: 'pointer', color: 'var(--text)', fontSize: '.76rem', fontFamily: 'inherit',
}

const nlChip: CSSProperties = {
  fontFamily: 'var(--font-latin)', fontWeight: 600, color: 'var(--orange-ink)',
  background: 'var(--orange-l)', borderRadius: 8, padding: '2px 8px', fontSize: '.78rem',
}

interface Props {
  batches: WordBatch[]
  onClose: () => void
  onDance: () => void
}

/** لوحة مساعدة كاتيا: مهام اليوم، كلمات اليوم، معلومة هولندية، نكتة،
 *  دليل التطبيق، ورقصة عند الطلب. Popover غير حاجب (بلا focus trap)،
 *  يُغلق بـ Escape أو بزر الإغلاق. */
export function MascotPanel({ batches, onClose, onDance }: Props) {
  const reduced = useReducedMotion()
  const [view, setView] = useState<View>('menu')

  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const botWordReminders = useAppStore((s) => s.botWordReminders)
  const toggleBotWordReminders = useAppStore((s) => s.toggleBotWordReminders)
  const done = useAppStore((s) => s.done)
  const planDay = useAppStore((s) => s.planDay)
  const planStart = useAppStore((s) => s.planStart)
  const examDate = useAppStore((s) => s.examDate)
  const vocab = useAppStore((s) => s.vocab)
  const skill = useAppStore((s) => s.skill)

  const todayTasks = useMemo(
    () => generateTodayPlan({ planDay, planStart, examDate, done, vocab, skill }).tasks,
    [planDay, planStart, examDate, done, vocab, skill],
  )

  const [fact, setFact] = useState<CultureFact>(() => cultureFactForDay(Date.now()))
  const [joke, setJoke] = useState<DutchJoke>(() => jokeForDay(Date.now()))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const goTo = (tab: Parameters<typeof setActiveTab>[0]) => { setActiveTab(tab); onClose() }

  const menu: { icon: string; label: string; onClick: () => void }[] = [
    { icon: '📋', label: 'مهام اليوم', onClick: () => setView('tasks') },
    { icon: '📖', label: 'كلمات درستها اليوم', onClick: () => setView('words') },
    { icon: '🇳🇱', label: 'معلومة عن هولندا', onClick: () => setView('culture') },
    { icon: '😹', label: 'نكتة هولندية', onClick: () => setView('joke') },
    { icon: '🧭', label: 'دليل التطبيق', onClick: () => setView('help') },
    { icon: '💃', label: `ارقصي يا ${MASCOT_NAME_AR}!`, onClick: onDance },
  ]

  return (
    <motion.div
      role="dialog" aria-label={`مساعدة ${MASCOT_NAME_AR}`} dir="rtl"
      variants={reduced ? undefined : bubbleTransition}
      initial={reduced ? undefined : 'initial'}
      animate={reduced ? { opacity: 1 } : 'animate'}
      style={{
        width: 302, maxHeight: 440, overflowY: 'auto',
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        border: '1px solid var(--modal-border)',
        borderRadius: 'var(--r)',
        boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '.85rem', fontWeight: 'var(--fw-heading)', color: 'var(--orange-ink)' }}>
          🐱 {MASCOT_NAME_AR} — مساعدتك الشخصية
        </span>
        <button
          onClick={onClose} aria-label="إغلاق"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', lineHeight: 1, padding: 2 }}
        >
          ✕
        </button>
      </div>

      {view !== 'menu' && (
        <button onClick={() => setView('menu')} style={{ ...smallBtn, marginBottom: 10 }}>
          رجوع
        </button>
      )}

      {view === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {menu.map((m) => (
            <button key={m.label} onClick={m.onClick} style={itemBtn}>
              <span aria-hidden="true">{m.icon}</span> {m.label}
            </button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '.76rem', color: 'var(--text2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={botWordReminders} onChange={toggleBotWordReminders} />
            ذكّريني بكلمات المهام المكتملة كل دقيقتين
          </label>
        </div>
      )}

      {view === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {todayTasks.length === 0 ? (
            <>
              <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--text)', lineHeight: 1.6 }}>
                أنجزت كل مهام اليوم 🎉 أنا فخورة بك!
              </p>
              <button onClick={onDance} style={itemBtn}>
                <span aria-hidden="true">💃</span> شاهد رقصة النصر
              </button>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 4px', fontSize: '.78rem', color: 'var(--muted)' }}>
                خطوة بخطوة — ابدأ بالأولى ثم علّمها ✓ في الخطة:
              </p>
              {todayTasks.slice(0, 6).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: '.84rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  <span style={{ color: 'var(--orange-ink)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span>
                    {t.name}
                    <span style={{ color: 'var(--muted)', fontSize: '.76rem' }}> — {t.mins} د</span>
                  </span>
                </div>
              ))}
              <button onClick={() => goTo('plan')} style={{ ...itemBtn, marginTop: 6, justifyContent: 'center' }}>
                افتح الخطة وابدأ
              </button>
            </>
          )}
        </div>
      )}

      {view === 'words' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {batches.length === 0 ? (
            <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text)', lineHeight: 1.6 }}>
              لا كلمات بعد اليوم — راجع بطاقات المفردات ثم أكمل مهمة،
              وسأجمع كلماتها هنا وأذكّرك بها كل دقيقتين 📖
            </p>
          ) : (
            batches.map((b, bi) => (
              <div key={bi}>
                <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                  من مهمة «{b.task}»
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {b.words.map((w, wi) => (
                    <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.84rem', color: 'var(--text)' }}>
                      <span dir="ltr" lang="nl" style={nlChip}>{w.nl}</span>
                      <span>{w.ar}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'culture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: '.86rem', color: 'var(--text)', lineHeight: 1.7 }}>{fact.ar}</p>
          {fact.nl && <span dir="ltr" lang="nl" style={{ ...nlChip, alignSelf: 'flex-start' }}>{fact.nl}</span>}
          <button onClick={() => setFact(pick(CULTURE_FACTS))} style={smallBtn}>
            معلومة أخرى 🎲
          </button>
        </div>
      )}

      {view === 'joke' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.6, textAlign: 'left' }}>
            {joke.nl}
          </p>
          <p style={{ margin: 0, fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.7 }}>{joke.ar}</p>
          <button onClick={() => setJoke(pick(DUTCH_JOKES))} style={smallBtn}>
            نكتة أخرى 😹
          </button>
        </div>
      )}

      {view === 'help' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {HELP_TOPICS.map((h) => (
            <button key={h.tab} onClick={() => goTo(h.tab)} style={{ ...itemBtn, alignItems: 'flex-start' }}>
              <span aria-hidden="true">{h.icon}</span>
              <span>
                <strong style={{ display: 'block', fontSize: '.82rem' }}>{h.title}</strong>
                <span style={{ fontSize: '.76rem', color: 'var(--text2)' }}>{h.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
