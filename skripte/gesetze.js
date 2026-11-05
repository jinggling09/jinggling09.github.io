// Gesetzesnavigator (Jing, 05.11.2026): Haus der Klimagesetze mit drei Blickwinkeln.
// Markup in laender/deutschland.qmd: section#gesetzesnavigator mit SVG-Gruppen .gn-g[data-g, data-s, data-w, data-p],
// Filterknöpfen [data-f="s:…|w:…|p:…"] je Blickwinkel, Zeitleiste (Knöpfe mit data-g) und den Karten .gn-karten .gesetz[data-g].
// Das Skript holt die Karten in das Detailfeld und zeigt immer eine; ohne Skript bleiben alle Karten als Liste stehen.
// Das Haus gibt es zweimal (breit und schmal fürs Handy, per CSS umgeschaltet); jedes Gesetz hat daher bis zu zwei Gruppen.
(function () {
  var nav = document.getElementById("gesetzesnavigator");
  var karten = document.querySelectorAll(".gn-karten .gesetz[data-g]");
  if (!nav || !karten.length) return;

  var svgs = nav.querySelectorAll(".gn-haus svg"), inhalt = nav.querySelector(".gn-detail-inhalt");
  var gruppen = {}, alle = {}, karte = {}, reihe = [];   // gruppen: erste Gruppe (für data-*), alle: sämtliche Gruppen je Gesetz
  nav.querySelectorAll(".gn-g[data-g]").forEach(function (g) {
    var n = g.dataset.g; if (!gruppen[n]) { gruppen[n] = g; alle[n] = []; } alle[n].push(g);
  });
  function setzen(n, klasse, an) { alle[n].forEach(function (g) { g.classList.toggle(klasse, an); }); }
  function sichtbar(n) { return alle[n].filter(function (g) { return g.getClientRects().length; })[0] || gruppen[n]; }
  karten.forEach(function (k) { var n = k.dataset.g; karte[n] = k; reihe.push(n); k.hidden = true; inhalt.appendChild(k); });
  var liste = document.querySelector(".gn-karten"); if (liste) liste.hidden = true;
  nav.classList.add("gn-js");

  var zeitKnoepfe = nav.querySelectorAll(".gn-zeit button[data-g]");
  var filterKnoepfe = nav.querySelectorAll(".gn-filter button[data-f]");
  var linse = "sektor", filter = null, wahl = null;

  // Beschriftungen und Farben kommen aus den Filterknöpfen, damit sie nur an einer Stelle stehen
  function knopf(f) { return nav.querySelector('.gn-filter button[data-f="' + f + '"]'); }

  function passt(n, f) {
    if (!f) return true;
    var g = gruppen[n], art = f.slice(0, 1), wert = f.slice(2);
    if (art === "s") return g.dataset.s === wert;
    if (art === "w") return g.dataset.w === wert;
    return (g.dataset.p || "").split(" ").indexOf(wert) > -1;
  }
  function treffer() { return reihe.filter(function (n) { return passt(n, filter); }); }

  function zaehlen() {
    var t = treffer(), i = t.indexOf(wahl) + 1;
    // Detailfeld übernimmt die Farbe, die das gewählte Gesetz im aktuellen Blickwinkel trägt
    if (wahl) detail.style.setProperty("--c", getComputedStyle(sichtbar(wahl)).getPropertyValue("--c").trim());
    nav.querySelector(".gn-zaehler").textContent = filter
      ? knopf(filter).textContent + " · " + i + " von " + t.length
      : i + " von " + reihe.length;
  }

  function filtern(f) {
    filter = f;
    svgs.forEach(function (s) { s.classList.toggle("gn-fokus", !!f); });
    // Farbe des gewählten Filters für das Haus (Blickwinkel „Wer ist betroffen?“)
    var fb = f && knopf(f); nav.style.setProperty("--f", fb ? fb.style.getPropertyValue("--w") || "" : "");
    reihe.forEach(function (n) { setzen(n, "gn-an", !!f && passt(n, f)); });
    nav.querySelectorAll(".gn-saeule").forEach(function (s) { s.classList.toggle("gn-an", !!f && f === "s:" + s.dataset.s); });
    zeitKnoepfe.forEach(function (b) { b.classList.toggle("gn-aus", !!f && !passt(b.dataset.g, f)); });
    filterKnoepfe.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.f === f ? "true" : "false"); });
    var t = treffer();
    if (f && t.indexOf(wahl) < 0) waehlen(t[0]); else zaehlen();
  }

  var detail = nav.querySelector(".gn-detail");
  // nach einem Klick im Haus: Detailfeld ins Bild holen, falls es unterhalb des Fensters liegt
  function zeigen() {
    var r = detail.getBoundingClientRect();
    if (r.top > innerHeight - 120) detail.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  function waehlen(n) {
    if (!karte[n]) return;
    wahl = n;
    reihe.forEach(function (k) { karte[k].hidden = k !== n; setzen(k, "gn-wahl", k === n); });
    zeitKnoepfe.forEach(function (b) { b.classList.toggle("gn-wahl", b.dataset.g === n); });

    // Einordnung: Sektor, Wirkweise, Betroffene als Marken
    var g = gruppen[n], tags = nav.querySelector(".gn-tags"); tags.innerHTML = "";
    function marke(f, titel) {
      var b = knopf(f); if (!b) return;
      var m = document.createElement("button"); m.type = "button"; m.className = "gn-tag";
      m.innerHTML = "<small>" + titel + "</small> " + b.textContent;
      if (b.style.getPropertyValue("--w")) m.style.setProperty("--w", b.style.getPropertyValue("--w"));
      m.addEventListener("click", function () { linseSetzen({ s: "sektor", w: "wirkweise", p: "wer" }[f[0]]); filtern(f); });
      tags.appendChild(m);
    }
    marke("s:" + g.dataset.s, "Sektor");
    marke("w:" + g.dataset.w, "Wirkweise");
    (g.dataset.p || "").split(" ").filter(Boolean).forEach(function (p) { marke("p:" + p, "betrifft"); });

    // Termine aus der Zeitleiste
    var termine = nav.querySelector(".gn-termine"), zeilen = [];
    zeitKnoepfe.forEach(function (b) { if (b.dataset.g === n) zeilen.push("<li><b>" + b.closest("li").querySelector(".gn-jahr").textContent + "</b> " + b.textContent + "</li>"); });
    termine.innerHTML = zeilen.length ? "<span>Termine</span><ul>" + zeilen.join("") + "</ul>" : "";
    zaehlen();
  }

  // Klick auf ein Gesetz (Haus oder Zeitleiste): passenden Filter des aktuellen Blickwinkels setzen, dann wählen.
  // Sektor → seine Säule, Wirkweise → sein Instrument, Betroffene → aktuelle Gruppe, sonst die erste des Gesetzes.
  function anklicken(n) {
    var g = gruppen[n], f = null;
    if (linse === "sektor") f = "s:" + g.dataset.s;
    else if (linse === "wirkweise") f = "w:" + g.dataset.w;
    else if (filter && passt(n, filter)) f = filter;
    else { var p = (g.dataset.p || "").split(" ").filter(Boolean)[0]; f = p ? "p:" + p : null; }
    if (f !== filter) filtern(f);
    waehlen(n);
  }

  function blaettern(schritt) {
    var t = treffer(), i = t.indexOf(wahl);
    waehlen(t[(i + schritt + t.length) % t.length]);
  }

  function linseSetzen(l) {
    linse = l; nav.dataset.linse = l;
    nav.querySelectorAll(".gn-linsen [data-linse]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.linse === l ? "true" : "false"); });
    nav.querySelectorAll(".gn-filter").forEach(function (f) { f.hidden = f.dataset.linse !== l; });
  }

  nav.querySelectorAll(".gn-linsen [data-linse]").forEach(function (b) {
    b.addEventListener("click", function () { linseSetzen(b.dataset.linse); filtern(null); });
  });
  filterKnoepfe.forEach(function (b) {
    b.addEventListener("click", function () { filtern(filter === b.dataset.f ? null : b.dataset.f); });
  });
  reihe.forEach(function (n) {
    alle[n].forEach(function (g) {
      g.addEventListener("click", function () { anklicken(n); zeigen(); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); anklicken(n); zeigen(); } });
    });
  });
  // Säule anklicken = nach diesem Sektor filtern
  nav.querySelectorAll(".gn-saeule[data-s]").forEach(function (s) {
    s.addEventListener("click", function () { var f = "s:" + s.dataset.s; linseSetzen("sektor"); filtern(filter === f ? null : f); });
  });
  zeitKnoepfe.forEach(function (b) {
    var n = b.dataset.g;
    b.addEventListener("click", function () { anklicken(n); });
    b.addEventListener("pointerenter", function () { setzen(n, "gn-vorschau", true); });
    b.addEventListener("pointerleave", function () { setzen(n, "gn-vorschau", false); });
  });
  nav.querySelector(".gn-vor").addEventListener("click", function () { blaettern(-1); });
  nav.querySelector(".gn-nach").addEventListener("click", function () { blaettern(1); });
  detail.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") blaettern(-1); else if (e.key === "ArrowRight") blaettern(1);
  });

  linseSetzen("sektor");
  waehlen(reihe[0]);
})();
