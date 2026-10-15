"""Klimastreifen für den Kopfbereich der Startseite: Deutschland (oben) und China (unten).

Jahresmitteltemperatur je Land als Abweichung vom Mittel 1961–1990, dargestellt als
„Warming Stripes" nach Ed Hawkins (https://showyourstripes.info). Beide Bänder nutzen
dieselbe Farbskala in °C, damit sie direkt vergleichbar sind.

Quellen:
  Deutschland – Deutscher Wetterdienst (DWD), Climate Data Center, Gebietsmittel Deutschland,
                Jahresmittel der Lufttemperatur (Messreihe ab 1881).
                https://opendata.dwd.de/climate_environment/CDC/regional_averages_DE/annual/air_temperature_mean/
  China       – Climatic Research Unit (CRU), University of East Anglia: CRU TS, Ländermittel
                China, Jahresmittel der Lufttemperatur (Messreihe ab 1901, jährlich aktualisiert).
                https://crudata.uea.ac.uk/cru/data/hrg/  ·  Lizenz Open Government Licence / CC BY 4.0
                Die jeweils neueste Version (cru_ts_X.YY) wird automatisch gesucht.
                (Vorher Berkeley Earth – deren Länderdateien enden 2020, daher ersetzt.)

Gemeinsamer Zeitraum: 1901 (Beginn CRU) bis zum letzten Jahr, das in beiden Reihen vorliegt.

Ausgabe:
  daten/data/temperatur_de_cn.csv      – Jahr, Abweichungen DE/CN in °C (Basis 1961–1990)
  daten/data/_klimastreifen_{de,en,zh}.md – HTML-Baustein, eingebunden per {{< include >}}

Aufruf:
  python3 scripts/fetch_klimastreifen.py            # abrufen und Bausteine erzeugen
  python3 scripts/fetch_klimastreifen.py --offline  # nur Bausteine aus vorhandener CSV erzeugen

Nur Standardbibliothek. Ohne Daten werden leere Bausteine geschrieben, damit der Build nie bricht.
"""

from __future__ import annotations

import csv
import math
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "daten" / "data"
CSV_OUT = DATA / "temperatur_de_cn.csv"

URL_DE = ("https://opendata.dwd.de/climate_environment/CDC/regional_averages_DE/annual/"
          "air_temperature_mean/regional_averages_tm_year.txt")
CRU_BASIS = "https://crudata.uea.ac.uk/cru/data/hrg/"
# Rückfall, falls die automatische Suche scheitert (Stand Oktober 2026)
URL_CN_BEKANNT = (CRU_BASIS + "cru_ts_4.10/crucy.2606161920.v4.10/countries/tmp/"
                  "crucy.v4.10.1901.2025.China.tmp.per")

LINK_DE = "https://opendata.dwd.de/climate_environment/CDC/regional_averages_DE/annual/air_temperature_mean/"
LINK_CN = CRU_BASIS
LINK_HAWKINS = "https://showyourstripes.info"

START = 1901                 # Beginn der CRU-Reihe (DWD ab 1881)
BASIS = (1961, 1990)         # WMO-Referenzperiode, auch vom DWD verwendet

# Farbfolge nach Hawkins (ColorBrewer Blues/Reds), kalt → warm
FARBEN = ["#08306b", "#08519c", "#2171b5", "#4292c6", "#6baed6", "#9ecae1", "#c6dbef", "#deebf7",
          "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]


# ---------------------------------------------------------------- Abruf
def hole(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "jinggling09.github.io data refresh"})
    for versuch in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            print(f"  Versuch {versuch + 1} fehlgeschlagen: {e}", file=sys.stderr)
            time.sleep(3)
    raise RuntimeError(f"Abruf fehlgeschlagen: {url}")


def parse_dwd(text: str) -> dict[int, float]:
    """Jahresmittel Deutschland in °C (absolut)."""
    spalte, werte = None, {}
    for zeile in text.splitlines():
        teile = [t.strip() for t in zeile.split(";")]
        if spalte is None:
            if "Deutschland" in teile:
                spalte = teile.index("Deutschland")
            continue
        if teile and teile[0].isdigit() and len(teile) > spalte:
            try:
                werte[int(teile[0])] = float(teile[spalte].replace(",", "."))
            except ValueError:
                pass
    if not werte:
        raise ValueError("DWD-Datei: Spalte 'Deutschland' nicht gefunden")
    return werte


