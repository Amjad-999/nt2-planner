import { LESSON_ITEMS } from '@/data/observatory/items'
import type { ObsState } from '@/features/observatory/types'
import { CONTEXT_AR, shortDate } from '@/features/observatory/format'
import { Sheet } from '../Sheet'
import { Nl, Chip } from '../ui'
import { IHeadphones, IBookmarkSimple } from '../icons'

/* Choose a different topic for today. The live session (if any) is parked,
   not replaced — starting another topic never throws work away. */

export function TopicPicker({ o, onPick, onClose }: { o: ObsState; onPick: (id: string) => void; onClose: () => void }) {
  const last = (id: string) => o.history.filter((h) => h.itemId === id).map((h) => h.finishedAt).sort().pop()
  return (
    <Sheet title="اختر موضوع الجلسة" onClose={onClose} placement="center">
      <p className="o-small" style={{ marginBottom: 12 }}>كل النصوص تدريبية كُتبت لهذا التطبيق (أماكن وأشخاص متخيَّلون).</p>
      <ul className="o-list">
        {LESSON_ITEMS.map((it) => {
          const t = last(it.id)
          return (
            <li key={it.id}>
              <button type="button" className="o-card o-card--button" style={{ width: '100%' }} onClick={() => onPick(it.id)}>
                <span className="o-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{it.topicAr}</strong>
                  <Chip tone={it.kind === 'listen' ? 'cobalt' : 'neutral'} icon={it.kind === 'listen' ? IHeadphones : IBookmarkSimple}>
                    {it.kind === 'listen' ? 'استماع ثم قراءة' : 'قراءة'}
                  </Chip>
                </span>
                <Nl>{it.titleNl}</Nl>
                <span className="o-small">{CONTEXT_AR[it.context]} · {t ? `آخر مرة: ${shortDate(t)}` : 'لم تُدرس بعد'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
