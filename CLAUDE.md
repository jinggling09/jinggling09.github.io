# CLAUDE.md – jinggling09.github.io

Persönliche Website von Jing Hu: **„Klimaschutz im Vergleich: Deutschland & China – im Rahmen der EU-Klimapolitik“**.
Quarto-Website in drei Sprachen, veröffentlicht über GitHub Actions auf GitHub Pages.
Live: https://jinggling09.github.io · Allgemeiner Aufbau siehe `README.md`.

## Zusammenarbeit mit Jing

- Jing schreibt meist auf **Chinesisch** → auf Chinesisch antworten. Website-Texte: Deutsch ist die Referenzfassung.
- Jing ist Umweltwissenschaftlerin, keine Entwicklerin: Änderungen kurz und konkret erklären, Fachbegriffe der Technik vermeiden.
- **Commits** nur auf Wunsch, Autor „Jing“ (bereits in `git config`). **Nicht pushen** – Jing pusht selbst über GitHub Desktop („Push origin“), außer sie sagt ausdrücklich etwas anderes.
- **`.github/workflows/publish.yml` ist geschützt** – nicht ändern. Nötige Änderungen als Vorschlag formulieren; Jing trägt sie selbst ein.
- Vor größeren Gestaltungsänderungen Varianten zeigen (lokale Vorschau/Screenshots) und Jing wählen lassen.

## Befehle

```bash
bash scripts/build.sh        # baut DE + EN + ZH nach _site/ (kopiert vorher daten/data/ nach en/ und zh/)
quarto preview               # Vorschau Deutsch (im Stammverzeichnis)
cd en && quarto preview      # Vorschau Englisch – vorher einmal build.sh laufen lassen (Datenkopie)
```

Lokal: aktuelles Quarto liegt in `~/opt/quarto/bin/quarto` (1.10.19) → `QUARTO=~/opt/quarto/bin/quarto bash scripts/build.sh`. Das Quarto aus RStudio (0.9.80) ist zu alt (kennt `{{< include >}}` nicht). Python auf diesem Mac findet die SSL-Zertifikate nicht → Abrufskripte lokal mit `SSL_CERT_FILE=/etc/ssl/cert.pem` starten (auf GitHub nicht nötig).

## Struktur (vier Ebenen)

| Ebene | Pfad | Inhalt |
|---|---|---|
| 1 Ziele & Rechtsrahmen | `ziele/` | Zielkarten (mit Karten-Umriss; China-Karte inkl. Taiwan und Hainan), Meilenstein-Matrix, Net-Zero-Tracker-Tabelle |
| 2 Instrumente & CO₂-Bepreisung | `wissen/` | China-ETS, EU-ETS/ETS 2/BEHG, CBAM-Grundlagen, Schnittstelle China ↔ CBAM |
| 3 Erneuerbare | `daten/` | Ausbau und Erzeugung DE vs. CN (Diagrammlogik nur in `_shared/daten.qmd`) |
| 4 Emissionen | `wissen/emissionen-de.qmd`, `wissen/stromsektor.qmd` | THG-Dashboard Deutschland, Stromsektor DE/CN |
| Länderprofile | `laender/` | Je Land: Steckbrief (Bevölkerung, BIP, THG gesamt/pro Kopf/pro BIP, EE-Strom, Weltanteil) → Ziele & Pfad → Governance (6 Rollen) → Finanzierung → Gesetze → Sektoren → Einordnung. `deutschland.qmd`, `eu.qmd` und `china.qmd` (nur DE); Zielkarten auf Startseite und Ziele-Seite verlinken dorthin, beide im Menü unter „Start“. EU-Seite gliedert „Bereiche“ nach ETS 1 / Lastenteilung / LULUCF / Erneuerbare statt nach KSG-Sektoren; EU-Emissionen im Steckbrief nach EDGAR; Zielpfad in Zielabgrenzung des Klimagesetzes (1990: 4.726 Mio. t, 2024: 2.970 Mio. t) nach Commission Staff Working Document zum Fortschrittsbericht 2025. Zielpfade beider Seiten: „absoluter Wert · Prozent ggü. 1990“, 1990 als umrandeter Referenzbalken. EU-Seite hat eigenes Governance-Diagramm. China-Seite: Zielpfad mit Referenzjahr 2005 (EDGAR), Ziele als Textzeilen, weil sie sich auf Intensität bzw. den Höchststand beziehen; CNY-Umrechnung mit EZB-Jahresdurchschnitt 2025 (8,118 ¥/€) |

