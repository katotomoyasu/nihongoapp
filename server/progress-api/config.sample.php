<?php
// このファイルを config.php としてコピーし、値を書き換えてから使用してください。
// config.php は .gitignore で除外されているため、Git/GitHub には一切含まれません。

// 推測困難なランダム文字列（例: `openssl rand -hex 32` で生成）
define('API_TOKEN', 'CHANGE_ME_TO_A_RANDOM_SECRET');

// このサイトのオリジン（CORSで許可する送信元）
define('ALLOWED_ORIGIN', 'https://your-domain.example');

// 成績データの保存先ファイル。
// デプロイ（rsync --delete）で消える site/dist の外側に置くこと。
define('DATA_FILE', '/home/USER/nihongo-app-data/progress.json');
