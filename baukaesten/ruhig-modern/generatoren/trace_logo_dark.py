"""Vektorisiert ein Logo auf DUNKLEM Grund (PNG/JPG) zu schlanken SVGs.

Gegenstück zu trace_logo.py (Logos auf Weiß). Erwartet drei Farbebenen auf
Schwarz – so wie das Let's-Drive-Logo 2026:

  green   = Akzentfarbe (Auto, „FAHRSCHULE", Zierlinien)
  outline = weiße Kontur um den Schriftzug
  letters = Fläche innerhalb der weißen Kontur (Buchstabenkörper, auf Schwarz schwarz)

Jede Ebene wird als Deckungsmaske berechnet, 2× hochskaliert, bei 50 %
geschwellt und mit potrace nachgezeichnet. Gestapelt wird letters → outline →
green, damit keine Haarfugen entstehen. Varianten:

  logo-dark.svg  – wie das Original: Buchstaben im Seitenton (#151414), weiße
                   Kontur, grünes Auto – für Hero und Footer
  logo.svg       – für helle Flächen: Buchstaben vollflächig im Seitenton
                   (die weiße Kontur wäre auf Hell unsichtbar), grüne Teile
                   mit feiner dunkler Kontur (Neongrün allein ist auf Hell blass)
  logo-icon.svg  – App-/Favicon: nur das Auto, Strich optisch verstärkt,
                   auf dunklem Quadrat

Aufruf:  python3 trace_logo_dark.py <logo.png> <ausgabe-ordner>
Benötigt: pip install potracer numpy pillow scipy
"""
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image
from scipy import ndimage

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
SCALE = 2                 # Hochskalierung vor dem Schwellen → glattere Kurven
OUT_W = 2000              # viewBox-Breite (ganzzahlige Koordinaten)
INK = "#151414"           # Seitenton der Website (Buchstabenkörper)
WHITE = "#ffffff"

im = Image.open(SRC).convert("RGB")
im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255.0
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# Akzentfarbe = häufigster deutlich grüner Pixel (z. B. #0afb33)
gmask = (g - np.maximum(r, b)) > 0.5
vals, counts = np.unique((a[gmask] * 255).round().astype(np.uint8).reshape(-1, 3), axis=0, return_counts=True)
GREEN = "#%02x%02x%02x" % tuple(vals[counts.argmax()])
g_span = (vals[counts.argmax()][1] - max(vals[counts.argmax()][0], vals[counts.argmax()][2])) / 255.0

green_bm = np.clip((g - np.maximum(r, b)) / g_span, 0, 1) > 0.5
white_bm = a.min(axis=2) > 0.5                                  # Weiß: alle Kanäle hell


def letter_bodies(white):
    """Buchstabenkörper = dunkle Flächen, die eine UNGERADE Zahl weißer Konturen
    von der Bildkante trennt (Strahl-Paritätsregel, wie beim Füllen von Pfaden):
    Körper → 1 Kontur, Punze im „e" → 2 (Innen- + Außenkontur), Hintergrund → 0.
    Gezählt wird senkrecht nach oben und unten (die Buchstaben stehen neben-
    einander, deren verschmolzene Konturen würden waagerechte Strahlen stören);
    je Fläche entscheidet die Mehrheit über bis zu 40 Stichproben."""
    dark_lab, n = ndimage.label(~white)
    bg = dark_lab[0, 0]
    rng = np.random.default_rng(0)
    # Anzahl weißer Läufe oberhalb bzw. unterhalb jedes Pixels (spaltenweise)
    starts = white & ~np.vstack([np.zeros((1, white.shape[1]), bool), white[:-1]])
    above = np.cumsum(starts, axis=0) - starts        # Läufe, die oberhalb begonnen haben
    total = starts.sum(axis=0)
    below = total[None, :] - np.cumsum(starts, axis=0)
    body = []
    for lab, sl in enumerate(ndimage.find_objects(dark_lab), start=1):
        if lab == bg or sl is None:
            continue
        ys, xs = np.nonzero(dark_lab[sl] == lab)
        pick = rng.choice(len(ys), size=min(40, len(ys)), replace=False)
        ys, xs = ys[pick] + sl[0].start, xs[pick] + sl[1].start
        votes = (above[ys, xs] % 2 == 1).sum() + (below[ys, xs] % 2 == 1).sum()
        if votes > len(ys):                            # Mehrheit von 2·n Strahlen
            body.append(lab)
    return np.isin(dark_lab, body)