Startseite `index.qmd` = Navigations-Cockpit: Hero mit Klimastreifen → drei Neutralitäts-Karten (EU 2050 / DE 2045 / CN 2060) → vier Ebenen-Karten. Die Städte-Ebene (Stuttgart ↔ Peking) ist bewusst zurückgestellt.

## Drei Sprachen

- DE im Stammverzeichnis, `en/` und `zh/` sind **eigene Quarto-Projekte** mit denselben Dateinamen (Sprachmenü `_includes/lang-switch.html` springt auf dieselbe Seite).
- Inhaltliche Änderungen zuerst auf Deutsch, dann in `en/` und `zh/` nachziehen – **immer alle drei**.
- Auf DE- und EN-Seiten **keine chinesischen Zeichen** (einzige Ausnahme: „中文“ im Sprachmenü).
- `zh/references.bib` ist eigenständig (chinesische Originaltitel); DE und EN teilen `references.bib`.
- Gemeinsam genutzt: `styles/custom.scss`, `daten/data/`.
- Bilder und Dokumente liegen nur einmal im Stamm (`images/`, `dokumente/`, als `resources` in `_quarto.yml`). Quarto macht aus `/pfad` einen projektrelativen Pfad → in `en/` und `zh/` immer `../images/…` bzw. `../dokumente/…` schreiben.
- Über mich (Variante B, von Jing gewählt): Kopf mit Foto + Knöpfen (LinkedIn, E-Mail, Masterarbeit, GitHub), Schwerpunkte, Zeitleisten Beruf/Bildung, Karten Fähigkeiten/Sprachen/Zertifikate. Zeugnis/Diplom bewusst nicht veröffentlicht (Unterschriften); Lebenslauf-PDF vorerst nicht.

## Daten-Pipeline

Alle Skripte nur mit Python-Standardbibliothek. Erzeugte `_*.md`-Dateien **nie von Hand bearbeiten** – Skript ändern und neu erzeugen.

| Skript | Quelle | Ausgabe | Läuft |
|---|---|---|---|
| `scripts/fetch_energy_charts.py` | Energy-Charts (Fraunhofer ISE) | `daten/data/de_*.csv` | Workflow |
| `scripts/fetch_netzero.py` | Net Zero Tracker API | `daten/data/netzero.json`, `ziele/_nzt-tabelle.md` (+ en/zh) – DE-Zieljahr 2045 manuell gesetzt, mit Fußnote | Workflow |
| `scripts/kennzahlen_start.py` | vorhandene CSVs | `daten/data/_ee_start_{de,en,zh}.md` | `build.sh` |
| `scripts/fetch_klimastreifen.py` | DWD (Deutschland), CRU TS Ländermittel (China; neueste Version wird automatisch gesucht) | `daten/data/temperatur_de_cn.csv`, `daten/data/_klimastreifen_{de,en,zh}.md` | `build.sh` mit `--offline`; Abruf noch manuell (siehe unten) |

## Gestaltung (`styles/custom.scss`)

- Navigation (von Jing gewählt): kein Name links (`navbar: title: false`); Menüpunkte DE „Start · Ziele · CO₂-Bepreisung · Erneuerbare Energien · Emissionen · Projekte · Über mich“, EN „Carbon pricing“, ZH „碳定价“; Einträge brechen nicht um (nowrap, bei 992–1199 px enger gesetzt).
- Inhaltsseiten (von Jing gewählt): breite Textspalte, Inhaltsverzeichnis rechts, keine leere linke Spalte – in allen drei `_quarto.yml`: `toc-location: right` + `grid: sidebar-width 0px, body-width 940px, margin-width 260px, gutter-width 2rem`.

- Thinktank-Stil. Leitfarbe Dunkelgrün `#1f5f4a`, Akzent Ocker `#a8741a`, Papierweiß `#fcfcfa`; Schriften Source Serif 4 (Überschriften) / Source Sans 3.
- **Farbspuren** (überall konsistent): EU Blau `#3c5a8a` · DE Gold `#b8860b` (Schrift `#8a6a00`) · CN Rot `#b0412e`.
- **Hero / Klimastreifen:** zwei Bänder (oben DE, unten CN), 1901 (Beginn CRU) bis letztes Jahr in beiden Reihen (derzeit 2025), Abweichung vom Mittel 1961–1990, **gemeinsame °C-Skala** (bewusst anders als Hawkins’ Einzelskalen, damit vergleichbar). Desktop: rechts im Hintergrund, nach links ausgeblendet; Text mit Schwebe-Schatten (nur wenn Streifen vorhanden, `.hero:has(.klimastreifen)`). Achtung: Quarto legt ab dem `#`-Titel eine `<section>` um den Hero-Inhalt und gibt der Figur die Klasse `figure` → Selektoren `> section > …` und `figure.klimastreifen` nötig. Mobil (< 768 px): eigenes Band unter dem Text. Quellenzeile unter den Streifen.

