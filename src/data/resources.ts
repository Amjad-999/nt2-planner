export interface ResourceLink {
  href: string
  title: string
  desc: string
  highlight?: boolean
  warn?: boolean   // URL verified broken — shown with ⚠️
}

export interface ResourceGroup {
  title: string
  links: ResourceLink[]
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    title: '📜 رسمي — DUO / CvTE',
    links: [
      {
        href: 'https://duo.nl/particulier/staatsexamen-nt2/hoe-het-staatsexamen-nt2-werkt.jsp',
        title: 'DUO — ما هو Staatsexamen NT2؟',
        desc: 'الصفحة الرئيسية في DUO: كيف يعمل الامتحان، شروطه، وهيكله.',
      },
      {
        href: 'https://www.staatsexamensnt2.nl/',
        title: 'staatsexamensnt2.nl (CvTE)',
        desc: 'الموقع الرسمي للامتحان: مستوياته (I/II)، مهاراته الأربع، ومعايير التقييم.',
      },
      {
        href: 'https://www.staatsexamensnt2.nl/voorbereiden/examens-oefenen',
        title: 'امتحانات تجريبية رسمية (PDF + صوت)',
        desc: 'تنزيل أوراق الامتحانات السابقة مع ملفّات الصوت مجانًا من CvTE.',
      },
      {
        href: 'https://oefenexamensnt2.nl',
        title: '⭐ بيئة التدريب الرقمية الرسمية',
        desc: 'المحاكاة الأمينة للامتحان الرقمي الفعلي. الأهم على الإطلاق — جرّبه قبل يوم الامتحان.',
        highlight: true,
      },
      {
        href: 'https://www.cvte.nl/onze-toetsen-en-examens/staatsexamen-nt2',
        title: 'CvTE — Staatsexamen NT2',
        desc: 'الجهة التي تُعدّ الامتحان وتُحدّد معايير التقييم.',
      },
      {
        href: 'https://www.inburgeren.nl/examen-doen/oefenen.jsp',
        title: 'Inburgeren.nl — تدريب',
        desc: 'صفحة التدريب الرسمية لبرنامج الاندماج — تشمل oefenexamens مجانية للمستوى A2.',
      },
    ],
  },
  {
    title: '🔗 DUO — صفحات مهمة',
    links: [
      {
        href: 'https://www.duo.nl/particulier/staatsexamen-nt2/aanmelden.jsp',
        title: 'التسجيل في الامتحان',
        desc: 'خطوات التسجيل الرسمي في DUO لحجز موعد الامتحان.',
      },
      {
        href: 'https://www.duo.nl/particulier/staatsexamen-nt2/waar-en-wanneer.jsp',
        title: 'أين ومتى؟',
        desc: 'مواعيد الامتحانات القادمة ومواقع مراكز الاختبار في هولندا.',
      },
      {
        href: 'https://www.duo.nl/particulier/staatsexamen-nt2/examengeld.jsp',
        title: 'رسوم الامتحان',
        desc: 'تكاليف كل مهارة وطريقة الدفع.',
      },
      {
        href: 'https://www.duo.nl/particulier/staatsexamen-nt2/uitslag.jsp',
        title: 'النتائج',
        desc: 'كيف ومتى تصلك نتيجة الامتحان.',
      },
    ],
  },
  {
    title: '🎓 منصّات تعلّم (مجانية)',
    links: [
      {
        href: 'https://www.nt2.nl/',
        title: 'NT2.nl',
        desc: 'المنصّة الرسمية لكتب Vooruit وContact! وغيرها.',
      },
      {
        href: 'https://oefenen.nl/',
        title: 'Oefenen.nl',
        desc: 'تمارين قراءة وكتابة واستماع مرتّبة بالمستوى.',
      },
      {
        href: 'https://www.npo.nl/start/',
        title: 'NPO Start',
        desc: 'برامج التلفزيون الهولندي — شاهد مع ترجمة nl لتدريب الأذن.',
      },
      {
        href: 'https://jeugdjournaal.nl/',
        title: 'NOS Jeugdjournaal',
        desc: 'أخبار يومية باللغة المبسّطة — مثالي لمستوى B1.',
      },
      {
        href: 'https://www.uitzendinggemist.net/',
        title: 'Uitzending Gemist',
        desc: 'أرشيف برامج التلفزيون الهولندي.',
      },
    ],
  },
  {
    title: '📖 قواميس وأدوات',
    links: [
      {
        href: 'https://www.woorden.org/',
        title: 'Woorden.org',
        desc: 'شرح الكلمات بالهولندية + أمثلة الاستخدام.',
      },
      {
        href: 'https://www.vandale.nl/gratis-woordenboek/nederlands',
        title: 'Van Dale ⚠️',
        desc: 'القاموس الهولندي الأشهر. (الرابط أعاد 404 عند آخر فحص — قد يكون تغيّر)',
        warn: true,
      },
      {
        href: 'https://www.mijnwoordenboek.nl/',
        title: 'MijnWoordenboek (NL–AR)',
        desc: 'قاموس هولندي–عربي مجاني وسريع.',
      },
      {
        href: 'https://forvo.com/languages/nl/',
        title: 'Forvo',
        desc: 'نطق الكلمات الهولندية بأصوات ناطقين أصليين.',
      },
    ],
  },
]
