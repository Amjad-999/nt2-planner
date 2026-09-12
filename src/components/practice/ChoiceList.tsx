interface Props {
  /** Dutch answer options, rendered LTR. */
  options: readonly string[]
  correct: number
  /** Indices the learner has picked, in order. */
  picked: readonly number[]
  /**
   * single — the first pick locks the question (exam practice: one honest try).
   * retry  — a wrong pick is marked and disabled, and the learner tries again
   *          until they find the fitting answer (conversation practice).
   */
  mode: 'single' | 'retry'
  onPick: (index: number) => void
  /** Accessible name of the question group. */
  label: string
}

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'muted'

/**
 * One multiple-choice control for every exercise. The answer state is carried
 * by an icon, a sentence for screen readers and the border style — never by
 * colour alone (the brand palette folds success and error into one hue).
 */
export function ChoiceList({ options, correct, picked, mode, onPick, label }: Props) {
  const solved = picked.includes(correct)
  const locked = solved || (mode === 'single' && picked.length > 0)

  const stateOf = (i: number): ChoiceState => {
    if (i === correct && locked) return 'correct'
    if (picked.includes(i)) return 'wrong'
    return locked ? 'muted' : 'idle'
  }

  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {options.map((text, i) => {
        const state = stateOf(i)
        return (
          <button
            key={i}
            type="button"
            className="choice"
            data-state={state}
            disabled={locked || state === 'wrong'}
            onClick={() => onPick(i)}
          >
            <span className="choice__mark" aria-hidden="true">
              {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : String.fromCharCode(65 + i)}
            </span>
            <span dir="ltr" lang="nl" style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-latin)', overflowWrap: 'anywhere' }}>
              {text}
            </span>
            {state === 'correct' && <span className="sr-only">الإجابة الصحيحة</span>}
            {state === 'wrong' && <span className="sr-only">إجابة غير صحيحة</span>}
          </button>
        )
      })}
    </div>
  )
}
