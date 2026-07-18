import { useState, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext, DragOverlay,
  useDraggable, useDroppable,
  PointerSensor, TouchSensor, KeyboardSensor,
  useSensors, useSensor,
  defaultAnnouncements,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable,
  sortableKeyboardCoordinates, arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '@/store/useAppStore'
import { B1_THEMAS } from '@/data/themas'
import { EXAM_SPEAKING } from '@/data/examContent'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  buildMatchExercise, checkMatching,
  buildSortExercise,  checkSortOrder,
  buildGapExercise,   checkGap,
  type Pair, type SortWord, type Chip, type GapExercise, type SortExercise,
} from '@/features/exercises/logic'

// ── Shared helpers ────────────────────────────────────────────────────────────
type Mode = 'matching' | 'sorting' | 'gap'

function seed() { return Math.floor(Math.random() * 0x7fffffff) + 1 }

// Flatten all thema words for fallback
const THEMA_WORDS = B1_THEMAS.flatMap(t => t.words)

function useWords() {
  const vocab = useAppStore(s => s.vocab)
  if (vocab.length >= 4) return vocab.map(w => ({ nl: w.dutch, ar: w.arabic, ex: w.example }))
  return THEMA_WORDS.map(w => ({ nl: w.nl, ar: w.ar, ex: w.ex ?? '' }))
}

// Split each multi-sentence example paragraph into individual sentences before
// filtering, so short sentences inside longer paragraphs are still usable.
const SORT_SENTENCES = EXAM_SPEAKING
  .flatMap(s => s.voorbeeldNl.replace(/[.!?]+/g, '|').split('|'))
  .map(s => s.trim())
  .filter(s => {
    const wc = s.split(/\s+/).filter(Boolean).length
    return wc >= 5 && wc <= 12
  })

// ── Shared token styles ──────────────────────────────────────────────────────
function chip(active = false, correct?: boolean, incorrect?: boolean): React.CSSProperties {
  let bg = 'var(--btn-bg)'
  let bc = 'var(--border2)'
  let color = 'var(--text)'
  if (active)    { bg = 'var(--orange-l)'; bc = 'var(--orange)'; color = 'var(--orange)' }
  if (correct)   { bg = 'var(--green-l)';  bc = 'var(--green)';  color = 'var(--green)'  }
  if (incorrect) { bg = 'var(--red-l)';    bc = 'var(--red)';    color = 'var(--red)'    }
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 14px', borderRadius: 10,
    border: `1px solid ${bc}`, background: bg, color,
    fontFamily: 'inherit', fontSize: '.9rem', fontWeight: 600,
    cursor: 'pointer', userSelect: 'none', transition: 'none',
    boxShadow: active ? 'var(--elev-1)' : 'none',
    minWidth: 80, textAlign: 'center',
    touchAction: 'none', // let dnd-kit handle touch
  }
}

function ScoreBadge({ correct, total }: { correct: number; total: number }) {
  const pct = total ? Math.round((correct / total) * 100) : 0
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color }}>
        {correct}/{total}
      </span>
      <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginTop: 2 }}>
        {pct >= 80 ? '🎉 ممتاز!' : pct >= 50 ? '👍 جيّد — حاول مجدّدًا' : '💪 تدرّب وحاول مجدّدًا'}
      </div>
    </div>
  )
}

function ResetBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-glass"
      style={{ borderRadius: 12, color: 'var(--text)',
        padding: '9px 22px', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', fontFamily: 'inherit' }}>
      🔄 حاول مجدّدًا
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. MATCHING EXERCISE
// ═════════════════════════════════════════════════════════════════════════════
function DraggableNlChip({ pair, selected, result }: {
  pair: Pair; selected: boolean; result?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: pair.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`اسحب الكلمة: ${pair.nl}`}
      style={{
        ...chip(selected, result === true, result === false),
        opacity: isDragging ? 0.25 : 1,
        outline: selected ? '2px solid var(--orange)' : undefined,
        outlineOffset: 2,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {pair.nl}
    </div>
  )
}

function DroppableArSlot({ pair, placed, result, onTap }: {
  pair: Pair; placed?: Pair | null; result?: boolean; onTap: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: pair.id })
  const hasResult = result !== undefined
  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      aria-label={`الهدف: ${pair.ar}${placed ? ' — موضوع: ' + placed.nl : ''}`}
      style={{
        minHeight: 48, borderRadius: 10, padding: '8px 14px',
        border: `2px ${isOver ? 'solid' : 'dashed'} ${isOver ? 'var(--orange)' : hasResult ? (result ? 'var(--green)' : 'var(--red)') : 'var(--border2)'}`,
        background: isOver ? 'var(--orange-l)' : hasResult ? (result ? 'var(--green-l)' : 'var(--red-l)') : 'var(--glass-bg)',
        boxShadow: isOver ? '0 0 0 3px color-mix(in srgb, var(--orange) 30%, transparent)' : undefined,
        display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'border-color .15s, background .15s',
      }}
    >
      <span style={{ fontSize: '.88rem', color: 'var(--text2)', direction: 'rtl' }}>{pair.ar}</span>
      {placed && (
        <span style={{ fontSize: '.85rem', fontWeight: 700, color: result === false ? 'var(--red)' : result === true ? 'var(--green)' : 'var(--orange)' }}>
          {placed.nl}
        </span>
      )}
    </div>
  )
}

function MatchingExercise() {
  const words = useWords()
  const reducedMotion = useReducedMotion()
  const uid = useId()

  const [s, setS] = useState(() => buildMatchExercise(words, 5, seed()))
  const [placed, setPlaced] = useState<Record<string, string>>({})  // arId → nlId
  const [tapSel, setTapSel] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, boolean> | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )

  // nlId → arId map (inverted from placed)
  const nlToAr: Record<string, string> = {}
  for (const [arId, nlId] of Object.entries(placed)) nlToAr[nlId] = arId

  const moveNl = useCallback((nlId: string, arId: string) => {
    setPlaced(prev => {
      const next = { ...prev }
      // remove from old slot
      for (const k of Object.keys(next)) if (next[k] === nlId) delete next[k]
      next[arId] = nlId
      return next
    })
  }, [])

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id))
  const onDragEnd   = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (over) moveNl(String(active.id), String(over.id))
  }

  const handleNlTap = (nlId: string) => {
    if (results) return
    setTapSel(prev => prev === nlId ? null : nlId)
  }
  const handleArTap = (arId: string) => {
    if (results) return
    if (!tapSel) return
    moveNl(tapSel, arId)
    setTapSel(null)
  }

  const check = () => {
    const userMap: Record<string, string> = {}
    for (const [arId, nlId] of Object.entries(placed)) userMap[nlId] = arId
    const { results: r } = checkMatching(userMap, s.pairs)
    setResults(r)
  }

  const reset = () => {
    setS(buildMatchExercise(words, 5, seed()))
    setPlaced({})
    setTapSel(null)
    setResults(null)
  }

  const score = results
    ? { correct: Object.values(results).filter(Boolean).length, total: s.pairs.length }
    : null

  const activePair = activeId ? s.pairs.find(p => p.id === activeId) : null
  const placedCount = Object.keys(placed).length

  const announcements = {
    ...defaultAnnouncements,
    onDragStart: ({ active }: DragStartEvent) =>
      `بدأ سحب "${s.pairs.find(p => p.id === active.id)?.nl ?? ''}"`,
    onDragEnd: ({ active, over }: DragEndEvent) =>
      over
        ? `تمّ وضع "${s.pairs.find(p => p.id === active.id)?.nl ?? ''}" على "${s.pairs.find(p => p.id === over.id)?.ar ?? ''}"`
        : 'تمّ إلغاء السحب',
    onDragCancel: () => 'تمّ إلغاء السحب',
  }

  return (
    <div dir="rtl">
      <p style={{ fontSize: '.88rem', color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
        اسحب الكلمات الهولندية على معانيها العربية. على الهاتف: اضغط كلمة ثمّ اضغط المعنى.
        <br /><span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>للوحة المفاتيح: Space لبدء السحب، ثمّ الأسهم للتنقّل.</span>
      </p>

      <DndContext
        id={uid}
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        accessibility={{ announcements }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* NL column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 2 }}>
              🇳🇱 الكلمات الهولندية
            </div>
            {s.nlShuffled.map(p => (
              <div key={p.id} onClick={() => handleNlTap(p.id)}>
                <DraggableNlChip
                  pair={p}
                  selected={tapSel === p.id}
                  result={results ? results[p.id] : undefined}
                />
              </div>
            ))}
          </div>
          {/* AR drop targets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 2 }}>
              🇸🇦 المعاني العربية
            </div>
            {s.arShuffled.map(p => {
              const nlId = placed[p.id]
              const placedPair = nlId ? s.pairs.find(x => x.id === nlId) ?? null : null
              return (
                <DroppableArSlot
                  key={p.id}
                  pair={p}
                  placed={placedPair}
                  result={results ? results[p.id] : undefined}
                  onTap={() => handleArTap(p.id)}
                />
              )
            })}
          </div>
        </div>

        {createPortal(
          <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
            {activePair && (
              <div style={{
                ...chip(true),
                boxShadow: 'var(--elev-2), 0 8px 24px rgba(0,0,0,0.18)',
                pointerEvents: 'none',
                transform: 'scale(1.05)',
                transformOrigin: 'center center',
                cursor: 'grabbing',
              }}>
                {activePair.nl}
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!results && (
          <button
            onClick={check}
            disabled={placedCount < s.pairs.length}
            className="btn-shine"
            aria-label={`تحقّق من ${placedCount} من ${s.pairs.length} إجابة`}
            style={{
              background: placedCount < s.pairs.length ? 'var(--surface3)' : 'var(--btn-bg)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              color: placedCount < s.pairs.length ? 'var(--muted)' : 'var(--text)',
              border: '1px solid var(--btn-border)', borderRadius: 12, padding: '9px 22px',
              fontWeight: 700, fontSize: '.88rem', cursor: placedCount < s.pairs.length ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✅ تحقّق ({placedCount}/{s.pairs.length})
          </button>
        )}
        {results && <ResetBtn onClick={reset} />}
      </div>
      {score && <ScoreBadge correct={score.correct} total={score.total} />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. SENTENCE ORDERING EXERCISE
// ═════════════════════════════════════════════════════════════════════════════
function SortableWord({ item, checked, correct }: {
  item: SortWord; checked: boolean; correct?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`كلمة: ${item.word}`}
      style={{
        ...chip(false, checked && correct === true, checked && correct === false),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 9 : 1,
        position: 'relative',
        direction: 'ltr',
      }}
    >
      {item.word}
    </div>
  )
}

function SortingExercise() {
  const reducedMotion = useReducedMotion()
  const uid = useId()

  const [s, setS] = useState<SortExercise | null>(() =>
    SORT_SENTENCES.length
      ? buildSortExercise(SORT_SENTENCES[Math.floor(Math.random() * SORT_SENTENCES.length)], seed())
      : null
  )
  const [items, setItems] = useState<SortWord[]>(() => s?.words ?? [])
  const [checked, setChecked] = useState(false)
  const [activeItem, setActiveItem] = useState<SortWord | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // safe with short-circuit when s is null
  const correct = checked && !!s && checkSortOrder(items.map(i => i.id), s.correctIds)

  const announcements = {
    ...defaultAnnouncements,
    onDragStart: ({ active }: DragStartEvent) => {
      const w = items.find(i => i.id === active.id)
      return `بدأ سحب "${w?.word ?? ''}"`
    },
    onDragEnd: ({ active, over }: DragEndEvent) => {
      if (!over) return 'تمّ إلغاء السحب'
      const from = items.findIndex(i => i.id === active.id) + 1
      const to   = items.findIndex(i => i.id === over.id)   + 1
      return `انتقلت "${items.find(i => i.id === active.id)?.word ?? ''}" من الموضع ${from} إلى ${to}`
    },
    onDragCancel: () => 'تمّ إلغاء السحب',
  }

  const onDragStart = ({ active }: DragStartEvent) =>
    setActiveItem(items.find(i => i.id === active.id) ?? null)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveItem(null)
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    setItems(prev => arrayMove(prev, oldIdx, newIdx))
  }

  const reset = () => {
    if (!SORT_SENTENCES.length) return
    const next = buildSortExercise(
      SORT_SENTENCES[Math.floor(Math.random() * SORT_SENTENCES.length)], seed()
    )
    if (!next) return
    setS(next)
    setItems(next.words)
    setChecked(false)
  }

  // All hooks called above — safe to return early now
  if (!s) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: '.9rem' }}>
        📝 لا توجد جمل للتدريب حالياً — ستُضاف قريباً.
      </div>
    )
  }

  return (
    <div dir="rtl">
      <p style={{ fontSize: '.88rem', color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
        رتّب الكلمات لتكوين الجملة الهولندية الصحيحة.
        <br /><span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>للوحة المفاتيح: Space لاختيار كلمة، ثمّ الأسهم لتحريكها، Enter للتأكيد.</span>
      </p>

      <DndContext
        id={uid}
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        accessibility={{ announcements }}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div
            role="list"
            aria-label="كلمات الجملة — رتّبها بالسحب"
            style={{ display: 'flex', flexDirection: 'column', gap: 8, direction: 'ltr' }}
          >
            {items.map(item => (
              <div key={item.id} role="listitem">
                <SortableWord
                  item={item}
                  checked={checked}
                  correct={checked ? item.id === s.correctIds[items.indexOf(item)] : undefined}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        {createPortal(
          <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
            {activeItem && (
              <div style={{
                ...chip(true),
                direction: 'ltr',
                boxShadow: 'var(--elev-2), 0 8px 24px rgba(0,0,0,0.18)',
                pointerEvents: 'none',
                transform: 'scale(1.05)',
                transformOrigin: 'center center',
                cursor: 'grabbing',
              }}>
                {activeItem.word}
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {checked && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10,
          background: correct ? 'var(--green-l)' : 'var(--red-l)',
          border: `1px solid ${correct ? 'var(--green)' : 'var(--red)'}`,
          fontSize: '.88rem', color: 'var(--text)', direction: 'ltr',
        }}>
          {correct ? '✅ ممتاز! الجملة صحيحة.' : `❌ الترتيب الصحيح: "${s.sentence}"`}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!checked && (
          <button
            onClick={() => setChecked(true)}
            className="btn-glass"
            style={{ color: 'var(--text)', borderRadius: 12,
              padding: '9px 22px', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✅ تحقّق
          </button>
        )}
        {checked && <ResetBtn onClick={reset} />}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. FILL THE GAP EXERCISE
// ═════════════════════════════════════════════════════════════════════════════
function DraggableChip({ chip: c, used, selected, onTap }: {
  chip: Chip; used?: boolean; selected?: boolean; onTap: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: c.id, disabled: used,
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onTap}
      aria-label={`كلمة: ${c.word}${used ? ' (مستخدمة)' : ''}`}
      style={{
        ...chip(selected, undefined, undefined),
        opacity: used ? 0.3 : isDragging ? 0.25 : 1,
        cursor: used ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        outline: selected ? '2px solid var(--orange)' : undefined, outlineOffset: 2,
        direction: 'ltr',
      }}
    >
      {c.word}
    </div>
  )
}

function GapDropZone({ placed, isOver, result, onTap }: {
  placed: Chip | null; isOver: boolean; result?: boolean; onTap: () => void
}) {
  const hasResult = result !== undefined
  return (
    <span
      onClick={onTap}
      aria-label={placed ? `الفراغ: ${placed.word}` : 'اسحب الكلمة الصحيحة هنا'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 90, minHeight: 34, padding: '4px 12px',
        borderRadius: 8, border: `2px dashed ${
          isOver ? 'var(--orange)' : hasResult ? (result ? 'var(--green)' : 'var(--red)') : 'var(--border2)'
        }`,
        background: isOver ? 'var(--orange-l)' : hasResult ? (result ? 'var(--green-l)' : 'var(--red-l)') : 'var(--surface3)',
        fontSize: '.9rem', fontWeight: 700,
        color: hasResult ? (result ? 'var(--green)' : 'var(--red)') : placed ? 'var(--orange)' : 'var(--muted)',
        cursor: 'pointer', verticalAlign: 'middle', margin: '0 4px',
        direction: 'ltr',
      }}
    >
      {placed ? placed.word : '?'}
    </span>
  )
}

function buildGap(words: ReturnType<typeof useWords>, s: number): GapExercise | null {
  const candidates = words.filter(w => w.ex && w.ex.includes(w.nl))
  if (!candidates.length) return null
  const picked = candidates[s % candidates.length]
  const distractors = words.filter(w => w.nl !== picked.nl).map(w => w.nl)
  return buildGapExercise(picked.ex!, picked.nl, distractors, s)
}

function FillGapExercise() {
  const words = useWords()
  const reducedMotion = useReducedMotion()
  const uid = useId()

  const [s, setS] = useState(seed)
  const [ex, setEx]   = useState(() => buildGap(words, s))
  const [placed, setPlaced] = useState<Chip | null>(null)
  const [tapSel, setTapSel] = useState<string | null>(null) // chip id
  const [result, setResult] = useState<boolean | null>(null)
  const [activeChipId, setActiveChipId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const { setNodeRef: setBlankRef, isOver } = useDroppable({ id: 'blank' })

  if (!ex) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: '.9rem' }}>
        📚 أضف مفردات مع جمل أمثلة لتفعيل هذا التمرين.
      </div>
    )
  }

  const activeChip = activeChipId ? ex.chips.find(x => x.id === activeChipId) ?? null : null

  const onDragStart = ({ active }: DragStartEvent) => setActiveChipId(String(active.id))
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveChipId(null)
    if (!over || over.id !== 'blank') return
    const c = ex.chips.find(x => x.id === active.id)
    if (c) { setPlaced(c); setTapSel(null) }
  }

  const handleChipTap = (c: Chip) => {
    if (result !== null) return
    if (tapSel === c.id) { setTapSel(null); return }
    setTapSel(c.id)
  }

  const handleBlankTap = () => {
    if (result !== null) return
    if (!tapSel) { setPlaced(null); return }
    const c = ex.chips.find(x => x.id === tapSel)
    if (c) { setPlaced(c); setTapSel(null) }
  }

  const check = () => setResult(checkGap(placed?.id ?? null, ex.answerId))

  const reset = () => {
    const ns = seed()
    setS(ns)
    setEx(buildGap(words, ns))
    setPlaced(null)
    setTapSel(null)
    setResult(null)
  }

  const announcements = {
    ...defaultAnnouncements,
    onDragEnd: ({ active, over }: DragEndEvent) =>
      over?.id === 'blank'
        ? `تمّ وضع "${ex.chips.find(c => c.id === active.id)?.word ?? ''}" في الفراغ`
        : 'تمّ إلغاء السحب',
    onDragCancel: () => 'تمّ إلغاء السحب',
  }

  return (
    <div dir="rtl">
      <p style={{ fontSize: '.88rem', color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
        اسحب الكلمة الصحيحة لملء الفراغ. على الهاتف: اضغط كلمة ثمّ اضغط الفراغ.
      </p>

      <DndContext id={uid} sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} accessibility={{ announcements }}>
        {/* Gapped sentence */}
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--r-sm)',
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          fontSize: '1rem', lineHeight: 2, marginBottom: 16, direction: 'ltr',
        }}>
          <span>{ex.before}</span>
          <span ref={setBlankRef}>
            <GapDropZone placed={placed} isOver={isOver} result={result ?? undefined} onTap={handleBlankTap} />
          </span>
          <span>{ex.after}</span>
        </div>

        {/* Word chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', direction: 'ltr' }}>
          {ex.chips.map(c => (
            <DraggableChip
              key={c.id}
              chip={c}
              used={placed?.id === c.id && result !== null ? false : placed?.id === c.id && tapSel !== c.id ? true : false}
              selected={tapSel === c.id}
              onTap={() => handleChipTap(c)}
            />
          ))}
        </div>

        {createPortal(
          <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
            {activeChip && (
              <div style={{
                ...chip(true),
                direction: 'ltr',
                boxShadow: 'var(--elev-2), 0 8px 24px rgba(0,0,0,0.18)',
                pointerEvents: 'none',
                transform: 'scale(1.05)',
                transformOrigin: 'center center',
                cursor: 'grabbing',
              }}>
                {activeChip.word}
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {result !== null && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10, fontSize: '.88rem',
          background: result ? 'var(--green-l)' : 'var(--red-l)',
          border: `1px solid ${result ? 'var(--green)' : 'var(--red)'}`,
          color: 'var(--text)',
        }}>
          {result ? '✅ صحيح! أحسنت.' : `❌ الإجابة الصحيحة: "${ex.answer}"`}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {result === null && (
          <button
            onClick={check}
            disabled={!placed}
            className="btn-shine"
            style={{
              background: placed ? 'var(--btn-bg)' : 'var(--surface3)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              color: placed ? 'var(--text)' : 'var(--muted)',
              border: '1px solid var(--btn-border)', borderRadius: 12, padding: '9px 22px',
              fontWeight: 700, fontSize: '.88rem',
              cursor: placed ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            }}
          >
            ✅ تحقّق
          </button>
        )}
        {result !== null && <ResetBtn onClick={reset} />}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Exercises section
// ═════════════════════════════════════════════════════════════════════════════
const MODES: { id: Mode; icon: string; label: string; desc: string }[] = [
  { id: 'matching', icon: '🔗', label: 'المطابقة',       desc: 'طابق الكلمات الهولندية مع معانيها العربية' },
  { id: 'sorting',  icon: '🔀', label: 'ترتيب الجملة',   desc: 'رتّب كلمات الجملة الهولندية بالترتيب الصحيح' },
  { id: 'gap',      icon: '⬜', label: 'ملء الفراغ',      desc: 'اسحب الكلمة الصحيحة لإكمال الجملة' },
]

export default function Exercises() {
  const [mode, setMode] = useState<Mode>('matching')
  // Key forces remount when mode changes, resetting all exercise state
  const [key, setKey] = useState(0)

  const switchMode = (m: Mode) => { setMode(m); setKey(k => k + 1) }

  return (
    <div dir="rtl" style={{ padding: '24px 28px 80px', maxWidth: 760, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--orange)' }}>🎮</span> تمارين تفاعلية
      </h2>
      <p style={{ fontSize: '.88rem', color: 'var(--text2)', marginBottom: 18, lineHeight: 1.6 }}>
        تمارين مُولَّدة من مفرداتك. تدعم السحب والإفلات ولوحة المفاتيح واللمس.
      </p>

      {/* Mode selector */}
      <div role="tablist" aria-label="نوع التمرين"
        style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            aria-controls={`exercise-panel-${m.id}`}
            id={`exercise-tab-${m.id}`}
            onClick={() => switchMode(m.id)}
            style={{
              flex: 1, minWidth: 120, padding: '10px 14px',
              border: `1px solid ${mode === m.id ? 'var(--orange)' : 'var(--glass-border)'}`,
              borderRadius: 12,
              background: mode === m.id ? 'var(--orange-l)' : 'var(--glass-bg)',
              color: mode === m.id ? 'var(--orange)' : 'var(--text2)',
              fontWeight: mode === m.id ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '.85rem',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Exercise panel */}
      {MODES.map(m => (
        <div
          key={m.id}
          role="tabpanel"
          id={`exercise-panel-${m.id}`}
          aria-labelledby={`exercise-tab-${m.id}`}
          hidden={mode !== m.id}
          style={{ display: mode === m.id ? undefined : 'none' }}
        >
          <div style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)', borderRadius: 'var(--r)',
            padding: '20px 18px', boxShadow: 'var(--elev-1)',
          }}>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12 }}>
              {m.icon} {m.desc}
            </div>
            {mode === 'matching' && <MatchingExercise key={key} />}
            {mode === 'sorting'  && <SortingExercise  key={key} />}
            {mode === 'gap'      && <FillGapExercise  key={key} />}
          </div>
        </div>
      ))}
    </div>
  )
}
