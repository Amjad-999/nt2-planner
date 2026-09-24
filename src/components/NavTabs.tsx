import { useRef, useState, lazy, Suspense } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { TabId } from '@/store/types'
import { AppIcon } from './AppIcon'
import type { LiteIcon } from './icons'
import {
  Compass, ChatsCircle, Cube, Path, DotsThreeOutline,
  SquaresFour, CalendarCheck, Translate, BookOpen, ClipboardText, GameController, TextAa, ChartLineUp, Globe, Star, GearSix,
} from './icons'

/* ── Navigation: four daily workspaces + «المزيد» ─────────────────────────
   The brief's rule: primary navigation answers "what do I do today", and
   everything else lives inside the workspace it belongs to or under «More».
   The ten original tools are all still here — one tap further — so nothing
   the learner relied on disappeared.
   Desktop/tablet: a sticky row under the top bar. Phones (<768px): a bottom
   bar (thumb reach, safe-area aware) that hides during a lesson so the
   keyboard and the answer field get the room. Framer-free: this is the boot
   path. */

interface Entry { id: TabId; Icon: LiteIcon; label: string }

const PRIMARY: Entry[] = [
  { id: 'today', Icon: Compass, label: 'اليوم' },
  { id: 'practice', Icon: ChatsCircle, label: 'تدريب' },
  { id: 'words', Icon: Cube, label: 'كلماتي' },
  { id: 'learning', Icon: Path, label: 'تعلّمي' },
]

const MORE_GROUPS: { title: string; items: Entry[] }[] = [
  { title: 'الإعدادات', items: [{ id: 'settings', Icon: GearSix, label: 'الإعدادات والنسخ الاحتياطي' }] },
  {
    title: 'الامتحان والتمارين',
    items: [
      { id: 'exam', Icon: ClipboardText, label: 'محاكاة الامتحان' },
      { id: 'exercises', Icon: GameController, label: 'تمارين' },
      { id: 'grammar', Icon: TextAa, label: 'قواعد' },
    ],
  },
  {
    title: 'الخطة والتقدّم',
    items: [
      { id: 'dashboard', Icon: SquaresFour, label: 'لوحة التحكم' },
      { id: 'plan', Icon: CalendarCheck, label: 'خطة الكتب' },
      { id: 'stats', Icon: ChartLineUp, label: 'التحليلات' },
    ],
  },
  {
    title: 'المكتبة',
    items: [
      { id: 'vocab', Icon: Translate, label: 'المفردات + AI' },
      { id: 'books', Icon: BookOpen, label: 'الكتب' },
      { id: 'resources', Icon: Globe, label: 'مصادر DUO' },
      { id: 'platform', Icon: Star, label: 'منصّتي' },
    ],
  },
]

const MORE_IDS = new Set(MORE_GROUPS.flatMap((g) => g.items.map((i) => i.id)))
const labelOf = (id: TabId) => MORE_GROUPS.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? ''

const MoreSheet = lazy(() => import('./nav/MoreSheet').then((m) => ({ default: m.MoreSheet })))

export function NavTabs() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBtn = useRef<HTMLButtonElement | null>(null)
  const inMore = MORE_IDS.has(activeTab)

  const go = (id: TabId) => {
    setActiveTab(id)
    setMoreOpen(false)
    // New workspace, new reading position: start at the top, focus the content.
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
  }

  const item = (e: Entry, where: 'top' | 'bottom') => {
    const current = e.id === activeTab
    return (
      <li key={e.id}>
        <button
          type="button"
          id={where === 'top' ? `ntab-${e.id}` : undefined}
          className="o-nav-btn"
          aria-current={current ? 'page' : undefined}
          onClick={() => go(e.id)}
        >
          <AppIcon icon={e.Icon} size={where === 'top' ? 20 : 22} />
          <span className="o-nav-label">{e.label}</span>
        </button>
      </li>
    )
  }

  const moreButton = (where: 'top' | 'bottom') => (
    <li>
      <button
        type="button"
        ref={where === 'top' ? moreBtn : undefined}
        className="o-nav-btn"
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        aria-current={inMore ? 'page' : undefined}
        onClick={(ev) => { moreBtn.current = ev.currentTarget; setMoreOpen(true) }}
      >
        <AppIcon icon={DotsThreeOutline} size={where === 'top' ? 20 : 22} />
        <span className="o-nav-label">{inMore && where === 'top' ? `المزيد · ${labelOf(activeTab)}` : 'المزيد'}</span>
      </button>
    </li>
  )

  return (
    <>
      <nav className="o-topnav" aria-label="التنقل الرئيسي">
        <ul>
          {PRIMARY.map((e) => item(e, 'top'))}
          {moreButton('top')}
        </ul>
      </nav>
      <nav className="o-bottomnav" aria-label="التنقل الرئيسي (أسفل الشاشة)">
        <ul>
          {PRIMARY.map((e) => item(e, 'bottom'))}
          {moreButton('bottom')}
        </ul>
      </nav>
      {moreOpen && (
        <Suspense fallback={null}>
          <MoreSheet groups={MORE_GROUPS} active={activeTab} onPick={go} onClose={() => setMoreOpen(false)} returnTo={moreBtn} />
        </Suspense>
      )}
    </>
  )
}
