export interface LessonMeta {
  id: string
  title: string       // Arabic heading shown in the selector
  subtitle: string    // Dutch topic name
  icon: string
  file: () => Promise<{ default: string }>
}

export const LESSONS: LessonMeta[] = [
  {
    id: 'woordvolgorde',
    title: 'ترتيب الكلمات',
    subtitle: 'Woordvolgorde (V2)',
    icon: '🔤',
    file: () => import('./01-woordvolgorde.md?raw') as Promise<{ default: string }>,
  },
  {
    id: 'de-het',
    title: 'de / het',
    subtitle: 'Lidwoorden',
    icon: '📌',
    file: () => import('./02-de-het.md?raw') as Promise<{ default: string }>,
  },
  {
    id: 'perfectum',
    title: 'الماضي التام',
    subtitle: 'Perfectum',
    icon: '⏪',
    file: () => import('./03-perfectum.md?raw') as Promise<{ default: string }>,
  },
  {
    id: 'comparatief',
    title: 'المقارنة والتفضيل',
    subtitle: 'Comparatief & Superlatief',
    icon: '📊',
    file: () => import('./04-comparatief.md?raw') as Promise<{ default: string }>,
  },
]
