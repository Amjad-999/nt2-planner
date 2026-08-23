import { TimerRing } from './TimerRing'
import { BLOCK_STYLE } from './blockStyle'
import { formatDuration, clockHHMM } from '@/features/program/dates'
import type { RunView } from '@/features/program/runtime'

interface Props {
  view: RunView
  stale: boolean
  isToday: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onNext: () => void
  onPrev: () => void
  onStop: () => void
  onResolveStale: (mode: 'resume' | 'accept') => void
}

const btn = (primary = false): React.CSSProperties => ({
  background: primary ? 'var(--grad-primary)' : 'var(--glass-bg)',
  color: primary ? '#fff' : 'var(--text2)',
  border: primary ? 'none' : '1px solid var(--glass-border)',
  borderRadius: 14,
  padding: '10px 18px',
  fontWeight: 600,
  fontSize: '.88rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
  boxShadow: primary ? '0 4px 14px var(--ring-primary)' : 'var(--elev-1)',
})

export function NowCard({
  view, stale, isToday,
  onStart, onPause, onResume, onNext, onPrev, onStop, onResolveStale,
}: Props) {
  const block = view.block
  const style = block ? BLOCK_STYLE[block.kind] : BLOCK_STYLE.lesson
  const overrun = view.remainingMs < 0
  const idle = view.status === 'idle'
  const finished = view.status === 'finished'

  return (
    <div
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(18px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r)',
        padding: 22,
        boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)',
        marginBottom: 16,
      }}
    >
      {stale && (
        <div
          style={{
            background: 'var(--amber-l)', border: '1px solid var(--amber)',
            borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            ⚠️ الجلسة كانت مغلقة فترة طويلة
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
            مرّ وقت كبير منذ آخر مرّة كان التطبيق مفتوحًا فيها. لن أتقدّم عبر مهامّك تلقائيًا
            وأدّعي أنك أنجزتها — اختر بنفسك:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={btn(true)} onClick={() => onResolveStale('resume')}>
              تابع من حيث توقّفت
            </button>
            <button style={btn()} onClick={() => onResolveStale('accept')}>
              احتسب الوقت الفعلي المنقضي
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <TimerRing
          progress={view.blockProgress}
          remainingMs={view.remainingMs}
          label={idle ? 'جاهز للبدء' : finished ? 'انتهى اليوم' : 'متبقٍّ في المهمّة'}
          color={style.color}
          overrun={overrun}
        />

        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', letterSpacing: '.6px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>المهمّة الحالية · {view.index + 1} من {view.total}</span>
            {!isToday && (
              <span style={{ background: 'var(--blue-l)', color: 'var(--blue)', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>
                يوم غير اليوم
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                width: 40, height: 40, borderRadius: 12, background: style.soft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
              }}
              aria-hidden="true"
            >
              {style.icon}
            </span>
            <div>
              <div style={{ fontSize: '1.28rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>
                {block?.title ?? 'لا مهامّ لهذا اليوم'}
              </div>
              {block && (
                <div style={{ fontSize: '.78rem', color: 'var(--muted)', fontFamily: 'var(--font-latin)', direction: 'ltr' }}>
                  {clockHHMM(block.plannedStartMs)} → {clockHHMM(block.plannedEndMs)} · {Math.round(block.durationMs / 60000)}د
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
            {block?.subtitle ?? 'اختر يومًا آخر من الجدول أو ابدأ برنامجك.'}
          </div>

          {/* المهمّة القادمة */}
          {view.next ? (
            <div
              style={{
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 14,
              }}
            >
              <div style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.5px', marginBottom: 3 }}>
                المهمّة القادمة
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.92rem' }}>
                  {BLOCK_STYLE[view.next.kind].icon} {view.next.title}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-latin)', direction: 'ltr',
                    fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                    color: overrun ? 'var(--red)' : 'var(--orange)', fontSize: '.95rem',
                  }}
                >
                  {overrun ? 'الآن' : `بعد ${formatDuration(view.untilNextMs)}`}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 14 }}>
              هذه آخر مهمّة في اليوم.
            </div>
          )}

          {/* أزرار التحكّم */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {idle ? (
              <button style={btn(true)} onClick={onStart}>
                ▶︎ ابدأ اليوم
              </button>
            ) : (
              <>
                {view.status === 'paused'
                  ? <button style={btn(true)} onClick={onResume}>▶︎ استئناف</button>
                  : <button style={btn(true)} onClick={onPause} disabled={finished}>⏸ إيقاف مؤقّت</button>}
                <button style={btn()} onClick={onPrev}>◀︎ السابقة</button>
                <button style={btn()} onClick={onNext}>التالية ▶︎</button>
                <button style={btn()} onClick={onStop}>إنهاء الجلسة</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
