import type { ExamReadingItem, ExamListeningItem, ExamWritingItem, ExamSpeakingItem } from '@/store/types'

/**
 * يوزّع موضع الجواب الصحيح بين الخيارات.
 *
 * When questions are written by hand the correct option tends to end up in the
 * same slot over and over, which lets the learner guess by position instead of
 * by reading. This rotates each option list so the correct answer lands on a
 * predictable cycle of positions instead of always the second one.
 *
 * Deterministic on purpose: the shift depends only on the item index and the
 * question index, never on Math.random or the clock. So the order is identical
 * on every device, on every reload and after every service-worker update, and
 * a cached answer can never point at the wrong option.
 */
export function spreadAnswers<Q extends { opts: string[]; correct: number }>(
  questions: Q[],
  salt: number,
): Q[] {
  return questions.map((q, i) => {
    const n = q.opts.length
    if (n < 2) return q
    const target = (i + salt) % n
    const shift = ((q.correct - target) % n + n) % n
    if (shift === 0) return q
    return { ...q, opts: [...q.opts.slice(shift), ...q.opts.slice(0, shift)], correct: target }
  })
}

const RAW_READING: ExamReadingItem[] = [
  {
    id: 'r1',
    title: 'Werken als kassamedewerker bij supermarkt Brons',
    ar: 'العمل ككاسير في سوبر ماركت Brons',
    text: `Supermarkt Brons heeft op dit moment dertien filialen in heel Nederland. Wij zoeken altijd nieuwe collega's die enthousiast en flexibel zijn. Een baan bij Brons is meer dan alleen werk: het is een plek waar je je kunt ontwikkelen, samenwerken met leuke mensen en klanten elke dag blij maken.

Wat doe je als kassamedewerker?
Je staat achter de kassa en helpt klanten bij het afrekenen van hun boodschappen. Daarnaast vul je tussendoor de schappen aan, ruim je opgevouwen tassen op en zorg je ervoor dat het rond de kassa netjes blijft. Je werkt zelden alleen: er is altijd een teamleider in de buurt die je helpt als er iets niet duidelijk is.

Voor wie?
Wij vragen geen specifieke opleiding. Wel is het belangrijk dat je goed Nederlands spreekt, omdat je veel met klanten praat. Je moet minstens zestien jaar zijn. Heb je geen ervaring met een kassa? Geen probleem: in de eerste week krijg je een korte training van onze ervaren collega's.

Werktijden
Onze winkels zijn open van maandag tot en met zondag, van acht uur 's ochtends tot tien uur 's avonds. We zoeken vooral mensen die in het weekend en 's avonds kunnen werken, want dan is het drukker. Je werkt minstens twaalf uur per week en maximaal achtendertig uur. Studenten en scholieren zijn ook van harte welkom; we houden rekening met je rooster.

Wat krijg je terug?
• een salaris volgens de CAO supermarkten;
• vakantiedagen en een eindejaarsuitkering;
• vijftien procent korting op je eigen boodschappen bij Brons;
• gratis koffie en thee tijdens je pauzes;
• de kans om door te groeien naar teamleider als je dat wilt.

Solliciteren?
Ben je geïnteresseerd? Stuur dan vóór 30 juni een korte motivatie en je cv naar werken@brons.nl. Vermeld in je e-mail in welk filiaal je het liefst wilt werken. Binnen twee weken nemen wij contact met je op. Bij vragen kun je bellen met onze afdeling Personeelszaken: 020 - 314 9988.`,
    questions: [
      { q: 'Wat is volgens de tekst NIET een taak van een kassamedewerker bij Brons?', ar: 'ما الذي ليس من مهام الكاسير حسب النصّ؟', opts: ['Klanten helpen bij het afrekenen','Schappen tussendoor aanvullen','Het rond de kassa netjes houden','De prijzen van producten bepalen'], correct: 3, why: 'النصّ يذكر الدفع وتعبئة الرفوف والترتيب، لكنه لا يذكر تحديد الأسعار — هذه مهمّة الإدارة.' },
      { q: 'Wat is een voorwaarde om bij Brons te werken?', ar: 'ما الشرط الواجب للعمل في Brons؟', opts: ['Je moet minstens een mbo-diploma hebben','Je moet goed Nederlands kunnen spreken','Je moet eerder ervaring met een kassa hebben','Je moet vol-tijd beschikbaar zijn'], correct: 1, why: 'النصّ يقول صراحةً: "je goed Nederlands spreekt" — لا يُشترط شهادة ولا خبرة سابقة ولا دوام كامل.' },
      { q: 'Wanneer is de supermarkt het drukst, volgens de tekst?', ar: 'متى يكون السوبر ماركت أكثر ازدحامًا؟', opts: ['Op maandagochtend','In het weekend en \'s avonds','Tijdens schoolvakanties','Op werkdagen tussen 10 en 14 uur'], correct: 1, why: 'يُذكر أنّ المتجر يبحث عن عمّال للويكند والمساء "want dan is het drukker".' },
      { q: 'Hoeveel korting krijg je op je eigen boodschappen?', ar: 'كم نسبة الخصم على مشترياتك الشخصية؟', opts: ['Vijf procent','Tien procent','Vijftien procent','Twintig procent'], correct: 2, why: 'النصّ يذكر "vijftien procent korting" بشكل مباشر.' },
      { q: 'Wat moet je doen om te solliciteren?', ar: 'ماذا يجب أن تفعل لتتقدّم للوظيفة؟', opts: ['Langsgaan in het filiaal van je keuze','Een e-mail met motivatie en cv sturen naar werken@brons.nl','Bellen naar Personeelszaken voor een afspraak','Het sollicitatieformulier op de website invullen'], correct: 1, why: '"Stuur dan vóór 30 juni een korte motivatie en je cv naar werken@brons.nl" — هذه هي الطريقة المحدّدة.' },
      { q: 'Wat is de hoofdboodschap van de tekst?', ar: 'ما الفكرة الرئيسية للنصّ؟', opts: ['Een waarschuwing voor slechte werkomstandigheden in supermarkten','Een vacature met informatie over werk, voorwaarden en sollicitatie','Een uitleg over het openingsbeleid van Brons','Een vergelijking tussen verschillende supermarkten'], correct: 1, why: 'النصّ هو إعلان وظيفة شامل: المهام، الشروط، الفوائد، وطريقة التقديم.' },
    ],
  },
  {
    id: 'r2',
    title: 'Het belang van voldoende slaap voor volwassenen',
    ar: 'أهمية النوم الكافي للبالغين',
    text: `Veel Nederlanders slapen te kort. Uit onderzoek van het Centraal Bureau voor de Statistiek bleek vorig jaar dat bijna een op de vijf volwassenen minder dan zes uur per nacht slaapt. Dat is zorgwekkend, want artsen raden minimaal zeven tot negen uur slaap aan. Wie structureel te weinig slaapt, loopt op de lange termijn meer risico op gezondheidsproblemen zoals hart- en vaatziekten, overgewicht en geheugenproblemen.

Waarom slapen we eigenlijk?
Tijdens de slaap herstelt het lichaam zich. Spieren ontspannen, het immuunsysteem wordt sterker en de hersenen verwerken de informatie van overdag. Daarom voelen we ons na een goede nacht uitgerust en kunnen we ons beter concentreren. Wie slecht slaapt, merkt vaak dat hij prikkelbaar is en moeite heeft met eenvoudige beslissingen.

De rol van schermen
Een belangrijke oorzaak van slaapproblemen is het gebruik van telefoons en computers vlak voor het slapengaan. Het blauwe licht van die schermen zorgt ervoor dat de hersenen minder van het slaaphormoon melatonine aanmaken. Daardoor val je later in slaap. Deskundigen adviseren om minstens een uur voor het slapengaan geen scherm meer te gebruiken.

Wat kun je zelf doen?
Een vast slaapritme helpt enorm. Probeer iedere dag rond hetzelfde tijdstip naar bed te gaan en op te staan, ook in het weekend. Een donkere, koele slaapkamer maakt het makkelijker om door te slapen. Zware maaltijden en koffie na het avondeten zijn af te raden. Wie regelmatig sport, slaapt over het algemeen dieper – maar liever niet vlak voor het slapengaan, omdat je lichaam dan juist actiever wordt.

Wanneer naar de huisarts?
Soms helpen tips niet meer. Als je langer dan drie weken niet goed slaapt en daar overdag duidelijk last van hebt, is het verstandig om naar de huisarts te gaan. Die kan kijken of er een medische oorzaak is en je eventueel doorverwijzen naar een slaapdeskundige. Slaapmiddelen worden alleen bij hoge uitzondering voorgeschreven, omdat ze het probleem zelden oplossen.`,
    questions: [
      { q: 'Hoeveel uur slaap raden artsen volwassenen minimaal aan?', ar: 'كم ساعة نوم ينصح بها الأطباء على الأقل؟', opts: ['Vijf tot zeven uur','Zes tot acht uur','Zeven tot negen uur','Negen tot elf uur'], correct: 2, why: '"artsen raden minimaal zeven tot negen uur slaap aan".' },
      { q: 'Waarom is slaap belangrijk voor de hersenen?', ar: 'لماذا النوم مهم للدماغ؟', opts: ['De hersenen groeien dan','De hersenen verwerken de informatie van overdag','De hersenen rusten volledig uit en doen niets','De hersenen produceren extra zuurstof'], correct: 1, why: 'النصّ: "de hersenen verwerken de informatie van overdag".' },
      { q: 'Wat is het effect van blauw licht van schermen?', ar: 'ما تأثير الضوء الأزرق من الشاشات؟', opts: ['Het maakt de ogen vermoeider','Het zorgt voor minder aanmaak van melatonine','Het verstoort het immuunsysteem','Het verhoogt de lichaamstemperatuur'], correct: 1, why: '"Het blauwe licht ... zorgt ervoor dat de hersenen minder van het slaaphormoon melatonine aanmaken".' },
      { q: 'Welke tip wordt NIET in de tekst gegeven?', ar: 'أي نصيحة لم تُذكر في النصّ؟', opts: ['Iedere dag rond hetzelfde tijdstip naar bed gaan','Een donkere, koele slaapkamer','Voor het slapen warme melk met honing drinken','Geen koffie na het avondeten'], correct: 2, why: 'النصّ يذكر النصائح الأولى والثانية والرابعة، لكنه لا يذكر الحليب الدافئ بالعسل.' },
      { q: 'Wanneer adviseert de tekst om naar de huisarts te gaan?', ar: 'متى ينصح النص بزيارة الطبيب؟', opts: ['Direct na de eerste slechte nacht','Als je één week slecht slaapt','Als je langer dan drie weken niet goed slaapt en daar overdag last van hebt','Alleen als je slaapmiddelen nodig hebt'], correct: 2, why: '"Als je langer dan drie weken niet goed slaapt en daar overdag duidelijk last van hebt".' },
      { q: 'Wat is volgens de tekst de houding van artsen tegenover slaapmiddelen?', ar: 'ما موقف الأطباء من حبوب النوم حسب النصّ؟', opts: ['Zij schrijven die snel voor als eerste hulp','Zij schrijven die alleen bij hoge uitzondering voor','Zij verbieden die volledig','Zij raden die juist sterk aan'], correct: 1, why: '"Slaapmiddelen worden alleen bij hoge uitzondering voorgeschreven".' },
    ],
  },
  {
    id: 'r3',
    title: 'Nieuw fietspad langs het kanaal',
    ar: 'مسار درّاجات جديد بمحاذاة القناة',
    text: `In de gemeente Westerveld komt eindelijk een nieuw, breder fietspad langs het Twentekanaal. Het college van burgemeester en wethouders heeft het bouwplan deze week officieel goedgekeurd. De werkzaamheden beginnen na de zomervakantie en zullen volgens de planning ongeveer acht maanden duren.

Het bestaande pad is in slechte staat: het asfalt vertoont op veel plekken scheuren en in de winter ontstaan er gevaarlijke gladde stukken. Bovendien is het pad slechts één meter zeventig breed, waardoor fietsers elkaar moeilijk kunnen passeren. Vooral op zonnige dagen, wanneer veel mensen recreatief fietsen, leidt dat tot bijna-ongelukken.

Het nieuwe pad wordt drie meter breed en krijgt aan beide kanten een witte rand, zodat ook bij schemering goed te zien is waar het pad eindigt. Verder komen er om de honderd meter ledverlichting en op zes plaatsen bankjes met een mooie blik op het water. Een woordvoerder van de gemeente legde uit: "We willen niet alleen een veilig pad, maar ook een plek waar mensen graag verblijven."

Niet alle inwoners zijn blij. Een groep boeren in de buurt vreest dat er bomen gekapt worden om plaats te maken voor het bredere pad. De gemeente heeft echter beloofd dat er slechts vier oude essen moeten verdwijnen, en dat daarvoor twintig nieuwe bomen worden geplant op andere locaties langs het kanaal.

De kosten worden geschat op ruim twee miljoen euro. Ongeveer zestig procent komt van de provincie Overijssel, de rest betaalt de gemeente zelf uit het budget voor verkeersveiligheid. Wie meer wil weten over het project, kan op woensdag 12 september naar een informatieavond in het gemeentehuis komen. Aanmelden is niet nodig.`,
    questions: [
      { q: 'Wat is het belangrijkste probleem met het huidige fietspad?', ar: 'ما المشكلة الرئيسية في المسار الحالي؟', opts: ['Het is te kort','Het is in slechte staat en te smal','Het ligt te ver van het water','Het heeft geen verlichting'], correct: 1, why: 'يُذكر أنّ الأسفلت متشقّق والعرض 1.7م فقط فلا يستطيع الراكبون التجاوز.' },
      { q: 'Hoe breed wordt het nieuwe fietspad?', ar: 'كم عرض المسار الجديد؟', opts: ['1,70 meter','2 meter','3 meter','5 meter'], correct: 2, why: '"Het nieuwe pad wordt drie meter breed".' },
      { q: 'Waarom zijn sommige boeren ontevreden?', ar: 'لماذا بعض المزارعين غير راضين؟', opts: ['Ze moeten meebetalen aan het project','Ze vrezen dat er bomen gekapt worden','Ze willen helemaal geen fietspad','Ze krijgen minder grond toegewezen'], correct: 1, why: '"vreest dat er bomen gekapt worden".' },
      { q: 'Hoe reageert de gemeente op die zorg?', ar: 'كيف ترد البلدية على هذا القلق؟', opts: ['Met de belofte om twintig nieuwe bomen te planten voor vier gekapte essen','Met de toezegging dat er helemaal geen bomen verdwijnen','Met een schadevergoeding aan de boeren','Door het plan te annuleren'], correct: 0, why: 'النصّ يذكر بالضبط 4 أشجار تُقطع مقابل 20 شجرة جديدة.' },
      { q: 'Wie betaalt het grootste deel van de kosten?', ar: 'من يدفع الجزء الأكبر من التكاليف؟', opts: ['De gemeente Westerveld','De boeren langs het kanaal','De provincie Overijssel','Een particuliere sponsor'], correct: 2, why: '"Ongeveer zestig procent komt van de provincie Overijssel".' },
      { q: 'Wat moet je doen als je naar de informatieavond wilt komen?', ar: 'ماذا تفعل إذا أردت حضور الجلسة الإعلامية؟', opts: ['Vooraf een ticket kopen','Je aanmelden bij de gemeente','Niets — aanmelden is niet nodig','Een uitnodiging vragen aan de wethouder'], correct: 2, why: '"Aanmelden is niet nodig" — حرفيًا في النصّ.' },
    ],
  },
  {
    id: 'r4',
    title: 'Inschrijven voor een sociale huurwoning',
    ar: 'التسجيل للحصول على سكن اجتماعي',
    text: `Wie in Nederland een betaalbare huurwoning zoekt, komt al snel terecht bij de sociale huursector. Een sociale huurwoning is een woning met een huur onder een bepaalde grens. Deze woningen worden verhuurd door woningcorporaties en zijn bedoeld voor mensen met een laag of middeninkomen.

Inschrijven
De eerste stap is inschrijven bij het regionale woningsysteem. Dat kan online en kost meestal tussen de tien en twintig euro per jaar. Let op: u moet uw inschrijving ieder jaar verlengen. Vergeet u dat, dan vervalt uw inschrijfduur en begint u weer bij nul. Juist die inschrijfduur is belangrijk, want in veel gemeenten gaat een woning naar de kandidaat die het langst staat ingeschreven.

Reageren op een woning
Zodra u ingeschreven bent, kunt u wekelijks reageren op woningen die vrijkomen. U ziet daarna op welke plaats u staat. Staat u bijvoorbeeld op plek honderdveertig, dan is de kans klein dat u wordt uitgenodigd. Toch is reageren nooit zinloos: sommige kandidaten trekken zich terug of blijken niet aan de voorwaarden te voldoen, waardoor de lijst opschuift.

Voorwaarden
Naast inschrijfduur telt ook uw inkomen. Corporaties moeten een groot deel van hun woningen toewijzen aan huishoudens onder een inkomensgrens. Verdient u meer, dan komt u voor die woningen niet in aanmerking, maar mogelijk wel voor een woning in de vrije sector. Verder kijkt de corporatie naar de grootte van uw huishouden: een woning met drie slaapkamers gaat zelden naar iemand die alleen woont.

Voorrang
In bijzondere situaties kunt u voorrang krijgen, bijvoorbeeld bij ernstige medische problemen of wanneer uw woning wordt gesloopt. U moet die voorrang wel zelf aanvragen en met documenten onderbouwen. Een aanvraag zonder bewijsstukken wordt vrijwel altijd afgewezen.

Wachttijd
Houd rekening met een lange wachttijd. In de grote steden wachten mensen gemiddeld zeven tot tien jaar; in kleinere gemeenten gaat het vaak sneller. Wie snel woonruimte nodig heeft, kan intussen kijken naar tijdelijke verhuur of een kamer. Gratis advies en hulp bij het inschrijven krijgt u bij het Woonloket van uw gemeente.`,
    questions: [
      { q: 'Wat is volgens de tekst de eerste stap?', ar: 'ما الخطوة الأولى حسب النصّ؟', opts: ['Een woning uitzoeken en bezichtigen','Zich inschrijven bij het regionale woningsysteem','Voorrang aanvragen bij de gemeente','Een makelaar inschakelen'], correct: 1, why: 'النصّ: "De eerste stap is inschrijven bij het regionale woningsysteem".' },
      { q: 'Wat gebeurt er als u uw inschrijving niet ieder jaar verlengt?', ar: 'ماذا يحدث إن لم تجدّد تسجيلك سنويًا؟', opts: ['U betaalt een boete','Uw inschrijfduur vervalt en u begint weer bij nul','U komt onder aan de lijst maar behoudt uw jaren','Er gebeurt niets, de verlenging is automatisch'], correct: 1, why: '"dan vervalt uw inschrijfduur en begint u weer bij nul".' },
      { q: 'Waarom is reageren toch nuttig als u op een hoge plaats staat?', ar: 'لماذا يبقى التقديم مفيدًا رغم ترتيبك المتأخّر؟', opts: ['Omdat de corporatie dan uw inschrijfduur verlengt','Omdat kandidaten zich terugtrekken of niet aan de voorwaarden voldoen','Omdat u dan korting krijgt op de huur','Omdat u dan voorrang krijgt'], correct: 1, why: 'النصّ يوضّح أنّ بعض المتقدّمين ينسحبون أو لا تنطبق عليهم الشروط، فتتقدّم القائمة.' },
      { q: 'Waar kijkt de corporatie naast inschrijfduur nog meer naar?', ar: 'إلى أي شيء آخر تنظر الجمعية السكنية؟', opts: ['Naar uw leeftijd en nationaliteit','Naar uw inkomen en de grootte van uw huishouden','Naar uw beroep en opleiding','Naar het aantal keren dat u gereageerd heeft'], correct: 1, why: 'الفقرة تذكر الدخل وحجم الأسرة صراحةً.' },
      { q: 'Wat is nodig om voorrang te krijgen?', ar: 'ما المطلوب للحصول على الأولوية؟', opts: ['Alleen een telefoontje naar de corporatie','De voorrang zelf aanvragen en met documenten onderbouwen','Minstens vijf jaar ingeschreven staan','Een verklaring van uw werkgever'], correct: 1, why: '"U moet die voorrang wel zelf aanvragen en met documenten onderbouwen".' },
      { q: 'Wat zegt de tekst over de wachttijd in de grote steden?', ar: 'ماذا يقول النصّ عن مدّة الانتظار في المدن الكبيرة؟', opts: ['Ongeveer twee jaar','Ongeveer vijf jaar','Gemiddeld zeven tot tien jaar','Meer dan vijftien jaar'], correct: 2, why: '"In de grote steden wachten mensen gemiddeld zeven tot tien jaar".' },
    ],
  },
  {
    id: 'r5',
    title: 'Vrijwilligers gezocht voor buurthuis De Brug',
    ar: 'مطلوب متطوّعون لمركز الحي «De Brug»',
    text: `Buurthuis De Brug in de wijk Oostpoort bestaat dit jaar vijftien jaar. Iedere week komen hier ruim driehonderd bewoners langs voor een kop koffie, een cursus of gewoon een praatje. Dat alles kan alleen doorgaan dankzij vrijwilligers. Op dit moment zoeken wij dringend nieuwe mensen, want vier van onze vaste vrijwilligers stoppen deze zomer.

Welk werk is er?
Er is voor ieder wat wils. In het café helpt u met het zetten van koffie en het opruimen van de zaal. Bij de huiswerkbegeleiding ondersteunt u kinderen van acht tot twaalf jaar. Handig met de computer? Dan kunt u bewoners helpen die moeite hebben met het invullen van digitale formulieren. En bij de wekelijkse taaltafel praat u een uur lang Nederlands met mensen die de taal nog aan het leren zijn.

Hoeveel tijd kost het?
Wij vragen minimaal één dagdeel per week, dus ongeveer vier uur. Meer mag natuurlijk ook. Wie in de schoolvakanties niet kan, geeft dat vooraf door; daar houden wij rekening mee. Een vaste dag is prettig voor de bezoekers, omdat zij dan weten wanneer u er bent.

Wat krijgt u ervoor terug?
Vrijwilligerswerk is onbetaald, maar u krijgt wel uw reiskosten vergoed en tijdens uw dienst zijn koffie en thee gratis. Twee keer per jaar organiseren wij een uitje voor alle vrijwilligers. Belangrijker nog: veel vrijwilligers vertellen dat zij door dit werk sneller Nederlands leren en makkelijker mensen leren kennen in de buurt. Voor wie later betaald werk zoekt, is de ervaring bovendien goed voor het cv.

Voorwaarden
U bent achttien jaar of ouder. Voor het werk met kinderen vragen wij een Verklaring Omtrent het Gedrag; die vraagt u aan bij de gemeente en wij betalen de kosten. Nederlands op niveau A2 is voldoende voor het cafewerk; voor de taaltafel is niveau B1 gewenst.

Aanmelden
Loop gerust een keer binnen op dinsdag of donderdag tussen tien en twaalf uur, of stuur een mail naar vrijwilligers@debrug-oostpoort.nl. Coordinator Fatima Aydin belt u dan binnen een week terug voor een kort kennismakingsgesprek. Ervaring is niet nodig, motivatie wel.`,
    questions: [
      { q: 'Waarom zoekt het buurthuis nu nieuwe vrijwilligers?', ar: 'لماذا يبحث المركز عن متطوّعين الآن؟', opts: ['Het buurthuis gaat uitbreiden','Vier vaste vrijwilligers stoppen deze zomer','Er komen meer bezoekers dan vorig jaar','De gemeente eist meer personeel'], correct: 1, why: '"vier van onze vaste vrijwilligers stoppen deze zomer".' },
      { q: 'Hoeveel tijd vraagt het buurthuis minimaal?', ar: 'ما الحدّ الأدنى للوقت المطلوب؟', opts: ['Twee uur per maand','Een dagdeel per week, ongeveer vier uur','Twee volledige dagen per week','Iedere dag een uur'], correct: 1, why: '"minimaal een dagdeel per week, dus ongeveer vier uur".' },
      { q: 'Wat krijgen vrijwilligers volgens de tekst NIET?', ar: 'ما الذي لا يحصل عليه المتطوّع حسب النصّ؟', opts: ['Een vergoeding voor reiskosten','Gratis koffie en thee tijdens de dienst','Een salaris','Twee uitjes per jaar'], correct: 2, why: 'النصّ يقول صراحةً "Vrijwilligerswerk is onbetaald" ثم يذكر بقية المزايا.' },
      { q: 'Wat is nodig om met kinderen te mogen werken?', ar: 'ما المطلوب للعمل مع الأطفال؟', opts: ['Een diploma pedagogiek','Een Verklaring Omtrent het Gedrag','Minstens een jaar ervaring','Niveau B2 Nederlands'], correct: 1, why: 'النصّ يشترط شهادة حسن السيرة، ويذكر أنّ المركز يتحمّل تكلفتها.' },
      { q: 'Welk taalniveau is gewenst voor de taaltafel?', ar: 'ما المستوى اللغوي المطلوب لطاولة اللغة؟', opts: ['A1','A2','B1','B2'], correct: 2, why: '"voor de taaltafel is niveau B1 gewenst".' },
      { q: 'Hoe kunt u zich aanmelden?', ar: 'كيف يمكنك التسجيل؟', opts: ['Alleen schriftelijk per post','Binnenlopen op dinsdag of donderdag, of een mail sturen','Via een formulier bij de gemeente','Door het inleveren van een cv bij de balie'], correct: 1, why: 'الفقرة الأخيرة تذكر الزيارة الثلاثاء أو الخميس أو إرسال بريد إلكتروني.' },
    ],
  },
  {
    id: 'r6',
    title: 'Het eigen risico: wat betaalt u zelf?',
    ar: 'التحمّل الذاتي في التأمين الصحّي: ما الذي تدفعه بنفسك؟',
    text: `Iedereen die in Nederland woont of werkt, is verplicht een basisverzekering af te sluiten. Die verzekering dekt de belangrijkste zorg: de huisarts, het ziekenhuis, de meeste medicijnen en de spoedeisende hulp. Toch krijgen veel mensen aan het begin van het jaar onverwacht een rekening. De oorzaak is bijna altijd hetzelfde: het eigen risico.

Wat is het eigen risico?
Het eigen risico is het bedrag dat u ieder jaar eerst zelf betaalt voordat de verzekering de kosten overneemt. De hoogte ervan wordt niet door uw verzekeraar bepaald, maar ieder jaar door de regering vastgesteld. Het bedrag is dus bij alle verzekeraars gelijk. Gebruikt u in een jaar helemaal geen zorg, dan betaalt u niets extra.

Wat valt er wel en niet onder?
Dit is het punt waarop veel verzekerden zich vergissen. Een bezoek aan de huisarts valt niet onder het eigen risico; die zorg is voor u kosteloos, hoe vaak u ook gaat. Maar stuurt de huisarts u door naar het ziekenhuis, of schrijft hij bloedonderzoek voor, dan tellen die kosten wel mee. Ook medicijnen van de apotheek en vervoer per ambulance vallen eronder. Verloskundige zorg en kraamzorg zijn daarentegen vrijgesteld, net als de meeste zorg voor kinderen tot achttien jaar.

Vrijwillig eigen risico
U kunt ervoor kiezen uw eigen risico vrijwillig te verhogen. In ruil daarvoor betaalt u iedere maand een lagere premie. Dat lijkt aantrekkelijk, maar het is alleen verstandig als u weinig zorg gebruikt en genoeg spaargeld heeft. Wordt u onverwacht ziek, dan kan de rekening hoog oplopen.

Betalen in termijnen
Kunt u het bedrag niet in een keer betalen? Neem dan zelf contact op met uw verzekeraar. Vrijwel alle verzekeraars bieden de mogelijkheid om in maandelijkse termijnen te betalen, soms zelfs gespreid over het hele jaar. Wacht niet tot u een aanmaning ontvangt, want dan komen er extra kosten bij. Wie structureel moeite heeft met de premie, kan bij de gemeente vragen naar een collectieve zorgverzekering voor mensen met een laag inkomen.`,
    questions: [
      { q: 'Wie bepaalt de hoogte van het eigen risico?', ar: 'من يحدّد قيمة التحمّل الذاتي؟', opts: ['Uw eigen verzekeraar','De regering','De huisarts','De gemeente'], correct: 1, why: '"wordt ... ieder jaar door de regering vastgesteld" — لذلك المبلغ واحد عند كل شركات التأمين.' },
      { q: 'Welke zorg valt NIET onder het eigen risico?', ar: 'أيّ رعاية لا تخضع للتحمّل الذاتي؟', opts: ['Een bezoek aan de huisarts','Medicijnen van de apotheek','Bloedonderzoek in het ziekenhuis','Vervoer per ambulance'], correct: 0, why: 'النصّ: زيارة طبيب العائلة مجانية مهما تكرّرت، أمّا الباقي فيُحتسب.' },
      { q: 'Wat gebeurt er als u in een jaar geen zorg gebruikt?', ar: 'ماذا يحدث إن لم تستخدم أي رعاية خلال السنة؟', opts: ['U krijgt het eigen risico terugbetaald','U betaalt niets extra','U krijgt korting op de premie van volgend jaar','U moet het bedrag alsnog betalen'], correct: 1, why: '"Gebruikt u in een jaar helemaal geen zorg, dan betaalt u niets extra".' },
      { q: 'Wat is het voordeel van een vrijwillig hoger eigen risico?', ar: 'ما فائدة رفع التحمّل الذاتي طوعًا؟', opts: ['Een lagere maandelijkse premie','Een ruimere dekking','Snellere behandeling in het ziekenhuis','Gratis medicijnen'], correct: 0, why: '"In ruil daarvoor betaalt u iedere maand een lagere premie".' },
      { q: 'Voor wie is een vrijwillig hoger eigen risico volgens de tekst verstandig?', ar: 'لمن يكون هذا الخيار حكيمًا حسب النصّ؟', opts: ['Voor iedereen die wil besparen','Voor mensen die weinig zorg gebruiken en genoeg spaargeld hebben','Voor gezinnen met jonge kinderen','Voor mensen met een chronische ziekte'], correct: 1, why: 'النصّ يقيّده بمن يستخدم الرعاية قليلًا ولديه مدّخرات كافية.' },
      { q: 'Wat adviseert de tekst als u het bedrag niet in een keer kunt betalen?', ar: 'بماذا ينصح النصّ إن عجزت عن الدفع دفعة واحدة؟', opts: ['Wachten op de aanmaning','Zelf contact opnemen met uw verzekeraar','Van verzekeraar wisselen','Een lening afsluiten bij de bank'], correct: 1, why: 'النصّ ينصح بالمبادرة قبل وصول الإنذار، لأنّ الإنذار يضيف تكاليف.' },
    ],
  },
  {
    id: 'r7',
    title: 'Uitnodiging voor de rapportgesprekken',
    ar: 'دعوة إلى جلسات مناقشة تقرير الطفل',
    text: `Beste ouders en verzorgers,

Over drie weken krijgen de kinderen hun tweede rapport mee naar huis. Zoals ieder jaar nodigen wij u daarna uit voor een persoonlijk gesprek met de leerkracht van uw kind. Hieronder leest u de belangrijkste informatie.

Wanneer
De gesprekken vinden plaats op maandag 17 en woensdag 19 maart, telkens tussen half vier en acht uur 's avonds. Ieder gesprek duurt tien minuten. Dat is kort, daarom vragen wij u op tijd aanwezig te zijn; komt u later, dan gaat die tijd van uw eigen gesprek af.

Inschrijven
U schrijft zich in via het ouderportaal. Vanaf maandag 3 maart, negen uur 's ochtends, staan alle tijden open. Kiest u een moment dat u schikt. Lukt inschrijven via internet niet, belt u dan gerust naar de administratie; wij plannen het gesprek dan samen in. Heeft u meerdere kinderen bij ons op school, probeer dan de gesprekken achter elkaar te plannen, zodat u niet twee keer hoeft te komen.

Waar gaat het gesprek over
De leerkracht bespreekt met u hoe het met uw kind gaat, zowel op het gebied van rekenen en taal als in de omgang met andere kinderen. U hoort ook waar uw kind extra hulp bij krijgt. Wij vinden het belangrijk dat u zelf ook vragen stelt. Denkt u van tevoren na over wat u wilt weten en schrijf uw vragen op; tien minuten zijn zo voorbij.

Taal
Vindt u het lastig om het gesprek in het Nederlands te voeren? Geef dat bij de inschrijving aan. De school kan kosteloos een tolk regelen, maar wij hebben daarvoor wel minstens een week de tijd nodig. Uw kind zelf laten vertalen raden wij af, omdat sommige onderwerpen voor een kind te moeilijk of te gevoelig zijn.

Kunt u niet
Bent u op beide avonden verhinderd, laat het ons dan weten via de administratie. Wij zoeken dan een ander moment, eventueel telefonisch. Wij vinden het belangrijk dat wij iedere ouder een keer per jaar spreken.

Met vriendelijke groet,
Team basisschool De Vlieger`,
    questions: [
      { q: 'Hoe lang duurt een gesprek?', ar: 'كم تستغرق الجلسة؟', opts: ['Vijf minuten','Tien minuten','Twintig minuten','Een half uur'], correct: 1, why: '"Ieder gesprek duurt tien minuten".' },
      { q: 'Wat gebeurt er als u te laat komt?', ar: 'ماذا يحدث إن تأخّرت؟', opts: ['Het gesprek wordt verzet naar een andere dag','Die tijd gaat van uw eigen gesprek af','U moet opnieuw inschrijven','De leerkracht belt u later op'], correct: 1, why: '"komt u later, dan gaat die tijd van uw eigen gesprek af".' },
      { q: 'Wat kunt u doen als inschrijven via internet niet lukt?', ar: 'ماذا تفعل إذا تعذّر التسجيل عبر الإنترنت؟', opts: ['Wachten tot de school u belt','Bellen naar de administratie','Naar school komen op de dag zelf','Een mail sturen naar de leerkracht'], correct: 1, why: 'النصّ يعرض الاتّصال بالإدارة لتحديد الموعد معًا.' },
      { q: 'Wat adviseert de school om het korte gesprek nuttig te maken?', ar: 'بماذا تنصح المدرسة لتستفيد من الوقت القصير؟', opts: ['Het rapport thuis eerst doorlezen','Uw vragen van tevoren opschrijven','Samen met een andere ouder komen','Het gesprek opnemen'], correct: 1, why: '"Denkt u van tevoren na over wat u wilt weten en schrijf uw vragen op".' },
      { q: 'Wat zegt de school over een tolk?', ar: 'ماذا تقول المدرسة عن المترجم؟', opts: ['De ouders betalen de tolk zelf','De school regelt kosteloos een tolk, maar heeft minstens een week nodig','Een tolk is alleen mogelijk bij het eerste rapport','Tolken zijn niet toegestaan'], correct: 1, why: 'النصّ: الترجمة مجانية لكنها تحتاج أسبوعًا على الأقل من المهلة.' },
      { q: 'Waarom raadt de school af om het kind te laten vertalen?', ar: 'لماذا ترفض المدرسة أن يترجم الطفل؟', opts: ['Omdat het kind de taal niet goed genoeg kent','Omdat sommige onderwerpen te moeilijk of te gevoelig zijn voor een kind','Omdat het gesprek dan te lang duurt','Omdat de leerkracht het kind niet wil zien'], correct: 1, why: 'التبرير في النصّ يتعلّق بصعوبة الموضوعات وحساسيّتها بالنسبة للطفل.' },
    ],
  },
  {
    id: 'r8',
    title: 'Nieuwe regels voor het scheiden van afval',
    ar: 'قواعد جديدة لفرز النفايات',
    text: `Vanaf 1 oktober verandert er het een en ander in de manier waarop inwoners van onze gemeente hun afval aanbieden. Het doel is duidelijk: minder restafval en meer grondstoffen die opnieuw gebruikt kunnen worden. Op dit moment bestaat nog altijd bijna de helft van de grijze container uit materiaal dat prima gescheiden had kunnen worden.

Wat verandert er
De grijze container voor restafval wordt voortaan nog maar een keer per vier weken geleegd, in plaats van iedere twee weken. De groene container voor groente-, fruit- en tuinafval blijft wekelijks aan de beurt. Papier en karton worden, net als nu, iedere maand opgehaald. Nieuw is dat verpakkingen van plastic, metaal en drankkartons niet langer in een aparte zak op straat mogen, maar in een oranje container die u gratis bij de gemeente kunt aanvragen.

Waarom deze keuze
Door restafval minder vaak op te halen, gaan mensen beter nadenken over wat zij weggooien. In gemeenten die deze aanpak al eerder invoerden, daalde de hoeveelheid restafval met gemiddeld dertig procent. Bovendien scheelt het brandstof, omdat de vuilniswagens minder ritten hoeven te maken.

Wat als de container vol is
Past uw restafval niet meer in de container? Dan kunt u een extra zak inleveren bij een van de zes ondergrondse verzamelpunten in de gemeente. Daarvoor gebruikt u uw afvalpas. De eerste tien zakken per jaar zijn gratis, daarna betaalt u twee euro per zak. Grof afval, zoals oude meubels en matrassen, brengt u naar de milieustraat aan de Havenweg. Die is open van dinsdag tot en met zaterdag.

Hulp nodig
Bewoners van hoogbouw en mensen die door een lichamelijke beperking hun container niet kunnen verplaatsen, kunnen een uitzondering aanvragen. Neem daarvoor contact op met het serviceteam. Ook een nieuwe afvalkalender is aan te vragen; die krijgt u dan per post thuisgestuurd. Wie liever digitaal werkt, vindt alle ophaaldagen in de afvalapp.`,
    questions: [
      { q: 'Hoe vaak wordt de grijze container vanaf oktober geleegd?', ar: 'كم مرّة تُفرَّغ الحاوية الرمادية بدءًا من أكتوبر؟', opts: ['Iedere week','Iedere twee weken','Iedere vier weken','Iedere maand op afspraak'], correct: 2, why: '"nog maar een keer per vier weken ... in plaats van iedere twee weken".' },
      { q: 'Wat is nieuw voor plastic, metaal en drankkartons?', ar: 'ما الجديد بشأن البلاستيك والمعادن وعبوات المشروبات؟', opts: ['Ze mogen bij het restafval','Ze gaan in een oranje container in plaats van een zak op straat','Ze worden niet meer opgehaald','Ze moeten naar de milieustraat'], correct: 1, why: 'النصّ يذكر الانتقال من الأكياس على الرصيف إلى حاوية برتقالية مجانية.' },
      { q: 'Wat was in andere gemeenten het resultaat van deze aanpak?', ar: 'ما نتيجة هذا الأسلوب في بلديات أخرى؟', opts: ['Meer klachten van bewoners','Gemiddeld dertig procent minder restafval','Hogere kosten voor de gemeente','Geen meetbaar verschil'], correct: 1, why: '"daalde de hoeveelheid restafval met gemiddeld dertig procent".' },
      { q: 'Wat kost een extra zak restafval?', ar: 'كم يكلّف الكيس الإضافي؟', opts: ['Altijd twee euro','De eerste tien zakken per jaar zijn gratis, daarna twee euro','Vijf euro per zak','Extra zakken zijn niet toegestaan'], correct: 1, why: 'النصّ يذكر مجانيّة أول عشرة أكياس سنويًا ثم يورو اثنان للكيس.' },
      { q: 'Waar brengt u oude meubels naartoe?', ar: 'أين تأخذ الأثاث القديم؟', opts: ['Naar een ondergronds verzamelpunt','Naar de milieustraat aan de Havenweg','In de oranje container','Aan de straat op de ophaaldag'], correct: 1, why: '"Grof afval, zoals oude meubels en matrassen, brengt u naar de milieustraat".' },
      { q: 'Wie kan een uitzondering aanvragen?', ar: 'من يستطيع طلب استثناء؟', opts: ['Iedereen die dat wil','Bewoners van hoogbouw en mensen met een lichamelijke beperking','Alleen gezinnen met kinderen','Alleen mensen zonder afvalpas'], correct: 1, why: 'النصّ يحصر الاستثناء بسكّان الأبراج وذوي الإعاقة الجسدية.' },
    ],
  },
  {
    id: 'r9',
    title: 'Zaken regelen met DigiD',
    ar: 'إنجاز المعاملات باستخدام DigiD',
    text: `Steeds meer zaken met de overheid regelt u tegenwoordig via internet. Om te bewijzen dat u werkelijk bent wie u zegt te zijn, gebruikt u DigiD. U kunt het vergelijken met een digitaal identiteitsbewijs: een gebruikersnaam en wachtwoord waarmee de overheid u herkent.

Waarvoor gebruikt u het
Met DigiD logt u in bij de Belastingdienst om uw aangifte te doen, bij uw gemeente om een uittreksel aan te vragen, bij DUO voor studiefinanciering en bij uw zorgverzekeraar. Ook uw eigen medische gegevens bij de huisarts zijn er vaak mee te bekijken. Zonder DigiD moet u voor die zaken langs de balie of alles per post regelen, wat meestal langer duurt.

Aanvragen
Aanvragen doet u eenmalig op de website van DigiD. U vult uw burgerservicenummer, geboortedatum en adres in. Daarna ontvangt u binnen enkele werkdagen per post een brief met een activeringscode. Pas als u die code invoert, werkt uw DigiD. Woont u in het buitenland, dan verloopt de aanvraag anders en duurt het langer.

Extra controle
Alleen een wachtwoord is niet veilig genoeg. Daarom vraagt DigiD bij veel organisaties om een tweede controle. Dat kan met een code per sms, maar veiliger en makkelijker is de DigiD-app op uw telefoon. Met die app scant u een kleurencode op het scherm of bevestigt u met uw vingerafdruk.

Veilig omgaan met uw gegevens
Uw DigiD is persoonlijk. Geef uw gebruikersnaam, wachtwoord of sms-code nooit aan iemand anders, ook niet aan een familielid dat u wil helpen. Medewerkers van de overheid vragen daar nooit naar, niet per telefoon en niet per mail. Krijgt u toch zo'n verzoek, dan is het vrijwel zeker oplichting. Denkt u dat iemand uw DigiD gebruikt heeft, blokkeer het dan meteen via de website en bel de DigiD-helpdesk.

Hulp bij het gebruik
Vindt u het ingewikkeld? In vrijwel iedere bibliotheek is er een Informatiepunt Digitale Overheid waar u gratis en zonder afspraak hulp krijgt van een medewerker.`,
    questions: [
      { q: 'Waarmee vergelijkt de tekst DigiD?', ar: 'بماذا يشبّه النصّ نظام DigiD؟', opts: ['Met een bankpas','Met een digitaal identiteitsbewijs','Met een verzekeringspolis','Met een huissleutel'], correct: 1, why: '"U kunt het vergelijken met een digitaal identiteitsbewijs".' },
      { q: 'Wat gebeurt er direct nadat u DigiD heeft aangevraagd?', ar: 'ماذا يحدث مباشرةً بعد تقديم الطلب؟', opts: ['U kunt meteen inloggen','U ontvangt per post een brief met een activeringscode','U moet naar het gemeentehuis komen','U krijgt een telefoontje van de Belastingdienst'], correct: 1, why: 'النصّ: تصل رسالة بريدية فيها رمز التفعيل خلال أيام عمل قليلة.' },
      { q: 'Wat is volgens de tekst veiliger en makkelijker dan een sms-code?', ar: 'ما الأفضل من رمز الرسالة النصّية حسب النصّ؟', opts: ['Een langer wachtwoord','De DigiD-app op uw telefoon','Een tweede e-mailadres','Een papieren codelijst'], correct: 1, why: '"veiliger en makkelijker is de DigiD-app op uw telefoon".' },
      { q: 'Aan wie mag u uw wachtwoord geven?', ar: 'لمن يجوز أن تعطي كلمة المرور؟', opts: ['Aan een familielid dat u helpt','Aan een medewerker van de gemeente','Aan niemand','Aan de DigiD-helpdesk'], correct: 2, why: 'النصّ يمنع ذلك مطلقًا، حتى مع أفراد العائلة، ويؤكّد أنّ الموظّفين لا يطلبونها.' },
      { q: 'Wat moet u doen bij een vermoeden van misbruik?', ar: 'ماذا تفعل إذا شككت في إساءة استخدام حسابك؟', opts: ['Een nieuw DigiD aanvragen','Uw DigiD meteen blokkeren en de helpdesk bellen','Wachten tot u een brief krijgt','Aangifte doen bij de Belastingdienst'], correct: 1, why: '"blokkeer het dan meteen via de website en bel de DigiD-helpdesk".' },
      { q: 'Waar kunt u gratis hulp krijgen bij het gebruik?', ar: 'أين تجد مساعدة مجانية على الاستخدام؟', opts: ['Bij het Informatiepunt Digitale Overheid in de bibliotheek','Alleen bij de gemeente op afspraak','Bij de huisarts','Bij uw zorgverzekeraar'], correct: 0, why: 'الفقرة الأخيرة تذكر نقطة المعلومات في المكتبة، مجانًا وبلا موعد.' },
    ],
  },
  {
    id: 'r10',
    title: 'Een motivatiebrief die wel gelezen wordt',
    ar: 'رسالة تحفيزية تُقرأ فعلًا',
    text: `Op een gemiddelde vacature komen tientallen reacties binnen. Een werkgever besteedt aan de eerste beoordeling van uw brief vaak niet meer dan een halve minuut. Wie in die korte tijd de aandacht wil vasthouden, moet zorgvuldig te werk gaan. Loopbaanadviseur Ruud Verhoeven van het Werkplein legt uit waar het meestal misgaat.

Fout een: te algemeen
"De meeste brieven die ik lees, passen bij iedere vacature", zegt Verhoeven. "Er staat dat iemand hard werkt, flexibel is en goed in een team functioneert. Dat schrijft bijna elke sollicitant. Zulke woorden zeggen niets, omdat er geen bewijs achter staat." Zijn advies: noem in plaats daarvan een concrete situatie. Vertel bijvoorbeeld dat u in uw vorige baan de planning van acht collega's maakte, of dat u een klacht van een boze klant zelfstandig heeft opgelost.

Fout twee: over uzelf in plaats van over hen
Veel sollicitanten schrijven vooral op wat zij zelf zoeken: een nieuwe uitdaging, meer uren, een kortere reistijd. "Begrijpelijk, maar de werkgever heeft een probleem dat hij wil oplossen. Laat zien dat u dat probleem begrijpt." Lees daarom de vacature nauwkeurig en gebruik dezelfde woorden die het bedrijf zelf gebruikt.

Fout drie: te lang
Een motivatiebrief van meer dan een pagina wordt zelden helemaal gelezen. Drie of vier korte alinea's zijn genoeg. Begin niet met "Hierbij solliciteer ik", maar met de reden waarom deze functie u aanspreekt.

En de taal
Verhoeven ziet dat mensen die Nederlands als tweede taal spreken zich hier vaak zorgen over maken. "Kleine fouten zijn zelden het probleem. Wel merk ik dat sommigen daardoor extra formeel en stijf gaan schrijven. Schrijf liever korte, duidelijke zinnen. Laat de brief daarna een keer lezen door iemand anders, dat helpt meer dan uren zelf schaven."

Tot slot
Vraag uzelf voor het versturen af: staat er iets in deze brief dat alleen ik kan schrijven? Is het antwoord nee, dan begint u opnieuw.`,
    questions: [
      { q: 'Hoe lang kijkt een werkgever volgens de tekst gemiddeld naar een brief?', ar: 'كم يستغرق ربّ العمل في القراءة الأولى؟', opts: ['Ongeveer vijf minuten','Vaak niet meer dan een halve minuut','Twee tot drie minuten','Dat staat niet in de tekst'], correct: 1, why: '"vaak niet meer dan een halve minuut".' },
      { q: 'Wat is het probleem met woorden als "flexibel" en "hard werken"?', ar: 'ما مشكلة كلمات مثل «مرن» و«مجتهد»؟', opts: ['Ze zijn te informeel','Er staat geen bewijs achter en bijna iedereen schrijft ze','Ze zijn moeilijk te vertalen','Werkgevers begrijpen ze niet'], correct: 1, why: 'الخبير يقول إنّ الجميع يكتبها ولا دليل خلفها.' },
      { q: 'Wat raadt Verhoeven aan in plaats daarvan?', ar: 'بماذا ينصح بدلًا من ذلك؟', opts: ['Een concrete situatie uit uw werkervaring noemen','Een langere brief schrijven','Uw diploma toevoegen','Uw salariswens vermelden'], correct: 0, why: 'ينصح بذكر موقف ملموس، كإعداد جدول ثمانية زملاء أو حلّ شكوى زبون.' },
      { q: 'Wat is volgens de tekst de tweede veelgemaakte fout?', ar: 'ما الخطأ الثاني الشائع؟', opts: ['Spelfouten maken','Vooral schrijven over wat de sollicitant zelf zoekt','De brief te laat versturen','Geen foto toevoegen'], correct: 1, why: 'النصّ يشرح أنّ المتقدّم يكتب عن رغباته بينما لدى الشركة مشكلة تريد حلّها.' },
      { q: 'Wat zegt Verhoeven over kleine taalfouten?', ar: 'ماذا يقول الخبير عن الأخطاء اللغوية الصغيرة؟', opts: ['Ze zijn de belangrijkste reden voor afwijzing','Ze zijn zelden het probleem','Ze vallen nooit op','Ze moeten altijd worden uitgelegd in de brief'], correct: 1, why: '"Kleine fouten zijn zelden het probleem" — المشكلة الأكبر هي التصنّع الزائد.' },
      { q: 'Welke laatste controle stelt de tekst voor?', ar: 'ما الفحص الأخير الذي يقترحه النصّ؟', opts: ['Tellen of de brief onder de vierhonderd woorden blijft','Nagaan of er iets in staat dat alleen u kunt schrijven','De brief hardop voorlezen','De brief laten vertalen'], correct: 1, why: 'الخاتمة: إن لم يكن في الرسالة ما لا يكتبه سواك، فابدأ من جديد.' },
    ],
  },
  {
    id: 'r11',
    title: 'Interview: van schoonmaakwerk naar een eigen kapsalon',
    ar: 'مقابلة: من عمل التنظيف إلى صالون خاص',
    text: `Amira Boutaleb (39) kwam elf jaar geleden naar Nederland. Sinds vorig jaar heeft zij haar eigen kapsalon in Enschede. Wij spraken haar tussen twee afspraken door.

U werkte eerst in de schoonmaak. Hoe kwam u daar terecht?
"Dat ging vanzelf. Ik sprak nog nauwelijks Nederlands en bij dat werk hoefde dat niet. Ik begon met avonddiensten in een kantoorgebouw. Het was zwaar, maar ik had inkomen en dat gaf rust."

Wanneer besloot u iets anders te gaan doen?
"In mijn geboorteland was ik kapster. Dat miste ik enorm. Op een avond knipte ik het haar van een collega in de kantine, gewoon voor de grap. Zij was zo enthousiast dat zij mij aan haar zus voorstelde. Toen dacht ik: misschien kan dit toch."

Wat was de grootste hindernis?
"De taal, zonder twijfel. Voor een diploma moest ik naar het mbo, en daar moest ik lessen volgen en verslagen schrijven. Ik ben eerst twee jaar naar taalles gegaan. Dat was zwaarder dan het knippen zelf, echt waar. Daarnaast wist ik niets van administratie. Wat is een btw-aangifte? Hoe schrijf je je in bij de Kamer van Koophandel? Daar had ik in het begin geen idee van."

Hoe heeft u dat opgelost?
"Ik ben naar het ondernemersloket van de gemeente gestapt. Daar kreeg ik een gratis adviesgesprek en later ook een cursus van vier avonden. Verder heb ik een boekhouder; dat kost geld, maar het scheelt mij slapeloze nachten."

Wat zou u anderen adviseren?
"Wacht niet tot uw Nederlands perfect is, want dat moment komt nooit. Begin met praten, ook met fouten. En zoek een paar mensen om u heen die eerlijk tegen u zijn. Ik had een buurvrouw die mijn brieven nakeek. Zonder haar was ik veel langer bezig geweest."

En nu?
Amira lacht. "Nu leer ik iets nieuws: leidinggeven. Sinds maart heb ik een leerling in dienst. Zij spreekt ook nog niet vloeiend Nederlands. Ik weet precies hoe dat voelt, dus ik neem er de tijd voor."`,
    questions: [
      { q: 'Waarom begon Amira in de schoonmaak?', ar: 'لماذا بدأت أميرة في مجال التنظيف؟', opts: ['Zij had een opleiding schoonmaak gevolgd','Voor dat werk had zij nog nauwelijks Nederlands nodig','Het werk was goed betaald','Een familielid werkte daar al'], correct: 1, why: '"Ik sprak nog nauwelijks Nederlands en bij dat werk hoefde dat niet".' },
      { q: 'Wat bracht haar op het idee om weer kapster te worden?', ar: 'ما الذي أعادها إلى فكرة العمل كمصفّفة شعر؟', opts: ['Een advertentie in de krant','Zij knipte het haar van een collega en die was enthousiast','Haar oude diploma werd erkend','Een cursus bij de gemeente'], correct: 1, why: 'المشهد في الكافتيريا ثم تقديم الزميلة لها إلى أختها.' },
      { q: 'Wat noemt zij zonder twijfel de grootste hindernis?', ar: 'ما أكبر عقبة واجهتها؟', opts: ['Geldgebrek','De taal','Haar gezondheid','De concurrentie'], correct: 1, why: '"De taal, zonder twijfel."' },
      { q: 'Hoe loste zij haar gebrek aan kennis over administratie op?', ar: 'كيف عالجت نقص معرفتها بالأمور الإدارية؟', opts: ['Zij volgde een studie economie','Via het ondernemersloket van de gemeente en later een boekhouder','Haar buurvrouw deed de boekhouding','Zij leerde het van internet'], correct: 1, why: 'استشارة مجانية ودورة أربع أمسيات، ثم محاسب مدفوع.' },
      { q: 'Welk advies geeft zij over de taal?', ar: 'ما نصيحتها بخصوص اللغة؟', opts: ['Eerst een diploma halen en dan pas beginnen','Niet wachten tot het perfect is, maar beginnen met praten','Alleen met moedertaalsprekers oefenen','Vooral schriftelijk oefenen'], correct: 1, why: '"Wacht niet tot uw Nederlands perfect is, want dat moment komt nooit."' },
      { q: 'Wat leert Amira op dit moment?', ar: 'ماذا تتعلّم أميرة حاليًا؟', opts: ['Een nieuwe kniptechniek','Leidinggeven','Boekhouden','Engels'], correct: 1, why: '"Nu leer ik iets nieuws: leidinggeven" — بعد توظيفها متدرّبة في مارس.' },
    ],
  },
  {
    id: 'r12',
    title: 'Minder betalen voor energie: waar begint u?',
    ar: 'خفض فاتورة الطاقة: من أين تبدأ؟',
    text: `De energierekening is voor veel huishoudens een flinke kostenpost. Gelukkig valt er vaak meer te besparen dan mensen denken, en lang niet altijd met dure maatregelen. Hieronder vindt u de stappen op volgorde, van makkelijk naar ingrijpend.

Stap 1: weet wat u verbruikt
Begin met inzicht. Op uw jaarafrekening ziet u hoeveel kubieke meter gas en hoeveel kilowattuur stroom u heeft gebruikt. Vergelijk dat met het gemiddelde voor een woning van uw type; dat gemiddelde staat op de website van uw netbeheerder. Verbruikt u duidelijk meer, dan is er ergens winst te halen.

Stap 2: gedrag
De goedkoopste maatregelen kosten niets. De verwarming een graad lager scheelt al snel zes procent op uw gasverbruik. Douch vijf minuten in plaats van tien. Zet apparaten echt uit in plaats van op stand-by. En verwarm alleen de kamers die u gebruikt; houd de deuren van koude kamers dicht.

Stap 3: kleine investeringen
Voor enkele tientjes koopt u tochtstrips voor deuren en ramen, radiatorfolie en een waterbesparende douchekop. Deze maatregelen verdient u meestal binnen een jaar terug. Ledlampen zijn iets duurder in aanschaf, maar gaan jaren mee en gebruiken een fractie van de stroom van oude lampen.

Stap 4: grote maatregelen
Isolatie van dak, vloer en spouwmuur levert de meeste besparing op, maar kost ook het meest. Huurt u? Dan mag u dit niet zelf beslissen; u kunt uw verhuurder wel schriftelijk om isolatie verzoeken. Voor eigenaren bestaan er subsidies, en gemeenten bieden soms een lening met een lage rente.

Betalingsproblemen
Kunt u de rekening niet betalen? Wacht niet af. Neem contact op met uw energieleverancier en vraag om een betalingsregeling. Leveranciers mogen u in de winter niet zomaar afsluiten, maar de schuld blijft wel staan en loopt op. De gemeente heeft daarnaast een loket voor schuldhulpverlening, waar u kosteloos terechtkunt. Hoe eerder u aanklopt, hoe meer mogelijkheden er zijn.`,
    questions: [
      { q: 'Waarmee moet u volgens de tekst beginnen?', ar: 'بماذا يجب أن تبدأ حسب النصّ؟', opts: ['Met het isoleren van het dak','Met inzicht in uw eigen verbruik','Met het vervangen van alle lampen','Met het aanvragen van subsidie'], correct: 1, why: '"Stap 1: weet wat u verbruikt" — قارن استهلاكك بالمتوسّط أولًا.' },
      { q: 'Hoeveel scheelt de verwarming een graad lager ongeveer?', ar: 'كم توفّر خفض التدفئة درجة واحدة؟', opts: ['Ongeveer een procent','Ongeveer drie procent','Ongeveer zes procent','Ongeveer vijftien procent'], correct: 2, why: '"De verwarming een graad lager scheelt al snel zes procent".' },
      { q: 'Wat geldt voor tochtstrips en radiatorfolie?', ar: 'ما ميزة أشرطة العزل ورقائق المشعّات؟', opts: ['Ze zijn gratis bij de gemeente','U verdient ze meestal binnen een jaar terug','Ze werken alleen in nieuwbouw','Ze zijn alleen voor huiseigenaren'], correct: 1, why: '"Deze maatregelen verdient u meestal binnen een jaar terug".' },
      { q: 'Welke maatregel levert de meeste besparing op?', ar: 'أيّ إجراء يحقّق أكبر توفير؟', opts: ['Ledlampen','Korter douchen','Isolatie van dak, vloer en spouwmuur','Apparaten uitzetten'], correct: 2, why: 'النصّ يذكر أنّ العزل يعطي أكبر توفير لكنّه الأغلى.' },
      { q: 'Wat kan een huurder doen die zijn woning wil laten isoleren?', ar: 'ماذا يفعل المستأجر الذي يريد عزل مسكنه؟', opts: ['Zelf de isolatie laten plaatsen','De verhuurder schriftelijk om isolatie verzoeken','Subsidie aanvragen bij de gemeente','De huur inhouden'], correct: 1, why: 'المستأجر لا يقرّر بنفسه، لكن يحقّ له تقديم طلب خطّي للمالك.' },
      { q: 'Wat adviseert de tekst bij betalingsproblemen?', ar: 'بماذا ينصح النصّ عند تعذّر الدفع؟', opts: ['Wachten tot de winter voorbij is','Meteen contact opnemen en om een betalingsregeling vragen','Van leverancier wisselen','Minder energie gebruiken en niets melden'], correct: 1, why: 'النصّ يشدّد على عدم الانتظار، وأنّ عدم القطع شتاءً لا يعني اختفاء الدين.' },
    ],
  },
]

