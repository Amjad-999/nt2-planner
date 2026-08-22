import { describe, it, expect } from 'vitest'
import { AR_BLOCK, AR_DAY, AR_LESSON, countAr, pluralAr } from '@/lib/arabicCount'

/**
 * تمييز العدد — القاعدة التي تنكسر بصمت عند الاستيفاء المباشر.
 * The bug this guards against shipped once as «9 كتلة» and «6 درسًا».
 */

describe('countAr with lessons', () => {
  it('uses the plural for 3 through 10', () => {
    expect(countAr(3, AR_LESSON)).toBe('3 دروس')
    expect(countAr(6, AR_LESSON)).toBe('6 دروس')
    expect(countAr(9, AR_LESSON)).toBe('9 دروس')
    expect(countAr(10, AR_LESSON)).toBe('10 دروس')
  })

  it('uses the accusative singular for 11 through 99', () => {
    expect(countAr(11, AR_LESSON)).toBe('11 درسًا')
    expect(countAr(40, AR_LESSON)).toBe('40 درسًا')
    expect(countAr(99, AR_LESSON)).toBe('99 درسًا')
  })

  it('follows the last two digits past 100', () => {
    expect(countAr(164, AR_LESSON)).toBe('164 درسًا')
    expect(countAr(105, AR_LESSON)).toBe('105 دروس')
    expect(countAr(100, AR_LESSON)).toBe('100 درس')
    expect(countAr(200, AR_LESSON)).toBe('200 درس')
  })

  it('drops the numeral for one and two, as Arabic does', () => {
    expect(countAr(1, AR_LESSON)).toBe('درس واحد')
    expect(countAr(2, AR_LESSON)).toBe('درسان')
    expect(countAr(1, AR_DAY)).toBe('يوم واحد')
    expect(countAr(2, AR_BLOCK)).toBe('كتلتان')
  })

  it('reads naturally at zero', () => {
    expect(countAr(0, AR_LESSON)).toBe('0 دروس')
    expect(pluralAr(0, AR_DAY)).toBe('أيام')
  })

  it('never interpolates a bare singular where the plural is required', () => {
    for (let n = 3; n <= 10; n++) {
      expect(countAr(n, AR_BLOCK)).toBe(`${n} كتل`)
      expect(countAr(n, AR_DAY)).toBe(`${n} أيام`)
    }
  })

  it('ignores a sign or a fraction rather than printing one', () => {
    expect(countAr(-6, AR_LESSON)).toBe('6 دروس')
    expect(countAr(6.7, AR_LESSON)).toBe('6 دروس')
  })
})
