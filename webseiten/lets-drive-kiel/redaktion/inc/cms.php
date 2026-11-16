<?php
/* =====================================================================
   Redaktion Let's Drive Kiel – Kern (Speichern, Rendern, Veröffentlichen)

   Die Website besteht aus statischen HTML-Dateien. Pflegbare Bereiche sind
   darin mit Kommentaren markiert:   <!--cms:name--> … <!--/cms:name-->
   „Veröffentlichen" rendert jeden markierten Bereich aus inhalte.json neu
   und schreibt die HTML-Dateien zurück – danach ist die Änderung sofort live.

   Läuft mit PHP 7.4 bis 8.x (IONOS-Webhosting). Keine Datenbank nötig.
   ===================================================================== */
declare(strict_types=1);

const CMS_VERSION = '1.0';
date_default_timezone_set('Europe/Berlin');
define('CMS_SITE', dirname(__DIR__, 2));                 // Website-Wurzel
define('CMS_DATA', dirname(__DIR__) . '/daten');          // nicht öffentlich (.htaccess)
const CMS_KEEP_VERSIONS = 15;

/* ---------- Stammdaten (ändern sich selten → bleiben fest im Code) ---------- */
const SITE_NAME = "Fahrschule Let\u{2019}s Drive Kiel";
const SITE_URL  = 'https://www.lets-drive-kiel.de/';
const SITE_MAIL = 'info@lets-drive-kiel.de';
const SITE_TEL  = '0431&nbsp;86923';
const SITE_TEL_HREF = 'tel:+4943186923';
const SITE_STREET = 'Knooper Weg&nbsp;193';
const SITE_CITY = '24118&nbsp;Kiel';
const WEEKDAYS = [1 => 'Mo', 2 => 'Di', 3 => 'Mi', 4 => 'Do', 5 => 'Fr', 6 => 'Sa', 0 => 'So'];
const WEEKDAYS_EN = [0 => 'Sunday', 1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday'];

/* =====================================================================
   Speicher
   ===================================================================== */
function cms_read_json(string $file, $fallback = null) {
    if (!is_file($file)) return $fallback;
    $data = json_decode((string)file_get_contents($file), true);
    return is_array($data) ? $data : $fallback;
}

function cms_write_file(string $file, string $content): void {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $tmp = $dir . '/.' . basename($file) . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, $content, LOCK_EX) === false) throw new RuntimeException("Schreiben fehlgeschlagen: $file");
    if (!rename($tmp, $file)) { @unlink($tmp); throw new RuntimeException("Ersetzen fehlgeschlagen: $file"); }
}

