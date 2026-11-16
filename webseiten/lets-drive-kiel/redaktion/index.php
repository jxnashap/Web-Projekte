<?php
/* Redaktion Let's Drive Kiel – Oberfläche (Einrichtung, Anmeldung, Bearbeiten, Veröffentlichen) */
declare(strict_types=1);
require __DIR__ . '/inc/cms.php';

cms_session_start();
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Referrer-Policy: same-origin');

function go(string $flash = '', string $type = 'ok'): void {
    if ($flash !== '') $_SESSION['flash'] = [$type, $flash];
    header('Location: ./', true, 303);
    exit;
}

$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$error = '';

/* ---------- 1. Erste Einrichtung ---------- */
if (!cms_account()) {
    if ($post) {
        $pw = (string)($_POST['pw'] ?? '');
        if (!cms_csrf_ok()) $error = 'Die Sitzung ist abgelaufen. Bitte erneut versuchen.';
        elseif (cms_locked()) $error = 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.';
        elseif (!cms_setup_ok((string)($_POST['code'] ?? ''))) { cms_fail(); $error = 'Der Einrichtungscode stimmt nicht.'; }
        elseif (strlen($pw) < 10) $error = 'Das Passwort muss mindestens 10 Zeichen lang sein.';
        elseif ($pw !== (string)($_POST['pw2'] ?? '')) $error = 'Die beiden Passwörter stimmen nicht überein.';
        else { cms_set_password($pw); cms_login($pw); go('Willkommen! Ihr Passwort ist gespeichert.'); }
    }
    page_start('Redaktion einrichten');
    ?>
    <main class="auth">
      <h1>Redaktion einrichten</h1>
      <p>Legen Sie einmalig Ihr Passwort fest. Den Einrichtungscode haben Sie zusammen mit der Website erhalten.</p>
      <?php if ($error) echo '<p class="msg msg-err" role="alert">' . e($error) . '</p>'; ?>
      <form method="post" class="stack">
        <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">
        <label>Einrichtungscode<input name="code" required autocomplete="off" spellcheck="false" placeholder="LDK-XXXX-XXXX-XXXX"></label>
        <label>Neues Passwort <small>(mindestens 10 Zeichen)</small><input type="password" name="pw" required minlength="10" autocomplete="new-password"></label>
        <label>Passwort wiederholen<input type="password" name="pw2" required minlength="10" autocomplete="new-password"></label>
        <button class="b b-main" type="submit">Passwort speichern</button>
      </form>
    </main>
    <?php
    page_end();
    exit;
}

/* ---------- 2. Anmeldung ---------- */
if (!cms_logged_in()) {
    if ($post) {
        if (!cms_csrf_ok()) $error = 'Die Sitzung ist abgelaufen. Bitte erneut versuchen.';
        elseif ($rest = cms_locked()) $error = 'Zu viele Fehlversuche. Bitte in ' . (int)ceil($rest / 60) . ' Minuten erneut versuchen.';
        elseif (cms_login((string)($_POST['pw'] ?? ''))) go();
        else $error = 'Das Passwort stimmt nicht.';
    }
    page_start('Anmelden');
    ?>
    <main class="auth">
      <h1>Redaktion</h1>
      <p>Hier pflegen Sie Bürozeiten, Hinweise, Preise und mehr für <a href="../">lets-drive-kiel.de</a>.</p>
      <?php if ($error) echo '<p class="msg msg-err" role="alert">' . e($error) . '</p>'; ?>
      <form method="post" class="stack">
        <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">
        <label>Passwort<input type="password" name="pw" required autofocus autocomplete="current-password"></label>
        <button class="b b-main" type="submit">Anmelden</button>
      </form>
    </main>
    <?php
    page_end();
    exit;
}

