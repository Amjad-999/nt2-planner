import { useAppStore, totalLearnedWords } from '@/store/useAppStore'
import { dueCount as countDue } from '@/features/vocab/queue'
import { useNow } from '@/hooks/useNow'
import { AppIcon } from '@/components/AppIcon'
import { Fire, Translate } from '@/components/icons'

export function VocabOverview() {
  const vocab = useAppStore((s) => s.vocab)
  const streak = useAppStore((s) => s.streak)
  const now = useNow()
  const words = totalLearnedWords(vocab)
  const due = countDue(vocab, now)

  return (
    <section className="vocab-overview" aria-labelledby="vocab-overview-title">
      <div>
        <p className="eyebrow">مخزونك اللغوي</p>
        <h1 id="vocab-overview-title">مفرداتي</h1>
        <p>تعلّم الكلمة في سياقها، ثم دع المراجعة الذكية تعيدها في الوقت المناسب.</p>
      </div>
      <div className="vocab-overview__stats" aria-label="ملخص المفردات">
        <div><AppIcon icon={Translate} size={20} /><strong dir="ltr">{words.learned}/{words.all}</strong><span>كلمات راسخة</span></div>
        <div><AppIcon icon={Fire} size={20} /><strong dir="ltr">{due}</strong><span>مستحقّة للمراجعة</span></div>
        <div><strong dir="ltr">{streak.count}</strong><span>يوم مواظبة</span></div>
      </div>
    </section>
  )
}
