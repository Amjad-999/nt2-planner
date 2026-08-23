/**
 * المنهج الدراسي — مصدر الحقيقة الوحيد.
 *
 * البيانات مأخوذة حرفيًا من فهارس الكتب الثلاثة (Inhoudsopgave) ومن منصّة
 * TaalCompleet الإلكترونية. لا تُكتب أرقام المنهج يدويًا في أي مكان آخر
 * في التطبيق — كل جدول ونسبة ومؤقّت يُشتقّ من هنا.
 *
 *   TaalCompleet A2 ............ 8 ثيمات / 109 دروس
 *   TaalCompleet B1 deel 1 ..... 5 ثيمات /  39 درسًا
 *   TaalCompleet B1 deel 2 ..... 5 ثيمات /  36 درسًا
 *   ────────────────────────────────────────────────
 *   الإجمالي ................... 18 ثيمة / 184 درسًا
 *
 * ملاحظة على الصفحات: `page` هو رقم صفحة بداية الدرس كما في الفهرس، و`pages`
 * يُحسب كفارق بين درس والذي يليه. الفارق يشمل أحيانًا صفحة فاصل الثيمة،
 * فهو تقدير أعلى بصفحة واحدة عند آخر درس في كل ثيمة — يُستخدم للوزن النسبي
 * لا كقياس مطلق.
 */

/** درس خام كما في الفهرس: [الرقم، العنوان، صفحة البداية، عنوان القاعدة إن وُجد] */
type RawLesson = readonly [string, string, number, string?]

interface RawTheme {
  n: number
  title: string
  titleAr: string
  lessons: readonly RawLesson[]
}

interface RawBook {
  id: string
  title: string
  titleAr: string
  short: string
  icon: string
  accent: string
  accentSoft: string
  /** آخر صفحة محتوى قبل الملاحق — لحساب امتداد آخر درس. */
  endPage: number
  themes: readonly RawTheme[]
}

/* ─────────────────────────────────────────────────────────────
   TaalCompleet A2 — 8 ثيمات، 109 دروس
   ───────────────────────────────────────────────────────────── */
