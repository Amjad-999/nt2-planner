import type { BookUnit } from '@/store/types'

export const BOOKS: BookUnit[] = [
  {
    id: 'b1', icon: '📗', bg: 'var(--blue-l)', ic: 'var(--blue)',
    title: 'Taalcompleet A2',
    desc: 'الكتاب الأساسي للمستوى A2 — النسخة الرسمية',
    units: [
      'الوحدة 1 — Hallo, ik ben…',
      'الوحدة 2 — Mijn dag',
      'الوحدة 3 — Familie en vrienden',
      'الوحدة 4 — Wonen en werken',
      'الوحدة 5 — In de winkel',
      'الوحدة 6 — Gezond blijven',
      'الوحدة 7 — Reizen en vervoer',
      'الوحدة 8 — Plannen en toekomst',
    ],
  },
  {
    id: 'b2', icon: '📘', bg: 'var(--amber-l)', ic: 'var(--amber)',
    title: 'Naar NT2-examen B1 Deel 1',
    desc: 'تحضير الامتحان المستوى B1 — الجزء الأول',
    units: [
      'Thema 1 — Wie ben jij? (مَن أنت؟)',
      'Thema 2 — Gezondheid (الصحّة)',
      'Thema 3 — Omgeving (المُحيط)',
      'Thema 4 — Geld (المال)',
      'Thema 5 — Werk (العمل)',
    ],
  },
  {
    id: 'b3', icon: '📙', bg: 'var(--orange-l)', ic: 'var(--orange)',
    title: 'Naar NT2-examen B1 Deel 2',
    desc: 'تحضير الامتحان المستوى B1 — الجزء الثاني',
    units: [
      'Thema 6 — Opleiding (التعليم)',
      'Thema 7 — Veiligheid (الأمان)',
      'Thema 8 — Samenleven (العيش المشترك)',
      'Thema 9 — Aan het werk (في ميدان العمل)',
      'Thema 10 — Media (الإعلام)',
    ],
  },
  {
    id: 'b4', icon: '📕', bg: 'var(--purple-l)', ic: 'var(--purple)',
    title: 'Vooruit! — Oefenexamens',
    desc: 'كتاب الامتحانات التجريبية الكاملة',
    units: [
      'امتحان تجريبي 1 — Lezen (قراءة)',
      'امتحان تجريبي 1 — Luisteren (استماع)',
      'امتحان تجريبي 2 — Lezen',
      'امتحان تجريبي 2 — Luisteren',
      'امتحان تجريبي 3 — Schrijven (كتابة)',
    ],
  },
]
