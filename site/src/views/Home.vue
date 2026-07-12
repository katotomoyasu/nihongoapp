<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuestionsStore } from '../stores/questions'
import { useProgressStore } from '../stores/progress'
import { extractWeakQuestionIds } from '../utils/weakPoint'

const router = useRouter()
const questionsStore = useQuestionsStore()
const progressStore = useProgressStore()

const selectedCategory = ref('')

const weakCount = computed(() => extractWeakQuestionIds(progressStore.data.records).length)

function startAll() {
  router.push({ path: '/quiz', query: { mode: 'all' } })
}

function startCategory() {
  if (!selectedCategory.value) return
  router.push({ path: '/quiz', query: { mode: 'category', category: selectedCategory.value } })
}

function startWeak() {
  router.push({ path: '/quiz', query: { mode: 'review_wrong' } })
}
</script>

<template>
  <section>
    <h1>演習モードを選択</h1>
    <p>全{{ questionsStore.all.length }}問</p>

    <div class="mode-card">
      <h2>全範囲演習</h2>
      <p>未回答・間違えたことがある問題を優先しつつ出題します。</p>
      <button @click="startAll">開始する</button>
    </div>

    <div class="mode-card">
      <h2>カテゴリ別演習</h2>
      <select v-model="selectedCategory">
        <option value="" disabled>カテゴリを選択</option>
        <option v-for="c in questionsStore.categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button :disabled="!selectedCategory" @click="startCategory">開始する</button>
    </div>

    <div class="mode-card">
      <h2>苦手克服モード</h2>
      <p v-if="weakCount === 0">まだ苦手な問題はありません。演習を進めるとここに表示されます。</p>
      <p v-else>苦手な問題が {{ weakCount }} 問あります。</p>
      <button :disabled="weakCount === 0" @click="startWeak">開始する</button>
    </div>
  </section>
</template>

<style scoped>
.mode-card {
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.mode-card h2 {
  margin-top: 0;
  font-size: 1.1rem;
}
button {
  margin-top: 0.5rem;
}
select {
  display: block;
  margin-bottom: 0.5rem;
}
</style>