export const EXAM_READING: ExamReadingItem[] =
  RAW_READING.map((item, i) => ({ ...item, questions: spreadAnswers(item.questions, i) }))

const RAW_LISTENING: ExamListeningItem[] = [
  {
    id: 'l1',
    title: 'Op het gemeentehuis — een afspraak verzetten',
    ar: 'في بلدية المدينة — تأجيل موعد',
    transcript: `Medewerker: Goedemorgen, gemeente Tilburg, u spreekt met Saskia. Waarmee kan ik u helpen?
Klant: Goedemorgen mevrouw, met Karim Hassan. Ik heb morgenochtend om tien uur een afspraak voor mijn paspoort, maar het lukt mij niet om te komen. Mijn dochter is ziek geworden en ik moet thuisblijven.
Medewerker: Wat vervelend voor u. Geen probleem, we kunnen de afspraak verzetten. Heeft u uw afspraaknummer bij de hand?
Klant: Ja, één moment... het is V8 9 6 4 2.
Medewerker: Dank u wel. Ik zie hem inderdaad staan. Wanneer zou het u beter uitkomen?
Klant: Het liefst volgende week, ergens in de middag.
Medewerker: Even kijken... volgende week dinsdag heb ik om half drie nog plek. Of donderdag om vier uur.
Klant: Dinsdag half drie is perfect.
Medewerker: Genoteerd. U krijgt over een paar minuten een bevestigingsmail. Vergeet niet uw oude paspoort en een recente pasfoto mee te nemen.
Klant: Dat zal ik doen. Hartelijk dank, fijne dag verder.
Medewerker: U ook, beterschap voor uw dochter!`,
    questions: [
      { q: 'Waarom belt Karim de gemeente?', ar: 'لماذا اتّصل كريم بالبلدية؟', opts: ['Om een nieuw paspoort aan te vragen','Om een bestaande afspraak te verzetten','Om te klagen over de wachttijd','Om informatie over openingstijden'], correct: 1 },
      { q: 'Wat is de reden voor het verzetten?', ar: 'ما سبب التأجيل؟', opts: ['Hij is zelf ziek','Zijn auto is kapot','Zijn dochter is ziek','Hij moet werken'], correct: 2 },
      { q: 'Welke nieuwe afspraak wordt gemaakt?', ar: 'ما الموعد الجديد؟', opts: ['Maandag om 10:00','Dinsdag om 14:30','Donderdag om 16:00','Vrijdag om 09:00'], correct: 1 },
      { q: 'Wat moet Karim meenemen naar de nieuwe afspraak?', ar: 'ماذا يحضر كريم معه؟', opts: ['Alleen zijn ID-kaart','Zijn oude paspoort en een recente pasfoto','Een verklaring van de huisarts','Niets, alles is digitaal'], correct: 1 },
    ],
  },
  {
    id: 'l2',
    title: 'Radiobericht over een treinstoring',
    ar: 'نشرة إذاعية عن عطل في القطار',
    transcript: `Goedemiddag luisteraars, het is twee uur en hier is het nieuws van Radio Noord-Holland. Het belangrijkste bericht: tussen Amsterdam Centraal en Haarlem rijden vanmiddag tot zeker zes uur geen treinen. De NS meldt dat er een storing is bij een wissel ter hoogte van Halfweg. Technici zijn ter plaatse, maar de reparatie kost meer tijd dan eerst gedacht. Reizigers worden geadviseerd om de bus te nemen die elke twintig minuten vertrekt vanaf de bushalte vóór het station. Voor wie niet kan wachten: er rijden ook intercitybussen tussen Amsterdam Sloterdijk en Haarlem, maar daarvoor heeft u wel een geldig OV-chipkaart nodig. De NS biedt geen vervangend vervoer richting Zandvoort. Reist u richting strand? Dan kunt u beter de auto nemen of uw reis een paar uur uitstellen. Voor actuele informatie kunt u de NS-app raadplegen of bellen met 0900-9292. Het reguliere verkeer rond Halfweg is op dit moment niet gehinderd.`,
    questions: [
      { q: 'Tussen welke twee stations rijden er geen treinen?', ar: 'بين أي محطّتين توقّفت القطارات؟', opts: ['Amsterdam en Utrecht','Amsterdam en Haarlem','Haarlem en Zandvoort','Amsterdam en Schiphol'], correct: 1 },
      { q: 'Wat is de oorzaak van de storing?', ar: 'ما سبب العطل؟', opts: ['Een ongeluk','Een storing bij een wissel','Het weer','Een staking'], correct: 1 },
      { q: 'Tot wanneer rijden er volgens de NS geen treinen?', ar: 'حتى أي وقت لن تسير القطارات؟', opts: ['Tot vier uur','Tot vijf uur','Tot zeker zes uur','De hele dag niet'], correct: 2 },
      { q: 'Wat wordt reizigers naar Zandvoort geadviseerd?', ar: 'بماذا يُنصح المسافرون إلى زاندفورت؟', opts: ['De NS-bus nemen','De auto nemen of de reis uitstellen','Wachten op vervangend vervoer','Lopen naar het strand'], correct: 1 },
    ],
  },
  {
    id: 'l3',
    title: 'Voicemail van de tandartspraktijk',
    ar: 'رسالة صوتية من عيادة الأسنان',
    transcript: `Goedemiddag meneer Karimi, u spreekt met Nadia van tandartspraktijk Molenveld. Ik bel over uw controle van komende donderdag, kwart over negen 's ochtends. Helaas moet ik die afspraak afzeggen: onze tandarts, mevrouw De Wit, is ziek geworden en wij weten nog niet precies wanneer zij terug is.

Ik kan u twee andere momenten aanbieden. Volgende week vrijdag om tien voor elf, of de week daarna op maandag aan het eind van de middag, om vijf uur. Wilt u mij laten weten wat u het beste past? Belt u dan uiterlijk woensdag voor vijf uur terug, want daarna is de administratie gesloten en gaat de plek naar iemand anders.

Nog iets anders: uit ons systeem blijkt dat wij van u geen actuele gegevens van uw zorgverzekering hebben. Zou u die willen doorgeven als u belt? Dan kunnen wij de rekening direct naar de verzekeraar sturen en hoeft u zelf niets voor te schieten.

Ons nummer is nul drie zes, vier vier, twee tien negentig. U kunt ook een bericht sturen via het patientenportaal. Dank u wel en een goede dag verder.`,
    questions: [
      { q: 'Waarom belt de praktijk?', ar: 'لماذا اتّصلت العيادة؟', opts: ['Om een rekening te bespreken','Om de afspraak af te zeggen omdat de tandarts ziek is','Om een nieuwe patient aan te melden','Om een herinnering te geven voor donderdag'], correct: 1 },
      { q: 'Wanneer was de oorspronkelijke afspraak?', ar: 'متى كان الموعد الأصلي؟', opts: ['Donderdag om 09:15','Vrijdag om 10:50','Maandag om 17:00','Woensdag om 17:00'], correct: 0 },
      { q: 'Wat moet meneer Karimi uiterlijk woensdag doen?', ar: 'ما المطلوب منه قبل الأربعاء؟', opts: ['Naar de praktijk komen','Terugbellen voor vijf uur','Een formulier opsturen','Zijn verzekering wijzigen'], correct: 1 },
      { q: 'Welke informatie vraagt de praktijk nog?', ar: 'أيّ معلومة تطلبها العيادة أيضًا؟', opts: ['Zijn nieuwe adres','Actuele gegevens van zijn zorgverzekering','De naam van zijn huisarts','Een kopie van zijn identiteitsbewijs'], correct: 1 },
    ],
  },
  {
    id: 'l4',
    title: 'Telefoongesprek met de doktersassistente',
    ar: 'مكالمة مع مساعدة الطبيب',
    transcript: `Assistente: Huisartsenpraktijk Zuiderveld, u spreekt met Ilse. Waarmee kan ik u helpen?
Patient: Goedemorgen, met Youssef Amrani. Ik zou graag een afspraak maken. Ik heb al een paar weken hoofdpijn en ik ben steeds heel moe.
Assistente: Dat is niet fijn. Hoe lang heeft u die klachten precies?
Patient: Ongeveer drie weken nu. Eerst dacht ik dat het door het werk kwam, maar het gaat niet weg.
Assistente: Gebruikt u op dit moment medicijnen?
Patient: Alleen paracetamol, twee per dag ongeveer. Verder niets.
Assistente: Goed dat u belt. Ik plan u in bij dokter Bakker, morgen om twintig voor drie. Schikt dat?
Patient: Ja, dat kan ik regelen.
Assistente: Fijn. Wilt u vooraf even langs het lab komen? De dokter wil eerst uw bloed laten onderzoeken, dan heeft zij de uitslag al bij het gesprek. Het lab is open van acht tot half elf, zonder afspraak.
Patient: Dus eerst het lab, en dan morgen het gesprek?
Assistente: Precies. Neemt u uw identiteitsbewijs mee naar het lab. En eet en drink gewoon, u hoeft niet nuchter te zijn.
Patient: Helder. Dank u wel.
Assistente: Graag gedaan, tot morgen.`,
    questions: [
      { q: 'Hoe lang heeft Youssef zijn klachten?', ar: 'منذ متى يشكو يوسف؟', opts: ['Een paar dagen','Ongeveer een week','Ongeveer drie weken','Meer dan een half jaar'], correct: 2 },
      { q: 'Welk medicijn gebruikt hij?', ar: 'أيّ دواء يستخدمه؟', opts: ['Niets','Alleen paracetamol','Slaapmiddelen','Antibiotica'], correct: 1 },
      { q: 'Wat moet er volgens de assistente eerst gebeuren?', ar: 'ما الذي يجب أن يحدث أولًا؟', opts: ['Bloedonderzoek bij het lab','Een gesprek met de dokter','Een verwijzing naar het ziekenhuis','Een formulier invullen'], correct: 0 },
      { q: 'Wat zegt de assistente over eten en drinken?', ar: 'ماذا تقول المساعدة عن الأكل والشرب؟', opts: ['Hij moet nuchter blijven','Hij mag gewoon eten en drinken','Hij mag alleen water drinken','Daar zegt zij niets over'], correct: 1 },
    ],
  },
  {
    id: 'l5',
    title: 'Fragment uit een sollicitatiegesprek',
    ar: 'مقطع من مقابلة عمل',
    transcript: `Werkgever: Dank dat u er bent, meneer Haddad. U reageerde op de functie van medewerker logistiek. Wat sprak u daarin aan?
Kandidaat: Vooral het werken in een team en dat het afwisselend is. In mijn vorige baan stond ik drie jaar in een distributiecentrum, dus het werk zelf ken ik goed.
Werkgever: Fijn. Ik moet u wel iets belangrijks vertellen. Wij werken in twee diensten: van zes uur 's ochtends tot half drie, en van half drie tot elf uur 's avonds. Die wisselen elke week. Voor ons is dat de belangrijkste eis; wie dat niet kan, kunnen wij niet aannemen.
Kandidaat: Dat is voor mij geen probleem. Ik heb eerder in ploegen gewerkt.
Werkgever: Mooi. Verder vragen wij een heftruckcertificaat. Heeft u dat?
Kandidaat: Nee, dat heb ik niet.
Werkgever: Geen bezwaar, dat kunt u bij ons halen. De cursus duurt twee dagen en wij betalen die. Het contract begint met een proeftijd van een maand. Daarna volgt een jaarcontract, en bij goed functioneren kijken we naar iets vasts.
Kandidaat: Duidelijk. Wanneer hoor ik iets?
Werkgever: Wij spreken deze week nog drie mensen. Uiterlijk maandag krijgt u van mij telefonisch bericht. Bij een positief besluit volgt er nog een kort gesprek met de teamleider.`,
    questions: [
      { q: 'Wat is voor de werkgever de belangrijkste eis?', ar: 'ما أهمّ شرط عند ربّ العمل؟', opts: ['Een heftruckcertificaat','In wisselende diensten kunnen werken','Drie jaar werkervaring','Een eigen auto'], correct: 1 },
      { q: 'Wat geldt voor het heftruckcertificaat?', ar: 'ما حكم شهادة الرافعة؟', opts: ['Het is verplicht voor het gesprek','De kandidaat kan het bij het bedrijf halen, betaald door de werkgever','Het moet de kandidaat zelf betalen','Het is niet nodig'], correct: 1 },
      { q: 'Hoe lang is de proeftijd?', ar: 'كم مدّة فترة التجربة؟', opts: ['Twee weken','Een maand','Twee maanden','Een jaar'], correct: 1 },
      { q: 'Wat gebeurt er bij een positief besluit?', ar: 'ماذا يحدث في حال القبول؟', opts: ['Het contract wordt meteen ondertekend','Er volgt nog een kort gesprek met de teamleider','De kandidaat begint dezelfde week','Hij krijgt een brief per post'], correct: 1 },
    ],
  },
  {
    id: 'l6',
    title: 'Omroepbericht op het station',
    ar: 'إعلان في محطّة القطار',
    transcript: `Dames en heren, mag ik even uw aandacht. Een mededeling over de intercity naar Groningen van vijftien uur zevenentwintig. Deze trein vertrekt vandaag niet van spoor vijf, maar van spoor acht. Ik herhaal: spoor acht.

De trein heeft daarnaast een vertraging van ongeveer tien minuten. De oorzaak is een defecte deur, die op dit moment wordt gerepareerd.

Let op bij het instappen: alleen de voorste zes rijtuigen rijden door naar Groningen. De achterste rijtuigen worden in Zwolle afgekoppeld en gaan verder richting Leeuwarden. Reist u naar Groningen? Stap dan voorin. Kijkt u naar de gele borden op het perron; daar staat aangegeven waar de voorste rijtuigen stoppen.

Reizigers naar Assen: deze trein stopt vandaag niet in Assen. U kunt in Zwolle overstappen op de stoptrein van spoor twee.

Voor vragen kunt u terecht bij een medewerker bij de servicebalie in de stationshal. Wij wensen u een goede reis.`,
    questions: [
      { q: 'Van welk spoor vertrekt de trein vandaag?', ar: 'من أي رصيف يقوم القطار اليوم؟', opts: ['Spoor twee','Spoor vijf','Spoor acht','Dat is nog niet bekend'], correct: 2 },
      { q: 'Wat is de oorzaak van de vertraging?', ar: 'ما سبب التأخير؟', opts: ['Een defecte deur','Een storing bij een wissel','Drukte op het perron','Het weer'], correct: 0 },
      { q: 'Wat moeten reizigers naar Groningen doen?', ar: 'ماذا يفعل المسافرون إلى خرونِنغن؟', opts: ['Achterin instappen','Voorin instappen','In Zwolle overstappen','Wachten op de volgende trein'], correct: 1 },
      { q: 'Wat geldt voor reizigers naar Assen?', ar: 'ما ينطبق على المسافرين إلى أسِن؟', opts: ['De trein stopt daar zoals altijd','Zij moeten in Zwolle overstappen op de stoptrein','Zij moeten achterin gaan zitten','Zij kunnen niet reizen vandaag'], correct: 1 },
    ],
  },
  {
    id: 'l7',
    title: 'Een lekkage melden bij de verhuurder',
    ar: 'الإبلاغ عن تسرّب ماء إلى المالك',
    transcript: `Verhuurder: Janssen Vastgoed, goedemiddag.
Huurder: Goedemiddag, u spreekt met mevrouw Ayad van de Kastanjelaan zevenentwintig B. Ik bel omdat er water uit het plafond van mijn badkamer komt.
Verhuurder: Wat vervelend. Sinds wanneer is dat zo?
Huurder: Sinds gisteravond. Eerst was het een klein vlekje, maar vanmorgen was het duidelijk groter en nu druppelt het echt.
Verhuurder: Heeft u al bij de bovenburen gevraagd of daar iets aan de hand is?
Huurder: Ja, ik heb aangebeld, maar er werd niet opengedaan. Ik denk dat zij op vakantie zijn.
Verhuurder: Goed dat u dat gecontroleerd heeft. Ik stuur vandaag nog een loodgieter. Hij belt u eerst om een tijd af te spreken; dat wordt tussen vier en zes uur.
Huurder: Moet ik iets doen tot die tijd?
Verhuurder: Zet een emmer onder de druppel en gebruik de badkamer zo weinig mogelijk. Maakt u ook een paar foto's van het plafond, met de datum erbij. Dat hebben wij nodig voor de verzekering.
Huurder: En wie betaalt de reparatie?
Verhuurder: De reparatie van de leiding is voor onze rekening. Raakt uw eigen spullen beschadigd, dan gaat dat via uw inboedelverzekering. Dat moet u zelf melden.
Huurder: Dat is duidelijk. Dank u wel.`,
    questions: [
      { q: 'Sinds wanneer bestaat het probleem?', ar: 'منذ متى بدأت المشكلة؟', opts: ['Sinds een week','Sinds gisteravond','Sinds vanmorgen','Sinds de vakantie van de bovenburen'], correct: 1 },
      { q: 'Wat heeft de huurder zelf al gedaan?', ar: 'ما الذي فعلته المستأجرة أصلًا؟', opts: ['Een loodgieter gebeld','Bij de bovenburen aangebeld','Het water afgesloten',"Foto's naar de verzekering gestuurd"], correct: 1 },
      { q: 'Wat vraagt de verhuurder haar te doen?', ar: 'ماذا يطلب منها المالك؟', opts: ['De badkamer helemaal niet gebruiken',"Een emmer neerzetten en foto's maken met de datum",'De bovenburen bellen in het buitenland','Een brief sturen naar de verzekering'], correct: 1 },
      { q: 'Wie betaalt de schade aan haar eigen spullen?', ar: 'من يدفع تعويض أغراضها الشخصية؟', opts: ['De verhuurder','De bovenburen','Haar eigen inboedelverzekering','De loodgieter'], correct: 2 },
    ],
  },
  {
    id: 'l8',
    title: 'Een kind ziek melden op school',
    ar: 'الإبلاغ عن مرض الطفل في المدرسة',
    transcript: `Administratie: Basisschool De Vlieger, goedemorgen, u spreekt met Marjan.
Ouder: Goedemorgen, met de vader van Lina Sadiq uit groep vier. Ik bel om Lina ziek te melden.
Administratie: Dank u voor het doorgeven. Wat heeft zij?
Ouder: Zij heeft vannacht overgegeven en zij voelt warm aan. Ik heb haar temperatuur gemeten: achtendertig zes.
Administratie: Dan is thuisblijven inderdaad het beste. Onze regel bij overgeven is dat een kind vierentwintig uur klachtenvrij moet zijn voordat het weer naar school komt.
Ouder: Dus als het vandaag stopt, kan zij overmorgen weer?
Administratie: Precies, als zij dan een hele dag geen klachten meer heeft. Belt u morgen weer even om ons op de hoogte te houden? Bij een ziekmelding van meer dan twee dagen nemen wij zelf ook contact op.
Ouder: Zal ik doen. Nog iets: vrijdag is de sportdag. Als zij dan nog niet fit is, hoeft zij niet te komen?
Administratie: Nee, dat hoeft niet. Maar geeft u dat dan wel door voor donderdag twaalf uur, want wij maken de groepjes op donderdagmiddag.
Ouder: Begrepen. En het huiswerk?
Administratie: Daar zorgt de leerkracht voor. Zij zet de opdrachten in het ouderportaal, maar met koorts hoeft Lina echt niets te doen. Rust gaat voor.`,
    questions: [
      { q: 'Wat zijn de klachten van Lina?', ar: 'ما أعراض لينا؟', opts: ['Hoofdpijn en hoesten','Overgegeven en verhoging','Buikpijn zonder koorts','Oorpijn'], correct: 1 },
      { q: 'Wat is de regel van de school bij overgeven?', ar: 'ما قاعدة المدرسة في حالة التقيّؤ؟', opts: ['Twee dagen thuisblijven','Vierentwintig uur klachtenvrij zijn','Een verklaring van de huisarts meenemen','Direct weer naar school als de koorts weg is'], correct: 1 },
      { q: 'Wanneer moet de vader doorgeven of Lina meedoet aan de sportdag?', ar: 'متى يجب إبلاغ المدرسة بشأن يوم الرياضة؟', opts: ['Voor donderdag twaalf uur','Op vrijdagmorgen','Voor woensdagavond','Dat hoeft niet'], correct: 0 },
      { q: 'Wat zegt de administratie over het huiswerk?', ar: 'ماذا تقول الإدارة عن الواجبات؟', opts: ['Lina moet alles inhalen voor vrijdag','Het staat in het ouderportaal, maar met koorts hoeft zij niets te doen','De vader moet het huiswerk ophalen op school','Er is geen huiswerk in groep vier'], correct: 1 },
    ],
  },
  {
    id: 'l9',
    title: 'Klantenservice: een betalingsregeling vragen',
    ar: 'خدمة العملاء: طلب تقسيط الدفع',
    transcript: `Medewerker: Energiebedrijf Nuvon, u spreekt met Tom. Waarmee kan ik u helpen?
Klant: Goedemiddag. Ik heb de jaarafrekening ontvangen en ik moet driehonderdtwintig euro bijbetalen. Dat kan ik niet in een keer.
Medewerker: Dat kan ik me voorstellen. Wij kunnen het bedrag spreiden. Zegt u eerst even uw klantnummer?
Klant: Ja, dat is negen twee, drie drie, zes een.
Medewerker: Dank u. Ik zie de afrekening staan. Wij kunnen het bedrag verdelen over drie of over zes maanden. Bij zes maanden komt er geen rente bij, maar wel eenmalig vijf euro administratiekosten.
Klant: Dan graag zes maanden.
Medewerker: In orde. Dat wordt vierenvijftig euro en tien cent per maand, naast uw gewone termijnbedrag. De eerste afschrijving is op de eerste van volgende maand.
Klant: En mijn maandbedrag zelf, blijft dat gelijk?
Medewerker: Op dit moment wel. Maar ik zie dat u het afgelopen jaar meer verbruikte dan uw termijn dekt. Ik raad u aan het maandbedrag te verhogen naar honderdvijf euro, anders krijgt u volgend jaar weer een naheffing.
Klant: Laten we dat dan maar doen.
Medewerker: Genoteerd. U ontvangt binnen twee werkdagen een bevestiging per e-mail. Controleert u die goed, en klopt er iets niet, belt u dan binnen veertien dagen.`,
    questions: [
      { q: 'Waarom belt de klant?', ar: 'لماذا اتّصل العميل؟', opts: ['Hij wil van leverancier wisselen','Hij kan de naheffing niet in een keer betalen','Hij wil zijn meterstanden doorgeven','Hij heeft een verkeerde rekening ontvangen'], correct: 1 },
      { q: 'Wat kost de regeling van zes maanden?', ar: 'ما تكلفة خطّة الستّة أشهر؟', opts: ['Rente over het hele bedrag','Eenmalig vijf euro administratiekosten','Niets extra','Tien euro per maand extra'], correct: 1 },
      { q: 'Wat adviseert de medewerker daarnaast?', ar: 'بماذا ينصح الموظّف إضافةً إلى ذلك؟', opts: ['Minder energie gebruiken','Het maandbedrag verhogen naar honderdvijf euro','Een nieuwe meter aanvragen','Overstappen op een vast contract'], correct: 1 },
      { q: 'Wat moet de klant doen als de bevestiging niet klopt?', ar: 'ماذا يفعل إن كان التأكيد غير صحيح؟', opts: ['Niets, het wordt automatisch aangepast','Binnen veertien dagen bellen','Een brief sturen','Wachten op de volgende afrekening'], correct: 1 },
    ],
  },
  {
    id: 'l10',
    title: "Twee collega's over de werkverdeling",
    ar: 'زميلان يتحدّثان عن توزيع العمل',
    transcript: `Sanne: Hoi Karim, heb je even? Ik wil het rooster van volgende week met je doornemen.
Karim: Ja hoor, zeg het maar.
Sanne: Nadia is er donderdag en vrijdag niet, die heeft twee dagen vrij opgenomen. Dus haar taken moeten verdeeld worden.
Karim: Wat doet zij normaal op die dagen?
Sanne: Donderdagochtend de voorraad controleren, en vrijdag de bestellingen klaarzetten voor de vrachtwagen van halftwee.
Karim: De voorraad kan ik doen, dat ken ik. Maar vrijdag lukt niet; dan heb ik de hele middag de training over het nieuwe kassasysteem.
Sanne: O ja, die was ik vergeten. Dan vraag ik of Peter vrijdag een uur eerder begint.
Karim: Volgens mij werkt Peter vrijdag niet meer sinds hij is gaan studeren.
Sanne: Klopt, dat is waar. Dan blijft alleen Joyce over. Zij heeft het wel druk, maar als ik zelf de telefoon overneem, moet het lukken.
Karim: Doe dat. En zal ik de bestellijst donderdag al voorbereiden? Dan hoeft Joyce vrijdag alleen nog te controleren en in te laden.
Sanne: Dat zou echt helpen, graag. Ik zet het straks in het rooster en stuur iedereen een bericht.
Karim: Prima. En als het misgaat, bel me gewoon, ook al ben ik in de training.`,
    questions: [
      { q: 'Waarom moeten er taken verdeeld worden?', ar: 'لماذا يجب توزيع المهام؟', opts: ['Er is een nieuwe collega','Nadia heeft donderdag en vrijdag vrij','De vrachtwagen komt later','Er is een training voor iedereen'], correct: 1 },
      { q: 'Waarom kan Karim vrijdagmiddag niet helpen?', ar: 'لماذا لا يستطيع كريم المساعدة الجمعة؟', opts: ['Hij werkt dan niet','Hij heeft een training over het nieuwe kassasysteem','Hij moet de voorraad controleren','Hij is op vakantie'], correct: 1 },
      { q: 'Waarom valt Peter af?', ar: 'لماذا استُبعد بيتر؟', opts: ['Hij is ziek','Hij werkt vrijdag niet meer sinds hij studeert','Hij kent het werk niet','Hij heeft al te veel uren'], correct: 1 },
      { q: 'Wat biedt Karim uiteindelijk aan?', ar: 'ما الذي عرضه كريم في النهاية؟', opts: ['De training uitstellen','De bestellijst donderdag al voorbereiden','Vrijdag toch een uur te komen','De telefoon overnemen'], correct: 1 },
    ],
  },
]

