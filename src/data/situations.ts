// Real-life conversation practice — eight situations an adult newcomer in the
// Netherlands actually meets. The learner reads (or hears) what the other
// person says and picks the reply that fits.
//
// Content rules, checked by src/tests/unit/situations.test.ts:
//  · every turn has exactly one fitting reply, and its position varies;
//  · every option is correct Dutch — distractors are wrong because they do not
//    FIT (they answer another question, are impolite, or say the opposite),
//    never because the grammar is broken, so no wrong form is ever modelled;
//  · formal register throughout (u / uw), never je / jij / jouw;
//  · every option carries a short Arabic reason, so a wrong pick teaches.

export interface SituationChoice {
  nl: string
  /** المعنى بالعربية. */
  ar: string
  ok: boolean
  /** لماذا يناسب هذا الردّ أو لا يناسب — جملة واحدة. */
  whyAr: string
}

export interface SituationTurn {
  /** Who speaks, in Dutch ("Kassamedewerker"). */
  speaker: string
  nl: string
  ar: string
  choices: SituationChoice[]
}

export interface Situation {
  id: string
  level: 'A2' | 'B1'
  icon: string
  titleNl: string
  titleAr: string
  /** Where the learner is and what they want — in Arabic, before they start. */
  contextAr: string
  turns: SituationTurn[]
  /** Phrases worth keeping, shown at the end with audio. */
  phrases: { nl: string; ar: string }[]
}

