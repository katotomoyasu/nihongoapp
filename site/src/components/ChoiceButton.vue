<script setup lang="ts">
defineProps<{
  label: string
  text: string
  status: 'idle' | 'correct' | 'incorrect' | 'faded'
  disabled: boolean
}>()

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <button
    class="choice"
    :class="status"
    :disabled="disabled"
    @click="emit('select')"
  >
    <span class="label">{{ label }}</span>
    <span class="text">{{ text }}</span>
  </button>
</template>

<style scoped>
.choice {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  font-size: 1rem;
  cursor: pointer;
}
.choice:disabled {
  cursor: default;
}
.choice.faded {
  opacity: 0.5;
}
.choice.correct {
  border-color: #2e7d32;
  background: #e8f5e9;
}
.choice.incorrect {
  border-color: #c62828;
  background: #ffebee;
}
.label {
  font-weight: 700;
  flex-shrink: 0;
}
</style>
