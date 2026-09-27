import type { ReactNode } from 'react'

interface Option<T extends string> {
  id: T
  label: ReactNode
}

interface Props<T extends string> {
  options: readonly Option<T>[]
  /** null = nothing chosen yet (a self-assessment not given). */
  value: T | null
  onChange: (id: T) => void
  /** Accessible name of the whole switch ("عرض المفردات"). */
  label: string
}

/**
 * Switches between views inside one screen. A toggle-button group
 * (aria-pressed), not a tablist: nothing here owns arrow-key roving focus,
 * and a tablist that does not implement it misleads screen-reader users.
 * The strip wraps rather than scrolling — see .segmented in components.css.
 */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="segmented">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
