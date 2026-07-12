<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProgressStore } from '../stores/progress'
import { useQuestionsStore } from '../stores/questions'
import ScoreChart from '../components/ScoreChart.vue'

const RECENT_LIMIT = 5

const progressStore = useProgressStore()
const questionsStore = useQuestionsStore()

const chartView = ref<'category' | 'daily'>('category')

const totalAnswered = computed(() => Object.keys(progressStore.data.records).length)

const studyDays = computed(() => {
  const days = new Set(
    Object.values(progressStore.data.records).map((r) => r.lastAnsweredAt.slice(0, 10)),
  )
  return days.size
})

const categoryAccuracy = computed(() => {
  const stats: Record<string, { attempts: number; correct: number; lastAnsweredAt: string }> = {}
  for (const q of questionsStore.all) {
    const record = progressStore.data.records[q.id]
    if (!record) continue
    const s = (stats[q.category] ??= { attempts: 0, correct: 0, lastAnsweredAt: '' })
    s.attempts += record.attempts
    s.correct += record.correct
    if (record.lastAnsweredAt > s.lastAnsweredAt) s.lastAnsweredAt = record.lastAnsweredAt
  }
  return Object.entries(stats)
    .map(([category, s]) => ({
      category,
      accuracy: s.attempts === 0 ? 0 : Math.round((s.correct / s.attempts) * 100),
      lastAnsweredAt: s.lastAnsweredAt,
    }))
    .sort((a, b) => b.lastAnsweredAt.localeCompare(a.lastAnsweredAt))
    .slice(0, RECENT_LIMIT)
})

const dailyAccuracy = computed(() => {
  const stats: Record<string, { attempts: number; correct: number }> = {}
  for (const record of Object.values(progressStore.data.records)) {
    for (const h of record.history) {
      const day = h.at.slice(0, 10)
      const s = (stats[day] ??= { attempts: 0, correct: 0 })
      s.attempts += 1
      if (h.result === 'correct') s.correct += 1
    }
  }
  return Object.entries(stats)
    .map(([day, s]) => ({
      day,
      accuracy: s.attempts === 0 ? 0 : Math.round((s.correct / s.attempts) * 100),
    }))
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, RECENT_LIMIT)
    .reverse()
})

const weakRanking = computed(() => {
  return Object.entries(progressStore.data.records)
    .map(([id, r]) => ({
      id,
      text: questionsStore.byId(id)?.text ?? id,
      incorrectCount: r.attempts - r.correct,
    }))
    .filter((r) => r.incorrectCount > 0)
    .sort((a, b) => b.incorrectCount - a.incorrectCount)
    .slice(0, 5)
})

const recentSessions = computed(() =>
  [...progressStore.data.sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
    .slice(0, 10),
)
</script>

<template>
  <section>
    <h1>成績ダッシュボード</h1>

    <div class="summary">
      <div class="stat"><span class="value">{{ progressStore.overallAccuracy }}%</span><span>全体正答率</span></div>
      <div class="stat"><span class="value">{{ totalAnswered }}</span><span>回答済み問題数</span></div>
      <div class="stat"><span class="value">{{ studyDays }}</span><span>学習日数</span></div>
    </div>

    <div class="chart-header">
      <h2>{{ chartView === 'category' ? 'カテゴリ別正答率（直近5件）' : '日別正答率（直近5日間）' }}</h2>
      <div class="chart-tabs">
        <button
          type="button"
          :class="{ active: chartView === 'category' }"
          @click="chartView = 'category'"
        >
          カテゴリ別
        </button>
        <button
          type="button"
          :class="{ active: chartView === 'daily' }"
          @click="chartView = 'daily'"
        >
          日別
        </button>
      </div>
    </div>
    <ScoreChart
      v-if="chartView === 'category' && categoryAccuracy.length > 0"
      :labels="categoryAccuracy.map((c) => c.category)"
      :values="categoryAccuracy.map((c) => c.accuracy)"
    />
    <ScoreChart
      v-else-if="chartView === 'daily' && dailyAccuracy.length > 0"
      :labels="dailyAccuracy.map((d) => d.day)"
      :values="dailyAccuracy.map((d) => d.accuracy)"
    />
    <p v-else>まだデータがありません。</p>

    <h2>苦手問題ランキング</h2>
    <ol v-if="weakRanking.length > 0">
      <li v-for="w in weakRanking" :key="w.id">{{ w.text }}（不正解 {{ w.incorrectCount }} 回）</li>
    </ol>
    <p v-else>まだデータがありません。</p>

    <h2>演習履歴</h2>
    <ul v-if="recentSessions.length > 0">
      <li v-for="s in recentSessions" :key="s.id">
        {{ s.finishedAt?.slice(0, 16).replace('T', ' ') }} - {{ s.correctCount }}/{{ s.totalCount }}問正解（{{ s.mode }}）
      </li>
    </ul>
    <p v-else>まだ演習履歴がありません。</p>
  </section>
</template>

<style scoped>
.summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  flex: 1;
}
.stat .value {
  font-size: 1.5rem;
  font-weight: 700;
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.chart-tabs {
  display: flex;
  gap: 0.5rem;
}
.chart-tabs button {
  border: 1px solid #e2e2e2;
  background: #fff;
  border-radius: 6px;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.chart-tabs button.active {
  background: #42a5f5;
  border-color: #42a5f5;
  color: #fff;
}
</style>