def url_cru_china() -> str:
    """Adresse der neuesten CRU-Länderdatei China (Mitteltemperatur) suchen."""
    try:
        versionen = re.findall(r'href="(?:[^"]*/)?cru_ts_(\d+)\.(\d+)/?"', hole(CRU_BASIS))
        neueste = max(versionen, key=lambda v: (int(v[0]), int(v[1])))
        ordner = CRU_BASIS + f"cru_ts_{neueste[0]}.{neueste[1]}/"
        crucy = re.findall(r'href="(?:[^"]*/)?(crucy\.[^"/]+)/?"', hole(ordner))[-1]
        tmp = ordner + crucy + "/countries/tmp/"
        datei = re.search(r'href="(?:[^"]*/)?([^"/]*\.China\.tmp\.per)"', hole(tmp)).group(1)
        return tmp + datei
    except Exception as e:  # noqa: BLE001
        print(f"  Suche nach neuester CRU-Version fehlgeschlagen ({e}), nutze bekannte Adresse",
              file=sys.stderr)
        return URL_CN_BEKANNT


def parse_cru(text: str) -> dict[int, float]:
    """Jahresmittel China in °C (absolut), Spalte ANN; fehlende Werte (-999) werden übersprungen."""
    spalte, werte = None, {}
    for zeile in text.splitlines():
        teile = zeile.split()
        if spalte is None:
            if teile[:1] == ["YEAR"] and "ANN" in teile:
                spalte = teile.index("ANN")
            continue
        if teile and teile[0].isdigit() and len(teile) > spalte:
            wert = float(teile[spalte])
            if wert > -900:
                werte[int(teile[0])] = wert
    if not werte:
        raise ValueError("CRU-Datei: Spalte 'ANN' nicht gefunden")
    return werte


def abweichung(reihe: dict[int, float]) -> dict[int, float]:
    basis = [reihe[j] for j in range(BASIS[0], BASIS[1] + 1) if j in reihe]
    mittel = sum(basis) / len(basis)
    return {j: v - mittel for j, v in reihe.items()}


def abrufen() -> list[dict]:
    print("DWD (Deutschland) …")
    de = abweichung(parse_dwd(hole(URL_DE)))
    print("CRU (China) …")
    url = url_cru_china()
    print(f"  {url}")
    cn = abweichung(parse_cru(hole(url)))
    jahre = [j for j in sorted(set(de) & set(cn)) if j >= START]
    return [{"jahr": j, "de": round(de[j], 2), "cn": round(cn[j], 2)} for j in jahre]


def lies_csv() -> list[dict]:
    if not CSV_OUT.exists():
        return []
    with CSV_OUT.open(encoding="utf-8") as f:
        return [{"jahr": int(r["jahr"]), "de": float(r["de_abw_c"]), "cn": float(r["cn_abw_c"])}
                for r in csv.DictReader(f)]


def schreib_csv(zeilen: list[dict]) -> None:
    with CSV_OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["jahr", "de_abw_c", "cn_abw_c"])
        for z in zeilen:
            w.writerow([z["jahr"], f"{z['de']:.2f}", f"{z['cn']:.2f}"])


# ---------------------------------------------------------------- Darstellung
def farbe(wert: float, grenze: float) -> str:
    t = max(0.0, min(1.0, (wert + grenze) / (2 * grenze)))
    return FARBEN[min(len(FARBEN) - 1, int(t * len(FARBEN)))]


