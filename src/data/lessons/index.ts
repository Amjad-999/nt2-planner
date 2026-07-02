import type { Level } from '@/store/types'

export interface LessonMeta {
  id: string
  level?: Level       // المستوى (A1 / A2 / B1 / B2) — للتمييز في المُحدِّد
  title: string       // Arabic heading shown in the selector
  subtitle: string    // Dutch topic name
  icon: string
  file: () => Promise<{ default: string }>
}

export const LESSONS: LessonMeta[] = [
  // ── A1 — المبتدئون ──
  { id: 'a1-werkwoorden', level: 'A1', title: 'الأفعال (المضارع)', subtitle: 'Tegenwoordige tijd', icon: '🟢', file: () => import('./a1-01-werkwoorden.md?raw') as Promise<{ default: string }> },
  { id: 'a1-hebben-zijn', level: 'A1', title: 'hebben و zijn', subtitle: 'Hebben & zijn', icon: '🔑', file: () => import('./a1-02-hebben-zijn.md?raw') as Promise<{ default: string }> },
  { id: 'a1-modaal', level: 'A1', title: 'الأفعال المساعدة', subtitle: 'Modale werkwoorden', icon: '🧩', file: () => import('./a1-03-modale-werkwoorden.md?raw') as Promise<{ default: string }> },
  { id: 'a1-naamwoorden', level: 'A1', title: 'التعريف والجمع', subtitle: 'Lidwoorden & meervoud', icon: '📦', file: () => import('./a1-04-lidwoorden-meervoud.md?raw') as Promise<{ default: string }> },
  { id: 'a1-persoonlijk', level: 'A1', title: 'الضمائر الشخصية', subtitle: 'Persoonlijke vnw.', icon: '🙋', file: () => import('./a1-05-persoonlijk-vnw.md?raw') as Promise<{ default: string }> },
  { id: 'a1-bezittelijk', level: 'A1', title: 'ضمائر الملكية', subtitle: 'Bezittelijke vnw.', icon: '🔖', file: () => import('./a1-06-bezittelijk-vnw.md?raw') as Promise<{ default: string }> },
  { id: 'a1-voorzetsels', level: 'A1', title: 'حروف الجرّ', subtitle: 'Voorzetsels', icon: '📍', file: () => import('./a1-07-voorzetsels.md?raw') as Promise<{ default: string }> },
  { id: 'a1-vraagwoorden', level: 'A1', title: 'أدوات الاستفهام', subtitle: 'Vraagwoorden', icon: '❓', file: () => import('./a1-08-vraagwoorden.md?raw') as Promise<{ default: string }> },
  { id: 'a1-ontkenning', level: 'A1', title: 'النفي (niet/geen)', subtitle: 'Ontkenning', icon: '🚫', file: () => import('./a1-09-ontkenning.md?raw') as Promise<{ default: string }> },
  { id: 'a1-inversie', level: 'A1', title: 'القلب (inversie)', subtitle: 'Inversie', icon: '🔄', file: () => import('./a1-10-inversie.md?raw') as Promise<{ default: string }> },
  { id: 'a1-gesloten-vragen', level: 'A1', title: 'الأسئلة المغلقة', subtitle: 'Ja/nee-vragen', icon: '✅', file: () => import('./a1-11-gesloten-vragen.md?raw') as Promise<{ default: string }> },
  // ── A2 — متوسّط ──
  { id: 'a2-verleden-tijd', level: 'A2', title: 'الماضي البسيط', subtitle: 'Imperfectum', icon: '⏱️', file: () => import('./a2-01-verleden-tijd.md?raw') as Promise<{ default: string }> },
  { id: 'a2-voltooide-tijd', level: 'A2', title: 'الماضي التام', subtitle: 'Perfectum', icon: '🕰️', file: () => import('./a2-02-voltooide-tijd.md?raw') as Promise<{ default: string }> },
  { id: 'a2-adjectief', level: 'A2', title: 'الصفة (-e)', subtitle: 'Adjectief', icon: '🎨', file: () => import('./a2-03-adjectief.md?raw') as Promise<{ default: string }> },
  { id: 'a2-vergelijking', level: 'A2', title: 'المقارنة والتفضيل', subtitle: 'Vergelijking', icon: '⚖️', file: () => import('./a2-04-vergelijking.md?raw') as Promise<{ default: string }> },
  { id: 'a2-voegwoorden', level: 'A2', title: 'أدوات الربط', subtitle: 'Voegwoorden', icon: '🔗', file: () => import('./a2-05-voegwoorden.md?raw') as Promise<{ default: string }> },
  { id: 'a2-om-te', level: 'A2', title: 'جمل الغرض (om te)', subtitle: 'Om … te', icon: '🎯', file: () => import('./a2-06-om-te.md?raw') as Promise<{ default: string }> },
  { id: 'a2-als', level: 'A2', title: 'جمل الشرط (als)', subtitle: 'Als / toen', icon: '🔀', file: () => import('./a2-07-als.md?raw') as Promise<{ default: string }> },
  { id: 'a2-aanwijzend', level: 'A2', title: 'أسماء الإشارة', subtitle: 'Aanwijzend vnw.', icon: '👉', file: () => import('./a2-08-aanwijzend.md?raw') as Promise<{ default: string }> },
  { id: 'a2-verwijswoorden', level: 'A2', title: 'كلمات الإحالة (er)', subtitle: 'Verwijswoorden', icon: '↩️', file: () => import('./a2-09-verwijswoorden.md?raw') as Promise<{ default: string }> },
  { id: 'a2-positiewerkwoorden', level: 'A2', title: 'أفعال الوضعية', subtitle: 'Positiewerkwoorden', icon: '🧍', file: () => import('./a2-10-positiewerkwoorden.md?raw') as Promise<{ default: string }> },
  { id: 'a2-lidwoord-meervoud', level: 'A2', title: 'التعريف والجمع (A2)', subtitle: 'Lidwoord & meervoud', icon: '🗂️', file: () => import('./a2-11-lidwoord-meervoud.md?raw') as Promise<{ default: string }> },
  // ── B1 — متقدّم ──
  { id: 'woordvolgorde', level: 'B1', title: 'ترتيب الكلمات', subtitle: 'Woordvolgorde (V2)', icon: '🔤', file: () => import('./01-woordvolgorde.md?raw') as Promise<{ default: string }> },
  { id: 'perfectum', level: 'B1', title: 'الماضي التام (B1)', subtitle: 'Perfectum', icon: '⏪', file: () => import('./03-perfectum.md?raw') as Promise<{ default: string }> },
  { id: 'b1-plusquamperfectum', level: 'B1', title: 'الماضي الأسبق', subtitle: 'Plusquamperfectum', icon: '⏮️', file: () => import('./b1-06-plusquamperfectum.md?raw') as Promise<{ default: string }> },
  { id: 'b1-scheidbare-ww', level: 'B1', title: 'الأفعال المنفصلة', subtitle: 'Scheidbare ww.', icon: '✂️', file: () => import('./b1-01-scheidbare-ww.md?raw') as Promise<{ default: string }> },
  { id: 'b1-zullen-zouden', level: 'B1', title: 'zullen و zouden', subtitle: 'Zullen / zouden', icon: '🔮', file: () => import('./b1-02-zullen-zouden.md?raw') as Promise<{ default: string }> },
  { id: 'b1-reflexief', level: 'B1', title: 'الأفعال الانعكاسية', subtitle: 'Reflexief (zich)', icon: '🪞', file: () => import('./b1-03-reflexief.md?raw') as Promise<{ default: string }> },
  { id: 'b1-te-infinitief', level: 'B1', title: 'الأفعال مع te', subtitle: 'Werkwoord + te', icon: '📝', file: () => import('./b1-07-te-infinitief.md?raw') as Promise<{ default: string }> },
  { id: 'b1-lijdende-vorm', level: 'B1', title: 'المبني للمجهول', subtitle: 'Lijdende vorm', icon: '📨', file: () => import('./b1-04-lijdende-vorm.md?raw') as Promise<{ default: string }> },
  { id: 'b1-vaste-voorzetsels', level: 'B1', title: 'حروف الجرّ الثابتة', subtitle: 'Vaste voorzetsels', icon: '🧷', file: () => import('./b1-08-vaste-voorzetsels.md?raw') as Promise<{ default: string }> },
  { id: 'b1-betrekkelijk', level: 'B1', title: 'ضمائر الوصل', subtitle: 'Betrekkelijk vnw.', icon: '🪢', file: () => import('./b1-05-betrekkelijk.md?raw') as Promise<{ default: string }> },
  { id: 'de-het', level: 'B1', title: 'de / het', subtitle: 'Lidwoorden', icon: '📌', file: () => import('./02-de-het.md?raw') as Promise<{ default: string }> },
  { id: 'comparatief', level: 'B1', title: 'المقارنة والتفضيل (B1)', subtitle: 'Comparatief & Superlatief', icon: '📊', file: () => import('./04-comparatief.md?raw') as Promise<{ default: string }> },
  // ── B2 — Staatsexamen ──
  { id: 'b2-hoofdzin-bijzin', level: 'B2', title: 'الجملة الرئيسية والثانوية', subtitle: 'Hoofdzin & bijzin', icon: '🧱', file: () => import('./b2-01-hoofdzin-bijzin.md?raw') as Promise<{ default: string }> },
  { id: 'b2-irrealis', level: 'B2', title: 'الشرط غير الواقعي', subtitle: 'Irrealis', icon: '🌀', file: () => import('./b2-02-irrealis.md?raw') as Promise<{ default: string }> },
  { id: 'b2-relatieve-bijzin', level: 'B2', title: 'جمل الوصل (متقدّم)', subtitle: 'Relatieve bijzin', icon: '🧵', file: () => import('./b2-03-relatieve-bijzin.md?raw') as Promise<{ default: string }> },
  { id: 'b2-er-daar', level: 'B2', title: 'er و daar', subtitle: 'Er / daar', icon: '🎛️', file: () => import('./b2-04-er-daar.md?raw') as Promise<{ default: string }> },
  { id: 'b2-indirecte-rede', level: 'B2', title: 'الكلام غير المباشر', subtitle: 'Indirecte rede', icon: '💬', file: () => import('./b2-05-indirecte-rede.md?raw') as Promise<{ default: string }> },
  { id: 'b2-deelwoord', level: 'B2', title: 'الاشتقاق الوصفي', subtitle: 'Deelwoord als adj.', icon: '🏷️', file: () => import('./b2-06-deelwoord.md?raw') as Promise<{ default: string }> },
  { id: 'b2-passief', level: 'B2', title: 'المبني للمجهول (موسّع)', subtitle: 'Passief', icon: '🔁', file: () => import('./b2-07-passief.md?raw') as Promise<{ default: string }> },
  { id: 'b2-conjuncties', level: 'B2', title: 'أدوات الربط المتقدّمة', subtitle: 'Voegwoorden B2', icon: '🪡', file: () => import('./b2-08-conjuncties.md?raw') as Promise<{ default: string }> },
  { id: 'b2-voorzetselvoorwerp', level: 'B2', title: 'مفعول حرف الجرّ', subtitle: 'Voorzetselvoorwerp', icon: '🧲', file: () => import('./b2-09-voorzetselvoorwerp.md?raw') as Promise<{ default: string }> },
  { id: 'b2-nominalisatie', level: 'B2', title: 'الأسلوب الاسمي', subtitle: 'Nominalisatie', icon: '🏛️', file: () => import('./b2-10-nominalisatie.md?raw') as Promise<{ default: string }> },
]
