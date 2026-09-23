import { useState } from 'react'
import { RESOURCE_GROUPS } from '@/data/resources'
import { Chip } from '../ui'
import { IArrowSquareOut, IWarningCircle } from '../icons'

/* Resources exactly as supplied in data/resources.ts: title, provider (read
   from the link itself), the direct link, and a verification status. The app
   holds no verification dates, so none are shown: a link is either flagged
   as broken in the data, or "not checked by this app". Nothing is invented. */

function provider(href: string): string {
  try { return new URL(href).hostname.replace(/^www\./, '') } catch { return '' }
}

export function ResourcesPanel() {
  const [all, setAll] = useState(false)
  const groups = all ? RESOURCE_GROUPS : RESOURCE_GROUPS.slice(0, 2)
  return (
    <div className="o-stack" style={{ gap: 16 }}>
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3 className="o-label" style={{ marginBottom: 8 }}>{g.title}</h3>
          <ul className="o-list">
            {g.links.map((l) => (
              <li key={l.href} className="o-card" style={{ padding: 12 }}>
                <a className="o-link" href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.title} <IArrowSquareOut size={16} flip className="o-inline-icon" />
                  <span className="o-sr"> (يفتح في نافذة جديدة)</span>
                </a>
                <span className="o-small">{l.desc}</span>
                <span className="o-row" style={{ gap: 6 }}>
                  <span className="o-meta">{provider(l.href)}</span>
                  {l.warn ? <Chip tone="error" icon={IWarningCircle}>مُبلَّغ أنه معطّل</Chip> : <Chip>لم يتحقّق منه التطبيق</Chip>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <button type="button" className="o-link" onClick={() => setAll(!all)} aria-expanded={all}>
        {all ? 'اعرض أقل' : `اعرض كل المصادر (${RESOURCE_GROUPS.reduce((n, g) => n + g.links.length, 0)})`}
      </button>
    </div>
  )
}