const A2: RawBook = {
  id: 'a2',
  title: 'TaalCompleet A2',
  titleAr: 'الكتاب الأول — TaalCompleet A2',
  short: 'A2',
  icon: '📗',
  accent: 'var(--blue)',
  accentSoft: 'var(--blue-l)',
  endPage: 352,
  themes: [
    {
      n: 1, title: 'Verhuizen', titleAr: 'الانتقال',
      lessons: [
        ['1.1', 'Nieuwe buren', 8],
        ['1.2', 'Zinnen maken', 11, 'Hoofdzinnen'],
        ['1.3', 'Dit is mijn familie.', 14, 'Dit is, dat is, dit zijn, dat zijn'],
        ['1.4', 'Huiswerk maken', 15],
        ['1.5', 'Hoe gaat het?', 17],
        ['1.6', 'Er is een tuin. – Er zijn drie kamers.', 20, 'Er is een en er zijn'],
        ['1.7', 'En, maar, want, dus, of', 22, 'Hoofdzinnen en voegwoorden'],
        ['1.8', 'Marktplaats', 24],
        ['1.9', 'De grote kast – de kleine spiegel', 28, 'Bijvoeglijke naamwoorden (1)'],
        ['1.10', 'Op het station', 30],
        ['1.11', 'Ik begrijp, hij begrijpt, wij begrijpen', 34, 'Tegenwoordige tijd regelmatig'],
        ['1.12', 'Geld op je OV-chipkaart zetten', 37],
        ['1.13', 'Woorden met -lijk', 40],
        ['1.14', 'Contact met de buren', 41],
        ['1.15', 'Klein, kleiner – groot, groter', 45, 'Vergelijkingen (1): vergrotende trap'],
      ],
    },
    {
      n: 2, title: 'Nederland', titleAr: 'هولندا',
      lessons: [
        ['2.1', 'Feesten en gewoontes', 50],
        ['2.2', 'Groot, groter, het grootst', 54, 'Vergelijkingen (2): overtreffende trap'],
        ['2.3', 'Tips bij het lezen', 57],
        ['2.4', 'Uit eten', 60],
        ['2.5', 'Ik heb gewerkt – wij hebben gewoond', 64, 'Voltooide tijd regelmatige werkwoorden'],
        ['2.6', 'Het nieuws', 66],
        ['2.7', 'Ik bel morgen. – Morgen bel ik.', 70, 'Hoofdzinnen met inversie (1)'],
        ['2.8', 'Het weer', 72],
        ['2.9', 'Pannenkoeken bakken', 76],
        ['2.10', 'Doe de deur maar open.', 81, 'Gebiedende wijs'],
        ['2.11', 'Een uitnodiging', 82],
        ['2.12', 'Een kaartje sturen', 86],
        ['2.13', 'Zussen, zonen, kinderen', 91, 'Meervoud zelfstandige naamwoorden (-en, -s) + uitzonderingen'],
        ['2.14', 'Heb je een leuke vakantie gehad?', 94],
        ['2.15', 'Jij hebt gegeten – wij zijn gegaan', 97, 'Voltooide tijd onregelmatige werkwoorden'],
      ],
    },
    {
      n: 3, title: 'Kinderen', titleAr: 'الأطفال',
      lessons: [
        ['3.1', 'Familie in het buitenland', 102],
        ['3.2', 'Omdat en als', 105, 'Voegwoorden en bijzinnen'],
        ['3.3', 'Rapport bespreken', 107],
        ['3.4', '...om brood te kopen', 112, 'Om ... te + het hele werkwoord'],
        ['3.5', 'Een uitnodiging van het consultatiebureau', 114],
        ['3.6', 'Ik maak schoon. – De docent legt uit.', 119, 'Tegenwoordige tijd scheidbare werkwoorden'],
        ['3.7', 'Berichten voor docenten', 121],
        ['3.8', 'Hij zegt dat... – Hij vraagt of...', 125, 'Indirecte rede'],
        ['3.9', 'Een uitje organiseren', 126],
        ['3.10', 'Woorden met -ng of -nk', 130],
        ['3.11', 'Een nieuwsbrief', 131],
        ['3.12', 'Foto – foto’s, baby – baby’s', 136, 'Meervoud zelfstandige naamwoorden (’s)'],
        ['3.13', 'Tips bij het schrijven', 138],
        ['3.14', 'Het kinderdagverblijf', 140],
      ],
    },
    {
      n: 4, title: 'Winkels', titleAr: 'المتاجر',
      lessons: [
        ['4.1', 'Mijn werkdag', 146],
        ['4.2', 'Morgen moet ik werken. – Daarom moet ik vroeg opstaan.', 149, 'Hoofdzinnen met inversie (2)'],
        ['4.3', 'Ik zoek een boek', 151],
        ['4.4', 'Hij, het, ze', 155, 'Persoonlijke voornaamwoorden als onderwerp'],
        ['4.5', 'Tips bij het luisteren', 157],
        ['4.6', 'Online bestellen', 159],
        ['4.7', 'Ik heb een klacht', 163],
        ['4.8', 'Uitleg over de kassa', 167],
        ['4.9', 'Woorden met -uw, -ieuw, -eeuw, -auw of -ouw', 171],
        ['4.10', 'Tim helpt mij. – Hij koopt een boek voor mij.', 172, 'Persoonlijke voornaamwoorden als lijdend voorwerp (1)'],
        ['4.11', 'Het werkoverleg', 174],
        ['4.12', 'Het ontbijt is klaar. – Olga zet het op tafel.', 178, 'Persoonlijke voornaamwoorden als lijdend voorwerp (2)'],
      ],
    },
    {
      n: 5, title: 'Opleidingen', titleAr: 'التعليم والتدريب',
      lessons: [
        ['5.1', 'Scholen in Nederland', 182],
        ['5.2', 'Het informatiebord', 186],
        ['5.3', 'Een opleiding doen', 190],
        ['5.4', 'Kapper, tuinman en schilder', 194],
        ['5.5', 'Ik leerde – wij gingen', 197, 'Verleden tijd regelmatige en onregelmatige werkwoorden'],
        ['5.6', 'Scholen van vroeger en nu', 200],
        ['5.7', 'Stage lopen', 204],
        ['5.8', 'Een toets maken', 208],
        ['5.9', 'Dat moet. – Dat mag. – Dat hoeft niet.', 211, 'Modale werkwoorden (1)'],
        ['5.10', 'Tips bij het spreken', 213],
        ['5.11', 'Het huiswerk', 215],
        ['5.12', 'Hij wil graag fietsen. – Zullen we gaan?', 220, 'Modale werkwoorden (2)'],
        ['5.13', 'Het weekend', 221],
        ['5.14', 'Ik ga koken. – Ik kook morgen.', 225, 'Toekomende tijd'],
      ],
    },
    {
      n: 6, title: 'Werk zoeken', titleAr: 'البحث عن عمل',
      lessons: [
        ['6.1', 'Op zoek naar werk', 228],
        ['6.2', 'Herhaling: praten over nu', 231, 'Herhaling tegenwoordige tijd regelmatige en onregelmatige werkwoorden'],
        ['6.3', 'Meerkeuzevragen beantwoorden', 233],
        ['6.4', 'Vacatures', 236],
        ['6.5', 'Luisteren naar – zorgen voor', 241, 'Werkwoorden met vaste voorzetsels'],
        ['6.6', 'Informatie vragen over een vacature', 243],
        ['6.7', 'Ik heb opgeruimd – zij hebben samengewerkt', 248, 'Voltooide tijd scheidbare werkwoorden'],
        ['6.8', 'Formulier uitzendbureau', 249],
        ['6.9', 'Herhaling: zinnen maken (1)', 254, 'Herhaling hoofdzinnen'],
        ['6.10', 'Het sollicitatiegesprek', 255],
        ['6.11', 'Woorden met -tie', 260],
        ['6.12', 'Ik heb bedoeld – hij heeft ontdekt', 261, 'Voltooide tijd van werkwoorden met be-, ge-, her-, ver- of ont-'],
      ],
    },
    {
      n: 7, title: 'Werken', titleAr: 'العمل',
      lessons: [
        ['7.1', 'De rondleiding', 266],
        ['7.2', 'Door de gang, langs de vergaderzaal', 270, 'Voorzetsels van plaats'],
        ['7.3', 'Let op de tijd', 273],
        ['7.4', 'Wat moet ik doen?', 276],
        ['7.5', 'Let op! Gevaar!', 281],
        ['7.6', 'Herhaling: je moet – je mag – je kunt', 284, 'Herhaling modale werkwoorden'],
        ['7.7', 'Ziek melden en vrij vragen', 287],
        ['7.8', 'Herhaling: zinnen maken (2)', 292, 'Herhaling bijzinnen en indirecte rede'],
        ['7.9', 'Het einde van de werkdag', 293],
        ['7.10', 'Herhaling: praten over vroeger', 297, 'Herhaling voltooide tijd regelmatige en onregelmatige werkwoorden'],
        ['7.11', 'Een nieuwe collega', 299],
        ['7.12', 'Herhaling: klein – kleine, groot – grote', 302, 'Herhaling bijvoeglijke naamwoorden'],
        ['7.13', 'De lunchpauze', 304],
        ['7.14', 'Soms of vaak?', 309, 'Woorden met frequentie'],
        ['7.15', 'Herhaling: groot, groter, het grootst', 310, 'Herhaling vergrotende en overtreffende trap'],
      ],
    },
    {
      n: 8, title: 'De gemeente', titleAr: 'البلدية',
      lessons: [
        ['8.1', 'De website van de gemeente', 314],
        ['8.2', 'Ik voel me niet goed. – Jij meldt je ziek.', 317, 'Wederkerende werkwoorden'],
        ['8.3', 'Op het gemeentehuis', 319],
        ['8.4', 'Herhaling: praten over de toekomst', 325, 'Herhaling toekomende tijd'],
        ['8.5', 'Problemen in je huis', 327],
        ['8.6', 'Herhaling: zinnen maken (3)', 331, 'Herhaling hoofdzinnen en bijzinnen'],
        ['8.7', 'Bij de politie', 332],
        ['8.8', 'Een mooie tas – een mooi huis', 337, 'Bijvoeglijke naamwoorden (2)'],
        ['8.9', 'Nieuws uit Eindhoven', 338],
        ['8.10', 'Herhaling: vragen maken', 342, 'Herhaling vragen maken met een vraagwoord of met een werkwoord'],
        ['8.11', 'Afval', 344],
        ['8.12', 'Het inburgeringsexamen', 349],
      ],
    },
  ],
}

