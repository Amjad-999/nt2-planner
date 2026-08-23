import type { BookUnit } from '@/store/types'
import { BOOKS as CURRICULUM_BOOKS, SECTIONS } from './curriculum'

/**
 * كتب تبويب «الكتب».
 *
 * الكتب الثلاثة الأولى تُشتقّ من `curriculum.ts` (مصدر الحقيقة الوحيد) حتى لا
 * تتعارض أسماء الثيمات وأعدادها بين تبويب «الكتب» وتبويب «البرنامج».
 *
 * ── توافقية مع البيانات المحفوظة (مهم) ──
 * `bookUnits` يخزّن التقدّم على شكل  { bookId: [فهارس الوحدات المُنجزة] }.
 * لذلك نُبقي المعرّفات القديمة b1/b2/b3/b4 كما هي، ونربطها بمعرّفات المنهج
 * عبر LEGACY_ID أدناه. عدد الثيمات وترتيبها مطابق لما كان مكتوبًا يدويًا
 * (8 / 5 / 5)، فكل فهرس محفوظ يبقى مشيرًا إلى الثيمة نفسها — العناوين فقط
 * صُحّحت لتطابق الكتب الحقيقية (كانت أسماء الكتاب الأول وهمية، وعنوانا
 * الكتابين الثاني والثالث مغلوطين: «Naar NT2-examen» بدل «TaalCompleet B1»).
 *
 * الكتاب الرابع (Vooruit! — امتحانات تجريبية) ليس جزءًا من منهج الـ184 درسًا،
 * فيبقى معرَّفًا يدويًا هنا بلا تغيير.
 */

/** معرّف المنهج → المعرّف القديم المستخدم في bookUnits المحفوظ. */
const LEGACY_ID: Record<string, string> = { a2: 'b1', b1d1: 'b2', b1d2: 'b3' }

/** الألوان والوصف — مطابقة للألوان الأصلية لكل كتاب. */
const STYLE: Record<string, { bg: string; ic: string; desc: string }> = {
  a2:   { bg: 'var(--blue-l)',   ic: 'var(--blue)',   desc: 'الكتاب الأساسي للمستوى A2 — 8 ثيمات / 109 دروس' },
  b1d1: { bg: 'var(--amber-l)',  ic: 'var(--amber)',  desc: 'المستوى B1 الجزء الأول — 5 ثيمات / 39 درسًا' },
  b1d2: { bg: 'var(--orange-l)', ic: 'var(--orange)', desc: 'المستوى B1 الجزء الثاني — 5 ثيمات / 36 درسًا' },
}

const derived: BookUnit[] = CURRICULUM_BOOKS.map((b) => {
  const s = STYLE[b.id] ?? { bg: 'var(--surface3)', ic: 'var(--text)', desc: '' }
  return {
    id: LEGACY_ID[b.id] ?? b.id,
    icon: b.icon,
    bg: s.bg,
    ic: s.ic,
    title: b.title,
    desc: s.desc,
    units: SECTIONS
      .filter((sec) => sec.bookId === b.id)
      .map((sec) => `Thema ${sec.index} — ${sec.title} (${sec.titleAr}) · ${sec.size} دروس`),
  }
})

export const BOOKS: BookUnit[] = [
  ...derived,
  {
    id: 'b4', icon: '📕', bg: 'var(--purple-l)', ic: 'var(--purple)',
    title: 'Vooruit! — Oefenexamens',
    desc: 'كتاب الامتحانات التجريبية الكاملة — خارج منهج الـ184 درسًا',
    units: [
      'امتحان تجريبي 1 — Lezen (قراءة)',
      'امتحان تجريبي 1 — Luisteren (استماع)',
      'امتحان تجريبي 2 — Lezen',
      'امتحان تجريبي 2 — Luisteren',
      'امتحان تجريبي 3 — Schrijven (كتابة)',
    ],
  },
]
