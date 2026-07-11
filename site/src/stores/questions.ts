import { defineStore } from 'pinia'
import type { Question, QuestionBank } from '../types/question'
import questionBank from '../data/questions.json'

export const useQuestionsStore = defineStore('questions', {
  state: (): { bank: QuestionBank } => ({
    bank: questionBank as QuestionBank,
  }),
  getters: {
    all(state): Question[] {
      return state.bank.questions
    },
    categories(state): string[] {
      return [...new Set(state.bank.questions.map((q) => q.category))]
    },
    subcategoriesByCategory(state): Record<string, string[]> {
      const map: Record<string, Set<string>> = {}
      for (const q of state.bank.questions) {
        map[q.category] ??= new Set()
        map[q.category].add(q.subcategory)
      }
      return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]))
    },
    byId(state): (id: string) => Question | undefined {
      return (id: string) => state.bank.questions.find((q) => q.id === id)
    },
  },
})
