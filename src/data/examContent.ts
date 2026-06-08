import type { ExamReadingItem, ExamListeningItem, ExamWritingItem, ExamSpeakingItem } from '@/store/types'

export const EXAM_READING: ExamReadingItem[] = [
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
      { q: 'Wat is het belangrijkste probleem met het huidige fietspad?', ar: 'ما المشكلة الرئيسية في المسار الحالي؟', opts: ['Het is te kort','Het is in slechte staat en te smal','Het ligt te ver van het water','Het heeft geen verlichting'], correct: 1, why: 'يُذكر أنّ الأسفلت متشقّق والعرض ١٫٧م فقط فلا يستطيع الراكبون التجاوز.' },
      { q: 'Hoe breed wordt het nieuwe fietspad?', ar: 'كم عرض المسار الجديد؟', opts: ['1,70 meter','2 meter','3 meter','5 meter'], correct: 2, why: '"Het nieuwe pad wordt drie meter breed".' },
      { q: 'Waarom zijn sommige boeren ontevreden?', ar: 'لماذا بعض المزارعين غير راضين؟', opts: ['Ze moeten meebetalen aan het project','Ze vrezen dat er bomen gekapt worden','Ze willen helemaal geen fietspad','Ze krijgen minder grond toegewezen'], correct: 1, why: '"vreest dat er bomen gekapt worden".' },
      { q: 'Hoe reageert de gemeente op die zorg?', ar: 'كيف ترد البلدية على هذا القلق؟', opts: ['Met de belofte om twintig nieuwe bomen te planten voor vier gekapte essen','Met de toezegging dat er helemaal geen bomen verdwijnen','Met een schadevergoeding aan de boeren','Door het plan te annuleren'], correct: 0, why: 'النصّ يذكر بالضبط ٤ أشجار تُقطع مقابل ٢٠ شجرة جديدة.' },
      { q: 'Wie betaalt het grootste deel van de kosten?', ar: 'من يدفع الجزء الأكبر من التكاليف؟', opts: ['De gemeente Westerveld','De boeren langs het kanaal','De provincie Overijssel','Een particuliere sponsor'], correct: 2, why: '"Ongeveer zestig procent komt van de provincie Overijssel".' },
      { q: 'Wat moet je doen als je naar de informatieavond wilt komen?', ar: 'ماذا تفعل إذا أردت حضور الجلسة الإعلامية؟', opts: ['Vooraf een ticket kopen','Je aanmelden bij de gemeente','Niets — aanmelden is niet nodig','Een uitnodiging vragen aan de wethouder'], correct: 2, why: '"Aanmelden is niet nodig" — حرفيًا في النصّ.' },
    ],
  },
]

export const EXAM_LISTENING: ExamListeningItem[] = [
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
]

export const EXAM_WRITING: ExamWritingItem[] = [
  { id: 'w1', kind: 'email', ar: 'بريد إلكتروني قصير — إلغاء حصّة', titleNl: 'Sportles afzeggen', briefNl: 'U volgt een wekelijkse yogales bij sportschool BalanZ. Volgende week kunt u niet komen omdat u op vakantie bent. Schrijf een e-mail naar uw docente (Lisa Visser, lisa@balanz.nl) waarin u: (1) zegt waarom u dit schrijft, (2) uitlegt wanneer u afwezig bent, (3) vraagt of u de les later kunt inhalen, (4) vriendelijk afsluit.', briefAr: 'تتبع حصة يوغا أسبوعية في صالة BalanZ. الأسبوع المقبل لا تستطيع الحضور لأنك مسافر. اكتب بريدًا إلى المدرّبة Lisa Visser تذكر فيه: سبب الكتابة، فترة الغياب، طلب التعويض، وتختم بطريقة مهذّبة.', minWords: 60, maxWords: 90 },
  { id: 'w2', kind: 'klachtbrief', ar: 'رسالة شكوى — منتج معيب', titleNl: 'Klacht over een kapotte koffiemachine', briefNl: 'U heeft drie weken geleden een koffiezetapparaat (KaffeMax 200) gekocht bij webwinkel TechHuis. Het apparaat werkt al na een week niet meer goed: er komt geen warm water meer uit. Schrijf een klachtbrief aan TechHuis waarin u: (1) het probleem beschrijft, (2) het bestelnummer noemt (TH-2024-554), (3) uitlegt wat u al heeft geprobeerd, (4) vraagt of u het apparaat kunt omruilen of uw geld terug krijgt.', briefAr: 'اشتريت ماكينة قهوة من متجر TechHuis قبل ٣ أسابيع. توقفت عن العمل (لا ماء ساخن). اكتب شكوى تذكر: المشكلة، رقم الطلب، ما جرّبته، طلبك (استبدال أو استرجاع).', minWords: 90, maxWords: 130 },
  { id: 'w3', kind: 'verzoek', ar: 'طلب رسمي — تمديد عقد', titleNl: 'Huurcontract verlengen', briefNl: 'U huurt sinds twee jaar een appartement van verhuurder Janssen Vastgoed. Uw contract eindigt over twee maanden. U wilt graag blijven wonen en het contract verlengen. Schrijf een formele brief aan de verhuurder waarin u: (1) zich kort voorstelt en het adres noemt, (2) uw verzoek duidelijk maakt, (3) noemt wat voor u belangrijk is (geen huurverhoging, of een lichte aanpassing), (4) vraagt om een schriftelijke reactie.', briefAr: 'تسكن منذ سنتين شقّة من Janssen Vastgoed. عقدك ينتهي خلال شهرين وتريد التمديد. اكتب طلبًا رسميًا: التعريف بنفسك + العنوان، الطلب، الشروط المرغوبة، وطلب الردّ كتابةً.', minWords: 90, maxWords: 140 },
  { id: 'w4', kind: 'mail-collega', ar: 'بريد لزميل في العمل', titleNl: 'Werkverdeling tijdens je vakantie', briefNl: 'U gaat over een week op vakantie. Uw collega (Daan) heeft aangeboden uw taken over te nemen. Schrijf hem een mail waarin u: (1) bedankt voor het aanbod, (2) een korte lijst geeft van wat hij moet doen (post checken, klanten terugbellen, agenda bijhouden), (3) zegt waar hij belangrijke documenten kan vinden, (4) zegt dat hij u in noodgeval kan bellen.', briefAr: 'ستسافر بعد أسبوع. عرض زميلك Daan تولّي مهامك. اكتب له بريدًا يتضمن: الشكر، قائمة قصيرة بالمهام، أين يجد الملفات، وأنّه يستطيع الاتّصال بك للحالات الطارئة.', minWords: 80, maxWords: 120 },
]

