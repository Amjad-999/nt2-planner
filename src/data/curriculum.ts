/**
 * مصدر الحقيقة الوحيد للمنهج — 3 كتب، 18 قسمًا، 184 درسًا.
 *
 * Transcribed from the actual tables of contents of the three TaalCompleet
 * books, lesson by lesson. Section sizes are genuinely uneven (6 to 15
 * lessons); an earlier version of this file assumed uniform sections and was
 * wrong by 20 lessons, which silently corrupted every downstream number — days,
 * minutes, progress, feasibility. Everything the planner shows is derived from
 * this file and nothing is duplicated anywhere else.
 *
 * NOTE — this does not replace `src/data/books.ts`. That file drives the Books
 * tab's coarse "unit reviewed" checkboxes and is left untouched. This file is
 * the fine-grained lesson-level truth the study program schedules over.
 */

/** المدّة الافتراضية للدرس بالدقائق حين لا يحدّد الكتاب غير ذلك. */
export const LESSON_MINUTES = 20

export interface CurriculumSection {
  id: string
  /** رقم القسم كما هو مطبوع في الكتاب (Thema 6 يبقى 6 حتى لو كان أوّل أقسام الجزء الثاني). */
  number: number
  /** رقم القسم داخل كتابه، يبدأ من 1. */
  index: number
  title: string
  lessonIds: string[]
}

export interface CurriculumLesson {
  id: string
  bookId: string
  sectionId: string
  /** ترتيب الدرس في المنهج كله، يبدأ من 1. */
  ordinal: number
  /** رقم الدرس داخل قسمه، يبدأ من 1. */
  indexInSection: number
  /** الترقيم المطبوع في الكتاب، مثل "3.4". */
  label: string
  /** عنوان الدرس بالهولندية كما في الفهرس. */
  title: string
  minutes: number
}

export interface CurriculumBook {
  id: string
  title: string
  shortTitle: string
  /** لون الحدّ — من tokens.css دائمًا، لا hex. */
  accent: string
  tint: string
  /** المدّة الافتراضية لدرس من هذا الكتاب. */
  minutesPerLesson: number
  sections: CurriculumSection[]
}

interface SectionShape {
  number: number
  title: string
  lessons: string[]
}

interface BookShape {
  id: string
  title: string
  shortTitle: string
  accent: string
  tint: string
  minutesPerLesson: number
  sections: SectionShape[]
}

/* ── الكتاب 1: TaalCompleet A2 — 8 أقسام، 109 دروس ── */

