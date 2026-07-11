import ExcelJS from 'exceljs'
import type { Question } from '../types/question'

/**
 * scripts/lib/parseExcel.mjs・validate.mjs・buildQuestionId.mjs のロジックを
 * ブラウザ向けに移植したもの（仕様書5.6.3節）。Node CLI側と処理内容を揃えている。
 */

const TITLE_PATTERN = /^(\d{8})_科目(\d+)_(.+?)_(.+?)_問題_v(\d+)$/
const DIFFICULTY_MAP: Record<string, 1 | 2 | 3> = { '★': 1, '★★': 2, '★★★': 3 }
const ANSWER_INDEX: Record<string, 0 | 1 | 2 | 3> = { A: 0, B: 1, C: 2, D: 3 }

export interface CategoryMasterEntry {
  category: string
  categorySlug: string
  subcategories: Record<string, string>
}
export type CategoryMaster = Record<string, CategoryMasterEntry>

export interface ImportResult {
  errors: string[]
  warnings: string[]
  questions: Question[]
  fileLabel: string
}

function cellText(cell: ExcelJS.Cell | undefined): string | null {
  const v = cell?.value
  if (v === null || v === undefined) return null
  if (typeof v === 'object' && 'richText' in (v as object)) {
    return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join('')
  }
  return String(v).trim()
}

function parseTitle(title: string) {
  const m = TITLE_PATTERN.exec(title)
  if (!m) return null
  const [, date, subjectNo, rawCategory, subcategory, version] = m
  return { date, subjectNo, rawCategory, subcategory, version: Number(version) }
}

function resolveCategory(categoryMaster: CategoryMaster, subjectNo: string, subcategoryRaw: string) {
  const entry = categoryMaster[`科目${subjectNo}`]
  if (!entry) return null
  const subcategorySlug = entry.subcategories?.[subcategoryRaw]
  if (!subcategorySlug) return null
  return {
    category: entry.category,
    categorySlug: entry.categorySlug,
    subcategory: subcategoryRaw,
    subcategorySlug,
  }
}

