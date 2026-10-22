#!/usr/bin/env python3
"""Sektorkarten für laender/deutschland.qmd aus daten/data/de_sektoren.json erzeugen.

Dieselbe JSON-Datei liest das Klimaschutz-Rad (skripte/klimarad.js), damit Karten und Rad
immer dieselben Zahlen zeigen. Ausgabe: daten/data/_sektoren_de.md – nicht von Hand bearbeiten.
Jährlich aktualisieren: Emissionen des Vorjahres (UBA bis 15. März) und Projektionen/Budgetstand.
"""
import json
from pathlib import Path

BASIS = Path(__file__).resolve().parent.parent
DATEN = BASIS / "daten" / "data" / "de_sektoren.json"
ZIEL = BASIS / "daten" / "data" / "_sektoren_de.md"


def main():
    d = json.loads(DATEN.read_text(encoding="utf-8"))
    karten, belege = [], []
    for s in d["sektoren"]:
        if s.get("nur_beleg"):
            belege.append(s["beleg_md"])
            continue
        karten.append(
            "::: {.sektor}\n"
            f"### {s['name']}\n"
            f"[{s['werte_md']}]{{.werte}}\n"
            f"[{s['status_md']}]{{.status-chip .{s['status']}}}\n\n"
            f"{s['text_md']}\n\n"
            f"**Maßnahmen:** {s['massnahmen_md']}\n"
            ":::\n"
        )
    text = "::: {.sektoren}\n\n" + "\n".join(karten) + "\n:::\n"
    if belege:
        text += "\n::: {.belege}\n" + "\n".join(belege) + "\n:::\n"
    ZIEL.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
