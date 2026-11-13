<?php
/* Redaktion (PHP-Variante) · Schnittstelle der Verwaltung
 *
 * Läuft auf jedem Webspace mit PHP 7.4 bis 8.x (IONOS, STRATO, All-Inkl …), ohne Datenbank.
 * Inhalte liegen als JSON in ../daten/inhalte.json, die Website liest sie dort direkt.
 *
 *   GET  ?aktion=status         eingerichtet? angemeldet? CSRF-Token
 *   POST ?aktion=einrichten     {code, passwort}     einmalig, Code steht in ../daten/privat/einrichtungscode.php
 *   POST ?aktion=anmelden       {passwort}
 *   POST ?aktion=abmelden
 *   GET  ?aktion=laden          Inhalte + Schema
 *   POST ?aktion=speichern      {inhalte}            prüft gegen schema.json, legt die alte Fassung ins Archiv
 *   GET  ?aktion=archiv         ältere Fassungen
 *   POST ?aktion=wiederherstellen {datei}
 *   POST ?aktion=passwort       {alt, neu}
 *
 * Sicherheit: Sitzungs-Cookie (HttpOnly, SameSite=Strict, Secure bei https), CSRF-Token und
 * Herkunftsprüfung bei jedem POST, Sperre nach 5 Fehlversuchen für 15 Minuten, Passwort nur als
 * bcrypt-Hash, schreibt atomar, keine Datei-Uploads. */
declare(strict_types=1);
date_default_timezone_set('Europe/Berlin');

const MAX_BODY = 200000;
const ARCHIV_MAX = 30;
const SITZUNG_MIN = 120;
const PW_MIN = 10;

$DATEN = dirname(__DIR__) . '/daten';
$PRIVAT = $DATEN . '/privat';
$ARCHIV = $DATEN . '/archiv';
$LIVE = $DATEN . '/inhalte.json';
$STANDARD = $DATEN . '/inhalte.standard.json';
$SCHEMA = __DIR__ . '/schema.json';
$ZUGANG = $PRIVAT . '/zugang.php';
$CODE = $PRIVAT . '/einrichtungscode.php';
$SPERRE = $PRIVAT . '/sperre.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function antwort(int $status, array $daten): void {
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fehler(int $status, string $text): void { antwort($status, ['ok' => false, 'fehler' => $text]); }

function https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') === '443'
        || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

/* ---------- Sitzung ---------- */
$pfad = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/verwaltung/api.php')), '/') . '/';
session_name('redaktion');
session_set_cookie_params(['lifetime' => 0, 'path' => $pfad, 'secure' => https(), 'httponly' => true, 'samesite' => 'Strict']);
session_start();
if (!empty($_SESSION['an']) && time() - ($_SESSION['zuletzt'] ?? 0) > SITZUNG_MIN * 60) { $_SESSION = []; session_regenerate_id(true); }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
$angemeldet = !empty($_SESSION['an']);
if ($angemeldet) $_SESSION['zuletzt'] = time();

$aktion = (string)($_GET['aktion'] ?? 'status');
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ---------- POST absichern: gleiche Herkunft und CSRF-Token ---------- */
$body = [];
if ($methode === 'POST') {
    $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    $her = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    $herHost = strtolower((string)parse_url($her, PHP_URL_HOST));
    if (!$herHost || $herHost !== $host) fehler(403, 'Anfrage von fremder Seite abgelehnt.');
    if (!hash_equals($_SESSION['csrf'], (string)($_SERVER['HTTP_X_CSRF'] ?? ''))) fehler($angemeldet ? 403 : 401, 'Sitzung abgelaufen. Bitte neu anmelden.');
    $roh = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
    if ($roh === false || strlen($roh) > MAX_BODY) fehler(413, 'Die Daten sind zu groß.');
    $body = json_decode($roh, true);
    if (!is_array($body)) fehler(400, 'Ungültige Daten.');
} elseif ($methode !== 'GET') {
    fehler(405, 'Methode nicht erlaubt.');
}