export const SITUATIONS: Situation[] = [
  {
    id: 'supermarkt',
    level: 'A2',
    icon: '🛒',
    titleNl: 'Bij de kassa',
    titleAr: 'عند صندوق الدفع في السوبرماركت',
    contextAr: 'أنهيت التسوّق وتقف عند الصندوق. الموظّف سيسألك بضعة أسئلة قصيرة.',
    turns: [
      {
        speaker: 'Kassamedewerker',
        nl: 'Goedemiddag. Heeft u een bonuskaart?',
        ar: 'مساء الخير. هل لديك بطاقة التخفيضات؟',
        choices: [
          { nl: 'Ja, graag een tas.', ar: 'نعم، كيسًا من فضلك.', ok: false, whyAr: 'السؤال عن بطاقة التخفيضات، لا عن الكيس.' },
          { nl: 'Nee, die heb ik niet.', ar: 'لا، ليست لديّ.', ok: true, whyAr: 'جواب مباشر ومهذّب عن سؤال البطاقة.' },
          { nl: 'Nee, ik betaal later.', ar: 'لا، سأدفع لاحقًا.', ok: false, whyAr: 'هذا لا يجيب عن السؤال، والدفع لاحقًا غير ممكن هنا.' },
        ],
      },
      {
        speaker: 'Kassamedewerker',
        nl: 'Wilt u een tasje? Dat kost vijftig cent.',
        ar: 'هل تريد كيسًا؟ ثمنه خمسون سنتًا.',
        choices: [
          { nl: 'Nee, dank u. Ik heb zelf een tas bij me.', ar: 'لا، شكرًا. معي كيسي.', ok: true, whyAr: 'ترفض بلطف وتذكر السبب — هكذا يتكلّم الناس عادة.' },
          { nl: 'Ja, ik heb geen bonuskaart.', ar: 'نعم، ليست لديّ بطاقة تخفيضات.', ok: false, whyAr: 'هذا جواب السؤال السابق، لا سؤال الكيس.' },
          { nl: 'Nee, ik heb geen geld.', ar: 'لا، ليس معي مال.', ok: false, whyAr: 'غريب في هذه اللحظة: أنت على وشك أن تدفع ثمن مشترياتك.' },
        ],
      },
      {
        speaker: 'Kassamedewerker',
        nl: 'Dat is dan achttien euro veertig. Pinnen of contant?',
        ar: 'المبلغ ثمانية عشر يورو وأربعون سنتًا. بالبطاقة أم نقدًا؟',
        choices: [
          { nl: 'Ik wil graag een andere kassa.', ar: 'أريد صندوقًا آخر.', ok: false, whyAr: 'لا علاقة له بطريقة الدفع، ويبدو غريبًا في هذه اللحظة.' },
          { nl: 'Dat is te duur, dank u wel.', ar: 'هذا غالٍ جدًّا، شكرًا.', ok: false, whyAr: 'في السوبرماركت لا يُفاوَض على السعر عند الصندوق.' },
          { nl: 'Pinnen, alstublieft.', ar: 'بالبطاقة، من فضلك.', ok: true, whyAr: '«pinnen» هي الكلمة اليومية للدفع ببطاقة البنك.' },
        ],
      },
      {
        speaker: 'Kassamedewerker',
        nl: 'Wilt u de bon?',
        ar: 'هل تريد الإيصال؟',
        choices: [
          { nl: 'Ja, graag.', ar: 'نعم، من فضلك.', ok: true, whyAr: 'أقصر جواب مهذّب ممكن، وهو الأكثر استعمالًا.' },
          { nl: 'Nee, ik heb geen tasje nodig.', ar: 'لا، لا أحتاج كيسًا.', ok: false, whyAr: 'السؤال عن الإيصال (de bon)، لا عن الكيس.' },
          { nl: 'Ja, ik kom morgen terug.', ar: 'نعم، سأعود غدًا.', ok: false, whyAr: 'لا يجيب عن السؤال.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Heeft u een bonuskaart?', ar: 'هل لديك بطاقة التخفيضات؟' },
      { nl: 'Ik heb zelf een tas bij me.', ar: 'معي كيسي.' },
      { nl: 'Pinnen, alstublieft.', ar: 'بالبطاقة، من فضلك.' },
      { nl: 'Wilt u de bon?', ar: 'هل تريد الإيصال؟' },
    ],
  },
  {
    id: 'gemeente',
    level: 'B1',
    icon: '🏛️',
    titleNl: 'Bij de gemeente',
    titleAr: 'في البلدية: تسجيل عنوان جديد',
    contextAr: 'انتقلت إلى بيت جديد وحجزت موعدًا في البلدية لتسجيل عنوانك. أنت الآن عند الشبّاك.',
    turns: [
      {
        speaker: 'Baliemedewerker',
        nl: 'Goedemorgen. Waarmee kan ik u helpen?',
        ar: 'صباح الخير. بماذا أستطيع مساعدتك؟',
        choices: [
          { nl: 'Ik woon hier al drie jaar, dank u wel.', ar: 'أسكن هنا منذ ثلاث سنوات، شكرًا.', ok: false, whyAr: 'لا يوضّح سبب مجيئك، والموظّف سيبقى لا يعرف ماذا تريد.' },
          { nl: 'Goedemorgen. Ik ben verhuisd en ik kom mijn nieuwe adres doorgeven.', ar: 'صباح الخير. انتقلت، وجئت لتسجيل عنواني الجديد.', ok: true, whyAr: 'تحيّة ثم الطلب بوضوح في جملة واحدة: هذا ما ينتظره الموظّف.' },
          { nl: 'Waar is hier het station?', ar: 'أين المحطّة هنا؟', ok: false, whyAr: 'سؤال لا علاقة له بموعدك في البلدية.' },
        ],
      },
      {
        speaker: 'Baliemedewerker',
        nl: 'Heeft u een afspraak gemaakt?',
        ar: 'هل حجزت موعدًا؟',
        choices: [
          { nl: 'Nee, ik heb vandaag geen tijd.', ar: 'لا، ليس لديّ وقت اليوم.', ok: false, whyAr: 'أنت هنا بالفعل، والجملة تناقض الموقف.' },
          { nl: 'Ja, ik heb een huurcontract.', ar: 'نعم، لديّ عقد إيجار.', ok: false, whyAr: 'السؤال عن الموعد لا عن الأوراق — ستُسأل عنها بعد قليل.' },
          { nl: 'Ja, om half tien, op naam van Haddad.', ar: 'نعم، في التاسعة والنصف، باسم حدّاد.', ok: true, whyAr: 'تذكر الوقت والاسم، فيجد الموظّف موعدك فورًا.' },
        ],
      },
      {
        speaker: 'Baliemedewerker',
        nl: 'Mag ik uw identiteitsbewijs en uw huurcontract zien?',
        ar: 'هل يمكنني رؤية وثيقة هويّتك وعقد الإيجار؟',
        choices: [
          { nl: 'Ja, natuurlijk. Alstublieft.', ar: 'نعم، طبعًا. تفضّل.', ok: true, whyAr: '«Alstublieft» تقال أيضًا عندما تعطي شيئًا لشخص.' },
          { nl: 'Nee, dat is niet nodig.', ar: 'لا، هذا غير ضروري.', ok: false, whyAr: 'الموظّف يحتاج هذه الأوراق ليسجّل العنوان؛ الرفض يوقف الإجراء.' },
          { nl: 'Ik heb een afspraak om half tien.', ar: 'لديّ موعد في التاسعة والنصف.', ok: false, whyAr: 'قلت هذا من قبل، والسؤال الآن عن الأوراق.' },
        ],
      },
      {
        speaker: 'Baliemedewerker',
        nl: 'Dank u. Uw adres is gewijzigd. U krijgt binnen twee weken een bevestiging per post.',
        ar: 'شكرًا. تغيّر عنوانك. سيصلك تأكيد بالبريد خلال أسبوعين.',
        choices: [
          { nl: 'Ik woon nog steeds op mijn oude adres.', ar: 'ما زلت أسكن في عنواني القديم.', ok: false, whyAr: 'يناقض سبب زيارتك كلّها.' },
          { nl: 'Waarom krijg ik een boete?', ar: 'لماذا تصلني غرامة؟', ok: false, whyAr: 'لم يذكر أحد غرامة؛ لقد أسأت فهم «bevestiging» (تأكيد).' },
          { nl: 'Prima. Moet ik verder nog iets doen?', ar: 'ممتاز. هل عليّ أن أفعل شيئًا آخر؟', ok: true, whyAr: 'سؤال عملي مفيد قبل أن تغادر الشبّاك.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Ik kom mijn nieuwe adres doorgeven.', ar: 'جئت لتسجيل عنواني الجديد.' },
      { nl: 'Ik heb een afspraak om half tien.', ar: 'لديّ موعد في التاسعة والنصف.' },
      { nl: 'Mag ik uw identiteitsbewijs zien?', ar: 'هل يمكنني رؤية وثيقة هويّتك؟' },
      { nl: 'Moet ik verder nog iets doen?', ar: 'هل عليّ أن أفعل شيئًا آخر؟' },
    ],
  },
  {
    id: 'huisarts',
    level: 'B1',
    icon: '🩺',
    titleNl: 'De huisarts bellen',
    titleAr: 'الاتصال بطبيب العائلة',
    contextAr: 'أنت مريض منذ أيام وتتصل بعيادة طبيب العائلة لتحجز موعدًا. تردّ عليك المساعدة.',
    turns: [
      {
        speaker: 'Doktersassistente',
        nl: 'Huisartsenpraktijk De Linde, goedemorgen. U spreekt met Anouk.',
        ar: 'عيادة دي ليندِه، صباح الخير. معك أنوك.',
        choices: [
          { nl: 'Goedemorgen, u spreekt met Samir Haddad. Ik wil graag een afspraak maken.', ar: 'صباح الخير، معك سمير حدّاد. أودّ أن أحجز موعدًا.', ok: true, whyAr: 'على الهاتف تبدأ باسمك الكامل ثم سبب الاتصال.' },
          { nl: 'Goedemorgen. Is dit de tandarts?', ar: 'صباح الخير. هل هذا طبيب الأسنان؟', ok: false, whyAr: 'قالت لك اسم العيادة للتوّ: إنها عيادة طبيب العائلة.' },
          { nl: 'Goedemorgen. Ik ben vandaag niet ziek.', ar: 'صباح الخير. لست مريضًا اليوم.', ok: false, whyAr: 'يناقض سبب اتصالك.' },
        ],
      },
      {
        speaker: 'Doktersassistente',
        nl: 'Wat zijn uw klachten?',
        ar: 'ما الأعراض التي تشكو منها؟',
        choices: [
          { nl: 'Ik kan morgen na drie uur.', ar: 'أستطيع غدًا بعد الساعة الثالثة.', ok: false, whyAr: 'هذا عن الوقت؛ هي تسأل عن الأعراض أوّلًا.' },
          { nl: 'Ik heb al vier dagen hoge koorts en ik hoest veel.', ar: 'عندي حمّى مرتفعة منذ أربعة أيام وأسعل كثيرًا.', ok: true, whyAr: 'تذكر الأعراض ومنذ متى — المعلومتان اللتان تحتاجهما لتقدير الحالة.' },
          { nl: 'Ik neem geen medicijnen.', ar: 'لا آخذ أدوية.', ok: false, whyAr: 'معلومة قد تُسأل عنها لاحقًا، لكنها لا تجيب عن سؤال الأعراض.' },
        ],
      },
      {
        speaker: 'Doktersassistente',
        nl: 'Heeft u ook moeite met ademhalen?',
        ar: 'هل تجد صعوبة في التنفّس أيضًا؟',
        choices: [
          { nl: 'Ja, ik wil een afspraak.', ar: 'نعم، أريد موعدًا.', ok: false, whyAr: '«نعم» هنا تعني أنّ عندك ضيق تنفّس — وهذا ليس ما تقصده.' },
          { nl: 'Nee, ademhalen gaat goed. Maar ik ben erg moe.', ar: 'لا، التنفّس جيّد. لكنّي متعب جدًّا.', ok: true, whyAr: 'جواب واضح عن السؤال مع معلومة مفيدة إضافية.' },
          { nl: 'Nee, ik woon in Utrecht.', ar: 'لا، أسكن في أوترخت.', ok: false, whyAr: 'لا علاقة له بالسؤال.' },
        ],
      },
      {
        speaker: 'Doktersassistente',
        nl: 'De dokter kan u vanmiddag om kwart over twee zien. Komt dat uit?',
        ar: 'يستطيع الطبيب رؤيتك بعد الظهر في الثانية والربع. هل يناسبك ذلك؟',
        choices: [
          { nl: 'Ja, ik heb koorts.', ar: 'نعم، عندي حمّى.', ok: false, whyAr: 'السؤال «هل يناسبك الموعد؟»، وقد ذكرت الحمّى من قبل.' },
          { nl: 'Ja, om kwart over drie.', ar: 'نعم، في الثالثة والربع.', ok: false, whyAr: 'تقول «نعم» ثم تذكر وقتًا غير الذي عُرض عليك (kwart over twee).' },
          { nl: 'Ja, dat komt goed uit. Dank u wel.', ar: 'نعم، هذا يناسبني. شكرًا جزيلًا.', ok: true, whyAr: '«Dat komt goed uit» هي العبارة المعتادة لقبول موعد.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Ik wil graag een afspraak maken.', ar: 'أودّ أن أحجز موعدًا.' },
      { nl: 'Ik heb al vier dagen koorts.', ar: 'عندي حمّى منذ أربعة أيام.' },
      { nl: 'Heeft u moeite met ademhalen?', ar: 'هل تجد صعوبة في التنفّس؟' },
      { nl: 'Ja, dat komt goed uit.', ar: 'نعم، هذا يناسبني.' },
    ],
  },
  {
    id: 'sollicitatie',
    level: 'B1',
    icon: '💼',
    titleNl: 'Een sollicitatiegesprek',
    titleAr: 'مقابلة عمل',
    contextAr: 'تقدّمت لوظيفة في مستودع شركة توزيع، ودُعيت إلى مقابلة. مسؤولة التوظيف تطرح أسئلتها.',
    turns: [
      {
        speaker: 'Recruiter',
        nl: 'Welkom. Kunt u iets over uzelf vertellen?',
        ar: 'أهلًا بك. هل يمكنك أن تحدّثنا قليلًا عن نفسك؟',
        choices: [
          { nl: 'Nee, dat staat allemaal in mijn cv.', ar: 'لا، كلّ هذا مكتوب في سيرتي الذاتية.', ok: false, whyAr: 'يبدو غير متعاون؛ المقابلة فرصتك لتقدّم نفسك بكلامك.' },
          { nl: 'Ik wil vooral veel geld verdienen.', ar: 'أريد قبل كلّ شيء أن أكسب مالًا كثيرًا.', ok: false, whyAr: 'صريح أكثر من اللازم، ولا يقول شيئًا عن خبرتك.' },
          { nl: 'Natuurlijk. Ik ben Lina, ik ben 34 jaar en ik heb vijf jaar in een magazijn gewerkt.', ar: 'طبعًا. أنا لينا، عمري 34 سنة، وعملت خمس سنوات في مستودع.', ok: true, whyAr: 'اسمك، ثم خبرة تتعلّق مباشرة بالوظيفة: بداية قويّة.' },
        ],
      },
      {
        speaker: 'Recruiter',
        nl: 'Waarom wilt u bij ons werken?',
        ar: 'لماذا تريد أن تعمل عندنا؟',
        choices: [
          { nl: 'Uw bedrijf staat bekend om goede opleidingen, en ik wil mij verder ontwikkelen.', ar: 'شركتكم معروفة بالتدريب الجيّد، وأريد أن أطوّر نفسي أكثر.', ok: true, whyAr: 'تُظهر أنّك تعرف الشركة وأنّ لديك دافعًا للتعلّم.' },
          { nl: 'Omdat het dicht bij mijn huis is.', ar: 'لأنها قريبة من بيتي.', ok: false, whyAr: 'قد يكون صحيحًا، لكنه لا يقنع صاحب العمل بك.' },
          { nl: 'Ik werk liever niet in een team.', ar: 'أفضّل ألّا أعمل ضمن فريق.', ok: false, whyAr: 'لا يجيب عن السؤال، ويعطي انطباعًا سلبيًّا.' },
        ],
      },
      {
        speaker: 'Recruiter',
        nl: 'Wat is volgens u uw sterke kant?',
        ar: 'ما نقطة قوّتك برأيك؟',
        choices: [
          { nl: 'Ik kan morgen al beginnen.', ar: 'أستطيع أن أبدأ غدًا.', ok: false, whyAr: 'معلومة مفيدة، لكنها ليست نقطة قوّة في العمل.' },
          { nl: 'Ik ben nauwkeurig en ik werk graag samen met collega\'s.', ar: 'أنا دقيق وأحبّ العمل مع الزملاء.', ok: true, whyAr: 'صفتان مهمّتان في المستودع، بجملة بسيطة وواضحة.' },
          { nl: 'Ik heb geen zwakke kanten.', ar: 'ليست لديّ نقاط ضعف.', ok: false, whyAr: 'لا يجيب عن السؤال، ويبدو متعاليًا.' },
        ],
      },
      {
        speaker: 'Recruiter',
        nl: 'Heeft u zelf nog vragen?',
        ar: 'هل لديك أسئلة؟',
        choices: [
          { nl: 'Nee. Wanneer krijg ik vakantie?', ar: 'لا. متى أحصل على إجازة؟', ok: false, whyAr: 'تقول «لا» ثم تسأل، والسؤال عن الإجازة أوّلًا يترك انطباعًا سيّئًا.' },
          { nl: 'Ja. Hoe ziet een normale werkdag eruit?', ar: 'نعم. كيف يبدو يوم العمل العادي؟', ok: true, whyAr: 'سؤال يُظهر اهتمامك الحقيقي بالعمل نفسه.' },
          { nl: 'Nee, ik heb geen vragen over mijzelf.', ar: 'لا، ليست لديّ أسئلة عن نفسي.', ok: false, whyAr: 'أسأت فهم السؤال: هي تسألك إن كانت لديك أسئلة لها.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Ik heb vijf jaar in een magazijn gewerkt.', ar: 'عملت خمس سنوات في مستودع.' },
      { nl: 'Ik wil mij verder ontwikkelen.', ar: 'أريد أن أطوّر نفسي أكثر.' },
      { nl: 'Ik werk graag samen met collega\'s.', ar: 'أحبّ العمل مع الزملاء.' },
      { nl: 'Hoe ziet een normale werkdag eruit?', ar: 'كيف يبدو يوم العمل العادي؟' },
    ],
  },
  {
    id: 'buren',
    level: 'A2',
    icon: '🏠',
    titleNl: 'Kennismaken met de buren',
    titleAr: 'التعارف مع الجيران',
    contextAr: 'انتقلت منذ أسبوع. جارتك تلقي عليك التحيّة أمام البيت.',
    turns: [
      {
        speaker: 'Buurvrouw',
        nl: 'Goedemiddag! U bent de nieuwe bewoner van nummer 12, toch?',
        ar: 'مساء الخير! أنت الساكن الجديد في الرقم 12، أليس كذلك؟',
        choices: [
          { nl: 'Ja, dat klopt. Ik ben vorige week verhuisd. Ik heet Omar.', ar: 'نعم، صحيح. انتقلت الأسبوع الماضي. اسمي عمر.', ok: true, whyAr: 'تؤكّد، وتضيف معلومة، وتقدّم اسمك: بداية تعارف طبيعية.' },
          { nl: 'Nee, ik woon niet in Nederland.', ar: 'لا، لا أسكن في هولندا.', ok: false, whyAr: 'غير صحيح، ويُنهي الحديث.' },
          { nl: 'Ja, mijn fiets is kapot.', ar: 'نعم، درّاجتي معطّلة.', ok: false, whyAr: 'لا علاقة له بسؤالها.' },
        ],
      },
      {
        speaker: 'Buurvrouw',
        nl: 'Welkom in de straat! Bevalt het huis een beetje?',
        ar: 'أهلًا بك في الشارع! هل يعجبك البيت؟',
        choices: [
          { nl: 'Nee, dank u, ik heb al gegeten.', ar: 'لا، شكرًا، أكلت للتوّ.', ok: false, whyAr: 'أسأت فهم «bevalt»: هي تسأل إن كان البيت يعجبك.' },
          { nl: 'Ja, ik ga morgen naar de markt.', ar: 'نعم، سأذهب غدًا إلى السوق.', ok: false, whyAr: 'لا يجيب عن السؤال.' },
          { nl: 'Ja, heel goed. Het is even wennen, maar de buurt is rustig.', ar: 'نعم، جيّد جدًّا. أحتاج وقتًا لأعتاد، لكنّ الحيّ هادئ.', ok: true, whyAr: '«Het is even wennen» عبارة شائعة جدًّا عن الاعتياد على مكان جديد.' },
        ],
      },
      {
        speaker: 'Buurvrouw',
        nl: 'Op donderdag halen ze het oud papier op. U kunt de container op woensdagavond buiten zetten.',
        ar: 'يجمعون الورق القديم يوم الخميس. يمكنك أن تضع الحاوية في الخارج مساء الأربعاء.',
        choices: [
          { nl: 'Goed dat u het zegt. Dat wist ik nog niet.', ar: 'جيّد أنّك أخبرتني. لم أكن أعرف ذلك.', ok: true, whyAr: 'تشكرها ضمنيًّا على المعلومة — ردّ لطيف ومعتاد.' },
          { nl: 'Ik heb geen papier, dank u.', ar: 'ليس عندي ورق، شكرًا.', ok: false, whyAr: 'هي لا تعرض عليك ورقًا، بل تشرح موعد جمع النفايات.' },
          { nl: 'Nee, op donderdag ben ik jarig.', ar: 'لا، يوم الخميس عيد ميلادي.', ok: false, whyAr: 'لا يتعلّق بما قالته.' },
        ],
      },
      {
        speaker: 'Buurvrouw',
        nl: 'Als u iets nodig heeft, kunt u altijd aanbellen.',
        ar: 'إن احتجت شيئًا، يمكنك دائمًا أن تقرع الجرس.',
        choices: [
          { nl: 'Ja, mijn huisnummer is twaalf.', ar: 'نعم، رقم بيتي اثنا عشر.', ok: false, whyAr: 'قالت هي ذلك في البداية؛ الردّ لا يناسب عرضها.' },
          { nl: 'Dat is heel vriendelijk. Dank u wel!', ar: 'هذا لطف كبير منك. شكرًا جزيلًا!', ok: true, whyAr: 'تشكر على العرض بدفء — تمامًا ما يتوقّعه الجار.' },
          { nl: 'Nee, ik bel niet graag.', ar: 'لا، لا أحبّ الاتصال.', ok: false, whyAr: '«aanbellen» تعني قرع جرس الباب، لا الاتصال الهاتفي.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Ik ben vorige week verhuisd.', ar: 'انتقلت الأسبوع الماضي.' },
      { nl: 'Het is even wennen.', ar: 'أحتاج وقتًا لأعتاد.' },
      { nl: 'Goed dat u het zegt.', ar: 'جيّد أنّك أخبرتني.' },
      { nl: 'Dat is heel vriendelijk.', ar: 'هذا لطف كبير منك.' },
    ],
  },
  {
    id: 'ov',
    level: 'A2',
    icon: '🚆',
    titleNl: 'Op het station',
    titleAr: 'في محطّة القطار',
    contextAr: 'تريد السفر بالقطار إلى أمرسفورت ولا تعرف أيّ قطار تأخذ. تسأل موظّف الاستعلامات.',
    turns: [
      {
        speaker: 'NS-medewerker',
        nl: 'Goedemiddag. Kan ik u helpen?',
        ar: 'مساء الخير. هل أستطيع مساعدتك؟',
        choices: [
          { nl: 'Nee, ik heb geen kaartje nodig.', ar: 'لا، لا أحتاج تذكرة.', ok: false, whyAr: 'أنت تحتاج مساعدة فعلًا؛ هذا الجواب يُنهي الحديث.' },
          { nl: 'Ja, graag. Welke trein moet ik nemen naar Amersfoort?', ar: 'نعم، من فضلك. أيّ قطار آخذ إلى أمرسفورت؟', ok: true, whyAr: 'تقبل المساعدة وتسأل سؤالًا محدّدًا.' },
          { nl: 'Ja, ik kom uit Amersfoort.', ar: 'نعم، أنا من أمرسفورت.', ok: false, whyAr: 'لا يوضّح ما تحتاجه.' },
        ],
      },
      {
        speaker: 'NS-medewerker',
        nl: 'De intercity van 14.12 uur, vanaf spoor 5.',
        ar: 'قطار الإنترسيتي الساعة 14:12، من الرصيف 5.',
        choices: [
          { nl: 'Moet ik ergens overstappen?', ar: 'هل عليّ أن أبدّل القطار في مكان ما؟', ok: true, whyAr: 'السؤال المنطقي التالي في رحلة بالقطار.' },
          { nl: 'Hoeveel kost een fiets?', ar: 'كم ثمن الدرّاجة؟', ok: false, whyAr: 'لا علاقة له برحلتك.' },
          { nl: 'Spoor 5 is te laat.', ar: 'الرصيف 5 متأخّر.', ok: false, whyAr: 'الرصيف لا يتأخّر؛ القطار هو الذي يتأخّر.' },
        ],
      },
      {
        speaker: 'NS-medewerker',
        nl: 'Nee, de trein rijdt direct. Vergeet niet in te checken met uw pas.',
        ar: 'لا، القطار مباشر. لا تنسَ تسجيل الدخول ببطاقتك.',
        choices: [
          { nl: 'Ik check morgen uit.', ar: 'سأسجّل الخروج غدًا.', ok: false, whyAr: 'تسجّل الخروج عند نهاية الرحلة نفسها، لا في اليوم التالي.' },
          { nl: 'Nee, ik vergeet mijn pas altijd.', ar: 'لا، أنسى بطاقتي دائمًا.', ok: false, whyAr: 'ردّ غريب لا يساعدك.' },
          { nl: 'Dank u wel. Waar kan ik inchecken?', ar: 'شكرًا جزيلًا. أين أسجّل الدخول؟', ok: true, whyAr: 'تشكر وتسأل عن الخطوة العملية التالية.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Welke trein moet ik nemen naar Amersfoort?', ar: 'أيّ قطار آخذ إلى أمرسفورت؟' },
      { nl: 'Moet ik ergens overstappen?', ar: 'هل عليّ أن أبدّل القطار؟' },
      { nl: 'Vergeet niet in te checken.', ar: 'لا تنسَ تسجيل الدخول.' },
    ],
  },
  {
    id: 'school',
    level: 'B1',
    icon: '🏫',
    titleNl: 'Een oudergesprek op school',
    titleAr: 'لقاء الأهل مع المعلّمة',
    contextAr: 'دُعيت إلى لقاء قصير مع معلّمة ابنتك ياسمين في المدرسة الابتدائية.',
    turns: [
      {
        speaker: 'Leerkracht',
        nl: 'Fijn dat u er bent. Hoe gaat het thuis met Yasmin?',
        ar: 'يسعدني حضورك. كيف حال ياسمين في البيت؟',
        choices: [
          { nl: 'Yasmin is acht jaar.', ar: 'ياسمين عمرها ثماني سنوات.', ok: false, whyAr: 'المعلّمة تعرف عمرها؛ هي تسأل عن حالها.' },
          { nl: 'Goed. Ze vertelt vaak over school, maar ze vindt rekenen moeilijk.', ar: 'جيّدة. تحكي كثيرًا عن المدرسة، لكنها تجد الحساب صعبًا.', ok: true, whyAr: 'تجيب وتذكر ملاحظة مفيدة للمعلّمة.' },
          { nl: 'Ik weet niet waar de school is.', ar: 'لا أعرف أين المدرسة.', ok: false, whyAr: 'أنت في المدرسة الآن.' },
        ],
      },
      {
        speaker: 'Leerkracht',
        nl: 'Dat zien wij ook. Ze kan thuis extra oefenen op de computer. Heeft u een laptop?',
        ar: 'نلاحظ ذلك أيضًا. يمكنها أن تتدرّب أكثر في البيت على الحاسوب. هل لديكم حاسوب محمول؟',
        choices: [
          { nl: 'Ja, ze vindt tekenen leuk.', ar: 'نعم، هي تحبّ الرسم.', ok: false, whyAr: 'لا يجيب عن سؤال الحاسوب.' },
          { nl: 'Nee, ze hoeft niet te oefenen.', ar: 'لا، لا تحتاج أن تتدرّب.', ok: false, whyAr: 'يرفض مساعدة تحتاجها ابنتك.' },
          { nl: 'Ja, we hebben een laptop. Welke website kan ze gebruiken?', ar: 'نعم، لدينا حاسوب. أيّ موقع يمكنها أن تستعمل؟', ok: true, whyAr: 'تجيب وتطلب المعلومة التي تحتاجها لتبدأ.' },
        ],
      },
      {
        speaker: 'Leerkracht',
        nl: 'Ik stuur u de inloggegevens via de schoolapp. Heeft u verder nog vragen?',
        ar: 'سأرسل لك بيانات الدخول عبر تطبيق المدرسة. هل لديك أسئلة أخرى؟',
        choices: [
          { nl: 'Ja, wanneer is het volgende oudergesprek?', ar: 'نعم، متى لقاء الأهل القادم؟', ok: true, whyAr: 'سؤال مفيد ومناسب لنهاية اللقاء.' },
          { nl: 'Ja, ik wil graag een afspraak met de huisarts.', ar: 'نعم، أريد موعدًا مع طبيب العائلة.', ok: false, whyAr: 'المدرسة لا تحجز مواعيد الطبيب.' },
          { nl: 'Nee, ik kom morgen niet.', ar: 'لا، لن آتي غدًا.', ok: false, whyAr: 'لا علاقة له بما قالته.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Ze vindt rekenen moeilijk.', ar: 'هي تجد الحساب صعبًا.' },
      { nl: 'Welke website kan ze gebruiken?', ar: 'أيّ موقع يمكنها أن تستعمل؟' },
      { nl: 'Wanneer is het volgende oudergesprek?', ar: 'متى لقاء الأهل القادم؟' },
    ],
  },
  {
    id: 'ziekmelden',
    level: 'B1',
    icon: '🏢',
    titleNl: 'Ziek melden op het werk',
    titleAr: 'إبلاغ المدير بأنّك مريض',
    contextAr: 'استيقظت مريضًا ولن تستطيع العمل اليوم. تتصل بمديرك قبل بداية دوامك.',
    turns: [
      {
        speaker: 'Leidinggevende',
        nl: 'Met Mark de Vries.',
        ar: 'معك مارك دي فريس.',
        choices: [
          { nl: 'Goedemorgen, is dit de huisarts?', ar: 'صباح الخير، هل هذا طبيب العائلة؟', ok: false, whyAr: 'اتصلت بمديرك، وقد قال اسمه للتوّ.' },
          { nl: 'Goedemorgen, ik kom vandaag later, want ik heb geen zin.', ar: 'صباح الخير، سآتي متأخّرًا اليوم لأنّي لا رغبة لي.', ok: false, whyAr: 'غير مهنيّ، وليس سبب اتصالك.' },
          { nl: 'Goedemorgen meneer De Vries, met Fatima. Ik bel om mij ziek te melden.', ar: 'صباح الخير سيّد دي فريس، معك فاطمة. أتصل لأبلغ أنّي مريضة.', ok: true, whyAr: '«zich ziek melden» هي العبارة الرسمية للإبلاغ عن المرض في العمل.' },
        ],
      },
      {
        speaker: 'Leidinggevende',
        nl: 'Vervelend om te horen. Wat is er aan de hand?',
        ar: 'يؤسفني سماع ذلك. ما الذي حدث؟',
        choices: [
          { nl: 'Ik heb griep en hoge koorts. Ik denk dat ik twee of drie dagen thuis blijf.', ar: 'عندي إنفلونزا وحمّى مرتفعة. أظنّ أنّي سأبقى في البيت يومين أو ثلاثة.', ok: true, whyAr: 'تذكر المرض وتقدّر المدّة، فيستطيع المدير أن يخطّط.' },
          { nl: 'Mijn collega\'s zijn ook ziek.', ar: 'زملائي مرضى أيضًا.', ok: false, whyAr: 'لا يجيب عن سؤاله عنك أنت.' },
          { nl: 'Ik heb vandaag een verjaardag.', ar: 'عندي عيد ميلاد اليوم.', ok: false, whyAr: 'هذا ليس مرضًا، ولا سببًا مقبولًا للغياب.' },
        ],
      },
      {
        speaker: 'Leidinggevende',
        nl: 'Kan iemand uw dienst van vanmiddag overnemen?',
        ar: 'هل يستطيع أحد أن يأخذ مناوبتك بعد الظهر؟',
        choices: [
          { nl: 'Nee, dat is niet mijn probleem.', ar: 'لا، هذه ليست مشكلتي.', ok: false, whyAr: 'فظّ؛ الأفضل أن تساعد في إيجاد حلّ.' },
          { nl: 'Ik heb Pieter al gevraagd. Hij kan mijn dienst overnemen.', ar: 'سألت بيتر مسبقًا. يستطيع أن يأخذ مناوبتي.', ok: true, whyAr: 'تُظهر المسؤولية بحلّ جاهز — يقدّره أيّ مدير.' },
          { nl: 'Ja, ik werk vanmiddag.', ar: 'نعم، أعمل بعد الظهر.', ok: false, whyAr: 'يناقض أنّك مريض ولن تعمل.' },
        ],
      },
      {
        speaker: 'Leidinggevende',
        nl: 'Goed. Beterschap, en laat u morgen even weten hoe het gaat?',
        ar: 'حسنًا. أتمنّى لك الشفاء، وهل تخبرني غدًا كيف حالك؟',
        choices: [
          { nl: 'Dat doe ik. Dank u wel.', ar: 'سأفعل. شكرًا جزيلًا.', ok: true, whyAr: 'تعد بما طُلب منك وتشكر.' },
          { nl: 'Beterschap ook voor u.', ar: 'الشفاء لك أيضًا.', ok: false, whyAr: '«Beterschap» تقال للمريض فقط، ومديرك ليس مريضًا.' },
          { nl: 'Nee, morgen heb ik vrij.', ar: 'لا، غدًا عطلتي.', ok: false, whyAr: 'حتى في يوم العطلة يُنتظر أن تُبلغ عن حالتك الصحّية.' },
        ],
      },
    ],
    phrases: [
      { nl: 'Ik bel om mij ziek te melden.', ar: 'أتصل لأبلغ أنّي مريض.' },
      { nl: 'Ik denk dat ik twee dagen thuis blijf.', ar: 'أظنّ أنّي سأبقى في البيت يومين.' },
      { nl: 'Hij kan mijn dienst overnemen.', ar: 'يستطيع أن يأخذ مناوبتي.' },
      { nl: 'Beterschap!', ar: 'أتمنّى لك الشفاء!' },
    ],
  },
]
