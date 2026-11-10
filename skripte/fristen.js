// Fristen-Radar (Jing, 10.11.2026): Termine für Unternehmen auf einer Zeitachse, eine Spur je Land.
// Markup in unternehmen/index.qmd: section#fristradar[data-von, data-bis, data-heute] mit Filterknöpfen [data-art],
// leerer .fr-achse und den Karten .fr-karte[data-k, data-land, data-art, data-datum, data-bis?, data-anzeige?, data-kurz, data-status].
// Das Skript zeichnet Punkte (oder Bänder bei data-bis) aus den Karten und zeigt immer eine Karte im Detailfeld.
// Ohne Skript bleiben alle Karten als Liste stehen.
(function () {
  var box = document.getElementById("fristradar");
  if (!box) return;
  var karten = [].slice.call(document.querySelectorAll(".fr-karten .fr-karte[data-k]"));   // Karten stehen nach der Section (Markdown, wegen der Belege)
  if (!karten.length) return;

  function tag(s) { return new Date(s + "T00:00:00").getTime(); }
  var von = tag(box.dataset.von), bis = tag(box.dataset.bis), heute = tag(box.dataset.heute);
  function pos(t) { return Math.max(0, Math.min(100, (t - von) / (bis - von) * 100)); }

  var LAENDER = [["de", "Deutschland"], ["eu", "EU"], ["cn", "China"]];
  var ARTEN = {}; box.querySelectorAll(".fr-filter [data-art]").forEach(function (b) { ARTEN[b.dataset.art] = b.textContent; });
  var MONATE = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
  function datumText(k) {
    if (k.dataset.anzeige) return k.dataset.anzeige;
    var d = new Date(k.dataset.datum + "T00:00:00");
    if (d.getDate() === 1 && d.getMonth() === 0) return "ab " + d.getFullYear();
    return d.getDate() + ". " + MONATE[d.getMonth()] + " " + d.getFullYear();
  }

  // Reihenfolge: chronologisch
  karten.sort(function (a, b) { return tag(a.dataset.datum) - tag(b.dataset.datum); });

  // Achse: Jahresraster, Heute-Linie, drei Spuren
  var achse = box.querySelector(".fr-achse"), html = '<div class="fr-jahre">';
  for (var j = new Date(von).getFullYear(); j <= new Date(bis).getFullYear(); j++) {
    var p = pos(tag(j + "-01-01")); if (p >= 100) break;
    html += '<span style="left:' + p + '%">' + j + "</span>";
  }
  html += '<div class="fr-heute" style="left:' + pos(heute) + '%"><span>heute</span></div></div>';
  LAENDER.forEach(function (l) { html += '<div class="fr-spur ' + l[0] + '" data-land="' + l[0] + '"><span class="fr-spur-name">' + l[1] + '</span><div class="fr-bahn"></div></div>'; });
  achse.innerHTML = html;

  // Punkte setzen; zu nahe Punkte einer Spur rücken in eine zweite oder dritte Zeile
  var punkte = {}, belegt = {};
  karten.forEach(function (k) {
    var land = k.dataset.land, t = tag(k.dataset.datum), p = pos(t);
    var bahn = achse.querySelector('.fr-spur[data-land="' + land + '"] .fr-bahn');
    var el = document.createElement("button"); el.type = "button";
    el.className = "fr-punkt"; el.dataset.k = k.dataset.k; el.dataset.art = k.dataset.art;
    el.setAttribute("aria-label", datumText(k) + ": " + k.dataset.kurz);
    el.innerHTML = '<span class="fr-tip">' + datumText(k) + " · " + k.dataset.kurz + "</span>";
    if (k.dataset.bis) {
      el.classList.add("fr-band");
      el.style.left = p + "%"; el.style.width = (pos(tag(k.dataset.bis)) - p) + "%";
      bahn.classList.add("fr-mit-band");
    } else {
      var reihen = belegt[land] = belegt[land] || [], r = 0;
      while (reihen[r] !== undefined && p - reihen[r] < 3.2) r++;
      reihen[r] = p;
      el.style.left = p + "%"; el.style.setProperty("--r", r);
    }
    if (t < heute) el.classList.add("fr-vorbei");
    bahn.appendChild(el); punkte[k.dataset.k] = el;
  });
  // Spurhöhe nach der Zahl der Zeilen
  LAENDER.forEach(function (l) {
    var n = (belegt[l[0]] || []).length;
    achse.querySelector('.fr-spur[data-land="' + l[0] + '"]').style.setProperty("--zeilen", Math.max(1, n));
  });

  // Karten ins Detailfeld holen und mit Kopfzeile versehen
  var inhalt = box.querySelector(".fr-detail-inhalt"), liste = document.querySelector(".fr-karten");
  karten.forEach(function (k) {
    var kopf = document.createElement("div"); kopf.className = "fr-kopf";
    var land = LAENDER.filter(function (l) { return l[0] === k.dataset.land; })[0][1];
    kopf.innerHTML = '<span class="fr-land ' + k.dataset.land + '">' + land + "</span>" +
      '<span class="fr-art">' + (ARTEN[k.dataset.art] || "") + "</span>" +
      '<span class="fr-datum">' + datumText(k) + "</span>" +
      '<span class="sc-status ' + ({ beschlossen: "gilt", "in Kraft": "gilt", geplant: "kommt", befristet: "kommt" }[k.dataset.status] || "offen") + '">' + k.dataset.status + "</span>";
    k.insertBefore(kopf, k.firstChild);
    k.hidden = true; inhalt.appendChild(k);
  });
  if (liste) liste.hidden = true;
  box.classList.add("fr-js");

  var filter = null, wahl = null;
  function treffer() { return karten.filter(function (k) { return !filter || k.dataset.art === filter; }); }
  function waehlen(k) {
    wahl = k;
    karten.forEach(function (x) { x.hidden = x !== k; punkte[x.dataset.k].classList.toggle("fr-wahl", x === k); punkte[x.dataset.k].setAttribute("aria-pressed", x === k ? "true" : "false"); });
    var t = treffer();
    box.querySelector(".fr-zaehler").textContent = (filter ? ARTEN[filter] + " · " : "") + (t.indexOf(k) + 1) + " von " + t.length;
    box.querySelector(".fr-detail").dataset.land = k.dataset.land;
  }
  function filtern(f) {
    filter = f;
    box.querySelectorAll(".fr-filter [data-art]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.art === (f || "") ? "true" : "false"); });
    karten.forEach(function (k) { punkte[k.dataset.k].classList.toggle("fr-aus", !!f && k.dataset.art !== f); });
    var t = treffer();
    waehlen(t.indexOf(wahl) > -1 ? wahl : (t.filter(function (k) { return tag(k.dataset.datum) >= heute; })[0] || t[0]));
  }
  function blaettern(s) { var t = treffer(), i = t.indexOf(wahl); waehlen(t[(i + s + t.length) % t.length]); }

  karten.forEach(function (k) { punkte[k.dataset.k].addEventListener("click", function () { if (filter && k.dataset.art !== filter) filtern(null); waehlen(k); }); });
  box.querySelectorAll(".fr-filter [data-art]").forEach(function (b) {
    b.addEventListener("click", function () { filtern(b.dataset.art && b.dataset.art !== filter ? b.dataset.art : null); });
  });
  box.querySelector(".fr-vor").addEventListener("click", function () { blaettern(-1); });
  box.querySelector(".fr-nach").addEventListener("click", function () { blaettern(1); });
  box.querySelector(".fr-detail").addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") blaettern(-1); else if (e.key === "ArrowRight") blaettern(1);
  });

  // Start: nächster Termin nach heute
  filtern(null);
})();
