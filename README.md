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

## Lokal bauen

```bash
quarto preview
```

## Veröffentlichung

Jeder Push auf `main` baut die Seite über GitHub Actions und veröffentlicht sie auf GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Regeln für Inhalte

- Jede Sachaussage bekommt einen Beleg aus `references.bib`, vorrangig Primärquellen.
- Jede Seite trägt ein Stand-Datum.
- Eigene Einordnungen stehen in `::: {.einordnung}`-Blöcken.
