/** トップ画面で選べる1回の演習セッションの出題数（仕様書3.2/3.5節）。プールがこれ以下ならプール全体を出題する。 */
export const QUIZ_SESSION_SIZE_OPTIONS = [10, 20, 30, 50] as const
export const QUIZ_SESSION_SIZE_DEFAULT = 50
