DIE DREI – Marken-Assets
========================

Wortmarke „DIE DREI“ (zweizeilig). Seitenverhältnis überall 500 : 348 = 1,437 : 1
(Breite = Höhe × 1,437; z. B. 64 px hoch → 92 px breit, 48 px → 69 px, 128 px → 184 px).
Die Original-PNGs hatten keinen transparenten Rand (Logo füllt die Fläche randlos), Trimmen war nicht nötig.
Für Luft um das Logo sorgt das Layout (Padding), nicht die Datei.

Vektor (empfohlen, aus dem Original-PNG nachgezeichnet und bei 4-facher Vergrößerung gegen das PNG geprüft):
  logo-white.svg   weiß  #FFFFFF   – Hero/Footer/dunkle Flächen
  logo-berry.svg   Beere #5B0041   – Header nach Scroll, helle Flächen
  logo-black.svg   schwarz #000000
  viewBox 0 0 500 348, width/height 500×348 (per CSS skalieren: height:…; width:auto),
  enthält <title>DIE DREI</title> + role="img" + aria-label.

PNG-Fallbacks (direkt aus dem Original-Raster, Alpha erhalten):
  logo-white.png / logo-berry.png / logo-black.png           184 × 128 px (2× für bis zu 64 px Anzeigehöhe)
  logo-white-lg.png / logo-berry-lg.png / logo-black-lg.png  500 × 348 px (Originalgröße, z. B. Footer)

Favicons (aus dd-favicon.png: schwarzes Quadrat, weiße Wortmarke):
  favicon.svg            512er-Raster, gleiche Geometrie wie das PNG-Favicon
  favicon-32.png         32 × 32
  favicon.ico            16/32/48
  apple-touch-icon.png   180 × 180
  Einbindung z. B.:
    <link rel="icon" href="assets/brand/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="assets/brand/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">
  (favicon.ico zusätzlich für /favicon.ico im Root, falls gewünscht.)

Open Graph:
  og.jpg   1200 × 630, Gastraum (Foto 21-DSC09822 / raum-panorama) mit dunkel-beerigem Verlauf links,
           weißes Logo + „WEINBAR · KIEL“.
