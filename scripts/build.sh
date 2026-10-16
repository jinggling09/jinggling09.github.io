#!/usr/bin/env bash
# Baut die Website in drei Sprachen:
#   Deutsch  (Stammverzeichnis) -> _site/
#   Englisch (en/)              -> _site/en/
#   Chinesisch (zh/)            -> _site/zh/
# Die Daten liegen nur einmal in daten/data/ und werden vor dem Bauen in die Sprachordner kopiert.
set -euo pipefail
cd "$(dirname "$0")/.."
QUARTO="${QUARTO:-quarto}"

# Kennzahlen für die Startseite aus den aktuellen Daten erzeugen
python3 scripts/kennzahlen_start.py

# Klimastreifen-Bausteine aus vorhandener CSV (Abruf: python3 scripts/fetch_klimastreifen.py)
python3 scripts/fetch_klimastreifen.py --offline

# Kopfbilder der Technikseiten (Energiewende) aus den Ausbaudaten
python3 scripts/technik_kopf.py

for lang in en zh; do
  rm -rf "$lang/daten/data"
  mkdir -p "$lang/daten/data"
  cp daten/data/* "$lang/daten/data/"
done

"$QUARTO" render            # zuerst Deutsch: leert _site/
for lang in en zh; do
  (cd "$lang" && "$QUARTO" render)
done