export const EXAM_LISTENING: ExamListeningItem[] =
  RAW_LISTENING.map((item, i) => ({ ...item, questions: spreadAnswers(item.questions, i) }))

export const EXAM_WRITING: ExamWritingItem[] = [
  { id: 'w1', kind: 'email', ar: 'بريد إلكتروني قصير — إلغاء حصّة', titleNl: 'Sportles afzeggen', briefNl: 'U volgt een wekelijkse yogales bij sportschool BalanZ. Volgende week kunt u niet komen omdat u op vakantie bent. Schrijf een e-mail naar uw docente (Lisa Visser, lisa@balanz.nl) waarin u: (1) zegt waarom u dit schrijft, (2) uitlegt wanneer u afwezig bent, (3) vraagt of u de les later kunt inhalen, (4) vriendelijk afsluit.', briefAr: 'تتبع حصة يوغا أسبوعية في صالة BalanZ. الأسبوع المقبل لا تستطيع الحضور لأنك مسافر. اكتب بريدًا إلى المدرّبة Lisa Visser تذكر فيه: سبب الكتابة، فترة الغياب، طلب التعويض، وتختم بطريقة مهذّبة.', minWords: 60, maxWords: 90,
    register: 'formeel', points: [
      { ar: 'اذكر سبب كتابتك', any: ['kan niet komen', 'kan ik niet', 'niet aanwezig', 'afzeggen', 'afmelden', 'niet naar de les'] },
      { ar: 'حدّد فترة غيابك', any: ['volgende week', 'komende week', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'vakantie'] },
      { ar: 'اطلب تعويض الحصّة', any: ['inhalen', 'later volgen', 'een andere les', 'andere keer', 'extra les', 'meedoen'] },
      { ar: 'اذكر الحصّة أو الصالة', any: ['yoga', 'yogales', 'les', 'balanz'] },
    ] },
  { id: 'w2', kind: 'klachtbrief', ar: 'رسالة شكوى — منتج معيب', titleNl: 'Klacht over een kapotte koffiemachine', briefNl: 'U heeft drie weken geleden een koffiezetapparaat (KaffeMax 200) gekocht bij webwinkel TechHuis. Het apparaat werkt al na een week niet meer goed: er komt geen warm water meer uit. Schrijf een klachtbrief aan TechHuis waarin u: (1) het probleem beschrijft, (2) het bestelnummer noemt (TH-2024-554), (3) uitlegt wat u al heeft geprobeerd, (4) vraagt of u het apparaat kunt omruilen of uw geld terug krijgt.', briefAr: 'اشتريت ماكينة قهوة من متجر TechHuis قبل 3 أسابيع. توقفت عن العمل (لا ماء ساخن). اكتب شكوى تذكر: المشكلة، رقم الطلب، ما جرّبته، طلبك (استبدال أو استرجاع).', minWords: 90, maxWords: 130,
    register: 'formeel', points: [
      { ar: 'صِف المشكلة', any: ['geen warm water', 'werkt niet', 'kapot', 'defect', 'doet het niet', 'probleem'] },
      { ar: 'اذكر رقم الطلب', any: ['th-2024-554', 'bestelnummer', 'ordernummer', 'bestelling'] },
      { ar: 'اذكر ما جرّبته بنفسك', any: ['geprobeerd', 'handleiding', 'opnieuw', 'ontkalkt', 'stekker', 'getest', 'gecontroleerd'] },
      { ar: 'اطلب استبدالًا أو استرجاعًا', any: ['omruilen', 'ruilen', 'geld terug', 'terugbetalen', 'vervangen', 'nieuw apparaat'] },
    ] },
  { id: 'w3', kind: 'verzoek', ar: 'طلب رسمي — تمديد عقد', titleNl: 'Huurcontract verlengen', briefNl: 'U huurt sinds twee jaar een appartement van verhuurder Janssen Vastgoed. Uw contract eindigt over twee maanden. U wilt graag blijven wonen en het contract verlengen. Schrijf een formele brief aan de verhuurder waarin u: (1) zich kort voorstelt en het adres noemt, (2) uw verzoek duidelijk maakt, (3) noemt wat voor u belangrijk is (geen huurverhoging, of een lichte aanpassing), (4) vraagt om een schriftelijke reactie.', briefAr: 'تسكن منذ سنتين شقّة من Janssen Vastgoed. عقدك ينتهي خلال شهرين وتريد التمديد. اكتب طلبًا رسميًا: التعريف بنفسك + العنوان، الطلب، الشروط المرغوبة، وطلب الردّ كتابةً.', minWords: 90, maxWords: 140,
    register: 'formeel', points: [
      { ar: 'عرّف بنفسك واذكر العنوان', any: ['woon', 'adres', 'appartement', 'huur ik', 'sinds', 'straat', 'laan', 'plein'] },
      { ar: 'اذكر طلبك بوضوح', any: ['verlengen', 'verlenging', 'blijven wonen', 'voortzetten', 'doorgaan', 'verzoek'] },
      { ar: 'اذكر ما يهمّك في الشروط', any: ['huurverhoging', 'zelfde huur', 'geen verhoging', 'aanpassing', 'voorwaarden', 'prijs'] },
      { ar: 'اطلب ردًّا كتابيًّا', any: ['schriftelijk', 'schriftelijke reactie', 'brief', 'per e-mail', 'antwoord', 'reactie'] },
    ] },
  { id: 'w4', kind: 'mail-collega', ar: 'بريد لزميل في العمل', titleNl: 'Werkverdeling tijdens je vakantie', briefNl: 'U gaat over een week op vakantie. Uw collega (Daan) heeft aangeboden uw taken over te nemen. Schrijf hem een mail waarin u: (1) bedankt voor het aanbod, (2) een korte lijst geeft van wat hij moet doen (post checken, klanten terugbellen, agenda bijhouden), (3) zegt waar hij belangrijke documenten kan vinden, (4) zegt dat hij u in noodgeval kan bellen.', briefAr: 'ستسافر بعد أسبوع. عرض زميلك Daan تولّي مهامك. اكتب له بريدًا يتضمن: الشكر، قائمة قصيرة بالمهام، أين يجد الملفات، وأنّه يستطيع الاتّصال بك للحالات الطارئة.', minWords: 80, maxWords: 120,
    register: 'informeel', points: [
      { ar: 'اشكره على عرضه', any: ['bedankt', 'dank', 'fijn dat', 'aardig van je', 'top dat'] },
      { ar: 'اذكر المهام التي سيتولّاها', any: ['post', 'klanten', 'terugbellen', 'agenda', 'bijhouden', 'taken'] },
      { ar: 'قل له أين يجد المستندات', any: ['map', 'bureau', 'lade', 'kast', 'schijf', 'documenten', 'vind je', 'staat in'] },
      { ar: 'قل له أن يتّصل بك في الطوارئ', any: ['bellen', 'bel me', 'noodgeval', 'nood', 'telefoon', 'bereikbaar', 'app me'] },
    ] },
  { id: 'w5', kind: 'verzoek', ar: 'طلب إلى البلدية — نفايات كبيرة', titleNl: 'Grofvuil laten ophalen', briefNl: 'U wilt een oude bank en een matras laten ophalen door de gemeente. Schrijf een e-mail aan de afdeling Afval waarin u: (1) zegt welke spullen het zijn, (2) uw adres noemt, (3) vraagt op welke dagen ophalen mogelijk is, (4) vraagt of er kosten aan verbonden zijn.', briefAr: 'تريد أن تأخذ البلدية أريكة قديمة ومرتبة. اكتب بريدًا إلى قسم النفايات تذكر فيه: ما هي الأغراض، عنوانك، سؤالًا عن الأيام المتاحة، وسؤالًا عن التكلفة.', minWords: 80, maxWords: 120,
    register: 'formeel', points: [
      { ar: 'حدّد الأغراض المطلوب أخذها', any: ['bank', 'matras', 'meubel', 'grofvuil', 'oude spullen', 'kast'] },
      { ar: 'اذكر عنوانك', any: ['adres', 'woon', 'straat', 'laan', 'plein', 'weg', 'nummer'] },
      { ar: 'اسأل عن الأيام الممكنة', any: ['welke dag', 'wanneer', 'mogelijk', 'datum', 'ophalen op', 'welke dagen'] },
      { ar: 'اسأل عن التكلفة', any: ['kosten', 'gratis', 'betalen', 'prijs', 'tarief', 'hoeveel'] },
    ] },
  { id: 'w6', kind: 'email', ar: 'ردّ على دعوة المدرسة', titleNl: 'Reactie op de uitnodiging van school', briefNl: 'De school van uw dochter nodigt u uit voor de rapportgesprekken op maandag en woensdag. U kunt op beide avonden niet komen, omdat u dan avonddienst heeft. Schrijf een e-mail aan de administratie waarin u: (1) bedankt voor de uitnodiging, (2) uitlegt dat en waarom u niet kunt komen, (3) een ander moment voorstelt, (4) vraagt of een telefonisch gesprek mogelijk is.', briefAr: 'دعتك مدرسة ابنتك إلى جلستَي مناقشة التقرير، ولا تستطيع الحضور في أي منهما بسبب دوامك المسائي. اكتب بريدًا إلى الإدارة: الشكر على الدعوة، سبب عدم الحضور، اقتراح موعد آخر، وسؤال عن إمكانية مكالمة هاتفية.', minWords: 70, maxWords: 110,
    register: 'formeel', points: [
      { ar: 'اشكرهم على الدعوة', any: ['bedankt', 'dank u', 'hartelijk dank', 'dank voor de uitnodiging'] },
      { ar: 'اذكر أنك لا تستطيع الحضور وسببه', any: ['kan niet', 'niet komen', 'helaas', 'avonddienst', 'moet werken', 'werk'] },
      { ar: 'اقترح موعدًا بديلًا', any: ['ander moment', 'andere dag', 'later', 'volgende week', 'voorstel', 'misschien', 'zou het lukken'] },
      { ar: 'اسأل عن مكالمة هاتفية', any: ['telefonisch', 'bellen', 'telefoon', 'per telefoon', 'opbellen'] },
    ] },
  { id: 'w7', kind: 'sollicitatiebrief', ar: 'رسالة تقديم لوظيفة', titleNl: 'Sollicitatie bijbaan bibliotheek', briefNl: 'De bibliotheek in uw wijk zoekt een medewerker voor de balie, twaalf uur per week. Schrijf een sollicitatiebrief waarin u: (1) zegt op welke functie u reageert, (2) uw ervaring of sterke punten noemt, (3) zegt wanneer u beschikbaar bent, (4) vraagt om een gesprek.', briefAr: 'تبحث مكتبة الحي عن موظّف استقبال 12 ساعة أسبوعيًا. اكتب رسالة تقديم: الوظيفة التي تتقدّم لها، خبرتك أو نقاط قوّتك، أوقات توفّرك، وطلب مقابلة.', minWords: 100, maxWords: 150,
    register: 'formeel', points: [
      { ar: 'حدّد الوظيفة التي تتقدّم لها', any: ['solliciteer', 'vacature', 'functie', 'baan', 'medewerker', 'balie'] },
      { ar: 'اذكر خبرتك أو نقاط قوّتك', any: ['ervaring', 'gewerkt', 'ik ben goed', 'sterk', 'ik kan', 'geleerd', 'vaardig'] },
      { ar: 'اذكر أوقات توفّرك', any: ['beschikbaar', 'uren', 'avond', 'weekend', 'per week', 'dagen', 'middag'] },
      { ar: 'اطلب مقابلة', any: ['gesprek', 'uitnodiging', 'kennismaken', 'toelichten', 'graag uitleggen'] },
    ] },
  { id: 'w8', kind: 'bericht', ar: 'رسالة في تطبيق الحي — استعارة أدوات', titleNl: 'Gereedschap lenen in de buurtapp', briefNl: 'U wilt een boormachine lenen van iemand in de buurt. Schrijf een kort bericht in de buurtapp waarin u: (1) zegt wat u zoekt, (2) uitlegt waarvoor u het nodig heeft, (3) zegt wanneer u het nodig heeft en wanneer u het terugbrengt, (4) zegt hoe men u kan bereiken.', briefAr: 'تريد استعارة مثقاب من أحد سكّان الحي. اكتب رسالة قصيرة في تطبيق الحي: ما تبحث عنه، لماذا تحتاجه، متى تحتاجه ومتى تُعيده، وكيف يتواصلون معك.', minWords: 50, maxWords: 80,
    register: 'informeel', points: [
      { ar: 'قل ما تبحث عنه', any: ['lenen', 'boormachine', 'ladder', 'gereedschap', 'nodig', 'zoek'] },
      { ar: 'اشرح لماذا تحتاجه', any: ['omdat', 'want', 'ik moet', 'klus', 'ophangen', 'repareren', 'boren'] },
      { ar: 'اذكر وقت الاستعارة ووقت الإرجاع', any: ['zaterdag', 'zondag', 'morgen', 'vandaag', 'terug', 'breng ik', 'uurtje', 'dezelfde dag'] },
      { ar: 'قل كيف يتواصلون معك', any: ['app', 'bericht', 'bel', 'stuur', 'reageer', 'nummer', 'laat weten'] },
    ] },
  { id: 'w9', kind: 'klachtbrief', ar: 'شكوى إلى المالك — إزعاج', titleNl: 'Klacht over geluidsoverlast', briefNl: 'De bovenburen maken al twee maanden bijna elke nacht harde muziek. U heeft er al een keer over gesproken, maar er is niets veranderd. Schrijf een brief aan uw verhuurder waarin u: (1) het probleem beschrijft, (2) zegt wanneer het gebeurt, (3) uitlegt wat u zelf al heeft gedaan, (4) duidelijk zegt wat u van de verhuurder verwacht.', briefAr: 'الجيران في الطابق الأعلى يشغّلون موسيقى صاخبة كل ليلة منذ شهرين، وتحدّثت معهم مرّة بلا نتيجة. اكتب رسالة إلى المالك: وصف المشكلة، وقت حدوثها، ما فعلته بنفسك، وما تتوقّعه منه.', minWords: 90, maxWords: 130,
    register: 'formeel', points: [
      { ar: 'صِف المشكلة', any: ['lawaai', 'geluid', 'harde muziek', 'overlast', 'herrie', 'muziek'] },
      { ar: 'اذكر وقت حدوثها', any: ['nacht', 'avond', 'weekend', 'elke', 'uur', 'twee maanden', 'iedere'] },
      { ar: 'اذكر ما فعلته بنفسك', any: ['gesproken', 'gepraat', 'aangebeld', 'gevraagd', 'al eerder', 'gemeld', 'geprobeerd'] },
      { ar: 'اذكر ما تتوقّعه من المالك', any: ['oplossing', 'maatregel', 'actie', 'verzoek', 'verwacht', 'helpen', 'optreden'] },
    ] },
  { id: 'w10', kind: 'email', ar: 'بريد إلى مدرسة اللغة — تغيير الفصل', titleNl: 'Van cursusgroep veranderen', briefNl: 'U volgt een avondcursus Nederlands, maar de groep gaat te langzaam voor u. Schrijf een e-mail aan de taalschool waarin u: (1) zegt welke cursus u nu volgt, (2) uitlegt waarom u wilt veranderen, (3) zegt naar welke groep u wilt, (4) vraagt hoe dat werkt en of er extra kosten zijn.', briefAr: 'تتابع دورة مسائية في الهولندية، لكن المجموعة بطيئة عليك. اكتب بريدًا إلى المدرسة: الدورة الحالية، سبب رغبتك في التغيير، المجموعة التي تريدها، وسؤالًا عن الإجراء والتكلفة.', minWords: 80, maxWords: 120,
    register: 'formeel', points: [
      { ar: 'حدّد دورتك الحالية', any: ['cursus', 'groep', 'les', 'niveau', 'avondgroep', 'klas'] },
      { ar: 'اشرح سبب التغيير', any: ['omdat', 'want', 'te langzaam', 'te makkelijk', 'te moeilijk', 'tempo', 'reistijd'] },
      { ar: 'اذكر المجموعة التي تريدها', any: ['overstappen', 'veranderen', 'andere groep', 'ander niveau', 'wisselen', 'hoger'] },
      { ar: 'اسأل عن الإجراء والتكلفة', any: ['kosten', 'extra betalen', 'hoe werkt', 'procedure', 'mogelijk', 'wanneer kan'] },
    ] },
]

