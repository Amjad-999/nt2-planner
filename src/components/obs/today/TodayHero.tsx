import { motion } from 'framer-motion'
import type { LessonItem, SessionRecord } from '@/features/observatory/types'
import { useMotionLevel, useMedia } from '@/hooks/useObs'
import { layoutTransition } from '@/features/observatory/motion'
import { CONTEXT_NL, nlDate, pad2, mins } from '@/features/observatory/format'
import { Constellation } from '../Constellation'
import { Button, Meta, Nl, Chip } from '../ui'
import { IArrowRight, IClock, IWarningCircle, ICheckCircle } from '../icons'

/* The Today hero answers the first two daily questions — what will I
   practise, and what should I do next — with exactly one primary action.
   Six states; each one's copy is specific and never punitive. */

export type HeroVariant = 'first' | 'start' | 'resume' | 'earlier' | 'missing' | 'done'

interface Props {
  variant: HeroVariant
  item?: LessonItem
  now: number
  sessionNo: number
  estMin: number
  estLabel: string
  nextLabel?: string
  earlierDay?: string
  done?: SessionRecord
  primary: { label: string; onClick: () => void }
  secondary?: { label: string; onClick: () => void }
  extensionNote?: string
}

const TITLES: Record<HeroVariant, (p: Props) => string> = {
  first: () => 'لنبدأ من موقف حقيقي.',
  start: (p) => `اليوم: ${p.item?.topicAr ?? ''}`,
  resume: () => 'تابِع من حيث توقفت.',
  earlier: (p) => `جلسة ${p.earlierDay ?? ''} ما زالت محفوظة.`,
  missing: () => 'محتوى هذه الجلسة لم يعد متاحًا.',
  done: () => 'أنجزت جلسة اليوم.',
}

export function TodayHero(p: Props) {
  const level = useMotionLevel()
  const compact = useMedia('(max-width: 899px)')
  const { variant, item } = p
  const meta = [
    nlDate(p.now).toUpperCase(),
    variant === 'done' ? `VOLTOOID · ${mins(p.done?.actualMin ?? 0)} MIN` : `SESSIE ${pad2(p.sessionNo)}`,
    variant === 'done' || variant === 'missing' ? '' : `≈ ${p.estMin} MIN`,
  ].filter(Boolean).join(' · ')

  const nodes = item ? item.expressions.slice(0, 4).map((x) => ({
    id: x.id, nl: x.nl, gloss: x.ar,
    contexts: [0, ...(x.contexts.includes('telefoon') ? [1] : [])],
  })) : []
  const contexts = item ? Array.from(new Set([CONTEXT_NL[item.context], ...item.expressions.flatMap((x) => x.contexts.map((c) => CONTEXT_NL[c]))])) : []

  return (
    <section className="o-night o-hero" aria-labelledby="today-title">
      <div className="o-hero__text">
        <Meta>{meta}</Meta>
        <h1 id="today-title" className="o-display" tabIndex={-1} style={{ outline: 'none' }}>{TITLES[variant](p)}</h1>
        {item && variant !== 'missing' && <Nl display as="p" className="o-hero__nl is-italic">{item.titleNl}</Nl>}
        <p className="o-lede">
          {variant === 'first' && <>{item?.intentionAr} كل جلسة تمرّ بخطوات قصيرة: تفهم، تحاول، ترى ملاحظات واضحة، ثم تستخدم الكلمات بجملك أنت.</>}
          {variant === 'start' && item?.intentionAr}
          {variant === 'resume' && <>إجاباتك ومكانك محفوظان كما تركتهما.</>}
          {variant === 'earlier' && <>توقفت عند «{p.nextLabel}». لا بأس — أكمِلها الآن، أو ابدأ موضوع اليوم وتبقى هذه في «أعمال غير مكتملة».</>}
          {variant === 'missing' && <>ربما أُزيل النص من التطبيق. سجلّك وكلماتك المحفوظة لم تتأثر، ويمكنك بدء جلسة جديدة.</>}
          {variant === 'done' && p.done && <>
            {p.done.questions} أسئلة ({p.done.firstTry} من المحاولة الأولى) · {p.done.buildsRight} من {p.done.builds} جمل صحيحة · {p.done.saved.length} تعبير محفوظ ·
            {' '}{p.done.retell === 'skipped' ? 'بلا إعادة سرد' : p.done.retell === 'typed' ? 'إعادة سرد مكتوبة' : 'إعادة سرد مسجّلة'}.
          </>}
        </p>

        {(variant === 'resume' || variant === 'earlier') && p.nextLabel && (
          <motion.div layoutId={level === 'reduced' ? undefined : 'o-step-plane'} transition={layoutTransition(level)} className="o-hero__next">
            <span className="o-meta">VOLGENDE</span>
            <strong>{p.nextLabel}</strong>
          </motion.div>
        )}
        {variant === 'missing' && <Chip tone="warn" icon={IWarningCircle}>المحتوى غير متاح</Chip>}
        {variant === 'done' && <Chip tone="mint" icon={ICheckCircle}>مكتملة — الأدلة في «تعلّمي»</Chip>}

        <div className="o-row o-hero__actions">
          <Button variant="primary" iconEnd={IArrowRight} flipEnd onClick={p.primary.onClick} data-testid="today-primary">
            {p.primary.label}
          </Button>
          {p.secondary && <Button variant="night" onClick={p.secondary.onClick}>{p.secondary.label}</Button>}
        </div>
        <p className="o-small o-hero__time">
          <IClock size={16} />
          <span>{p.extensionNote ?? p.estLabel}</span>
        </p>
      </div>

      {item && variant !== 'missing' && (
        <div className="o-hero__figure">
          <Constellation
            center={{ nl: item.symbolNl }}
            nodes={nodes}
            contexts={contexts}
            compact={compact}
            animate={level !== 'reduced'}
            summary={`تعابير هذا الموضوع: ${item.expressions.slice(0, 4).map((x) => `${x.nl} (${x.ar})`).join('، ')}. السياقات: ${contexts.join('، ')}.`}
          />
        </div>
      )}
    </section>
  )
}
