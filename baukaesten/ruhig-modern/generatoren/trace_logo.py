"""Vektorisiert das Original-Logo (JPG auf Weiß) zu zwei schlanken SVGs.

Das Logo besteht aus zwei Farbschichten: Neongrün (Schriftzug-Füllung, Kontur
von „FAHRSCHULE") und Dunkelgrau (Kontur des Schriftzugs, Füllung von
„FAHRSCHULE"). Beide Schichten werden getrennt als Deckungsmasken berechnet,
2× hochskaliert, bei 50 % geschwellt und mit potrace nachgezeichnet:

  Schicht 1 „ink"   = Dunkelanteile, 1 px aufgeweitet   → unten
  Schicht 2 „green" = nur Grün                           → oben

Die dunkle Schicht entsteht nur aus echten Dunkelanteilen (nicht aus den
Grün-Kanten, sonst bekäme das Grün einen dunklen Außensaum) und wird um 1 px
unter das Grün geschoben – so entstehen keine Haarfugen. Die dunkel gefüllten
Wörter mit grüner Kontur – „FAHRSCHULE" (unterhalb von 78 % der Höhe) und
„Kiel" (rechts von 80 % der Breite) – bekommen eine eigene Schicht, damit sie
auf dunklem Grund hell gefüllt werden können. Varianten:
  logo.svg       – Originalfarben für helle Flächen
  logo-dark.svg  – für dunkle Flächen: grüner Schriftzug wie auf dem Original-
                   Flyer, Schriftzug-Kontur im Hintergrundton, „Kiel" und
                   „FAHRSCHULE" hell gefüllt mit grüner Kontur

  logo-icon.svg  – App-/Favicon: nur das „L" aus „Let's" (per Flood-Fill als
                   eigene Zusammenhangskomponente isoliert) auf dunklem Quadrat

Aufruf:  python3 trace_logo.py <logo.jpg> <ausgabe-ordner>
Benötigt: pip install potracer numpy pillow
"""
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageDraw

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
SCALE = 2          # Hochskalierung vor dem Schwellen → glattere Kurven
GREEN = "#00ff01"  # exakte Logo-Farbe (häufigster Grünwert im Original)
INK = "#2b2a28"    # exakte Logo-Dunkelfarbe
INK_ON_DARK = "#151414"    # Schriftzug-Kontur verschwindet im Hintergrund
WORD_ON_DARK = "#f6f5f1"   # Füllung von „Kiel"/„FAHRSCHULE" auf dunkel

im = Image.open(SRC).convert("RGB")
im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255.0
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# Dunkelanteil: Dunkel (max ≈ .17) → 1, Weiß und Grün (max ≈ 1) → 0
dark = np.clip((1.0 - a.max(axis=2)) / (1.0 - 0.17), 0, 1)
# Grünanteil: Grün → 1, Weiß/Dunkel → 0, Kanten anteilig
green = np.clip((g - np.maximum(r, b)) / 0.9, 0, 1)

green_bm = green > 0.5
dark_bm = dark > 0.5
# 1 px Aufweitung (4er-Nachbarschaft), damit Dunkel lückenlos unter Grün liegt
ink_bm = dark_bm.copy()
ink_bm[1:, :] |= dark_bm[:-1, :]; ink_bm[:-1, :] |= dark_bm[1:, :]
ink_bm[:, 1:] |= dark_bm[:, :-1]; ink_bm[:, :-1] |= dark_bm[:, 1:]

# Rand des JPGs kann Kompressionsrauschen tragen → 4 px Rand leeren
for m in (ink_bm, green_bm):
    m[:4, :] = m[-4:, :] = False
    m[:, :4] = m[:, -4:] = False

ys, xs = np.where(ink_bm | green_bm)
pad = 6 * SCALE
x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0)
x1, y1 = min(xs.max() + pad, ink_bm.shape[1]), min(ys.max() + pad, ink_bm.shape[0])


OUT_W = 2000                               # Ziel-viewBox-Breite (ganzzahlige Koordinaten)
K = OUT_W / (x1 - x0)


