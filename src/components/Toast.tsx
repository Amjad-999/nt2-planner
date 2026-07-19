import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'

/* ── إشعارات Toast زجاجية (P6) ─────────────────────────────────────────────
   toast('نص', 'success' | 'error' | 'warn') من أي مكان — بلا سياق React.
   تختفي وحدها بعد 3 ثوانٍ، وتُعلن لقارئ الشاشة عبر aria-live. */

export type ToastKind = 'success' | 'error' | 'warn'
interface ToastItem { id: number; kind: ToastKind; msg: string }

const ICONS: Record<ToastKind, string> = { success: '✅', error: '❌', warn: '⚠️' }
const EDGE:  Record<ToastKind, string> = { success: 'var(--green)', error: 'var(--red)', warn: 'var(--amber)' }

let nextId = 1
const useToasts = create<{ list: ToastItem[]; push: (t: ToastItem) => void; drop: (id: number) => void }>((set) => ({
  list: [],
  push: (t) => set((s) => ({ list: [...s.list.slice(-3), t] })),
  drop: (id) => set((s) => ({ list: s.list.filter((x) => x.id !== id) })),
}))

// eslint-disable-next-line react-refresh/only-export-components -- مساعد إشعارات (ليس مكوّنًا)
export function toast(msg: string, kind: ToastKind = 'success') {
  const id = nextId++
  useToasts.getState().push({ id, kind, msg })
  setTimeout(() => useToasts.getState().drop(id), 3000)
}

export function ToastHost() {
  const list = useToasts((s) => s.list)
  const drop = useToasts((s) => s.drop)
  return (
    <div
      aria-live="polite"
      style={{ position: 'fixed', bottom: 18, insetInlineStart: '50%', transform: 'translateX(50%)',
        zIndex: 950, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}
    >
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={() => drop(t.id)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 14,
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'blur(16px) saturate(1.5)', WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
              border: '1px solid var(--glass-border)',
              borderInlineStart: `3px solid ${EDGE[t.kind]}`,
              boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)',
              color: 'var(--text)', fontSize: '.88rem', fontWeight: 600, maxWidth: 'min(90vw, 420px)',
            }}
          >
            <span aria-hidden="true">{ICONS[t.kind]}</span>
            <span>{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
