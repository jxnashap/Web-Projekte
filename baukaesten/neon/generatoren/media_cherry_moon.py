#!/usr/bin/env python3
"""Cherry Moon: Medien aus .preview-cache/cherry-moon (Asset-Bridge) für die Website aufbereiten.

Bilder: WebP in zwei Breiten (groß und klein für srcset).
Videos: Ausschnitte aus den eigenen TikToks von Cherry Moon, so beschnitten, dass die
eingebrannten Texte der Clips außerhalb des Bildes liegen. H.264, stumm, für Autoplay.

Aufruf: python3 baukaesten/neon/generatoren/media_cherry_moon.py [--nur-bilder|--nur-videos]
Braucht Pillow und ffmpeg. Ausgabe: webseiten/cherry-moon/public/media/
"""
import os
import subprocess
import sys

from PIL import Image

ROOT = "/home/user/Web-Projekte"
SRC = f"{ROOT}/.preview-cache/cherry-moon"
OUT = f"{ROOT}/webseiten/cherry-moon/public/media"
os.makedirs(OUT, exist_ok=True)

# Name im Projekt: (Quelldatei, Breiten, Qualität)
BILDER = {
    # Stimmung und Galerie (Original 2400 x 1600)
    **{f"club-{i:02d}": (f"orig/img/start/hero-{i:02d}.webp", (1600, 800), 74) for i in range(1, 10)},
    "club-golden-cut": ("orig/img/start/hero-golden-cut.webp", (1600, 800), 74),
    "mood-coda": ("orig/img/start/mood-coda.webp", (1400, 700), 76),
    "mood-edelfettwerk": ("orig/img/start/mood-edelfettwerk.webp", (1400, 700), 76),
    "mood-leos-cafe": ("orig/img/start/mood-leos-cafe.webp", (1000, 500), 76),
    # Rückblick (meist Hochformat)
    **{f"rb-{n}": (f"orig/img/rueckblick/{n}.webp", (900, 450), 76) for n in
       "alsterinsel bayside ciu coda edelfettwerk gaga golden-cut leos-cafe radisson seehaus tv-turm".split()},
    # Event-Motive
    "ev-silvester": ("orig/events/silvester.png", (1080, 540), 78),
    # Tischpläne (Hochformat 1080 x 1920, Schrift muss lesbar bleiben)
    **{f"plan-{n}": (f"orig/img/tischplaene/{n}.webp", (1080, 540), 82) for n in "alsterinsel-2026 coda sands-lageplan".split()},
}

# Videos: Quelle, Start, Dauer, Ausschnitt (x, y, b, h als Anteil des Originals), Zielgröße, CRF
CLIPS = {
    # Hero Desktop 16:9: Montage aus Rooftop Scharbeutz, Turm Dammtor, Strand Scharbeutz, Edelfettwerk
    "hero-desk": [
        ("7391923636963167521", 8.6, 3.2, (0, .27, 1, .3164)),
        ("7470862881106562326", 2.2, 3.0, (0, .23, 1, .3164)),
        ("7659849751097003296", 0.4, 2.8, (0, .40, 1, .3164)),
        ("7534682810938821910", 0.5, 3.0, (0, .34, 1, .3164)),
    ],
    # Hero Mobil: Rooftop Scharbeutz im Hochformat, Text oben abgeschnitten
    "hero-mob": [("7391923636963167521", 5.6, 8.0, (0, .22, 1, .78))],
    # Stadt und Strand (4:5)
    "stadt": [("7690666915592752417", 0.3, 9.0, (0, .30, 1, .70))],
    "strand": [("7659849751097003296", 0.0, 7.8, (0, .30, 1, .70))],
}
GROESSE = {"hero-desk": (1280, 720, 25), "hero-mob": (720, 1000, 27), "stadt": (560, 700, 28), "strand": (560, 700, 28)}


def bilder():
    for name, (src, widths, q) in BILDER.items():
        im = Image.open(f"{SRC}/{src}").convert("RGB")
        for i, w in enumerate(widths):
            w = min(w, im.width)
            h = round(im.height * w / im.width)
            out = f"{OUT}/{name}{'' if i == 0 else '-s'}.webp"
            im.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=q, method=6)
        print(f"{name:22s} {im.width}x{im.height} → {widths}")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:])
        raise SystemExit(1)


def videos():
    tmp = f"{OUT}/_tmp"
    os.makedirs(tmp, exist_ok=True)
    for name, segs in CLIPS.items():
        W, H, crf = GROESSE[name]
        parts = []
        for k, (vid, start, dur, (x, y, bw, bh)) in enumerate(segs):
            part = f"{tmp}/{name}-{k}.mp4"
            # Rot betonen und Schwarz satt halten, damit die Clips zur Neon-Farbwelt passen
            vf = (f"crop=iw*{bw}:ih*{bh}:iw*{x}:ih*{y},scale={W}:{H}:force_original_aspect_ratio=increase,"
                  f"crop={W}:{H},eq=contrast=1.08:saturation=1.12:brightness=-0.03,fps=30,format=yuv420p")
            run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(dur), "-i", f"{SRC}/tiktok/{vid}.mp4",
                 "-an", "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "18", part])
            parts.append((part, dur))
        out = f"{OUT}/{name}.mp4"
        if len(parts) == 1:
            src = parts[0][0]
            # Weiche Schleife: Anfang und Ende kurz abblenden
            d = parts[0][1]
            run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"fade=t=in:st=0:d=0.4,fade=t=out:st={d - 0.5}:d=0.5",
                 "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-movflags", "+faststart", "-pix_fmt", "yuv420p", out])
        else:
            # Montage mit Überblendungen
            inputs, filt, last, off = [], [], "[0:v]", 0.0
            for p, _ in parts:
                inputs += ["-i", p]
            for k in range(1, len(parts)):
                off += parts[k - 1][1] - 0.5
                filt.append(f"{last}[{k}:v]xfade=transition=fade:duration=0.5:offset={off:.2f}[v{k}]")
                last = f"[v{k}]"
            total = sum(d for _, d in parts) - 0.5 * (len(parts) - 1)
            filt.append(f"{last}fade=t=in:st=0:d=0.4,fade=t=out:st={total - 0.5:.2f}:d=0.5[out]")
            run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]",
                 "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-movflags", "+faststart", "-pix_fmt", "yuv420p", out])
        # Standbild aus der Mitte des ersten Abschnitts als Poster
        mid = parts[0][1] * 0.55
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{mid:.2f}", "-i", out, "-frames:v", "1", f"{tmp}/{name}.png"])
        Image.open(f"{tmp}/{name}.png").convert("RGB").save(f"{OUT}/{name}-poster.webp", "WEBP", quality=70, method=6)
        print(f"{name:10s} {os.path.getsize(out) // 1024} KB")
    for f in os.listdir(tmp):
        os.remove(f"{tmp}/{f}")
    os.rmdir(tmp)


if __name__ == "__main__":
    if "--nur-videos" not in sys.argv:
        bilder()
    if "--nur-bilder" not in sys.argv:
        videos()