/* ---------- 3. Aktionen (angemeldet) ---------- */
if ($post) {
    // Upload größer als post_max_size: PHP liefert dann gar keine Formulardaten
    if (!$_POST && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) go('Die Datei ist zu groß für den Server. Bitte ein kleineres Foto wählen.', 'err');
    if (!cms_csrf_ok()) go('Die Sitzung ist abgelaufen – bitte noch einmal versuchen.', 'err');
    $a = (string)($_POST['aktion'] ?? '');
    try {
        switch ($a) {
            case 'speichern':
                cms_write_json(CMS_DATA . '/entwurf.json', cms_from_post($_POST));
                go('Entwurf gespeichert. Er ist noch nicht auf der Website sichtbar.');
            case 'vorschau':
                cms_write_json(CMS_DATA . '/entwurf.json', cms_from_post($_POST));
                header('Location: vorschau.php?seite=index.html', true, 303); exit;
            case 'veroeffentlichen':
                $n = count(cms_publish(cms_from_post($_POST)));
                go('Veröffentlicht – die Änderungen sind jetzt live auf der Website (' . $n . ' ' . ($n === 1 ? 'Seite' : 'Seiten') . ' aktualisiert).');
            case 'verwerfen':
                @unlink(CMS_DATA . '/entwurf.json');
                go('Entwurf verworfen. Es gilt wieder der veröffentlichte Stand.');
            case 'wiederherstellen':
                $f = basename((string)($_POST['datei'] ?? ''));
                $data = preg_match('/^inhalte-[\d_-]+\.json$/', $f) ? cms_read_json(CMS_DATA . '/versionen/' . $f) : null;
                if (!$data) go('Diese Version wurde nicht gefunden.', 'err');
                cms_write_json(CMS_DATA . '/entwurf.json', $data);
                go('Die ältere Version ist als Entwurf geladen. Prüfen Sie sie und klicken Sie dann auf „Veröffentlichen".');
            case 'aktualisieren':
                cms_render_site(cms_published());
                cms_photo_resync();
                go('Website-Dateien angeglichen – Ihre Inhalte und Fotos sind wieder aktuell.');
            case 'foto':
                $slot = (string)($_POST['platz'] ?? '');
                cms_photo_replace($slot, $_FILES['foto'] ?? [], (string)($_POST['fokus'] ?? 'mitte'), (string)($_POST['alt'] ?? ''));
                go('Foto „' . (CMS_PHOTOS[$slot]['label'] ?? '') . '" ersetzt – es ist jetzt live.'
                    . ($slot === 'hero' ? ' Das Startseiten-Video zeigt noch das alte Motiv und ist deshalb ausgeschaltet.' : ''));
            case 'foto_zurueck':
                $slot = (string)($_POST['platz'] ?? '');
                cms_photo_restore($slot, (string)($_POST['stand'] ?? ''));
                go('Früheres Foto „' . (CMS_PHOTOS[$slot]['label'] ?? '') . '" wiederhergestellt.');
            case 'video':
                cms_video_set(($_POST['video'] ?? '') === 'an');
                go(($_POST['video'] ?? '') === 'an' ? 'Startseiten-Video eingeschaltet.' : 'Startseiten-Video ausgeschaltet – es wird nur das Startbild gezeigt.');
            case 'passwort':
                $acc = cms_account();
                $new = (string)($_POST['pw_neu'] ?? '');
                if (!password_verify((string)($_POST['pw_alt'] ?? ''), $acc['hash'] ?? '')) go('Das bisherige Passwort stimmt nicht.', 'err');
                if (strlen($new) < 10) go('Das neue Passwort muss mindestens 10 Zeichen lang sein.', 'err');
                if ($new !== (string)($_POST['pw_neu2'] ?? '')) go('Die neuen Passwörter stimmen nicht überein.', 'err');
                cms_set_password($new);
                go('Passwort geändert.');
            case 'abmelden':
                $_SESSION = [];
                session_destroy();
                header('Location: ./', true, 303); exit;
        }
    } catch (RuntimeException $ex) {
        go($ex->getMessage(), 'err');                     // verständliche Meldung (z. B. Foto zu klein)
    } catch (Throwable $ex) {
        error_log('[redaktion] ' . $ex->getMessage());
        go('Das hat leider nicht geklappt: Die Dateien konnten nicht geschrieben werden. Bitte später erneut versuchen oder den Webmaster informieren.', 'err');
    }
    go();
}

