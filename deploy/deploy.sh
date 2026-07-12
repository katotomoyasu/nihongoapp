#!/usr/bin/env bash
# 仕様書6.4節のデプロイ手順を実行する参考スクリプト。
# VPSのホスト名・パスは環境に合わせて書き換えてから使用してください。
# 実行前に必ず `rsync --dry-run` 等で差分を確認することを推奨します。
set -euo pipefail

VPS_HOST="${VPS_HOST:-user@your-vps-host}"
VPS_PATH="${VPS_PATH:-/path/to/site}"
# 成績保存APIの配置先。site/dist の外側にすること（--delete の影響を受けないように）。
API_PATH="${API_PATH:-/path/to/site/api}"

cd "$(dirname "$0")/.."

echo "[1/4] Excel -> JSON 変換"
npm --prefix scripts run convert

echo "[2/4] フロントエンドをビルド"
npm --prefix site run build

echo "[3/4] VPSへ転送（rsync、静的サイト）"
rsync -avz --delete site/dist/ "${VPS_HOST}:${VPS_PATH}/"

echo "[4/4] 成績保存APIをVPSへ転送（config.php は対象外・上書きしない）"
rsync -avz --exclude 'config.php' server/progress-api/ "${VPS_HOST}:${API_PATH}/progress-api/"

echo "デプロイ完了"
echo "初回のみ: VPS上で ${API_PATH}/progress-api/config.sample.php を config.php としてコピーし、"
echo "トークン・許可オリジン・保存先パスを設定してください（config.php は自動転送されません）。"
