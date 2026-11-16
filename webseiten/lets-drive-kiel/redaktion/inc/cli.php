<?php
/* Kommandozeile (nur Build/Wartung, nie über das Web):
     php redaktion/inc/cli.php render       Bereiche aller Seiten aus inhalte.json (bzw. Vorlage) rendern
     php redaktion/inc/cli.php check        prüfen, ob Seiten und Inhalte übereinstimmen (Exit 1 = nein)
     php redaktion/inc/cli.php setup-code   neuen Einrichtungscode erzeugen (nur Hash wird gespeichert) */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/cms.php';

switch ($argv[1] ?? 'render') {
    case 'render':
        $changed = cms_render_site(cms_published());
        echo count($changed) . " Seite(n) aktualisiert" . ($changed ? ': ' . implode(', ', $changed) : '') . "\n";
        break;
    case 'check':
        $out = cms_out_of_sync();
        echo $out ? 'Nicht aktuell: ' . implode(', ', $out) . "\n" : "Alle Seiten aktuell.\n";
        exit($out ? 1 : 0);
    case 'setup-code':
        $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // ohne I, O, 0, 1
        $g = fn() => implode('', array_map(fn() => $abc[random_int(0, strlen($abc) - 1)], range(1, 4)));
        $code = 'LDK-' . $g() . '-' . $g() . '-' . $g();
        cms_write_json(CMS_DATA . '/einrichtung.json', ['hash' => password_hash($code, PASSWORD_DEFAULT), 'erstellt' => date('c')]);
        echo $code . "\n";
        break;
    default:
        fwrite(STDERR, "Unbekannter Befehl. Erlaubt: render, check, setup-code\n");
        exit(2);
}
