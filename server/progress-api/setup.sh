#!/usr/bin/env bash
# VPS上で一度だけ実行するセットアップスクリプト。
#
# 使い方:
#   1. deploy.sh を実行して、このディレクトリ（server/progress-api/）を
#      VPSの ${API_PATH}/progress-api/ に転送しておく（config.php は転送されない）。
#   2. VPSにSSHして、このディレクトリで `bash setup.sh` を実行する。
#
# 既に config.php がある場合は何もしない（誤って上書きしてトークンを
# 失わないようにするため）。設定をやり直す場合は config.php を削除してから
# 再実行すること。
set -euo pipefail

cd "$(dirname "$0")"

if [ -f config.php ]; then
  echo "config.php は既に存在します。上書きしないため何もしません。"
  echo "設定をやり直す場合は config.php を削除してから再実行してください。"
  exit 0
fi

read -rp "サイトのオリジン（例: https://example.com）: " ORIGIN
read -rp "成績データの保存先ファイルパス（例: /home/$(whoami)/nihongo-app-data/progress.json）: " DATA_FILE
TOKEN="$(openssl rand -hex 32)"

cp config.sample.php config.php
sed -i "s|CHANGE_ME_TO_A_RANDOM_SECRET|${TOKEN}|" config.php
sed -i "s|https://your-domain.example|${ORIGIN}|" config.php
sed -i "s|/home/USER/nihongo-app-data/progress.json|${DATA_FILE}|" config.php
chmod 600 config.php

DATA_DIR="$(dirname "${DATA_FILE}")"
mkdir -p "${DATA_DIR}"
chmod 770 "${DATA_DIR}"

# php-fpmの実行ユーザーがこのディレクトリに書き込めるよう、
# よくあるグループ名を試して所有グループを合わせる（見つからなければ手動調整が必要）。
for grp in nginx apache www-data php-fpm; do
  if getent group "${grp}" >/dev/null 2>&1; then
    if chgrp "${grp}" "${DATA_DIR}" 2>/dev/null; then
      echo "保存先ディレクトリの所有グループを ${grp} に設定しました。"
      break
    fi
  fi
done

SCRIPT_PATH="$(pwd)/index.php"

echo ""
echo "===================================================="
echo "セットアップ完了"
echo "----------------------------------------------------"
echo "トークン（アプリの設定画面「トークン」欄に入力）:"
echo "  ${TOKEN}"
echo ""
echo "APIのURL（アプリの設定画面「APIのURL」欄に入力）:"
echo "  ${ORIGIN}/api/progress"
echo "===================================================="
echo ""
echo "残りの手作業（初回のみ）:"
echo "1. nginx設定に deploy/nginx.conf.sample の /api/progress ブロックを追加し、"
echo "   fastcgi_param SCRIPT_FILENAME を次のパスに合わせる:"
echo "     ${SCRIPT_PATH}"
echo "2. php-fpm のソケットパス（fastcgi_pass）を環境に合わせて確認・修正"
echo "3. sudo nginx -t && sudo systemctl reload nginx"
echo "4. 動作確認: curl -i -H \"Authorization: Bearer ${TOKEN}\" ${ORIGIN}/api/progress"
echo "   （初回は成績データ未保存のため 404 が返れば正常）"
