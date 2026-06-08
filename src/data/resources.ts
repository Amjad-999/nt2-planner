export interface ResourceGroup {
  title: string
  links: { href: string; title: string; desc: string }[]
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    title: '📜 رسمي — DUO',
    links: [
      { href: 'https://duo.nl/particulier/staatsexamen-nt2/index.jsp', title: 'DUO — الصفحة الرسمية لامتحان NT2', desc: 'معلومات التسجيل، الرسوم، والتقويم.' },
      { href: 'https://duo.nl/particulier/staatsexamen-nt2/voorbeeldexamens.jsp', title: 'امتحانات نموذجية عامّة (Openbare voorbeeldexamens)', desc: 'جميع الأوراق والملفّات الصوتية للسنوات الماضية مجانًا.' },
      { href: 'https://www.cvte.nl/', title: 'CvTE — مجلس الامتحانات', desc: 'من يُعدّ الامتحان ويُحدّد معايير التقييم.' },
    ],
  },
  {
    title: '🎓 منصّات تعلّم ممتازة (مجانية)',
    links: [
      { href: 'https://www.nt2.nl/', title: 'NT2.nl', desc: 'المنصّة الرسمية لكتب Vooruit وContact! وغيرها.' },
      { href: 'https://oefenen.nl/', title: 'Oefenen.nl', desc: 'تمارين قراءة وكتابة واستماع مرتّبة بالمستوى.' },
      { href: 'https://www.npo.nl/start/', title: 'NPO Start (إذاعة وتلفزيون هولندي)', desc: 'مشاهدة برامج هولندية مع ترجمة nl لتدريب الأذن.' },
      { href: 'https://nos.nl/jeugdjournaal', title: 'NOS Jeugdjournaal', desc: 'أخبار باللغة الهولندية المبسّطة — ممتاز لـ B1.' },
      { href: 'https://www.uitzendinggemist.net/', title: 'Uitzending Gemist', desc: 'أرشيف برامج التلفزيون الهولندي.' },
    ],
  },
  {
    title: '📖 قواميس وأدوات',
    links: [
      { href: 'https://www.woorden.org/', title: 'Woorden.org', desc: 'شرح الكلمات بالهولندية + الاستخدام.' },
      { href: 'https://www.vandale.nl/gratis-woordenboek/nederlands', title: 'Van Dale (مجاني)', desc: 'القاموس الهولندي الأشهر.' },
      { href: 'https://www.mijnwoordenboek.nl/', title: 'MijnWoordenboek (Nederlands–Arabisch)', desc: 'قاموس هولندي–عربي مجاني وسريع.' },
      { href: 'https://forvo.com/languages/nl/', title: 'Forvo', desc: 'نطق الكلمات الهولندية بأصوات ناطقين أصليين.' },
    ],
  },
]
