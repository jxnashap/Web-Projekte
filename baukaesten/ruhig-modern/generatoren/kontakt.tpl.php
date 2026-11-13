<?php
/* Kontaktformular Let's Drive Kiel – erzeugt von build_letsdrive.py (Vorlage: kontakt.tpl.php).
   Sendet die Anfrage per E-Mail an die Fahrschule. Antwortet mit JSON, wenn
   das Skript der Seite fragt (Accept: application/json), sonst mit einer
   Weiterleitung zurück auf kontakt.html (#gesendet / #fehler).
   IONOS: Der Absender (From) muss eine Adresse der eigenen Vertragsdomain sein;
   die Adresse der Besucher steht deshalb in Reply-To. Läuft mit PHP 7.4 bis 8.x. */
declare(strict_types=1);

const TO   = '__MAIL__';
const FROM = '__MAIL__';   // muss zur eigenen IONOS-Domain gehören

$json = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function done(bool $ok, string $code, bool $json): void {
    if ($json) {
        http_response_code($ok ? 200 : ($code === 'method' ? 405 : ($code === 'invalid' ? 422 : 500)));
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'code' => $code]);
    } else {
        header('Location: kontakt.html#' . ($ok ? 'gesendet' : 'fehler'), true, 303);
    }
    exit;
}

function field(string $key, int $max, bool $oneLine = true): string {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
    // Einzeilige Felder: Zeilenumbrüche raus (verhindert Header-Injection im Betreff)
    return $oneLine ? trim(preg_replace('/[\r\n\t]+/', ' ', $v)) : str_replace(["\r\n", "\r"], "\n", $v);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    done(false, 'method', $json);
}

// Spamschutz: verstecktes Feld ausgefüllt oder Formular in < 3 s abgeschickt → still verwerfen
if (field('website', 200) !== '') done(true, 'ok', $json);
$ts = (int)($_POST['ts'] ?? 0);
if ($ts > 0 && (microtime(true) * 1000 - $ts) < 3000) done(true, 'ok', $json);

$name    = field('name', 100);
$email   = field('email', 200);
$telefon = field('telefon', 50);
$klasse  = field('klasse', 50);
$text    = field('nachricht', 5000, false);
$consent = ($_POST['einwilligung'] ?? '') === 'ja';

if ($name === '' || $text === '' || !$consent || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    done(false, 'invalid', $json);
}

$subject = 'Anfrage über die Website – ' . $name;
$body = "Name: $name\nE-Mail: $email\n"
      . ($telefon !== '' ? "Telefon: $telefon\n" : '')
      . ($klasse !== '' ? "Klasse: $klasse\n" : '')
      . "\nNachricht:\n$text\n\n-- \nGesendet über das Kontaktformular auf __HOST__";
$headers = "From: Website Let's Drive Kiel <" . FROM . ">\r\n"
         . "Reply-To: $email\r\n"
         . "MIME-Version: 1.0\r\n"
         . "Content-Type: text/plain; charset=UTF-8\r\n"
         . "Content-Transfer-Encoding: 8bit";

$sent = mail(TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f' . FROM);
done($sent, $sent ? 'ok' : 'mail', $json);
