export interface ExplanationSegment {
  label: string | null
  html: string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 解説文を「本文（正答の解説）」と「A：/B：/C：/D：」で始まる誤答解説に分割し、
 * 各選択肢の文言が登場する箇所を強調（<strong>）した安全なHTML断片を返す。
 */
export function formatExplanation(explanation: string, choices: readonly string[]): ExplanationSegment[] {
  const raw: { label: string | null; text: string }[] = []
  const labelPattern = /([ABCD])：/g
  let lastIndex = 0
  let currentLabel: string | null = null
  let match: RegExpExecArray | null
  while ((match = labelPattern.exec(explanation))) {
    const text = explanation.slice(lastIndex, match.index).trim()
    if (text) raw.push({ label: currentLabel, text })
    currentLabel = match[1]
    lastIndex = labelPattern.lastIndex
  }
  const tail = explanation.slice(lastIndex).trim()
  if (tail) raw.push({ label: currentLabel, text: tail })

  // 長い選択肢文言から順に照合し、短い文言が先にマッチして入れ子にならないようにする
  const terms = [...new Set(choices.filter(Boolean))].sort((a, b) => b.length - a.length)

  return raw.map(({ label, text }) => {
    let html = escapeHtml(text)
    for (const term of terms) {
      const escaped = escapeHtml(term)
      if (!escaped) continue
      const pattern = new RegExp(escapeRegExp(escaped), 'g')
      html = html.replace(pattern, (m) => `<strong>${m}</strong>`)
    }
    return { label, html }
  })
}