letters_bm = (letter_bodies(white_bm) | white_bm) & ~green_bm  # Körper + Kontur, ohne Punzen

# Rand leeren (Kompressionsrauschen)
for m in (green_bm, white_bm, letters_bm):
    m[:4, :] = m[-4:, :] = False
    m[:, :4] = m[:, -4:] = False

ys, xs = np.where(green_bm | letters_bm)
pad = 10 * SCALE
x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0)
x1, y1 = min(xs.max() + pad, green_bm.shape[1]), min(ys.max() + pad, green_bm.shape[0])
K = OUT_W / (x1 - x0)


def trace(mask, origin=None, k=None):
    """Zeichnet eine Maske nach; liefert relative, ganzzahlige Pfaddaten."""
    ox, oy = origin or (x0, y0)
    kk = k or K
    # potracer wertet True als Weiß (Hintergrund) → Maske invertiert übergeben
    plist = potrace.Bitmap(~mask).trace(
        turdsize=8 * SCALE, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=1.0, opticurve=True, opttolerance=0.25)
    q = lambda p: (round((p.x - ox) * kk), round((p.y - oy) * kk))
    parts = []
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
        parts.append("".join(d) + "z")
    return "".join(parts)


d_letters, d_outline, d_green = trace(letters_bm), trace(white_bm), trace(green_bm)
# Helle Variante: Neongrün auf Hell ist kaum lesbar → feine dunkle Kontur um alle
# grünen Teile (Farbe bleibt exakt, wie beim bisherigen Logo „Neon mit Kontur")
LIGHT_CONTOUR = 3 * SCALE
d_halo = trace(ndimage.binary_dilation(green_bm, iterations=LIGHT_CONTOUR))
w, h = OUT_W, round((y1 - y0) * K)
LABEL = "Let's Drive Kiel – Fahrschule"


def svg(layers):
    paths = "".join(f'<path fill="{c}" fill-rule="evenodd" d="{d}"/>' for c, d in layers)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-label="{LABEL}">{paths}</svg>\n')


OUT.mkdir(parents=True, exist_ok=True)
(OUT / "logo-dark.svg").write_text(svg([(INK, d_letters), (WHITE, d_outline), (GREEN, d_green)]))
(OUT / "logo.svg").write_text(svg([(INK, d_letters), (INK, d_halo), (GREEN, d_green)]))

# --- Icon: nur das Auto (grüne Teile oberhalb des Schriftzugs) -------------
text_top = np.where(white_bm.any(axis=1))[0].min()
car = green_bm.copy()
car[text_top:, :] = False
ICON_BOLD = 8 * SCALE                       # Strich für 16–32 px verstärken
car = ndimage.binary_dilation(car, iterations=ICON_BOLD)
cy, cx = np.where(car)
side = (cx.max() - cx.min()) * 1.08         # Auto füllt die Breite, wenig Luft
ox = (cx.min() + cx.max()) / 2 - side / 2
oy = (cy.min() + cy.max()) / 2 - side / 2
ICON = 512
d_icon = trace(car, origin=(ox, oy), k=ICON / side)
(OUT / "logo-icon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ICON} {ICON}">'
    f'<rect width="{ICON}" height="{ICON}" rx="{ICON * 0.22:.0f}" fill="{INK}"/>'
    f'<path fill="{GREEN}" fill-rule="evenodd" d="{d_icon}"/></svg>\n')

print(f"Akzentfarbe {GREEN} · viewBox {w}×{h} (Seitenverhältnis {w / h:.3f})")
for n in ("logo.svg", "logo-dark.svg", "logo-icon.svg"):
    print(n, (OUT / n).stat().st_size, "Bytes")
