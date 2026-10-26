# -*- coding: utf-8 -*-
"""Steuerformeln für das Rechenbeispiel im Merkblatt (Veranlagungszeitraum 2026).

Jeder Wert steht mit seiner Rechtsgrundlage hier. Wenn sich Werte ändern
(jährlich prüfen!), nur hier anpassen und das Merkblatt neu bauen.
Vereinfachungen des Beispiels: ledig, keine Kirchensteuer, keine weiteren
Einkünfte, zu versteuerndes Einkommen = Gewinn minus pauschal angesetzte
Sonderausgaben (Vorsorgeaufwendungen einschließlich Pauschbetrag).
"""
import math

# § 32a Abs. 1 EStG, Fassung für 2026
EST_2026 = dict(gfb=12348, z2=17799, z3=69878, z4=277825,
                a2=914.51, b2=1400, a3=173.10, b3=2397, c3=1034.87,
                m4=0.42, s4=11135.63, m5=0.45, s5=19470.38)

# § 3 Abs. 3 SolZG, Freigrenze 2026 bei Einzelveranlagung, § 4 SolZG Satz und Milderung
SOLI_FREIGRENZE_2026 = 20350
SOLI_SATZ = 0.055
SOLI_MILDERUNG = 0.119

# § 11 GewStG
GEWST_MESSZAHL = 0.035
GEWST_FREIBETRAG_NAT = 24500  # natürliche Personen und Personengesellschaften
# § 35 Abs. 1 EStG
ANRECHNUNG_FAKTOR = 4.0
# § 23 Abs. 1 KStG
KST_SATZ = 0.15

# Hebesatz der Beispielgemeinde (wird aus der Recherche gesetzt)
HEBESATZ = None
GEMEINDE = None


def est(zve, p=EST_2026):
    """Tarifliche Einkommensteuer nach § 32a Abs. 1 EStG (Grundtarif)."""
    x = math.floor(zve)
    if x <= p["gfb"]:
        t = 0.0
    elif x <= p["z2"]:
        y = (x - p["gfb"]) / 10000
        t = (p["a2"] * y + p["b2"]) * y
    elif x <= p["z3"]:
        z = (x - p["z2"]) / 10000
        t = (p["a3"] * z + p["b3"]) * z + p["c3"]
    elif x <= p["z4"]:
        t = p["m4"] * x - p["s4"]
    else:
        t = p["m5"] * x - p["s5"]
    return math.floor(t)  # auf volle Euro abrunden


def soli_est(est_betrag):
    """Solidaritätszuschlag auf die Einkommensteuer mit Freigrenze und Milderungszone."""
    if est_betrag <= SOLI_FREIGRENZE_2026:
        return 0.0
    voll = est_betrag * SOLI_SATZ
    mild = (est_betrag - SOLI_FREIGRENZE_2026) * SOLI_MILDERUNG
    return math.floor(min(voll, mild) * 100) / 100  # Bruchteile eines Cents bleiben außer Ansatz (§ 4 Satz 3 SolZG)


def gewst_messbetrag(gewinn, natuerlich=True):
    """Gewerbesteuermessbetrag: Ertrag auf volle 100 Euro abrunden, Freibetrag abziehen."""
    ertrag = math.floor(max(gewinn, 0) / 100) * 100
    if natuerlich:
        ertrag = max(ertrag - GEWST_FREIBETRAG_NAT, 0)
    return ertrag * GEWST_MESSZAHL


def einzelunternehmen(gewinn, sonderausgaben, hebesatz):
    """Steuern eines gewerblichen Einzelunternehmens (nur gewerbliche Einkünfte)."""
    mb = gewst_messbetrag(gewinn, natuerlich=True)
    gewst = mb * hebesatz / 100
    zve = max(gewinn - sonderausgaben, 0)
    est_tarif = est(zve)
    # § 35: 4,0 × Messbetrag, höchstens die tatsächliche Gewerbesteuer und die tarifliche ESt
    erm = min(ANRECHNUNG_FAKTOR * mb, gewst, est_tarif)
    est_fest = est_tarif - erm
    soli = soli_est(est_fest)
    return dict(gewinn=gewinn, zve=zve, est_tarif=est_tarif, erm35=erm, est=est_fest,
                soli=soli, gewst=gewst, summe=est_fest + soli + gewst)


def gmbh(gewinn, hebesatz):
    """Steuern einer GmbH auf den Gewinn (ohne Ausschüttung)."""
    kst = max(gewinn, 0) * KST_SATZ
    soli = kst * SOLI_SATZ
    gewst = gewst_messbetrag(gewinn, natuerlich=False) * hebesatz / 100
    return dict(gewinn=gewinn, kst=kst, soli=soli, gewst=gewst, summe=kst + soli + gewst)
