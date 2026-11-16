<?php
/* =====================================================================
   Redaktion – Fotos austauschen
   Ein hochgeladenes Foto wird auf das Seitenverhältnis des Platzes zugeschnitten
   (Bildausschnitt wählbar), in alle benötigten Breiten als WebP gerechnet und
   ersetzt die bisherigen Dateien. In allen Seiten bekommen die Bildadressen eine
   neue Version (?v=…), damit Besucher sofort das neue Foto sehen statt einer
   zwischengespeicherten Kopie. Das vorherige Foto wird gesichert.

   Kundendaten liegen in daten/ (nie im ZIP):
     fotos.json                 Version, Alt-Text, Video an/aus
     bilder/<platz>/aktuell/    aktuelle Dateien (zum Angleichen nach einem Upload)
     bilder/<platz>/<zeit>/     Sicherungen (älteste = Original + die 4 neuesten)
   ===================================================================== */
declare(strict_types=1);

const CMS_PHOTOS = [
    'hero' => ['label' => 'Startbild', 'wo' => 'Ganz oben auf der Startseite, hinter der Überschrift',
        'ratio' => [16, 9], 'out' => ['hero-960.webp' => 960, 'hero-1600.webp' => 1600, 'hero-2400.webp' => 2400], 'min' => 1400,
        'tipp' => 'Querformat. Das Motiv am besten rechts – links steht die Überschrift auf einem dunklen Verlauf.'],
    'fahrstunde' => ['label' => 'Startseite: Über uns', 'wo' => 'Startseite, neben „Bei Let’s Drive Kiel steht nicht die Prüfung im Mittelpunkt"',
        'ratio' => [4, 5], 'out' => ['fahrstunde-700.webp' => 700, 'fahrstunde-1100.webp' => 1100], 'min' => 700,
        'tipp' => 'Hochformat, z. B. eine Szene aus einer Fahrstunde.'],
    'fahrschulauto' => ['label' => 'Startseite: Fahrzeuge', 'wo' => 'Startseite, dunkler Bereich „Ausbildung auf modernen Fahrzeugen"',
        'ratio' => [851, 315], 'out' => ['fahrschulauto-851.webp' => 1400], 'min' => 800,
        'tipp' => 'Sehr breites Querformat, z. B. ein Fahrschulauto von der Seite.'],
    'theorie' => ['label' => 'Theorie-Seite', 'wo' => 'Oben auf der Seite „Theorie"',
        'ratio' => [3, 2], 'out' => ['theorie-800.webp' => 800, 'theorie-1400.webp' => 1400], 'min' => 1000,
        'tipp' => 'Querformat, z. B. der Schulungsraum.'],
    'motorrad' => ['label' => 'Klassen-Seite: Motorrad', 'wo' => 'Seite „Führerscheinklassen", Bereich Motorrad (als breites Band)',
        'ratio' => [3, 2], 'out' => ['motorrad-800.webp' => 800, 'motorrad-1400.webp' => 1400], 'min' => 1000,
        'tipp' => 'Querformat. Auf großen Bildschirmen wird oben und unten etwas abgeschnitten – Motiv mittig halten.'],
    'anhaenger' => ['label' => 'Klassen-Seite: Anhänger', 'wo' => 'Seite „Führerscheinklassen", Bereich Anhänger (als breites Band)',
        'ratio' => [3, 2], 'out' => ['anhaenger-800.webp' => 800, 'anhaenger-1400.webp' => 1400], 'min' => 1000,
        'tipp' => 'Querformat. Auf großen Bildschirmen wird oben und unten etwas abgeschnitten – Motiv mittig halten.'],
    'schluessel' => ['label' => 'Jobs-Seite', 'wo' => 'Oben auf der Seite „Jobs"',
        'ratio' => [3, 2], 'out' => ['schluessel-800.webp' => 800, 'schluessel-1400.webp' => 1400], 'min' => 1000,
        'tipp' => 'Querformat, z. B. das Team oder ein Fahrzeug.'],
];
const PHOTO_FOCUS = ['mitte' => 'Mitte', 'oben' => 'oben', 'unten' => 'unten', 'links' => 'links', 'rechts' => 'rechts'];
const PHOTO_MAX_BYTES = 25 * 1024 * 1024;

function cms_photo_dir(): string { return CMS_SITE . '/assets/img'; }
function cms_photo_store(string $slot): string { return CMS_DATA . '/bilder/' . $slot; }
function cms_photo_state(): array { return cms_read_json(CMS_DATA . '/fotos.json', []); }
function cms_photo_supported(): bool { return function_exists('imagewebp') && function_exists('imagecreatetruecolor'); }