/* ─────────────────────────────────────────────────────────────
   TaalCompleet B1 — deel 1 — 5 ثيمات، 39 درسًا
   ───────────────────────────────────────────────────────────── */
const B1D1: RawBook = {
  id: 'b1d1',
  title: 'TaalCompleet B1 – deel 1',
  titleAr: 'الكتاب الثاني — TaalCompleet B1 الجزء 1',
  short: 'B1·1',
  icon: '📘',
  accent: 'var(--amber)',
  accentSoft: 'var(--amber-l)',
  endPage: 256,
  themes: [
    {
      n: 1, title: 'Wie ben jij?', titleAr: 'من أنت؟',
      lessons: [
        ['1.1', 'Je leven', 6],
        ['1.2', 'Jouw cultuur en Nederland', 12],
        ['1.3', 'Overal tekst', 18],
        ['1.4', 'Weekend', 22],
        ['1.5', 'Het Hobbyhuis', 25],
        ['1.6', 'Hobby’s', 30],
        ['1.7', 'Karakter', 34],
        ['1.8', 'En dan nog iets', 40],
      ],
    },
    {
      n: 2, title: 'Gezondheid', titleAr: 'الصحة',
      lessons: [
        ['2.1', 'Voel je goed!', 44],
        ['2.2', 'Ziek zijn', 52],
        ['2.3', 'Beter worden', 60],
        ['2.4', 'Naar de bedrijfsarts', 66],
        ['2.5', 'De mantelzorger', 72],
        ['2.6', 'Weg met stress', 77],
        ['2.7', 'En dan nog iets', 82],
      ],
    },
    {
      n: 3, title: 'Omgeving', titleAr: 'المحيط',
      lessons: [
        ['3.1', 'De buurtapp', 86],
        ['3.2', 'Dit is mijn stad', 94],
        ['3.3', 'Een uitnodiging voor bewoners', 99],
        ['3.4', 'Naar een vergadering', 104],
        ['3.5', 'Zal ik even helpen?', 110],
        ['3.6', 'Alles verandert', 120],
        ['3.7', 'Aan het klussen', 127],
        ['3.8', 'En dan nog iets', 135],
      ],
    },
    {
      n: 4, title: 'Geld', titleAr: 'المال',
      lessons: [
        ['4.1', 'Geld', 140],
        ['4.2', 'Het spijt me!', 150],
        ['4.3', 'Bellen naar de bank', 156],
        ['4.4', 'Budget en schulden', 167],
        ['4.5', 'Werk en geld', 175],
        ['4.6', 'De kringloopwinkel', 184],
        ['4.7', 'Inkomen', 189],
        ['4.8', 'En dan nog iets', 197],
      ],
    },
    {
      n: 5, title: 'Werk', titleAr: 'العمل',
      lessons: [
        ['5.1', 'Werk!', 202],
        ['5.2', 'De werkcoach', 210],
        ['5.3', 'De sollicitatiebrief', 217],
        ['5.4', 'Werk vroeger en nu', 223],
        ['5.5', 'Werkopdracht', 231],
        ['5.6', 'Collegiaal overleg', 240],
        ['5.7', 'Het sollicitatiegesprek', 245],
        ['5.8', 'En dan nog iets', 253],
      ],
    },
  ],
}

