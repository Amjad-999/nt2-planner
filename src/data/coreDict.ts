export interface DictEntry {
  nl: string; ar: string; type: string; article: string
  level: string; exampleNL: string; exampleAR: string; source: string
}

const RAW: [string, string, string, string, string, string, string][] = [
  ['ik','أنا','vnw','','A1','Ik heet Mohammed.','اسمي محمد.'],
  ['jij','أنتَ/أنتِ','vnw','','A1','Hoe heet jij?','ما اسمك؟'],
  ['hij','هو','vnw','','A1','Hij komt uit Syrië.','هو من سوريا.'],
  ['zij','هي/هم','vnw','','A1','Zij is mijn zus.','هي أختي.'],
  ['wij','نحن','vnw','','A1','Wij wonen in Utrecht.','نحن نسكن في أوترخت.'],
  ['hallo','مرحبًا','tw','','A1','Hallo, hoe gaat het?','مرحبًا، كيف الحال؟'],
  ['dank u wel','شكرًا جزيلًا (رسمي)','uitdr','','A1','Dank u wel voor uw hulp.','شكرًا جزيلًا على مساعدتك.'],
  ['huis','بيت','znw','het','A1','Mijn huis is klein maar gezellig.','بيتي صغير لكنه دافئ.'],
  ['werk','عمل','znw','het','A1','Ik zoek werk in Amsterdam.','أبحث عن عمل في أمستردام.'],
  ['kind','طفل','znw','het','A1','Het kind speelt buiten.','الطفل يلعب في الخارج.'],
  ['vrouw','امرأة/زوجة','znw','de','A1','Mijn vrouw werkt in een ziekenhuis.','زوجتي تعمل في مستشفى.'],
  ['man','رجل/زوج','znw','de','A1','De man wacht op de bus.','الرجل ينتظر الحافلة.'],
  ['school','مدرسة','znw','de','A1','De school begint om half negen.','المدرسة تبدأ الساعة الثامنة والنصف.'],
  ['stad','مدينة','znw','de','A1','Rotterdam is een grote stad.','روتردام مدينة كبيرة.'],
  ['land','بلد','znw','het','A1','Nederland is een klein land.','هولندا بلد صغير.'],
  ['vergadering','اجتماع','znw','de','B1','We hebben morgen een belangrijke vergadering.','لدينا اجتماع مهم غدًا.'],
  ['afspraak','موعد/اتفاق','znw','de','B1','Ik heb een afspraak bij de tandarts.','عندي موعد عند طبيب الأسنان.'],
  ['gemeente','بلدية','znw','de','B1','Ik moet naar de gemeente voor mijn paspoort.','عليّ الذهاب إلى البلدية لجواز سفري.'],
  ['huisarts','طبيب العائلة','znw','de','B1','Mijn huisarts heeft me doorverwezen.','طبيب العائلة أحالني.'],
  ['rekening','حساب/فاتورة','znw','de','B1','Ik moet de rekening nog betalen.','يجب أن أدفع الفاتورة بعد.'],
  ['verzekering','تأمين','znw','de','B1','Heb je een goede verzekering?','هل لديك تأمين جيد؟'],
  ['ervaring','خبرة','znw','de','B1','Ik heb veel ervaring met klanten.','لديّ خبرة كبيرة مع العملاء.'],
  ['vergoeding','تعويض','znw','de','B1','Krijg ik een vergoeding voor mijn reiskosten?','هل أحصل على تعويض لمصاريف السفر؟'],
  ['oplossing','حلّ','znw','de','B1','We zoeken samen naar een oplossing.','نبحث معًا عن حلّ.'],
  ['voorbeeld','مثال','znw','het','B1','Kun je een voorbeeld geven?','هل يمكنك إعطاء مثال؟'],
  ['mogelijkheid','إمكانية','znw','de','B1','Is er een mogelijkheid om te ruilen?','هل هناك إمكانية للاستبدال؟'],
  ['werkgever','صاحب العمل','znw','de','B1','Mijn werkgever betaalt mijn cursus.','صاحب عملي يدفع لي الدورة.'],
  ['werknemer','موظف','znw','de','B1','De werknemer kreeg een nieuw contract.','حصل الموظف على عقد جديد.'],
  ['gezellig','حميمي/لطيف الأجواء','bijv','','B1','Het was een gezellige avond.','كانت أمسية ممتعة.'],
  ['vervelend','مزعج','bijv','','B1','Wat vervelend dat je ziek bent.','يا للسوء أنك مريض.'],
  ['belangrijk','مهم','bijv','','A2','Dit is een belangrijke brief.','هذه رسالة مهمّة.'],
  ['mogelijk','ممكن','bijv','','B1','Is het mogelijk om morgen te komen?','هل من الممكن المجيء غدًا؟'],
  ['nodig','ضروري/يحتاج','bijv','','A2','Heb je hulp nodig?','هل تحتاج مساعدة؟'],
  ['proberen','يحاول','ww','','A2','Ik probeer elke dag te oefenen.','أحاول التدرّب كل يوم.'],
  ['begrijpen','يفهم','ww','','B1','Begrijp je wat ik bedoel?','هل تفهم ما أقصده؟'],
  ['verwachten','يتوقّع','ww','','B1','Ik verwacht je rond zes uur.','أتوقّعك حوالي السادسة.'],
  ['veranderen','يغيّر','ww','','B1','De wet is veranderd in 2024.','تغيّر القانون عام ٢٠٢٤.'],
  ['verbeteren','يحسّن','ww','','B1','Ik wil mijn Nederlands verbeteren.','أريد تحسين هولنديتي.'],
  ['regelen','يدبّر/ينظّم','ww','','B1','Kun je dat voor me regelen?','هل يمكنك أن تدبّر لي ذلك؟'],
  ['voorstellen','يقترح/يقدّم','ww','','B1','Mag ik u even voorstellen aan mijn collega?','هل تأذن لي أن أقدّمك إلى زميلي؟'],
  ['herinneren','يذكّر/يتذكّر','ww','','B1','Ik herinner me dat goed.','أتذكّر ذلك جيدًا.'],
  ['gebeuren','يحدث','ww','','B1','Wat is er gebeurd?','ماذا حصل؟'],
  ['bevallen','يعجب/يلائم','ww','','B2','Bevalt je nieuwe baan?','هل يعجبك عملك الجديد؟'],
  ['ongeveer','تقريبًا','bijw','','A2','Het duurt ongeveer een uur.','يستغرق نحو ساعة.'],
  ['daarna','بعد ذلك','bijw','','A2','Eerst eten, daarna huiswerk.','أولًا الأكل، بعدها الواجب.'],
  ['eindelijk','أخيرًا','bijw','','B1','Eindelijk vakantie!','أخيرًا إجازة!'],
  ['misschien','ربما','bijw','','A2','Misschien kom ik later.','ربما آتي لاحقًا.'],
  ['waarschijnlijk','على الأرجح','bijw','','B1','Hij komt waarschijnlijk te laat.','على الأرجح سيتأخّر.'],
]

export const CORE_DICT: Record<string, DictEntry> = {}
RAW.forEach(([nl, ar, type, article, level, exampleNL, exampleAR]) => {
  CORE_DICT[nl.toLowerCase()] = { nl, ar, type, article, level, exampleNL, exampleAR, source: 'قاموس مدمج' }
})