/** Größte Datei, die der Server annimmt (upload_max_filesize / post_max_size) – die Redaktion verkleinert vorher im Browser. */
function cms_upload_limit(): int {
    $b = function (string $k): int {
        $v = trim((string)ini_get($k));
        if ($v === '' || $v === '0' || $v === '-1') return PHP_INT_MAX;
        $n = (float)$v;
        return (int)($n * (['k' => 1024, 'm' => 1048576, 'g' => 1073741824][strtolower(substr($v, -1))] ?? 1));
    };
    return min($b('upload_max_filesize'), max(0, $b('post_max_size') - 65536), PHOTO_MAX_BYTES);
}

/** Aktueller Alt-Text eines Platzes (aus der Startseite bzw. der Seite, die ihn zeigt). */
function cms_photo_alt(string $slot): string {
    $state = cms_photo_state();
    if (($state[$slot]['alt'] ?? '') !== '') return $state[$slot]['alt'];
    $names = implode('|', array_map(fn($n) => preg_quote($n, '/'), array_keys(CMS_PHOTOS[$slot]['out'])));
    foreach (cms_pages() as $f) {
        if (preg_match('/<img\b[^>]*\bsrc="assets\/img\/(?:' . $names . ')[^"]*"[^>]*\balt="([^"]*)"/', (string)file_get_contents($f), $m)) {
            return html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');
        }
    }
    return '';
}

/** Kleinste Datei eines Platzes inkl. Version – für die Vorschau in der Redaktion. */
function cms_photo_thumb(string $slot): string {
    $out = CMS_PHOTOS[$slot]['out'];
    asort($out);
    $v = cms_photo_state()[$slot]['v'] ?? '';
    return '../assets/img/' . array_key_first($out) . ($v !== '' ? '?v=' . $v : '');
}

/* ---------- Bild laden, ausrichten, zuschneiden ---------- */
function cms_photo_load(string $path) {
    $info = @getimagesize($path);
    if (!$info) throw new RuntimeException('Die Datei ist kein lesbares Foto. Bitte JPG, PNG oder WebP verwenden.');
    [$w, $h, $type] = [$info[0], $info[1], $info[2]];
    if ($w < 1 || $h < 1 || $w > 12000 || $h > 12000 || $w * $h > 60000000) {
        throw new RuntimeException('Das Foto hat ungewöhnliche Abmessungen. Bitte ein normales Foto (bis 60 Megapixel) verwenden.');
    }
    @ini_set('memory_limit', '512M');
    switch ($type) {
        case IMAGETYPE_JPEG: $im = @imagecreatefromjpeg($path); break;
        case IMAGETYPE_PNG: $im = @imagecreatefrompng($path); break;
        case IMAGETYPE_WEBP: $im = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false; break;
        default: throw new RuntimeException('Dieses Format wird nicht unterstützt. Bitte JPG, PNG oder WebP verwenden.');
    }
    if (!$im) throw new RuntimeException('Das Foto konnte nicht geöffnet werden (eventuell zu groß für den Server). Bitte ein kleineres Foto versuchen.');
    // Handyfotos: Drehung aus den EXIF-Daten übernehmen
    if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
        $o = (int)(@exif_read_data($path)['Orientation'] ?? 1);
        $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
        if ($rot) { $r = imagerotate($im, $rot, 0); if ($r) { imagedestroy($im); $im = $r; } }
    }
    return $im;
}

/** @return array{0:int,1:int,2:int,3:int} x, y, Breite, Höhe des Zuschnitts */
function cms_photo_crop_box(int $w, int $h, array $ratio, string $focus): array {
    $target = $ratio[0] / $ratio[1];
    if ($w / $h > $target) { $cw = (int)round($h * $target); $ch = $h; }
    else { $cw = $w; $ch = (int)round($w / $target); }
    $x = intdiv($w - $cw, 2); $y = intdiv($h - $ch, 2);
    if ($focus === 'links') $x = 0;
    if ($focus === 'rechts') $x = $w - $cw;
    if ($focus === 'oben') $y = 0;
    if ($focus === 'unten') $y = $h - $ch;
    return [$x, $y, $cw, $ch];
}

/* ---------- Sichern, Ersetzen, Wiederherstellen ---------- */
function cms_photo_copy_set(string $slot, string $fromDir, string $toDir): void {
    if (!is_dir($toDir)) mkdir($toDir, 0755, true);
    foreach (array_keys(CMS_PHOTOS[$slot]['out']) as $name) {
        if (is_file("$fromDir/$name")) {
            $tmp = "$toDir/.$name." . bin2hex(random_bytes(4)) . '.tmp';
            if (!copy("$fromDir/$name", $tmp) || !rename($tmp, "$toDir/$name")) throw new RuntimeException("Kopieren fehlgeschlagen: $name");
        }
    }
}

