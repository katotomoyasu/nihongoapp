import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'
import { parseExcelFile } from './lib/parseExcel.mjs'
import { resolveCategory } from './lib/buildQuestionId.mjs'
import { validateAndBuild, checkIdCollisionsAndDeletions } from './lib/validate.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'questions-source')
const OUTPUT_PATH = path.join(ROOT, 'site', 'src', 'data', 'questions.json')
const CATEGORY_MASTER_PATH = path.join(ROOT, 'site', 'src', 'data', 'category-master.json')

async function loadJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback
  return JSON.parse(await readFile(filePath, 'utf-8'))
}

async function findSourceFiles(explicitPath) {
  if (explicitPath) return [path.resolve(explicitPath)]
  const files = []
  for await (const entry of glob('**/current/*.xlsx', { cwd: SOURCE_DIR })) {
    files.push(path.join(SOURCE_DIR, entry))
  }
  return files
}

async function main() {
  const explicitPath = process.argv[2]
  const categoryMaster = await loadJson(CATEGORY_MASTER_PATH, {})
  const existingBank = await loadJson(OUTPUT_PATH, { version: '', questions: [] })

  const files = await findSourceFiles(explicitPath)
  if (files.length === 0) {
    console.log('変換対象のExcelファイルが見つかりませんでした（questions-source/**/current/*.xlsx）')
    return
  }

  let questionsById = new Map(existingBank.questions.map((q) => [q.id, q]))
  const allErrors = []
  const allWarnings = []
  const summaryByFile = []
  const manifest = {}

  for (const filePath of files) {
    const fileLabel = path.relative(ROOT, filePath)
    const parsed = await parseExcelFile(filePath)

    if (!parsed.titleInfo) {
      allErrors.push(`[${fileLabel}] 管理データシートのタイトル文字列を解析できません: "${parsed.title}"`)
      continue
    }

    const categoryInfo = resolveCategory(categoryMaster, parsed.titleInfo.subjectNo, parsed.titleInfo.subcategory)
    const { errors, warnings, questions } = validateAndBuild({ parsed, categoryInfo, fileLabel })

    allErrors.push(...errors)
    allWarnings.push(...warnings)

    if (errors.length > 0) {
      summaryByFile.push({ fileLabel, status: 'error', count: 0 })
      continue
    }

    const { errors: idErrors, warnings: idWarnings } = checkIdCollisionsAndDeletions(
      questions,
      existingBank.questions,
      fileLabel,
    )
    allErrors.push(...idErrors)
    allWarnings.push(...idWarnings)
    if (idErrors.length > 0) {
      summaryByFile.push({ fileLabel, status: 'error', count: 0 })
      continue
    }

    let added = 0
    let updated = 0
    for (const q of questions) {
      if (questionsById.has(q.id)) updated += 1
      else added += 1
      questionsById.set(q.id, q)
    }
    summaryByFile.push({ fileLabel, status: 'ok', count: questions.length, added, updated })

    const manifestKey = `${categoryInfo.categorySlug}-${categoryInfo.subcategorySlug}`
    manifest[manifestKey] = {
      category: categoryInfo.category,
      subcategory: categoryInfo.subcategory,
      currentFile: path.relative(SOURCE_DIR, filePath).replace(/\\/g, '/'),
      version: parsed.titleInfo.version,
      questionCount: questions.length,
      lastConvertedAt: new Date().toISOString(),
    }
  }

  if (allErrors.length > 0) {
    console.error('\n変換エラーが見つかりました。修正後に再実行してください:\n')
    for (const e of allErrors) console.error('  - ' + e)
    process.exitCode = 1
  }

  if (allWarnings.length > 0) {
    console.warn('\n警告:\n')
    for (const w of allWarnings) console.warn('  - ' + w)
  }

  console.log('\n変換結果:')
  for (const s of summaryByFile) {
    if (s.status === 'ok') {
      console.log(`  [OK] ${s.fileLabel}: ${s.count}問（新規${s.added} / 更新${s.updated}）`)
    } else {
      console.log(`  [NG] ${s.fileLabel}: エラーのためスキップ`)
    }
  }

  if (allErrors.length > 0) {
    console.log('\nエラーがあるため questions.json は更新していません。')
    return
  }

  const outputBank = {
    version: new Date().toISOString().slice(0, 10),
    questions: [...questionsById.values()].sort((a, b) => a.id.localeCompare(b.id)),
  }
  await writeFile(OUTPUT_PATH, JSON.stringify(outputBank, null, 2) + '\n', 'utf-8')
  console.log(`\n${OUTPUT_PATH} を更新しました（全${outputBank.questions.length}問）`)

  await writeManifest(manifest)
}

async function writeManifest(newEntries) {
  const jsonPath = path.join(SOURCE_DIR, 'index.json')
  const mdPath = path.join(SOURCE_DIR, 'index.md')
  const existing = await loadJson(jsonPath, {})
  const merged = { ...existing, ...newEntries }

  await writeFile(jsonPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8')

  const rows = Object.entries(merged)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, v]) =>
        `| ${v.category} | ${v.subcategory} | ${v.questionCount} | v${String(v.version).padStart(2, '0')} | ${v.lastConvertedAt.slice(0, 16).replace('T', ' ')} | ${key} |`,
    )
  const md = [
    '# 問題データ管理台帳',
    '',
    '`/convert-questions` 実行のたびに自動更新されます（手動編集しないでください）。',
    '',
    '| 大分類 | 中分類 | 問題数 | バージョン | 最終変換日時 | ID |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n')
  await writeFile(mdPath, md, 'utf-8')
  console.log(`${jsonPath} / ${mdPath} を更新しました`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