const A2_SECTIONS: SectionShape[] = [
  {
    number: 1, title: 'Thema 1 — Verhuizen', lessons: [
      'Nieuwe buren',
      'Zinnen maken',
      'Dit is mijn familie.',
      'Huiswerk maken',
      'Hoe gaat het?',
      'Er is een tuin. – Er zijn drie kamers.',
      'En, maar, want, dus, of',
      'Marktplaats',
      'De grote kast – de kleine spiegel',
      'Op het station',
      'Ik begrijp, hij begrijpt, wij begrijpen',
      'Geld op je OV-chipkaart zetten',
      'Woorden met -lijk',
      'Contact met de buren',
      'Klein, kleiner – groot, groter',
    ],
  },
  {
    number: 2, title: 'Thema 2 — Nederland', lessons: [
      'Feesten en gewoontes',
      'Groot, groter, het grootst',
      'Tips bij het lezen',
      'Uit eten',
      'Ik heb gewerkt – wij hebben gewoond',
      'Het nieuws',
      'Ik bel morgen. – Morgen bel ik.',
      'Het weer',
      'Pannenkoeken bakken',
      'Doe de deur maar open.',
      'Een uitnodiging',
      'Een kaartje sturen',
      'Zussen, zonen, kinderen',
      'Heb je een leuke vakantie gehad?',
      'Jij hebt gegeten – wij zijn gegaan',
    ],
  },
  {
    number: 3, title: 'Thema 3 — Kinderen', lessons: [
      'Familie in het buitenland',
      'Omdat en als',
      'Rapport bespreken',
      '...om brood te kopen',
      'Een uitnodiging van het consultatiebureau',
      'Ik maak schoon. – De docent legt uit.',
      'Berichten voor docenten',
      'Hij zegt dat... – Hij vraagt of...',
      'Een uitje organiseren',
      'Woorden met -ng of -nk',
      'Een nieuwsbrief',
      "Foto – foto's, baby – baby's",
      'Tips bij het schrijven',
      'Het kinderdagverblijf',
    ],
  },
  {
    number: 4, title: 'Thema 4 — Winkels', lessons: [
      'Mijn werkdag',
      'Morgen moet ik werken. – Daarom moet ik vroeg opstaan.',
      'Ik zoek een boek',
      'Hij, het, ze',
      'Tips bij het luisteren',
      'Online bestellen',
      'Ik heb een klacht',
      'Uitleg over de kassa',
      'Woorden met -uw, -ieuw, -eeuw, -auw of -ouw',
      'Tim helpt mij. – Hij koopt een boek voor mij.',
      'Het werkoverleg',
      'Het ontbijt is klaar. – Olga zet het op tafel.',
    ],
  },
  {
    number: 5, title: 'Thema 5 — Opleidingen', lessons: [
      'Scholen in Nederland',
      'Het informatiebord',
      'Een opleiding doen',
      'Kapper, tuinman en schilder',
      'Ik leerde – wij gingen',
      'Scholen van vroeger en nu',
      'Stage lopen',
      'Een toets maken',
      'Dat moet. – Dat mag. – Dat hoeft niet.',
      'Tips bij het spreken',
      'Het huiswerk',
      'Ik wil graag fietsen. – Zullen we gaan?',
      'Het weekend',
      'Ik ga koken. – Ik kook morgen.',
    ],
  },
  {
    number: 6, title: 'Thema 6 — Werk zoeken', lessons: [
      'Op zoek naar werk',
      'Herhaling: praten over nu',
      'Meerkeuzevragen beantwoorden',
      'Vacatures',
      'Luisteren naar – zorgen voor',
      'Informatie vragen over een vacature',
      'Ik heb opgeruimd – zij hebben samengewerkt',
      'Formulier uitzendbureau',
      'Herhaling: zinnen maken (1)',
      'Het sollicitatiegesprek',
      'Woorden met -tie',
      'Ik heb bedoeld – hij heeft ontdekt',
    ],
  },
  {
    number: 7, title: 'Thema 7 — Werken', lessons: [
      'De rondleiding',
      'Door de gang, langs de vergaderzaal',
      'Let op de tijd',
      'Wat moet ik doen?',
      'Let op! Gevaar!',
      'Herhaling: je moet – je mag – je kunt',
      'Ziek melden en vrij vragen',
      'Herhaling: zinnen maken (2)',
      'Het einde van de werkdag',
      'Herhaling: praten over vroeger',
      'Een nieuwe collega',
      'Herhaling: klein – kleine, groot – grote',
      'De lunchpauze',
      'Soms of vaak?',
      'Herhaling: groot, groter, het grootst',
    ],
  },
  {
    number: 8, title: 'Thema 8 — De gemeente', lessons: [
      'De website van de gemeente',
      'Ik voel me niet goed. – Jij meldt je ziek.',
      'Op het gemeentehuis',
      'Herhaling: praten over de toekomst',
      'Problemen in je huis',
      'Herhaling: zinnen maken (3)',
      'Bij de politie',
      'Een mooie tas – een mooi huis',
      'Nieuws uit Eindhoven',
      'Herhaling: vragen maken',
      'Afval',
      'Het inburgeringsexamen',
    ],
  },
]

/* ── الكتاب 2: TaalCompleet B1 deel 1 — 5 أقسام، 39 درسًا ── */

