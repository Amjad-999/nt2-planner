import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useMascot } from '@/hooks/useMascot'
import { MOOD_ANIMATION, MOOD_STATIC, mascotEntrance, type MascotMood } from './MascotAnimations'
import { MascotBubble } from './MascotBubble'
import { MascotPanel } from './MascotPanel'
import { MASCOT_NAME_AR } from '@/data/mascotDialogs'

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
      width="76" height="76" viewBox="0 0 200 200" role="img"
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

/** The bottom-right corner widget: character + speech bubble + help panel.
 *  Hidden entirely in Focus Mode or once permanently dismissed (see useMascot). */
export function Mascot() {
  const {
    visible, mood, dialog, bubbleOpen, closeBubble,
    panelOpen, togglePanel, closePanel, batches, dance, dismissForever,
  } = useMascot()
  const reduced = useReducedMotion()

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', insetBlockEnd: 18, insetInlineEnd: 18, zIndex: 850,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}
    >
      {panelOpen && (
        <MascotPanel batches={batches} onClose={closePanel} onDance={() => { closePanel(); dance() }} />
      )}

      {!panelOpen && bubbleOpen && dialog && (
        // Keyed by content so a new dialog remounts the bubble fresh —
        // that's what resets its typed-text reveal, see MascotBubble.tsx.
        <MascotBubble key={dialog.ar} line={dialog} onClose={closeBubble} onDismissForever={dismissForever} />
      )}

      <motion.button
        type="button"
        onClick={togglePanel}
        aria-label={panelOpen ? `إغلاق لوحة ${MASCOT_NAME_AR}` : `${MASCOT_NAME_AR} — اضغط للمساعدة`}
        variants={reduced ? undefined : mascotEntrance}
        initial={reduced ? undefined : 'initial'}
        animate={reduced ? MOOD_STATIC[mood] : MOOD_ANIMATION[mood]}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          filter: 'drop-shadow(var(--elev-2))', lineHeight: 0,
        }}
      >
        <CatSvg mood={mood} dancing={mood === 'dancing' && !reduced} />
      </motion.button>
    </div>
  )
}
