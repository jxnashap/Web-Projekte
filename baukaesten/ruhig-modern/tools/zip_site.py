#!/usr/bin/env python3
"""Packt eine Website für den Upload (z. B. IONOS Webspace Explorer → „Entpacken").

Aufruf:  python3 zip_site.py <site-ordner> <ziel.zip>

Ausgelassen werden Arbeitsdateien (_*.html) und die LAUFZEITDATEN der Redaktion
(Inhalte, Entwurf, Zugang, Sperren, Versionen) – sonst würde ein erneuter Upload
die Pflege des Kunden und sein Passwort überschreiben.
"""
import os
import sys
import zipfile
from pathlib import Path

site, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
SKIP_DATA = {"inhalte.json", "entwurf.json", "zugang.json", "sperre.json", ".gitignore"}

tmp = out.with_suffix(".zip.tmp")
n = 0
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, dirs, files in os.walk(site):
        rel_root = Path(root).relative_to(site)
        dirs[:] = sorted(d for d in dirs if not (rel_root == Path("redaktion/daten") and d == "versionen"))
        for f in sorted(files):
            rel = rel_root / f
            if f.startswith("_") or f.endswith(".tmp"):
                continue
            if rel.parent == Path("redaktion/daten") and f in SKIP_DATA:
                continue
            z.write(Path(root) / f, Path(site.name) / rel)
            n += 1
os.replace(tmp, out)
print(f"{out.name}: {n} Dateien, {out.stat().st_size / 1e6:.2f} MB")
