"""Erzeugt die Kopfbilder der Technikseiten (energiewende/): Strichzeichnung auf einem
„Boden" aus Ausbaustreifen – je Jahr ein Streifen, oben Deutschland, unten China,
Farbe = installierte Leistung im Verhältnis zum letzten Jahr der Reihe.

Eingabe (daten/data/):
  de_installed_yearly.csv     – Energy-Charts (Fraunhofer ISE), Ist-Werte
  cn_capacity_yearly.csv      – Nationales Statistikamt Chinas (NBS)
  de_waermepumpen_absatz.csv  – Bundesverband Wärmepumpe, Absatz je Jahr (für China gibt es keine
                                vergleichbare amtliche Jahresreihe, daher nur ein Streifen)

Ausgabe (daten/data/, eingebunden per {{< include >}}):
  _kopf_wind.md, _kopf_photovoltaik.md, _kopf_waermepumpen.md

Wird von scripts/build.sh vor dem Rendern aufgerufen. Nur Standardbibliothek.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "daten" / "data"
START = 2015
DE_FARBE, CN_FARBE = "#b8860b", "#b0412e"


def lade_reihen() -> dict[str, dict[str, dict[int, float]]]:
    de: dict[str, dict[int, float]] = {"wind": {}, "pv": {}}
    with open(DATA / "de_installed_yearly.csv", encoding="utf-8") as f:
        for z in csv.DictReader(f):
            if z["art"] != "Ist":
                continue
            j, gw = int(z["jahr"]), float(z["gw"])
            if z["reihe"].startswith("Wind"):
                de["wind"][j] = de["wind"].get(j, 0.0) + gw
            elif z["reihe"] == "Photovoltaik":
                de["pv"][j] = gw
    cn: dict[str, dict[int, float]] = {"wind": {}, "pv": {}}
    with open(DATA / "cn_capacity_yearly.csv", encoding="utf-8") as f:
        for z in csv.DictReader(f):
            schluessel = "wind" if z["reihe"] == "Wind" else "pv"
            cn[schluessel][int(z["jahr"])] = float(z["gw"])
    return {"de": de, "cn": cn}


def zahl(gw: float) -> str:
    return f"{gw:,.0f}".replace(",", ".")


def turbine(x: float, boden: float, h: float, winkel: float) -> str:
    nabe_y = boden - h
    laenge = h * 0.42
    s = (f'<path d="M{x - h * .025:.1f} {boden}L{x - h * .012:.1f} {nabe_y:.1f}'
         f'M{x + h * .025:.1f} {boden}L{x + h * .012:.1f} {nabe_y:.1f}"/>')
    for k in range(3):
        a = math.radians(winkel + 120 * k)
        ex, ey = x + laenge * math.sin(a), nabe_y - laenge * math.cos(a)
        px, py = x + laenge * .18 * math.sin(a + .5), nabe_y - laenge * .18 * math.cos(a + .5)
        s += f'<path d="M{x:.1f} {nabe_y:.1f}Q{px:.1f} {py:.1f} {ex:.1f} {ey:.1f}"/>'
    return s + f'<circle cx="{x:.1f}" cy="{nabe_y:.1f}" r="{h * .02 + 1:.1f}"/>'


# Zeichnungen im Format 900 × 300 (beim Einbinden um 0,9 verkleinert); darunter (y 262–298)
# liegen die beiden Ausbaustreifen als „Boden“.
def zeichnung_wind() -> str:
    s = '<path d="M0 262C150 250 260 238 420 244S700 260 900 236"/>'
    s += '<path d="M380 280C520 276 640 268 900 262" opacity=".5"/>'
    for x, h, w in [(420, 95, 10), (520, 130, 50), (620, 165, 95), (730, 185, 30), (830, 140, 75)]:
        s += turbine(x, 258 if x < 620 else 250, h, w)
    for x, h, w in [(860, 70, 20), (890, 55, 80)]:
        s += turbine(x, 268, h, w)
    for y in (276, 286):
        s += f'<path d="M640 {y}' + "q15 -5 30 0" + "t30 0" * 8 + '" opacity=".55"/>'
    return s


def zeichnung_pv() -> str:
    cx, cy, r = 760, 70, 34
    s = f'<circle cx="{cx}" cy="{cy}" r="{r}"/>'
    for k in range(12):
        a = math.radians(k * 30)
        s += (f'<path d="M{cx + (r + 10) * math.cos(a):.1f} {cy + (r + 10) * math.sin(a):.1f}'
              f'L{cx + (r + 22) * math.cos(a):.1f} {cy + (r + 22) * math.sin(a):.1f}"/>')
    s += '<path d="M0 270H900"/>'
    for y, w, hoehe, n, x0 in [(258, 62, 22, 8, 360), (232, 74, 26, 7, 330), (202, 90, 32, 6, 300)]:
        for i in range(n):
            x = x0 + i * (w + 10)
            if x + w > 905:
                break
            s += (f'<path d="M{x} {y}L{x + w} {y}L{x + w + hoehe * .5:.1f} {y - hoehe}'
                  f'L{x + hoehe * .5:.1f} {y - hoehe}Z"/>')
            s += (f'<path d="M{x + w / 2:.1f} {y}L{x + w / 2 + hoehe * .5:.1f} {y - hoehe}'
                  f'M{x + hoehe * .25:.1f} {y - hoehe / 2:.1f}L{x + w + hoehe * .25:.1f} {y - hoehe / 2:.1f}" opacity=".6"/>')
            s += f'<path d="M{x + w * .3:.1f} {y}V{y + 8}M{x + w * .7:.1f} {y}V{y + 8}" opacity=".6"/>'
    return s


def zeichnung_wp() -> str:
    s = '<path d="M0 262H900"/>'
    # kleines Haus links
    s += '<path d="M420 262V200L470 162L520 200V262M455 262V232H485V262"/>'
    # großes Haus mit Heizkörper
    s += '<path d="M560 262V176L660 106L760 176V262"/><path d="M540 190L660 104L780 190"/>'
    s += '<path d="M590 200h40v30h-40zM610 200v30M590 215h40" opacity=".7"/>'
    s += '<path d="M690 262V214H730V262"/>'
    s += '<path d="M655 236v18M663 236v18M671 236v18M679 236v18M651 236h32M651 254h32" opacity=".7"/>'
    # Außeneinheit mit Ventilator
    s += '<rect x="790" y="206" width="80" height="52" rx="3"/><circle cx="822" cy="232" r="17"/>'
    s += '<path d="M822 232l9-12M822 232l-14 3M822 232l6 14" opacity=".8"/><path d="M852 216v32" opacity=".6"/>'
    # Leitung ins Haus und Wärmewellen
    s += '<path d="M790 244H760" /><path d="M790 250H760" opacity=".6"/>'
    for x in (612, 640, 668):
        s += f'<path d="M{x} 96c-6-8 6-14 0-22s6-14 0-22" opacity=".55"/>'
    # Luftstrom an der Außeneinheit
    for y in (214, 232, 250):
        s += f'<path d="M884 {y}c6-4 10 4 16 0" opacity=".5"/>'
    return s


def streifen(de: dict[int, float], cn: dict[int, float], technik: str) -> tuple[str, int]:
    jahre = [j for j in sorted(cn) if j >= START and j in de]
    x0, x1, y0, h = 300.0, 900.0, 262, 17
    w = (x1 - x0) / len(jahre)
    s = ""
    for reihe, land, farbe, y in ((de, "Deutschland", DE_FARBE, y0), (cn, "China", CN_FARBE, y0 + h + 2)):
        hoechst = reihe[jahre[-1]]
        for i, j in enumerate(jahre):
            deckkraft = .12 + .88 * reihe[j] / hoechst
            s += (f'<rect x="{x0 + i * w:.1f}" y="{y}" width="{w + .4:.1f}" height="{h}" fill="{farbe}" '
                  f'opacity="{deckkraft:.2f}"><title>{land} {j}: {zahl(reihe[j])} GW {technik}</title></rect>')
    return s, jahre[-1]


def streifen_einzeln(reihe: dict[int, float], einheit: str) -> tuple[str, int, int]:
    jahre = [j for j in sorted(reihe) if j >= START]
    x0, x1, y0, h = 300.0, 900.0, 262, 36
    w = (x1 - x0) / len(jahre)
    hoechst = max(reihe[j] for j in jahre)
    s = ""
    for i, j in enumerate(jahre):
        deckkraft = .12 + .88 * reihe[j] / hoechst
        s += (f'<rect x="{x0 + i * w:.1f}" y="{y0}" width="{w + .4:.1f}" height="{h}" fill="{DE_FARBE}" '
              f'opacity="{deckkraft:.2f}"><title>Deutschland {j}: {zahl(reihe[j])} {einheit}</title></rect>')
    return s, jahre[-1], max(jahre, key=lambda j: reihe[j])


def baustein(zeichnung: str, de: dict[int, float], cn: dict[int, float], technik: str, leistung: str) -> str:
    rechtecke, bis = streifen(de, cn, technik)
    unterschrift = (f"Streifen: installierte {leistung} {START}–{bis} · oben Deutschland, unten China"
                    f" · je dunkler, desto näher am Stand {bis}")
    return karte(zeichnung, rechtecke, unterschrift)


def karte(zeichnung: str, rechtecke: str, unterschrift: str) -> str:
    return ("<!-- Erzeugt von scripts/technik_kopf.py – nicht von Hand bearbeiten -->\n"
            "```{=html}\n"
            f'<div class="tk-deko"><svg viewBox="0 0 900 300" preserveAspectRatio="xMaxYMax meet" '
            f'role="img" aria-label="{unterschrift}">'
            f'<g class="tk-linie" transform="translate(90 2) scale(.9)">{zeichnung}</g>'
            f'{rechtecke}</svg></div><div class="tk-quelle">{unterschrift}</div>\n```\n')


def lade_wp_absatz() -> dict[int, float]:
    with open(DATA / "de_waermepumpen_absatz.csv", encoding="utf-8") as f:
        return {int(z["jahr"]): float(z["stueck"]) for z in csv.DictReader(f)}


def main() -> None:
    r = lade_reihen()
    wp = lade_wp_absatz()
    rechtecke, bis, rekord = streifen_einzeln(wp, "Heizungs-Wärmepumpen verkauft")
    (DATA / "_kopf_waermepumpen.md").write_text(karte(
        zeichnung_wp(), rechtecke,
        f"Streifen: Absatz von Heizungs-Wärmepumpen in Deutschland {START}–{bis} · je dunkler, desto mehr; "
        f"Höchstwert {rekord}"), encoding="utf-8")
    (DATA / "_kopf_wind.md").write_text(
        baustein(zeichnung_wind(), r["de"]["wind"], r["cn"]["wind"], "Windenergie", "Windleistung"), encoding="utf-8")
    (DATA / "_kopf_photovoltaik.md").write_text(
        baustein(zeichnung_pv(), r["de"]["pv"], r["cn"]["pv"], "Photovoltaik", "Photovoltaik-Leistung"), encoding="utf-8")


if __name__ == "__main__":
    main()