/* ---------- Hilfen ---------- */
function lese_json(string $datei) {
    if (!is_file($datei)) return null;
    $d = json_decode((string)file_get_contents($datei), true);
    return is_array($d) ? $d : null;
}
function schreibe_atomar(string $datei, string $inhalt): void {
    $tmp = $datei . '.tmp-' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $inhalt, LOCK_EX) === false || !rename($tmp, $datei)) {
        @unlink($tmp);
        fehler(500, 'Speichern auf dem Server nicht möglich (Schreibrechte im Ordner „daten“ prüfen).');
    }
}
function zugang_hash(string $datei): ?string {
    if (!is_file($datei)) return null;
    $z = include $datei;
    return is_array($z) && !empty($z['hash']) ? (string)$z['hash'] : null;
}
function setze_zugang(string $datei, string $passwort): void {
    $hash = password_hash($passwort, PASSWORD_DEFAULT);
    $php = "<?php\n// Zugang zur Redaktion. Nur der Hash, nie das Passwort. Datei löschen = neu einrichten.\nreturn " . var_export(['hash' => $hash, 'seit' => date('c')], true) . ";\n";
    schreibe_atomar($datei, $php);
}
function ip_schluessel(): string { return substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|redaktion'), 0, 16); }
function gesperrt(string $datei): int {
    $s = lese_json($datei) ?? [];
    $e = $s[ip_schluessel()] ?? null;
    if (!$e || ($e['bis'] ?? 0) < time()) return 0;
    return (int)$e['bis'] - time();
}
function fehlversuch(string $datei): void {
    $s = lese_json($datei) ?? [];
    $k = ip_schluessel();
    $e = $s[$k] ?? ['n' => 0, 'seit' => time(), 'bis' => 0];
    if (time() - $e['seit'] > 900) $e = ['n' => 0, 'seit' => time(), 'bis' => 0];
    $e['n']++;
    if ($e['n'] >= 5) $e['bis'] = time() + 900;
    $s[$k] = $e;
    foreach ($s as $kk => $v) if (time() - ($v['seit'] ?? 0) > 86400) unset($s[$kk]);
    schreibe_atomar($datei, json_encode($s));
    sleep(1);
}
function bereinige_sperre(string $datei, bool $auchEigene = false): void {
    if (!is_file($datei)) return;
    $s = lese_json($datei) ?? [];
    $vorher = count($s);
    foreach ($s as $k => $v) if (time() - ($v['seit'] ?? 0) > 86400 || ($auchEigene && $k === ip_schluessel())) unset($s[$k]);
    if (!$s) { @unlink($datei); return; }
    if (count($s) !== $vorher) schreibe_atomar($datei, json_encode($s));
}
function einrichtungscode(string $datei): string {
    if (is_file($datei)) { $c = include $datei; if (is_string($c) && $c !== '') return $c; }
    $z = strtoupper(bin2hex(random_bytes(4)));
    $code = substr($z, 0, 4) . '-' . substr($z, 4, 4);
    schreibe_atomar($datei, "<?php\n// Einrichtungscode für die Redaktion: $code\n// Gilt nur einmal. Nach dem Einrichten wird diese Datei gelöscht.\nreturn '$code';\n");
    return $code;
}
function ordner(string $o): void {
    if (!is_dir($o) && !@mkdir($o, 0755, true)) fehler(500, 'Ordner „' . basename($o) . '“ kann nicht angelegt werden.');
}

/* ---------- Prüfung gegen das Schema ---------- */
function pruefe_feld(array $f, $v, string $wo) {
    $typ = $f['typ'] ?? 'text';
    $label = $f['label'] ?? $f['id'];
    $leer = $v === null || $v === '' || $v === [];
    if ($leer) {
        if (!empty($f['pflicht'])) throw new RuntimeException("$wo: „{$label}“ fehlt.");
        return $typ === 'schalter' ? false : ($typ === 'wochentage' ? [] : '');
    }
    switch ($typ) {
        case 'schalter': return (bool)$v;
        case 'text': case 'textlang':
            if (!is_string($v)) throw new RuntimeException("$wo: „{$label}“ ist kein Text.");
            $v = str_replace(["\r\n", "\r"], "\n", trim($v));
            if ($typ === 'text') $v = preg_replace('/\s*\n\s*/', ' ', $v);
            $max = (int)($f['max'] ?? ($typ === 'text' ? 120 : 1000));
            $len = function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v);
            if ($len > $max) throw new RuntimeException("$wo: „{$label}“ ist länger als $max Zeichen.");
            return $v;
        case 'uhrzeit':
            if (!is_string($v) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v)) throw new RuntimeException("$wo: „{$label}“ braucht eine Uhrzeit wie 19:00.");
            return $v;
        case 'datum':
            if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) || !checkdate((int)substr($v, 5, 2), (int)substr($v, 8, 2), (int)substr($v, 0, 4)))
                throw new RuntimeException("$wo: „{$label}“ ist kein gültiges Datum.");
            return $v;
        case 'wochentage':
            if (!is_array($v)) throw new RuntimeException("$wo: „{$label}“ ungültig.");
            $t = array_values(array_unique(array_map('intval', $v)));
            foreach ($t as $x) if ($x < 0 || $x > 6) throw new RuntimeException("$wo: „{$label}“ ungültig.");
            sort($t);
            return $t;
        case 'auswahl':
            $erlaubt = array_map(fn($o) => is_array($o) ? (string)$o[0] : (string)$o, $f['optionen'] ?? []);
            if (!in_array((string)$v, $erlaubt, true)) throw new RuntimeException("$wo: „{$label}“ hat einen ungültigen Wert.");
            return (string)$v;
        case 'zahl':
            if (!is_numeric($v)) throw new RuntimeException("$wo: „{$label}“ ist keine Zahl.");
            return 0 + $v;
    }
    throw new RuntimeException("$wo: unbekannter Feldtyp.");
}
function pruefe_objekt(array $felder, $obj, string $wo): array {
    if (!is_array($obj)) throw new RuntimeException("$wo: ungültige Daten.");
    $raus = [];
    foreach ($felder as $f) $raus[$f['id']] = pruefe_feld($f, $obj[$f['id']] ?? null, $wo);
    // Konvention: Felder „von“ und „bis“ (Uhrzeit) müssen eine sinnvolle Spanne bilden
    if (!empty($raus['von']) && !empty($raus['bis']) && is_string($raus['von']) && is_string($raus['bis']) && $raus['bis'] <= $raus['von'])
        throw new RuntimeException("$wo: Das Ende ({$raus['bis']}) muss nach dem Beginn ({$raus['von']}) liegen.");
    return $raus;
}
function pruefe_inhalte(array $schema, $inhalte): array {
    if (!is_array($inhalte)) throw new RuntimeException('Ungültige Inhalte.');
    $raus = ['_stand' => date('c')];
    foreach ($schema['bereiche'] as $b) {
        $wert = $inhalte[$b['id']] ?? null;
        if (($b['typ'] ?? 'objekt') === 'liste') {
            $wert = is_array($wert) ? array_values($wert) : [];
            $max = (int)($b['max'] ?? 50);
            if (count($wert) > $max) throw new RuntimeException("{$b['titel']}: höchstens $max Einträge.");
            $raus[$b['id']] = array_map(fn($e) => pruefe_objekt($b['felder'], $e, $b['titel']), $wert);
        } else {
            $raus[$b['id']] = pruefe_objekt($b['felder'], $wert ?? [], $b['titel']);
        }
    }
    return $raus;
}

