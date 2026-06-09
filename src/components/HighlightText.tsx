import { highlightRanges } from '@/hooks/useFuzzySearch'

interface Props {
  text: string
  indices?: ReadonlyArray<readonly [number, number]>
}

/**
 * Renders plain text with matched character ranges highlighted.
 * When no indices are provided it renders the text unchanged.
 */
export function HighlightText({ text, indices }: Props) {
  const segs = highlightRanges(text, indices)
  if (segs.length === 1 && !segs[0].highlight) return <>{text}</>

  return (
    <>
      {segs.map((s, i) =>
        s.highlight
          ? <mark key={i} style={{ background: 'var(--orange-l)', color: 'var(--orange)', borderRadius: 2, padding: '0 1px' }}>{s.text}</mark>
          : <span key={i}>{s.text}</span>
      )}
    </>
  )
}
