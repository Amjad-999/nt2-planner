/* ── Observatory: the daily-learning layer ─────────────────────────────────
   Two families of shapes live here:
   • content  — static, typed lesson material (src/data/observatory/*)
   • state    — what the learner actually did, persisted inside the single
                app store as `observatory` and synced like every other field.
   Every id in content is stable: saved progress references it, so renaming an
   id orphans the learner's evidence. Add new ids; never recycle old ones. */

export type ContextKey = 'gezondheid' | 'afspraken' | 'werk' | 'nieuws' | 'winkel' | 'telefoon' | 'thuis' | 'overig'
export type MotionPref = 'system' | 'reduced' | 'standard' | 'expressive'
export type MotionLevel = 'reduced' | 'standard' | 'expressive'
export type SkinKey = 'observatory' | 'classic'
export type SessionLength = 20 | 25 | 30

/* ═══════════════════════════ content ═══════════════════════════ */

export interface QuestionOption {
  id: string
  textNl: string
  /** Why this option is right or wrong — shown only after an attempt. */
  whyAr: string
}

export type QuestionSkill = 'keyword' | 'paraphrase' | 'detail'

export interface LessonQuestion {
  id: string
  promptNl: string
  /** Rung 2 of the help ladder: the same question in simpler Dutch. */
  simpleNl: string
  /** Rung 3: what the question asks, in Arabic. Never the answer. */
  explainAr: string
  /** Rung 1: the words in the question worth looking for in the text. */
  keywords: string[]
  /** Where to look (Arabic), offered with rung 1 — narrows, never answers. */
  locateAr: string
  options: QuestionOption[]
  correct: string
  /** Paragraph index + exact sentence(s) that support the right answer. */
  support: { paragraph: number; sentences: string[] }
  /** How the text says it vs. how the right option says it. */
  paraphrase: { text: string; option: string }
  skill: QuestionSkill
}

export interface ExpressionSeed {
  /** Stable id, e.g. 'x-afspraak-verzetten'. */
  id: string
  nl: string
  ar: string
  simpleNl: string
  /** The sentence from the passage where it appears. */
  example: string
  /** Retrieval cue: a new sentence with ___ where the answer goes. */
  clozeNl: string
  answer: string
  /** Alternative sets of word stems; a text "uses" the expression when every
   *  stem of ANY one set starts a word in it (handles split verbs: haal … op). */
  match: string[][]
  contexts: ContextKey[]
}

export type BuildRule = 'v2' | 'verb-final'

export interface BuildExercise {
  id: string
  promptAr: string
  /** Fixed words shown before the tiles (e.g. "Ik bel u,"). */
  prefix: string
  /** Tiles in the correct order. They are shuffled deterministically for display. */
  tokens: string[]
  /** Other grammatical orders, as index lists into `tokens`. */
  accept: number[][]
  rule: BuildRule
  ruleAr: string
  /** Index (in `tokens`) of the finite verb — drives the targeted hint. */
  verbIndex: number
}

export interface RetellPoint { ar: string; nl: string; any: string[] }

export interface GlossaryEntry { nl: string; ar: string; simpleNl: string }

export interface LessonItem {
  id: string
  context: ContextKey
  /** listen = the passage is heard first (generated speech), text as help. */
  kind: 'read' | 'listen'
  titleNl: string
  /** One Dutch word at the centre of the item's constellation. */
  symbolNl: string
  topicAr: string
  intentionAr: string
  paragraphs: string[]
  glossary: GlossaryEntry[]
  questions: LessonQuestion[]
  expressions: ExpressionSeed[]
  builds: BuildExercise[]
  retell: { promptNl: string; promptAr: string; points: RetellPoint[] }
}

export type TurnKind = 'request' | 'info' | 'question' | 'close'

export interface RoleplayTurnSpec {
  partnerNl: string
  goalAr: string
  hintNl: string
  modelNl: string
  kind: TurnKind
  /** Stems that show the goal was addressed (any set, all stems in it). */
  expect: string[][]
  tipAr: string
}

export interface RoleplayScenario {
  id: string
  context: ContextKey
  titleAr: string
  titleNl: string
  situationAr: string
  roleNl: string
  partnerAr: string
  formal: boolean
  turns: RoleplayTurnSpec[]
  closingNl: string
  expressionIds: string[]
}

/* ═══════════════════════════ state ═══════════════════════════ */

export interface ActiveRule {
  uses: number
  contexts: number
  days: number
  countSelfReports: boolean
}

