<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuestionsStore } from '../stores/questions'
import { useProgressStore } from '../stores/progress'
import { extractWeakQuestionIds } from '../utils/weakPoint'
import { pickPrioritized } from '../utils/prioritize'
import { QUIZ_SESSION_SIZE_OPTIONS, QUIZ_SESSION_SIZE_DEFAULT } from '../utils/constants'
import { formatExplanation } from '../utils/explanation'
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

type ShuffledQuestion = Question & { explanationLabelMap: Record<string, string> }

function shuffleChoices(q: Question): ShuffledQuestion {
  const order = shuffle([0, 1, 2, 3] as const)
  // 選択肢は常にA〜Dの順で表示する。一方で解説文中の「A：」「B：」等は元の並びを
  // 指しているため、元のラベル→シャッフル後に表示される位置のラベル、への対応表を作り
  // 解説側の表示だけを付け替える。
  const explanationLabelMap: Record<string, string> = {}
  order.forEach((originalIndex, newIndex) => {
    explanationLabelMap[LABELS[originalIndex]] = LABELS[newIndex]
  })
  return {
    ...q,
    choices: order.map((i) => q.choices[i]) as Question['choices'],
    correctIndex: order.indexOf(q.correctIndex) as Question['correctIndex'],
    explanationLabelMap,
  }
}

const questions = ref<ShuffledQuestion[]>([])
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

const explanationSegments = computed(() => {
  if (!current.value) return []
  const q = current.value
  const correctLabel = LABELS[q.correctIndex]
  return formatExplanation(q.explanation, q.choices)
    .map((seg) => ({ ...seg, displayLabel: q.explanationLabelMap[seg.label] ?? seg.label }))
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel))
    .map((seg) => ({ ...seg, isCorrect: seg.displayLabel === correctLabel }))
})

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
    <QuestionCard
      :question="current"
      :index="currentIndex + 1"
      :total="questions.length"
      :attempts="progressStore.data.records[current.id]?.attempts ?? 0"
    />

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
      <div class="explanation">
        <p v-for="(seg, idx) in explanationSegments" :key="idx">
          <strong class="seg-label" :class="{ correct: seg.isCorrect }"
            >{{ seg.displayLabel }}{{ seg.isCorrect ? '（正解）' : '' }}：</strong
          ><span v-html="seg.html"></span>
        </p>
      </div>
      <p v-if="current.source" class="source">出典: {{ current.source }}</p>
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
  text-align: left;
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
  line-height: 1.7;
}
.explanation p {
  margin: 0 0 0.6rem;
}
.explanation p:last-child {
  margin-bottom: 0;
}
.explanation :deep(strong) {
  color: #c62828;
  font-weight: 700;
}
.explanation .seg-label {
  color: inherit;
  margin-right: 0.2rem;
}
.explanation .seg-label.correct {
  color: #2e7d32;
}
.source {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #666;
}
</style>