/* ─────────────────────────────────────────────────────────────
   TaalCompleet B1 — deel 2 — 5 ثيمات، 36 درسًا
   ───────────────────────────────────────────────────────────── */
const B1D2: RawBook = {
  id: 'b1d2',
  title: 'TaalCompleet B1 – deel 2',
  titleAr: 'الكتاب الثالث — TaalCompleet B1 الجزء 2',
  short: 'B1·2',
  icon: '📙',
  accent: 'var(--purple)',
  accentSoft: 'var(--purple-l)',
  endPage: 252,
  themes: [
    {
      n: 6, title: 'Opleiding', titleAr: 'التعليم',
      lessons: [
        ['6.1', 'Toekomstplannen', 6],
        ['6.2', 'Ik heb stage gelopen', 11],
        ['6.3', 'Gesprek met de studieadviseur', 20],
        ['6.4', 'Fietsen', 25],
        ['6.5', 'Schrijven terwijl je luistert', 32],
        ['6.6', 'Discussie in de klas', 38],
        ['6.7', 'Een tekst onthouden', 47],
        ['6.8', 'En dan nog iets', 56],
      ],
    },
    {
      n: 7, title: 'Veiligheid', titleAr: 'الأمان',
      lessons: [
        ['7.1', 'Veiligheid', 60],
        ['7.2', 'Veilig werken', 68],
        ['7.3', 'Wat een dag!', 75],
        ['7.4', 'Eerste hulp', 82],
        ['7.5', 'Help, het is kapot', 87],
        ['7.6', 'Geen paniek', 96],
        ['7.7', 'Nederland waterland', 102],
        ['7.8', 'En dan nog iets', 106],
      ],
    },
    {
      n: 8, title: 'Samenleven', titleAr: 'العيش المشترك',
      lessons: [
        ['8.1', 'Een leefbare wijk', 110],
        ['8.2', 'Een handje helpen', 119],
        ['8.3', 'Een conflict. Wat nu?', 126],
        ['8.4', 'Sport en spel', 134],
        ['8.5', 'Samen of alleen?', 140],
        ['8.6', 'En dan nog iets', 148],
      ],
    },
    {
      n: 9, title: 'Aan het werk', titleAr: 'في ميدان العمل',
      lessons: [
        ['9.1', 'Personeelszaken', 154],
        ['9.2', 'De klant is koning', 161],
        ['9.3', 'Even vrij', 169],
        ['9.4', 'Hoe is het gegaan?', 179],
        ['9.5', 'Werk voor iedereen', 186],
        ['9.6', 'Omgang met collega’s', 194],
        ['9.7', 'En dan nog iets', 200],
      ],
    },
    {
      n: 10, title: 'Media', titleAr: 'الإعلام',
      lessons: [
        ['10.1', 'Alles, altijd en overal online', 204],
        ['10.2', 'Help!', 211],
        ['10.3', 'Televisie', 220],
        ['10.4', 'Mediawijsheid', 230],
        ['10.5', 'Beroemd', 237],
        ['10.6', 'Feedback', 242],
        ['10.7', 'En dan nog iets', 250],
      ],
    },
  ],
}

