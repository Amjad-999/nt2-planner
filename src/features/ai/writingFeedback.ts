import type { ExamWritingItem } from '@/store/types'

/**
 * طبقة الذكاء الاصطناعي لتصحيح الكتابة.
 *
 * The API key never reaches the browser. This module only talks to a Supabase
 * Edge Function (`writing-feedback`) which holds the key as a server secret.
 * See DEPLOY_AI.md for the one-time setup.
 *
 * Every failure path returns a typed, Arabic-language reason instead of throwing,
 * because the local checker in features/exam/writingCheck stays available and the
 * user must never be left staring at a broken panel.
 */

export interface AiIssue {
  /** The fragment as the learner wrote it. */
  fout: string
  /** The same fragment, corrected. */
  goed: string
  /** Why, in Arabic. */
  uitlegAr: string
}

export interface AiWritingFeedback {
  scores: { inhoud: number; taal: number; woordenschat: number; vorm: number }
  totaal: number
  /** The learner's own text, corrected, same length and same intent. */
  correctedNl: string
  issues: AiIssue[]
  /** A stronger model answer to compare against. */
  modelNl: string
  /** One short Arabic verdict. */
  samenvattingAr: string
}

export type AiFeedbackResult =
  | { ok: true; data: AiWritingFeedback }
  | { ok: false; reasonAr: string; retryable: boolean }

const FN_NAME = 'writing-feedback'

export function aiConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

function isFeedback(v: unknown): v is AiWritingFeedback {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  const s = o.scores as Record<string, unknown> | undefined
  return (
    typeof o.correctedNl === 'string' &&
    typeof o.modelNl === 'string' &&
    typeof o.samenvattingAr === 'string' &&
    typeof o.totaal === 'number' &&
    Array.isArray(o.issues) &&
    !!s &&
    typeof s.inhoud === 'number' &&
    typeof s.taal === 'number' &&
    typeof s.woordenschat === 'number' &&
    typeof s.vorm === 'number'
  )
}

/** Keeps a stray model reply from rendering as a broken panel. */
function sanitize(v: AiWritingFeedback): AiWritingFeedback {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  return {
    scores: {
      inhoud: clamp(v.scores.inhoud),
      taal: clamp(v.scores.taal),
      woordenschat: clamp(v.scores.woordenschat),
      vorm: clamp(v.scores.vorm),
    },
    totaal: clamp(v.totaal),
    correctedNl: v.correctedNl.trim(),
    modelNl: v.modelNl.trim(),
    samenvattingAr: v.samenvattingAr.trim(),
    issues: (v.issues ?? [])
      .filter((i): i is AiIssue =>
        !!i && typeof i.fout === 'string' && typeof i.goed === 'string' && typeof i.uitlegAr === 'string')
      .slice(0, 12),
  }
}

export async function requestWritingFeedback(
  text: string,
  task: ExamWritingItem,
  signal?: AbortSignal,
): Promise<AiFeedbackResult> {
  if (!text.trim()) {
    return { ok: false, reasonAr: 'اكتب نصًّا أولًا.', retryable: false }
  }
  if (!aiConfigured()) {
    return {
      ok: false,
      reasonAr: 'التصحيح الذكي غير مُهيَّأ بعد. التقييم المحلّي يعمل كما هو.',
      retryable: false,
    }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      reasonAr: 'لا يوجد اتصال. التقييم المحلّي يعمل كما هو، وأعِد المحاولة لاحقًا.',
      retryable: true,
    }
  }

  const base = String(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY)

  try {
    const res = await fetch(`${base}/functions/v1/${FN_NAME}`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anon}`,
        apikey: anon,
      },
      body: JSON.stringify({
        text,
        task: {
          titleNl: task.titleNl,
          briefNl: task.briefNl,
          kind: task.kind,
          register: task.register,
          minWords: task.minWords,
          maxWords: task.maxWords,
          points: task.points.map((p) => p.ar),
        },
      }),
    })

    if (res.status === 429) {
      return { ok: false, reasonAr: 'الخدمة مشغولة الآن. انتظر قليلًا ثم أعِد المحاولة.', retryable: true }
    }
    if (!res.ok) {
      return {
        ok: false,
        reasonAr: `تعذّر التصحيح الذكي. رمز الخطأ: ${res.status}. التقييم المحلّي يعمل كما هو.`,
        retryable: res.status >= 500,
      }
    }

    const json: unknown = await res.json()
    if (!isFeedback(json)) {
      return { ok: false, reasonAr: 'وصل ردّ غير مكتمل. أعِد المحاولة.', retryable: true }
    }
    return { ok: true, data: sanitize(json) }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, reasonAr: 'أُلغي الطلب.', retryable: true }
    }
    return {
      ok: false,
      reasonAr: 'فشل الاتصال بالخدمة. التقييم المحلّي يعمل كما هو.',
      retryable: true,
    }
  }
}
