import type { Question } from '../types/question'
import type { QuestionRecord } from '../types/progress'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 出題プールを「未回答」→「間違えたことがある」→「それ以外」の優先度で選び、
 * 上位limit件を返す（各階層内はシャッフル、選出後の並びもシャッフルする）。
 * 全範囲演習・カテゴリ別演習向け（仕様書3.2節）。
 */
export function pickPrioritized(
  pool: Question[],
  records: Record<string, QuestionRecord>,
  limit: number,
): Question[] {
  const unanswered: Question[] = []
  const everWrong: Question[] = []
  const rest: Question[] = []

  for (const q of pool) {
    const r = records[q.id]
    if (!r || r.attempts === 0) {
      unanswered.push(q)
    } else if (r.correct < r.attempts) {
      everWrong.push(q)
    } else {
      rest.push(q)
    }
  }

  const ordered = [...shuffle(unanswered), ...shuffle(everWrong), ...shuffle(rest)]
  return shuffle(ordered.slice(0, limit))
}
