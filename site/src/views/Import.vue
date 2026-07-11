<script setup lang="ts">
import { ref } from 'vue'
import { useQuestionsStore } from '../stores/questions'
import { convertExcelFile, mergeQuestions, type CategoryMaster } from '../utils/excelImport'
import categoryMaster from '../data/category-master.json'
import type { Question } from '../types/question'

const questionsStore = useQuestionsStore()

const fileInput = ref<HTMLInputElement | null>(null)
const isProcessing = ref(false)
const errors = ref<string[]>([])
const warnings = ref<string[]>([])
const preview = ref<{ fileLabel: string; added: number; updated: number; total: number; merged: Question[] } | null>(null)

function triggerSelect() {
  fileInput.value?.click()
}

async function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isProcessing.value = true
  errors.value = []
  warnings.value = []
  preview.value = null

  try {
    const result = await convertExcelFile(file, categoryMaster as CategoryMaster, questionsStore.all)
    errors.value = result.errors
    warnings.value = result.warnings

    if (result.errors.length === 0 && result.questions.length > 0) {
      const { merged, added, updated } = mergeQuestions(questionsStore.all, result.questions)
      preview.value = { fileLabel: result.fileLabel, added, updated, total: merged.length, merged }
    }
  } catch (e) {
    errors.value = [`変換中にエラーが発生しました: ${(e as Error).message}`]
  } finally {
    isProcessing.value = false
    input.value = ''
  }
}

function handleDownload() {
  if (!preview.value) return
  const bank = {
    version: new Date().toISOString().slice(0, 10),
    questions: preview.value.merged,
  }
  const blob = new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'questions.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section>
    <h1>問題データの取り込み</h1>
    <p>
      Excelファイル（問題／管理データ／詳細解説の3シート構成）を選択すると、ブラウザ内で
      <code>questions.json</code> に変換します。ここで生成されるのはダウンロード用のファイルのみで、
      サイトへの反映にはダウンロードしたファイルを <code>site/src/data/questions.json</code> に置き換えて
      ビルド・デプロイし直す必要があります。
    </p>

    <button @click="triggerSelect" :disabled="isProcessing">
      {{ isProcessing ? '変換中…' : 'Excelファイルを選択' }}
    </button>
    <input ref="fileInput" type="file" accept=".xlsx" hidden @change="handleFile" />

    <div v-if="errors.length > 0" class="card error">
      <h2>エラー（{{ errors.length }}件）</h2>
      <p>修正後、もう一度ファイルを選択し直してください。</p>
      <ul>
        <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
      </ul>
    </div>

    <div v-if="warnings.length > 0" class="card warning">
      <h2>警告（{{ warnings.length }}件）</h2>
      <ul>
        <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      </ul>
    </div>

    <div v-if="preview" class="card ok">
      <h2>変換結果プレビュー</h2>
      <p>{{ preview.fileLabel }}</p>
      <p>新規 {{ preview.added }} 問 / 更新 {{ preview.updated }} 問（反映後の全体：{{ preview.total }} 問）</p>
      <button @click="handleDownload">questions.json をダウンロード</button>
    </div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}
.card.error {
  border-color: #c62828;
}
.card.warning {
  border-color: #f9a825;
}
.card.ok {
  border-color: #2e7d32;
}
ul {
  max-height: 240px;
  overflow-y: auto;
}
code {
  background: #f0f0f0;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}
</style>
