import { useEffect, useState } from 'react'
import { wiktionaryLookup, type WordDetail } from '@/features/world/wiktionary'

/** تفاصيل نطق كلمة هولندية من ويكاموس، للعرض داخل بطاقة المراجعة.
 *
 *  عقد هذا الخطّاف مقصود: يعود null صامتًا في كل حالة تعذّر — لا اتصال، لا
 *  مدخل للكلمة، مهلة. أثناء المراجعة لا مكان لرسالة خطأ: المستخدم يراجع
 *  مفرداته، لا يستكشف قاموسًا، وأي ضجيج هنا يقطع تركيزه.
 *
 *  النتيجة مقرونة بالكلمة التي طُلبت لها، فلا تظهر تفاصيل بطاقة سابقة على
 *  بطاقة لاحقة حين تصل الاستجابة متأخّرة — وهو ما يحدث فعلًا مع مراجعة
 *  سريعة على اتصال بطيء. */
export function useWordDetail(word: string | null, enabled: boolean): WordDetail | null {
  const [got, setGot] = useState<{ word: string; detail: WordDetail | null } | null>(null)

  useEffect(() => {
    if (!enabled || !word) return
    let alive = true
    wiktionaryLookup(word).then((detail) => {
      if (alive) setGot({ word, detail })
    })
    return () => { alive = false }
  }, [word, enabled])

  return got && got.word === word ? got.detail : null
}