function cms_photo_backups(string $slot): array {
    $dirs = array_filter(glob(cms_photo_store($slot) . '/*', GLOB_ONLYDIR) ?: [], fn($d) => basename($d) !== 'aktuell');
    $stamps = array_map('basename', $dirs);
    rsort($stamps);
    return $stamps;                                          // neueste zuerst, letzte = Original
}

function cms_photo_version(): string { return base_convert((string)(int)(microtime(true) * 1000), 10, 36); }

function cms_photo_backup(string $slot): void {
    // Zeitstempel als Ordnername; bei zwei Aktionen in derselben Sekunde nie eine Sicherung überschreiben
    for ($t = time(); is_dir($dir = cms_photo_store($slot) . '/' . date('Y-m-d_H-i-s', $t)); $t++);
    cms_photo_copy_set($slot, cms_photo_dir(), $dir);
    cms_write_json("$dir/info.json", ['alt' => cms_photo_alt($slot)]);
    // behalten: das Original (älteste Sicherung) + die 4 neuesten
    $all = cms_photo_backups($slot);
    if (count($all) > 5) {
        foreach (array_slice($all, 4, -1) as $old) {
            $d = cms_photo_store($slot) . '/' . $old;
            array_map('unlink', glob("$d/*") ?: []);
            @rmdir($d);
        }
    }
}

function cms_photo_replace(string $slot, array $file, string $focus, string $alt): void {
    if (!isset(CMS_PHOTOS[$slot])) throw new RuntimeException('Unbekannter Bildplatz.');
    if (!cms_photo_supported()) throw new RuntimeException('Der Server kann keine WebP-Bilder erzeugen (PHP-Erweiterung GD fehlt). Bitte den Webmaster informieren.');
    $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err === UPLOAD_ERR_NO_FILE) throw new RuntimeException('Bitte zuerst ein Foto auswählen.');
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) throw new RuntimeException('Das Foto ist zu groß für den Upload. Bitte ein kleineres Foto wählen.');
    if ($err !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) throw new RuntimeException('Das Hochladen hat nicht geklappt. Bitte erneut versuchen.');
    if (filesize($file['tmp_name']) > PHOTO_MAX_BYTES) throw new RuntimeException('Das Foto ist größer als 25 MB. Bitte ein kleineres Foto wählen.');

    $def = CMS_PHOTOS[$slot];
    $focus = isset(PHOTO_FOCUS[$focus]) ? $focus : 'mitte';
    $im = cms_photo_load($file['tmp_name']);
    [$x, $y, $cw, $ch] = cms_photo_crop_box(imagesx($im), imagesy($im), $def['ratio'], $focus);
    if ($cw < $def['min']) {
        imagedestroy($im);
        throw new RuntimeException('Das Foto ist für diesen Platz zu klein: Nach dem Zuschnitt sind es ' . $cw . ' Pixel Breite, nötig sind mindestens ' . $def['min'] . '. Bitte ein größeres Foto verwenden.');
    }

    // Neue Dateien zuerst in einen Zwischenordner rechnen – erst wenn alle fertig sind, wird ersetzt
    $work = cms_photo_store($slot) . '/.neu-' . bin2hex(random_bytes(4));
    mkdir($work, 0755, true);
    try {
        foreach ($def['out'] as $name => $tw) {
            $w = min($tw, $cw);
            $h = (int)round($w * $def['ratio'][1] / $def['ratio'][0]);
            $dst = imagecreatetruecolor($w, $h);
            imagefilledrectangle($dst, 0, 0, $w, $h, (int)imagecolorallocate($dst, 255, 255, 255)); // transparente PNGs auf Weiß
            imagecopyresampled($dst, $im, 0, 0, $x, $y, $w, $h, $cw, $ch);
            if (!imagewebp($dst, "$work/$name", 80)) throw new RuntimeException('Das Foto konnte nicht gespeichert werden.');
            imagedestroy($dst);
        }
        imagedestroy($im);
        cms_photo_backup($slot);                                 // vorheriges Foto sichern
        cms_photo_copy_set($slot, $work, cms_photo_dir());       // live ersetzen
        cms_photo_copy_set($slot, $work, cms_photo_store($slot) . '/aktuell');
    } finally {
        array_map('unlink', glob("$work/*") ?: []);
        @rmdir($work);
    }

    $state = cms_photo_state();
    $state[$slot] = ['v' => cms_photo_version(), 'geaendert' => date('c'),
        'alt' => s_in($alt, 180) !== '' ? s_in($alt, 180) : cms_photo_alt($slot)];
    if ($slot === 'hero') $state['_video'] = false;             // Video zeigt das alte Motiv
    cms_write_json(CMS_DATA . '/fotos.json', $state);
    cms_photo_apply_html($state);
}

