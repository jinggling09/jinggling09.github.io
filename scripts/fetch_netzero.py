"""Lädt die Netto-null-Ziele von EU, Deutschland und China aus der Net-Zero-Tracker-API
und erzeugt daraus die Vergleichstabelle der Seite „Ziele" in drei Sprachen.

Quelle: Net Zero Tracker (ECIU, Data-Driven EnviroLab, NewClimate Institute, Oxford Net Zero),
https://zerotracker.net/docs/api – Lizenz CC BY-NC 4.0.

Ausgabe:
  daten/data/netzero.json   – ausgewählte Felder je Akteur + Abrufdatum
  ziele/_nzt-tabelle.md     – Tabelle Deutsch   (eingebunden per {{< include >}})
  en/ziele/_nzt-tabelle.md  – Tabelle Englisch
  zh/ziele/_nzt-tabelle.md  – Tabelle Chinesisch

Aufruf:
  python scripts/fetch_netzero.py            # abrufen und Tabellen erzeugen
  python scripts/fetch_netzero.py --offline  # nur Tabellen aus vorhandener JSON erzeugen

Nur Standardbibliothek. Das Abrufdatum ändert sich nur, wenn sich die Daten geändert haben,
damit der Workflow nicht bei jedem Lauf einen Commit erzeugt.
"""

from __future__ import annotations

import datetime as dt
import json
import sys
import time
import urllib.request
from pathlib import Path

API = "https://zerotracker.net/api/v1/countries/{}"
ROOT = Path(__file__).resolve().parent.parent
JSON_OUT = ROOT / "daten" / "data" / "netzero.json"
MD_OUT = {
    "de": ROOT / "ziele" / "_nzt-tabelle.md",
    "en": ROOT / "en" / "ziele" / "_nzt-tabelle.md",
    "zh": ROOT / "zh" / "ziele" / "_nzt-tabelle.md",
}

# Spaltenreihenfolge: EU, Deutschland, China
ACTORS = ["COU-0197", "COU-0028", "COU-0019"]

FIELDS = [
    "id_code", "name", "last_updated",
    "end_target", "end_target_year", "end_target_status",
    "gasses_coverage",
    "interim_target", "interim_target_year",
    "interim_target_percentage_reduction", "interim_target_baseline_year",
    "has_plan", "reporting_mechanism", "accountability",
    "carbon_credit_offsets", "international_aviation", "international_shipping",
]

# Gesetzlich festgelegte Zieljahre, die Vorrang vor dem NZT-Datenfeld haben.
# Weicht der NZT-Wert ab, wird das Gesetz angezeigt und die Abweichung per Fußnote erklärt.
LEGAL_YEAR = {
    "COU-0028": {
        "year": "2045",
        "note": {
            "de": "Gesetzliches Ziel nach § 3 Abs. 2 KSG (seit der Novelle 2021). Im NZT-Datenfeld „Zieljahr\" steht {nzt}, obwohl der dort zitierte Gesetzestext 2045 nennt.",
            "en": "Statutory target under § 3(2) KSG (since the 2021 amendment). The NZT \"target year\" field shows {nzt}, although the legal text quoted by NZT says 2045.",
            "zh": "依据《联邦气候保护法》第 3 条第 2 款（2021 年修订后）。NZT 数据中“目标年份”字段为 {nzt}，但其引用的法律原文写的是 2045 年。",
        },
    },
}

