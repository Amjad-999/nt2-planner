import { useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { TabId } from '@/store/types'

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'لوحة التحكم' },
  { id: 'plan',      icon: '🗓️', label: 'الخطة' },
  { id: 'vocab',     icon: '📚', label: 'المفردات + AI' },
  { id: 'books',     icon: '📖', label: 'الكتب' },
  { id: 'exam',      icon: '📝', label: 'محاكاة الامتحان' },
  { id: 'exercises', icon: '🎮', label: 'تمارين' },
  { id: 'grammar',   icon: '📖', label: 'قواعد' },
  { id: 'stats',     icon: '📈', label: 'التحليلات' },
  { id: 'resources', icon: '🔗', label: 'مصادر DUO' },
  { id: 'platform',  icon: '⭐', label: 'منصّتي' },
]

export function NavTabs() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const navRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Scroll active tab into view
  useEffect(() => {
    const btn = tabRefs.current[activeTab]
    btn?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [activeTab])

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const tabs = TABS
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length]
      setActiveTab(prev.id)
      tabRefs.current[prev.id]?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = tabs[(idx + 1) % tabs.length]
      setActiveTab(next.id)
      tabRefs.current[next.id]?.focus()
    }
  }

  return (
    <nav
      ref={navRef}
      className="flex items-center px-7 sticky z-[190] overflow-x-auto scrollbar-hide border-b"
      style={{
        top: '62px',
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(18px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
        borderColor: 'var(--glass-border)',
      }}
      role="tablist"
      aria-label="أقسام التطبيق"
    >
      {TABS.map((tab, idx) => {
        const isActive = tab.id === activeTab
        const isPlatform = tab.id === 'platform'
        return (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el }}
            id={`ntab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            tabIndex={isActive ? 0 : -1}
            className="relative flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent rounded-t-xl px-5 py-[14px] text-[.88rem] font-medium cursor-pointer font-[inherit] bg-none border-none transition-all"
            style={{
              color: isActive ? 'var(--orange)' : isPlatform ? 'var(--orange)' : 'var(--muted)',
              fontWeight: isActive || isPlatform ? 600 : 500,
              background: isActive ? 'linear-gradient(180deg,var(--orange-l),transparent)' : undefined,
            }}
          >
            <span className="text-[1rem]" aria-hidden="true">{tab.icon}</span>
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-[-1px] start-3 end-3 h-[3px] rounded-[3px]"
                style={{ background: 'var(--grad-primary)', boxShadow: '0 2px 8px var(--ring-primary)' }}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
