export interface ExplanationSegment {
  label: string
  html: string
}

const ALL_LABELS = ['A', 'B', 'C', 'D']

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 解説文を「本文（正答の解説）」と「A：/B：/C：/D：」で始まる誤答解説に分割し、
 * 各選択肢の文言が登場する箇所を強調（<strong>）した安全なHTML断片を返す。
 * 本文（ラベル無し）には、他の3つに登場しない残り1文字（＝正答のラベル）を割り当てる。
 */
export function formatExplanation(explanation: string, choices: readonly string[]): ExplanationSegment[] {
  const raw: { label: string | null; text: string; isRecap: boolean }[] = []
  // 「X：」の通常表記に加え、「X（正解）：」という重複再掲表記も区切りとして認識する
  const labelPattern = /([ABCD])(?:（正解）)?：/g
  let lastIndex = 0
  let currentLabel: string | null = null
  let currentIsRecap = false
  let match: RegExpExecArray | null
  while ((match = labelPattern.exec(explanation))) {
    const text = explanation.slice(lastIndex, match.index).trim()
    if (text) raw.push({ label: currentLabel, text, isRecap: currentIsRecap })
    currentLabel = match[1]
    currentIsRecap = match[0].includes('正解')
    lastIndex = labelPattern.lastIndex
  }
  const tail = explanation.slice(lastIndex).trim()
  if (tail) raw.push({ label: currentLabel, text: tail, isRecap: currentIsRecap })

  // 正答は先頭の無ラベル本文で既に説明されているため、「X（正解）：」に続く重複の再掲部分は表示しない
  const segments = raw.filter((r) => !r.isRecap)

  const foundLabels = new Set(segments.map((r) => r.label).filter((l): l is string => l !== null))
  const impliedLabel = ALL_LABELS.find((l) => !foundLabels.has(l)) ?? ALL_LABELS[0]

  // 長い選択肢文言から順に照合し、短い文言が先にマッチして入れ子にならないようにする
  const terms = [...new Set(choices.filter(Boolean))].sort((a, b) => b.length - a.length)

  return segments.map(({ label, text }) => {
    let html = escapeHtml(text)
    for (const term of terms) {
      const escaped = escapeHtml(term)
      if (!escaped) continue
      const pattern = new RegExp(escapeRegExp(escaped), 'g')
      html = html.replace(pattern, (m) => `<strong>${m}</strong>`)
    }
    return { label: label ?? impliedLabel, html }
  })
}
