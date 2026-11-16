<?php
/* Vorschau: zeigt eine Seite der Website mit dem ENTWURF – ohne etwas zu veröffentlichen. */
declare(strict_types=1);
require __DIR__ . '/inc/cms.php';

cms_session_start();
if (!cms_logged_in()) { header('Location: ./', true, 303); exit; }
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$pages = array_map('basename', cms_pages());
$seite = basename((string)($_GET['seite'] ?? 'index.html'));
if (!in_array($seite, $pages, true) || $seite === '404.html') $seite = 'index.html';

$html = cms_apply((string)file_get_contents(CMS_SITE . '/' . $seite), cms_draft());

$names = ['index.html' => 'Start', 'fahrerlaubnisklassen.html' => 'Klassen', 'theorieunterricht.html' => 'Theorie',
    'jobs.html' => 'Jobs', 'kontakt.html' => 'Kontakt'];
$links = '';
foreach ($names as $f => $n) {
    if (!in_array($f, $pages, true)) continue;
    $links .= '<a href="redaktion/vorschau.php?seite=' . $f . '"' . ($f === $seite ? ' aria-current="page"' : '') . '>' . $n . '</a>';
}
$bar = '<div class="cms-vorschau" role="status"><strong>Vorschau</strong><span>noch nicht veröffentlicht</span>'
    . '<nav>' . $links . '</nav><a class="cms-zurueck" href="redaktion/">Zurück zur Redaktion</a></div>'
    . '<link rel="stylesheet" href="redaktion/redaktion-vorschau.css">';

// Relative Pfade der Seite (css/, assets/ …) zeigen aus /redaktion/ eine Ebene höher
$html = preg_replace('/<head>/', '<head><base href="../">', $html, 1);
$html = preg_replace('/(<body[^>]*>)/', '$1' . $bar, $html, 1);
echo $html;
