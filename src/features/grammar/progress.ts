import { LESSONS, type LessonMeta } from '@/data/lessons'
import { GRAMMAR_EXERCISES } from '@/data/grammarExercises'
import type { State } from '@/store/types'

export function grammarLessonProgress(id: string, progress: State['grammarProgress']) {
  const total = GRAMMAR_EXERCISES[id]?.length ?? 0
  const correct = new Set((progress[id] ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < total)).size
  return { correct, total, complete: total > 0 && correct === total }
}

export function recommendedGrammarLesson(progress: State['grammarProgress'], lessons: LessonMeta[] = LESSONS) {
  return lessons.find(lesson => {
    const result = grammarLessonProgress(lesson.id, progress)
    return result.correct > 0 && !result.complete
  }) ?? lessons.find(lesson => {
    const result = grammarLessonProgress(lesson.id, progress)
    return result.total > 0 && !result.complete
  }) ?? lessons[0]
}

export function grammarSummary(progress: State['grammarProgress']) {
  return LESSONS.reduce((summary, lesson) => {
    const result = grammarLessonProgress(lesson.id, progress)
    return {
      correct: summary.correct + result.correct,
      total: summary.total + result.total,
      completedLessons: summary.completedLessons + Number(result.complete),
      lessonsWithExercises: summary.lessonsWithExercises + Number(result.total > 0),
    }
  }, { correct: 0, total: 0, completedLessons: 0, lessonsWithExercises: 0 })
}
