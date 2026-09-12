import { useAppStore } from '@/store/useAppStore'
import { useTicker } from '@/hooks/useTicker'
import { todayKey } from '@/lib/utils'
import { BLOCK_KIND_AR, type DayBlockPlan } from '@/features/plan/blocks'
import {
  blockStartsAt, blocksSignature, formatClock, formatDuration, formatMinutes, isStale, positionOf,
  toSessionBlock,
} from '@/features/plan/timer'
import { AR_BLOCK, countAr } from '@/lib/arabicCount'
import { LESSON_STATUS_AR, LESSON_STATUS_ICON, statusOf } from '@/features/plan/progress'
import { lessonById, sectionTitle } from '@/data/curriculum'
import { Callout } from '@/components/ui/Callout'

/**
 * المؤقّت الحيّ: المهمّة الحالية، العدّ التنازلي، والمهمّة القادمة.
 *
 * Every number on this card is derived from the stored `startedAt` against the
 * current wall clock on each tick — nothing is decremented and nothing is
 * cached. Closing the tab, reloading, or letting the phone sleep changes only
 * how often it repaints, never what it says.
 */

const CHIP: React.CSSProperties = {
  fontSize: 'var(--text-sm)', padding: '3px 9px', borderRadius: 'var(--r-pill)',
  border: '1px solid var(--border2)', color: 'var(--text2)', whiteSpace: 'nowrap',
}

const BTN: React.CSSProperties = {
  minHeight: 44, padding: '8px 16px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)',
  background: 'var(--btn-bg)', border: '1px solid var(--border2)', color: 'var(--text)',
}

