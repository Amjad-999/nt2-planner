import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { EXAM_READING, EXAM_LISTENING } from '@/data/examContent'
import { PASS_THRESHOLD } from '@/data/phases'
import {
  MOCK_MINUTES, SKILL_AR, SKILL_NL, SKILL_ORDER,
  buildReport, formatClock, isExpired, progressPct, remainingMs, scoreFromState,
} from '@/features/exam/mock'
import type { SkillKey } from '@/store/types'

/**
 * لوحة الامتحان الكامل: مؤقّت لكل مهارة، حفظ تلقائي، وتقرير مقارن.
 *
 * The panel owns the clock and nothing else. Answers are given in the normal
 * skill tabs and already persist on every keystroke, so this panel can be
 * closed, reloaded or crashed without losing work — on reopening it reads the
 * session back out of the store and the countdown continues where it was.
 *
 * The clock ticks in local state via an interval, never with Date.now() during
 * render, which is the project rule.
 */

const box: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 14,
  padding: '16px 18px',
  marginBottom: 12,
}

function Btn({ children, onClick, tone = 'ghost', disabled }: {
  children: React.ReactNode; onClick: () => void; tone?: 'ghost' | 'primary' | 'danger'; disabled?: boolean
}) {
  const bg = tone === 'primary' ? 'var(--orange)' : 'var(--btn-bg)'
  // Button label is text: the danger state uses the AA-safe red, not the fill red.
  const fg = tone === 'primary' ? 'var(--on-primary)' : tone === 'danger' ? 'var(--red-text)' : 'var(--text)'
  const bc = tone === 'primary' ? 'var(--orange)' : tone === 'danger' ? 'var(--red)' : 'var(--border2)'
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${bc}`, background: bg, color: fg,
        fontSize: 'var(--text-sm)', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

/**
 * Ticks once a second while a session is open. Returns epoch ms.
 *
 * The clock is read inside the interval callback, never during render, so this
 * respects the project rule against Date.now() in render. The value can be up
 * to one second stale on the first frame after a session starts, which is why
 * the caller clamps the remaining time to the skill's full duration.
 */
function useClock(active: boolean, sessionId: string | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active, sessionId])
  return now
}

export function MockExamPanel({ onGoToSkill }: { onGoToSkill?: (skill: SkillKey) => void }) {
  const s = useAppStore()
  const session = s.mockSession
  const now = useClock(!!session, session?.id ?? null)

  const lastRun = s.mockRuns.length ? s.mockRuns[s.mockRuns.length - 1] : null

  /* ── no session: the start screen ── */
  if (!session) {
    return (
      <div>
        <div style={box}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            الامتحان الكامل
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', margin: '0 0 10px', lineHeight: 1.7 }}>
            أربع مهارات بالترتيب، لكلٍّ منها مؤقّت خاص. تُجيب في تبويب المهارة كالعادة، وهذه اللوحة تُدير الوقت وتحسب النتيجة.
            إجاباتك تُحفَظ لحظة بلحظة، فإن أغلقت التطبيق أو انقطع الاتصال تُكمل من حيث توقّفت.
          </p>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 10 }}>
            هذه المدد للتدريب، وليست المدد الرسمية المعلنة. تختلف الأخيرة بين الدورات.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {SKILL_ORDER.map((k) => (
              <div key={k} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text)' }}>{SKILL_AR[k]}</span>
                <span style={{ color: 'var(--muted)' }}> — {MOCK_MINUTES[k]} د</span>
              </div>
            ))}
          </div>
          <Btn tone="primary" onClick={() => s.startMock(Date.now())}>ابدأ الامتحان الكامل</Btn>
        </div>

        {lastRun && (
          <div style={box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>آخر محاولة مكتملة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: lastRun.total >= PASS_THRESHOLD ? 'var(--green-text)' : 'var(--orange-text)' }}>
                {lastRun.total}
              </div>
            </div>
            {SKILL_ORDER.map((k) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--text2)', margin: '3px 0' }}>
                <span>{SKILL_AR[k]}</span>
                <span>{lastRun.scores[k] ?? '—'}</span>
              </div>
            ))}
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 8 }}>
              عدد المحاولات المسجّلة: {s.mockRuns.length}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── live session ── */
  // Clamped so a one-second-stale clock can never show more than the allotted time.
  const left = Math.min(remainingMs(session, now), session.minutes[session.skill] * 60_000)
  const expired = isExpired(session, now)
  const live = scoreFromState(s, session.skill, { reading: EXAM_READING, listening: EXAM_LISTENING })
  const report = buildReport(session, s.skill, PASS_THRESHOLD)

  return (
    <div>
      <div style={{ ...box, borderColor: expired ? 'var(--red)' : 'var(--orange)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>المهارة الحالية</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>{SKILL_AR[session.skill]}</div>
            <div dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              {SKILL_NL[session.skill]}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              <span aria-hidden>{expired ? '✕ ' : '⏱ '}</span>{expired ? 'انتهى الوقت' : 'الوقت المتبقّي'}
            </div>
            <div dir="ltr" style={{ fontFamily: 'var(--font-latin)', fontSize: '2rem', fontWeight: 700, lineHeight: 1.2,
              color: expired ? 'var(--red-text)' : left < 120_000 ? 'var(--orange-text)' : 'var(--text)' }}>
              {formatClock(left)}
            </div>
          </div>
        </div>

        <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden', margin: '12px 0 6px' }}>
          <div style={{ width: `${progressPct(session)}%`, height: '100%', background: 'var(--orange)', transition: 'width .3s' }} />
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          المهارات المسلَّمة: {report.rows.length} من {session.order.length}
        </div>

        {expired && (
          <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--red)', background: 'var(--red-l)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
            انتهى وقت هذه المهارة. سلّمها للمتابعة. لن يُحسب ما تكتبه بعد الآن في الامتحان الحقيقي.
          </div>
        )}
      </div>

      <div style={box}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>الدرجة المحسوبة الآن</div>
        {live === null ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}>
            لا توجد إجابات بعد في هذه المهارة. اذهب إلى تبويبها وأجِب، ثم عُد إلى هنا وسلّم.
          </p>
        ) : (
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: live >= PASS_THRESHOLD ? 'var(--green-text)' : 'var(--orange-text)' }}>{live}</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {onGoToSkill && (
            <Btn onClick={() => onGoToSkill(session.skill)}>اذهب إلى {SKILL_AR[session.skill]}</Btn>
          )}
          <Btn tone="primary" disabled={live === null} onClick={() => s.submitMockSkill(live ?? 0, Date.now())}>
            سلّم {SKILL_AR[session.skill]}
          </Btn>
          <Btn tone="danger" onClick={() => { if (confirm('إلغاء الامتحان الكامل؟ إجاباتك تبقى محفوظة.')) s.cancelMock() }}>
            إلغاء
          </Btn>
        </div>
      </div>

      {report.rows.length > 0 && (
        <div style={box}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>ما سلّمته حتى الآن</div>
          {report.rows.map((r) => (
            <div key={r.skill} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)', margin: '5px 0' }}>
              <span style={{ color: 'var(--text2)' }}>
                <span aria-hidden style={{ color: r.passed ? 'var(--green-text)' : 'var(--red-text)' }}>{r.passed ? '✔' : '✕'}</span> {SKILL_AR[r.skill]}
              </span>
              <span style={{ color: 'var(--text)' }}>
                {r.score}
                <span style={{ color: 'var(--muted)' }}> (أفضل سابق {r.prevBest}{r.delta >= 0 ? ` +${r.delta}` : ` ${r.delta}`})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
