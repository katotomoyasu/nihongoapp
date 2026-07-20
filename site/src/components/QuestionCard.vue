<script setup lang="ts">
import type { Question } from '../types/question'

defineProps<{ question: Question; index: number; total: number; attempts: number }>()
</script>

<template>
  <div class="question-card">
    <div class="meta">
      <span>{{ index }} / {{ total }}問</span>
      <span>{{ question.category }} - {{ question.subcategory }}</span>
      <span>難易度 {{ '★'.repeat(question.difficulty) }}</span>
      <span>出題回数 {{ attempts }}回</span>
    </div>
    <p class="text">{{ question.text }}</p>
  </div>
</template>

<style scoped>
.question-card {
  margin-bottom: 1rem;
}
.meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
}
.text {
  font-size: 1.1rem;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