export function ProgramTimer({ blocks }: { blocks: DayBlockPlan | null }) {
  const session = useAppStore((s) => s.studyProgram.session)
  const lessons = useAppStore((s) => s.studyProgram.lessons)
  const startStudyDay = useAppStore((s) => s.startStudyDay)
  const pauseStudyDay = useAppStore((s) => s.pauseStudyDay)
  const resumeStudyDay = useAppStore((s) => s.resumeStudyDay)
  const skipStudyBlock = useAppStore((s) => s.skipStudyBlock)
  const restartStudyBlock = useAppStore((s) => s.restartStudyBlock)
  const endStudyDay = useAppStore((s) => s.endStudyDay)
  const setLessonStatus = useAppStore((s) => s.setLessonStatus)
  const now = useTicker()
  const today = todayKey()

  const shell = (children: React.ReactNode) => (
    <section
      aria-label="مؤقّت اليوم"
      style={{
        padding: '18px 22px 20px', marginBottom: 'var(--sp-4)',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderInlineStart: '4px solid var(--orange)',
        borderRadius: 'var(--r)', boxShadow: 'var(--elev-1)',
      }}
    >
      {children}
    </section>
  )

  if (!blocks || blocks.blocks.length === 0) {
    return shell(<p style={{ margin: 0, color: 'var(--text2)' }}>لا مهام مجدولة لليوم.</p>)
  }

  const stale = session ? isStale(session, now, today) : false

  if (!session || stale) {
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>يوم اليوم جاهز</h3>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>
            {countAr(blocks.blocks.length, AR_BLOCK)}، منها {formatMinutes(blocks.focusMinutes)} تركيزًا
            و {formatMinutes(blocks.breakMinutes)} استراحات.
            {stale && ' الجلسة السابقة انتهت صلاحيّتها — ابدأ من جديد.'}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => startStudyDay(today, blocks.blocks.map(toSessionBlock), Date.now())}
            style={{ ...BTN, background: 'var(--orange)', border: '1px solid var(--orange)', color: '#fff' }}
          >
            ابدأ اليوم الآن
          </button>
        </div>
      </div>,
    )
  }

  const pos = positionOf(session, now)

  /* الخطة قد تكون تغيّرت بعد بدء اليوم (تعليم قسم، تعديل مدّة، تغيير ترتيب).
     المؤقّت يواصل على لقطته حتى لا تقفز الساعة، لكن الفارق يُعلَن لا يُخفى. */
  const planChanged = blocksSignature(session.blocks) !== blocksSignature(blocks.blocks)
  const rebuildBanner = planChanged ? (
    <Callout tone="warn" density="compact">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
      <span><strong style={{ color: 'var(--amber-text)' }}>تغيّرت الخطة</strong> بعد بدء اليوم. المؤقّت يعمل على الترتيب القديم.</span>
      <button
        type="button"
        onClick={() => startStudyDay(today, blocks.blocks.map(toSessionBlock), Date.now())}
        style={{ ...BTN, minHeight: 'var(--tap-min)', padding: '5px 12px' }}
      >
        أعد بناء اليوم
      </button>
      </div>
    </Callout>
  ) : null

  if (pos.finished) {
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--green-text)' }}>
          <span aria-hidden>✔</span> انتهى وقت اليوم
        </h3>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
          علّم حالة دروس اليوم قبل الإغلاق، ثم أنهِ الجلسة.
        </p>
        <div><button type="button" onClick={endStudyDay} style={BTN}>أنهِ الجلسة</button></div>
      </div>,
    )
  }

  const current = pos.current!
  const isBreak = current.kind === 'break'
  const blockMs = current.minutes * 60000
  const blockPct = blockMs > 0 ? Math.round(((blockMs - pos.remainingInBlockMs) / blockMs) * 100) : 0
  const nextStartsAt = pos.next ? blockStartsAt(session, pos.index + 1, now) : 0

  return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {rebuildBanner}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>
          المهمّة الحالية
        </h3>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <span style={CHIP}>{BLOCK_KIND_AR[current.kind]}</span>
          <span style={CHIP}>الكتلة {pos.index + 1} من {session.blocks.length}</span>
          {pos.paused && <span style={{ ...CHIP, color: 'var(--amber-text)', border: '1px solid var(--amber)' }}>
            <span aria-hidden>❚❚</span> متوقّف
          </span>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <div
          role="timer"
          aria-live="off"
          aria-label={`المتبقّي في ${current.titleAr}: ${formatDuration(pos.remainingInBlockMs)}`}
          style={{
            fontSize: 'var(--text-4xl)', fontWeight: 'var(--fw-cta)', lineHeight: 'var(--lh-tight)',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '.02em',
            color: isBreak ? 'var(--green-text)' : 'var(--orange-text)',
            direction: 'ltr',
          }}
        >
          {formatDuration(pos.remainingInBlockMs)}
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <div style={{ fontWeight: 'var(--fw-cta)', color: 'var(--text)', fontSize: 'var(--text-base)' }}>{current.titleAr}</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', marginTop: 'var(--sp-1)', lineHeight: 'var(--lh-arabic)' }}>{current.detailAr}</div>
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 'var(--r-xs)', background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{
          width: `${blockPct}%`, height: '100%',
          background: isBreak ? 'var(--green)' : 'var(--orange)', transition: 'width .5s linear',
        }} />
      </div>

      {current.lessonIds.length > 0 && (current.kind === 'new' || current.kind === 'close') && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {current.lessonIds.map((id) => {
            const l = lessonById(id)
            const st = statusOf(lessons, id)
            return (
              <li key={id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap',
                padding: '8px 10px', borderRadius: 'var(--r-sm)',
                background: 'var(--btn-bg)', border: '1px solid var(--border)',
              }}>
                <span style={{ flex: '1 1 150px', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
                  {l ? `${sectionTitle(l.sectionId)} · الدرس ${l.indexInSection}` : id}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
                  <span aria-hidden>{LESSON_STATUS_ICON[st]}</span> {LESSON_STATUS_AR[st]}
                </span>
                {(['mastered', 'review', 'weak'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setLessonStatus(id, s)}
                    aria-pressed={st === s}
                    aria-label={`${LESSON_STATUS_AR[s]}: ${l ? `الدرس ${l.indexInSection}` : id}`}
                    style={{
                      minHeight: 'var(--tap-min)', padding: '3px 10px', borderRadius: 'var(--r-xs)', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 'var(--text-sm)',
                      background: st === s ? 'var(--orange-l)' : 'transparent',
                      border: `1px solid ${st === s ? 'var(--orange)' : 'var(--border2)'}`,
                      color: st === s ? 'var(--orange-text)' : 'var(--text2)',
                    }}
                  >
                    <span aria-hidden>{LESSON_STATUS_ICON[s]}</span> {LESSON_STATUS_AR[s]}
                  </button>
                ))}
              </li>
            )
          })}
        </ul>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap',
        paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 'var(--text-sm)', color: 'var(--text2)',
      }}>
        <span>
          {pos.next
            ? <>التالي: <strong style={{ color: 'var(--text)' }}>{pos.next.titleAr}</strong> بعد{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums', direction: 'ltr', display: 'inline-block' }}>
                  {formatDuration(pos.msUntilNext)}
                </span>{' '}
                (حوالي {formatClock(nextStartsAt)})
              </>
            : 'هذه آخر كتلة في اليوم.'}
        </span>
        <span>
          متبقّي اليوم:{' '}
          <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(pos.remainingTotalMs)}
          </strong>{' '}
          (تركيز {formatDuration(pos.remainingFocusMs)})
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {pos.paused
          ? <button type="button" onClick={() => resumeStudyDay(Date.now())}
              style={{ ...BTN, background: 'var(--orange)', border: '1px solid var(--orange)', color: '#fff' }}>
              <span aria-hidden>▶</span> متابعة
            </button>
          : <button type="button" onClick={() => pauseStudyDay(Date.now())} style={BTN}>
              <span aria-hidden>❚❚</span> إيقاف مؤقّت
            </button>}
        <button type="button" onClick={() => skipStudyBlock(Date.now())} style={BTN}>تخطَّ هذه الكتلة</button>
        <button type="button" onClick={() => restartStudyBlock(Date.now())} style={BTN}>أعد الكتلة</button>
        <button type="button" onClick={endStudyDay} style={{ ...BTN, color: 'var(--text2)' }}>أنهِ اليوم</button>
      </div>
    </div>,
  )
}
