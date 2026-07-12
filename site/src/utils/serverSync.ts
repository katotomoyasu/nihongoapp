const CONFIG_KEY = 'jlt_server_sync_v1'

export interface ServerSyncConfig {
  endpoint: string
  token: string
}

export function loadSyncConfig(): ServerSyncConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ServerSyncConfig
    if (!parsed.endpoint || !parsed.token) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSyncConfig(config: ServerSyncConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearSyncConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
}

export async function pushProgress(config: ServerSyncConfig, json: string): Promise<void> {
  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: json,
  })
  if (!res.ok) throw new Error(`サーバーへの保存に失敗しました（HTTP ${res.status}）`)
}

export async function pullProgress(config: ServerSyncConfig): Promise<string> {
  const res = await fetch(config.endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${config.token}` },
  })
  if (res.status === 404) throw new Error('サーバーにはまだ保存データがありません')
  if (!res.ok) throw new Error(`サーバーからの取得に失敗しました（HTTP ${res.status}）`)
  return res.text()
}