T = {
    "de": {
        "head": ["Kriterium", "EU", "Deutschland", "China"],
        "rows": ["Zielart", "Zieljahr", "Status", "Erfasste Gase", "Zwischenziel", "Detaillierter Plan",
                 "Berichterstattung", "Formale Rechenschaftspflicht", "Externe Zertifikate zulässig",
                 "Int. Luft- und Seeverkehr erfasst", "Letzte Aktualisierung NZT"],
        "end_target": {"Net zero": "Netto null", "Carbon neutral(ity)": "Klimaneutralität",
                       "Climate neutral": "Klimaneutralität", "GHG neutral(ity)": "THG-Neutralität"},
        "status": {"In law": ("Gesetz", "gesetz"), "In policy document": ("Politikdokument", "politik"),
                   "Declaration / pledge": ("Absichtserklärung", "politik"),
                   "Proposed / in discussion": ("in Diskussion", "politik")},
        "gases": {"Carbon dioxide and other GHGs": "CO₂ und weitere THG", "Carbon dioxide only": "nur CO₂"},
        "reduction": "−{pct} % bis {year} (ggü. {base})",
        "intensity": "CO₂-Intensitätsziel bis {year}",
        "reporting": {"Annual reporting": "jährlich", "Less than annual reporting": "seltener als jährlich",
                      "No reporting mechanism": "keine"},
        "yes": "ja", "no": "nein", "na": "nicht angegeben", "plan_no": "nein (nach NZT-Kriterien)",
        "split": "Luftverkehr: {a} · Seeverkehr: {s}",
        "date": lambda d: d.strftime("%d.%m.%Y"),
        "legend": "Daten: Net Zero Tracker, abgerufen am {date} über die öffentliche API · Lizenz [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) · Die Tabelle wird bei jedem Neubau der Seite automatisch aktualisiert.",
    },
    "en": {
        "head": ["Criterion", "EU", "Germany", "China"],
        "rows": ["Target type", "Target year", "Status", "Gases covered", "Interim target", "Detailed plan",
                 "Reporting", "Formal accountability", "Offset credits allowed",
                 "Int. aviation & shipping covered", "Last updated by NZT"],
        "end_target": {"Net zero": "Net zero", "Carbon neutral(ity)": "Carbon neutrality",
                       "Climate neutral": "Climate neutrality", "GHG neutral(ity)": "GHG neutrality"},
        "status": {"In law": ("Law", "gesetz"), "In policy document": ("Policy document", "politik"),
                   "Declaration / pledge": ("Pledge", "politik"),
                   "Proposed / in discussion": ("Proposed", "politik")},
        "gases": {"Carbon dioxide and other GHGs": "CO₂ and other GHGs", "Carbon dioxide only": "CO₂ only"},
        "reduction": "−{pct} % by {year} (vs. {base})",
        "intensity": "CO₂ intensity target for {year}",
        "reporting": {"Annual reporting": "annual", "Less than annual reporting": "less than annual",
                      "No reporting mechanism": "none"},
        "yes": "yes", "no": "no", "na": "not specified", "plan_no": "no (by NZT criteria)",
        "split": "aviation: {a} · shipping: {s}",
        "date": lambda d: f"{d.day} {d.strftime('%b %Y')}",
        "legend": "Data: Net Zero Tracker, retrieved {date} via the public API · licence [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) · The table is refreshed automatically each time the site is rebuilt.",
    },
    "zh": {
        "head": ["评估项", "欧盟", "德国", "中国"],
        "rows": ["目标类型", "目标年份", "状态", "覆盖气体", "中期目标", "详细实施计划",
                 "报告频率", "正式问责机制", "允许使用外部碳信用", "覆盖国际航空和航运", "NZT 最近更新"],
        "end_target": {"Net zero": "净零", "Carbon neutral(ity)": "气候中和",
                       "Climate neutral": "气候中和", "GHG neutral(ity)": "温室气体中和"},
        "status": {"In law": ("法律", "gesetz"), "In policy document": ("政策文件", "politik"),
                   "Declaration / pledge": ("宣言承诺", "politik"),
                   "Proposed / in discussion": ("讨论中", "politik")},
        "gases": {"Carbon dioxide and other GHGs": "二氧化碳及其他温室气体", "Carbon dioxide only": "仅二氧化碳"},
        "reduction": "{year} 年比 {base} 年减少 {pct}%",
        "intensity": "{year} 年碳强度目标",
        "reporting": {"Annual reporting": "每年", "Less than annual reporting": "低于每年一次",
                      "No reporting mechanism": "无"},
        "yes": "是", "no": "否", "na": "未说明", "plan_no": "无（按 NZT 标准）",
        "split": "航空：{a} · 航运：{s}",
        "date": lambda d: d.strftime("%Y-%m-%d"),
        "legend": "数据：Net Zero Tracker，{date} 通过公开 API 获取 · 许可证 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) · 网站每次重新构建时，此表自动更新。",
    },
}