const RAW_BOOKS: readonly RawBook[] = [A2, B1D1, B1D2]

/* ─────────────────────────────────────────────────────────────
   الأنواع المُصدَّرة
   ───────────────────────────────────────────────────────────── */

export interface CurriculumBook {
  id: string
  title: string
  titleAr: string
  short: string
  icon: string
  accent: string
  accentSoft: string
  themeCount: number
  lessonCount: number
  firstGlobal: number
  lastGlobal: number
}

/** «قسم» = ثيمة (Thema) في الكتاب. */
export interface CurriculumSection {
  id: string
  bookId: string
  /** رقم الثيمة كما هو مطبوع في الكتاب. */
  index: number
  title: string
  titleAr: string
  size: number
  firstGlobal: number
  lastGlobal: number
  pages: number
}

export interface CurriculumLesson {
  id: string
  bookId: string
  sectionId: string
  /** رقم الدرس كما في الفهرس: "3.12". */
  number: string
  title: string
  /** عنوان القاعدة النحوية إن كان الدرس نحويًا. */
  grammar?: string
  page: number
  /** عدد الصفحات التقريبي (فارق الصفحات عن الدرس التالي). */
  pages: number
  indexInSection: number
  /** 1..184 عبر المنهج كلّه. */
  global: number
}

