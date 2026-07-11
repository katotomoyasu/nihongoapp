<script setup lang="ts">
import { ref } from 'vue'
import { useProgressStore } from '../stores/progress'
import { exportProgress, importProgress } from '../utils/storage'

const progressStore = useProgressStore()
const message = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function handleExport() {
  const json = exportProgress()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jlt_progress_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = importProgress(text)
    progressStore.replaceAll(data)
    message.value = '成績データを復元しました。'
  } catch (e) {
    message.value = `インポートに失敗しました: ${(e as Error).message}`
  } finally {
    input.value = ''
  }
}

function handleReset() {
  if (!confirm('成績データをすべて削除します。よろしいですか？')) return
  progressStore.resetAll()
  message.value = '成績データをリセットしました。'
}
</script>

<template>
  <section>
    <h1>設定</h1>

    <div class="card">
      <h2>成績データのバックアップ</h2>
      <p>端末やブラウザを変える前に、成績データをエクスポートしておくことをおすすめします。</p>
      <button @click="handleExport">エクスポート（ダウンロード）</button>
      <button @click="triggerImport">インポート（復元）</button>
      <input ref="fileInput" type="file" accept="application/json" hidden @change="handleImportFile" />
    </div>

    <div class="card danger">
      <h2>成績データのリセット</h2>
      <p>全ての回答履歴・正答率がリセットされます。元に戻せません。</p>
      <button @click="handleReset">リセットする</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.card.danger {
  border-color: #c62828;
}
button {
  margin-right: 0.5rem;
}
.message {
  font-weight: 700;
}
</style>
