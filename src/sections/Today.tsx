import { useEffect, useState } from 'react'
import { LayoutGroup } from 'framer-motion'
import '@/components/obs/obs.css'
import { useObs } from '@/hooks/useObs'
import { findItem } from '@/data/observatory/items'
import { TodayHome } from '@/components/obs/today/TodayHome'
import { LessonView } from '@/components/obs/lesson/LessonView'
import { peekIntent, takeIntent } from '@/features/observatory/intent'

/* ── Today ──────────────────────────────────────────────────────────────────
   Two modes in one workspace so the "resume" morph can run: the Today home
   (what, next, help, evidence) and the focused Lesson. Lesson mode is view
   state only — the run itself (position, answers, drafts) is in the store,
   so a reload lands on Today with a one-tap resume. */

export default function Today() {
  const [o] = useObs()
  // An intent from another workspace ("start a reading session") opens the lesson directly.
  const [mode, setMode] = useState<'home' | 'lesson'>(() => (peekIntent()?.kind === 'lesson' && o.session ? 'lesson' : 'home'))
  useEffect(() => { takeIntent('lesson') }, [])
  const run = o.session
  const item = run ? findItem(run.itemId) : undefined
  const inLesson = mode === 'lesson' && !!run && !!item

  return (
    <div className="o-root">
      <LayoutGroup id="today">
        {inLesson
          ? <LessonView item={item!} run={run!} onExit={() => { setMode('home'); requestAnimationFrame(() => document.getElementById('today-title')?.focus({ preventScroll: true })) }} />
          : <TodayHome onOpenLesson={() => setMode('lesson')} />}
      </LayoutGroup>
    </div>
  )
}
