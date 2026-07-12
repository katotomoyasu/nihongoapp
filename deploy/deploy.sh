#!/usr/bin/env bash
# 仕様書6.4節のデプロイ手順を実行する参考スクリプト。
# VPSのホスト名・パスは環境に合わせて書き換えてから使用してください。
# 実行前に必ず `rsync --dry-run` 等で差分を確認することを推奨します。
set -euo pipefail

VPS_HOST="${VPS_HOST:-user@your-vps-host}"
VPS_PATH="${VPS_PATH:-/path/to/site}"

cd "$(dirname "$0")/.."

echo "[1/3] Excel -> JSON 変換"
npm --prefix scripts run convert

echo "[2/3] フロントエンドをビルド"
npm --prefix site run build

echo "[3/3] VPSへ転送（rsync）"
rsync -avz --delete site/dist/ "${VPS_HOST}:${VPS_PATH}/"

echo "デプロイ完了"
