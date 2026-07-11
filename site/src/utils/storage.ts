import type { ProgressData } from '../types/progress'

const STORAGE_KEY = 'jlt_progress_v1'

function emptyProgress(): ProgressData {
  return { schemaVersion: 1, records: {}, sessions: [] }
}

export function loadProgress(): ProgressData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyProgress()
  try {
    const parsed = JSON.parse(raw) as ProgressData
    if (parsed.schemaVersion !== 1) return emptyProgress()
    return parsed
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(data: ProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetProgress(): ProgressData {
  const data = emptyProgress()
  saveProgress(data)
  return data
}

export function exportProgress(): string {
  return JSON.stringify(loadProgress(), null, 2)
}

export function importProgress(json: string): ProgressData {
  const parsed = JSON.parse(json) as ProgressData
  if (parsed.schemaVersion !== 1 || !parsed.records || !parsed.sessions) {
    throw new Error('不正な成績データファイルです')
  }
  saveProgress(parsed)
  return parsed
}
