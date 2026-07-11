import type { QuestionRecord } from '../types/progress'

export const WEAK_ACCURACY_THRESHOLD = 0.6

/**
 * 苦手克服モードの抽出ロジック（仕様書3.2節）。
 * 「直近不正解」または「正答率が閾値未満」の問題IDを、正答率が低い順に返す。
 */
export function extractWeakQuestionIds(
  records: Record<string, QuestionRecord>,
  threshold: number = WEAK_ACCURACY_THRESHOLD,
): string[] {
  const weak = Object.entries(records)
    .filter(([, r]) => r.attempts >= 1)
    .filter(([, r]) => r.lastResult === 'incorrect' || r.correct / r.attempts < threshold)
    .map(([id, r]) => ({ id, accuracy: r.correct / r.attempts, attempts: r.attempts }))

  weak.sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
  return weak.map((w) => w.id)
}