const B1_DEEL1_SECTIONS: SectionShape[] = [
  {
    number: 1, title: 'Thema 1 — Wie ben jij?', lessons: [
      'Je leven',
      'Jouw cultuur en Nederland',
      'Overal tekst',
      'Weekend',
      'Het Hobbyhuis',
      "Hobby's",
      'Karakter',
      'En dan nog iets',
    ],
  },
  {
    number: 2, title: 'Thema 2 — Gezondheid', lessons: [
      'Voel je goed!',
      'Ziek zijn',
      'Beter worden',
      'Naar de bedrijfsarts',
      'De mantelzorger',
      'Weg met stress',
      'En dan nog iets',
    ],
  },
  {
    number: 3, title: 'Thema 3 — Omgeving', lessons: [
      'De buurtapp',
      'Dit is mijn stad',
      'Een uitnodiging voor bewoners',
      'Naar een vergadering',
      'Zal ik even helpen?',
      'Alles verandert',
      'Aan het klussen',
      'En dan nog iets',
    ],
  },
  {
    number: 4, title: 'Thema 4 — Geld', lessons: [
      'Geld',
      'Het spijt me!',
      'Bellen naar de bank',
      'Budget en schulden',
      'Werk en geld',
      'De kringloopwinkel',
      'Inkomen',
      'En dan nog iets',
    ],
  },
  {
    number: 5, title: 'Thema 5 — Werk', lessons: [
      'Werk!',
      'De werkcoach',
      'De sollicitatiebrief',
      'Werk vroeger en nu',
      'Werkoverdracht',
      'Collegiaal overleg',
      'Het sollicitatiegesprek',
      'En dan nog iets',
    ],
  },
]

/* ── الكتاب 3: TaalCompleet B1 deel 2 — 5 أقسام، 36 درسًا ── */

const B1_DEEL2_SECTIONS: SectionShape[] = [
  {
    number: 6, title: 'Thema 6 — Opleiding', lessons: [
      'Toekomstplannen',
      'Ik heb stage gelopen',
      'Gesprek met de studieadviseur',
      'Fietsen',
      'Schrijven terwijl je luistert',
      'Discussie in de klas',
      'Een tekst onthouden',
      'En dan nog iets',
    ],
  },
  {
    number: 7, title: 'Thema 7 — Veiligheid', lessons: [
      'Veiligheid',
      'Veilig werken',
      'Wat een dag!',
      'Eerste hulp',
      'Help, het is kapot',
      'Geen paniek',
      'Nederland waterland',
      'En dan nog iets',
    ],
  },
  {
    number: 8, title: 'Thema 8 — Samenleven', lessons: [
      'Een leefbare wijk',
      'Een handje helpen',
      'Een conflict. Wat nu?',
      'Sport en spel',
      'Samen of alleen?',
      'En dan nog iets',
    ],
  },
  {
    number: 9, title: 'Thema 9 — Aan het werk', lessons: [
      'Personeelszaken',
      'De klant is koning',
      'Even vrij',
      'Hoe is het gegaan?',
      'Werk voor iedereen',
      "Omgang met collega's",
      'En dan nog iets',
    ],
  },
  {
    number: 10, title: 'Thema 10 — Media', lessons: [
      'Alles, altijd en overal online',
      'Help!',
      'Televisie',
      'Mediawijsheid',
      'Beroemd',
      'Feedback',
      'En dan nog iets',
    ],
  },
]

/**
 * ترتيب الكتب هو ترتيب الدراسة: A2 ثم B1 deel 1 ثم deel 2.
 *
 * `minutesPerLesson` is 20 everywhere because that is the figure the user
 * measured — but only on A2 lessons, which run about 3.2 pages each against
 * 6.4–6.8 for B1. If B1 turns out slower in practice, the per-book override in
 * the study-program settings rebuilds the whole schedule from the real number
 * rather than leaving the plan quietly optimistic.
 */
const SHAPES: BookShape[] = [
  {
    id: 'a2',
    title: 'TaalCompleet A2',
    shortTitle: 'A2',
    accent: 'var(--blue)',
    tint: 'var(--blue-l)',
    minutesPerLesson: LESSON_MINUTES,
    sections: A2_SECTIONS,
  },
  {
    id: 'b1d1',
    title: 'TaalCompleet B1 — deel 1',
    shortTitle: 'B1 deel 1',
    accent: 'var(--amber)',
    tint: 'var(--amber-l)',
    minutesPerLesson: LESSON_MINUTES,
    sections: B1_DEEL1_SECTIONS,
  },
  {
    id: 'b1d2',
    title: 'TaalCompleet B1 — deel 2',
    shortTitle: 'B1 deel 2',
    accent: 'var(--orange)',
    tint: 'var(--orange-l)',
    minutesPerLesson: LESSON_MINUTES,
    sections: B1_DEEL2_SECTIONS,
  },
]

