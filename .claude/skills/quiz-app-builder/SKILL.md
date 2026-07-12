---
name: quiz-app-builder
description: バックエンド不要（データベース不使用）の静的4択クイズ・試験対策アプリを構築する。localStorageで進捗管理、ExcelファイルをNode CLIおよびブラウザ上でJSONに変換するアーキテクチャ。同種のアプリ（別科目の試験対策など）を新規に作りたいときに使う。
---

# クイズ・試験対策アプリ構築スキル

日本語教師試験対策アプリ（nihongoapp）で採用した設計・実装パターンをまとめたもの。データベースを使わず、Excel原稿からJSON問題集を生成し、静的サイトとして配信する。同じ形の別アプリ（他科目の資格試験対策など）を作るときの雛形として使う。

## アーキテクチャ概要

- **バックエンドなし**：DBサーバーを持たない。問題データはビルド時に静的JSONとしてバンドルする
- **進捗管理**：ブラウザの `localStorage` に正誤履歴を保存（サーバー同期なし、端末ローカル）
- **問題データ管理**：Excel（3シート構成）を「正」として管理し、変換スクリプトでJSONへ落とす
- **配信**：`npm run build` で生成した静的ファイル一式をVPS等のnginxにそのまま配置

## フォルダ構成

```
app/
├─ questions-source/          # Excel原稿（科目/中分類/current・archive）
│  └─ 科目N_カテゴリ名/中分類名/current/科目N_カテゴリ名_中分類名_v01_YYYYMMDD.xlsx
├─ scripts/                   # Node CLIでExcel→JSON変換
│  ├─ convert-questions.mjs
│  └─ lib/{parseExcel,validate,buildQuestionId}.mjs
├─ site/                      # Vite+Vue3+TSアプリ本体
│  ├─ src/data/
│  │  ├─ category-master.json # 科目/中分類とslugの対応表（CLIとブラウザで共有）
│  │  └─ questions.json       # 変換済み問題集（ビルド時にバンドルされる）
│  ├─ src/stores/             # Pinia: questions（問題集）, progress（正誤履歴）
│  ├─ src/utils/excelImport.ts # ブラウザ版Excel→JSON変換（Node CLIと同一ロジック）
│  ├─ src/views/Import.vue    # ブラウザ上でExcelアップロード→JSON変換→ダウンロード
│  └─ src/router/index.ts     # createWebHashHistory + Import等の重いページはdynamic import
└─ deploy/                    # nginx設定サンプル・rsyncデプロイスクリプト
```

## 実装手順

### 1. Vite + Vue3 + TS + Pinia + Vue Router のセットアップ
```bash
npm create vite@latest site -- --template vue-ts
cd site && npm install pinia vue-router
```
- ルーティングは **`createWebHashHistory`** を使う（サブディレクトリ配信でも `base` 設定だけで動く。詳細は「サブディレクトリ配信の注意点」参照）

### 2. 問題データのスキーマを決める
最低限のフィールド例（4択問題の場合）：
```ts
interface Question {
  id: string            // {categorySlug}-{subcategorySlug}-{No}
  no: number
  category: string
  subcategory: string
  difficulty: 1 | 2 | 3
  text: string           // 穴埋め形式なら「（　）」を含む文字列でもよい
  choices: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
  source?: string
}
```

### 3. Excel原稿フォーマットを決める（3シート構成の例）
- **問題シート**：No / 難易度 / 問題文 / 選択肢A〜D / （正解列は別シートに分離）/ 解説 / 出典
- **管理データシート**：B1にタイトル文字列（`YYYYMMDD_科目N_カテゴリ_中分類_問題_v01`形式）、8行目以降にNo・正解
- **詳細解説シート**：Noごとの正解・各誤答の解説（管理データと正解が一致するかクロスチェックに使う）

タイトル文字列から科目・中分類を抽出し、`category-master.json` で slug に変換 → `id` を組み立てる。

