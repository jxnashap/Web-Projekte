#!/usr/bin/env python3
"""Zerlegt zusammengesetzte Glyphen (z. B. "ä" = "a" + Punkte, "·" = ".") in eigene Umrisse.

Warum: fontkit merkt sich jede Glyphe beim ersten Abruf. Beim Einbetten holt pdfkit die Bausteine
zusammengesetzter Glyphen nur über ihre Nummer, also ohne Zeichen. Kam z. B. "·" in einem PDF vor,
bevor im selben Serverprozess ein "." gesetzt wurde, hatte der Punkt danach in allen weiteren PDFs
keine Zeichenzuordnung mehr: Zeilen brachen mitten im Wort um und Punkte fehlten beim Kopieren.
Ohne zusammengesetzte Glyphen gibt es diesen Weg nicht mehr.

Aufruf (braucht fontTools): python3 scripts/fonts-zerlegen.py assets/fonts/CourierPrime-*.ttf
Mehrfaches Ausführen ist unschädlich.
"""
import sys

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


def zerlegen(path: str) -> int:
    font = TTFont(path)
    glyf = font["glyf"]
    glyph_set = font.getGlyphSet()
    names = [n for n in font.getGlyphOrder() if glyf[n].isComposite()]
    # erst alle Umrisse aufnehmen, dann ersetzen, damit verschachtelte Bausteine noch lesbar sind
    recorded = {}
    for name in names:
        pen = DecomposingRecordingPen(glyph_set)
        glyph_set[name].draw(pen)
        recorded[name] = pen
    for name, rec in recorded.items():
        out = TTGlyphPen(None)
        rec.replay(out)
        glyf[name] = out.glyph()
    if names:
        font.save(path)
    return len(names)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        print(f"{p}: {zerlegen(p)} zusammengesetzte Glyphen zerlegt")