export interface ObsSettings {
  targetLang: 'nl'
  uiLang: 'ar'
  assistLang: 'ar' | 'none'
  motion: MotionPref
  skin: SkinKey
  sessionMinutes: SessionLength
  audioAutoplay: boolean
  showDemo: boolean
  activeRule: ActiveRule
}

export type StepKind = 'input' | 'questions' | 'words' | 'build' | 'retell' | 'recall' | 'review'

export interface StepRun {
  kind: StepKind
  estMin: number
  activeMs: number
  startedAt: number
  doneAt: number
}

export interface QuestionAnswer {
  choice: string
  tries: number
  correct: boolean
  /** Highest help rung opened before answering (0 = none). */
  help: number
}

export type TypedResult = '' | 'correct' | 'close' | 'wrong'

export interface WordAnswer {
  typed: string
  result: TypedResult
  tries: number
  own: string
  ownContext: ContextKey | ''
  ownResult: '' | 'independent' | 'copied' | 'missing' | 'too-short'
}

export interface BuildAnswer { order: number[]; tries: number; correct: boolean }

export interface RecallTarget {
  id: string
  source: 'expression' | 'vocab' | 'session'
  nl: string
  ar: string
  cue: string
  answer: string
}

export interface RecallAnswer { typed: string; result: TypedResult; tries: number }

export interface RetellAnswer {
  typed: string
  recordingId: string
  durationSec: number
  selfCheck: number[]
  skipped: boolean
}

export interface SessionRun {
  id: string
  itemId: string
  dayKey: string
  createdAt: number
  updatedAt: number
  stepIndex: number
  subIndex: number
  steps: StepRun[]
  questionIds: string[]
  wordIds: string[]
  buildIds: string[]
  recall: RecallTarget[]
  answers: {
    questions: Record<string, QuestionAnswer>
    words: Record<string, WordAnswer>
    builds: Record<string, BuildAnswer>
    retell: RetellAnswer
    recall: Record<string, RecallAnswer>
  }
  /** Unsent typed input, keyed by field — survives leaving the lesson. */
  drafts: Record<string, string>
  extension: 'none' | 'offered' | 'started' | 'done'
}

export interface SessionRecord {
  id: string
  itemId: string
  dayKey: string
  finishedAt: number
  estMin: number
  actualMin: number
  questions: number
  firstTry: number
  builds: number
  buildsRight: number
  saved: string[]
  retell: 'typed' | 'recorded' | 'both' | 'skipped'
  recalled: number
  recallTotal: number
}

export type UseKind = 'practised' | 'independent' | 'self-report'

export interface ExpressionUse {
  id: string
  at: number
  dayKey: string
  kind: UseKind
  context: ContextKey
  text: string
  source: 'lesson' | 'practice' | 'words' | 'retell' | 'recall'
}

export interface ExpressionRecord {
  id: string
  nl: string
  ar: string
  example: string
  itemId: string
  seenAt: number
  savedAt: number
  uses: ExpressionUse[]
}

export interface Attempt {
  id: string
  at: number
  kind: 'retell' | 'roleplay' | 'sentence'
  refId: string
  text: string
  recordingId: string
  durationSec: number
}

export interface Difficulty {
  key: string
  count: number
  lastAt: number
  examples: string[]
}

export interface Note {
  id: string
  text: string
  ref: string
  createdAt: number
  updatedAt: number
  deleted: boolean
}

export interface RoleplayTurn { i: number; text: string; recordingId: string; at: number }

export interface RoleplayRun {
  id: string
  scenarioId: string
  startedAt: number
  updatedAt: number
  turns: RoleplayTurn[]
  draft: string
  done: boolean
}

export interface RoleplaySummary {
  id: string
  scenarioId: string
  finishedAt: number
  turns: number
  issues: string[]
}

export interface PlanPrefs {
  /** 0 = Sunday … 6 = Saturday. */
  days: number[]
  focus: ContextKey[]
  note: string
}

export interface ObsState {
  v: 1
  settings: ObsSettings
  session: SessionRun | null
  deferred: SessionRun[]
  history: SessionRecord[]
  expressions: Record<string, ExpressionRecord>
  attempts: Attempt[]
  difficulties: Record<string, Difficulty>
  notes: Note[]
  roleplay: RoleplayRun | null
  roleplays: RoleplaySummary[]
  plan: PlanPrefs
  updatedAt: number
}
