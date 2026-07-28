/* طقس هولندا الحيّ — Open-Meteo (مجاني، بلا مفتاح، بلا تسجيل).
   الزاوية التعليمية لا الترفيهية: كل حالة طقس تُعرض بمصطلحها الهولندي
   الحقيقي مع الترجمة، فيتعلّم المستخدم مفردات الطقس من واقع يومه — وهي
   من أكثر موضوعات المحادثة تكرارًا في هولندا وفي امتحان التحدّث. */

import { getJson } from './http'

export interface DutchCity { key: string; nl: string; ar: string; lat: number; lon: number }

export const DUTCH_CITIES: DutchCity[] = [
  { key: 'amsterdam', nl: 'Amsterdam', ar: 'أمستردام', lat: 52.37, lon: 4.89 },
  { key: 'rotterdam', nl: 'Rotterdam', ar: 'روتردام', lat: 51.92, lon: 4.48 },
  { key: 'denhaag',   nl: 'Den Haag',  ar: 'لاهاي',    lat: 52.08, lon: 4.31 },
  { key: 'utrecht',   nl: 'Utrecht',   ar: 'أوترخت',   lat: 52.09, lon: 5.12 },
  { key: 'eindhoven', nl: 'Eindhoven', ar: 'آيندهوفن', lat: 51.44, lon: 5.48 },
  { key: 'groningen', nl: 'Groningen', ar: 'خرونينجن', lat: 53.22, lon: 6.57 },
]

/** رموز WMO القياسية التي تعيدها Open-Meteo → المصطلح الهولندي + الترجمة. */
const WMO: Record<number, { nl: string; ar: string; icon: string }> = {
  0:  { nl: 'onbewolkt',            ar: 'صحو تمامًا',            icon: '☀️' },
  1:  { nl: 'overwegend onbewolkt', ar: 'صحو في الغالب',         icon: '🌤️' },
  2:  { nl: 'half bewolkt',         ar: 'غائم جزئيًّا',           icon: '⛅' },
  3:  { nl: 'bewolkt',              ar: 'غائم',                  icon: '☁️' },
  45: { nl: 'mist',                 ar: 'ضباب',                  icon: '🌫️' },
  48: { nl: 'aanvriezende mist',    ar: 'ضباب متجمّد',            icon: '🌫️' },
  51: { nl: 'lichte motregen',      ar: 'رذاذ خفيف',             icon: '🌦️' },
  53: { nl: 'motregen',             ar: 'رذاذ',                  icon: '🌦️' },
  55: { nl: 'dichte motregen',      ar: 'رذاذ كثيف',             icon: '🌧️' },
  61: { nl: 'lichte regen',         ar: 'مطر خفيف',              icon: '🌦️' },
  63: { nl: 'regen',                ar: 'مطر',                   icon: '🌧️' },
  65: { nl: 'zware regen',          ar: 'مطر غزير',              icon: '🌧️' },
  71: { nl: 'lichte sneeuw',        ar: 'ثلج خفيف',              icon: '🌨️' },
  73: { nl: 'sneeuw',               ar: 'ثلج',                   icon: '🌨️' },
  75: { nl: 'zware sneeuwval',      ar: 'تساقط ثلجي كثيف',       icon: '❄️' },
  80: { nl: 'buien',                ar: 'زخّات مطر',              icon: '🌦️' },
  81: { nl: 'stevige buien',        ar: 'زخّات قوية',             icon: '🌧️' },
  82: { nl: 'zware buien',          ar: 'زخّات عنيفة',            icon: '⛈️' },
  95: { nl: 'onweer',               ar: 'عاصفة رعدية',           icon: '⛈️' },
}

const UNKNOWN = { nl: 'wisselvallig', ar: 'متقلّب', icon: '🌥️' }

export interface DutchWeather {
  city: DutchCity
  tempC: number
  windKmh: number
  nl: string
  ar: string
  icon: string
  /** جملة هولندية جاهزة للاستخدام في محادثة حقيقية. */
  phraseNL: string
  phraseAR: string
}

interface MeteoResponse {
  current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number }
}

export async function dutchWeather(cityKey = 'amsterdam'): Promise<DutchWeather | null> {
  const city = DUTCH_CITIES.find((c) => c.key === cityKey) ?? DUTCH_CITIES[0]
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    + `&current=temperature_2m,wind_speed_10m,weather_code`
  const j = await getJson<MeteoResponse>(u)
  const cur = j?.current
  if (!cur || typeof cur.temperature_2m !== 'number') return null

  const w = WMO[cur.weather_code ?? -1] ?? UNKNOWN
  const t = Math.round(cur.temperature_2m)
  return {
    city,
    tempC: t,
    windKmh: Math.round(cur.wind_speed_10m ?? 0),
    nl: w.nl,
    ar: w.ar,
    icon: w.icon,
    phraseNL: `Het is ${t} graden en het is ${w.nl} in ${city.nl}.`,
    phraseAR: `الحرارة ${t} درجة والجوّ ${w.ar} في ${city.ar}.`,
  }
}
