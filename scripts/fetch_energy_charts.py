"""Lädt Daten für Deutschland von der Energy-Charts-API (Fraunhofer ISE, CC BY 4.0).

Ausgabe (daten/data/):
  de_installed_yearly.csv   – installierte Leistung (GW), Ist und Zielpfad, je Jahr
  de_generation_monthly.csv – öffentliche Nettostromerzeugung bzw. Last (TWh), je Monat
  de_meta.json              – Abrufzeitpunkt, Quelle, Lizenz

Nur Standardbibliothek. Monate, die schon in der CSV stehen, werden nicht erneut
abgerufen – außer den letzten REFRESH_MONTHS (Nachkorrekturen der Quelle).
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import statistics
import sys
import time
import urllib.parse
import urllib.request
from calendar import monthrange
from pathlib import Path

API = "https://api.energy-charts.info"
OUT = Path(__file__).resolve().parent.parent / "daten" / "data"
START_MONTH = (2021, 1)
REFRESH_MONTHS = 3

# Energy-Charts-Name -> (Reihe, Art)
INSTALLED_MAP = {
    "Wind onshore": ("Wind an Land", "Ist"),
    "Wind onshore planned (EEG 2023)": ("Wind an Land", "Ziel"),
    "Wind offshore": ("Wind auf See", "Ist"),
    "Wind offshore planned (WindSeeG)": ("Wind auf See", "Ziel"),
    "Solar DC": ("Photovoltaik", "Ist"),
    "Solar planned (EEG 2023)": ("Photovoltaik", "Ziel"),
}

GENERATION_MAP = {
    "Wind onshore": "Wind an Land",
    "Wind offshore": "Wind auf See",
    "Solar": "Photovoltaik",
    "Geothermal": "Geothermie",
    "Load": "Last",
}


def get_json(path: str, **params) -> dict:
    url = f"{API}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "jinggling09.github.io data refresh"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except Exception as exc:  # noqa: BLE001 – Netzwerkfehler aller Art wiederholen
            if attempt == 3:
                raise
            wait = 5 * (attempt + 1)
            print(f"  Fehler bei {url}: {exc} – neuer Versuch in {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def fetch_installed() -> tuple[list[dict], int | None]:
    data = get_json("/installed_power", country="de", time_step="yearly",
                    installation_decommission="false")
    years = [int(t) for t in data["time"]]
    rows = []
    found = set()
    for series in data["production_types"]:
        if series["name"] not in INSTALLED_MAP:
            continue
        found.add(series["name"])
        reihe, art = INSTALLED_MAP[series["name"]]
        for year, value in zip(years, series["data"]):
            if value is not None:
                rows.append({"jahr": year, "reihe": reihe, "art": art, "gw": round(value, 3)})
    missing = set(INSTALLED_MAP) - found
    if missing:
        raise SystemExit(f"Erwartete Reihen fehlen in installed_power: {sorted(missing)}")
    return rows, data.get("last_update")


def month_energy(year: int, month: int) -> dict[str, tuple[float, float]]:
    """TWh je Reihe für einen Monat sowie Abdeckungsgrad (0–1) der Zeitreihe."""
    last_day = monthrange(year, month)[1]
    data = get_json("/public_power", country="de",
                    start=f"{year}-{month:02d}-01", end=f"{year}-{month:02d}-{last_day:02d}")
    ts = data["unix_seconds"]
    if len(ts) < 2:
        raise SystemExit(f"Zu wenige Zeitpunkte für {year}-{month:02d}")
    steps = [b - a for a, b in zip(ts, ts[1:])]
    step = statistics.median(steps)
    durations_h = [s / 3600 for s in steps] + [step / 3600]
    expected_points = last_day * 24 * 3600 / step

    result = {}
    names = {s["name"]: s["data"] for s in data["production_types"]}
    for name, reihe in GENERATION_MAP.items():
        values = names.get(name)
        if values is None:
            continue
        mwh = sum(v * h for v, h in zip(values, durations_h) if v is not None)
        valid = sum(1 for v in values if v is not None)
        result[reihe] = (round(mwh / 1e6, 4), round(min(valid / expected_points, 1.0), 3))
    return result


def months_until_last_complete(today: dt.date) -> list[tuple[int, int]]:
    y, m = START_MONTH
    end_y, end_m = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    out = []
    while (y, m) <= (end_y, end_m):
        out.append((y, m))
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    return out


def load_existing(path: Path) -> dict[str, list[dict]]:
    by_month: dict[str, list[dict]] = {}
    if path.exists():
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                by_month.setdefault(row["monat"], []).append(row)
    return by_month


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    today = dt.date.today()

    print("Installierte Leistung …")
    installed, last_update = fetch_installed()
    with (OUT / "de_installed_yearly.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["jahr", "reihe", "art", "gw"])
        w.writeheader()
        w.writerows(sorted(installed, key=lambda r: (r["reihe"], r["art"], r["jahr"])))

    gen_path = OUT / "de_generation_monthly.csv"
    existing = load_existing(gen_path)
    months = months_until_last_complete(today)
    refresh = {f"{y}-{m:02d}" for y, m in months[-REFRESH_MONTHS:]}

    rows = []
    for y, m in months:
        key = f"{y}-{m:02d}"
        if key in existing and key not in refresh:
            rows.extend(existing[key])
            continue
        print(f"Erzeugung {key} …")
        for reihe, (twh, cov) in month_energy(y, m).items():
            rows.append({"monat": key, "reihe": reihe, "twh": twh, "abdeckung": cov})
        time.sleep(0.5)

    with gen_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["monat", "reihe", "twh", "abdeckung"])
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["monat"], r["reihe"])))

    meta = {
        "abgerufen": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"),
        "quelle": "Energy-Charts (Fraunhofer ISE), api.energy-charts.info",
        "lizenz": "CC BY 4.0",
        "installed_last_update": (
            dt.datetime.fromtimestamp(last_update, dt.timezone.utc).strftime("%Y-%m-%d")
            if last_update else None
        ),
        "letzter_monat": months[-1] and f"{months[-1][0]}-{months[-1][1]:02d}",
    }
    (OUT / "de_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
                                      encoding="utf-8")
    print("Fertig:", meta)


if __name__ == "__main__":
    main()
