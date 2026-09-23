import { useEffect, useRef, type RefObject } from 'react'
import type { TabId } from '@/store/types'
import type { LiteIcon } from '../icons'
import { AppIcon } from '../AppIcon'

/* «المزيد» — every tool that is not a daily workspace. A modal dialog:
   focus moves in, Tab is trapped, Escape/backdrop close it, and focus returns
   to the button that opened it. Bottom sheet on phones, anchored panel on
   wider screens (CSS only; same DOM). */

interface Props {
  groups: { title: string; items: { id: TabId; Icon: LiteIcon; label: string }[] }[]
  active: TabId
  onPick: (id: TabId) => void
  onClose: () => void
  returnTo: RefObject<HTMLElement | null>
}

export function MoreSheet({ groups, active, onPick, onClose, returnTo }: Props) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ret = returnTo.current
    const first = panel.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? panel.current?.querySelector<HTMLElement>('button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('button'))
      if (!items.length) return
      const a = items[0], z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      ret?.focus?.()
    }
  }, [onClose, returnTo])

  return (
    <div className="o-more-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panel} className="o-more" role="dialog" aria-modal="true" aria-labelledby="o-more-title">
        <div className="o-more-head">
          <h2 id="o-more-title">كل الأدوات</h2>
          <button type="button" className="o-more-close" onClick={onClose} aria-label="إغلاق القائمة">✕</button>
        </div>
        {groups.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h3>{g.title}</h3>
            <ul>
              {g.items.map((it) => (
                <li key={it.id}>
                  <button type="button" aria-current={it.id === active ? 'page' : undefined} onClick={() => onPick(it.id)}>
                    <AppIcon icon={it.Icon} size={20} />
                    <span>{it.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
