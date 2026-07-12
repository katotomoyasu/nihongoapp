import type { ProgressData, QuestionRecord, QuizSession } from '../types/progress'

function mergeRecord(a: QuestionRecord, b: QuestionRecord): QuestionRecord {
  if (a.attempts !== b.attempts) return a.attempts > b.attempts ? a : b
  return a.lastAnsweredAt >= b.lastAnsweredAt ? a : b
}

function mergeSessions(a: QuizSession[], b: QuizSession[]): QuizSession[] {
  const byId = new Map<string, QuizSession>()
  for (const s of [...a, ...b]) byId.set(s.id, s)
  return [...byId.values()].sort((x, y) => x.startedAt.localeCompare(y.startedAt))
}

/**
 * ローカルとサーバーの成績データをマージする（複数端末での自動同期用）。
 * 問題ごとの記録はattempts数が多い方（同数ならlastAnsweredAtが新しい方）を採用し、
 * セッション履歴はidで重複排除して開始日時順に結合する。片方だけが上書きpushして
 * もう一方の記録を消してしまわないようにするための処理。
 */
export function mergeProgressData(local: ProgressData, remote: ProgressData): ProgressData {
  const records: ProgressData['records'] = { ...local.records }
  for (const [id, r] of Object.entries(remote.records)) {
    records[id] = records[id] ? mergeRecord(records[id], r) : r
  }
  return {
    schemaVersion: 1,
    records,
    sessions: mergeSessions(local.sessions, remote.sessions),
  }
}
