import { useEffect, useRef, useMemo, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { bubbleTransition } from './MascotAnimations'
import { useAppStore, generateTodayPlan } from '@/store/useAppStore'
import { MASCOT_NAME_AR } from '@/data/mascotDialogs'
import { CULTURE_FACTS, cultureFactForDay, type CultureFact } from '@/data/dutchCulture'
import { DUTCH_JOKES, jokeForDay, type DutchJoke } from '@/data/dutchJokes'
import { HELP_TOPICS } from '@/data/botHelp'
import type { WordBatch } from '@/hooks/useMascot'
import { LiveResult } from './LiveResult'
import { wikiLookup } from '@/features/world/wikipedia'
import { dutchWeather, DUTCH_CITIES } from '@/features/world/weather'
import { wiktionaryLookup } from '@/features/world/wiktionary'
import { dutchNews } from '@/features/world/news'
import { buildInsights } from '@/features/mascot/appInsight'

type View = 'menu' | 'tasks' | 'words' | 'culture' | 'joke' | 'help'
  | 'me' | 'ask' | 'weather' | 'news' | 'word'

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const itemBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', width: '100%', textAlign: 'start',
  background: 'var(--btn-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)',
  padding: '9px 10px', cursor: 'pointer', color: 'var(--text)', fontSize: 'var(--text-sm)',
  fontFamily: 'inherit', lineHeight: 'var(--lh-ui)',
}

const smallBtn: CSSProperties = {
  background: 'var(--btn-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-xs)',
  padding: '4px 10px', cursor: 'pointer', color: 'var(--text)', fontSize: 'var(--text-xs)', fontFamily: 'inherit',
}

