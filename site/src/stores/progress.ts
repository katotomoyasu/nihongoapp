import { defineStore } from 'pinia'
import type { AnswerResult, ProgressData, QuizMode, QuizSession } from '../types/progress'
import { HISTORY_LIMIT } from '../types/progress'
import { loadProgress, saveProgress, resetProgress } from '../utils/storage'
import { loadSyncConfig, pushProgress } from '../utils/serverSync'

function nowIso(): string {
  return new Date().toISOString()
}

export const useProgressStore = defineStore('progress', {
  state: (): { data: ProgressData } => ({
    data: loadProgress(),
  }),
  getters: {
    overallAccuracy(state): number {
      const records = Object.values(state.data.records)
      const attempts = records.reduce((sum, r) => sum + r.attempts, 0)
      const correct = records.reduce((sum, r) => sum + r.correct, 0)
      return attempts === 0 ? 0 : Math.round((correct / attempts) * 100)
    },
  },
  actions: {
    recordAnswer(questionId: string, result: AnswerResult) {
      const record = this.data.records[questionId] ?? {
        attempts: 0,
        correct: 0,
        lastResult: result,
        lastAnsweredAt: nowIso(),
        history: [],
      }
      record.attempts += 1
      if (result === 'correct') record.correct += 1
      record.lastResult = result
      record.lastAnsweredAt = nowIso()
      record.history = [...record.history, { at: record.lastAnsweredAt, result }].slice(-HISTORY_LIMIT)
      this.data.records[questionId] = record
      saveProgress(this.data)
    },
    startSession(mode: QuizMode, questionIds: string[]): QuizSession {
      const session: QuizSession = {
        id: `S${Date.now()}`,
        mode,
        startedAt: nowIso(),
        finishedAt: null,
        questionIds,
        wrongQuestionIds: [],
        correctCount: 0,
        totalCount: questionIds.length,
      }
      this.data.sessions.push(session)
      saveProgress(this.data)
      return session
    },
    finishSession(sessionId: string, correctCount: number, wrongQuestionIds: string[]) {
      const session = this.data.sessions.find((s) => s.id === sessionId)
      if (!session) return
      session.finishedAt = nowIso()
      session.correctCount = correctCount
      session.wrongQuestionIds = wrongQuestionIds
      saveProgress(this.data)
      this.syncToServer()
    },
    syncToServer() {
      const config = loadSyncConfig()
      if (!config) return
      pushProgress(config, JSON.stringify(this.data)).catch(() => {
        // オフライン等での失敗は無視する（データはlocalStorageに残っている）
      })
    },
    resetAll() {
      this.data = resetProgress()
    },
    replaceAll(data: ProgressData) {
      this.data = data
      saveProgress(this.data)
    },
  },
})
