// Startseite: Klick auf einen Einstieg in der Zeichnung öffnet einen Notizzettel mit den Unterseiten
// (Daten je Sprache im <script type="application/json" id="sb-menue"> der index.qmd; Schlüssel = data-menue am .sb-hot).
// Ohne Daten oder Schlüssel führt der Klick wie bisher direkt zu data-href (siehe startbild.js).
(function () {
  var quelle = document.getElementById("sb-menue"), bild = document.querySelector(".startbild .sb-bild");
  if (!quelle || !bild) return;
  var daten = JSON.parse(quelle.textContent);
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // kleine Strichzeichnungen, 24 × 24, nur Linien (wie die Zeichnung der Startseite)
  var icons = {
    thermo: "M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z M12 9v8",
    welle: "M3 15c2.2-2.4 4.4 2.4 6.6 0s4.4 2.4 6.6 0 3.3-1.2 4.8 0 M3 20c2.2-2.4 4.4 2.4 6.6 0s4.4 2.4 6.6 0 3.3-1.2 4.8 0 M12 3c2 2.6 3 4.3 3 5.6a3 3 0 0 1-6 0c0-1.3 1-3 3-5.6z",
    balken: "M2 21h20 M5 21v-8 M10 21V5 M15 21v-11 M20 21v-5",
    blitz: "M13 2 5 14h6l-1 8 8-12h-6z",
    flagge: "M5 22V3 M5 4h12l-2.5 4 2.5 4H5",
    preis: "M3 12V3h9l9 9-9 9z M7.5 7.5h.01",
    waage: "M12 3v17 M6 21h12 M4 7h16 M4 7l-2.5 6h5z M20 7l-2.5 6h5z",
    container: "M2 9h20v10H2z M6 9v10 M10 9v10 M14 9v10 M18 9v10 M5 9l2-3h10l2 3",
    karte: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14",
    solar: "M3 18h18l-3-9H6z M9.5 9 8.5 18 M14.5 9l1 9 M4.5 13.5h15 M12 18v3",
    wind: "M12 22V10 M12 10V3 M12 10l6 3.5 M12 10l-6 3.5 M9 22h6",
    haus: "M3 11l9-7 9 7 M5 9.5V20h14V9.5 M9 15c1-1 2 1 3 0s2 1 3 0",
    h2: "M3 12a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0 M14 12a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0 M10 12h4",
    bericht: "M6 2h9l4 4v16H6z M14 2v5h5 M9 12h7 M9 16h7",
    haken: "M4 4h16v16H4z M8 12l3 3 5-6",
    muenze: "M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0 M12 6.5v11 M15 9.5h-4a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9",
    server: "M4 3h16v7H4z M4 14h16v7H4z M8 6.5h.01 M8 17.5h.01 M12 10v4",
    fabrik: "M2 21V11l6 4v-4l6 4V4h4v17z M2 21h20"
  };
  var NS = "http://www.w3.org/2000/svg";
  function icon(name) {
    var s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "sm-icon");
    p.setAttribute("d", icons[name] || icons.karte); p.setAttribute("pathLength", "1");
    s.appendChild(p); return s;
  }

  // Icons auch für die Zettel der Zoom-Startseite (startbild.js); dort öffnet der Klick heranfliegend,
  // der Notizzettel beim Überfahren entfällt (data-zoom am SVG, bisher nur DE)
  window.sbIcon = icon;
  if (document.getElementById("sb-erde") && document.getElementById("sb-erde").dataset.zoom) return;

  var zettel = null, offenBei = null;
  function schliessen(fokus) {
    if (!zettel) return;
    var z = zettel; zettel = null;
    if (offenBei) { offenBei.classList.remove("offen"); offenBei.setAttribute("aria-expanded", "false"); if (fokus) offenBei.focus(); }
    offenBei = null;
    z.classList.remove("da");
    setTimeout(function () { z.remove(); }, ruhig ? 0 : 220);
  }

  function oeffnen(h, perMaus) {
    var eintrag = daten[h.dataset.menue];
    if (zettel && offenBei === h) { if (!perMaus) schliessen(true); return; }
    schliessen(false);
    offenBei = h; h.classList.add("offen"); h.setAttribute("aria-expanded", "true");

    var z = document.createElement("div");
    z.className = "sb-zettel"; z.setAttribute("role", "dialog"); z.setAttribute("aria-label", eintrag.titel);
    var kopf = document.createElement("div"); kopf.className = "sz-kopf";
    var titel = document.createElement("span"); titel.className = "sz-titel"; titel.textContent = eintrag.titel;
    var zu = document.createElement("button"); zu.type = "button"; zu.className = "sz-zu"; zu.setAttribute("aria-label", daten._zu || "Schließen"); zu.textContent = "×";
    zu.addEventListener("click", function () { schliessen(true); });
    kopf.append(titel, zu); z.appendChild(kopf);
    var liste = document.createElement("ul");
    eintrag.seiten.forEach(function (s, i) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = s.href; a.style.setProperty("--i", i);
      var t = document.createElement("span"); t.textContent = s.text;
      a.append(icon(s.icon), t); li.appendChild(a); liste.appendChild(li);
    });
    z.appendChild(liste);
    bild.appendChild(z);

    // nach außen in den freien Rand aufklappen (linke Einstiege nach links, rechte nach rechts);
    // reicht der Platz nicht, nach innen über die Erde; Einstieg oben in der Mitte: darunter
    var br = bild.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    var pr = h.querySelector(".sb-punkt").getBoundingClientRect();
    var px = pr.left + pr.width / 2 - br.left, py = pr.top + pr.height / 2 - br.top;
    var min = 12 - br.left, max = vw - 12 - br.left;   // erlaubter Bereich: ganzes Fenster, 12 px Rand
    var w = z.offsetWidth, hh = z.offsetHeight, links, oben;
    if (max - min < 560) { links = min + (max - min - w) / 2; oben = py + 18; }
    else if (Math.abs(px - br.width / 2) < br.width * .15) { links = px - w / 2; oben = py + 22; }
    // der Zettel darf die eigene Beschriftung verdecken – sein Titel nennt sie ja; nur der Punkt bleibt frei
    else if (px > br.width / 2) { links = px + 22 + w <= max ? px + 22 : px - w - 22; oben = py - 34; }
    else { links = px - 22 - w >= min ? px - 22 - w : (min + w <= px - 14 ? min : px + 22); oben = py - 34; }
    links = Math.max(min, Math.min(links, max - w));
    oben = Math.max(0, Math.min(oben, br.height - hh));
    z.style.left = links + "px"; z.style.top = oben + "px";
    z.style.transformOrigin = (px - parseFloat(z.style.left)) + "px " + (py - parseFloat(z.style.top)) + "px";
    z.addEventListener("pointerenter", halten);
    z.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") spaeterZu(); });
    zettel = z;
    requestAnimationFrame(function () { requestAnimationFrame(function () { z.classList.add("da"); }); });
    var erster = z.querySelector("a"); if (erster && h.dataset.tastatur) { erster.focus(); delete h.dataset.tastatur; }
  }

  // Maus (Jing, 03.11.2026): Zettel öffnet beim Überfahren und schließt beim Verlassen (kurze Pause,
  // damit man vom Punkt in den Zettel wechseln kann); ein Klick führt dann direkt zur Hauptseite.
  // Touch und Tastatur: Klick bzw. Enter öffnet und schließt wie bisher.
  var maus = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches, timer = null;
  function halten() { clearTimeout(timer); }
  function spaeterZu() { clearTimeout(timer); timer = setTimeout(function () { schliessen(false); }, 280); }

  document.querySelectorAll(".startbild .sb-hot[data-menue]").forEach(function (h) {
    if (!daten[h.dataset.menue]) return;
    h.setAttribute("aria-haspopup", "dialog"); h.setAttribute("aria-expanded", "false");
    h.sbMenue = function (tastatur) {
      if (maus && !tastatur) { location.href = h.dataset.href; return; }
      if (tastatur) h.dataset.tastatur = "1";
      oeffnen(h);
    };
    h.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { halten(); oeffnen(h, true); } });
    h.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") spaeterZu(); });
  });
  document.addEventListener("click", function (e) {
    if (zettel && !zettel.contains(e.target) && !(offenBei && offenBei.contains(e.target))) schliessen(false);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") schliessen(true); });
  window.addEventListener("resize", function () { schliessen(false); });
})();
