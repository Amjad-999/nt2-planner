import { useRef, type KeyboardEvent } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { TabId } from '@/store/types'
import { AppIcon } from './AppIcon'
import { SquaresFour, BookOpen, PencilSimple, Translate, ChartLineUp } from './icons'

const GROUPS = [
  { id: 'home', label: 'الرئيسية', Icon: SquaresFour, tabs: ['dashboard', 'resources', 'platform'] },
  { id: 'learn', label: 'تعلّم', Icon: BookOpen, tabs: ['plan', 'grammar', 'books'] },
  { id: 'practice', label: 'تدرّب', Icon: PencilSimple, tabs: ['exercises', 'situations', 'exam'] },
  { id: 'words', label: 'المفردات', Icon: Translate, tabs: ['vocab'] },
  { id: 'progress', label: 'تقدّمي', Icon: ChartLineUp, tabs: ['stats'] },
] satisfies { id: string; label: string; Icon: typeof BookOpen; tabs: TabId[] }[]

const LABELS: Record<TabId, string> = {
  dashboard: 'اليوم', resources: 'المصادر', platform: 'منصّتي',
  plan: 'خطة الدراسة', grammar: 'مسار القواعد', books: 'الكتب',
  exercises: 'تدريب يومي', situations: 'مواقف يومية', exam: 'تدريب الامتحان', vocab: 'المفردات', stats: 'تقدّمي',
}

export function NavTabs() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const remembered = useRef<Record<string, TabId>>({})
  const active = GROUPS.find((group) => group.tabs.some((tab) => tab === activeTab)) ?? GROUPS[0]

  const select = (tab: TabId) => {
    remembered.current[active.id] = activeTab
    setActiveTab(tab)
  }

  // RTL arrows follow visual order; Home/End work on both rows.
  const move = (event: KeyboardEvent, ids: string[], index: number) => {
    const next = event.key === 'ArrowLeft' ? (index + 1) % ids.length
      : event.key === 'ArrowRight' ? (index - 1 + ids.length) % ids.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : -1
    if (next < 0) return
    event.preventDefault()
    refs.current[ids[next]]?.focus()
  }

  return (
    <div className="navigation-shell sticky z-[190]" style={{ top: 'var(--topbar-h)' }}>
      <nav className="primary-nav" aria-label="التنقّل الرئيسي">
        {GROUPS.map((group, index) => {
          const selected = active.id === group.id
          const direct = group.tabs.length === 1
          return (
            <button
              key={group.id}
              ref={(el) => { refs.current[group.id] = el }}
              id={direct ? `ntab-${group.tabs[0]}` : `nav-${group.id}`}
              type="button"
              aria-current={selected ? 'page' : undefined}
              aria-label={group.label}
              title={group.label}
              className="primary-nav-item"
              onClick={() => select(group.id === 'home' ? 'dashboard' : selected ? activeTab : remembered.current[group.id] ?? group.tabs[0])}
              onKeyDown={(event) => move(event, GROUPS.map((g) => g.id), index)}
            >
              <AppIcon icon={group.Icon} size={22} />
              <span>{group.label}</span>
            </button>
          )
        })}
      </nav>
      {active.tabs.length > 1 && (
        <nav className="section-nav" aria-label={`أقسام ${active.label}`}>
          {active.tabs.map((tab, index) => (
            <button
              key={tab}
              id={`ntab-${tab}`}
              ref={(el) => { refs.current[tab] = el }}
              type="button"
              aria-current={activeTab === tab ? 'page' : undefined}
              onClick={() => select(tab)}
              onKeyDown={(event) => move(event, active.tabs, index)}
            >
              {LABELS[tab]}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
