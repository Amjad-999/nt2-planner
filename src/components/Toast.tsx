import { create } from 'zustand'

/* ── إشعارات Toast زجاجية (P6) ─────────────────────────────────────────────
   toast('نص', 'success' | 'error' | 'warn') من أي مكان — بلا سياق React.
   تختفي وحدها بعد 3 ثوانٍ، وتُعلن لقارئ الشاشة عبر aria-live.
   الحركة CSS خالصة (toast-in/out) — هذا المكوّن في مسار الإقلاع، وإبقاء
   framer-motion هنا كان يكلّف الحزمة الرئيسية ~130KB مصغّرة. */

export type ToastKind = 'success' | 'error' | 'warn'
interface ToastItem { id: number; kind: ToastKind; msg: string; leaving?: boolean }

const ICONS: Record<ToastKind, string> = { success: '✅', error: '❌', warn: '⚠️' }
const EDGE:  Record<ToastKind, string> = { success: 'var(--green)', error: 'var(--red)', warn: 'var(--amber)' }

let nextId = 1
const useToasts = create<{
  list: ToastItem[]
  push: (t: ToastItem) => void
  leave: (id: number) => void
  drop: (id: number) => void
}>((set) => ({
  list: [],
  push: (t) => set((s) => ({ list: [...s.list.slice(-3), t] })),
  leave: (id) => set((s) => ({ list: s.list.map((x) => (x.id === id ? { ...x, leaving: true } : x)) })),
  drop: (id) => set((s) => ({ list: s.list.filter((x) => x.id !== id) })),
}))

function dismiss(id: number) {
  useToasts.getState().leave(id)                       // حركة الخروج CSS
  setTimeout(() => useToasts.getState().drop(id), 240) // ثم الإزالة الفعلية
}

// eslint-disable-next-line react-refresh/only-export-components -- مساعد إشعارات (ليس مكوّنًا)
export function toast(msg: string, kind: ToastKind = 'success') {
  const id = nextId++
  useToasts.getState().push({ id, kind, msg })
  setTimeout(() => dismiss(id), 3000)
}

export function ToastHost() {
  const list = useToasts((s) => s.list)
  return (
    <div
      aria-live="polite"
      style={{ position: 'fixed', bottom: 18, insetInlineStart: '50%', transform: 'translateX(50%)',
        zIndex: 950, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}
    >
      {/* الإعلان لقارئ الشاشة يأتي من aria-live على الحاوية أعلاه، فلا حاجة
          إلى role="status" على كل عنصر (يسبّب إعلانًا مزدوجًا). الإغلاق عبر
          زرّ حقيقي قابل للتركيز بلوحة المفاتيح بدل onClick على div. */}
      {list.map((t) => (
        <div
          key={t.id}
          className={t.leaving ? 'toast-out' : 'toast-in'}
          style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 10px 10px 16px', borderRadius: 14,
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
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="إغلاق التنبيه"
            style={{
              marginInlineStart: 4, padding: '2px 6px', borderRadius: 8, flexShrink: 0,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: '.95rem', lineHeight: 1, fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