/* ---------- Aktionen ---------- */
ordner($PRIVAT);
bereinige_sperre($SPERRE);
$eingerichtet = zugang_hash($ZUGANG) !== null;

if ($aktion === 'status') {
    if (!$eingerichtet) einrichtungscode($CODE);
    antwort(200, ['ok' => true, 'eingerichtet' => $eingerichtet, 'angemeldet' => $angemeldet && $eingerichtet, 'csrf' => $_SESSION['csrf']]);
}

if ($aktion === 'einrichten') {
    if ($methode !== 'POST') fehler(405, 'Methode nicht erlaubt.');
    if ($eingerichtet) fehler(409, 'Die Redaktion ist schon eingerichtet.');
    if (($w = gesperrt($SPERRE)) > 0) fehler(429, 'Zu viele Versuche. Bitte in ' . ceil($w / 60) . ' Minuten erneut.');
    $code = einrichtungscode($CODE);
    if (!hash_equals(strtoupper($code), strtoupper(trim((string)($body['code'] ?? ''))))) { fehlversuch($SPERRE); fehler(403, 'Der Einrichtungscode stimmt nicht.'); }
    $pw = (string)($body['passwort'] ?? '');
    if (strlen($pw) < PW_MIN) fehler(422, 'Das Passwort braucht mindestens ' . PW_MIN . ' Zeichen.');
    setze_zugang($ZUGANG, $pw);
    @unlink($CODE);
    session_regenerate_id(true);
    $_SESSION['an'] = true; $_SESSION['zuletzt'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(24));
    antwort(200, ['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

if ($aktion === 'anmelden') {
    if ($methode !== 'POST') fehler(405, 'Methode nicht erlaubt.');
    if (!$eingerichtet) fehler(409, 'Die Redaktion ist noch nicht eingerichtet.');
    if (($w = gesperrt($SPERRE)) > 0) fehler(429, 'Zu viele Versuche. Bitte in ' . ceil($w / 60) . ' Minuten erneut.');
    if (!password_verify((string)($body['passwort'] ?? ''), (string)zugang_hash($ZUGANG))) { fehlversuch($SPERRE); fehler(403, 'Das Passwort stimmt nicht.'); }
    bereinige_sperre($SPERRE, true);
    session_regenerate_id(true);
    $_SESSION['an'] = true; $_SESSION['zuletzt'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(24));
    antwort(200, ['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

if ($aktion === 'abmelden') {
    if ($methode !== 'POST') fehler(405, 'Methode nicht erlaubt.');
    $_SESSION = [];
    session_destroy();
    antwort(200, ['ok' => true]);
}

/* Ab hier nur angemeldet */
if (!$eingerichtet || !$angemeldet) fehler(401, 'Bitte anmelden.');
$schema = lese_json($SCHEMA);
if (!$schema || empty($schema['bereiche'])) fehler(500, 'schema.json fehlt oder ist fehlerhaft.');

if ($aktion === 'laden') {
    antwort(200, ['ok' => true, 'schema' => $schema, 'inhalte' => lese_json($LIVE) ?? lese_json($STANDARD) ?? new stdClass(), 'live' => is_file($LIVE)]);
}

if ($aktion === 'speichern') {
    if ($methode !== 'POST') fehler(405, 'Methode nicht erlaubt.');
    try { $neu = pruefe_inhalte($schema, $body['inhalte'] ?? null); }
    catch (RuntimeException $e) { fehler(422, $e->getMessage()); }
    ordner($ARCHIV);
    $sperre = fopen($DATEN . '/.schreibsperre', 'c');
    flock($sperre, LOCK_EX);
    if (is_file($LIVE)) copy($LIVE, $ARCHIV . '/inhalte-' . date('Y-m-d-His') . '.json');
    schreibe_atomar($LIVE, json_encode($neu, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    $alt = glob($ARCHIV . '/inhalte-*.json') ?: [];
    rsort($alt);
    foreach (array_slice($alt, ARCHIV_MAX) as $d) @unlink($d);
    flock($sperre, LOCK_UN);
    antwort(200, ['ok' => true, 'stand' => $neu['_stand']]);
}

if ($aktion === 'archiv') {
    $liste = glob($ARCHIV . '/inhalte-*.json') ?: [];
    rsort($liste);
    antwort(200, ['ok' => true, 'fassungen' => array_map(fn($d) => basename($d), $liste)]);
}

if ($aktion === 'wiederherstellen') {
    if ($methode !== 'POST') fehler(405, 'Methode nicht erlaubt.');
    $name = basename((string)($body['datei'] ?? ''));
    if (!preg_match('/^inhalte-\d{4}-\d{2}-\d{2}-\d{6}\.json$/', $name) || !is_file($ARCHIV . '/' . $name)) fehler(404, 'Diese Fassung gibt es nicht.');
    antwort(200, ['ok' => true, 'inhalte' => lese_json($ARCHIV . '/' . $name)]);
}

if ($aktion === 'passwort') {
    if ($methode !== 'POST') fehler(405, 'Methode nicht erlaubt.');
    if (!password_verify((string)($body['alt'] ?? ''), (string)zugang_hash($ZUGANG))) { fehlversuch($SPERRE); fehler(403, 'Das bisherige Passwort stimmt nicht.'); }
    $neu = (string)($body['neu'] ?? '');
    if (strlen($neu) < PW_MIN) fehler(422, 'Das neue Passwort braucht mindestens ' . PW_MIN . ' Zeichen.');
    setze_zugang($ZUGANG, $neu);
    antwort(200, ['ok' => true]);
}

fehler(404, 'Unbekannte Aktion.');
