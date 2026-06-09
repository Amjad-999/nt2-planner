export interface ExamPdfEntry {
  id: string
  title: string
  year: string
  skill: string
  skillAr: string
  file: string          // path relative to /exams/
  available: boolean    // false = placeholder (PDF not copied yet)
}

export const EXAM_PDFS: ExamPdfEntry[] = [
  {
    id: 'sample-2024',
    title: 'NT2 Oefenexamen 2024 — نموذج',
    year: '2024',
    skill: 'Volledig',
    skillAr: 'نموذج كامل',
    file: 'nt2-oefenexamen-2024-sample.pdf',
    available: true,
  },
  {
    id: 'lezen-2024',
    title: 'NT2 Lezen 2024',
    year: '2024',
    skill: 'Lezen',
    skillAr: 'القراءة',
    file: 'nt2-lezen-2024.pdf',
    available: false,
  },
  {
    id: 'luisteren-2024',
    title: 'NT2 Luisteren 2024',
    year: '2024',
    skill: 'Luisteren',
    skillAr: 'الاستماع',
    file: 'nt2-luisteren-2024.pdf',
    available: false,
  },
  {
    id: 'schrijven-2024',
    title: 'NT2 Schrijven 2024',
    year: '2024',
    skill: 'Schrijven',
    skillAr: 'الكتابة',
    file: 'nt2-schrijven-2024.pdf',
    available: false,
  },
  {
    id: 'lezen-2023',
    title: 'NT2 Lezen 2023',
    year: '2023',
    skill: 'Lezen',
    skillAr: 'القراءة',
    file: 'nt2-lezen-2023.pdf',
    available: false,
  },
  {
    id: 'luisteren-2023',
    title: 'NT2 Luisteren 2023',
    year: '2023',
    skill: 'Luisteren',
    skillAr: 'الاستماع',
    file: 'nt2-luisteren-2023.pdf',
    available: false,
  },
]

export const SKILL_ICON: Record<string, string> = {
  Lezen: '📖',
  Luisteren: '🎧',
  Schrijven: '✍️',
  Spreken: '🗣️',
  Volledig: '📋',
}
