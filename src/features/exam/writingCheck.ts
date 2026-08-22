import type { ExamWritingItem } from '@/store/types'

/**
 * مصحّح الكتابة المحلّي — يعمل دائمًا، بلا إنترنت وبلا مفتاح.
 *
 * Deliberately conservative: every rule here must be one we are confident about,
 * because a false accusation is worse than a missed error. Anything that needs
 * real language judgement is left to the AI layer in features/ai/writingFeedback.
 */

export type CriterionKey = 'inhoud' | 'lengte' | 'vorm' | 'register' | 'variatie'

export interface WritingCriterion {
  key: CriterionKey
  labelAr: string
  /** 0..100 for this criterion alone. */
  score: number
  /** Share of the total score. All weights add up to 100. */
  weight: number
  notesAr: string[]
}

export interface WritingIssue {
  /** The exact fragment found in the text, so the user can locate it. */
  found: string
  /** What it should be. */
  fixNl: string
  whyAr: string
}

export interface WritingReport {
  total: number
  criteria: WritingCriterion[]
  issues: WritingIssue[]
  /** Points from the task that we could not find in the answer. */
  missingPointsAr: string[]
  coveredPoints: number
  wordCount: number
  sentenceCount: number
  avgSentenceLength: number
  lexicalVariety: number
  connectorsUsed: string[]
}

const WEIGHTS: Record<CriterionKey, number> = {
  inhoud: 40,
  lengte: 15,
  vorm: 15,
  register: 15,
  variatie: 15,
}

/** Connectors a B1 writer is expected to reach for. */
const CONNECTORS = [
  'omdat', 'want', 'daarom', 'dus', 'maar', 'echter', 'bovendien', 'daarnaast',
  'ook', 'toch', 'hoewel', 'terwijl', 'zodat', 'als', 'wanneer', 'nadat',
  'voordat', 'ten eerste', 'ten tweede', 'tot slot', 'bijvoorbeeld',
]

const GREETING = /\b(beste|geachte|hallo|hoi|goedemorgen|goedemiddag)\b/i
const CLOSING = /(met vriendelijke groet|vriendelijke groet(en)?|hartelijke groet(en)?|mvg|alvast bedankt|met dank|groetjes)/i

/** Rules we are sure about. Order matters only for readability. */
const SURE_RULES: { re: RegExp; fix: (m: string) => string; whyAr: string }[] = [
  {
    re: /\b(groter|kleiner|beter|slechter|ouder|jonger|hoger|lager|sneller|langer|korter|duurder|goedkoper|meer|minder)\s+als\b/gi,
    fix: (m) => m.replace(/\bals\b/i, 'dan'),
    whyAr: 'بعد صيغة التفضيل تُستخدم dan لا als.',
  },
  {
    re: /\bhun\s+(hebben|zijn|gaan|komen|doen|willen|kunnen|moeten)\b/gi,
    fix: (m) => m.replace(/\bhun\b/i, 'zij'),
    whyAr: 'hun ليست فاعلًا. الفاعل zij أو ze.',
  },
  {
    re: /\bme\s+(broer|zus|vader|moeder|man|vrouw|kind|kinderen|huis|werk|baan|auto|buurman|buurvrouw|collega|dochter|zoon)\b/gi,
    fix: (m) => m.replace(/^me\b/i, 'mijn'),
    whyAr: 'صيغة الملكية هي mijn. أمّا me فهي عامية.',
  },
  {
    re: /\bik\s+wordt\b/gi,
    fix: () => 'ik word',
    whyAr: 'مع ik لا تُضاف t إلى الفعل.',
  },
  {
    re: /\b(hij|zij|ze|het|u)\s+word\b/gi,
    fix: (m) => `${m.split(/\s+/)[0]} wordt`,
    whyAr: 'مع الغائب المفرد تُضاف t إلى الفعل.',
  },
  {
    re: /\bik\s+heb\s+geen\s+\w+\s+niet\b/gi,
    fix: (m) => m.replace(/\s+niet\b/i, ''),
    whyAr: 'نفي مزدوج. اكتفِ بـ geen أو niet، لا الاثنين.',
  },
  {
    re: /\bik\s+ben\s+(het\s+)?eens\s+met\s+jou\b/gi,
    fix: () => 'ik ben het met u eens',
    whyAr: 'في الرسائل الرسمية استخدم u، والترتيب الصحيح: het met u eens.',
  },
]

