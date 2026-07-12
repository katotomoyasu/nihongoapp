<script setup lang="ts">
import { ref } from 'vue'
import { useProgressStore } from '../stores/progress'
import { exportProgress, importProgress } from '../utils/storage'
import {
  loadSyncConfig,
  saveSyncConfig,
  clearSyncConfig,
  pushProgress,
  pullProgress,
} from '../utils/serverSync'

const progressStore = useProgressStore()
const message = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const savedSyncConfig = loadSyncConfig()
const syncEndpoint = ref(savedSyncConfig?.endpoint ?? '')
const syncToken = ref(savedSyncConfig?.token ?? '')
const syncMessage = ref('')
const syncing = ref(false)

function currentSyncConfig() {
  if (!syncEndpoint.value || !syncToken.value) return null
  return { endpoint: syncEndpoint.value, token: syncToken.value }
}

async function handleSaveSyncConfig() {
  const config = currentSyncConfig()
  if (!config) {
    syncMessage.value = 'APIのURLとトークンを入力してください。'
    return
  }
  saveSyncConfig(config)
  syncing.value = true
  try {
    // 保存直後にサーバー側とマージしておく（他端末の成績を空データで上書きしないため）
    await progressStore.syncFromServer()
    syncMessage.value = '同期設定を保存し、サーバーのデータと同期しました。'
  } finally {
    syncing.value = false
  }
}

function handleClearSyncConfig() {
  clearSyncConfig()
  syncEndpoint.value = ''
  syncToken.value = ''
  syncMessage.value = '同期設定を削除しました。'
}

async function handlePushToServer() {
  const config = currentSyncConfig()
  if (!config) {
    syncMessage.value = 'APIのURLとトークンを入力してください。'
    return
  }
  syncing.value = true
  try {
    await pushProgress(config, exportProgress())
    syncMessage.value = 'サーバーに保存しました。'
  } catch (e) {
    syncMessage.value = (e as Error).message
  } finally {
    syncing.value = false
  }
}

async function handlePullFromServer() {
  const config = currentSyncConfig()
  if (!config) {
    syncMessage.value = 'APIのURLとトークンを入力してください。'
    return
  }
  if (!confirm('サーバーのデータでこの端末の成績データを上書きします。よろしいですか？')) return
  syncing.value = true
  try {
    const json = await pullProgress(config)
    const data = importProgress(json)
    progressStore.replaceAll(data)
    syncMessage.value = 'サーバーから復元しました。'
  } catch (e) {
    syncMessage.value = (e as Error).message
  } finally {
    syncing.value = false
  }
}

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

    <div class="card">
      <h2>サーバーへの保存</h2>
      <p>
        設定した保存用APIに成績データを保存できます（演習を1回終えるごとに自動保存も行われます）。
        この設定はこの端末の localStorage にのみ保存され、Gitリポジトリには含まれません。
      </p>
      <label class="field">
        APIのURL
        <input v-model="syncEndpoint" type="text" placeholder="https://your-domain.example/api/progress" />
      </label>
      <label class="field">
        トークン
        <input v-model="syncToken" type="password" placeholder="サーバーに設定したトークン" />
      </label>
      <div class="actions">
        <button @click="handleSaveSyncConfig">設定を保存</button>
        <button @click="handleClearSyncConfig">設定を削除</button>
        <button :disabled="syncing" @click="handlePushToServer">今すぐサーバーに保存</button>
        <button :disabled="syncing" @click="handlePullFromServer">サーバーから復元</button>
      </div>
      <p v-if="syncMessage" class="message">{{ syncMessage }}</p>
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
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}
.field input {
  padding: 0.4rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.actions button {
  margin-right: 0;
}
</style>
