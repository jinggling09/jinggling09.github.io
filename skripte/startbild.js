// Startseite: gezeichnete Erde mit EU, Deutschland und China (von Jing gewählt, 21.10.2026).
// Landmassen aus Natural Earth (world-atlas, 1:50 Mio., feinere Küsten seit 05.11.2026), Projektion mit d3-geo.
// Sprache, Beschriftungen und Ziele der Links stehen als data-Attribute am <svg id="sb-erde">.
(function () {
  var svg = document.getElementById("sb-erde");
  if (!svg || !window.d3 || !window.topojson) return;
  var namen = JSON.parse(svg.dataset.namen), links = JSON.parse(svg.dataset.links);
  // EU-27 (ISO 3166-1 numerisch); China einschließlich Taiwan wie auf den übrigen Karten der Website
  var EU = ["040","056","100","191","196","203","208","233","246","250","276","300","348","372","380","428","440","442","470","528","616","620","642","703","705","724","752"];
  var CN = ["156", "158"];
  // Flüssiger (Jing, 09.11.2026): nur zeichnen, was im Bild liegt, und Koordinaten auf eine Nachkommastelle runden
  var proj = d3.geoOrthographic().scale(250).translate([400, 400]).clipAngle(90).clipExtent([[-60, -20], [820, 660]]).precision(.6);
  var pfad = d3.geoPath(proj);
  if (pfad.digits) pfad.digits(1);
  var basis = [-58, -32, 0], rot = basis.slice();
  var grob, fein, punkte;   // Kartendaten 1:110 Mio. für die ganze Kugel, 1:50 Mio. erst beim Heranzoomen
  var aktiv = null, groesse = { eu: 24, de: 24, cn: 24 }, weich = true;
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gezogen = false, t0 = performance.now();
  var nah = null, fliegt = false, skala = 250;   // Heranzoomen (Jing, 06.11.2026): nah = gezeigte Region
  var el = function (id) { return document.getElementById(id); };

  function zeichne() {
    proj.rotate(rot).scale(skala);
    var k = fein && skala > 420 && !fliegt ? fein : grob;   // im Flug grob, danach fein
    el("sb-gitter").setAttribute("d", pfad(gitter) || "");
    el("sb-land").setAttribute("d", pfad(k.land) || "");
    el("sb-eu").setAttribute("d", pfad(k.eu) || "");
    el("sb-cn").setAttribute("d", pfad(k.cn) || "");
    el("sb-de").setAttribute("d", pfad(k.de) || "");
    // Handelsweg Shanghai → Rotterdam (Großkreis) für den Einstieg „Unternehmen“
    if (el("sb-handel")) el("sb-handel").setAttribute("d", pfad({ type: "LineString", coordinates: [[121.5, 31.2], [4.5, 51.9]] }) || "");
    punkte.forEach(function (p) {
      var sicht = d3.geoDistance(p.lonlat, [-rot[0], -rot[1]]) < Math.PI / 2 - 0.15;
      p.el.style.display = sicht ? "" : "none";
      if (p.hit) p.hit.style.display = sicht ? "" : "none";
      if (!sicht) return;
      var xy = proj(p.lonlat);
      var soll = aktiv === p.key ? 40 : 24;
      groesse[p.key] = weich ? groesse[p.key] + (soll - groesse[p.key]) * .25 : soll;
      p.el.setAttribute("x", xy[0] + p.dx); p.el.setAttribute("y", xy[1] + p.dy);
      p.el.setAttribute("font-size", groesse[p.key].toFixed(1));
      p.el.style.strokeWidth = aktiv === p.key ? "6px" : "";
      if (p.hit) { p.hit.setAttribute("cx", xy[0]); p.hit.setAttribute("cy", xy[1]); }
    });
  }
  function setzeAktiv(key, alt) {
    if (key) aktiv = key; else if (aktiv === alt) aktiv = null;
    if (ruhig || gezogen || nah || themaErde) zeichne();
  }
  // Beschriftungen sind selbst klickbar; Deutschland bekommt einen unsichtbaren Kreis,
  // damit es innerhalb der EU gut zu treffen ist
  function legeAn() {
    var g = el("sb-namen"), ns = "http://www.w3.org/2000/svg";
    punkte.forEach(function (p) {
      if (p.key === "de") {
        p.hit = document.createElementNS(ns, "circle");
        p.hit.setAttribute("r", "20"); p.hit.setAttribute("fill", "transparent"); p.hit.setAttribute("class", "sb-treffer");
        g.appendChild(p.hit);
      }
      p.el = document.createElementNS(ns, "text");
      p.el.setAttribute("fill", p.farbe); p.el.setAttribute("text-anchor", p.anker || "start");
      if (p.halo) p.el.style.stroke = p.halo;
      p.el.textContent = namen[p.key]; g.appendChild(p.el);
      [p.el, p.hit].forEach(function (z) {
        if (!z) return;
        z.addEventListener("pointerenter", function () { setzeAktiv(p.key); });
        z.addEventListener("pointerleave", function () { setzeAktiv(null, p.key); });
        z.addEventListener("click", function () { klick(p.key); });
      });
    });
  }

  var gitter = d3.geoGraticule10();
  function laden(n) { return fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-" + n + ".json").then(function (r) { return r.json(); }).then(aufbereiten); }
  function aufbereiten(topo) {
    var alle = topojson.feature(topo, topo.objects.countries).features;
    return {
      land: topojson.merge(topo, topo.objects.countries.geometries),
      eu: { type: "FeatureCollection", features: alle.filter(function (f) { return EU.indexOf(f.id) >= 0 && f.id !== "276"; }) },
      cn: { type: "FeatureCollection", features: alle.filter(function (f) { return CN.indexOf(f.id) >= 0; }) },
      de: { type: "FeatureCollection", features: alle.filter(function (f) { return f.id === "276"; }) }
    };
  }
  laden("110m").then(function (k) {
    grob = k;
    laden("50m").then(function (f) { fein = f; }).catch(function () {});
    punkte = [
      { key: "eu", lonlat: [2, 47], dx: -10, dy: 6, anker: "end", farbe: "#3c5a8a" },
      { key: "de", lonlat: [10.4, 51.2], dx: 6, dy: -14, farbe: "#8a6a00" },
      { key: "cn", lonlat: [103, 35], dx: 0, dy: 8, anker: "middle", farbe: "#ffffff", halo: "#7a2a1e" }
    ];
    legeAn();
    zeichne();
    // sanftes Pendeln, damit Europa und China sichtbar bleiben; Ziehen dreht, Doppelklick setzt zurück
    function schritt(t) {
      if (!gezogen && !nah && !fliegt && !themaErde) { rot = [basis[0] + 14 * Math.sin((t - t0) / 6000), basis[1], 0]; zeichne(); }
      requestAnimationFrame(schritt);
    }
    if (!ruhig) requestAnimationFrame(schritt); else weich = false;
    // ohne Pendeln nur nachzeichnen, solange eine Beschriftung noch wächst oder schrumpft (sonst ruht die Kugel)
    function waechst() { return punkte.some(function (p) { return Math.abs(groesse[p.key] - (aktiv === p.key ? 40 : 24)) > .3; }); }
    setInterval(function () { if ((gezogen || ruhig || nah || themaErde) && !fliegt && waechst()) zeichne(); }, 40);
    var ids = { "sb-eu": "eu", "sb-de": "de", "sb-cn": "cn" };
    Object.keys(ids).forEach(function (id) {
      el(id).addEventListener("pointerenter", function () { setzeAktiv(ids[id]); });
      el(id).addEventListener("pointerleave", function () { setzeAktiv(null, ids[id]); });
    });
    var welt = el("sb-welt"), start = null, weg = 0, ziel = null;
    welt.addEventListener("pointerdown", function (e) {
      ziel = ids[e.target.id]; if (ziel) { aktiv = ziel; zeichne(); }
      weg = 0; start = nah || fliegt ? null : [e.clientX, e.clientY, rot[0], rot[1]];
      if (start) welt.setPointerCapture(e.pointerId);
      if (nah && ziel) klick(ziel);   // Klick ins Meer: siehe „hoch“ unten
    });
    welt.addEventListener("pointermove", function (e) {
      if (!start) return;
      weg = Math.max(weg, Math.abs(e.clientX - start[0]) + Math.abs(e.clientY - start[1]));
      if (weg < 5) return;
      gezogen = true;
      rot = [start[2] + (e.clientX - start[0]) * .4, Math.max(-70, Math.min(70, start[3] - (e.clientY - start[1]) * .4)), 0];
      zeichne();
    });
    welt.addEventListener("pointerup", function () { var war = start; start = null; if (war && weg < 5 && ziel) klick(ziel); });
    welt.addEventListener("dblclick", function () { gezogen = false; t0 = performance.now(); });
  }).catch(function () { /* ohne Kartendaten bleibt die blaue Kugel stehen */ });


  // ---------- Heranzoomen wie in einem Atlas (Jing, 06.11.2026) ----------
  // Klick auf EU, Deutschland oder China dreht die Region in die Mitte und vergrößert sie innerhalb der Kugel;
  // die Zeichnung ringsum blendet aus, ein Zettel zeigt Kennzahlen und Wege auf die Unterseiten.
  // Brotkrumen „Erde › Deutschland“, Esc oder Klick ins Leere führen zurück. Ein zweiter Klick öffnet die Länderseite.
  var regionen = JSON.parse((document.getElementById("sb-regionen") || { textContent: "{}" }).textContent);
  var ZIELE = { eu: { mitte: [12, 50], skala: 640 }, de: { mitte: [10.4, 51.2], skala: 1900 }, cn: { mitte: [104, 36], skala: 560 } };
  var bild = svg.closest(".sb-bild"), krumen = null, zettel = null;

  function fliegen(zRot, zSkala, fertig) {
    var aRot = rot.slice(), aSkala = skala, dauer = ruhig ? 0 : 1100, t1 = performance.now();
    var dLon = ((zRot[0] - aRot[0] + 540) % 360) - 180;   // kürzester Weg um die Erde
    fliegt = true;
    function bild_(t) {
      var x = dauer ? Math.min(1, (t - t1) / dauer) : 1, e = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      rot = [aRot[0] + dLon * e, aRot[1] + (zRot[1] - aRot[1]) * e, 0];
      // Skala geometrisch, damit das Heranfliegen gleichmäßig wirkt
      skala = aSkala * Math.pow(zSkala / aSkala, e);
      zeichne();
      if (x < 1) requestAnimationFrame(bild_); else { fliegt = false; zeichne(); if (fertig) fertig(); }   // gelandet: feine Küsten
    }
    requestAnimationFrame(bild_);
  }

  function klick(key) {
    if (fliegt) return;
    if (nah === key) { location.href = links[key]; return; }
    hinein(key);
  }
  function hinein(key) {
    var z = ZIELE[key]; if (!z) return;
    if (thema && !themaErde) themaZurueck(true);
    else if (themaErde) { ohneFlugSchliessen(); vbFliegen(vb0, function () { svg.classList.remove("sb-thema"); }); }
    nah = key; aktiv = key; gezogen = false;
    svg.classList.add("sb-nah"); svg.dataset.nah = key; bild.classList.add("sb-bild-nah");
    zeigeKrumen(); zeigeZettel(null);
    fliegen([-z.mitte[0], -z.mitte[1], 0], z.skala, function () { zeigeZettel(key); });
  }
  function zurueck(bis) {
    if (fliegt) return;
    nah = null; aktiv = null; delete svg.dataset.nah; bild.classList.remove("sb-bild-nah");
    zeigeZettel(null);
    fliegen(basis.slice(), 250, function () { svg.classList.remove("sb-nah"); t0 = performance.now(); zeigeKrumen(); });
    zeigeKrumen();
  }

  function zeigeKrumen() {
    if (!krumen) {
      krumen = document.createElement("nav"); krumen.className = "sb-krumen"; krumen.setAttribute("aria-label", regionen._erde || "Erde");
      bild.appendChild(krumen);
    }
    var kette = [["", regionen._erde || "Erde"]];
    if (nah) kette.push([nah, (regionen[nah] || {}).titel || nah]);
    else if (thema) kette.push([thema, (menue[thema] || {}).titel || thema]);
    krumen.innerHTML = "";
    kette.forEach(function (k, i) {
      if (i) krumen.appendChild(document.createTextNode(" › "));
      var letzt = i === kette.length - 1, b = document.createElement(letzt ? "span" : "button");
      b.textContent = k[1];
      if (!letzt) { b.type = "button"; b.addEventListener("click", hoch); }
      else b.className = "sb-krume-" + (nah || "thema");
      krumen.appendChild(b);
    });
    krumen.classList.toggle("da", !!(nah || thema));
  }

  function zeigeZettel(key) {
    if (zettel) { var alt = zettel; zettel = null; alt.classList.remove("da"); setTimeout(function () { alt.remove(); }, ruhig ? 0 : 250); }
    var r = key && regionen[key]; if (!r) return;
    var z = document.createElement("div"); z.className = "sb-region sb-region-" + key; z.setAttribute("role", "dialog"); z.setAttribute("aria-label", r.titel);
    var h = '<button type="button" class="sz-zu" aria-label="' + (regionen._zurueck || "Zurück") + '">×</button>'
      + '<div class="sr-titel">' + r.titel + '</div><div class="sr-unter">' + r.unter + '</div><dl>';
    r.werte.forEach(function (w) { h += "<div><dt>" + w[0] + "</dt><dd>" + w[1] + "</dd></div>"; });
    h += "</dl><ul>";
    r.links.forEach(function (l, i) { h += '<li><a href="' + l[1] + '" style="--i:' + i + '">' + l[0] + "</a></li>"; });
    h += "</ul>";
    z.innerHTML = h;
    z.querySelector(".sz-zu").addEventListener("click", hoch);
    bild.appendChild(z); zettel = z;
    requestAnimationFrame(function () { requestAnimationFrame(function () { z.classList.add("da"); }); });
  }


  // ---------- Heranzoomen auf die Einstiege (Jing, 06.11.2026) ----------
  // Klimawandel, Energiewende, Emissionen, Klimaschutz, Unternehmen: die ganze Zeichnung vergrößert sich
  // (viewBox) zum Bildteil des Einstiegs; daneben ein Zettel mit den Unterseiten aus #sb-menue.
  // Gleiche Ebene wie die Regionen: Brotkrumen „Erde › Energiewende“, Esc, × oder Klick ins Leere führen zurück.
  // #sb-menue steht im Dokument erst nach diesem Skript: beim ersten Gebrauch lesen
  var menue = {};
  function menueLaden() { if (!menue._geladen) { menue = JSON.parse((document.getElementById("sb-menue") || { textContent: "{}" }).textContent); menue._geladen = true; } }
  var vb0 = svg.getAttribute("viewBox").split(/\s+/).map(Number), vb = vb0.slice(), thema = null, vbFliegt = false;
  // Zwei Arten: „bild“ vergrößert die Zeichnung (viewBox) zum Bildteil des Einstiegs; „erde“ dreht und vergrößert
  // die Kugel wie bei den Regionen – für Einstiege ohne eigenen Bildteil (Jing, 06.11.2026).
  // bild: Mittelpunkt des Bildteils und Breite des Ausschnitts, Mitte so, dass die Schrift nicht in den weichen Rand fällt
  var THEMEN = {
    energiewende: { art: "bild", mitte: [235, 110], breite: 520, seite: "rechts" },
    emissionen: { art: "bild", mitte: [70, 230], breite: 460, seite: "rechts" },
    klimawandel: { art: "bild", mitte: [615, 100], breite: 460, seite: "links", unter: false },
    // Klimaschutz: EU und China zugleich im Blick (Ziele vergleichen); Unternehmen: Handelsweg China → EU (CBAM)
    // dazu ein Ausschnitt [x, y, Breite] der Zeichnung, damit Schrift und Kugel größer werden; oben: true ließe den Zettel nach oben aufklappen
    klimaschutz: { art: "erde", mitte: [74, 40], skala: 330, ausschnitt: [420, 140, 620] },
    unternehmen: { art: "erde", mitte: [76, 42], skala: 350, handel: true, ausschnitt: [-180, 164, 620] }
  };
  var themaErde = false;
  function vbFliegen(ziel, fertig) {
    var a = vb.slice(), dauer = ruhig ? 0 : 1000, t1 = performance.now();
    vbFliegt = true;
    function bild_(t) {
      var x = dauer ? Math.min(1, (t - t1) / dauer) : 1, e = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      vb = a.map(function (v, i) { return v + (ziel[i] - v) * e; });
      svg.setAttribute("viewBox", vb.map(function (v) { return v.toFixed(1); }).join(" "));
      if (x < 1) requestAnimationFrame(bild_); else { vbFliegt = false; if (fertig) fertig(); }
    }
    requestAnimationFrame(bild_);
  }
  // Region oder Erd-Thema ohne Rückflug beenden, damit gleich ein neuer Flug beginnen kann
  function ohneFlugSchliessen() {
    if (nah) { nah = null; aktiv = null; delete svg.dataset.nah; zeigeZettel(null); }
    if (themaErde) { themaErde = false; thema = null; delete svg.dataset.thema; zeigeThemaZettel(null); document.querySelectorAll(".sb-hot-an").forEach(function (x) { x.classList.remove("sb-hot-an"); }); }
  }
  function themaKlick(h) {
    var key = h.dataset.menue, z = THEMEN[key];
    if (vbFliegt || fliegt || !z) return;
    menueLaden();
    if (thema === key) { location.href = h.dataset.href; return; }
    // von einem Bild-Thema zum nächsten direkt weiterfliegen; nur zur Kugel hin den Ausschnitt zurücksetzen
    if (thema && !themaErde && z.art === "erde") { thema = null; delete svg.dataset.thema; zeigeThemaZettel(null); }   // Ausschnitt fliegt gleich direkt weiter
    function markieren() { document.querySelectorAll(".sb-hot").forEach(function (x) { x.classList.toggle("sb-hot-an", x === h); }); }
    if (z.art === "erde") {
      // Kugel-Themen: Kugel dreht sich, die Zeichnung bleibt stehen; der Zettel klappt an der Beschriftung auf (Jing, 06.11.2026)
      ohneFlugSchliessen(); markieren();
      thema = key; themaErde = true; svg.dataset.thema = key;
      svg.classList.add("sb-nah"); bild.classList.remove("sb-bild-nah");
      zeigeKrumen(); zeigeThemaZettel(null);
      var a_ = z.ausschnitt || vb0;
      if (z.ausschnitt) svg.classList.add("sb-thema");
      vbFliegen([a_[0], a_[1], a_[2], a_[2] * vb0[3] / vb0[2]]);
      fliegen([-z.mitte[0], -z.mitte[1], 0], z.skala, function () { zeigeThemaZettel(key, h); });
      return;
    }
    if (nah || themaErde) { ohneFlugSchliessen(); svg.classList.remove("sb-nah"); bild.classList.remove("sb-bild-nah"); fliegen(basis.slice(), 250, function () { t0 = performance.now(); }); }
    markieren();
    var f = vb0[3] / vb0[2], b = z.breite, hh = b * f;
    // Bildteil neben dem Zettel, nicht darunter; auf schmalen Bildschirmen steht der Zettel unter der Zeichnung
    var anteil = innerWidth <= 860 ? .5 : z.seite === "rechts" ? .36 : .64;
    thema = key;
    svg.classList.add("sb-thema"); svg.dataset.thema = key;
    zeigeKrumen(); zeigeThemaZettel(null);
    vbFliegen([z.mitte[0] - b * anteil, z.mitte[1] - hh / 2, b, hh], function () { zeigeThemaZettel(key, h); });
  }
  function themaZurueck(stumm) {
    if (vbFliegt || fliegt) return;
    var erde = themaErde;
    thema = null; themaErde = false; delete svg.dataset.thema;
    zeigeThemaZettel(null); if (!stumm) zeigeKrumen();
    document.querySelectorAll(".sb-hot-an").forEach(function (x) { x.classList.remove("sb-hot-an"); });
    if (erde) { bild.classList.remove("sb-bild-nah"); vbFliegen(vb0, function () { svg.classList.remove("sb-thema"); }); fliegen(basis.slice(), 250, function () { svg.classList.remove("sb-nah"); t0 = performance.now(); }); }
    else vbFliegen(vb0, function () { svg.classList.remove("sb-thema"); });
  }
  var themaZettel = null;
  function zeigeThemaZettel(key, h) {
    if (themaZettel) { var alt = themaZettel; themaZettel = null; alt.classList.remove("da"); setTimeout(function () { alt.remove(); }, ruhig ? 0 : 250); }
    var m = key && menue[key]; if (!m) return;
    var z = document.createElement("div");
    z.className = "sb-region sb-region-thema sb-unter-schrift sb-seite-" + (THEMEN[key].seite || "rechts"); z.setAttribute("role", "dialog"); z.setAttribute("aria-label", m.titel);
    z.innerHTML = '<button type="button" class="sz-zu" aria-label="' + (regionen._zurueck || "Zurück") + '">×</button><div class="sr-titel">' + m.titel + "</div><ul></ul>";
    var ul = z.querySelector("ul");
    m.seiten.forEach(function (sx, i) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = sx.href; a.style.setProperty("--i", i);
      if (window.sbIcon) a.appendChild(window.sbIcon(sx.icon));
      var t = document.createElement("span"); t.textContent = sx.text; a.appendChild(t);
      li.appendChild(a); ul.appendChild(li);
    });
    z.querySelector(".sz-zu").addEventListener("click", hoch);
    bild.appendChild(z); themaZettel = z;
    // Zettel hängt unter der Beschriftung, die Beschriftung ist sein Titel (Jing, 06.11.2026).
    // Klimawandel: links neben der Beschriftung, sonst läge er auf der Sonne.
    if (innerWidth > 860 && h) {
      var br = bild.getBoundingClientRect(), lr = h.querySelector(".sb-schrift").getBoundingClientRect();
      var links_ = lr.left - br.left - 14, oben;
      if (THEMEN[key].unter === false) {
        // links neben der Beschriftung, Oberkante auf Höhe der Schrift; Titel weiterhin die Beschriftung selbst
        oben = Math.max(48, lr.top - br.top); links_ = lr.left - br.left - z.offsetWidth - 16;
      } else {
        oben = THEMEN[key].oben ? Math.max(48, lr.top - br.top - z.offsetHeight - 6) : lr.bottom - br.top + 4;   // 48: Platz für die Brotkrumen
      }
      links_ = Math.max(-br.left + 12, Math.min(links_, document.documentElement.clientWidth - br.left - z.offsetWidth - 12));
      z.style.top = oben + "px"; z.style.left = links_ + "px"; z.style.right = "auto";
    }    requestAnimationFrame(function () { requestAnimationFrame(function () { z.classList.add("da"); }); });
  }

  // eine Ebene zurück: EU, Deutschland und China stehen gleichrangig unter der Erde (Jing, 06.11.2026)
  function hoch() { if (thema) themaZurueck(); else if (nah) zurueck(null); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && (nah || thema)) hoch(); });
  // Klick ins Leere (Meer, Rand der Kugel, freie Fläche um die Erde) führt eine Ebene zurück
  var startbild = svg.closest(".startbild");
  document.addEventListener("click", function (e) {
    if (!(nah || thema) || fliegt || vbFliegt || !startbild.contains(e.target)) return;
    if (e.target.closest(".sb-region, .sb-krumen, #sb-eu, #sb-de, #sb-cn, #sb-namen, .sb-hot, a, button")) return;
    hoch();
  });

  // Einstiege in der Zeichnung (SVG-Gruppen mit role="link"): Klick und Enter/Leertaste
  // ruhige Trefferfläche: unsichtbares Rechteck um Schrift, Punkt und Pfeil (sonst flackert das
  // Vergrößern, weil der Zeiger zwischen die Buchstaben fällt); erst nach dem Laden der Handschrift messen
  function flaechen() {
    document.querySelectorAll(".sb-hot").forEach(function (h) {
      var alt = h.querySelector(".sb-flaeche"); if (alt) alt.remove();
      var b = h.getBBox(), r = document.createElementNS("http://www.w3.org/2000/svg", "rect"), p = 16;
      r.setAttribute("class", "sb-flaeche"); r.setAttribute("rx", "12");
      r.setAttribute("x", b.x - p); r.setAttribute("y", b.y - p); r.setAttribute("width", b.width * 1.12 + 2 * p); r.setAttribute("height", b.height + 2 * p);
      h.insertBefore(r, h.firstChild);
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(flaechen); else flaechen();
  document.querySelectorAll(".sb-hot[data-href]").forEach(function (h) {
    // mit Unterseiten (startmenue.js): Notizzettel öffnen, sonst direkt zur Seite
    // mit Zoom (data-zoom am SVG, nur DE): heranfliegen und Zettel mit Unterseiten; zweiter Klick öffnet die Hauptseite
    h.addEventListener("click", function () { if (svg.dataset.zoom) themaKlick(h); else if (h.sbMenue) h.sbMenue(false); else location.href = h.dataset.href; });
    h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (svg.dataset.zoom) themaKlick(h); else if (h.sbMenue) h.sbMenue(true); else location.href = h.dataset.href; } });
  });
  // Windräder: bei „Bewegung reduzieren“ SVG-Animationen anhalten
  if (ruhig) document.querySelectorAll(".startbild svg, .sb-kacheln svg").forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
})();
