#!/usr/bin/env python3
"""Kleines Säulenbild für die Kachel „Emissionen heute“ der Startseite (im Stil der Klimastreifen).

Eingabe:  daten/data/de_thg_gesamt.csv – Treibhausgase Deutschland je Jahr, Mio. t CO₂-Äq. ohne LULUCF.
          Quelle: Umweltbundesamt, DataCube DF_CLIMATE_EMISSIONS_GHG_TRENDS_KSG (dl-de/by-2-0),
          übernommen aus dem Klima-Dashboard (jinggling09.github.io/germany-climate-dashboard/data.json).
          Letztes Jahr ist eine Vorjahresschätzung. Jährlich nach der UBA-Meldung (15. März) ergänzen.
Ausgabe:  daten/data/_emissionen_mini_{de,en,zh}.md – nicht von Hand bearbeiten.
Wird von scripts/build.sh vor dem Rendern aufgerufen. Nur Standardbibliothek.
"""
import csv
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "daten" / "data"
TEXTE = {
    "de": dict(land="Deutschland", einheit="Mio. t CO₂-Äq.", komma=True),
    "en": dict(land="Germany", einheit="Mt CO₂e", komma=False),
    "zh": dict(land="德国", einheit="百万吨二氧化碳当量", komma=False),
}
# Grünstufen: hohe Emissionen dunkel, niedrige hell
DUNKEL, HELL = (18, 61, 48), (168, 205, 185)


def farbe(v, lo, hi):
    t = (v - lo) / (hi - lo) if hi > lo else 1
    return "#%02x%02x%02x" % tuple(round(h + (d - h) * t) for d, h in zip(DUNKEL, HELL))


def zahl(v, komma):
    s = f"{v:,}"
    return s.replace(",", ".") if komma else s


def mini(zeilen, lang):
    if not zeilen:
        return "<!-- Emissionen: keine Daten vorhanden -->\n"
    t = TEXTE[lang]
    werte = [v for _, v in zeilen]
    lo, hi = min(werte), max(werte)
    rects = []
    for i, (jahr, v) in enumerate(zeilen):
        h = v / hi * 90
        rects.append(f'<rect x="{i + .12:.2f}" y="{100 - h:.1f}" width=".76" height="{h:.1f}" fill="{farbe(v, lo, hi)}">'
                     f'<title>{t["land"]} {jahr}: {zahl(v, t["komma"])} {t["einheit"]}</title></rect>')
    return (
        "```{=html}\n"
        f'<div class="ks-mini em-mini" aria-hidden="true"><svg viewBox="0 0 {len(zeilen)} 100" preserveAspectRatio="none" shape-rendering="crispEdges">'
        + "".join(rects) +
        f'</svg><span class="ks-mini-de">{t["land"]}</span>'
        f'<span class="ks-mini-jahre">{zeilen[0][0]}–{zeilen[-1][0]}</span></div>\n```\n'
    )


def main():
    with open(DATA / "de_thg_gesamt.csv", encoding="utf-8") as f:
        zeilen = [(int(r["jahr"]), int(r["mt_co2aeq"])) for r in csv.DictReader(f)]
    for lang in TEXTE:
        (DATA / f"_emissionen_mini_{lang}.md").write_text(mini(zeilen, lang), encoding="utf-8")


if __name__ == "__main__":
    main()
