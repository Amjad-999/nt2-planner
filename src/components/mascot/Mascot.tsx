import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useMascot } from '@/hooks/useMascot'
import { MOOD_ANIMATION, MOOD_STATIC, mascotEntrance, type MascotMood } from './MascotAnimations'
import { MascotBubble } from './MascotBubble'
import { MASCOT_NAME_AR } from '@/data/mascotDialogs'

/* ── وجه فوكسي — عيون/حواجب/فم مختلفة لكل حالة مزاجية ── */
function FoxFace({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'happy':
      return (
        <>
          <path d="M62 92 Q76 78 90 92" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M110 92 Q124 78 138 92" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M75 118 Q100 142 125 118" stroke="#2D2A26" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      )
    case 'sad':
      return (
        <>
          <circle cx="76" cy="98" r="7" fill="#2D2A26" />
          <circle cx="124" cy="98" r="7" fill="#2D2A26" />
          <path d="M64 82 Q76 90 88 84" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M112 84 Q124 90 136 82" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M80 128 Q100 116 120 128" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      )
    case 'excited':
      return (
        <>
          <circle cx="76" cy="96" r="10" fill="#2D2A26" />
          <circle cx="72" cy="92" r="3" fill="#fff" />
          <circle cx="124" cy="96" r="10" fill="#2D2A26" />
          <circle cx="120" cy="92" r="3" fill="#fff" />
          <path d="M70 116 Q100 148 130 116 Q100 132 70 116" fill="#2D2A26" />
        </>
      )
    case 'thinking':
      return (
        <>
          <path d="M66 96 Q76 90 86 96" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="124" cy="96" r="7" fill="#2D2A26" />
          <path d="M108 80 Q124 72 140 80" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="104" cy="120" r="4" fill="#2D2A26" />
        </>
      )
    case 'idle':
    default:
      return (
        <>
          <circle cx="76" cy="96" r="8" fill="#2D2A26" />
          <circle cx="73" cy="93" r="2.5" fill="#fff" />
          <circle cx="124" cy="96" r="8" fill="#2D2A26" />
          <circle cx="121" cy="93" r="2.5" fill="#fff" />
          <path d="M88 122 Q100 130 112 122" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      )
  }
}

function FoxSvg({ mood }: { mood: MascotMood }) {
  return (
    <svg width="72" height="72" viewBox="0 0 200 200" role="img" aria-label={`${MASCOT_NAME_AR} — الوضع: ${mood}`}>
      {/* الذيل */}
      <path d="M150 150 Q195 140 185 90 Q178 115 145 128 Z" fill="var(--orange)" />
      <path d="M185 90 Q190 75 178 68 Q182 85 165 100 Z" fill="#FBF3EA" />
      {/* الجسم */}
      <ellipse cx="100" cy="150" rx="55" ry="38" fill="var(--orange)" />
      {/* الأذنان */}
      <path d="M55 55 L75 95 L35 90 Z" fill="var(--orange)" />
      <path d="M60 68 L72 92 L48 88 Z" fill="#2D2A26" opacity="0.85" />
      <path d="M145 55 L125 95 L165 90 Z" fill="var(--orange)" />
      <path d="M140 68 L128 92 L152 88 Z" fill="#2D2A26" opacity="0.85" />
      {/* الرأس */}
      <circle cx="100" cy="100" r="62" fill="var(--orange)" />
      {/* الخطم الأبيض */}
      <path d="M62 108 Q100 145 138 108 Q120 132 100 132 Q80 132 62 108 Z" fill="#FBF3EA" />
      <ellipse cx="100" cy="112" rx="9" ry="6" fill="#2D2A26" />
      <FoxFace mood={mood} />
    </svg>
  )
}

/** The bottom-right corner widget: character + its speech bubble. Hidden
 *  entirely in Focus Mode or once permanently dismissed (see useMascot). */
export function Mascot() {
  const { visible, mood, dialog, bubbleOpen, openBubble, closeBubble, dismissForever } = useMascot()
  const reduced = useReducedMotion()

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', insetBlockEnd: 18, insetInlineEnd: 18, zIndex: 850,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}
    >
      {bubbleOpen && dialog && (
        // Keyed by content so a new dialog remounts the bubble fresh —
        // that's what resets its typed-text reveal, see MascotBubble.tsx.
        <MascotBubble key={dialog.ar} line={dialog} onClose={closeBubble} onDismissForever={dismissForever} />
      )}

      <motion.button
        type="button"
        onClick={() => (bubbleOpen ? closeBubble() : openBubble())}
        aria-label={bubbleOpen ? `إغلاق حوار ${MASCOT_NAME_AR}` : `${MASCOT_NAME_AR} — اضغط للتحدّث`}
        variants={reduced ? undefined : mascotEntrance}
        initial={reduced ? undefined : 'initial'}
        animate={reduced ? MOOD_STATIC[mood] : MOOD_ANIMATION[mood]}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          filter: 'drop-shadow(var(--elev-2))', lineHeight: 0,
        }}
      >
        <FoxSvg mood={mood} />
      </motion.button>
    </div>
  )
}