### 4. Node CLIでの変換スクリプト（scripts/convert-questions.mjs）
- `questions-source/**/current/*.xlsx` を走査
- ExcelJSでパース → バリデーション（必須列、正解範囲、カテゴリ存在チェック）→ 既存 `questions.json` とマージ（idベースでadd/update集計）
- エラーは該当No付きで一覧表示し、**自動修正はしない**（問題文の正誤に関わるため人間判断必須）

### 5. ブラウザ版インポート機能（site/src/views/Import.vue + utils/excelImport.ts）
- **セキュリティ注意**：SheetJS(`xlsx`)パッケージにはnpm版で未修正の高深刻度脆弱性（プロトタイプ汚染・ReDoS）があるため使わない。**ExcelJS**を使い、Node CLI側とロジックを完全に揃える
- ブラウザで `File.arrayBuffer()` → `ExcelJS.Workbook().xlsx.load()` でパース。サーバーには一切送信しない
- 変換結果をプレビュー表示（新規N問/更新M問）→ Blobでダウンロード（`questions.json`として保存し、手動で `site/src/data/` に配置してビルドし直す運用）
- **バンドルサイズ対策**：ExcelJSは重い（gzip後約260KB）ので、ルーティングで `component: () => import('../views/Import.vue')` のようにdynamic importし、他ページのバンドルに混ざらないようにする

### 6. 出題モードの実装パターン
- 全範囲・カテゴリ別・苦手克服（正答率が低い順）の3モードが定番
- 1セッションあたりの出題数は定数化する（例: `QUIZ_SESSION_SIZE = 50`）。苦手克服モードは優先度順を保つためシャッフルしない、他はシャッフルしてから `.slice(0, N)`

### 7. localStorage設計（進捗ストア）
- 正誤履歴を問題ID単位で蓄積し、正答率・苦手問題抽出のロジックはこの履歴から導出する
- エクスポート/インポート（JSON）機能を用意しておくと端末間の引き継ぎができる

## サブディレクトリ配信の注意点（重要）

VPS等で `https://example.com/appName/` のようにサブディレクトリ配信する場合、**`vite.config.ts` に `base` を設定しないと、ビルド後のアセットパスがルート相対（`/assets/...`）になり404になる**。

```ts
// vite.config.ts
export default defineConfig({
  base: '/appName/',   // 実際のデプロイ先パスに合わせる
  plugins: [vue()],
})
```

nginx側は `alias` + `try_files` で該当パスを静的配信するだけでよい（`createWebHashHistory`のためSPAフォールバック設定は必須ではない）：
```nginx
location /appName/ {
    alias /var/www/appName/site/dist/;
    index index.html;
    try_files $uri $uri/ /appName/index.html;
}
```

## デプロイ手順（VPS/nginx想定）

```bash
# 初回
cd /var/www && sudo git clone <repo> appName
cd appName/site && sudo npm install && sudo npm run build
sudo chown -R nginx:nginx dist   # nginxの実行ユーザーに合わせる（ps aux | grep nginxで確認）

# 更新時
cd /var/www/appName && sudo git pull
cd site && sudo npm run build
sudo chown -R nginx:nginx dist
```

nginxの実行ユーザーは `ps aux | grep nginx` または `nginx.conf` の `user` 行で確認する（`www-data`とは限らない。AlmaLinux系では`nginx`ユーザーが多い）。

## チェックリスト（新規アプリ作成時）

- [ ] 問題データのスキーマ定義（4択以外も想定するか？穴埋め形式にするか？）
- [ ] Excel原稿フォーマットとタイトル命名規則の決定
- [ ] category-master.jsonの用意（CLIとブラウザで共有パスに置く）
- [ ] Node CLI変換スクリプトの実装・テスト
- [ ] ブラウザ版インポート機能（ExcelJS、dynamic import化）
- [ ] QUIZ_SESSION_SIZE等の出題数上限の決定
- [ ] vite.config.tsのbase設定（サブディレクトリ配信の場合）
- [ ] nginx設定・デプロイスクリプトの用意