/* ─────────────────────────────────────────────────────────────
   البناء
   ───────────────────────────────────────────────────────────── */

function build() {
  const books: CurriculumBook[] = []
  const sections: CurriculumSection[] = []
  const lessons: CurriculumLesson[] = []
  let g = 0

  for (const book of RAW_BOOKS) {
    const bookFirst = g + 1

    // امتداد الصفحات يُحسب على مستوى الكتاب كاملًا (الثيمات متتابعة في الترقيم).
    const flat = book.themes.flatMap((t) => t.lessons)

    let cursor = 0
    for (const theme of book.themes) {
      const sectionId = `${book.id}-t${String(theme.n).padStart(2, '0')}`
      const themeFirst = g + 1
      let themePages = 0

      theme.lessons.forEach((raw, i) => {
        g += 1
        const [number, title, page, grammar] = raw
        const next = flat[cursor + 1]
        const pages = Math.max(1, (next ? next[2] : book.endPage) - page)
        themePages += pages
        cursor += 1

        lessons.push({
          id: `${sectionId}-l${String(i + 1).padStart(2, '0')}`,
          bookId: book.id,
          sectionId,
          number,
          title,
          ...(grammar ? { grammar } : {}),
          page,
          pages,
          indexInSection: i + 1,
          global: g,
        })
      })

      sections.push({
        id: sectionId,
        bookId: book.id,
        index: theme.n,
        title: theme.title,
        titleAr: theme.titleAr,
        size: theme.lessons.length,
        firstGlobal: themeFirst,
        lastGlobal: g,
        pages: themePages,
      })
    }

    books.push({
      id: book.id,
      title: book.title,
      titleAr: book.titleAr,
      short: book.short,
      icon: book.icon,
      accent: book.accent,
      accentSoft: book.accentSoft,
      themeCount: book.themes.length,
      lessonCount: g - bookFirst + 1,
      firstGlobal: bookFirst,
      lastGlobal: g,
    })
  }

  return { books, sections, lessons }
}

const built = build()

export const BOOKS: CurriculumBook[] = built.books
export const SECTIONS: CurriculumSection[] = built.sections
export const LESSONS: CurriculumLesson[] = built.lessons

export const TOTAL_LESSONS = LESSONS.length      // 184
export const TOTAL_SECTIONS = SECTIONS.length    // 18
export const TOTAL_PAGES = LESSONS.reduce((a, l) => a + l.pages, 0)

/* ─────────────────────────────────────────────────────────────
   فهارس ومساعدات
   ───────────────────────────────────────────────────────────── */

const lessonById = new Map(LESSONS.map((l) => [l.id, l]))
const sectionById = new Map(SECTIONS.map((s) => [s.id, s]))
const bookById = new Map(BOOKS.map((b) => [b.id, b]))

export const getLesson = (id: string) => lessonById.get(id)
export const getSection = (id: string) => sectionById.get(id)
export const getBook = (id: string) => bookById.get(id)
export const isKnownLesson = (id: string) => lessonById.has(id)

export const lessonIdsOfSection = (sectionId: string): string[] =>
  LESSONS.filter((l) => l.sectionId === sectionId).map((l) => l.id)

/* ─────────────────────────────────────────────────────────────
   نموذج مدّة الدرس
   ───────────────────────────────────────────────────────────── */

/**
 * `flat`  — كل درس 20 دقيقة (التقدير الذي حدّده المستخدم).
 * `pages` — المدّة موزونة بعدد صفحات الدرس، مع تثبيت المتوسّط على 20 دقيقة
 *           حتى يبقى الإجمالي قريبًا من نموذج flat. هذا يعكس واقع أن دروس B1
 *           أكبر بمرّتين تقريبًا من دروس A2، دون تضخيم الإجمالي.
 */
export type DurationModel = 'flat' | 'pages'

/** المدّة الأساسية للدرس بالدقائق في النموذج المسطّح. */
export const BASE_LESSON_MINUTES = 20

