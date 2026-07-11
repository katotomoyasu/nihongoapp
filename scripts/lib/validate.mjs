import { difficultyToNumber, answerLetterToIndex } from './buildQuestionId.mjs'

/**
 * 仕様書5.3節のバリデーションを行う。
 * 戻り値: { errors: string[], warnings: string[], questions: object[] }
 * エラーが1件でもあれば questions は空のまま返す（呼び出し側で書き込みを止める）。
 */
export function validateAndBuild({ parsed, categoryInfo, fileLabel }) {
  const errors = []
  const warnings = []
  const questions = []

  if (!categoryInfo) {
    errors.push(
      `[${fileLabel}] category-master.json に科目・中分類が未登録です。追記してから再実行してください。`,
    )
    return { errors, warnings, questions }
  }

  const seenNo = new Set()

  for (const row of parsed.rows) {
    const prefix = `[${fileLabel}] No.${row.no} (行${row.rowNumber})`

    if (seenNo.has(row.no)) {
      errors.push(`${prefix}: No が重複しています`)
    }
    seenNo.add(row.no)

    if (!row.difficulty) errors.push(`${prefix}: 難易度が空です`)
    if (!row.text) errors.push(`${prefix}: 問題文が空です`)
    row.choices.forEach((c, i) => {
      if (!c) errors.push(`${prefix}: 選択肢${'ABCD'[i]}が空です`)
    })
    const uniqueChoices = new Set(row.choices.filter(Boolean))
    if (uniqueChoices.size !== row.choices.filter(Boolean).length) {
      warnings.push(`${prefix}: 選択肢に重複がある可能性があります`)
    }

    const difficultyNum = difficultyToNumber(row.difficulty)
    if (row.difficulty && difficultyNum === null) {
      errors.push(`${prefix}: 難易度の値が不正です（${row.difficulty}）`)
    }

    const correctLetter = parsed.correctByNo.get(row.no)
    if (!correctLetter) {
      errors.push(`${prefix}: 管理データシートに正解が見つかりません`)
    } else if (!['A', 'B', 'C', 'D'].includes(correctLetter)) {
      errors.push(`${prefix}: 管理データシートの正解値が不正です（${correctLetter}）`)
    }

    const detailLetter = parsed.detailCorrectByNo.get(row.no)
    if (detailLetter && correctLetter && detailLetter !== correctLetter) {
      errors.push(
        `${prefix}: 「管理データ」正解(${correctLetter})と「詳細解説」正解(${detailLetter})が一致しません`,
      )
    }

    if (errors.length > 0) continue

    const correctIndex = answerLetterToIndex(correctLetter)
    const id = `${categoryInfo.categorySlug}-${categoryInfo.subcategorySlug}-${String(row.no).padStart(3, '0')}`

    questions.push({
      id,
      no: row.no,
      category: categoryInfo.category,
      subcategory: categoryInfo.subcategory,
      difficulty: difficultyNum,
      text: row.text,
      choices: row.choices,
      correctIndex,
      explanation: row.explanation || '',
      ...(row.source ? { source: row.source } : {}),
    })
  }

  // 管理データシートに存在するが「問題」シートに存在しないNo（欠番）を検知
  for (const no of parsed.correctByNo.keys()) {
    if (!seenNo.has(no)) {
      warnings.push(`[${fileLabel}] No.${no}: 管理データに正解はあるが「問題」シートに行がありません`)
    }
  }

  return { errors, warnings, questions: errors.length > 0 ? [] : questions }
}

export function checkIdCollisionsAndDeletions(newQuestions, existingQuestions, fileLabel) {
  const errors = []
  const warnings = []
  const newIds = new Set(newQuestions.map((q) => q.id))

  const idCounts = new Map()
  for (const q of newQuestions) {
    idCounts.set(q.id, (idCounts.get(q.id) ?? 0) + 1)
  }
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`[${fileLabel}] id "${id}" が変換結果内で重複しています`)
  }

  const sameFileExistingIds = existingQuestions
    .filter((q) => q.id.startsWith(`${newQuestions[0]?.id.split('-').slice(0, -1).join('-')}-`))
    .map((q) => q.id)
  for (const id of sameFileExistingIds) {
    if (!newIds.has(id)) {
      warnings.push(`[${fileLabel}] 既存の id "${id}" が今回の変換結果から消えています（削除検知）`)
    }
  }

  return { errors, warnings }
}
