/* نكت هولندية خفيفة 😹 مع ترجمتها العربية — تعرضها كاتيا في لوحة المساعدة.
   {nl} النص الهولندي الأصلي، {ar} الترجمة (مع شرح التورية بين قوسين حين
   تعتمد النكتة على لعب لغوي لا يُترجم مباشرة). */

export interface DutchJoke {
  nl: string
  ar: string
}

export const DUTCH_JOKES: DutchJoke[] = [
  {
    nl: 'Wat zegt een slak die op de rug van een schildpad zit? Hoera, we vliegen!',
    ar: 'ماذا يقول الحلزون الجالس على ظهر السلحفاة؟ "يااااه، نحن نطير!"',
  },
  {
    nl: 'Juf: "Jantje, noem eens vijf dieren die in Afrika leven." Jantje: "Vier olifanten en een leeuw!"',
    ar: 'المعلمة: "يا يانتيه، اذكر خمسة حيوانات تعيش في إفريقيا." يانتيه: "أربعة فيلة وأسد!"',
  },
  {
    nl: 'Wat zei de ene muur tegen de andere muur? Ik zie je op de hoek!',
    ar: 'ماذا قال الجدار للجدار الآخر؟ "أراك عند الزاوية!"',
  },
  {
    nl: 'Hoe noem je een koe zonder poten? Gehakt.',
    ar: 'ماذا تسمّي بقرة بلا أرجل؟ "لحمًا مفرومًا!" (gehakt تعني مفروم)',
  },
  {
    nl: 'Waarom zitten katten graag bij de computer? Om op de muis te letten!',
    ar: 'لماذا تحب القطط الجلوس عند الحاسوب؟ لتراقب "الفأرة"! (muis تعني فأرة الحاسوب والفأر الحقيقي معًا — نكتتي المفضلة طبعًا 🐱)',
  },
  {
    nl: 'Wat zegt een Nederlander als het regent? Mooi weer voor de eenden!',
    ar: 'ماذا يقول الهولندي حين تمطر؟ "طقس جميل للبطّ!" (تعبير شائع فعلًا في أيام المطر)',
  },
  {
    nl: 'De Nederlandse zomer? 30 graden: 15 in de ochtend en 15 in de middag.',
    ar: 'الصيف الهولندي؟ 30 درجة: 15 في الصباح و15 بعد الظهر!',
  },
  {
    nl: 'Hoeveel fietsen heeft een Nederlander nodig? Eentje meer.',
    ar: 'كم درّاجة يحتاج الهولندي؟ "واحدة إضافية" — دائمًا!',
  },
  {
    nl: 'Waarom nam de student een ladder mee? Hij ging naar de hogeschool!',
    ar: 'لماذا أخذ الطالب سلّمًا معه؟ لأنه التحق بـ"المدرسة العليا"! (hogeschool حرفيًّا: المدرسة المرتفعة)',
  },
  {
    nl: 'Hoe begroet een Goudse kaas zijn vrienden? "Gouda-g!"',
    ar: 'كيف يحيّي جبن خودا أصدقاءه؟ "خودا-خ!" (لعب على Gouda وتحية goedendag أي "يومًا سعيدًا")',
  },
  {
    nl: 'Mijn Nederlands wordt steeds beter — zelfs mijn dromen hebben nu ondertitels!',
    ar: 'هولنديتي تتحسّن باستمرار — حتى أحلامي صارت تُعرض الآن بترجمة سفلية!',
  },
  {
    nl: 'Waarom kunnen skeletten zo slecht liegen? Iedereen kijkt dwars door ze heen.',
    ar: 'لماذا الهياكل العظمية سيئة في الكذب؟ لأن الجميع "يرى من خلالها"!',
  },
  {
    nl: 'Wat is het toppunt van Nederlandse zuinigheid? Gratis parkeren... voor je fiets.',
    ar: 'ما قمة التوفير الهولندي؟ موقف مجاني... لدرّاجتك!',
  },
  {
    nl: 'Dokter: "U moet meer bewegen." Patiënt: "Ik woon in Nederland, ik fiets al tegen de wind in!"',
    ar: 'الطبيب: "عليك أن تتحرّك أكثر." المريض: "أنا أعيش في هولندا — أنا أصلًا أقود درّاجتي ضدّ الريح!"',
  },
]

/** نكتة اليوم — دورية ثابتة، ويمكن طلب غيرها عشوائيًّا من اللوحة. */
export function jokeForDay(now: number): DutchJoke {
  const d = new Date(now)
  const start = new Date(d.getFullYear(), 0, 0)
  const day = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return DUTCH_JOKES[day % DUTCH_JOKES.length]
}