const nlChip: CSSProperties = {
  fontFamily: 'var(--font-latin)', fontWeight: 'var(--fw-heading)', color: 'var(--orange-text)',
  background: 'var(--orange-l)', borderRadius: 'var(--r-xs)', padding: '2px 8px', fontSize: 'var(--text-xs)',
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
  const examWords = useAppStore((s) => s.examWords)
  const streak = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const prefs = useAppStore((s) => s.prefs)

  const todayTasks = useMemo(
    () => generateTodayPlan({ planDay, planStart, examDate, done, vocab, skill }).tasks,
    [planDay, planStart, examDate, done, vocab, skill],
  )

  const [fact, setFact] = useState<CultureFact>(() => cultureFactForDay(Date.now()))
  const [joke, setJoke] = useState<DutchJoke>(() => jokeForDay(Date.now()))

  // بحث ويكيبيديا وقاموس ويكاموس: نصّ الحقل منفصل عن الاستعلام المُرسَل،
  // فلا يُطلَق طلب شبكة مع كل ضغطة مفتاح — فقط عند التأكيد.
  const [askInput, setAskInput] = useState('')
  const [askQuery, setAskQuery] = useState('')
  const [wordInput, setWordInput] = useState('')
  const [wordQuery, setWordQuery] = useState('')
  const [city, setCity] = useState('amsterdam')

  const insights = useMemo(
    () => buildInsights({
      vocab, examWords, skill, streak, dailyHistory, done, examDate, planDay, planStart, prefs,
    }),
    [vocab, examWords, skill, streak, dailyHistory, done, examDate, planDay, planStart, prefs],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* التركيز عند الفتح والعودة عند الإغلاق.
     The panel renders BEFORE the launcher button in the DOM (it sits above it
     in a column), so a keyboard user who opened it with Enter would Tab past
     the launcher and out of the panel entirely — they had to Shift+Tab
     backwards to reach what they just opened. Same pattern SettingsModal
     already uses; not a focus trap, because this is a corner panel and not a
     modal that blocks the page. */
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => opener?.focus?.()
  }, [])

  const goTo = (tab: Parameters<typeof setActiveTab>[0]) => { setActiveTab(tab); onClose() }

  type MenuItem = { icon: string; label: string; onClick: () => void; live?: boolean }
  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'عنك وعن خطّتك',
      items: [
        { icon: '📊', label: 'كيف أدائي؟', onClick: () => setView('me') },
        { icon: '📋', label: 'مهام اليوم', onClick: () => setView('tasks') },
        { icon: '📖', label: 'كلمات درستها اليوم', onClick: () => setView('words') },
        { icon: '🧭', label: 'دليل التطبيق', onClick: () => setView('help') },
      ],
    },
    {
      title: 'عن هولندا والعالم',
      items: [
        { icon: '🔎', label: 'اسأليني عن أي شيء', onClick: () => setView('ask'), live: true },
        { icon: '🔤', label: 'تفاصيل كلمة هولندية', onClick: () => setView('word'), live: true },
        { icon: '🌤️', label: 'طقس هولندا الآن', onClick: () => setView('weather'), live: true },
        { icon: '📰', label: 'أخبار هولندا اليوم', onClick: () => setView('news'), live: true },
        { icon: '🇳🇱', label: 'معلومة عن هولندا', onClick: () => setView('culture') },
        { icon: '😹', label: 'نكتة هولندية', onClick: () => setView('joke') },
      ],
    },
    {
      title: '',
      items: [{ icon: '💃', label: `ارقصي يا ${MASCOT_NAME_AR}!`, onClick: onDance }],
    },
  ]

  return (
    <motion.div
      ref={panelRef}
      tabIndex={-1}
      role="dialog" aria-label={`مساعدة ${MASCOT_NAME_AR}`} dir="rtl"
      variants={reduced ? undefined : bubbleTransition}
      initial={reduced ? undefined : 'initial'}
      animate={reduced ? { opacity: 1 } : 'animate'}
      style={{
        /* 302 + the container's 18px inset is exactly 320px — flush against
           the opposite edge of the narrowest common phone, and over it on
           anything smaller. The min() keeps the panel inside the viewport. */
        width: 'min(302px, calc(100vw - 36px))', maxHeight: 440, overflowY: 'auto',
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        border: '1px solid var(--modal-border)',
        borderRadius: 'var(--r)',
        boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--orange-text)' }}>
          🐱 {MASCOT_NAME_AR} — مساعدتك الشخصية
        </span>
        <button
          onClick={onClose} aria-label="إغلاق"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 'var(--text-base)', lineHeight: 'var(--lh-none)', padding: 2 }}
        >
          ✕
        </button>
      </div>

      {view !== 'menu' && (
        <button onClick={() => setView('menu')} style={{ ...smallBtn, marginBottom: 'var(--sp-3)' }}>
          رجوع
        </button>
      )}

      {view === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {menuGroups.map((g) => (
            <div key={g.title || 'misc'} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {g.title && (
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginTop: 'var(--sp-1)' }}>{g.title}</div>
              )}
              {g.items.map((m) => (
                <button key={m.label} onClick={m.onClick} style={itemBtn}>
                  <span aria-hidden="true">{m.icon}</span>
                  <span style={{ flex: 1 }}>{m.label}</span>
                  {/* علامة أن هذا القسم يحتاج إنترنت — أوضح من فشل صامت لاحقًا */}
                  {m.live && <span aria-label="يحتاج إنترنت" title="يحتاج إنترنت" style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>●</span>}
                </button>
              ))}
            </div>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', fontSize: 'var(--text-xs)', color: 'var(--text2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={botWordReminders} onChange={toggleBotWordReminders} />
            ذكّريني بكلمات المهام المكتملة كل دقيقتين
          </label>
        </div>
      )}

      {view === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {todayTasks.length === 0 ? (
            <>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-arabic)' }}>
                أنجزت كل مهام اليوم 🎉 أنا فخورة بك!
              </p>
              <button onClick={onDance} style={itemBtn}>
                <span aria-hidden="true">💃</span> شاهد رقصة النصر
              </button>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                خطوة بخطوة — ابدأ بالأولى ثم علّمها ✓ في الخطة:
              </p>
              {todayTasks.slice(0, 6).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'baseline', fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-ui)' }}>
                  <span style={{ color: 'var(--orange-text)', fontWeight: 'var(--fw-cta)', flexShrink: 0 }}>{i + 1}.</span>
                  <span>
                    {t.name}
                    <span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}> — {t.mins} د</span>
                  </span>
                </div>
              ))}
              <button onClick={() => goTo('plan')} style={{ ...itemBtn, marginTop: 'var(--sp-2)', justifyContent: 'center' }}>
                افتح الخطة وابدأ
              </button>
            </>
          )}
        </div>
      )}

      {view === 'words' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {batches.length === 0 ? (
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-arabic)' }}>
              لا كلمات بعد اليوم — راجع بطاقات المفردات ثم أكمل مهمة،
              وسأجمع كلماتها هنا وأذكّرك بها كل دقيقتين 📖
            </p>
          ) : (
            batches.map((b, bi) => (
              <div key={bi}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 'var(--sp-1)' }}>
                  من مهمة «{b.task}»
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                  {b.words.map((w, wi) => (
                    <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
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

      {view === 'me' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
            هذا ما أراه في بياناتك — بلا إنترنت، كله من داخل التطبيق:
          </p>
          {insights.map((ins, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ flexShrink: 0 }}>{ins.icon}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-arabic)' }}>
                {ins.text}
                {ins.tab && (
                  <button onClick={() => goTo(ins.tab!)} style={{ ...smallBtn, marginInlineStart: 'var(--sp-2)', padding: '1px 7px', fontSize: 'var(--text-2xs)' }}>
                    افتح
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'ask' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); setAskQuery(askInput.trim()) }}
            style={{ display: 'flex', gap: 'var(--sp-2)' }}
          >
            <input
              className="form-in" value={askInput} onChange={(e) => setAskInput(e.target.value)}
              placeholder="مدينة، شخصية، مفهوم…" aria-label="ابحث في ويكيبيديا"
              style={{ fontSize: 'var(--text-sm)', padding: '7px 10px' }}
            />
            <button type="submit" style={{ ...smallBtn, flexShrink: 0 }}>ابحثي</button>
          </form>

          {!askQuery ? (
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--muted)', lineHeight: 'var(--lh-arabic)' }}>
              أبحث في ويكيبيديا بالعربية والهولندية معًا — تفهم المعنى وتتعلّم
              مصطلحه الهولندي في آن. مفيد جدًّا لامتحان KNM.
            </p>
          ) : (
            <LiveResult
              key={askQuery}
              load={() => wikiLookup(askQuery)}
              emptyText="لم أجد شيئًا بهذا الاسم. جرّب صياغة أخرى أو اسمًا هولنديًّا."
            >
              {(res) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  {res.ar && (
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 'var(--sp-1)' }}>بالعربية</div>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-arabic)' }}>{res.ar.extract}</p>
                    </div>
                  )}
                  {res.nl && (
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 'var(--sp-1)' }}>بالهولندية</div>
                      <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: 'var(--text-xs)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)', textAlign: 'left' }}>
                        {res.nl.extract}
                      </p>
                      <span dir="ltr" lang="nl" style={{ ...nlChip, display: 'inline-block', marginTop: 'var(--sp-2)' }}>{res.nl.title}</span>
                    </div>
                  )}
                  {!res.ar && !res.nl && (
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>لا نتيجة.</p>
                  )}
                </div>
              )}
            </LiveResult>
          )}
        </div>
      )}

      {view === 'word' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); setWordQuery(wordInput.trim().toLowerCase()) }}
            style={{ display: 'flex', gap: 'var(--sp-2)' }}
          >
            <input
              className="form-in" value={wordInput} onChange={(e) => setWordInput(e.target.value)}
              dir="ltr" lang="nl" placeholder="fiets, lopen, gezellig…" aria-label="كلمة هولندية"
              style={{ fontSize: 'var(--text-sm)', padding: '7px 10px', fontFamily: 'var(--font-latin)' }}
            />
            <button type="submit" style={{ ...smallBtn, flexShrink: 0 }}>ابحثي</button>
          </form>

          {!wordQuery ? (
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--muted)', lineHeight: 'var(--lh-arabic)' }}>
              أعطيك النطق بالأبجدية الصوتية، تقطيع المقاطع، نوع الكلمة، وأمثلة
              حقيقية من ويكاموس الهولندي.
            </p>
          ) : (
            <LiveResult
              key={wordQuery}
              load={() => wiktionaryLookup(wordQuery)}
              emptyText="لا مدخل هولنديًّا لهذه الكلمة في ويكاموس. تأكّد من الإملاء أو جرّب المصدر (الصيغة الأساسية)."
            >
              {(d) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    <span dir="ltr" lang="nl" style={nlChip}>{d.word}</span>
                    {d.typeAR && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text2)' }}>{d.typeAR}</span>}
                  </div>
                  {d.ipa && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text2)' }}>
                      النطق: <span dir="ltr" style={{ fontFamily: 'var(--font-latin)' }}>/{d.ipa}/</span>
                    </div>
                  )}
                  {d.syllables && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text2)' }}>
                      المقاطع: <span dir="ltr" style={{ fontFamily: 'var(--font-latin)' }}>{d.syllables}</span>
                    </div>
                  )}
                  {d.senses.length > 0 && (
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 'var(--sp-1)' }}>المعاني</div>
                      {d.senses.map((s, i) => (
                        <p key={i} dir="ltr" lang="nl" style={{ margin: '0 0 3px', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-xs)', color: 'var(--text)', textAlign: 'left', lineHeight: 'var(--lh-ui)' }}>{s}</p>
                      ))}
                    </div>
                  )}
                  {d.examples.length > 0 && (
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 'var(--sp-1)' }}>أمثلة حقيقية</div>
                      {d.examples.map((s, i) => (
                        <p key={i} dir="ltr" lang="nl" style={{ margin: '0 0 4px', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-xs)', color: 'var(--text2)', textAlign: 'left', lineHeight: 'var(--lh-ui)' }}>{s}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </LiveResult>
          )}
        </div>
      )}

      {view === 'weather' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <select
            className="form-in" value={city} onChange={(e) => setCity(e.target.value)}
            aria-label="اختر مدينة" style={{ fontSize: 'var(--text-sm)', padding: '7px 10px' }}
          >
            {DUTCH_CITIES.map((c) => (
              <option key={c.key} value={c.key}>{c.ar} — {c.nl}</option>
            ))}
          </select>

          <LiveResult
            key={city}
            load={() => dutchWeather(city)}
            emptyText="تعذّر جلب الطقس الآن."
          >
            {(w) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <span aria-hidden="true" style={{ fontSize: 'var(--glyph-md)' }}>{w.icon}</span>
                  <div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>{w.tempC}°</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text2)' }}>{w.ar} · رياح {w.windKmh} كم/س</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 'var(--sp-1)' }}>قوليها بالهولندية</div>
                  <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: 'var(--text-sm)', color: 'var(--text)', textAlign: 'left' }}>{w.phraseNL}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text2)' }}>{w.phraseAR}</p>
                </div>
                <span dir="ltr" lang="nl" style={{ ...nlChip, alignSelf: 'flex-start' }}>{w.nl}</span>
              </div>
            )}
          </LiveResult>
        </div>
      )}

      {view === 'news' && (
        <LiveResult
          load={() => dutchNews(5)}
          emptyText="تعذّر جلب الأخبار الآن — المصدر يمرّ بوسيط خارجي وقد يتوقّف أحيانًا."
        >
          {(items) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                عناوين NOS الآن — اقرأها بصوت عالٍ، فهي تدريب قراءة يتجدّد يوميًّا:
              </p>
              {items.map((n, i) => (
                <a
                  key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                  dir="ltr" lang="nl"
                  style={{ fontFamily: 'var(--font-latin)', fontSize: 'var(--text-xs)', color: 'var(--text)', textAlign: 'left', lineHeight: 'var(--lh-ui)', textDecoration: 'none', borderBottom: '1px solid var(--glass-border)', paddingBottom: 6 }}
                >
                  {n.title}
                </a>
              ))}
            </div>
          )}
        </LiveResult>
      )}

      {view === 'culture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-arabic)' }}>{fact.ar}</p>
          {fact.nl && <span dir="ltr" lang="nl" style={{ ...nlChip, alignSelf: 'flex-start' }}>{fact.nl}</span>}
          <button onClick={() => setFact(pick(CULTURE_FACTS))} style={smallBtn}>
            معلومة أخرى 🎲
          </button>
        </div>
      )}

      {view === 'joke' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-arabic)', textAlign: 'left' }}>
            {joke.nl}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>{joke.ar}</p>
          <button onClick={() => setJoke(pick(DUTCH_JOKES))} style={smallBtn}>
            نكتة أخرى 😹
          </button>
        </div>
      )}

      {view === 'help' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {HELP_TOPICS.map((h) => (
            <button key={h.tab} onClick={() => goTo(h.tab)} style={{ ...itemBtn, alignItems: 'flex-start' }}>
              <span aria-hidden="true">{h.icon}</span>
              <span>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>{h.title}</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text2)' }}>{h.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
