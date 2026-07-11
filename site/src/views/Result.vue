<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProgressStore } from '../stores/progress'
import { useQuestionsStore } from '../stores/questions'

const route = useRoute()
const progressStore = useProgressStore()
const questionsStore = useQuestionsStore()

const session = computed(() =>
  progressStore.data.sessions.find((s) => s.id === (route.query.session as string)),
)

const wrongQuestions = computed(() =>
  (session.value?.wrongQuestionIds ?? [])
    .map((id) => questionsStore.byId(id))
    .filter((q): q is NonNullable<typeof q> => !!q),
)
</script>

<template>
  <section v-if="session">
    <h1>結果</h1>
    <p class="score">{{ session.correctCount }} / {{ session.totalCount }} 問正解</p>

    <div v-if="wrongQuestions.length > 0">
      <h2>間違えた問題</h2>
      <ul>
        <li v-for="q in wrongQuestions" :key="q.id">{{ q.text }}</li>
      </ul>
    </div>
    <p v-else>全問正解でした。</p>

    <div class="actions">
      <RouterLink to="/">トップへ戻る</RouterLink>
      <RouterLink to="/dashboard">成績を見る</RouterLink>
    </div>
  </section>
  <section v-else>
    <p>結果が見つかりませんでした。</p>
    <RouterLink to="/">トップへ戻る</RouterLink>
  </section>
</template>

<style scoped>
.score {
  font-size: 1.5rem;
  font-weight: 700;
}
.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
</style>