function cms_photo_restore(string $slot, string $stamp): void {
    if (!isset(CMS_PHOTOS[$slot]) || !preg_match('/^\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d$/', $stamp)) throw new RuntimeException('Diese Sicherung wurde nicht gefunden.');
    $dir = cms_photo_store($slot) . '/' . $stamp;
    if (!is_dir($dir)) throw new RuntimeException('Diese Sicherung wurde nicht gefunden.');
    $alt = cms_read_json("$dir/info.json", [])['alt'] ?? '';
    cms_photo_backup($slot);
    cms_photo_copy_set($slot, $dir, cms_photo_dir());
    cms_photo_copy_set($slot, $dir, cms_photo_store($slot) . '/aktuell');
    $state = cms_photo_state();
    $state[$slot] = ['v' => cms_photo_version(), 'geaendert' => date('c'), 'alt' => $alt];
    cms_write_json(CMS_DATA . '/fotos.json', $state);
    cms_photo_apply_html($state);
}

function cms_video_set(bool $on): void {
    $state = cms_photo_state();
    $state['_video'] = $on;
    cms_write_json(CMS_DATA . '/fotos.json', $state);
    cms_photo_apply_html($state);
}

function cms_video_on(): bool { return (cms_photo_state()['_video'] ?? true) !== false; }

/* ---------- Seiten anpassen: Version, Alt-Text, Video ---------- */
function cms_photo_html(string $html, array $state, string $file): string {
    foreach (CMS_PHOTOS as $slot => $def) {
        if (empty($state[$slot]['v'])) continue;
        $v = $state[$slot]['v'];
        foreach (array_keys($def['out']) as $name) {
            $html = (string)preg_replace('/assets\/img\/' . preg_quote($name, '/') . '(\?v=[0-9a-z]+)?/', 'assets/img/' . $name . '?v=' . $v, $html);
        }
        if (($state[$slot]['alt'] ?? '') !== '') {
            $names = implode('|', array_map(fn($n) => preg_quote($n, '/'), array_keys($def['out'])));
            $alt = htmlspecialchars($state[$slot]['alt'], ENT_QUOTES, 'UTF-8');
            $html = (string)preg_replace_callback('/<img\b[^>]*\bsrc="assets\/img\/(?:' . $names . ')[^>]*>/',
                fn($m) => (string)preg_replace('/\balt="[^"]*"/', 'alt="' . $alt . '"', $m[0], 1), $html);
        }
    }
    if ($file === 'index.html' && array_key_exists('_video', $state)) {
        $html = $state['_video']
            ? str_replace('class="hero-media" data-video-aus ', 'class="hero-media" data-video ', $html)
            : str_replace('class="hero-media" data-video ', 'class="hero-media" data-video-aus ', $html);
    }
    return $html;
}

function cms_photo_apply_html(array $state): array {
    $changed = [];
    foreach (cms_pages() as $f) {
        $old = (string)file_get_contents($f);
        $new = cms_photo_html($old, $state, basename($f));
        if ($new !== $old) { cms_write_file($f, $new); $changed[] = basename($f); }
    }
    return $changed;
}

/** Stimmen Dateien und Seiten mit den Fotos des Kunden überein? (z. B. nach einem ZIP-Upload) */
function cms_photo_out_of_sync(): array {
    $state = cms_photo_state();
    $out = [];
    foreach (CMS_PHOTOS as $slot => $def) {
        if (empty($state[$slot]['v'])) continue;
        foreach (array_keys($def['out']) as $name) {
            $a = cms_photo_store($slot) . "/aktuell/$name";
            if (is_file($a) && @md5_file($a) !== @md5_file(cms_photo_dir() . "/$name")) { $out[] = $name; break; }
        }
    }
    foreach (cms_pages() as $f) {
        $html = (string)file_get_contents($f);
        if (cms_photo_html($html, $state, basename($f)) !== $html) $out[] = basename($f);
    }
    return array_values(array_unique($out));
}

function cms_photo_resync(): void {
    $state = cms_photo_state();
    foreach (CMS_PHOTOS as $slot => $def) {
        if (!empty($state[$slot]['v']) && is_dir(cms_photo_store($slot) . '/aktuell')) {
            cms_photo_copy_set($slot, cms_photo_store($slot) . '/aktuell', cms_photo_dir());
        }
    }
    cms_photo_apply_html($state);
}
