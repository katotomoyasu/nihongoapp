import ExcelJS from 'exceljs'

const TITLE_PATTERN = /^(\d{8})_科目(\d+)_(.+?)_(.+?)_問題_v(\d+)$/

function cellText(cell) {
  const v = cell?.value
  if (v === null || v === undefined) return null
  if (typeof v === 'object' && 'richText' in v) {
    return v.richText.map((t) => t.text).join('')
  }
  return String(v).trim()
}

/**
 * 「管理データ」シートのタイトル文字列（例:
 * 20260627_科目3_社会文化地域_言語と社会_問題_v1）から
 * 科目番号・中分類を抽出する。大分類はcategory-master.jsonの正式表記を正とするため、
 * ここで抜き出した文字列はあくまで参考情報として返す。
 */
export function parseTitle(title) {
  const m = TITLE_PATTERN.exec(title)
  if (!m) return null
  const [, date, subjectNo, rawCategory, subcategory, version] = m
  return { date, subjectNo, rawCategory, subcategory, version: Number(version) }
}

export async function parseExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const sheetMondai = workbook.getWorksheet('問題')
  const sheetKanri = workbook.getWorksheet('管理データ')
  const sheetShosai = workbook.getWorksheet('詳細解説')

  if (!sheetMondai) throw new Error('シート「問題」が見つかりません')
  if (!sheetKanri) throw new Error('シート「管理データ」が見つかりません')

  const title = cellText(sheetKanri.getCell('B1'))
  const titleInfo = title ? parseTitle(title) : null

  // 管理データシート: 7行目がヘッダー(No/正解)、8行目以降がデータ
  const correctByNo = new Map()
  for (let r = 8; r <= sheetKanri.rowCount; r++) {
    const no = sheetKanri.getCell(r, 1).value
    const correct = cellText(sheetKanri.getCell(r, 2))
    if (no === null || no === undefined || no === '') continue
    correctByNo.set(Number(no), correct)
  }

  // 詳細解説シート: 正解列(D列/4列目)は整合性チェック用。
  // 「なぜ正解か」(I列/9列目)・「各誤答の解説」(J列/10列目)は解説文の主ソースとして使う。
  const detailCorrectByNo = new Map()
  const detailExplanationByNo = new Map()
  if (sheetShosai) {
    for (let r = 2; r <= sheetShosai.rowCount; r++) {
      const no = sheetShosai.getCell(r, 1).value
      if (no === null || no === undefined || no === '') continue
      detailCorrectByNo.set(Number(no), cellText(sheetShosai.getCell(r, 4)))
      const why = cellText(sheetShosai.getCell(r, 9))
      const wrongExplain = cellText(sheetShosai.getCell(r, 10))
      if (why || wrongExplain) {
        detailExplanationByNo.set(Number(no), { why, wrongExplain })
      }
    }
  }

  // 問題シート: 1行目ヘッダー、2行目以降がデータ。No列が空になったら終端とみなす。
  const rows = []
  for (let r = 2; r <= sheetMondai.rowCount; r++) {
    const no = sheetMondai.getCell(r, 1).value
    if (no === null || no === undefined || no === '') continue
    if (typeof no !== 'number') continue

    rows.push({
      rowNumber: r,
      no,
      difficulty: cellText(sheetMondai.getCell(r, 2)),
      text: cellText(sheetMondai.getCell(r, 3)),
      choices: [
        cellText(sheetMondai.getCell(r, 4)),
        cellText(sheetMondai.getCell(r, 5)),
        cellText(sheetMondai.getCell(r, 6)),
        cellText(sheetMondai.getCell(r, 7)),
      ],
      // 8列目(回答)・9列目(結果)は自己学習の記入跡のため変換対象外（仕様書5.2/5.3節）
      explanation: cellText(sheetMondai.getCell(r, 10)) ?? '',
      source: cellText(sheetMondai.getCell(r, 11)) ?? undefined,
    })
  }

  return { title, titleInfo, rows, correctByNo, detailCorrectByNo, detailExplanationByNo }
}
