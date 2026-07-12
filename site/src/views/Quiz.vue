<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuestionsStore } from '../stores/questions'
import { useProgressStore } from '../stores/progress'
import { extractWeakQuestionIds } from '../utils/weakPoint'
import { pickPrioritized } from '../utils/prioritize'
import { QUIZ_SESSION_SIZE_OPTIONS, QUIZ_SESSION_SIZE_DEFAULT } from '../utils/constants'
import type { Question } from '../types/question'
import type { QuizMode } from '../types/progress'
import QuestionCard from '../components/QuestionCard.vue'
import ChoiceButton from '../components/ChoiceButton.vue'

const route = useRoute()
const router = useRouter()
const questionsStore = useQuestionsStore()
const progressStore = useProgressStore()

const LABELS = ['A', 'B', 'C', 'D']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleChoices(q: Question): Question {
  const order = shuffle([0, 1, 2, 3] as const)
  return {
    ...q,
    choices: order.map((i) => q.choices[i]) as Question['choices'],
    correctIndex: order.indexOf(q.correctIndex) as Question['correctIndex'],
  }
}

const questions = ref<Question[]>([])
const sessionId = ref('')
const currentIndex = ref(0)
const selectedIndex = ref<number | null>(null)
const answered = ref(false)
const correctCount = ref(0)
const wrongIds = ref<string[]>([])

const current = computed(() => questions.value[currentIndex.value])
const isLast = computed(() => currentIndex.value === questions.value.length - 1)

onMounted(() => {
  const mode = (route.query.mode as QuizMode) ?? 'all'
  const requestedCount = Number(route.query.count)
  const sessionSize = QUIZ_SESSION_SIZE_OPTIONS.includes(requestedCount as (typeof QUIZ_SESSION_SIZE_OPTIONS)[number])
    ? requestedCount
    : QUIZ_SESSION_SIZE_DEFAULT
  let pool: Question[]
  if (mode === 'category') {
    const category = route.query.category as string
    const candidates = questionsStore.all.filter((q) => q.category === category)
    pool = pickPrioritized(candidates, progressStore.data.records, sessionSize)
  } else if (mode === 'review_wrong') {
    // 優先度順（正答率が低い順）に並んでいるため、シャッフルせず先頭からsessionSize件を採用する
    const weakIds = extractWeakQuestionIds(progressStore.data.records).slice(0, sessionSize)
    pool = weakIds.map((id) => questionsStore.byId(id)).filter((q): q is Question => !!q)
  } else {
    pool = pickPrioritized(questionsStore.all, progressStore.data.records, sessionSize)
  }
  questions.value = pool.map(shuffleChoices)
  const session = progressStore.startSession(mode, pool.map((q) => q.id))
  sessionId.value = session.id
})

function selectChoice(index: number) {
  if (answered.value || !current.value) return
  selectedIndex.value = index
  answered.value = true
  const isCorrect = index === current.value.correctIndex
  if (isCorrect) {
    correctCount.value += 1
  } else {
    wrongIds.value.push(current.value.id)
  }
  progressStore.recordAnswer(current.value.id, isCorrect ? 'correct' : 'incorrect')
}

function choiceStatus(index: number): 'idle' | 'correct' | 'incorrect' | 'faded' {
  if (!answered.value) return 'idle'
  if (index === current.value.correctIndex) return 'correct'
  if (index === selectedIndex.value) return 'incorrect'
  return 'faded'
}

function next() {
  if (isLast.value) {
    progressStore.finishSession(sessionId.value, correctCount.value, wrongIds.value)
    router.push({ path: '/result', query: { session: sessionId.value } })
    return
  }
  currentIndex.value += 1
  selectedIndex.value = null
  answered.value = false
}
</script>

<template>
  <section v-if="current">
    <QuestionCard :question="current" :index="currentIndex + 1" :total="questions.length" />

    <ChoiceButton
      v-for="(choice, i) in current.choices"
      :key="i"
      :label="LABELS[i]"
      :text="choice"
      :status="choiceStatus(i)"
      :disabled="answered"
      @select="selectChoice(i)"
    />

    <div v-if="answered" class="feedback">
      <p class="result" :class="selectedIndex === current.correctIndex ? 'ok' : 'ng'">
        {{ selectedIndex === current.correctIndex ? '正解！' : '不正解' }}
      </p>
      <p class="explanation">{{ current.explanation }}</p>
      <button @click="next">{{ isLast ? '結果を見る' : '次の問題へ' }}</button>
    </div>
  </section>
  <section v-else>
    <p>出題できる問題がありません。</p>
    <RouterLink to="/">トップへ戻る</RouterLink>
  </section>
</template>

<style scoped>
.feedback {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: #f5f5f5;
}
.result {
  font-weight: 700;
  font-size: 1.1rem;
}
.result.ok {
  color: #2e7d32;
}
.result.ng {
  color: #c62828;
}
.explanation {
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>
