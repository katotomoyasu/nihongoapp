<?php
require __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

function fail(int $status, string $error): void {
    http_response_code($status);
    echo json_encode(['error' => $error]);
    exit;
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\s+(.+)$/', $authHeader, $matches) || !hash_equals(API_TOKEN, $matches[1])) {
    fail(401, 'unauthorized');
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (!file_exists(DATA_FILE)) {
        fail(404, 'not_found');
    }
    readfile(DATA_FILE);
    exit;
}

if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    $valid = is_array($data)
        && ($data['schemaVersion'] ?? null) === 1
        && isset($data['records']) && is_array($data['records'])
        && isset($data['sessions']) && is_array($data['sessions']);
    if (!$valid) {
        fail(400, 'invalid_body');
    }

    $dir = dirname(DATA_FILE);
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        fail(500, 'storage_dir_unavailable');
    }

    $tmpFile = DATA_FILE . '.tmp-' . bin2hex(random_bytes(8));
    if (file_put_contents($tmpFile, $body, LOCK_EX) === false) {
        fail(500, 'write_failed');
    }
    rename($tmpFile, DATA_FILE);

    echo json_encode(['ok' => true, 'updatedAt' => gmdate('c')]);
    exit;
}

fail(405, 'method_not_allowed');
