export type AnswerResult = 'correct' | 'incorrect'

export interface QuestionRecord {
  attempts: number
  correct: number
  lastResult: AnswerResult
  lastAnsweredAt: string
  history: Array<{ at: string; result: AnswerResult }>
}

export type QuizMode = 'all' | 'category' | 'review_wrong'

export interface QuizSession {
  id: string
  mode: QuizMode
  startedAt: string
  finishedAt: string | null
  questionIds: string[]
  wrongQuestionIds: string[]
  correctCount: number
  totalCount: number
}

export interface ProgressData {
  schemaVersion: 1
  records: Record<string, QuestionRecord>
  sessions: QuizSession[]
}

export const HISTORY_LIMIT = 10
