import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useMascot } from '@/hooks/useMascot'
import {
  MOOD_ANIMATION, MOOD_STATIC, TILT_SPRING, MAX_TILT_DEG, POINTER_RANGE_PX,
  type MascotMood,
} from './MascotAnimations'
import { MascotBubble } from './MascotBubble'
import { MascotPanel } from './MascotPanel'
import { MASCOT_NAME_AR } from '@/data/mascotDialogs'

/** The rendered portrait, served from public/. If it is missing the component
 *  falls back to the drawn CatSvg below — the icon must never be able to
 *  render as nothing (see the invisibility bug documented on Mascot). */
const KATYA_PHOTO = '/images/cartoon-cat.jpg'

/* ── وجه كاتيا — عيون برموش/فم مختلفة لكل حالة مزاجية ── */
function CatFace({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'happy':
      return (
        <>
          <path d="M62 90 L56 85" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <path d="M138 90 L144 85" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 94 Q76 82 88 94" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M112 94 Q124 82 136 94" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M78 116 Q100 138 122 116" stroke="#2D2A26" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      )
    case 'sad':
      return (
        <>
          <circle cx="76" cy="98" r="6.5" fill="#2D2A26" />
          <circle cx="124" cy="98" r="6.5" fill="#2D2A26" />
          <path d="M64 84 Q76 91 88 86" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M112 86 Q124 91 136 84" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M82 128 Q100 116 118 128" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      )
    case 'excited':
      return (
        <>
          <path d="M63 85 L56 80" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <path d="M137 85 L144 80" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <circle cx="76" cy="96" r="10" fill="#2D2A26" />
          <circle cx="72" cy="92" r="3" fill="#fff" />
          <circle cx="124" cy="96" r="10" fill="#2D2A26" />
          <circle cx="120" cy="92" r="3" fill="#fff" />
          <path d="M72 114 Q100 146 128 114 Q100 130 72 114" fill="#2D2A26" />
        </>
      )
    case 'thinking':
      return (
        <>
          <path d="M66 96 Q76 90 86 96" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="124" cy="96" r="7" fill="#2D2A26" />
          <path d="M108 80 Q124 72 140 80" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="104" cy="121" r="4" fill="#2D2A26" />
        </>
      )
    case 'dancing':
      return (
        <>
          {/* غمزة + فم غناء مفتوح */}
          <path d="M62 88 L56 84" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 92 Q76 84 88 92" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="124" cy="95" r="9" fill="#2D2A26" />
          <circle cx="120" cy="91" r="3" fill="#fff" />
          <ellipse cx="100" cy="121" rx="9" ry="7" fill="#2D2A26" />
          <path d="M95 124 Q100 130 105 124" fill="#E85D8A" />
        </>
      )
    case 'idle':
    default:
      return (
        <>
          <path d="M64 86 L57 81" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <path d="M69 83 L64 77" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <path d="M136 86 L143 81" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <path d="M131 83 L136 77" stroke="#2D2A26" strokeWidth="3" strokeLinecap="round" />
          <circle cx="76" cy="96" r="8" fill="#2D2A26" />
          <circle cx="73" cy="93" r="2.5" fill="#fff" />
          <circle cx="124" cy="96" r="8" fill="#2D2A26" />
          <circle cx="121" cy="93" r="2.5" fill="#fff" />
          <path d="M92 120 Q96 125 100 120 Q104 125 108 120" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      )
  }
}

/** قطة برتقالية بتظليل شعاعي (إحساس 3D بلا three.js) + مجموعات أطراف/ذيل
 *  قابلة للرقص عبر CSS (class mascot-dancing — انظر globals.css). */
function CatSvg({ mood, dancing }: { mood: MascotMood; dancing: boolean }) {
  return (
    <svg
      width="66" height="66" viewBox="0 0 200 200" role="img"
      aria-label={`${MASCOT_NAME_AR} — الوضع: ${mood}`}
      className={dancing ? 'mascot-dancing' : undefined}
    >
      <defs>
        {/* إضاءة من أعلى اليسار — تعطي الجسم استدارة وعمقًا */}
        <radialGradient id="katiaFur" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#FFC08D" />
          <stop offset="55%" stopColor="var(--orange)" />
          <stop offset="100%" stopColor="#B85E28" />
        </radialGradient>
      </defs>

      {/* الذيل */}
      <g className="cat-tail">
        <path d="M150 152 Q196 144 186 92 Q179 117 146 130 Z" fill="url(#katiaFur)" />
        <path d="M186 92 Q191 76 179 70 Q183 87 166 102 Z" fill="#FBF3EA" />
      </g>

      {/* الجسم + الصدر */}
      <ellipse cx="100" cy="150" rx="55" ry="38" fill="url(#katiaFur)" />
      <ellipse cx="100" cy="158" rx="26" ry="22" fill="#FBF3EA" />

      {/* الذراعان — تتأرجحان بالتناوب أثناء الرقص */}
      <g className="cat-arm-l">
        <ellipse cx="70" cy="166" rx="10" ry="17" fill="url(#katiaFur)" />
        <ellipse cx="70" cy="180" rx="8" ry="6" fill="#FBF3EA" />
      </g>
      <g className="cat-arm-r">
        <ellipse cx="130" cy="166" rx="10" ry="17" fill="url(#katiaFur)" />
        <ellipse cx="130" cy="180" rx="8" ry="6" fill="#FBF3EA" />
      </g>

      {/* الأذنان المدبّبتان مع الداخل الوردي */}
      <path d="M50 64 L64 18 L90 50 Z" fill="url(#katiaFur)" />
      <path d="M58 56 L66 30 L80 48 Z" fill="#F3A0B5" opacity="0.9" />
      <path d="M150 64 L136 18 L110 50 Z" fill="url(#katiaFur)" />
      <path d="M142 56 L134 30 L120 48 Z" fill="#F3A0B5" opacity="0.9" />

      {/* الرأس */}
      <circle cx="100" cy="100" r="62" fill="url(#katiaFur)" />

      {/* خطوط التابي على الجبهة */}
      <path d="M86 42 Q88 54 86 60" stroke="#C96A32" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M100 39 Q100 51 100 58" stroke="#C96A32" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M114 42 Q112 54 114 60" stroke="#C96A32" strokeWidth="5" strokeLinecap="round" fill="none" />

      {/* الفيونكة الوردية على الأذن */}
      <path d="M140 24 L122 12 L126 34 Z" fill="#E85D8A" />
      <path d="M140 24 L158 12 L154 34 Z" fill="#E85D8A" />
      <circle cx="140" cy="24" r="5.5" fill="#C93A6B" />

      {/* الخطم + الأنف + الخدود + الشوارب */}
      <path d="M62 108 Q100 145 138 108 Q120 132 100 132 Q80 132 62 108 Z" fill="#FBF3EA" />
      <path d="M93 109 L107 109 L100 118 Z" fill="#E85D8A" />
      <ellipse cx="64" cy="111" rx="7" ry="4" fill="#F3A0B5" opacity="0.55" />
      <ellipse cx="136" cy="111" rx="7" ry="4" fill="#F3A0B5" opacity="0.55" />
      <g stroke="#B85E28" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
        <path d="M28 102 L60 107" />
        <path d="M30 116 L60 114" />
        <path d="M172 102 L140 107" />
        <path d="M170 116 L140 114" />
      </g>

      <CatFace mood={mood} />
    </svg>
  )
}

/** The corner widget: a launcher icon + its speech bubble + the help panel.
 *  Hidden entirely in Focus Mode or once permanently dismissed (see useMascot).
 *
 *  Entrance lives on the WRAPPER, mood animation on the button. Keeping them on
 *  one element is what made the mascot invisible: `variants` + `initial="initial"`
 *  applied {opacity:0, scale:0}, but `animate` was a mood *object* (no opacity
 *  key), so nothing ever animated opacity back to 1 — it stayed 0 forever while
 *  the mood's own scale keyframes hid the symptom. */
export function Mascot() {
  const {
    visible, mood, dialog, bubbleOpen, closeBubble,
    panelOpen, openPanel, closePanel,
    batches, reminderCount, dance, doDuty, dismissForever,
  } = useMascot()
  const reduced = useReducedMotion()

  const stageRef = useRef<HTMLDivElement>(null)
  // The real photo is the intended face; the hand-drawn SVG is the fallback so
  // a missing/failed asset degrades to a drawn cat rather than a broken icon.
  const [photoFailed, setPhotoFailed] = useState(false)

  // Pointer offset, normalised to -1..1 — written from a listener, never from
  // render, so tracking the cursor costs zero React re-renders.
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  // Continuous idle drift, driven by requestAnimationFrame below.
  const idleRotY = useMotionValue(0)
  const idleRotX = useMotionValue(0)
  const idleLift = useMotionValue(0)

  const tiltX = useSpring(pointerX, TILT_SPRING)
  const tiltY = useSpring(pointerY, TILT_SPRING)

  // Pointer tilt and idle drift sum into one rotation per axis, so the icon
  // keeps breathing while it follows the cursor instead of freezing.
  const rotateY = useTransform([tiltX, idleRotY], ([p, i]: number[]) => p * MAX_TILT_DEG + i)
  const rotateX = useTransform([tiltY, idleRotX], ([p, i]: number[]) => -p * MAX_TILT_DEG + i)
  // Leans toward the cursor in depth, which is what sells the 3D over a tilt.
  const translateZ = useTransform([tiltX, tiltY], ([a, b]: number[]) => (Math.abs(a) + Math.abs(b)) * 16)
  // Contact shadow: narrows as the body turns away, fades as it floats up.
  const shadowScaleX = useTransform(rotateY, (r: number) => 1 - Math.min(0.55, Math.abs(r) / 90))
  const shadowOpacity = useTransform(idleLift, (l: number) => 0.85 - Math.abs(l) * 0.05)

  useEffect(() => {
    if (!visible || reduced) return
    const onMove = (e: PointerEvent) => {
      const el = stageRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / POINTER_RANGE_PX
      const dy = (e.clientY - (r.top + r.height / 2)) / POINTER_RANGE_PX
      pointerX.set(Math.max(-1, Math.min(1, dx)))
      pointerY.set(Math.max(-1, Math.min(1, dy)))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [visible, reduced, pointerX, pointerY])

  useEffect(() => {
    if (!visible || reduced) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const s = (t - t0) / 1000
      // Three different periods so the drift never looks like a loop.
      idleRotY.set(Math.sin(s * 0.62) * 8)
      idleRotX.set(Math.cos(s * 0.44) * 4.5)
      idleLift.set(Math.sin(s * 0.9) * 4)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, reduced, idleRotY, idleRotX, idleLift])

  if (!visible) return null

  return (
    <div
      className="floating-assistant"
      style={{
        position: 'fixed', insetBlockEnd: 'calc(18px + var(--o-bnav-h, 0px) + env(safe-area-inset-bottom, 0px))', insetInlineEnd: 18, zIndex: 850,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--sp-3)',
      }}
    >
      {panelOpen && (
        <MascotPanel batches={batches} onClose={closePanel} onDance={() => { closePanel(); dance() }} />
      )}

      {!panelOpen && bubbleOpen && dialog && (
        // Keyed by content so a new dialog remounts the bubble fresh —
        // that's what resets its typed-text reveal, see MascotBubble.tsx.
        <MascotBubble
          key={dialog.ar} line={dialog}
          onClose={closeBubble} onOpenPanel={openPanel} onDismissForever={dismissForever}
        />
      )}

      {/* The 3D stage. `perspective` is inline (not CSS-only) so the depth is
          part of the component's contract and is assertable in tests. */}
      <div
        ref={stageRef}
        className="mascot-stage mascot-enter"
        data-testid="mascot-stage"
        style={{ perspective: '1000px', lineHeight: 0 }}
      >
        <motion.div
          className="mascot-3d"
          style={{
            transformStyle: 'preserve-3d',
            ...(reduced ? {} : { rotateX, rotateY, translateZ, y: idleLift }),
          }}
        >
          <motion.button
            type="button"
            onClick={doDuty}
            className="mascot-launcher"
            data-mood={mood}
            aria-label={`${MASCOT_NAME_AR} — اضغط لمهمة سريعة`}
            title={`${MASCOT_NAME_AR} — اضغط لمهمة سريعة`}
            animate={reduced ? MOOD_STATIC[mood] : MOOD_ANIMATION[mood]}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              lineHeight: 0, position: 'relative', transformStyle: 'preserve-3d',
            }}
          >
            <span className="mascot-orb">
              {photoFailed ? (
                <CatSvg mood={mood} dancing={mood === 'dancing' && !reduced} />
              ) : (
                <img
                  className="mascot-photo"
                  src={KATYA_PHOTO}
                  alt=""
                  draggable={false}
                  onError={() => setPhotoFailed(true)}
                />
              )}
            </span>
            {reminderCount > 0 && (
              <span className="mascot-badge" aria-hidden="true">{reminderCount}</span>
            )}
            <span className="sr-only">
              {reminderCount > 0 ? `${reminderCount} كلمة من مهام اليوم جاهزة للتذكير` : ''}
            </span>
          </motion.button>
        </motion.div>

        <motion.span
          className="mascot-shadow"
          aria-hidden="true"
          style={reduced ? undefined : { scaleX: shadowScaleX, opacity: shadowOpacity }}
        />
      </div>
    </div>
  )
}
