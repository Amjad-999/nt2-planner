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
          {menuGroups.map((g) => (
            <div key={g.title || 'misc'} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {g.title && (
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 4 }}>{g.title}</div>
              )}
              {g.items.map((m) => (
                <button key={m.label} onClick={m.onClick} style={itemBtn}>
                  <span aria-hidden="true">{m.icon}</span>
                  <span style={{ flex: 1 }}>{m.label}</span>
                  {/* علامة أن هذا القسم يحتاج إنترنت — أوضح من فشل صامت لاحقًا */}
                  {m.live && <span aria-label="يحتاج إنترنت" title="يحتاج إنترنت" style={{ fontSize: '.66rem', color: 'var(--muted)' }}>●</span>}
                </button>
              ))}
            </div>
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

      {view === 'me' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>
            هذا ما أراه في بياناتك — بلا إنترنت، كله من داخل التطبيق:
          </p>
          {insights.map((ins, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ flexShrink: 0 }}>{ins.icon}</span>
              <span style={{ fontSize: '.84rem', color: 'var(--text)', lineHeight: 1.6 }}>
                {ins.text}
                {ins.tab && (
                  <button onClick={() => goTo(ins.tab!)} style={{ ...smallBtn, marginInlineStart: 6, padding: '1px 7px', fontSize: '.7rem' }}>
                    افتح
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'ask' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <form
            onSubmit={(e) => { e.preventDefault(); setAskQuery(askInput.trim()) }}
            style={{ display: 'flex', gap: 6 }}
          >
            <input
              className="form-in" value={askInput} onChange={(e) => setAskInput(e.target.value)}
              placeholder="مدينة، شخصية، مفهوم…" aria-label="ابحث في ويكيبيديا"
              style={{ fontSize: '.84rem', padding: '7px 10px' }}
            />
            <button type="submit" style={{ ...smallBtn, flexShrink: 0 }}>ابحثي</button>
          </form>

          {!askQuery ? (
            <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {res.ar && (
                    <div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 3 }}>بالعربية</div>
                      <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--text)', lineHeight: 1.7 }}>{res.ar.extract}</p>
                    </div>
                  )}
                  {res.nl && (
                    <div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 3 }}>بالهولندية</div>
                      <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.6, textAlign: 'left' }}>
                        {res.nl.extract}
                      </p>
                      <span dir="ltr" lang="nl" style={{ ...nlChip, display: 'inline-block', marginTop: 6 }}>{res.nl.title}</span>
                    </div>
                  )}
                  {!res.ar && !res.nl && (
                    <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text2)' }}>لا نتيجة.</p>
                  )}
                </div>
              )}
            </LiveResult>
          )}
        </div>
      )}

      {view === 'word' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <form
            onSubmit={(e) => { e.preventDefault(); setWordQuery(wordInput.trim().toLowerCase()) }}
            style={{ display: 'flex', gap: 6 }}
          >
            <input
              className="form-in" value={wordInput} onChange={(e) => setWordInput(e.target.value)}
              dir="ltr" lang="nl" placeholder="fiets, lopen, gezellig…" aria-label="كلمة هولندية"
              style={{ fontSize: '.84rem', padding: '7px 10px', fontFamily: 'var(--font-latin)' }}
            />
            <button type="submit" style={{ ...smallBtn, flexShrink: 0 }}>ابحثي</button>
          </form>

          {!wordQuery ? (
            <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span dir="ltr" lang="nl" style={nlChip}>{d.word}</span>
                    {d.typeAR && <span style={{ fontSize: '.78rem', color: 'var(--text2)' }}>{d.typeAR}</span>}
                  </div>
                  {d.ipa && (
                    <div style={{ fontSize: '.8rem', color: 'var(--text2)' }}>
                      النطق: <span dir="ltr" style={{ fontFamily: 'var(--font-latin)' }}>/{d.ipa}/</span>
                    </div>
                  )}
                  {d.syllables && (
                    <div style={{ fontSize: '.8rem', color: 'var(--text2)' }}>
                      المقاطع: <span dir="ltr" style={{ fontFamily: 'var(--font-latin)' }}>{d.syllables}</span>
                    </div>
                  )}
                  {d.senses.length > 0 && (
                    <div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 3 }}>المعاني</div>
                      {d.senses.map((s, i) => (
                        <p key={i} dir="ltr" lang="nl" style={{ margin: '0 0 3px', fontFamily: 'var(--font-latin)', fontSize: '.79rem', color: 'var(--text)', textAlign: 'left', lineHeight: 1.5 }}>{s}</p>
                      ))}
                    </div>
                  )}
                  {d.examples.length > 0 && (
                    <div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 3 }}>أمثلة حقيقية</div>
                      {d.examples.map((s, i) => (
                        <p key={i} dir="ltr" lang="nl" style={{ margin: '0 0 4px', fontFamily: 'var(--font-latin)', fontSize: '.79rem', color: 'var(--text2)', textAlign: 'left', lineHeight: 1.5 }}>{s}</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select
            className="form-in" value={city} onChange={(e) => setCity(e.target.value)}
            aria-label="اختر مدينة" style={{ fontSize: '.84rem', padding: '7px 10px' }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span aria-hidden="true" style={{ fontSize: '1.8rem' }}>{w.icon}</span>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{w.tempC}°</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text2)' }}>{w.ar} · رياح {w.windKmh} كم/س</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 3 }}>قوليها بالهولندية</div>
                  <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', fontSize: '.84rem', color: 'var(--text)', textAlign: 'left' }}>{w.phraseNL}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '.8rem', color: 'var(--text2)' }}>{w.phraseAR}</p>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: '.76rem', color: 'var(--muted)' }}>
                عناوين NOS الآن — اقرأها بصوت عالٍ، فهي تدريب قراءة يتجدّد يوميًّا:
              </p>
              {items.map((n, i) => (
                <a
                  key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                  dir="ltr" lang="nl"
                  style={{ fontFamily: 'var(--font-latin)', fontSize: '.8rem', color: 'var(--text)', textAlign: 'left', lineHeight: 1.5, textDecoration: 'none', borderBottom: '1px solid var(--glass-border)', paddingBottom: 6 }}
                >
                  {n.title}
                </a>
              ))}
            </div>
          )}
        </LiveResult>
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
