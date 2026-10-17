"""Erzeugt die Kopfbilder der Technikseiten (energiewende/): Strichzeichnung auf einem
„Boden" aus Ausbaustreifen – je Jahr ein Streifen, oben Deutschland, unten China,
Farbe = installierte Leistung im Verhältnis zum letzten Jahr der Reihe.

Eingabe (daten/data/):
  de_installed_yearly.csv     – Energy-Charts (Fraunhofer ISE), Ist-Werte
  cn_capacity_yearly.csv      – Nationales Statistikamt Chinas (NBS)
  de_waermepumpen_absatz.csv  – Bundesverband Wärmepumpe, Absatz je Jahr (für China gibt es keine
                                vergleichbare amtliche Jahresreihe, daher nur ein Streifen)

Ausgabe (daten/data/, eingebunden per {{< include >}}):
  _kopf_wind.md, _kopf_photovoltaik.md, _kopf_waermepumpen.md, _kopf_wasserstoff.md,
  _kopf_unternehmen.md, _kopf_berichte.md, _kopf_pflichten.md,
  _kopf_anreize.md (Themenseiten unternehmen/, nur Zeichnung)

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


def zeichnung_h2() -> str:
    """Windrad und Solarmodule liefern Strom an einen Elektrolyseur; Wasserstoff geht in Tank und Leitung."""
    s = '<path d="M0 262H900"/>'
    s += turbine(400, 258, 120, 40)
    for i in range(3):
        x = 450 + i * 52
        s += f'<path d="M{x} 258L{x + 44} 258L{x + 54} 238L{x + 10} 238Z"/><path d="M{x + 22} 258L{x + 32} 238" opacity=".6"/>'
    s += '<path d="M600 250H640" opacity=".7"/><path d="M630 244l10 6-10 6" opacity=".7"/>'
    # Elektrolyseur (Container) mit Wellenlinie
    s += '<rect x="640" y="200" width="110" height="58" rx="3"/><path d="M652 214h86M652 244h86" opacity=".6"/>'
    s += '<path d="M660 229c8-8 14 8 22 0s14 8 22 0s14 8 22 0" />'
    # Leitung zum Tank
    s += '<path d="M750 236H790"/><path d="M750 242H790" opacity=".6"/>'
    # Tank (liegender Zylinder) mit H2-Beschriftung
    s += '<path d="M800 210h70a12 24 0 0 1 0 48h-70a12 24 0 0 1 0-48z"/><path d="M800 210a12 24 0 0 0 0 48" opacity=".6"/>'
    s += '<text x="835" y="240" text-anchor="middle" font-size="18" stroke="none" fill="currentColor">H₂</text>'
    s += '<path d="M815 258v8M855 258v8"/>'
    # Pipeline ins Bild hinein
    s += '<path d="M590 278H900" opacity=".55"/><path d="M590 284H900" opacity=".55"/>'
    return s


def zeichnung_unternehmen() -> str:
    """Vom Staat zum Betrieb: Regierungsgebäude → Fabrik → Bericht mit Kennzahlen → geprüft."""
    s = '<path d="M0 262H900"/>'
    # Regierungsgebäude: Stufen, Giebel, Säulen
    s += '<path d="M330 262H450M336 254H444M342 246H438"/>'
    s += '<path d="M338 150L390 118L442 150ZM342 150V160H438V150"/>'
    for x in (352, 376, 400, 424):
        s += f'<path d="M{x} 160V246M{x + 6} 160V246"/>'
    s += '<path d="M462 212H494" opacity=".7"/><path d="M486 206l8 6-8 6" opacity=".7"/>'
    # Fabrik mit Sheddach und Schornstein
    s += '<path d="M505 262V190L545 165V190L585 165V190L625 165V190H655V262"/>'
    s += '<path d="M633 190V118H647V190"/><path d="M640 110c-8-6 4-12-2-20s6-12 0-18" opacity=".55"/>'
    s += '<path d="M520 214h20v18h-20zM560 214h20v18h-20zM600 214h20v18h-20z" opacity=".7"/>'
    s += '<path d="M668 212H700" opacity=".7"/><path d="M692 206l8 6-8 6" opacity=".7"/>'
    # Bericht mit Eselsohr, Textzeilen und sinkenden Balken
    s += '<path d="M712 130H782L800 148V258H712Z"/><path d="M782 130V148H800" opacity=".7"/>'
    s += '<path d="M724 152h44M724 164h56M724 176h36" opacity=".6"/>'
    s += '<path d="M732 244V196M748 244V206M764 244V218M780 244V228"/><path d="M724 244h66" opacity=".6"/>'
    # Prüfsiegel
    s += '<circle cx="842" cy="150" r="22"/><path d="M831 150l8 8 15-16"/>'
    return s


def zeichnung_bericht() -> str:
    """Berichtspflichten: Bericht mit Kennzahlen, Waage (doppelte Wesentlichkeit), Lupe (Prüfung)."""
    s = '<path d="M0 262H900"/>'
    # aufgeschlagener Bericht
    s += '<path d="M330 252V140Q380 128 430 140V252Q380 240 330 252ZM430 140Q480 128 530 140V252Q480 240 430 252"/>'
    s += '<path d="M346 160h66M346 172h54M346 184h62" opacity=".6"/>'
    s += '<path d="M452 226V206M470 226V194M488 226V184M506 226V176" /><path d="M446 226h68" opacity=".6"/>'
    # Waage: Säule, Balken, zwei Schalen
    s += '<path d="M640 262V128M610 262h60M560 140H720"/><circle cx="640" cy="126" r="5"/>'
    s += '<path d="M560 140l-22 52h44zM720 140l-22 52h44z" opacity=".75"/>'
    s += '<path d="M538 192q22 14 44 0M698 192q22 14 44 0"/>'
    # Lupe über Zahlenreihe
    s += '<circle cx="810" cy="170" r="34"/><path d="M834 194l34 36"/>'
    s += '<path d="M792 164h36M792 176h26" opacity=".6"/>'
    return s


def zeichnung_pflichten() -> str:
    """Pflichten erfüllen: Messgerät (messen), Kalenderblatt (Fristen), Zertifikate (abgeben), Container (CBAM)."""
    s = '<path d="M0 262H900"/>'
    # Messgerät: Gehäuse, Skala, Zeiger
    s += '<path d="M300 262V170h96v92"/><path d="M314 214a34 34 0 0 1 68 0" opacity=".75"/>'
    s += '<path d="M348 214l20-24"/><circle cx="348" cy="214" r="4"/><path d="M314 236h68" opacity=".6"/>'
    # Kalenderblatt mit Ringen und markiertem Tag
    s += '<path d="M440 252V136h112v116zM440 160h112"/><path d="M466 128v16M526 128v16"/>'
    s += '<path d="M458 182h12M486 182h12M514 182h12M458 206h12M486 206h12M458 230h12M486 230h12M514 230h12" opacity=".6"/>'
    s += '<circle cx="520" cy="206" r="12"/>'
    # Zertifikatstapel mit Siegel
    s += '<path d="M600 252V170h104v82zM612 170v-10h104v80h-12"/>'
    s += '<path d="M616 194h56M616 208h44" opacity=".6"/><circle cx="680" cy="232" r="11"/>'
    # Container (Import, CBAM)
    s += '<path d="M752 262V196h130v66zM752 196l12-12h130l-12 12M882 262l12-12v-66"/>'
    s += '<path d="M774 206v46M796 206v46M818 206v46M840 206v46M862 206v46" opacity=".6"/>'
    return s


def zeichnung_anreize() -> str:
    """Risiken, Anreize, Nutzen: Schirm im Regen (Risiko), Münzstapel (Anreiz), Pflanze mit Pfeil (Nutzen)."""
    s = '<path d="M0 262H900"/>'
    # Schirm mit Regen
    s += '<path d="M300 186a62 62 0 0 1 124 0q-15.5-10-31 0q-15.5-10-31 0q-15.5-10-31 0q-15.5-10-31 0z"/>'
    s += '<path d="M362 186v62q0 12-12 12t-12-12"/><path d="M362 124v-8"/>'
    s += '<path d="M310 102l-6 14M346 92l-6 14M384 92l-6 14M420 102l-6 14" opacity=".6"/>'
    # Münzstapel
    for i in range(5):
        y = 252 - i * 16
        s += f'<ellipse cx="540" cy="{y}" rx="44" ry="10"/>'
    s += '<path d="M496 252v-64M584 252v-64" opacity=".75"/>'
    # Pflanze aus dem Boden und steigender Pfeil
    s += '<path d="M700 262v-70M700 220q-30-4-38-34q30 2 38 34M700 198q26-6 32-36q-28 4-32 36"/>'
    s += '<path d="M770 240l40-36 28 18 44-56M862 166h20v20"/>'
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


def karte(zeichnung: str, rechtecke: str, unterschrift: str, viewbox: str = "0 0 900 300") -> str:
    return ("<!-- Erzeugt von scripts/technik_kopf.py – nicht von Hand bearbeiten -->\n"
            "```{=html}\n"
            f'<div class="tk-deko"><svg viewBox="{viewbox}" preserveAspectRatio="xMaxYMax meet" '
            f'role="img" aria-label="{unterschrift or "Strichzeichnung"}">'
            f'<g class="tk-linie" transform="translate(90 2) scale(.9)">{zeichnung}</g>'
            f'{rechtecke}</svg></div>'
            + (f'<div class="tk-quelle">{unterschrift}</div>' if unterschrift else '') + '\n```\n')


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
    # Wasserstoff: keine vergleichbare Jahresreihe für Deutschland und China – nur Zeichnung, keine Streifen
    # ohne Streifen: Ausschnitt enger, damit die Zeichnung die Karte füllt
    (DATA / "_kopf_wasserstoff.md").write_text(
        karte(zeichnung_h2(), "", "", viewbox="330 70 570 215"), encoding="utf-8")
    # Themenseiten Unternehmen: ebenfalls nur Zeichnung; breiterer Ausschnitt, damit das Gebäude links
    # nicht unter den Untertitel rutscht
    (DATA / "_kopf_unternehmen.md").write_text(
        karte(zeichnung_unternehmen(), "", "", viewbox="190 60 710 225"), encoding="utf-8")
    (DATA / "_kopf_berichte.md").write_text(
        karte(zeichnung_bericht(), "", "", viewbox="190 60 710 225"), encoding="utf-8")
    (DATA / "_kopf_pflichten.md").write_text(
        karte(zeichnung_pflichten(), "", "", viewbox="190 60 710 225"), encoding="utf-8")
    (DATA / "_kopf_anreize.md").write_text(
        karte(zeichnung_anreize(), "", "", viewbox="190 60 710 225"), encoding="utf-8")
    (DATA / "_kopf_wind.md").write_text(
        baustein(zeichnung_wind(), r["de"]["wind"], r["cn"]["wind"], "Windenergie", "Windleistung"), encoding="utf-8")
    (DATA / "_kopf_photovoltaik.md").write_text(
        baustein(zeichnung_pv(), r["de"]["pv"], r["cn"]["pv"], "Photovoltaik", "Photovoltaik-Leistung"), encoding="utf-8")


if __name__ == "__main__":
    main()
