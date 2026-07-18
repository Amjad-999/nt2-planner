import { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { TabId } from '@/store/types'
import { AppIcon } from './AppIcon'
import type { Icon } from '@phosphor-icons/react'
import {
  SquaresFour, CalendarCheck, Translate, BookOpen,
  ClipboardText, GameController, TextAa, ChartLineUp, Globe, Star,
} from '@phosphor-icons/react'

const TABS: { id: TabId; Icon: Icon; label: string }[] = [
  { id: 'dashboard', Icon: SquaresFour,   label: 'لوحة التحكم' },
  { id: 'plan',      Icon: CalendarCheck, label: 'الخطة' },
  { id: 'vocab',     Icon: Translate,     label: 'المفردات + AI' },
  { id: 'books',     Icon: BookOpen,      label: 'الكتب' },
  { id: 'exam',      Icon: ClipboardText, label: 'محاكاة الامتحان' },
  { id: 'exercises', Icon: GameController,label: 'تمارين' },
  { id: 'grammar',   Icon: TextAa,        label: 'قواعد' },
  { id: 'stats',     Icon: ChartLineUp,   label: 'التحليلات' },
  { id: 'resources', Icon: Globe,         label: 'مصادر DUO' },
  { id: 'platform',  Icon: Star,          label: 'منصّتي' },
]

export function NavTabs() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const navRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const indicatorRef = useRef<HTMLSpanElement>(null)

  const moveIndicatorTo = useCallback((btn: HTMLButtonElement | null) => {
    const ind = indicatorRef.current
    if (!ind || !btn) return
    const pad = 12
    ind.style.left = `${btn.offsetLeft + pad}px`
    ind.style.width = `${btn.offsetWidth - pad * 2}px`
    ind.style.opacity = '1'
  }, [])

  useEffect(() => {
    moveIndicatorTo(tabRefs.current[activeTab])
  }, [activeTab, moveIndicatorTo])

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
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        borderColor: 'var(--glass-border)',
        position: 'relative',
      }}
      role="tablist"
      aria-label="أقسام التطبيق"
      onMouseLeave={() => moveIndicatorTo(tabRefs.current[activeTab])}
    >
      <span
        ref={indicatorRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          height: 3,
          borderRadius: 3,
          background: 'var(--grad-primary)',
          boxShadow: '0 2px 8px var(--ring-primary)',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'left 220ms cubic-bezier(0.4,0,0.2,1), width 150ms ease, opacity 150ms ease',
        }}
      />

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
            onMouseEnter={() => moveIndicatorTo(tabRefs.current[tab.id])}
            tabIndex={isActive ? 0 : -1}
            className="relative flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent rounded-t-xl px-5 py-[14px] text-[.88rem] font-medium cursor-pointer font-[inherit] bg-none border-none transition-all"
            style={{
              color: isActive ? 'var(--orange)' : isPlatform ? 'var(--orange)' : 'var(--muted)',
              fontWeight: isActive || isPlatform ? 600 : 500,
              background: isActive ? 'linear-gradient(180deg,var(--orange-l),transparent)' : undefined,
            }}
          >
            <AppIcon icon={tab.Icon} size={20} />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
