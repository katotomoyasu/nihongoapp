const DIFFICULTY_MAP = { '★': 1, '★★': 2, '★★★': 3 }
const ANSWER_INDEX = { A: 0, B: 1, C: 2, D: 3 }

export function difficultyToNumber(mark) {
  return DIFFICULTY_MAP[mark] ?? null
}

export function answerLetterToIndex(letter) {
  return ANSWER_INDEX[letter] ?? null
}

/**
 * カテゴリ情報を解決する。科目番号をキーに category-master.json を引き、
 * 大分類名・カテゴリスラッグ・中分類スラッグを返す。未登録の場合は null。
 */
export function resolveCategory(categoryMaster, subjectNo, subcategoryRaw) {
  const subjectKey = `科目${subjectNo}`
  const entry = categoryMaster[subjectKey]
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

export function buildQuestionId(categorySlug, subcategorySlug, no) {
  return `${categorySlug}-${subcategorySlug}-${String(no).padStart(3, '0')}`
}