export const EXAM_SPEAKING: ExamSpeakingItem[] = [
  { id: 's1', deel: 1, sec: 20, ar: 'ردّ قصير — صديق يطلب مساعدة', situatieNl: 'Een vriend belt u en vraagt of u zaterdagochtend kunt helpen met verhuizen. U kunt niet, want u heeft al iets anders gepland.', taakNl: 'Wat zegt u tegen uw vriend? (ongeveer 20 seconden)', voorbeeldNl: "Sorry, helaas kan ik zaterdag niet. Ik heb al een afspraak bij de tandarts 's ochtends. Maar als je hulp nodig hebt op zondag, dan kom ik graag langs!", situatieAr: 'يتّصل بك صديق ويسألك إن كنت تستطيع مساعدته في الانتقال صباح السبت. لا تستطيع لأنّ لديك التزامًا آخر.', taakAr: 'ماذا تقول لصديقك؟ (٢٠ ثانية تقريبًا)' },
  { id: 's2', deel: 1, sec: 20, ar: 'ردّ قصير — في عيادة الطبيب', situatieNl: 'U zit in de wachtkamer bij de huisarts. De assistente roept een naam die u niet goed verstaat. U denkt dat het uw naam is.', taakNl: 'Wat vraagt u aan de assistente?', voorbeeldNl: 'Sorry, ik verstond u niet goed. Zei u "Hassan" of "Hussein"? Want ik ben Hassan en heb een afspraak om half elf.', situatieAr: 'أنت في غرفة الانتظار عند طبيب العائلة. تنادي السكرتيرة اسمًا لم تسمعه بوضوح. تظنّ أنه اسمك.', taakAr: 'ماذا تسأل السكرتيرة؟' },
  { id: 's3', deel: 2, sec: 30, ar: 'ردّ موسّع — اقتراح حلّ في العمل', situatieNl: "Op uw werk klagen veel collega's dat de pauzeruimte te klein en rommelig is. Tijdens een vergadering vraagt uw manager om ideeën om de situatie te verbeteren.", taakNl: 'Geef uw mening en doe minstens twee concrete voorstellen. (ongeveer 30 seconden)', voorbeeldNl: 'Ik begrijp de klachten, want soms is er echt geen vrij stoel. Ik denk dat we twee dingen kunnen doen. Ten eerste: een eenvoudige opruimregel — wie iets pakt, ruimt het ook op. En ten tweede: misschien kunnen we een paar pauzetijden uit elkaar trekken, zodat niet iedereen tegelijk in de ruimte zit.', situatieAr: 'في عملك يشتكي الزملاء من ضيق غرفة الاستراحة وفوضويتها. في الاجتماع يطلب المدير أفكارًا.', taakAr: 'أعطِ رأيك واقترح حلّين عمليّين. (٣٠ ثانية تقريبًا)' },
  { id: 's4', deel: 2, sec: 30, ar: 'ردّ موسّع — تجربة شخصية', situatieNl: 'Een vriendin vertelt dat ze graag wil leren autorijden, maar bang is voor het examen. U heeft uw rijbewijs vorig jaar gehaald.', taakNl: 'Vertel kort hoe het bij u ging en geef twee tips. (ongeveer 30 seconden)', voorbeeldNl: 'Ik snap je angst goed, ik was ook erg zenuwachtig. Maar het viel uiteindelijk mee. Mijn eerste tip: doe vlak voor het examen geen extra rijles meer, dan kom je rustiger aan. En tweede tip: vergeet niet hardop te kijken in de spiegels — examinatoren letten daar echt op.', situatieAr: 'صديقتك تريد تعلّم القيادة وخائفة من الامتحان. أنت أخذت الرخصة العام الماضي.', taakAr: 'احكِ تجربتك واعطِ نصيحتين. (٣٠ ثانية تقريبًا)' },
]
