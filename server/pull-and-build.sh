#!/usr/bin/env bash
# VPS上のgit clone済みリポジトリのルートで実行する。
# 使い方: cd <リポジトリのルート> && bash server/pull-and-build.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[1/3] git pull"
git pull

echo "[2/3] Excel -> JSON 変換"
npm --prefix scripts install --no-audit --no-fund
npm --prefix scripts run convert

echo "[3/3] フロントエンドをビルド"
npm --prefix site install --no-audit --no-fund
npm --prefix site run build

echo ""
echo "完了。site/dist/ が最新化されました。"
echo "（config.php は git 管理外・gitignore 対象なので、pull しても消えたり上書きされたりしません）"
echo ""
echo "成績保存APIの初期設定がまだなら:"
echo "  cd server/progress-api && bash setup.sh"