def fetch(code: str) -> dict:
    req = urllib.request.Request(API.format(code), headers={"User-Agent": "jinggling09.github.io data refresh"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.load(resp)
            return {k: data.get(k) for k in FIELDS}
        except Exception as exc:  # noqa: BLE001
            if attempt == 3:
                raise
            print(f"  Fehler bei {code}: {exc} – neuer Versuch", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("unreachable")


def yes_no(v, t, plan=False):
    if v == "Yes":
        return t["yes"]
    if v == "No":
        return t["plan_no"] if plan else t["no"]
    return t["na"]


def cells(e: dict, lang: str) -> list[str]:
    t = T[lang]
    code = e["id_code"]

    end_target = t["end_target"].get(e["end_target"], e["end_target"] or t["na"])
    if lang == "zh" and e["end_target"] == "Carbon neutral(ity)" and e["gasses_coverage"] == "Carbon dioxide only":
        end_target = "碳中和"

    year = e["end_target_year"] or t["na"]
    legal = LEGAL_YEAR.get(code)
    if legal and legal["year"] != year:
        year = f"**{legal['year']}** ^[{legal['note'][lang].format(nzt=year)}]"

    label, cls = t["status"].get(e["end_target_status"], (e["end_target_status"] or t["na"], "politik"))
    status = f"[{label}]{{.status-chip .{cls}}}"

    gases = t["gases"].get(e["gasses_coverage"], t["na"])

    if e["interim_target"] == "Emissions reduction target" and e["interim_target_percentage_reduction"]:
        interim = t["reduction"].format(pct=e["interim_target_percentage_reduction"],
                                        year=e["interim_target_year"], base=e["interim_target_baseline_year"])
    elif e["interim_target"] == "Emissions intensity target":
        # Das Basisjahr im NZT-Datensatz ist hier nicht immer konsistent – daher ohne Basisjahr.
        interim = t["intensity"].format(year=e["interim_target_year"])
    else:
        interim = e["interim_target"] or t["na"]

    plan = yes_no(e["has_plan"], t, plan=True)
    reporting = t["reporting"].get(e["reporting_mechanism"], t["na"])
    accountability = yes_no(e["accountability"], t)
    offsets = yes_no(e["carbon_credit_offsets"], t)

    a, s = yes_no(e["international_aviation"], t), yes_no(e["international_shipping"], t)
    intl = a if a == s else t["split"].format(a=a, s=s)

    updated = t["date"](dt.date.fromisoformat(e["last_updated"][:10])) if e.get("last_updated") else t["na"]
    return [end_target, year, status, gases, interim, plan, reporting, accountability, offsets, intl, updated]


def render(data: dict) -> None:
    retrieved = dt.date.fromisoformat(data["abgerufen"])
    by_code = {e["id_code"]: e for e in data["akteure"]}
    for lang, path in MD_OUT.items():
        t = T[lang]
        cols = [cells(by_code[c], lang) for c in ACTORS]
        lines = [
            "<!-- Automatisch erzeugt von scripts/fetch_netzero.py – nicht von Hand bearbeiten. -->",
            "",
            "::: {.nzt-tabelle}",
            "",
            "| " + " | ".join(t["head"]) + " |",
            "|---|---|---|---|",
        ]
        for i, row in enumerate(t["rows"]):
            lines.append(f"| {row} | " + " | ".join(col[i] for col in cols) + " |")
        legend = t["legend"].format(date=t["date"](retrieved))
        lines += ["", ":::", "", f"[{legend}]{{.legende-art}}", ""]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(lines), encoding="utf-8")
        print(f"  geschrieben: {path.relative_to(ROOT)}")


def main() -> None:
    offline = "--offline" in sys.argv
    old = json.loads(JSON_OUT.read_text(encoding="utf-8")) if JSON_OUT.exists() else None

    if offline:
        if not old:
            sys.exit("Keine vorhandene netzero.json für --offline.")
        data = old
    else:
        print("Net Zero Tracker abrufen …")
        akteure = [fetch(code) for code in ACTORS]
        if old and old.get("akteure") == akteure:
            data = old  # unverändert: Abrufdatum beibehalten
            print("  keine Änderungen")
        else:
            data = {
                "quelle": "Net Zero Tracker API v1 – https://zerotracker.net/docs/api",
                "lizenz": "CC BY-NC 4.0",
                "abgerufen": dt.date.today().isoformat(),
                "akteure": akteure,
            }
            JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
            JSON_OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"  geschrieben: {JSON_OUT.relative_to(ROOT)}")
    render(data)


if __name__ == "__main__":
    main()
