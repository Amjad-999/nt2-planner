export interface ExamEntry {
  id: string
  skill: string
  skillAr: string
  year: string
  opgaven: string    // filename under /exams/
  antwoorden: string // filename under /exams/
}

export const EXAMS: ExamEntry[] = [
  // 2025
  { id: 'lezen-2025',      skill: 'Lezen',      skillAr: 'القراءة',  year: '2025', opgaven: 'nt2-lezen-2025-opgaven.pdf',      antwoorden: 'nt2-lezen-2025-antwoorden.pdf' },
  { id: 'luisteren-2025',  skill: 'Luisteren',  skillAr: 'الاستماع', year: '2025', opgaven: 'nt2-luisteren-2025-opgaven.pdf',  antwoorden: 'nt2-luisteren-2025-antwoorden.pdf' },
  { id: 'schrijven-2025',  skill: 'Schrijven',  skillAr: 'الكتابة',  year: '2025', opgaven: 'nt2-schrijven-2025-opgaven.pdf',  antwoorden: 'nt2-schrijven-2025-antwoorden.pdf' },
  { id: 'spreken-2025',    skill: 'Spreken',    skillAr: 'الكلام',   year: '2025', opgaven: 'nt2-spreken-2025-opgaven.pdf',    antwoorden: 'nt2-spreken-2025-antwoorden.pdf' },
  // 2024
  { id: 'lezen-2024',      skill: 'Lezen',      skillAr: 'القراءة',  year: '2024', opgaven: 'nt2-lezen-2024-opgaven.pdf',      antwoorden: 'nt2-lezen-2024-antwoorden.pdf' },
  { id: 'luisteren-2024',  skill: 'Luisteren',  skillAr: 'الاستماع', year: '2024', opgaven: 'nt2-luisteren-2024-opgaven.pdf',  antwoorden: 'nt2-luisteren-2024-antwoorden.pdf' },
  { id: 'schrijven-2024',  skill: 'Schrijven',  skillAr: 'الكتابة',  year: '2024', opgaven: 'nt2-schrijven-2024-opgaven.pdf',  antwoorden: 'nt2-schrijven-2024-antwoorden.pdf' },
  { id: 'spreken-2024',    skill: 'Spreken',    skillAr: 'الكلام',   year: '2024', opgaven: 'nt2-spreken-2024-opgaven.pdf',    antwoorden: 'nt2-spreken-2024-antwoorden.pdf' },
  // 2023
  { id: 'lezen-2023',      skill: 'Lezen',      skillAr: 'القراءة',  year: '2023', opgaven: 'nt2-lezen-2023-opgaven.pdf',      antwoorden: 'nt2-lezen-2023-antwoorden.pdf' },
  { id: 'luisteren-2023',  skill: 'Luisteren',  skillAr: 'الاستماع', year: '2023', opgaven: 'nt2-luisteren-2023-opgaven.pdf',  antwoorden: 'nt2-luisteren-2023-antwoorden.pdf' },
  { id: 'schrijven-2023',  skill: 'Schrijven',  skillAr: 'الكتابة',  year: '2023', opgaven: 'nt2-schrijven-2023-opgaven.pdf',  antwoorden: 'nt2-schrijven-2023-antwoorden.pdf' },
  { id: 'spreken-2023',    skill: 'Spreken',    skillAr: 'الكلام',   year: '2023', opgaven: 'nt2-spreken-2023-opgaven.pdf',    antwoorden: 'nt2-spreken-2023-antwoorden.pdf' },
]

export const SKILL_ICON: Record<string, string> = {
  Lezen:     '📖',
  Luisteren: '🎧',
  Schrijven: '✍️',
  Spreken:   '🗣️',
}