function build(): { books: CurriculumBook[]; lessons: CurriculumLesson[] } {
  const books: CurriculumBook[] = []
  const lessons: CurriculumLesson[] = []
  let ordinal = 0

  for (const shape of SHAPES) {
    const sections: CurriculumSection[] = []
    shape.sections.forEach((sec, si) => {
      const sectionId = `${shape.id}-t${sec.number}`
      const lessonIds: string[] = []
      sec.lessons.forEach((title, li) => {
        ordinal += 1
        const id = `${sectionId}-l${li + 1}`
        lessonIds.push(id)
        lessons.push({
          id,
          bookId: shape.id,
          sectionId,
          ordinal,
          indexInSection: li + 1,
          label: `${sec.number}.${li + 1}`,
          title,
          minutes: shape.minutesPerLesson,
        })
      })
      sections.push({ id: sectionId, number: sec.number, index: si + 1, title: sec.title, lessonIds })
    })
    books.push({
      id: shape.id,
      title: shape.title,
      shortTitle: shape.shortTitle,
      accent: shape.accent,
      tint: shape.tint,
      minutesPerLesson: shape.minutesPerLesson,
      sections,
    })
  }

  return { books, lessons }
}

const built = build()

/** الكتب الثلاثة بأقسامها. */
export const CURRICULUM_BOOKS: CurriculumBook[] = built.books

/** كل الدروس بالترتيب التسلسلي: A2 ثم B1 deel 1 ثم B1 deel 2. */
export const CURRICULUM_LESSONS: CurriculumLesson[] = built.lessons

/** 184 */
export const TOTAL_LESSONS = CURRICULUM_LESSONS.length

/** مجموع الدقائق بالمدد الافتراضية. التجاوزات تُحسب في features/plan. */
export const TOTAL_LESSON_MINUTES = CURRICULUM_LESSONS.reduce((s, l) => s + l.minutes, 0)

const byId = new Map(CURRICULUM_LESSONS.map((l) => [l.id, l]))
const bookById = new Map(CURRICULUM_BOOKS.map((b) => [b.id, b]))
const sectionById = new Map(
  CURRICULUM_BOOKS.flatMap((b) => b.sections.map((s) => [s.id, s] as const)),
)

export function lessonById(id: string): CurriculumLesson | undefined {
  return byId.get(id)
}

/** هل هذا المعرّف ينتمي فعلًا للمنهج؟ يُستعمل لإسقاط السجلّات اليتيمة. */
export function isKnownLesson(id: string): boolean {
  return byId.has(id)
}

export function bookTitle(bookId: string): string {
  return bookById.get(bookId)?.title ?? bookId
}

export function bookShortTitle(bookId: string): string {
  return bookById.get(bookId)?.shortTitle ?? bookId
}

export function sectionTitle(sectionId: string): string {
  return sectionById.get(sectionId)?.title ?? sectionId
}

export function sectionOf(sectionId: string): CurriculumSection | undefined {
  return sectionById.get(sectionId)
}

export function bookOf(bookId: string): CurriculumBook | undefined {
  return bookById.get(bookId)
}

/**
 * دالّة تحلّ مدّة أي درس، مع احترام تجاوزات المستخدم لكل كتاب.
 * A missing or non-positive override falls back to the book's own default.
 */
export function makeMinutesResolver(overrides: Record<string, number> = {}) {
  return (lessonId: string): number => {
    const l = byId.get(lessonId)
    if (!l) return LESSON_MINUTES
    const o = overrides[l.bookId]
    return typeof o === 'number' && isFinite(o) && o > 0 ? Math.round(o) : l.minutes
  }
}
