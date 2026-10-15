"""Erzeugt die Kennzahlen „Erneuerbare" für die Startseite aus den vorhandenen Daten.

Eingabe (daten/data/):
  de_generation_monthly.csv – Energy-Charts (Fraunhofer ISE), monatlich
  de_meta.json              – letzter vollständiger Monat
  cn_capacity_yearly.csv    – Nationales Statistikamt Chinas (NBS), jährlich

Ausgabe (daten/data/, eingebunden per {{< include >}} auf der Startseite):
  _ee_start_de.md, _ee_start_en.md, _ee_start_zh.md

Wird von scripts/build.sh vor dem Rendern aufgerufen. Nur Standardbibliothek.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "daten" / "data"
WIND_SOLAR = {"Wind an Land", "Wind auf See", "Photovoltaik"}
CN_TARGET_2030_GW = 1200  # Aktionsplan CO₂-Höchststand vor 2030 (国发〔2021〕23号)

MONTHS = {
    "de": ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."],
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}


def month_label(ym: str, lang: str) -> str:
    y, m = int(ym[:4]), int(ym[5:7])
    if lang == "zh":
        return f"{y}年{m}月"
    return f"{MONTHS[lang][m - 1]} {y}"


def de_share() -> tuple[float, str, str]:
    meta = json.loads((DATA / "de_meta.json").read_text(encoding="utf-8"))
    last = meta["letzter_monat"]
    rows = list(csv.DictReader((DATA / "de_generation_monthly.csv").open(encoding="utf-8")))
    months = sorted({r["monat"] for r in rows if r["monat"] <= last})[-12:]
    ws = sum(float(r["twh"]) for r in rows if r["monat"] in months and r["reihe"] in WIND_SOLAR)
    load = sum(float(r["twh"]) for r in rows if r["monat"] in months and r["reihe"] == "Last")
    return 100 * ws / load, months[0], months[-1]


def cn_capacity() -> tuple[float, int]:
    rows = list(csv.DictReader((DATA / "cn_capacity_yearly.csv").open(encoding="utf-8")))
    year = max(int(r["jahr"]) for r in rows)
    gw = sum(float(r["gw"]) for r in rows if int(r["jahr"]) == year and r["reihe"] in ("Wind", "Photovoltaik"))
    return gw, year


def main() -> None:
    share, m0, m1 = de_share()
    gw, year = cn_capacity()
    reached = gw >= CN_TARGET_2030_GW

    texts = {
        "de": (
            f"{share:.0f} %".replace(".", ","),
            f"Wind + Photovoltaik an der Netzlast, Deutschland · {month_label(m0, 'de')} – {month_label(m1, 'de')}",
            f"{gw:,.0f} GW".replace(",", "."),
            f"Wind + Photovoltaik installiert, China · Ende {year}"
            + (f" – Ziel für 2030 ({CN_TARGET_2030_GW:,} GW) bereits übertroffen".replace(",", ".") if reached
               else f" (Ziel 2030: {CN_TARGET_2030_GW:,} GW)".replace(",", ".")),
        ),
        "en": (
            f"{share:.0f} %",
            f"wind + solar share of grid load, Germany · {month_label(m0, 'en')} – {month_label(m1, 'en')}",
            f"{gw:,.0f} GW",
            f"wind + solar installed, China · end of {year}"
            + (f" – 2030 target ({CN_TARGET_2030_GW:,} GW) already exceeded" if reached
               else f" (2030 target: {CN_TARGET_2030_GW:,} GW)"),
        ),
        "zh": (
            f"{share:.0f}%",
            f"风电 + 光伏占电网负荷比重，德国 · {month_label(m0, 'zh')}–{month_label(m1, 'zh')}",
            f"{gw / 100:.1f} 亿千瓦",
            f"风电 + 光伏装机，中国 · {year} 年底"
            + ("——已超过 2030 年 12 亿千瓦的目标" if reached else "（2030 年目标：12 亿千瓦）"),
        ),
    }
    for lang, (z1, w1, z2, w2) in texts.items():
        md = (
            "<!-- Automatisch erzeugt von scripts/kennzahlen_start.py – nicht von Hand bearbeiten. -->\n\n"
            "::: {.ee-zahlen}\n"
            f"::: {{}}\n[{z1}]{{.zahl}}\n[{w1}]{{.was}}\n:::\n"
            f"::: {{}}\n[{z2}]{{.zahl}}\n[{w2}]{{.was}}\n:::\n"
            ":::\n"
        )
        (DATA / f"_ee_start_{lang}.md").write_text(md, encoding="utf-8")
    print(f"Kennzahlen: DE {share:.1f} % ({m0}–{m1}), CN {gw:.0f} GW ({year})")


if __name__ == "__main__":
    main()
