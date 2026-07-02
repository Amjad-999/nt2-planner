import { PASS_THRESHOLD } from '@/data/phases'
import type { CelebType } from '@/lib/celebrate'

export interface BadgeInput {
  streak: number
  learnedWords: number
  vocabWords: number
  examPassed: boolean
  examAttempted: boolean
  dailyTasks: number   // tasks recorded in today's dailyHistory
}

export interface BadgeDef {
  id: string
  emoji: string
  title: string    // Arabic
  desc: string     // Arabic
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  celeb: CelebType
  condition: (b: BadgeInput) => boolean
}

export const BADGE_DEFS: BadgeDef[] = [
  // ── Streak ────────────────────────────────────────────────────────
  {
    id: 'streak_1', emoji: '🌱', tier: 'bronze',
    title: 'البداية', desc: 'أوّل يوم دراسة',
    celeb: 'badge',
    condition: b => b.streak >= 1,
  },
  {
    id: 'streak_3', emoji: '🔥', tier: 'bronze',
    title: '3 أيام متواصلة', desc: 'دراسة ثلاثة أيام بلا انقطاع',
    celeb: 'streak',
    condition: b => b.streak >= 3,
  },
  {
    id: 'streak_7', emoji: '⚡', tier: 'silver',
    title: 'أسبوع كامل', desc: 'مواظبة سبعة أيام متتالية',
    celeb: 'streak',
    condition: b => b.streak >= 7,
  },
  {
    id: 'streak_14', emoji: '💎', tier: 'gold',
    title: 'أسبوعان متواصلان', desc: '14 يومًا بلا انقطاع',
    celeb: 'streak',
    condition: b => b.streak >= 14,
  },
  {
    id: 'streak_30', emoji: '👑', tier: 'platinum',
    title: 'شهر من الدراسة', desc: '30 يومًا متواصلًا — استثنائي!',
    celeb: 'streak',
    condition: b => b.streak >= 30,
  },

  // ── Vocabulary ────────────────────────────────────────────────────
  {
    id: 'words_added_1', emoji: '📖', tier: 'bronze',
    title: 'أوّل كلمة', desc: 'أضفت كلمتك الأولى إلى البنك',
    celeb: 'badge',
    condition: b => b.vocabWords >= 1,
  },
  {
    id: 'words_learned_1', emoji: '✨', tier: 'bronze',
    title: 'كلمة متقنة', desc: 'أتقنت كلمتك الأولى',
    celeb: 'word',
    condition: b => b.learnedWords >= 1,
  },
  {
    id: 'words_10', emoji: '📚', tier: 'silver',
    title: '10 كلمات متقنة', desc: 'حفظت 10 كلمات هولندية في الذاكرة',
    celeb: 'badge',
    condition: b => b.learnedWords >= 10,
  },
  {
    id: 'words_50', emoji: '🧠', tier: 'gold',
    title: '50 كلمة متقنة', desc: 'مفردات B1 في متناول يدك',
    celeb: 'badge',
    condition: b => b.learnedWords >= 50,
  },
  {
    id: 'words_100', emoji: '🏆', tier: 'platinum',
    title: '100 كلمة متقنة', desc: 'مفردات على مستوى الامتحان',
    celeb: 'badge',
    condition: b => b.learnedWords >= 100,
  },

  // ── Exam ─────────────────────────────────────────────────────────
  {
    id: 'exam_first', emoji: '📝', tier: 'bronze',
    title: 'أوّل محاولة', desc: 'جرّبت محاكاة الامتحان لأوّل مرّة',
    celeb: 'badge',
    condition: b => b.examAttempted,
  },
  {
    id: 'exam_pass', emoji: '🎓', tier: 'gold',
    title: `أوّل نجاح (≥${PASS_THRESHOLD}%)`, desc: 'تجاوزت عتبة 65% في المحاكاة',
    celeb: 'exam',
    condition: b => b.examPassed,
  },

  // ── Daily work ────────────────────────────────────────────────────
  {
    id: 'daily_tasks_3', emoji: '✅', tier: 'bronze',
    title: 'إنجاز مهام اليوم', desc: 'أكملت 3 مهام في يوم واحد',
    celeb: 'tasks',
    condition: b => b.dailyTasks >= 3,
  },
]

export const BADGE_MAP = Object.fromEntries(BADGE_DEFS.map(b => [b.id, b]))

export const TIER_ORDER: BadgeDef['tier'][] = ['bronze', 'silver', 'gold', 'platinum']
export const TIER_LABEL: Record<BadgeDef['tier'], string> = {
  bronze: 'برونزي', silver: 'فضّي', gold: 'ذهبي', platinum: 'بلاتيني',
}
export const TIER_COLOR: Record<BadgeDef['tier'], string> = {
  bronze: '#cd7f32', silver: '#9E9E9E', gold: '#D98A2B', platinum: '#467434',
}
