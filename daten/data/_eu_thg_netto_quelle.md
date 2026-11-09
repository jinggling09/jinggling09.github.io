# eu_thg_netto.csv

Netto-Treibhausgasemissionen der EU-27 je Jahr, Mio. t CO₂-Äq., für den Zielpfad in laender/eu.qmd.

- Quelle: Eurostat, Datensatz `env_air_gge` (Stand 02.06.2026), geo `EU27_2020`, airpol `GHG`, unit `MIO_T`.
- `netto_inland` = src_crf `TOTXMEMO` (gesamt mit Landnutzung, ohne Memo-Posten).
- `int_luftverkehr` = src_crf `CRF1D1A` (internationaler Luftverkehr, Memo-Posten).
- `summe` = beides zusammen; `index_1990` = summe in % von 1990.
- Abgerufen am 09.11.2026 über die Eurostat-API.

Die Abgrenzung kommt der des Europäischen Klimagesetzes nahe, ist aber nicht identisch (dort zählt auch ein Teil des Seeverkehrs):
amtlich 1990 4.726 / 2024 2.970 Mio. t (−37 %), hier 4.663 / 2.916 Mio. t (−37,5 %). Die Grafik zeigt deshalb den Index (1990 = 100).