const AVG_PAGES = TOTAL_PAGES / TOTAL_LESSONS

/** المدّة بالدقائق لدرس واحد حسب النموذج (مضاعفات 5 دقائق لسهولة التنفيذ). */
export function lessonMinutes(lesson: CurriculumLesson, model: DurationModel): number {
  // صريح عمدًا: أيّ قيمة غير 'pages' (بما فيها undefined من حالة محفوظة قديمة)
  // تعني النموذج الثابت. الشرط المعكوس كان يجعل undefined يقلب النموذج صامتًا.
  if (model !== 'pages') return BASE_LESSON_MINUTES
  const raw = (lesson.pages / AVG_PAGES) * BASE_LESSON_MINUTES
  return Math.max(10, Math.round(raw / 5) * 5)
}

/** مدّة درس بمعرّفه (0 إذا كان المعرّف مجهولًا). */
export function lessonMinutesById(id: string, model: DurationModel): number {
  const l = lessonById.get(id)
  return l ? lessonMinutes(l, model) : 0
}

/** مجموع دقائق قائمة دروس (بالمعرّفات). */
export function sumLessonMinutes(ids: readonly string[], model: DurationModel): number {
  let total = 0
  for (const id of ids) total += lessonMinutesById(id, model)
  return total
}

/** إجمالي دقائق المنهج كلّه في نموذج معيّن. */
export function totalLessonMinutes(model: DurationModel): number {
  return LESSONS.reduce((a, l) => a + lessonMinutes(l, model), 0)
}

/* ─────────────────────────────────────────────────────────────
   التسميات
   ───────────────────────────────────────────────────────────── */

/** «A2 · 3.12 — Foto – foto’s» */
export function lessonLabel(id: string): string {
  const l = lessonById.get(id)
  if (!l) return id
  const b = bookById.get(l.bookId)
  return `${b?.short ?? l.bookId} · ${l.number} — ${l.title}`
}

/** «A2 · 3.12» — تسمية قصيرة للشبكات الضيّقة. */
export function lessonShort(id: string): string {
  const l = lessonById.get(id)
  if (!l) return id
  const b = bookById.get(l.bookId)
  return `${b?.short ?? ''} · ${l.number}`
}

/** «A2 — Thema 3 Kinderen (14 درسًا)» */
export function sectionLabel(id: string): string {
  const s = sectionById.get(id)
  if (!s) return id
  const b = bookById.get(s.bookId)
  return `${b?.short ?? ''} — Thema ${s.index} ${s.title} (${s.size} دروس)`
}

/** «A2 Th3» — تسمية مضغوطة جدًا. */
export function sectionShort(id: string): string {
  const s = sectionById.get(id)
  if (!s) return id
  const b = bookById.get(s.bookId)
  return `${b?.short ?? ''} Th${s.index}`
}

/** ضغط قائمة دروس إلى مدى مقروء: «A2 Th1 1.1–1.10». */
export function compactLessonRange(ids: readonly string[]): string {
  if (ids.length === 0) return '—'
  const items = ids.map((id) => lessonById.get(id)).filter((x): x is CurriculumLesson => !!x)
  if (items.length === 0) return '—'

  const groups: { sectionId: string; from: CurriculumLesson; to: CurriculumLesson }[] = []
  for (const it of items) {
    const last = groups[groups.length - 1]
    if (last && last.sectionId === it.sectionId && it.global === last.to.global + 1) {
      last.to = it
    } else {
      groups.push({ sectionId: it.sectionId, from: it, to: it })
    }
  }

  return groups
    .map((gr) => {
      const range = gr.from.number === gr.to.number
        ? gr.from.number
        : `${gr.from.number}–${gr.to.number}`
      return `${sectionShort(gr.sectionId)} ${range}`
    })
    .join(' · ')
}

/** متوسّط مدّة الدرس في نموذج معيّن — يُستخدم في التقديرات لا في الجدولة. */
export function avgLessonMinutes(model: DurationModel): number {
  return totalLessonMinutes(model) / TOTAL_LESSONS
}