function cms_write_json(string $file, array $data): void {
    cms_write_file($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
}

/** Veröffentlichter Stand (inhalte.json), beim allerersten Start die mitgelieferte Vorlage. */
function cms_published(): array {
    return cms_read_json(CMS_DATA . '/inhalte.json')
        ?? cms_read_json(CMS_DATA . '/inhalte.vorlage.json', []);
}

/** Entwurf, sonst veröffentlichter Stand. */
function cms_draft(): array {
    return cms_read_json(CMS_DATA . '/entwurf.json') ?? cms_published();
}

function cms_versions(): array {
    $files = glob(CMS_DATA . '/versionen/inhalte-*.json') ?: [];
    rsort($files);
    return $files;
}

/* =====================================================================
   Rendern der Bereiche
   ===================================================================== */
function e(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** Typografie: geschützte Leerzeichen vor Einheiten, Gedankenstrich statt „ - ". */
function typo(string $html): string {
    $html = preg_replace('/(\d) (Uhr|Tage|Tagen|Minuten|Min\.|Wochen|Euro|EUR|€|kg|km)\b/u', '$1&nbsp;$2', $html);
    return preg_replace('/ - /u', ' – ', $html);
}

/** Klartext → Absätze (Leerzeile) und Zeilenumbrüche, alles maskiert. */
function paras(string $text, string $cls = ''): string {
    $out = '';
    foreach (preg_split('/\R{2,}/u', trim($text)) as $p) {
        if (trim($p) === '') continue;
        $c = $cls !== '' ? ' class="' . $cls . '"' : '';
        $out .= '<p' . $c . '>' . typo(nl2br(e(trim($p)), false)) . '</p>';
    }
    return $out;
}

function inline(string $text): string { return typo(e(trim($text))); }

function lines(string $text): array {
    return array_values(array_filter(array_map('trim', preg_split('/\R/u', $text)), 'strlen'));
}

const ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
const ICON_ARROW = '<svg class="btn-arrow" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_STAR = '<svg class="star" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z" fill="currentColor"/></svg>';

function hhmm_short(string $t): string { return substr($t, 3) === '00' ? (string)(int)substr($t, 0, 2) : $t; }

/** @return array<string, callable(array): string> */
function cms_renderers(): array {
    return [
        /* Hinweis-Leiste (alle Seiten, unten fixiert) */
        'hinweis' => function (array $c): string {
            $h = $c['hinweis'] ?? [];
            if (empty($h['aktiv']) || trim($h['text'] ?? '') === '') return '';
            return '<aside class="hinweis-leiste" data-hinweis role="note" aria-label="Hinweis">'
                . '<p>' . inline($h['text']) . '</p>'
                . '<button class="hinweis-zu" type="button" aria-label="Hinweis schließen">'
                . '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
                . '</button></aside>';
        },

        /* Bürozeiten als Liste (Startseite, Kontakt, Footer) */
        'zeiten' => function (array $c): string {
            $rows = '';
            foreach ($c['zeiten'] ?? [] as $z) {
                $days = implode(',', array_map('intval', $z['tage'] ?? []));
                $label = inline($z['label'] ?? '');
                if (!empty($z['von']) && !empty($z['bis'])) {
                    $rows .= '<div data-days="' . $days . '" data-from="' . e($z['von']) . '" data-to="' . e($z['bis']) . '">'
                        . '<dt>' . $label . '</dt><dd>' . e($z['von']) . '&nbsp;– ' . e($z['bis']) . '&nbsp;Uhr</dd></div>';
                } else {
                    $rows .= '<div data-days="' . $days . '"><dt>' . $label . '</dt><dd>geschlossen</dd></div>';
                }
            }
            return '<dl class="hours">' . $rows . '</dl>';
        },

        /* Bürozeiten kurz (Mobilmenü) */
        'zeiten-kurz' => function (array $c): string {
            $parts = [];
            foreach ($c['zeiten'] ?? [] as $z) {
                if (empty($z['von']) || empty($z['bis'])) continue;
                $parts[] = inline($z['label'] ?? '') . ' ' . hhmm_short($z['von']) . '–' . hhmm_short($z['bis']) . '&nbsp;Uhr';
            }
            return implode(' · ', $parts);
        },

        /* Strukturierte Daten für Google (Startseite) */
        'jsonld' => function (array $c): string {
            $hours = [];
            foreach ($c['zeiten'] ?? [] as $z) {
                if (empty($z['von']) || empty($z['bis']) || empty($z['tage'])) continue;
                $hours[] = ['@type' => 'OpeningHoursSpecification',
                    'dayOfWeek' => array_map(fn($d) => WEEKDAYS_EN[(int)$d], $z['tage']),
                    'opens' => $z['von'], 'closes' => $z['bis']];
            }
            $ld = ['@context' => 'https://schema.org', '@type' => 'DrivingSchool', 'name' => SITE_NAME,
                'url' => SITE_URL, 'image' => SITE_URL . 'assets/img/og-image.jpg', 'logo' => SITE_URL . 'assets/img/logo.png',
                'telephone' => '+49 431 86923', 'faxNumber' => '+49 431 8065298', 'email' => SITE_MAIL,
                'address' => ['@type' => 'PostalAddress', 'streetAddress' => 'Knooper Weg 193', 'postalCode' => '24118',
                    'addressLocality' => 'Kiel', 'addressRegion' => 'Schleswig-Holstein', 'addressCountry' => 'DE'],
                'openingHoursSpecification' => $hours,
                'sameAs' => ['https://www.facebook.com/people/Fahrschule-Lets-Drive-Kiel/100004820191887']];
            $json = json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return '<script type="application/ld+json">' . str_replace('</', '<\/', (string)$json) . '</script>';
        },

        /* Neuigkeit (Startseite, dunkles Fahrzeug-Band) */
        'neuigkeit' => function (array $c): string {
            $n = $c['neuigkeit'] ?? [];
            if (empty($n['aktiv']) || (trim($n['titel'] ?? '') === '' && trim($n['text'] ?? '') === '')) return '';
            $t = trim($n['titel'] ?? '') !== '' ? '<strong>' . inline($n['titel']) . '</strong> ' : '';
            return '<div class="news rv rv-d3"><p class="eyebrow">Neuigkeit</p><p>' . $t . inline($n['text'] ?? '') . '</p></div>';
        },

        /* Hinweis auf der Theorie-Seite */
        'theorie-hinweis' => function (array $c): string {
            $n = $c['theorie_hinweis'] ?? [];
            if (empty($n['aktiv']) || (trim($n['titel'] ?? '') === '' && trim($n['text'] ?? '') === '')) return '';
            $t = trim($n['titel'] ?? '') !== '' ? '<strong>' . inline($n['titel']) . '</strong> ' : '';
            return '<div class="info-box rv rv-d3"><p class="eyebrow">Aktuell</p><p>' . $t . inline($n['text'] ?? '') . '</p></div>';
        },

        /* Preise – kurz (Startseite) */
        'preise-kurz' => fn(array $c): string => paras($c['preise']['kurz'] ?? '', 'rv rv-d2'),

        /* Preise – ausführlich + optionale Preisliste (Klassen-Seite) */
        'preise' => function (array $c): string {
            $p = $c['preise'] ?? [];
            $html = paras($p['text'] ?? '', 'rv rv-d2');
            $rows = '';
            foreach ($p['liste'] ?? [] as $r) {
                if (trim($r['leistung'] ?? '') === '') continue;
                $rows .= '<div><dt>' . inline($r['leistung']) . '</dt><dd>' . inline($r['preis'] ?? '') . '</dd></div>';
            }
            if ($rows !== '') $html .= '<dl class="price-list rv rv-d3">' . $rows . '</dl>';
            if (trim($p['hinweis'] ?? '') !== '' && $rows !== '') $html .= '<p class="price-note rv rv-d3">' . inline($p['hinweis']) . '</p>';
            return $html;
        },

        /* Stimmen (Startseite) – ganze Sektion, damit sie ausgeblendet werden kann */
        'stimmen' => function (array $c): string {
            $s = $c['stimmen'] ?? [];
            $items = array_values(array_filter($s['liste'] ?? [], fn($q) => trim($q['text'] ?? '') !== ''));
            if (empty($s['aktiv']) || !$items) return '';
            $figs = '';
            foreach ($items as $i => $q) {
                $figs .= "\n      " . '<figure class="quote rv rv-d' . (($i % 3) + 1) . '">'
                    . "\n        " . '<div class="stars" role="img" aria-label="5 von 5 Sternen">' . str_repeat(ICON_STAR, 5) . '</div>'
                    . "\n        " . '<blockquote><p>' . inline($q['text']) . '</p></blockquote>'
                    . "\n        " . '<figcaption><strong>' . inline($q['name'] ?? '') . '</strong><span>' . inline($q['quelle'] ?? '') . '</span></figcaption>'
                    . "\n      </figure>";
            }
            return '<section class="section">
  <div class="wrap">
    <div class="section-head center">
      <p class="eyebrow rv">Stimmen</p>
      <h2 class="rv rv-d1">Was Fahrschüler <em>über uns sagen</em></h2>
      <p class="lead rv rv-d2">' . inline($s['einleitung'] ?? '') . '</p>
    </div>
    <div class="grid-3">' . $figs . '
    </div>
  </div>
</section>';
        },

        /* Stellenanzeige – Einleitung im Seitenkopf */
        'stelle-intro' => function (array $c): string {
            $s = $c['stelle'] ?? [];
            return inline(!empty($s['aktiv']) ? ($s['einleitung'] ?? '') : ($s['einleitung_ohne'] ?? ''));
        },

        /* Stellenanzeige – Hauptteil */
        'stelle' => function (array $c): string {
            $s = $c['stelle'] ?? [];
            $mail = SITE_MAIL;
            $apply = 'mailto:' . $mail . '?subject=' . rawurlencode('Bewerbung ' . trim(preg_replace('/\s*\(.*\)/', '', $s['titel'] ?? 'Fahrlehrer')));
            $cta = '<section class="section section-mint" id="bewerbung">
  <div class="wrap split">
    <div>
      <p class="eyebrow rv">' . (!empty($s['aktiv']) ? 'Bewerbung' : 'Initiativbewerbung') . '</p>
      <h2 class="rv rv-d1">' . (!empty($s['aktiv']) ? 'Haben wir dich <em>neugierig gemacht?</em>' : 'Interesse an <em>unserem Team?</em>') . '</h2>
    </div>
    <div>
      <p class="rv rv-d2">Dann freuen wir uns über deine Bewerbung – gerne per Mail an <a href="mailto:' . $mail . '">' . $mail . '</a>.</p>
      <div class="actions rv rv-d3"><a class="btn btn-primary" href="' . e($apply) . '">Jetzt per Mail bewerben' . ICON_ARROW . '</a><a class="btn btn-ghost" href="' . SITE_TEL_HREF . '">' . SITE_TEL . '</a></div>
    </div>
  </div>
</section>';
            if (empty($s['aktiv'])) {
                return '<section class="section">
  <div class="wrap wrap-narrow">
    <div class="card notice rv">
      <p class="eyebrow">Stellen</p>
      <h2>Aktuell keine offene Stelle</h2>
      ' . paras($s['text_ohne'] ?? '') . '
    </div>
  </div>
</section>

' . $cta;
            }
            $list = fn(array $items): string => '<ul class="checklist">' . implode('', array_map(fn($x) => '<li>' . ICON_CHECK . '<span>' . inline($x) . '</span></li>', $items)) . '</ul>';
            $zusatz = trim($s['zusatz'] ?? '') !== '' ? ' – <em>' . inline($s['zusatz']) . '</em>' : '';
            return '<section class="section">
  <div class="wrap">
    <article class="job">
      <div class="section-head">
        <p class="eyebrow rv">Offene Stelle</p>
        <h2 class="rv rv-d1">' . inline($s['titel'] ?? '') . $zusatz . '</h2>
        ' . paras($s['text'] ?? '', 'lead rv rv-d2') . '
      </div>
      <div class="grid-2">
        <div class="card rv rv-d1">
          <h3>Das erwartet dich</h3>
          ' . $list(lines($s['bieten'] ?? '')) . '
        </div>
        <div class="card rv rv-d2">
          <h3>Das bringst du mit</h3>
          ' . $list(lines($s['erwarten'] ?? '')) . '
        </div>
      </div>
      <dl class="facts rv rv-d2"><div><dt>Position</dt><dd>' . inline($s['titel'] ?? '') . '</dd></div>'
                . (trim($s['zusatz'] ?? '') !== '' ? '<div><dt>Klassen</dt><dd>' . inline(preg_replace('/^Klassen?\s+/u', '', $s['zusatz'])) . '</dd></div>' : '')
                . '<div><dt>Standort</dt><dd>' . SITE_STREET . ', ' . SITE_CITY . '</dd></div><div><dt>Bewerbung</dt><dd>gerne per E-Mail</dd></div></dl>
    </article>
  </div>
</section>

' . $cta;
        },
    ];
}

const CMS_MARKER = '/<!--cms:([a-z][a-z0-9-]*)-->(.*?)<!--\/cms:\1-->/s';

/** Ersetzt alle markierten Bereiche einer HTML-Zeichenkette. */
function cms_apply(string $html, array $content): string {
    $r = cms_renderers();
    return (string)preg_replace_callback(CMS_MARKER, function ($m) use ($r, $content) {
        $name = $m[1];
        if (!isset($r[$name])) return $m[0];                 // unbekannt → unverändert lassen
        return "<!--cms:$name-->" . $r[$name]($content) . "<!--/cms:$name-->";
    }, $html);
}

/** Alle HTML-Seiten der Website (nur Wurzelordner). */
function cms_pages(): array {
    $files = glob(CMS_SITE . '/*.html') ?: [];
    sort($files);
    return $files;
}

/** Schreibt die Bereiche aller Seiten neu; liefert die Namen geänderter Dateien. */
function cms_render_site(array $content): array {
    $changed = [];
    foreach (cms_pages() as $file) {
        $old = (string)file_get_contents($file);
        $new = cms_apply($old, $content);
        if ($new !== $old) { cms_write_file($file, $new); $changed[] = basename($file); }
    }
    return $changed;
}

/** Stimmen die Seiten mit dem veröffentlichten Stand überein? (z. B. nach einem Datei-Upload) */
function cms_out_of_sync(): array {
    $content = cms_published();
    $out = [];
    foreach (cms_pages() as $file) {
        $html = (string)file_get_contents($file);
        if (cms_apply($html, $content) !== $html) $out[] = basename($file);
    }
    return $out;
}

/** Veröffentlichen: Version sichern, inhalte.json schreiben, Seiten rendern. */
function cms_publish(array $content): array {
    $current = cms_read_json(CMS_DATA . '/inhalte.json');
    if ($current !== null) {
        cms_write_json(CMS_DATA . '/versionen/inhalte-' . date('Y-m-d_H-i-s') . '.json', $current);
        foreach (array_slice(cms_versions(), CMS_KEEP_VERSIONS) as $old) @unlink($old);
    }
    $content['_veroeffentlicht'] = date('c');
    cms_write_json(CMS_DATA . '/inhalte.json', $content);
    @unlink(CMS_DATA . '/entwurf.json');
    return cms_render_site($content);
}

/* =====================================================================
   Formular → Inhalt (Validierung, Längen begrenzen)
   ===================================================================== */
function s_in($v, int $max = 2000): string {
    $v = is_string($v) ? $v : '';
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    $v = preg_replace('/[^\P{C}\n\t]/u', '', $v) ?? '';     // Steuerzeichen raus
    return function_exists('mb_substr') ? mb_substr(trim($v), 0, $max, 'UTF-8') : substr(trim($v), 0, $max);
}

function t_in($v): string {
    $v = is_string($v) ? trim($v) : '';
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v) ? $v : '';
}

function cms_from_post(array $p): array {
    $c = [];
    $c['hinweis'] = ['aktiv' => !empty($p['hinweis_aktiv']), 'text' => s_in($p['hinweis_text'] ?? '', 220)];

    $c['zeiten'] = [];
    foreach (($p['zeiten'] ?? []) as $z) {
        if (!is_array($z)) continue;
        $label = s_in($z['label'] ?? '', 40);
        if ($label === '') continue;
        $tage = array_values(array_unique(array_filter(array_map('intval', (array)($z['tage'] ?? [])), fn($d) => $d >= 0 && $d <= 6)));
        $zu = !empty($z['geschlossen']);
        $c['zeiten'][] = ['label' => $label, 'tage' => $tage,
            'von' => $zu ? '' : t_in($z['von'] ?? ''), 'bis' => $zu ? '' : t_in($z['bis'] ?? '')];
    }

    $c['neuigkeit'] = ['aktiv' => !empty($p['news_aktiv']), 'titel' => s_in($p['news_titel'] ?? '', 80), 'text' => s_in($p['news_text'] ?? '', 400)];
    $c['theorie_hinweis'] = ['aktiv' => !empty($p['th_aktiv']), 'titel' => s_in($p['th_titel'] ?? '', 80), 'text' => s_in($p['th_text'] ?? '', 400)];

    $liste = [];
    foreach (($p['preis'] ?? []) as $r) {
        if (!is_array($r)) continue;
        $l = s_in($r['leistung'] ?? '', 80);
        if ($l !== '') $liste[] = ['leistung' => $l, 'preis' => s_in($r['preis'] ?? '', 40)];
    }
    $c['preise'] = ['kurz' => s_in($p['preise_kurz'] ?? '', 800), 'text' => s_in($p['preise_text'] ?? '', 2000),
        'liste' => $liste, 'hinweis' => s_in($p['preise_hinweis'] ?? '', 200)];

    $q = [];
    foreach (($p['stimme'] ?? []) as $r) {
        if (!is_array($r)) continue;
        $t = s_in($r['text'] ?? '', 400);
        if ($t !== '') $q[] = ['text' => $t, 'name' => s_in($r['name'] ?? '', 40), 'quelle' => s_in($r['quelle'] ?? '', 60)];
    }
    $c['stimmen'] = ['aktiv' => !empty($p['stimmen_aktiv']), 'einleitung' => s_in($p['stimmen_einleitung'] ?? '', 160), 'liste' => $q];

    $c['stelle'] = ['aktiv' => !empty($p['stelle_aktiv']),
        'einleitung' => s_in($p['stelle_einleitung'] ?? '', 300), 'titel' => s_in($p['stelle_titel'] ?? '', 80),
        'zusatz' => s_in($p['stelle_zusatz'] ?? '', 80), 'text' => s_in($p['stelle_text'] ?? '', 1200),
        'bieten' => s_in($p['stelle_bieten'] ?? '', 1200), 'erwarten' => s_in($p['stelle_erwarten'] ?? '', 1200),
        'einleitung_ohne' => s_in($p['stelle_einleitung_ohne'] ?? '', 300), 'text_ohne' => s_in($p['stelle_text_ohne'] ?? '', 800)];
    return $c;
}

/* =====================================================================
   Anmeldung (ein Zugang, Passwort-Hash in daten/zugang.json)
   ===================================================================== */
function cms_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' || ($_SERVER['SERVER_PORT'] ?? '') === '443';
    session_name('ldk_redaktion');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/redaktion/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    if (!empty($_SESSION['ok']) && (time() - ($_SESSION['zeit'] ?? 0)) > 3600) { $_SESSION = []; session_regenerate_id(true); }
    if (!empty($_SESSION['ok'])) $_SESSION['zeit'] = time();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function cms_logged_in(): bool { return !empty($_SESSION['ok']); }
function cms_csrf(): string { return $_SESSION['csrf'] ?? ''; }
function cms_csrf_ok(): bool { return is_string($_POST['csrf'] ?? null) && hash_equals(cms_csrf(), $_POST['csrf']); }

function cms_account(): ?array { return cms_read_json(CMS_DATA . '/zugang.json'); }

/** Sperre nach 5 Fehlversuchen für 15 Minuten (je IP, gespeichert als Hash). */
function cms_lock_file(): string { return CMS_DATA . '/sperre.json'; }
function cms_locked(): int {
    $ip = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
    $l = cms_read_json(cms_lock_file(), [])[$ip] ?? null;
    if (!$l || $l['n'] < 5) return 0;
    $rest = $l['t'] + 900 - time();
    return $rest > 0 ? $rest : 0;
}
function cms_fail(bool $reset = false): void {
    $ip = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
    $all = cms_read_json(cms_lock_file(), []);
    foreach ($all as $k => $v) if (($v['t'] ?? 0) < time() - 86400) unset($all[$k]);
    if ($reset) unset($all[$ip]);
    else { $n = ($all[$ip]['n'] ?? 0); $all[$ip] = ['n' => ($n >= 5 ? 0 : $n) + 1, 't' => time()]; }
    cms_write_json(cms_lock_file(), $all);
}

function cms_login(string $pw): bool {
    $acc = cms_account();
    if (!$acc || !password_verify($pw, $acc['hash'] ?? '')) { cms_fail(); return false; }
    cms_fail(true);
    session_regenerate_id(true);
    $_SESSION['ok'] = true; $_SESSION['zeit'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return true;
}

function cms_set_password(string $pw): void {
    cms_write_json(CMS_DATA . '/zugang.json', ['hash' => password_hash($pw, PASSWORD_DEFAULT), 'geaendert' => date('c')]);
}

/** Erste Einrichtung: nur möglich, solange kein Zugang existiert, und nur mit Einrichtungscode. */
function cms_setup_ok(string $code): bool {
    $s = cms_read_json(CMS_DATA . '/einrichtung.json');
    return $s && !cms_account() && password_verify(strtoupper(trim($code)), $s['hash'] ?? '');
}

require __DIR__ . '/fotos.php';
