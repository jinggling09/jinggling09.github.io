// Bereiche der EU (Jing, 09.11.2026): Fortschrittsleiste und Bereichskarte hängen zusammen, wie Sektorleiste und Karte
// auf der Deutschland-Seite. Markup in laender/eu.qmd: div#bereiche mit .br-zeile[data-k] und Karten .br-karten .sektor[data-k].
// Ein Bereich ist immer gewählt; ohne Skript bleiben die Karten als Liste stehen.
(function () {
  var box = document.getElementById("bereiche");
  var karten = document.querySelectorAll(".br-karten .sektor[data-k]");
  if (!box || !karten.length) return;
  var detail = box.querySelector(".br-detail"), zeilen = box.querySelectorAll(".br-zeile"), karte = {};
  karten.forEach(function (k) { karte[k.dataset.k] = k; k.hidden = true; detail.appendChild(k); });
  var liste = document.querySelector(".br-karten"); if (liste) liste.hidden = true;
  box.classList.add("br-js");
  function waehlen(k) {
    if (!karte[k]) return;
    Object.keys(karte).forEach(function (n) { karte[n].hidden = n !== k; });
    zeilen.forEach(function (z) { z.setAttribute("aria-pressed", z.dataset.k === k ? "true" : "false"); if (z.dataset.k === k) detail.style.setProperty("--s", z.style.getPropertyValue("--s")); });
  }
  zeilen.forEach(function (z) { z.addEventListener("click", function () { waehlen(z.dataset.k); }); });
  waehlen(zeilen[0].dataset.k);
})();