/* ---------- 4. Bearbeiten ---------- */
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);
$hasDraft = is_file(CMS_DATA . '/entwurf.json');
$c = cms_draft();
$pub = cms_published();
$sync = array_merge(cms_out_of_sync(), cms_photo_out_of_sync());

function v(array $a, string $k): string { return e((string)($a[$k] ?? '')); }
function chk($on): string { return !empty($on) ? ' checked' : ''; }
function when(?string $iso): string { return $iso ? date('d.m.Y, H:i', strtotime($iso)) . ' Uhr' : '–'; }

page_start('Redaktion');
?>
<header class="bar">
  <div class="bar-in">
    <img class="bar-logo" src="../assets/img/logo-dark.svg" alt="Let's Drive Kiel" width="97" height="40">
    <strong>Redaktion</strong>
    <nav>
      <a href="../" target="_blank" rel="noopener">Website ansehen ↗</a>
      <form method="post"><input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>"><button class="linkish" name="aktion" value="abmelden">Abmelden</button></form>
    </nav>
  </div>
</header>

<main class="wrap">
  <?php if ($flash): ?><p class="msg <?= $flash[0] === 'err' ? 'msg-err' : 'msg-ok' ?>" role="status"><?= e($flash[1]) ?></p><?php endif; ?>

  <section class="status">
    <p><span class="dot dot-live"></span>Zuletzt veröffentlicht: <strong><?= e(when($pub['_veroeffentlicht'] ?? null)) ?></strong></p>
    <?php if ($hasDraft): ?>
      <p><span class="dot dot-draft"></span>Es gibt einen <strong>Entwurf</strong>, der noch nicht veröffentlicht ist.</p>
    <?php endif; ?>
    <?php if ($sync): ?>
      <form method="post" class="warn">
        <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">
        <p>Die Website-Dateien entsprechen nicht dem zuletzt veröffentlichten Stand (zum Beispiel nach einem neuen Upload).</p>
        <button class="b" name="aktion" value="aktualisieren">Jetzt angleichen</button>
      </form>
    <?php endif; ?>
  </section>

  <form method="post" id="inhalte" class="editor">
    <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">

    <section class="box">
      <h2>Hinweis-Leiste</h2>
      <p class="help">Kurze Meldung unten auf allen Seiten – zum Beispiel Betriebsferien oder geänderte Zeiten. Besucher können sie schließen.</p>
      <label class="check"><input type="checkbox" name="hinweis_aktiv" value="1"<?= chk($c['hinweis']['aktiv'] ?? false) ?>> Hinweis anzeigen</label>
      <label>Text <small>(max. 220 Zeichen)</small><input name="hinweis_text" maxlength="220" value="<?= v($c['hinweis'] ?? [], 'text') ?>" placeholder="z. B. Betriebsferien vom 23.12. bis 2.1. – ab dem 5.1. sind wir wieder für dich da."></label>
    </section>

    <section class="box">
      <h2>Bürozeiten</h2>
      <p class="help">Erscheinen auf Startseite, Kontaktseite, im Fußbereich und im Menü. Die Wochentage steuern die Anzeige „Jetzt geöffnet". Leere Zeilen werden ignoriert.</p>
      <div class="rows">
      <?php
      $zeiten = $c['zeiten'] ?? [];
      $count = max(count($zeiten) + 1, 4);
      for ($i = 0; $i < min($count, 7); $i++):
        $z = $zeiten[$i] ?? ['label' => '', 'tage' => [], 'von' => '', 'bis' => ''];
        $zu = ($z['label'] ?? '') !== '' && (empty($z['von']) || empty($z['bis']));
      ?>
        <fieldset class="row-hours">
          <legend class="sr">Zeile <?= $i + 1 ?></legend>
          <label>Bezeichnung<input name="zeiten[<?= $i ?>][label]" maxlength="40" value="<?= v($z, 'label') ?>" placeholder="z. B. Mo, Mi, Fr"></label>
          <div class="days" role="group" aria-label="Wochentage">
            <?php foreach (WEEKDAYS as $num => $name): ?>
              <label class="day"><input type="checkbox" name="zeiten[<?= $i ?>][tage][]" value="<?= $num ?>"<?= in_array($num, array_map('intval', $z['tage'] ?? []), true) ? ' checked' : '' ?>><span><?= $name ?></span></label>
            <?php endforeach; ?>
          </div>
          <label>von<input type="time" name="zeiten[<?= $i ?>][von]" value="<?= v($z, 'von') ?>"></label>
          <label>bis<input type="time" name="zeiten[<?= $i ?>][bis]" value="<?= v($z, 'bis') ?>"></label>
          <label class="check"><input type="checkbox" name="zeiten[<?= $i ?>][geschlossen]" value="1"<?= $zu ? ' checked' : '' ?>> geschlossen</label>
        </fieldset>
      <?php endfor; ?>
      </div>
    </section>

    <section class="box">
      <h2>Neuigkeit auf der Startseite</h2>
      <p class="help">Kleiner Kasten im Bereich „Unsere Fahrzeuge".</p>
      <label class="check"><input type="checkbox" name="news_aktiv" value="1"<?= chk($c['neuigkeit']['aktiv'] ?? false) ?>> Neuigkeit anzeigen</label>
      <label>Überschrift<input name="news_titel" maxlength="80" value="<?= v($c['neuigkeit'] ?? [], 'titel') ?>"></label>
      <label>Text<textarea name="news_text" maxlength="400" rows="3"><?= v($c['neuigkeit'] ?? [], 'text') ?></textarea></label>
    </section>

    <section class="box">
      <h2>Hinweis auf der Theorie-Seite</h2>
      <p class="help">Zum Beispiel der nächste Termin für die Motorrad-Theorie.</p>
      <label class="check"><input type="checkbox" name="th_aktiv" value="1"<?= chk($c['theorie_hinweis']['aktiv'] ?? false) ?>> Hinweis anzeigen</label>
      <label>Überschrift<input name="th_titel" maxlength="80" value="<?= v($c['theorie_hinweis'] ?? [], 'titel') ?>" placeholder="z. B. Motorrad-Theorie:"></label>
      <label>Text<textarea name="th_text" maxlength="400" rows="2" placeholder="z. B. Nächster Termin am Samstag, 14.3., 10:00 Uhr."><?= v($c['theorie_hinweis'] ?? [], 'text') ?></textarea></label>
    </section>

    <section class="box">
      <h2>Preise</h2>
      <p class="help">Eine Leerzeile beginnt einen neuen Absatz. Die Preisliste erscheint nur, wenn mindestens eine Zeile ausgefüllt ist.</p>
      <label>Text auf der Startseite<textarea name="preise_kurz" maxlength="800" rows="3"><?= v($c['preise'] ?? [], 'kurz') ?></textarea></label>
      <label>Text auf der Seite „Führerscheinklassen"<textarea name="preise_text" maxlength="2000" rows="5"><?= v($c['preise'] ?? [], 'text') ?></textarea></label>
      <div class="rows">
      <?php
      $liste = $c['preise']['liste'] ?? [];
      for ($i = 0; $i < min(max(count($liste) + 3, 4), 14); $i++): $r = $liste[$i] ?? ['leistung' => '', 'preis' => ''];
      ?>
        <div class="row-2">
          <label>Leistung<input name="preis[<?= $i ?>][leistung]" maxlength="80" value="<?= v($r, 'leistung') ?>" placeholder="z. B. Fahrstunde (45 Min.)"></label>
          <label>Preis<input name="preis[<?= $i ?>][preis]" maxlength="40" value="<?= v($r, 'preis') ?>" placeholder="z. B. 65 €"></label>
        </div>
      <?php endfor; ?>
      </div>
      <label>Hinweis unter der Preisliste<input name="preise_hinweis" maxlength="200" value="<?= v($c['preise'] ?? [], 'hinweis') ?>" placeholder="z. B. Alle Preise inkl. MwSt. Stand: März 2027."></label>
    </section>

    <section class="box">
      <h2>Bewertungen auf der Startseite</h2>
      <p class="help">Nur mit Einverständnis der Personen veröffentlichen. Leere Felder werden ignoriert.</p>
      <label class="check"><input type="checkbox" name="stimmen_aktiv" value="1"<?= chk($c['stimmen']['aktiv'] ?? false) ?>> Bereich anzeigen</label>
      <label>Einleitung<input name="stimmen_einleitung" maxlength="160" value="<?= v($c['stimmen'] ?? [], 'einleitung') ?>"></label>
      <?php
      $st = $c['stimmen']['liste'] ?? [];
      for ($i = 0; $i < min(max(count($st) + 1, 3), 6); $i++): $q = $st[$i] ?? ['text' => '', 'name' => '', 'quelle' => ''];
      ?>
        <fieldset class="quote-edit">
          <legend>Bewertung <?= $i + 1 ?></legend>
          <label>Text<textarea name="stimme[<?= $i ?>][text]" maxlength="400" rows="2"><?= v($q, 'text') ?></textarea></label>
          <div class="row-2">
            <label>Name<input name="stimme[<?= $i ?>][name]" maxlength="40" value="<?= v($q, 'name') ?>" placeholder="z. B. Luisa N."></label>
            <label>Quelle<input name="stimme[<?= $i ?>][quelle]" maxlength="60" value="<?= v($q, 'quelle') ?>" placeholder="z. B. Google-Bewertung · 08/2025"></label>
          </div>
        </fieldset>
      <?php endfor; ?>
    </section>

    <?php $s = $c['stelle'] ?? []; ?>
    <section class="box">
      <h2>Stellenanzeige (Seite „Jobs")</h2>
      <label class="check"><input type="checkbox" name="stelle_aktiv" value="1"<?= chk($s['aktiv'] ?? false) ?>> Es gibt eine offene Stelle</label>
      <div class="sub">
        <h3>Wenn eine Stelle offen ist</h3>
        <label>Einleitung oben auf der Seite<textarea name="stelle_einleitung" maxlength="300" rows="2"><?= v($s, 'einleitung') ?></textarea></label>
        <div class="row-2">
          <label>Stellentitel<input name="stelle_titel" maxlength="80" value="<?= v($s, 'titel') ?>" placeholder="z. B. Fahrlehrer (w/m/d)"></label>
          <label>Zusatz<input name="stelle_zusatz" maxlength="80" value="<?= v($s, 'zusatz') ?>" placeholder="z. B. Klassen A, B und BE"></label>
        </div>
        <label>Beschreibung<textarea name="stelle_text" maxlength="1200" rows="3"><?= v($s, 'text') ?></textarea></label>
        <div class="row-2">
          <label>Das erwartet dich <small>(eine Zeile pro Punkt)</small><textarea name="stelle_bieten" maxlength="1200" rows="5"><?= v($s, 'bieten') ?></textarea></label>
          <label>Das bringst du mit <small>(eine Zeile pro Punkt)</small><textarea name="stelle_erwarten" maxlength="1200" rows="5"><?= v($s, 'erwarten') ?></textarea></label>
        </div>
      </div>
      <div class="sub">
        <h3>Wenn keine Stelle offen ist</h3>
        <label>Einleitung oben auf der Seite<textarea name="stelle_einleitung_ohne" maxlength="300" rows="2"><?= v($s, 'einleitung_ohne') ?></textarea></label>
        <label>Text<textarea name="stelle_text_ohne" maxlength="800" rows="3"><?= v($s, 'text_ohne') ?></textarea></label>
      </div>
    </section>

    <div class="actions">
      <div class="actions-in">
        <button class="b" name="aktion" value="speichern">Entwurf speichern</button>
        <button class="b" name="aktion" value="vorschau" formtarget="_blank">Vorschau ↗</button>
        <?php if ($hasDraft): ?><button class="b b-quiet" name="aktion" value="verwerfen" formnovalidate data-confirm="Den Entwurf verwerfen? Ihre ungespeicherten Änderungen gehen verloren.">Entwurf verwerfen</button><?php endif; ?>
        <button class="b b-main" name="aktion" value="veroeffentlichen" data-confirm="Jetzt veröffentlichen? Die Änderungen sind danach sofort auf der Website sichtbar.">Veröffentlichen</button>
      </div>
    </div>
  </form>

  <section class="box" id="fotos">
    <h2>Fotos austauschen</h2>
    <p class="help">Ein neues Foto ist <strong>sofort nach dem Hochladen</strong> auf der Website – unabhängig von „Veröffentlichen". Es wird automatisch passend zugeschnitten und verkleinert. Erlaubt sind JPG, PNG oder WebP, gern direkt vom Handy. Das vorherige Foto lässt sich jederzeit wiederherstellen.</p>
    <?php if (!cms_photo_supported()): ?><p class="msg msg-err">Der Server kann keine Bilder verarbeiten (PHP-Erweiterung GD mit WebP fehlt). Bitte den Webmaster informieren.</p><?php endif; ?>
    <div class="photos">
    <?php foreach (CMS_PHOTOS as $slot => $def):
        $ratioCls = 'ratio-' . $def['ratio'][0] . '-' . $def['ratio'][1];
        $backups = cms_photo_backups($slot); ?>
      <article class="photo" id="foto-<?= e($slot) ?>">
        <figure class="photo-now <?= $ratioCls ?>"><img src="<?= e(cms_photo_thumb($slot)) ?>" alt="Aktuelles Foto: <?= e($def['label']) ?>"></figure>
        <div class="photo-body">
          <h3><?= e($def['label']) ?></h3>
          <p class="help"><?= e($def['wo']) ?>. <?= e($def['tipp']) ?></p>
          <form method="post" enctype="multipart/form-data" class="photo-form" data-max="<?= cms_upload_limit() ?>">
            <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">
            <input type="hidden" name="platz" value="<?= e($slot) ?>">
            <label>Neues Foto auswählen<input type="file" name="foto" accept="image/jpeg,image/png,image/webp" required></label>
            <figure class="crop-preview <?= $ratioCls ?>" hidden><img alt="So wird das Foto zugeschnitten"><figcaption>So wird es zugeschnitten</figcaption></figure>
            <div class="row-2">
              <label>Bildausschnitt
                <select name="fokus"><?php foreach (PHOTO_FOCUS as $k => $l): ?><option value="<?= $k ?>"><?= e($l) ?></option><?php endforeach; ?></select>
              </label>
              <label>Bildbeschreibung <small>(was zeigt das neue Foto? – für Blinde und Google)</small>
                <input name="alt" maxlength="180" value="<?= e(cms_photo_alt($slot)) ?>">
              </label>
            </div>
            <button class="b b-main" name="aktion" value="foto" data-confirm="Foto jetzt ersetzen? Es ist danach sofort auf der Website sichtbar.">Foto ersetzen</button>
          </form>
          <?php if ($backups): ?>
            <details class="photo-old">
              <summary>Frühere Fotos (<?= count($backups) ?>)</summary>
              <ul>
              <?php foreach ($backups as $i => $stamp):
                  $label = $i === count($backups) - 1 ? 'Original (Auslieferung)' : preg_replace('/^(\d{4})-(\d\d)-(\d\d)_(\d\d)-(\d\d)-\d\d$/', 'Stand vom $3.$2.$1, $4:$5 Uhr', $stamp); ?>
                <li>
                  <span><?= e($label) ?></span>
                  <form method="post">
                    <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">
                    <input type="hidden" name="platz" value="<?= e($slot) ?>">
                    <input type="hidden" name="stand" value="<?= e($stamp) ?>">
                    <button class="b b-small" name="aktion" value="foto_zurueck" data-confirm="Dieses frühere Foto wiederherstellen? Es ist danach sofort auf der Website sichtbar.">Wiederherstellen</button>
                  </form>
                </li>
              <?php endforeach; ?>
              </ul>
            </details>
          <?php endif; ?>
          <?php if ($slot === 'hero'): $videoOn = cms_video_on(); ?>
            <form method="post" class="video-toggle">
              <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">
              <input type="hidden" name="video" value="<?= $videoOn ? 'aus' : 'an' ?>">
              <p>Startseiten-Video (läuft am Computer über dem Startbild): <strong><?= $videoOn ? 'an' : 'aus' ?></strong>
                <?php if (!$videoOn && !empty(cms_photo_state()['hero']['v'])): ?><br><small>Hinweis: Das Video zeigt das ursprüngliche Motiv, nicht Ihr neues Startbild.</small><?php endif; ?></p>
              <button class="b b-small" name="aktion" value="video"><?= $videoOn ? 'Video ausschalten' : 'Video einschalten' ?></button>
            </form>
          <?php endif; ?>
        </div>
      </article>
    <?php endforeach; ?>
    </div>
  </section>

  <section class="box">
    <h2>Frühere Versionen der Texte</h2>
    <?php $vers = cms_versions(); if (!$vers): ?>
      <p class="help">Noch keine. Bei jedem Veröffentlichen wird der vorherige Stand hier gesichert (die letzten <?= CMS_KEEP_VERSIONS ?>).</p>
    <?php else: ?>
      <ul class="versions">
      <?php foreach ($vers as $f): $b = basename($f); $ts = preg_replace('/^inhalte-(\d{4})-(\d\d)-(\d\d)_(\d\d)-(\d\d)-\d\d\.json$/', '$3.$2.$1, $4:$5 Uhr', $b); ?>
        <li><span>Stand vom <?= e($ts) ?></span>
          <form method="post"><input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>"><input type="hidden" name="datei" value="<?= e($b) ?>">
            <button class="b b-small" name="aktion" value="wiederherstellen">Als Entwurf laden</button></form></li>
      <?php endforeach; ?>
      </ul>
    <?php endif; ?>
  </section>

  <section class="box">
    <h2>Passwort ändern</h2>
    <form method="post" class="row-3">
      <input type="hidden" name="csrf" value="<?= e(cms_csrf()) ?>">
      <label>Bisheriges Passwort<input type="password" name="pw_alt" required autocomplete="current-password"></label>
      <label>Neues Passwort<input type="password" name="pw_neu" required minlength="10" autocomplete="new-password"></label>
      <label>Neues Passwort wiederholen<input type="password" name="pw_neu2" required minlength="10" autocomplete="new-password"></label>
      <button class="b" name="aktion" value="passwort">Passwort ändern</button>
    </form>
  </section>

  <p class="foot">Stammdaten wie Telefon, Adresse oder die Texte der übrigen Seiten ändert Ihr Webmaster. · Redaktion <?= CMS_VERSION ?></p>
</main>
<?php
page_end();

/* ---------- Seitengerüst ---------- */
function page_start(string $title): void {
    echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex, nofollow"><title>' . e($title) . ' · Let’s Drive Kiel</title>'
        . '<link rel="icon" href="../favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="redaktion.css">'
        . '<script src="redaktion.js" defer></script></head><body>';
}
function page_end(): void { echo '</body></html>'; }