const INFORMAL = /\b(je|jij|jou|jouw|jullie|jouw|hoi|hey|groetjes)\b/gi

export function wordCount(text: string): number {
  return (text.trim().match(/[\p{L}\p{N}'-]+/gu) ?? []).length
}

function sentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Rounds to a whole number and clamps into 0..100. */
function pct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function scoreLength(wc: number, min: number, max: number): { score: number; noteAr: string } {
  if (wc === 0) return { score: 0, noteAr: 'لا يوجد نصّ بعد.' }
  if (wc >= min && wc <= max) return { score: 100, noteAr: `عدد الكلمات ${wc} داخل المدى المطلوب.` }
  if (wc < min) {
    const ratio = wc / min
    if (ratio >= 0.85) return { score: 70, noteAr: `النصّ أقصر بقليل. ينقصه ${min - wc} كلمة.` }
    return { score: pct(ratio * 55), noteAr: `النصّ قصير. ينقصه ${min - wc} كلمة على الأقل.` }
  }
  const over = wc - max
  if (over <= Math.ceil(max * 0.15)) return { score: 75, noteAr: `النصّ أطول بقليل، بزيادة ${over} كلمة.` }
  return { score: 45, noteAr: `النصّ طويل، بزيادة ${over} كلمة. الامتحان يحاسب على الطول.` }
}

export function checkWriting(text: string, task: ExamWritingItem): WritingReport {
  const clean = text ?? ''
  const low = clean.toLowerCase()
  const wc = wordCount(clean)
  const sents = sentences(clean)
  const avgSL = sents.length ? Math.round(wc / sents.length) : 0
  const words = low.match(/[\p{L}'-]+/gu) ?? []
  const lexicalVariety = words.length ? Math.round((new Set(words).size / words.length) * 100) : 0

  /* ── inhoud: the criterion that actually decides pass or fail ── */
  const missingPointsAr: string[] = []
  let covered = 0
  for (const p of task.points) {
    if (p.any.some((frag) => low.includes(frag.toLowerCase()))) covered += 1
    else missingPointsAr.push(p.ar)
  }
  const inhoudScore = task.points.length ? pct((covered / task.points.length) * 100) : 0
  const inhoudNotes = [`النقاط المُغطّاة: ${covered} من ${task.points.length}.`]
  if (missingPointsAr.length) inhoudNotes.push('راجع قائمة النقاط الناقصة أدناه.')

  /* ── lengte ── */
  const len = scoreLength(wc, task.minWords, task.maxWords)

  /* ── vorm: greeting and closing, only where the genre asks for it ── */
  const needsLetterForm = /email|mail|brief|klacht|verzoek/i.test(task.kind)
  const hasGreeting = GREETING.test(clean)
  const hasClosing = CLOSING.test(clean)
  const vormNotes: string[] = []
  let vormScore = 100
  if (needsLetterForm) {
    if (!hasGreeting) { vormScore -= 50; vormNotes.push('ابدأ بتحيّة مناسبة.') }
    if (!hasClosing) { vormScore -= 50; vormNotes.push('اختم بصيغة وداع.') }
    if (hasGreeting && hasClosing) vormNotes.push('التحيّة والخِتام موجودان.')
  } else {
    vormNotes.push('هذه المهمّة لا تتطلّب صيغة رسالة.')
  }
  vormScore = pct(vormScore)

  /* ── register ── */
  const registerNotes: string[] = []
  let registerScore = 100
  const informalHits = [...new Set((clean.match(INFORMAL) ?? []).map((m) => m.toLowerCase()))]
  if (task.register === 'formeel') {
    if (informalHits.length) {
      registerScore = pct(100 - informalHits.length * 25)
      registerNotes.push(`المهمّة رسمية، لكن النصّ فيه صيغ غير رسمية: ${informalHits.join(', ')}`)
    } else {
      registerNotes.push('الصيغة الرسمية محفوظة.')
    }
  } else {
    registerNotes.push('هذه المهمّة تسمح بالصيغة غير الرسمية.')
  }

  /* ── variatie: sentence length, vocabulary spread, connectors ── */
  const connectorsUsed = CONNECTORS.filter((c) => new RegExp(`\\b${c}\\b`, 'i').test(clean))
  const variatieNotes: string[] = []
  let variatieScore = 0
  if (avgSL >= 8 && avgSL <= 18) variatieScore += 35
  else if (avgSL >= 6 && avgSL <= 22) variatieScore += 22
  else if (wc > 0) { variatieScore += 8; variatieNotes.push(avgSL > 22 ? 'جملك طويلة. قسّمها.' : 'جملك قصيرة جدًا. اربطها.') }
  if (lexicalVariety >= 55) variatieScore += 35
  else if (lexicalVariety >= 40) variatieScore += 24
  else if (lexicalVariety >= 25) variatieScore += 12
  else if (wc > 0) variatieNotes.push('التكرار كثير. نوّع مفرداتك.')
  if (connectorsUsed.length >= 4) variatieScore += 30
  else if (connectorsUsed.length >= 2) variatieScore += 18
  else if (wc > 0) variatieNotes.push('استخدم روابط أكثر مثل omdat وdaarom وbovendien.')
  variatieScore = pct(variatieScore)
  if (connectorsUsed.length) variatieNotes.push(`الروابط المستخدمة: ${connectorsUsed.slice(0, 6).join(', ')}`)

  /* ── the sure-thing error list ── */
  const issues: WritingIssue[] = []
  const seen = new Set<string>()
  for (const rule of SURE_RULES) {
    for (const m of clean.matchAll(rule.re)) {
      const found = m[0].trim()
      const key = found.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      issues.push({ found, fixNl: rule.fix(found), whyAr: rule.whyAr })
    }
  }
  for (const s of sents) {
    const first = s.charAt(0)
    if (first && /\p{Ll}/u.test(first)) {
      const found = s.slice(0, 22)
      const key = `cap:${found.toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        issues.push({
          found,
          fixNl: first.toUpperCase() + s.slice(1, 22),
          whyAr: 'الجملة تبدأ بحرف كبير.',
        })
      }
      break
    }
  }

  const criteria: WritingCriterion[] = [
    { key: 'inhoud',   labelAr: 'المحتوى',        score: inhoudScore,   weight: WEIGHTS.inhoud,   notesAr: inhoudNotes },
    { key: 'lengte',   labelAr: 'الطول',          score: len.score,     weight: WEIGHTS.lengte,   notesAr: [len.noteAr] },
    { key: 'vorm',     labelAr: 'الشكل',          score: vormScore,     weight: WEIGHTS.vorm,     notesAr: vormNotes },
    { key: 'register', labelAr: 'مستوى الخطاب',   score: registerScore, weight: WEIGHTS.register, notesAr: registerNotes },
    { key: 'variatie', labelAr: 'التنوّع اللغوي', score: variatieScore, weight: WEIGHTS.variatie, notesAr: variatieNotes },
  ]

  const total = wc === 0 ? 0 : pct(criteria.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0))

  return {
    total,
    criteria,
    issues,
    missingPointsAr,
    coveredPoints: covered,
    wordCount: wc,
    sentenceCount: sents.length,
    avgSentenceLength: avgSL,
    lexicalVariety,
    connectorsUsed,
  }
}