export async function convertExcelFile(
  file: File,
  categoryMaster: CategoryMaster,
  existingQuestions: Question[],
): Promise<ImportResult> {
  const fileLabel = file.name
  const errors: string[] = []
  const warnings: string[] = []

  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheetMondai = workbook.getWorksheet('問題')
  const sheetKanri = workbook.getWorksheet('管理データ')
  const sheetShosai = workbook.getWorksheet('詳細解説')

  if (!sheetMondai) return { errors: [`[${fileLabel}] シート「問題」が見つかりません`], warnings, questions: [], fileLabel }
  if (!sheetKanri) return { errors: [`[${fileLabel}] シート「管理データ」が見つかりません`], warnings, questions: [], fileLabel }

  const title = cellText(sheetKanri.getCell('B1'))
  const titleInfo = title ? parseTitle(title) : null
  if (!titleInfo) {
    errors.push(`[${fileLabel}] 管理データシートのタイトル文字列を解析できません: "${title}"`)
    return { errors, warnings, questions: [], fileLabel }
  }

  const categoryInfo = resolveCategory(categoryMaster, titleInfo.subjectNo, titleInfo.subcategory)
  if (!categoryInfo) {
    errors.push(
      `[${fileLabel}] category-master.json に科目${titleInfo.subjectNo}・中分類「${titleInfo.subcategory}」が未登録です。Claude Codeに伝えて category-master.json に追記してもらってから再実行してください。`,
    )
    return { errors, warnings, questions: [], fileLabel }
  }

  // 管理データシート: 7行目がヘッダー、8行目以降がNo/正解データ
  const correctByNo = new Map<number, string | null>()
  for (let r = 8; r <= sheetKanri.rowCount; r++) {
    const no = sheetKanri.getCell(r, 1).value
    if (no === null || no === undefined || no === '') continue
    correctByNo.set(Number(no), cellText(sheetKanri.getCell(r, 2)))
  }

  // 詳細解説シート: 正解列(4列目)。整合性チェック用。
  const detailCorrectByNo = new Map<number, string | null>()
  if (sheetShosai) {
    for (let r = 2; r <= sheetShosai.rowCount; r++) {
      const no = sheetShosai.getCell(r, 1).value
      if (no === null || no === undefined || no === '') continue
      detailCorrectByNo.set(Number(no), cellText(sheetShosai.getCell(r, 4)))
    }
  }

  const questions: Question[] = []
  const seenNo = new Set<number>()

  for (let r = 2; r <= sheetMondai.rowCount; r++) {
    const noCell = sheetMondai.getCell(r, 1).value
    if (noCell === null || noCell === undefined || noCell === '' || typeof noCell !== 'number') continue
    const no = noCell
    const prefix = `[${fileLabel}] No.${no} (行${r})`

    if (seenNo.has(no)) errors.push(`${prefix}: No が重複しています`)
    seenNo.add(no)

    const difficultyMark = cellText(sheetMondai.getCell(r, 2))
    const text = cellText(sheetMondai.getCell(r, 3))
    const choices = [
      cellText(sheetMondai.getCell(r, 4)),
      cellText(sheetMondai.getCell(r, 5)),
      cellText(sheetMondai.getCell(r, 6)),
      cellText(sheetMondai.getCell(r, 7)),
    ]
    const explanation = cellText(sheetMondai.getCell(r, 10)) ?? ''
    const source = cellText(sheetMondai.getCell(r, 11)) ?? undefined

    if (!difficultyMark) errors.push(`${prefix}: 難易度が空です`)
    if (!text) errors.push(`${prefix}: 問題文が空です`)
    choices.forEach((c, i) => {
      if (!c) errors.push(`${prefix}: 選択肢${'ABCD'[i]}が空です`)
    })

    const difficulty = difficultyMark ? DIFFICULTY_MAP[difficultyMark] : undefined
    if (difficultyMark && !difficulty) errors.push(`${prefix}: 難易度の値が不正です（${difficultyMark}）`)

    const correctLetter = correctByNo.get(no)
    if (!correctLetter) {
      errors.push(`${prefix}: 管理データシートに正解が見つかりません`)
    } else if (!['A', 'B', 'C', 'D'].includes(correctLetter)) {
      errors.push(`${prefix}: 管理データシートの正解値が不正です（${correctLetter}）`)
    }

    const detailLetter = detailCorrectByNo.get(no)
    if (detailLetter && correctLetter && detailLetter !== correctLetter) {
      errors.push(`${prefix}: 「管理データ」正解(${correctLetter})と「詳細解説」正解(${detailLetter})が一致しません`)
    }

    if (errors.length > 0 || !correctLetter || !difficulty) continue

    const id = `${categoryInfo.categorySlug}-${categoryInfo.subcategorySlug}-${String(no).padStart(3, '0')}`
    questions.push({
      id,
      no,
      category: categoryInfo.category,
      subcategory: categoryInfo.subcategory,
      difficulty,
      text: text!,
      choices: choices as [string, string, string, string],
      correctIndex: ANSWER_INDEX[correctLetter],
      explanation,
      ...(source ? { source } : {}),
    })
  }

  for (const no of correctByNo.keys()) {
    if (!seenNo.has(no)) {
      warnings.push(`[${fileLabel}] No.${no}: 管理データに正解はあるが「問題」シートに行がありません`)
    }
  }

  if (errors.length > 0) {
    return { errors, warnings, questions: [], fileLabel }
  }

  const idPrefix = `${categoryInfo.categorySlug}-${categoryInfo.subcategorySlug}-`
  const newIds = new Set(questions.map((q) => q.id))
  for (const q of existingQuestions) {
    if (q.id.startsWith(idPrefix) && !newIds.has(q.id)) {
      warnings.push(`[${fileLabel}] 既存の id "${q.id}" が今回の変換結果から消えています（削除検知）`)
    }
  }

  return { errors, warnings, questions, fileLabel }
}

export function mergeQuestions(existing: Question[], incoming: Question[]): { merged: Question[]; added: number; updated: number } {
  const byId = new Map(existing.map((q) => [q.id, q]))
  let added = 0
  let updated = 0
  for (const q of incoming) {
    if (byId.has(q.id)) updated += 1
    else added += 1
    byId.set(q.id, q)
  }
  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
  return { merged, added, updated }
}
