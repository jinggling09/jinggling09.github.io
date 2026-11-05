// Geldfluss des KTF (Jing, 05.11.2026): Quellen → Fonds → Verwendungen, laender/deutschland.qmd.
// SVG-Teile mit data-k (Quellen, Bänder der Verwendungen, Zuflüsse) und Karten .gf-karten .gf-karte[data-k].
// Überfahren hebt einen Teil hervor, Klick wählt ihn und zeigt seine Karte im Detailfeld;
// ohne Skript bleiben alle Karten als Liste unter der Grafik stehen.
(function () {
  var box = document.getElementById("geldfluss");
  var karten = document.querySelectorAll(".gf-karten .gf-karte[data-k]");
  if (!box || !karten.length) return;

  var detail = box.querySelector(".gf-detail"), svgs = box.querySelectorAll(".gf-grafik svg");
  var karte = {}, wahl = null;
  karten.forEach(function (k) { karte[k.dataset.k] = k; k.hidden = true; detail.appendChild(k); });
  var liste = document.querySelector(".gf-karten"); if (liste) liste.hidden = true;
  box.classList.add("gf-js");
  var teile = box.querySelectorAll(".gf-grafik [data-k]");

  // Farbe des Teils (CSS-Variable --k) für den Rand des Detailfelds übernehmen
  function farbe(k) {
    var t = box.querySelector('.gf-grafik .gf-teil[data-k="' + k + '"]');
    return t ? getComputedStyle(t).getPropertyValue("--k").trim() : "";
  }
  function markieren(k) {
    svgs.forEach(function (s) { s.classList.toggle("gf-fokus", !!k); });
    teile.forEach(function (t) { t.classList.toggle("gf-an", t.dataset.k === k); });
  }
  function waehlen(k) {
    if (!karte[k]) return;
    wahl = k;
    Object.keys(karte).forEach(function (n) { karte[n].hidden = n !== k; });
    teile.forEach(function (t) { t.classList.toggle("gf-wahl", t.dataset.k === k); });
    detail.style.setProperty("--k", farbe(k));
    markieren(k);
  }

  box.querySelectorAll(".gf-grafik .gf-teil[data-k]").forEach(function (t) {
    var k = t.dataset.k;
    t.addEventListener("pointerenter", function () { markieren(k); });
    t.addEventListener("pointerleave", function () { markieren(wahl); });
    t.addEventListener("click", function () { waehlen(k); });
    t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(k); } });
  });

  waehlen("energie");
})();