## Inhaltsregeln

- Jede Sachaussage mit Beleg aus der `.bib`, vorrangig **Primärquellen**; jede Seite mit **Stand-Datum**.
- Eigene Einordnungen in `::: {.einordnung}`-Blöcke.
- Keine erfundenen Zahlen – fehlen Daten, offen sagen und Platz lassen.

## Aktueller Stand (15.10.2026, spät)

Klimastreifen live. **Committet (Jing pusht selbst):** Länderprofil Deutschland – `laender/deutschland.qmd`, Styles (`.governance`, `.sektoren`, `figure.pfad`, `.status-chip.plus/.minus` in `custom.scss`), `references.bib` (Quellen Länderprofil), `_quarto.yml` (Menü „Start" mit Unterpunkten „Übersicht" und „Deutschland: Klimaschutz im Überblick", Render-Pfad `laender/`; überall derselbe Titel), `index.qmd` (DE-Karte verlinkt), `ziele/index.qmd` (Link).

Nächste Schritte:
1. EN/ZH-Fassung des Länderprofils: **von Jing bewusst zurückgestellt** (Ausnahme von der Drei-Sprachen-Regel). Solange sie fehlt, steht `laender/` in `nurDeutsch` in `_includes/lang-switch.html` (EN/中 führen dort zur jeweiligen Startseite). Beim Übersetzen: Eintrag entfernen, Menü und Kartenlinks in en/zh nachziehen, Diagrammtexte übersetzen.
2. EU- und China-Seite (16.10.2026) von Jing prüfen lassen, dann committen. Notion-Seite China ist fast leer – Inhalte stammen aus Primärquellen (NBS, MEE, NEA, Staatsrat, NVK). (China-Weltanteil 29,5 % laut EDGAR 2026 bereits recherchiert).
3. **Vorschlag für Jing** (sie trägt ihn selbst in `publish.yml` ein, nach dem Schritt „Netto-null-Ziele abrufen"), damit die Klimastreifen-Daten monatlich aktualisiert werden:
   ```yaml
         - name: Temperaturreihen abrufen (DWD, CRU)
           run: |
             if ! python scripts/fetch_klimastreifen.py; then
               echo "::warning::Abruf Temperaturreihen fehlgeschlagen – vorhandene Daten werden verwendet."
             fi
   ```

**Notion-Notizen (Deutschland) sind teils veraltet – nicht ungeprüft übernehmen:** Klimaschutz liegt seit 06.05.2025 beim BMUKN (nicht BMWE); THG 2025 = 648,9 Mio. t (nicht 640); Sektorwerte stammen aus Projektionen 2025 statt 2026; GEG ist seit 29.07.2026 durch das Gebäudemodernisierungsgesetz (GModG) ersetzt, 65-%-Regel entfallen.

**Länderprofil-Gestaltung (von Jing gewählt):** Steckbrief zweispaltig; Icons als `<symbol>` im Seitenkopf, einfarbig ohne Füllung; Icons und Zahlen in der Länderfarbe (Klasse `.de` / `.eu` / `.cn` am Steckbrief, z. B. DE: Icons `#b8860b`, Zahlen `#8a6a00`), Rollen-Karten der Governance ebenso (Klasse am `.governance`-Block: Linie oben, Nummer und Überschrift in Länderfarbe); Rest der Seite bleibt grün. Literaturverzeichnis auf allen Seiten zum Aufklappen (`_includes/literatur-toggle.html`); Icon ganz links in fester Spalte, genau so hoch wie Zahl + einzeilige Erläuterung (Erläuterungen kurz halten, Details in die Belege-Zeile). Treibhausgase = Fabrik + „CO₂“, pro Kopf = Person + „CO₂“ (Klasse `breit`). Farben in Symbolen nur über Vererbung steuern – CSS-Selektoren erreichen `<use>`-Kopien nicht. Governance-Diagramm als Inline-SVG (EU / Bund / Länder, Pfeilarten: legt fest, EU-Vorgaben, berichtet/prüft, Geldfluss), darunter die sechs Rollen-Karten.

**Zitieren von Paragrafen:** `[§ 3 @ksg]` schreiben, nicht `[@ksg, § 3]` – sonst macht der deutsche Zitierstil „Abschn. 3" daraus.

**Energiewende-Bereich (16.10.2026, von Jing gewählt):** Menüpunkt „Energiewende“ (EN „Energy transition“, ZH „能源转型“) statt „Erneuerbare Energien“, weil Wärmepumpen und Wasserstoff keine erneuerbaren Energien im engeren Sinn sind. DE-Menü: „Überblick: Ausbau Wind & Solar“ (`daten/index.qmd`) · Photovoltaik · später Windenergie, Wärmepumpen, Wasserstoff (`energiewende/*.qmd`, vorerst nur DE, steht in `nurDeutsch`). Aufbau je Technik: „Auf einen Blick“ (drei Länderkarten `.land-drei/.land-karte.de/.eu/.cn` mit Fortschrittsbalken zum Ziel) → „Wer baut wie viel?“ (`.balken-vergleich`, absolut und je Einwohner) → „Wie wird der Ausbau gesteuert?“ (`.matrix`: Zeilen = Fragen Ziel/Vergütung/Gebäude/Netz, Spalten DE · EU · CN; Kopfzeile als HTML-Block, am Handy gestapelt mit Länderlabel) → Lieferkette (`.lieferkette`) → Einordnung. Photovoltaik committet (16.10.2026); Windenergie committet; Wärmepumpen-Seite gebaut (Kennzahlen je Land unterschiedlich, weil es keine gemeinsame Statistik gibt; Kopfbild mit nur einem Streifen: Absatz in Deutschland laut BWP, Daten in `daten/data/de_waermepumpen_absatz.csv`), wartet auf Jings Prüfung. Hinweis: GModG enthält eine Solarpflicht für Neubauten (§ 106) – auf der Photovoltaik-Seite noch ergänzen. Kopfkarte der Technikseiten (von Jing gewählt, nach mehreren Runden – so lassen): Karte mit Rahmen (`.technik-karte`, Quarto-Titelblock ausgeblendet), links eigener `<h1>`, Untertitel „Deutschland, EU und China im Vergleich: …“ und Stand-Plakette (Textspalte max. 55 %, damit nichts überlappt), rechts grüne Strichzeichnung (Windräder bzw. Solarmodule) auf zwei Ausbaustreifen 2015–letztes Jahr (oben DE gold, unten CN rot), darunter kleine Bildunterschrift. Bild und Bildunterschrift erzeugt `scripts/technik_kopf.py` (läuft in `build.sh`) → `daten/data/_kopf_wind.md`, `_kopf_photovoltaik.md`, nicht von Hand bearbeiten; für Wärmepumpen/Wasserstoff eigene Zeichnung im Skript ergänzen. Offshore-Ausschreibungen 2026 auf 2027 verschoben, WindSeeG-Änderung offen – nachziehen. Hinweis: EEG-Novelle (Drs. 21/7867) ist im Oktober 2026 noch in Beratung – nach Verabschiedung Seite anpassen. Headless-Chrome mit 390 px schneidet Text ab (Artefakt), echte Handybreite im Browser-Pane prüfen.

## Offene Ideen

- Erst das Gerüst (Gestaltung, Struktur) verfeinern, dann Inhalte/Daten füllen – so will Jing vorgehen.
- Ebene 4: China-Emissionen fehlen noch (Sektoren, pro Kopf) – größte Lücke im Vergleich.
- CBAM-Seiten aktualisieren (Regelphase seit 1.1.2026).
- Ziele-Seite: Governance-Vergleich „Wer kontrolliert die Ziele?“.
- Ebene 2: Klimaschutzprogramm 2026 vs. Chinas „1+N“-Politiksystem (Quelle: Jings Notion-Notizen).
- Beiger Chip „Politikdokument“ ist farblich nah am DE-Gold → ggf. auf Grau umstellen.
- **Notion EU-Seite** enthält Fehler: EU-ETS ist eine Richtlinie (keine Verordnung); eine EU-weite CO₂-Steuer gibt es nicht.