def trace(mask, is_word=None, origin=None, k=None):
    """Zeichnet eine Maske nach; liefert relative, ganzzahlige Pfaddaten.
    Konturen, für die is_word(links, oben) gilt, kommen getrennt zurück."""
    # potracer wertet True als Weiß (Hintergrund) → Maske invertiert übergeben
    plist = potrace.Bitmap(~mask).trace(
        turdsize=12 * SCALE, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=1.0, opticurve=True, opttolerance=0.25)
    ox, oy = origin or (x0, y0)
    kk = k or K
    q = lambda p: (round((p.x - ox) * kk), round((p.y - oy) * kk))
    parts, lower = [], []
    for curve in plist:
        cur = q(curve.start_point)
        d = ["M%d %d" % cur]

        def rel(*pts):
            # Deltas zwischen gerundeten Absolutwerten → keine Rundungsdrift
            out = []
            for p in pts:
                out += [p[0] - cur[0], p[1] - cur[1]]
            return " ".join(str(v) for v in out).replace(" -", "-")

        for seg in curve.segments:
            if seg.is_corner:
                c, e = q(seg.c), q(seg.end_point)
                d.append("l" + rel(c)); cur = c
                d.append("l" + rel(e)); cur = e
            else:
                c1, c2, e = q(seg.c1), q(seg.c2), q(seg.end_point)
                d.append("c" + rel(c1, c2, e)); cur = e
        pts = [curve.start_point] + [seg.end_point for seg in curve.segments]
        left, top = min(p.x for p in pts), min(p.y for p in pts)
        (lower if is_word and is_word(left, top) else parts).append("".join(d) + "z")
    return "".join(parts), "".join(lower)


split_y = y0 + (y1 - y0) * 0.78   # Oberkante „FAHRSCHULE"
kiel_x = x0 + (x1 - x0) * 0.80    # linke Kante „Kiel"
d_script, d_word = trace(ink_bm, lambda left, top: top > split_y or left > kiel_x)
d_green, _ = trace(green_bm)
w, h = OUT_W, (y1 - y0) * K


def svg(script_color, word_color):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="Let\'s Drive Kiel Fahrschule">'
            f'<path fill="{script_color}" fill-rule="evenodd" d="{d_script}"/>'
            f'<path fill="{word_color}" fill-rule="evenodd" d="{d_word}"/>'
            f'<path fill="{GREEN}" fill-rule="evenodd" d="{d_green}"/></svg>\n')


OUT.mkdir(parents=True, exist_ok=True)
(OUT / "logo.svg").write_text(svg(INK, INK))
(OUT / "logo-dark.svg").write_text(svg(INK_ON_DARK, WORD_ON_DARK))
# --- Icon: „L" isolieren -------------------------------------------------
# Startpunkt = erstes Grün-Pixel in der Spalte 4 % von links (liegt im L-Bogen)
col = int(ink_bm.shape[1] * 0.04)
seed_y = int(np.argmax(green_bm[:, col]))
# .copy(): fromarray teilt den (schreibgeschützten) numpy-Puffer, floodfill liefe ins Leere
comp_img = Image.fromarray(((ink_bm | green_bm) * 255).astype(np.uint8)).copy()
ImageDraw.floodfill(comp_img, (col, seed_y), 128)
comp = np.asarray(comp_img) == 128
cy, cx = np.where(comp)
side = max(cx.max() - cx.min(), cy.max() - cy.min()) * 1.24   # Luft rundum
ox = (cx.min() + cx.max()) / 2 - side / 2
oy = (cy.min() + cy.max()) / 2 - side / 2
ICON = 512
# Optische Größenanpassung: Strich für 16–32 px um je ICON_BOLD px verstärken
ICON_BOLD = 9 * SCALE
icon_green = green_bm & comp
for _ in range(ICON_BOLD):
    grown = icon_green.copy()
    grown[1:, :] |= icon_green[:-1, :]; grown[:-1, :] |= icon_green[1:, :]
    grown[:, 1:] |= icon_green[:, :-1]; grown[:, :-1] |= icon_green[:, 1:]
    icon_green = grown
d_icon_green, _ = trace(icon_green, origin=(ox, oy), k=ICON / side)
(OUT / "logo-icon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ICON} {ICON}">'
    f'<rect width="{ICON}" height="{ICON}" rx="{ICON * 0.22:.0f}" fill="{INK_ON_DARK}"/>'
    f'<path fill="{GREEN}" fill-rule="evenodd" d="{d_icon_green}"/></svg>\n')

print(f"viewBox {w:.0f}×{h:.0f}, Seitenverhältnis {w / h:.3f}")
for n in ("logo.svg", "logo-dark.svg", "logo-icon.svg"):
    print(n, (OUT / n).stat().st_size, "Bytes")