export const EXAM_SPEAKING: ExamSpeakingItem[] = [
  { id: 's1', deel: 1, sec: 20, ar: 'ردّ قصير — صديق يطلب مساعدة', situatieNl: 'Een vriend belt u en vraagt of u zaterdagochtend kunt helpen met verhuizen. U kunt niet, want u heeft al iets anders gepland.', taakNl: 'Wat zegt u tegen uw vriend? (ongeveer 20 seconden)', voorbeeldNl: "Sorry, helaas kan ik zaterdag niet. Ik heb al een afspraak bij de tandarts 's ochtends. Maar als je hulp nodig hebt op zondag, dan kom ik graag langs!", situatieAr: 'يتّصل بك صديق ويسألك إن كنت تستطيع مساعدته في الانتقال صباح السبت. لا تستطيع لأنّ لديك التزامًا آخر.', taakAr: 'ماذا تقول لصديقك؟ (20 ثانية تقريبًا)' },
  { id: 's2', deel: 1, sec: 20, ar: 'ردّ قصير — في عيادة الطبيب', situatieNl: 'U zit in de wachtkamer bij de huisarts. De assistente roept een naam die u niet goed verstaat. U denkt dat het uw naam is.', taakNl: 'Wat vraagt u aan de assistente?', voorbeeldNl: 'Sorry, ik verstond u niet goed. Zei u "Hassan" of "Hussein"? Want ik ben Hassan en heb een afspraak om half elf.', situatieAr: 'أنت في غرفة الانتظار عند طبيب العائلة. تنادي السكرتيرة اسمًا لم تسمعه بوضوح. تظنّ أنه اسمك.', taakAr: 'ماذا تسأل السكرتيرة؟' },
  { id: 's3', deel: 2, sec: 30, ar: 'ردّ موسّع — اقتراح حلّ في العمل', situatieNl: "Op uw werk klagen veel collega's dat de pauzeruimte te klein en rommelig is. Tijdens een vergadering vraagt uw manager om ideeën om de situatie te verbeteren.", taakNl: 'Geef uw mening en doe minstens twee concrete voorstellen. (ongeveer 30 seconden)', voorbeeldNl: 'Ik begrijp de klachten, want soms is er echt geen vrij stoel. Ik denk dat we twee dingen kunnen doen. Ten eerste: een eenvoudige opruimregel — wie iets pakt, ruimt het ook op. En ten tweede: misschien kunnen we een paar pauzetijden uit elkaar trekken, zodat niet iedereen tegelijk in de ruimte zit.', situatieAr: 'في عملك يشتكي الزملاء من ضيق غرفة الاستراحة وفوضويتها. في الاجتماع يطلب المدير أفكارًا.', taakAr: 'أعطِ رأيك واقترح حلّين عمليّين. (30 ثانية تقريبًا)' },
  { id: 's4', deel: 2, sec: 30, ar: 'ردّ موسّع — تجربة شخصية', situatieNl: 'Een vriendin vertelt dat ze graag wil leren autorijden, maar bang is voor het examen. U heeft uw rijbewijs vorig jaar gehaald.', taakNl: 'Vertel kort hoe het bij u ging en geef twee tips. (ongeveer 30 seconden)', voorbeeldNl: 'Ik snap je angst goed, ik was ook erg zenuwachtig. Maar het viel uiteindelijk mee. Mijn eerste tip: doe vlak voor het examen geen extra rijles meer, dan kom je rustiger aan. En tweede tip: vergeet niet hardop te kijken in de spiegels — examinatoren letten daar echt op.', situatieAr: 'صديقتك تريد تعلّم القيادة وخائفة من الامتحان. أنت أخذت الرخصة العام الماضي.', taakAr: 'احكِ تجربتك واعطِ نصيحتين. (30 ثانية تقريبًا)' },

  /* ── الجزء الأوّل: ردود قصيرة ── */
  { id: 's5', deel: 1, sec: 20, ar: 'ردّ قصير — ساعي البريد عند الباب',
    situatieNl: 'Er staat een pakketbezorger aan de deur met een pakket voor uw bovenburen. Zij zijn niet thuis. U bent vandaag de hele middag thuis.',
    taakNl: 'Wat zegt u tegen de bezorger?',
    voorbeeldNl: 'Mijn bovenburen zijn nu niet thuis. Ik ben de hele middag hier. Als u wilt, neem ik het pakket aan. Dan geef ik het vanavond aan hen.',
    situatieAr: 'عند الباب ساعي بريد يحمل طردًا لجيرانك في الطابق الأعلى، وهم غير موجودين. أنت في البيت طوال بعد الظهر.',
    taakAr: 'ماذا تقول لساعي البريد؟' },
  { id: 's6', deel: 1, sec: 20, ar: 'ردّ قصير — نقص في الباقي',
    situatieNl: 'U heeft in een winkel afgerekend met twintig euro. Uw boodschappen kostten dertien euro, maar u krijgt maar twee euro terug.',
    taakNl: 'Wat zegt u tegen de kassamedewerker?',
    voorbeeldNl: 'Sorry, ik denk dat er iets niet klopt. Ik heb u twintig euro gegeven. De boodschappen waren dertien euro. Dan moet ik zeven euro terugkrijgen.',
    situatieAr: 'دفعت عشرين يورو ومشترياتك ثلاثة عشر، لكنك استلمت يورويْن فقط.',
    taakAr: 'ماذا تقول لموظّف الصندوق؟' },
  { id: 's7', deel: 1, sec: 20, ar: 'ردّ قصير — طلب تبديل دوام',
    situatieNl: 'Een collega vraagt of u zaterdag zijn hele dienst kunt overnemen, van acht tot vijf. U kunt alleen tot een uur, want daarna heeft u een afspraak.',
    taakNl: 'Wat antwoordt u uw collega?',
    voorbeeldNl: 'Ik wil je graag helpen. Maar de hele dag lukt niet. Ik kan van acht tot een uur werken. Daarna heb ik een afspraak die ik niet kan verzetten.',
    situatieAr: 'يطلب زميلك أن تتولّى دوامه السبت كاملًا، من الثامنة إلى الخامسة. أنت تستطيع حتى الواحدة فقط.',
    taakAr: 'بماذا تجيبه؟' },
  { id: 's8', deel: 1, sec: 20, ar: 'ردّ قصير — تأخّر بسبب القطار',
    situatieNl: 'U staat op het perron. Uw trein rijdt niet door een storing en u komt zeker een half uur te laat op uw werk. U belt uw leidinggevende.',
    taakNl: 'Wat zegt u tegen uw leidinggevende?',
    voorbeeldNl: 'Goedemorgen, met Amjad. Ik sta op het station en mijn trein rijdt niet. Er is een storing. Ik denk dat ik een half uur later ben. Het spijt me.',
    situatieAr: 'قطارك متوقّف بسبب عطل وستتأخّر عن العمل نصف ساعة. تتّصل بمديرك.',
    taakAr: 'ماذا تقول لمديرك؟' },
  { id: 's9', deel: 1, sec: 20, ar: 'ردّ قصير — الصيدلية مغلقة',
    situatieNl: 'U heeft net een recept gekregen van de huisarts. De apotheek in de buurt is al gesloten en u heeft het medicijn vandaag nodig.',
    taakNl: 'Wat vraagt u aan de doktersassistente?',
    voorbeeldNl: 'Ik heb dit medicijn vandaag nodig. De apotheek hier is al dicht. Weet u een apotheek die nog open is? Of kan het recept digitaal doorgestuurd worden?',
    situatieAr: 'حصلت على وصفة والصيدلية القريبة أُغلقت، وتحتاج الدواء اليوم.',
    taakAr: 'ماذا تسأل مساعدة الطبيب؟' },
  { id: 's10', deel: 1, sec: 20, ar: 'ردّ قصير — طلب موقف السيّارة',
    situatieNl: 'Uw buurman vraagt of hij uw parkeerplaats een week mag gebruiken, omdat er bij hem wordt gewerkt. U heeft uw auto die week zelf nodig.',
    taakNl: 'Wat zegt u tegen uw buurman?',
    voorbeeldNl: 'Dat is jammer, maar die week gebruik ik mijn auto elke dag. Ik kan de plek niet missen. Misschien kunt u de plek van nummer acht vragen.',
    situatieAr: 'يطلب جارك موقفك لمدّة أسبوع بسبب أعمال في بيته، لكنك تحتاج سيّارتك ذلك الأسبوع.',
    taakAr: 'ماذا تقول لجارك؟' },

  /* ── الجزء الثاني: ردود موسّعة ── */
  { id: 's11', deel: 2, sec: 30, ar: 'حكاية — ما حدث أمس في العمل',
    situatieNl: 'Gisteren ging er op uw werk iets mis: een klant kreeg de verkeerde bestelling mee en werd boos. U heeft het samen met de teamleider opgelost. Vandaag vertelt u het aan een collega die er niet was.',
    taakNl: 'Vertel uw collega wat er gisteren is gebeurd en hoe het is opgelost.',
    voorbeeldNl: 'Gisteren was het echt onrustig. Een klant kreeg de verkeerde bestelling mee. Hij kwam terug en was heel boos. Ik heb hem eerst rustig laten vertellen. Daarna heb ik de teamleider gehaald. We hebben de juiste spullen meegegeven en korting gegeven. Uiteindelijk ging hij tevreden weg.',
    situatieAr: 'أمس حصل خطأ في العمل: استلم زبون طلبًا خاطئًا وغضب، وحلَلتَ الأمر مع رئيس الفريق. اليوم تحكي لزميل لم يكن موجودًا.',
    taakAr: 'احكِ ما حدث وكيف حُلّ. (30 ثانية تقريبًا)' },
  { id: 's12', deel: 2, sec: 30, ar: 'إقناع — القطار أفضل من السيّارة',
    situatieNl: 'Uw vriend wil met de auto naar Amsterdam voor een dagje uit. U denkt dat de trein een beter idee is.',
    taakNl: 'Overtuig uw vriend om de trein te nemen. Geef twee redenen.',
    voorbeeldNl: 'Ik zou echt de trein nemen. Er zijn twee redenen. Ten eerste is parkeren in het centrum heel duur. Een dag kost je al snel meer dan een treinkaartje. Ten tweede staat het op de snelweg vaak vast. Met de trein weet je precies hoe lang je onderweg bent.',
    situatieAr: 'صديقك يريد الذهاب بالسيّارة إلى أمستردام، وأنت ترى أنّ القطار أفضل.',
    taakAr: 'أقنعه بأخذ القطار، مع ذكر سببين. (30 ثانية تقريبًا)' },
  { id: 's13', deel: 2, sec: 30, ar: 'نصيحة — سيّارة مستعملة بلا فحص',
    situatieNl: 'Een kennis wil morgen een goedkope tweedehands auto kopen van iemand die hij niet kent. Hij wil de auto niet laten keuren, want dat kost geld.',
    taakNl: 'Geef uw kennis een advies en leg uit waarom.',
    voorbeeldNl: 'Ik zou dat niet doen. Laat de auto eerst keuren. Een keuring kost misschien honderd euro. Maar een kapotte motor kost duizenden euro. Vraag ook naar het onderhoudsboekje. Als de verkoper dat niet wil laten zien, zou ik zoeken naar een andere auto.',
    situatieAr: 'معرفة لك يريد شراء سيّارة مستعملة رخيصة غدًا من شخص لا يعرفه، ويرفض الفحص لأنّه مكلف.',
    taakAr: 'أعطِ نصيحتك واشرح سببها. (30 ثانية تقريبًا)' },
  { id: 's14', deel: 2, sec: 30, ar: 'تفضيل مع تبرير — عرض أم تقرير',
    situatieNl: 'Uw docent geeft u een keuze voor de eindopdracht: een presentatie van tien minuten geven, of een verslag van twee pagina’s schrijven.',
    taakNl: 'Zeg wat u liever doet en geef twee redenen.',
    voorbeeldNl: 'Ik geef liever een presentatie. Daar heb ik twee redenen voor. Ten eerste wil ik mijn spreekvaardigheid oefenen, want daar heb ik het meeste moeite mee. Ten tweede leer ik meer als ik vragen krijg van de groep. Bij een verslag blijft alles op papier.',
    situatieAr: 'يمنحك مدرّسك اختيارًا: عرض شفهي عشر دقائق أو تقرير من صفحتين.',
    taakAr: 'قل ما تفضّله واذكر سببين. (30 ثانية تقريبًا)' },
  { id: 's15', deel: 2, sec: 30, ar: 'شكوى — هاتف جديد ببطارية ضعيفة',
    situatieNl: 'U heeft twee weken geleden een nieuwe telefoon gekocht. De batterij is na drie uur al leeg, ook als u de telefoon bijna niet gebruikt. U staat nu in de winkel.',
    taakNl: 'Vertel de verkoper waar u niet tevreden over bent en wat u wilt.',
    voorbeeldNl: 'Ik ben hier niet tevreden over. Ik heb deze telefoon twee weken geleden gekocht. De batterij is na drie uur leeg. Ik gebruik hem bijna niet. Ik heb hem al helemaal opnieuw ingesteld, maar dat helpt niet. Ik wil graag een nieuw toestel of mijn geld terug.',
    situatieAr: 'اشتريت هاتفًا قبل أسبوعين وبطاريته تفرغ بعد ثلاث ساعات حتى بلا استخدام. أنت الآن في المتجر.',
    taakAr: 'اذكر سبب عدم رضاك وما تطلبه. (30 ثانية تقريبًا)' },
  { id: 's16', deel: 2, sec: 30, ar: 'وصف — جاكيت مفقود',
    situatieNl: 'U bent uw jas kwijtgeraakt in het zwembad. Het is een donkerblauwe winterjas met een capuchon, een kapotte rits en uw buspas in de linkerzak.',
    taakNl: 'Beschrijf uw jas zo precies mogelijk aan de medewerker.',
    voorbeeldNl: 'Het is een donkerblauwe winterjas. Hij heeft een capuchon met bont. De rits is kapot aan de onderkant. Er zit een klein wit vlekje op de rechtermouw. In de linkerzak zit mijn buspas. Op het labeltje staat maat large.',
    situatieAr: 'فقدت جاكيتك في المسبح: شتوي أزرق غامق بقلنسوة، سحّابه معطوب، وبطاقة الباص في الجيب الأيسر.',
    taakAr: 'صِف الجاكيت بدقّة للموظّف. (30 ثانية تقريبًا)' },
  { id: 's17', deel: 2, sec: 30, ar: 'حكاية — حملة تنظيف الشارع',
    situatieNl: 'U heeft samen met vier buren een opruimactie in de straat georganiseerd. Er kwamen achttien mensen, ook kinderen. De gemeente gaf gratis vuilniszakken en handschoenen. Na twee uur was de straat schoon.',
    taakNl: 'Vertel uw buurvrouw over de actie.',
    voorbeeldNl: 'We hebben zaterdag een opruimactie gehouden. Er kwamen achttien mensen, ook veel kinderen. De gemeente gaf ons gratis zakken en handschoenen. We zijn om tien uur begonnen. Na twee uur was de hele straat schoon. Daarna hebben we samen koffie gedronken.',
    situatieAr: 'نظّمت مع أربعة جيران حملة تنظيف للشارع. حضر ثمانية عشر شخصًا، والبلدية قدّمت أكياسًا وقفّازات مجانًا، ونظُف الشارع في ساعتين.',
    taakAr: 'احكِ لجارتك عن الحملة. (30 ثانية تقريبًا)' },
  { id: 's18', deel: 2, sec: 30, ar: 'إقناع — تغيير جدول التنظيف',
    situatieNl: 'U woont met drie huisgenoten. Het schoonmaakschema is per week, maar er blijft altijd werk liggen. U wilt vaste taken per persoon in plaats van een weekrooster.',
    taakNl: 'Overtuig uw huisgenoten van uw voorstel. Geef twee redenen.',
    voorbeeldNl: 'Ik wil het schema graag veranderen. Ik heb daar twee redenen voor. Ten eerste weet nu niemand precies wat zijn taak is. Daarom blijft er werk liggen. Ten tweede is het eerlijker met vaste taken. Dan doet iedereen elke week hetzelfde en kan niemand het vergeten.',
    situatieAr: 'تشارك المنزل مع ثلاثة، وجدول التنظيف الأسبوعي لا ينجح. تريد مهامًا ثابتة لكل شخص.',
    taakAr: 'أقنع رفاقك باقتراحك مع سببين. (30 ثانية تقريبًا)' },
  { id: 's19', deel: 2, sec: 30, ar: 'شرح طريقة — تنظيف ماكينة القهوة',
    situatieNl: 'U werkt in een kantoor. Een nieuwe collega moet leren hoe hij de koffiemachine schoonmaakt: eerst uitzetten, dan het bakje leegmaken, het waterreservoir omspoelen en een schoonmaaktablet gebruiken.',
    taakNl: 'Leg uw nieuwe collega stap voor stap uit hoe hij dat doet.',
    voorbeeldNl: 'Het is niet moeilijk. Zet de machine eerst helemaal uit. Haal daarna het bakje eronder weg en gooi het leeg. Spoel het waterreservoir om met koud water. Zet dan een schoonmaaktablet in het bovenste vakje. Start het programma en wacht tien minuten.',
    situatieAr: 'زميل جديد يجب أن يتعلّم تنظيف ماكينة القهوة: الإطفاء، تفريغ الحوض، غسل خزّان الماء، ثم قرص التنظيف.',
    taakAr: 'اشرح له الخطوات بالترتيب. (30 ثانية تقريبًا)' },
  { id: 's20', deel: 2, sec: 30, ar: 'نصيحة — دورة مسائية أم في نهاية الأسبوع',
    situatieNl: 'Een vriendin twijfelt tussen een taalcursus op twee avonden per week en een cursus op zaterdagmorgen. Zij werkt fulltime en heeft twee jonge kinderen.',
    taakNl: 'Geef haar een advies en leg uit waarom.',
    voorbeeldNl: 'Ik zou de zaterdagmorgen kiezen. Na een volle werkdag ben je meestal te moe om te leren. Op zaterdag is je hoofd nog fris. Bovendien kan je partner dan op de kinderen passen. Twee avonden per week is veel, en dan zie je je kinderen bijna niet.',
    situatieAr: 'صديقتك تحتار بين دورة لغة مسائيّتين في الأسبوع أو دورة صباح السبت. تعمل بدوام كامل ولديها طفلان صغيران.',
    taakAr: 'أعطِها نصيحتك واشرح السبب. (30 ثانية تقريبًا)' },
  { id: 's21', deel: 1, sec: 20, ar: 'ردّ قصير — مكالمة مشتبهة',
    situatieNl: 'Iemand belt u op en zegt dat u een prijs heeft gewonnen. Hij vraagt uw bankgegevens om het geld over te maken. U heeft nooit meegedaan aan een prijsvraag.',
    taakNl: 'Wat zegt u tegen die persoon?',
    voorbeeldNl: 'Ik heb nooit meegedaan aan een prijsvraag. Ik geef mijn bankgegevens nooit door de telefoon. Als het echt is, stuurt u mij een brief. Ik hang nu op.',
    situatieAr: 'يتّصل بك أحد ويقول إنّك فزت بجائزة، ويطلب بيانات حسابك البنكي. أنت لم تشارك في أي مسابقة.',
    taakAr: 'ماذا تقول له؟' },
  { id: 's22', deel: 1, sec: 20, ar: 'ردّ قصير — بطاقة نقل مفقودة',
    situatieNl: 'Uw zoon van twaalf is zijn persoonlijke OV-chipkaart kwijt. U staat bij de servicebalie op het station.',
    taakNl: 'Wat vraagt u aan de medewerker?',
    voorbeeldNl: 'Mijn zoon van twaalf is zijn OV-chipkaart kwijt. Kunt u die blokkeren? En hoe vraag ik een nieuwe aan? Ik wil ook weten of het abonnement erop blijft staan.',
    situatieAr: 'فقد ابنك ذو الاثني عشر عامًا بطاقة النقل الشخصية. أنت عند مكتب الخدمة في المحطّة.',
    taakAr: 'ماذا تسأل الموظّف؟' },
  { id: 's23', deel: 2, sec: 30, ar: 'حكاية — سبب الغياب عن الدرس',
    situatieNl: 'U was vorige week twee lessen niet aanwezig, omdat uw moeder in het ziekenhuis lag en u voor haar zorgde. U heeft het huiswerk wel thuis gemaakt.',
    taakNl: 'Vertel uw docent waarom u er niet was en wat u heeft gedaan.',
    voorbeeldNl: 'Sorry dat ik er vorige week niet was. Mijn moeder lag in het ziekenhuis. Ik moest voor haar zorgen en ook mijn broertje ophalen van school. Ik heb het huiswerk wel thuis gemaakt. Kunt u mij zeggen wat ik nog gemist heb?',
    situatieAr: 'غِبت عن درسين الأسبوع الماضي لأنّ والدتك كانت في المستشفى وكنت ترعاها، لكنك أنجزت الواجب في البيت.',
    taakAr: 'اشرح لمدرّسك سبب الغياب وما فعلته. (30 ثانية تقريبًا)' },
  { id: 's24', deel: 2, sec: 30, ar: 'إقناع — تعديل ساعات العمل',
    situatieNl: 'U begint nu elke dag om half acht. U wilt om negen uur beginnen, omdat u eerst uw kinderen naar school brengt. Uw werk wordt daardoor niet minder.',
    taakNl: 'Overtuig uw werkgever van uw verzoek. Geef twee redenen.',
    voorbeeldNl: 'Ik wil graag om negen uur beginnen in plaats van half acht. Daar heb ik twee redenen voor. Ten eerste breng ik mijn kinderen zelf naar school. Nu red ik dat niet. Ten tweede werk ik hetzelfde aantal uren, want ik blijf gewoon later. Voor het team verandert er dus niets.',
    situatieAr: 'تبدأ العمل السابعة والنصف وتريد التاسعة لأنّك توصل أطفالك إلى المدرسة، وساعات عملك لن تنقص.',
    taakAr: 'أقنع ربّ عملك بطلبك مع سببين. (30 ثانية تقريبًا)' },
  { id: 's25', deel: 2, sec: 30, ar: 'شكوى — تدفئة لا تعمل',
    situatieNl: 'In uw huurwoning wordt de verwarming in de woonkamer niet warm. Het is al drie weken zo. U heeft het twee keer gemeld, maar er is niemand gekomen. Buiten is het vijf graden.',
    taakNl: 'Vertel uw huisbaas waar u niet tevreden over bent en wat u verwacht.',
    voorbeeldNl: 'Ik bel weer over de verwarming. Die wordt al drie weken niet warm in de woonkamer. Ik heb het twee keer gemeld. Er is nog niemand geweest. Buiten is het vijf graden en mijn kinderen zijn verkouden. Ik verwacht dat er deze week een monteur komt.',
    situatieAr: 'تدفئة غرفة الجلوس في مسكنك المستأجر لا تعمل منذ ثلاثة أسابيع، وأبلغت مرّتين بلا نتيجة، والحرارة في الخارج خمس درجات.',
    taakAr: 'اذكر للمالك سبب عدم رضاك وما تتوقّعه. (30 ثانية تقريبًا)' },
  { id: 's26', deel: 2, sec: 30, ar: 'شرح طريقة — فرز النفايات في الشارع',
    situatieNl: 'Er is een nieuwe buurvrouw komen wonen. Zij weet niet hoe het afval in deze straat werkt: de groene bak gaat elke week op maandag aan de straat, de grijze bak elke vier weken, en papier gaat naar de container op de hoek.',
    taakNl: 'Leg uw nieuwe buurvrouw uit hoe het afval hier werkt.',
    voorbeeldNl: 'Ik leg het graag uit. De groene bak zet u elke maandag aan de straat. Dat is voor groente, fruit en tuinafval. De grijze bak wordt maar één keer per vier weken geleegd. Papier en karton brengt u zelf naar de container op de hoek. Voor grote spullen belt u de gemeente.',
    situatieAr: 'جارة جديدة لا تعرف نظام النفايات في الشارع: الحاوية الخضراء كل اثنين، الرمادية كل أربعة أسابيع، والورق إلى حاوية الزاوية.',
    taakAr: 'اشرح لها النظام. (30 ثانية تقريبًا)' },
  { id: 's27', deel: 2, sec: 30, ar: 'نصيحة — ترك الدراسة',
    situatieNl: 'Uw neef van achttien wil stoppen met zijn opleiding, twee maanden voor zijn examen. Hij vindt het te zwaar. Hij heeft nog geen ander plan en geen baan.',
    taakNl: 'Geef uw neef een advies en geef twee redenen.',
    voorbeeldNl: 'Ik zou nu niet stoppen. Daar heb ik twee redenen voor. Ten eerste is het examen al over twee maanden. Als je nu stopt, is al dat werk voor niets. Ten tweede heb je nog geen plan en geen baan. Praat eerst met je mentor. Misschien kun je extra hulp krijgen.',
    situatieAr: 'ابن عمّك في الثامنة عشرة يريد ترك دراسته قبل شهرين من الامتحان لأنّها ثقيلة، وليس لديه خطّة ولا عمل.',
    taakAr: 'أعطِه نصيحتك مع سببين. (30 ثانية تقريبًا)' },
  { id: 's28', deel: 2, sec: 30, ar: 'تفضيل مع تبرير — موعد التدريب',
    situatieNl: 'Uw sportclub wil de training verplaatsen. Er zijn twee opties: maandagavond om acht uur, of zaterdagmorgen om negen uur. De trainer vraagt de leden om hun voorkeur met uitleg.',
    taakNl: 'Zeg welke optie u liever heeft en geef twee redenen.',
    voorbeeldNl: 'Ik heb liever de zaterdagmorgen. Ik heb daar twee redenen voor. Ten eerste ben ik op maandagavond na mijn werk vaak te moe om goed te trainen. Ten tweede kunnen we op zaterdag langer doorgaan en daarna samen iets drinken. Dat is ook goed voor de groep.',
    situatieAr: 'نادي الرياضة يريد نقل التدريب: إمّا الاثنين الثامنة مساءً أو السبت التاسعة صباحًا، والمدرّب يسأل عن تفضيلك مع التبرير.',
    taakAr: 'قل ما تفضّله واذكر سببين. (30 ثانية تقريبًا)' },
  { id: 's29', deel: 1, sec: 20, ar: 'ردّ قصير — طبق خطأ في المطعم',
    situatieNl: 'U heeft in een restaurant soep met brood besteld. De kelner brengt u een salade met kip. U heeft niet veel tijd, want u moet over een half uur weg.',
    taakNl: 'Wat zegt u tegen de kelner?',
    voorbeeldNl: 'Sorry, dit heb ik niet besteld. Ik had soep met brood gevraagd. Kunt u het ruilen? En kan het snel, want ik moet over een half uur weg.',
    situatieAr: 'طلبت شوربة مع خبز فجاءتك سلطة بالدجاج، ولديك نصف ساعة فقط.',
    taakAr: 'ماذا تقول للنادل؟' },
  { id: 's30', deel: 1, sec: 20, ar: 'ردّ قصير — غريب يطلب هاتفك',
    situatieNl: 'Op straat vraagt een onbekende man of hij uw telefoon mag gebruiken om te bellen. Hij zegt dat zijn batterij leeg is. U vertrouwt het niet helemaal.',
    taakNl: 'Wat zegt u tegen die man?',
    voorbeeldNl: 'Ik geef mijn telefoon liever niet uit mijn hand. Maar ik wil u wel helpen. Zeg het nummer maar, dan bel ik voor u en zet ik het op de luidspreker.',
    situatieAr: 'يطلب رجل مجهول في الشارع استخدام هاتفك لأنّ بطاريته فرغت، وأنت غير مطمئن تمامًا.',
    taakAr: 'ماذا تقول له؟' },
  { id: 's31', deel: 2, sec: 30, ar: 'حكاية — أوّل أسبوع في القسم الجديد',
    situatieNl: 'U bent vorige week overgeplaatst naar een andere afdeling. De eerste dag was verwarrend, maar uw nieuwe collega heeft u goed geholpen. Nu kent u het systeem al.',
    taakNl: 'Vertel een oude collega over uw eerste week.',
    voorbeeldNl: 'De eerste dag was best verwarrend. Alles ging anders dan bij ons. Ik wist niet waar de spullen lagen. Mijn nieuwe collega Fatima heeft me overal rondgeleid. Ze heeft het systeem twee keer uitgelegd. Nu snap ik het al. Volgende week ga ik zelf een nieuwe kracht inwerken.',
    situatieAr: 'نُقلت الأسبوع الماضي إلى قسم آخر. اليوم الأول كان مربكًا، لكن زميلتك الجديدة ساعدتك، وصرت تعرف النظام.',
    taakAr: 'احكِ لزميل قديم عن أسبوعك الأول. (30 ثانية تقريبًا)' },
  { id: 's32', deel: 2, sec: 30, ar: 'وصف — درّاجة مسروقة',
    situatieNl: 'Uw fiets is gestolen bij het station. Het is een zwarte damesfiets met een bruin zadel, een mand voorop, een rode streep op het achterspatbord en een slot met een sleutel die u nog heeft.',
    taakNl: 'Beschrijf uw fiets bij de politie zo precies mogelijk.',
    voorbeeldNl: 'Het is een zwarte damesfiets. Het zadel is bruin en een beetje versleten. Voorop zit een rieten mand. Op het achterspatbord staat een rode streep. Het slot zat aan het achterwiel. Ik heb de sleutel nog bij me. Het framenummer staat op mijn aankoopbon.',
    situatieAr: 'سُرقت درّاجتك عند المحطّة: نسائية سوداء، مقعد بنّي، سلّة أمامية، وخطّ أحمر على الرفراف الخلفي.',
    taakAr: 'صِف الدرّاجة للشرطة بدقّة. (30 ثانية تقريبًا)' },
  { id: 's33', deel: 1, sec: 20, ar: 'ردّ قصير — مساعدة في حفل المدرسة',
    situatieNl: 'De school vraagt of u wilt helpen bij het schoolfeest van vier tot negen uur. U kunt alleen van vier tot zes, want daarna moet u werken.',
    taakNl: 'Wat antwoordt u de school?',
    voorbeeldNl: 'Ik help graag, maar niet de hele avond. Ik kan van vier tot zes uur. Daarna moet ik werken. Als u mij bij het opbouwen zet, ben ik nuttig in die twee uur.',
    situatieAr: 'تسألك المدرسة المساعدة في الحفل من الرابعة إلى التاسعة، وأنت متاح من الرابعة إلى السادسة فقط.',
    taakAr: 'بماذا تجيب المدرسة؟' },
  { id: 's34', deel: 2, sec: 30, ar: 'إقناع — مطبّ سرعة في الشارع',
    situatieNl: 'Op een inspraakavond van de gemeente wilt u vragen om een verkeersdrempel in uw straat. Auto’s rijden te hard en er is een basisschool op de hoek.',
    taakNl: 'Overtuig de gemeente dat de straat een drempel nodig heeft. Geef twee redenen.',
    voorbeeldNl: 'Onze straat heeft echt een drempel nodig. Ik heb daar twee redenen voor. Ten eerste rijden auto’s hier veel te hard, soms zestig waar dertig mag. Ten tweede staat er een basisschool op de hoek. Elke morgen lopen daar tientallen kinderen. Vorige maand was er bijna een ongeluk.',
    situatieAr: 'في جلسة استماع للبلدية تريد طلب مطبّ سرعة في شارعك، لأنّ السيّارات مسرعة وهناك مدرسة ابتدائية في الزاوية.',
    taakAr: 'أقنع البلدية بالحاجة إلى المطبّ مع سببين. (30 ثانية تقريبًا)' },
]