TEXTE = {
    "de": dict(de="Deutschland", cn="China", komma=True,
               aria="Klimastreifen: Jahresmitteltemperatur in Deutschland und China {a}–{b}, von kühl (blau) zu warm (rot)",
               quelle=('Klimastreifen {a}–{b} · Abweichung vom Mittel 1961–1990, gemeinsame Skala ±{g} °C · '
                       'Daten: <a href="{ld}">DWD</a>, <a href="{lc}">CRU (University of East Anglia)</a> · '
                       'nach <a href="{lh}">Ed Hawkins</a>')),
    "en": dict(de="Germany", cn="China", komma=False,
               aria="Warming stripes: annual mean temperature in Germany and China {a}–{b}, from cool (blue) to warm (red)",
               quelle=('Warming stripes {a}–{b} · anomaly vs. 1961–1990, shared scale ±{g} °C · '
                       'Data: <a href="{ld}">DWD</a>, <a href="{lc}">CRU (University of East Anglia)</a> · '
                       'after <a href="{lh}">Ed Hawkins</a>')),
    "zh": dict(de="德国", cn="中国", komma=False,
               aria="气候条纹：{a}–{b}年德国与中国年平均气温，蓝色偏冷、红色偏暖",
               quelle=('气候条纹 {a}–{b} · 相对1961–1990年均值的距平，统一色标 ±{g} °C · '
                       '数据：<a href="{ld}">德国气象局（DWD）</a>、<a href="{lc}">英国东英吉利大学气候研究所（CRU）</a> · '
                       '设计源自 <a href="{lh}">Ed Hawkins</a>')),
}


def zahl(w: float, komma: bool) -> str:
    s = f"{w:+.1f}".replace("-", "−")
    return s.replace(".", ",") if komma else s


def baustein(zeilen: list[dict], lang: str) -> str:
    if not zeilen:
        return "<!-- Klimastreifen: keine Daten vorhanden -->\n"
    t = TEXTE[lang]
    n = len(zeilen)
    a, b = zeilen[0]["jahr"], zeilen[-1]["jahr"]
    grenze = math.ceil(max(abs(z[k]) for z in zeilen for k in ("de", "cn")) * 2) / 2
    g_txt = (f"{grenze:.1f}".replace(".", ",") if t["komma"] else f"{grenze:.1f}")
    rects = []
    for land, y in (("de", 0), ("cn", 51)):
        rects.append(f'<g class="ks-band ks-{land}">')
        for i, z in enumerate(zeilen):
            rects.append(f'<rect x="{i}" y="{y}" width="1.05" height="49" fill="{farbe(z[land], grenze)}">'
                         f'<title>{t[land]} {z["jahr"]}: {zahl(z[land], t["komma"])} °C</title></rect>')
        rects.append("</g>")
    quelle = t["quelle"].format(a=a, b=b, g=g_txt, ld=LINK_DE, lc=LINK_CN, lh=LINK_HAWKINS)
    return (
        "```{=html}\n"
        f'<figure class="klimastreifen" aria-label="{t["aria"].format(a=a, b=b)}">\n'
        f'<div class="ks-flaeche"><svg viewBox="0 0 {n} 100" preserveAspectRatio="none" shape-rendering="crispEdges">'
        + "".join(rects) +
        "</svg>"
        f'<span class="ks-label ks-label-de">{t["de"]}</span>'
        f'<span class="ks-label ks-label-cn">{t["cn"]}</span></div>\n'
        f'<figcaption class="ks-quelle">{quelle}</figcaption>\n'
        "</figure>\n```\n"
    )


def main() -> None:
    offline = "--offline" in sys.argv
    zeilen = lies_csv()
    if not offline:
        try:
            neu = abrufen()
            if neu != zeilen:
                schreib_csv(neu)
                print(f"CSV aktualisiert: {neu[0]['jahr']}–{neu[-1]['jahr']} ({len(neu)} Jahre)")
            zeilen = neu
        except Exception as e:  # noqa: BLE001
            print(f"Abruf fehlgeschlagen: {e}", file=sys.stderr)
            if not zeilen:
                for lang in TEXTE:
                    (DATA / f"_klimastreifen_{lang}.md").write_text(baustein([], lang), encoding="utf-8")
                sys.exit(1)
            print("Vorhandene CSV wird verwendet.", file=sys.stderr)
    for lang in TEXTE:
        (DATA / f"_klimastreifen_{lang}.md").write_text(baustein(zeilen, lang), encoding="utf-8")
    if zeilen:
        letzte = zeilen[-1]
        print(f"Bausteine geschrieben. Letztes Jahr {letzte['jahr']}: DE {letzte['de']:+.2f} °C, CN {letzte['cn']:+.2f} °C")


if __name__ == "__main__":
    main()
