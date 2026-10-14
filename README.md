# jinggling09.github.io

Persönliche Website von Jing Hu: Wissensbasis zu CO₂-Märkten, CBAM und Erneuerbaren an der Schnittstelle China ↔ EU/Deutschland.

Live: https://jinggling09.github.io

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.qmd` | Startseite |
| `wissen/` | Modul 1 – China-ETS, EU-ETS/ETS 2/BEHG, CBAM, Schnittstellen, Emissionen DE |
| `daten/` | Modul 2 – Wind/Solar/Geothermie DE vs. CN |
| `projekte/` | Projekte |
| `scripts/fetch_energy_charts.py` | Datenabruf Deutschland (Energy-Charts-API), läuft in GitHub Actions |
| `daten/data/` | Abgerufene Daten (CSV) – werden vom Workflow aktualisiert und committet |
| `references.bib` | Alle Quellen (zitiert mit `[@schluessel]`) |
| `styles/custom.scss` | Gestaltung |

## Sprachen

| Sprache | Quelle | URL |
|---|---|---|
| Deutsch (Referenzfassung) | Stammverzeichnis | https://jinggling09.github.io/ |
| Englisch | `en/` (eigenes Quarto-Projekt) | https://jinggling09.github.io/en/ |
| Chinesisch | `zh/` (eigenes Quarto-Projekt) | https://jinggling09.github.io/zh/ |

- Alle drei Fassungen haben dieselben Dateinamen; das Sprachmenü (`_includes/lang-switch.html`) springt so auf dieselbe Seite in der anderen Sprache.
- Inhaltliche Änderungen zuerst in der deutschen Fassung, dann in `en/` und `zh/` nachziehen.
- Die Diagrammlogik der Daten-Seite steht nur einmal in `_shared/daten.qmd`; die Sprachseiten liefern nur Texte und Zahlenformat (`L`).
- Gemeinsam genutzt: `styles/custom.scss`, `references.bib`, `daten/data/`.

## Lokal bauen

```bash
bash scripts/build.sh   # baut alle drei Sprachen nach _site/
```

## Veröffentlichung

Jeder Push auf `main` baut die Seite über GitHub Actions und veröffentlicht sie auf GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Regeln für Inhalte

- Jede Sachaussage bekommt einen Beleg aus `references.bib`, vorrangig Primärquellen.
- Jede Seite trägt ein Stand-Datum.
- Eigene Einordnungen stehen in `::: {.einordnung}`-Blöcken.
