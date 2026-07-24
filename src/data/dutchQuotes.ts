/* 30 اقتباسًا هولنديًا — واحد لكل يوم من الشهر (يتكرر دوريًا) */
export const QUOTES: { nl: string; ar: string }[] = [
  { nl: 'Oefening baart kunst', ar: 'الممارسة تصنع الإتقان' },
  { nl: 'Langzaam maar zeker', ar: 'ببطء لكن بثبات' },
  { nl: 'Doorzetten is belangrijker dan talent', ar: 'الإصرار أهم من الموهبة' },
  { nl: 'Wie niet waagt, die niet wint', ar: 'من لا يجازف لا يربح' },
  { nl: 'Al doende leert men', ar: 'بالممارسة نتعلّم' },
  { nl: 'Rome is niet op één dag gebouwd', ar: 'روما لم تُبنَ في يوم واحد' },
  { nl: 'Een goed begin is het halve werk', ar: 'حسن البداية نصف العمل' },
  { nl: 'Zonder vlijt geen prijs', ar: 'بلا اجتهاد لا جائزة' },
  { nl: 'Waar een wil is, is een weg', ar: 'حيث توجد إرادة توجد طريقة' },
  { nl: 'Geduld is een schone zaak', ar: 'الصبر فضيلة جميلة' },
  { nl: 'Elke dag een nieuwe kans', ar: 'كل يوم فرصة جديدة' },
  { nl: 'Stap voor stap komt men ver', ar: 'خطوة بخطوة نصل بعيدًا' },
  { nl: 'Wat je zaait, zal je oogsten', ar: 'كما تزرع تحصد' },
  { nl: 'De aanhouder wint', ar: 'المثابر ينتصر' },
  { nl: 'Beter laat dan nooit', ar: 'أفضل متأخرًا من ألّا يكون أبدًا' },
  { nl: 'Wie het laatst lacht, lacht het best', ar: 'من يضحك أخيرًا يضحك أفضل' },
  { nl: 'Je kunt meer dan je denkt', ar: 'تستطيع أكثر مما تظن' },
  { nl: 'Wie zoekt, die vindt', ar: 'من يبحث يجد' },
  { nl: 'Van fouten leert men', ar: 'من الأخطاء نتعلّم' },
  { nl: 'Elke dag een beetje beter', ar: 'كل يوم أفضل قليلًا' },
  { nl: 'Rustig aan, dan breekt het lijntje niet', ar: 'تمهّل كي لا ينقطع الخيط' },
  { nl: 'Kleine stappen, groot resultaat', ar: 'خطوات صغيرة، نتيجة كبيرة' },
  { nl: 'Niet geschoten is altijd mis', ar: 'من لا يحاول يخسر دائمًا' },
  { nl: 'Oefening maakt de meester', ar: 'الممارسة تصنع المعلّم' },
  { nl: 'Bezint eer ge begint', ar: 'فكّر قبل أن تبدأ' },
  { nl: 'Stel niet uit tot morgen wat je vandaag kunt doen', ar: 'لا تؤجل إلى الغد ما يمكنك فعله اليوم' },
  { nl: 'De tijd vliegt voorbij', ar: 'الوقت يطير' },
  { nl: 'Kennis is macht', ar: 'المعرفة قوة' },
  { nl: 'Wie goed doet, goed ontmoet', ar: 'من يُحسن يُلاقَ بالإحسان' },
  { nl: 'Alle beetjes helpen', ar: 'كل قليل يُسهم' },
]

export function dayOfYear(now: number): number {
  const d = new Date(now)
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}
