// Zielpfad (Jing, 09.11.2026): Ist-Emissionen, Ziele und Projektion(en) als Linie mit Meilensteinen.
// Markup in laender/deutschland.qmd und laender/eu.qmd: div.zp mit Meilenstein-Knöpfen, JSON .zp-daten und der alten
// Balkengrafik figure.pfad als Ersatz ohne Skript. Ist-Werte aus der CSV in data-quelle (Spalte "spalte").
// Einstellungen im JSON (Standard = Deutschland): von, bis, ymax, raster, einheit ("mt" oder "index" = % von 1990),
// spalte, ziele [[jahr, wert, kurz, lang, neben]], projektionen [{name, klasse, punkte}] (oder "projektion" für eine),
// rest {jahr, wert, text: [Zeile 1, Zeile 2]}, texte {jahr: Kurztext}.
// Überfahren zeigt jedes Jahr, Klick oder Meilenstein-Knopf hält es fest; die Grafik wird in Pixelbreite gezeichnet,
// damit die Schrift auch auf dem Handy lesbar bleibt.
(function () {
  document.querySelectorAll(".zp[data-quelle]").forEach(zielpfad);
  function zielpfad(box) {
  var D = JSON.parse(box.querySelector(".zp-daten").textContent);
  var VON = D.von || 1990, BIS = D.bis || 2045, YMAX = D.ymax || 1300, INDEX = D.einheit === "index";
  var RASTER = D.raster || [0, 250, 500, 750, 1000, 1250];
  var PROJ = D.projektionen || [{ name: "Projektion", klasse: "proj", punkte: D.projektion }];
  var grafik = box.querySelector(".zp-grafik"), detail = box.querySelector(".zp-detail");
  var knoepfe = box.querySelectorAll(".zp-marken button");
  var ns = "http://www.w3.org/2000/svg", ist = {}, BASIS, ISTBIS, wahl, svg, s = {};

  function el(n, a, p) { var e = document.createElementNS(ns, n); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; }
  function zahl(x) { return x.toLocaleString("de-DE", { maximumFractionDigits: 1 }); }
  function prozent(x) { var v = Math.round((x / BASIS - 1) * 100); return (v < 0 ? "−" : v > 0 ? "+" : "±") + Math.abs(v) + " %"; }
  // Wert einer Reihe [[jahr, wert], …] im Jahr j, linear verbunden; außerhalb: null
  function wert(reihe, j) {
    for (var i = 0; i < reihe.length - 1; i++) {
      var a = reihe[i], b = reihe[i + 1];
      if (j >= a[0] && j <= b[0]) return a[1] + (b[1] - a[1]) * (j - a[0]) / (b[0] - a[0]);
    }
    return null;
  }

  fetch(box.dataset.quelle).then(function (r) { return r.text(); }).then(function (txt) {
    var zeilen = txt.trim().split("\n"), kopf = zeilen[0].split(","), sp = D.spalte ? kopf.indexOf(D.spalte) : 1;
    zeilen.slice(1).forEach(function (z) { var t = z.split(","); ist[+t[0]] = +t[sp]; });
    BASIS = ist[VON];
    ISTBIS = Math.max.apply(null, Object.keys(ist).map(Number));
    wahl = ISTBIS;
    // Zielpfad beginnt am letzten Ist-Wert
    s.ziel = [[ISTBIS, ist[ISTBIS]]].concat(D.ziele.map(function (z) { return [z[0], z[1]]; }));
    s.projs = PROJ.map(function (p) { return p.punkte.map(function (z) { return [z[0], z[1]]; }); });
    s.proj = s.projs[0];
    box.classList.add("zp-js");
    zeichnen();
    var breite = grafik.clientWidth;
    addEventListener("resize", function () { if (grafik.clientWidth !== breite) { breite = grafik.clientWidth; zeichnen(); } });
    knoepfe.forEach(function (b) { b.addEventListener("click", function () { waehlen(+b.dataset.j); }); });
    waehlen(ISTBIS);
  }).catch(function () { /* ohne Daten bleibt die Balkengrafik stehen */ });

  function zeichnen() {
    var W = grafik.clientWidth, schmal = W < 560, H = schmal ? 290 : 360;
    var L = schmal ? 40 : 48, R = schmal ? 14 : 76, O = 14, U = 26;
    var x = function (j) { return L + (j - VON) / (BIS - VON) * (W - L - R); };
    var y = function (v) { return O + (1 - v / YMAX) * (H - O - U); };
    s.x = x; s.y = y; s.H = H; s.O = O; s.U = U;
    grafik.innerHTML = "";
    svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Linie der Treibhausgasemissionen 1990 bis 2025, danach Zielpfad und Projektion bis 2045");
    grafik.appendChild(svg);

    // Raster und Achsen
    RASTER.forEach(function (v) {
      el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "zp-raster" });
      el("text", { x: L - 6, y: y(v) + 4, class: "zp-achse", "text-anchor": "end" }).textContent = v.toLocaleString("de-DE") + (INDEX ? " %" : "");
    });
    (schmal ? D.achse_schmal || [1990, 2010, 2030, 2045] : D.achse || [1990, 2000, 2010, 2020, 2030, 2040, 2045]).forEach(function (j) {
      el("text", { x: x(j), y: H - 8, class: "zp-achse", "text-anchor": "middle" }).textContent = j;
    });

    // Lücke zwischen Projektion und Ziel
    var jahre = []; for (var j = ISTBIS; j <= BIS; j++) jahre.push(j);
    var oben = jahre.map(function (j) { return x(j) + "," + y(wert(s.proj, j)); });
    var unten = jahre.slice().reverse().map(function (j) { return x(j) + "," + y(wert(s.ziel, j)); });
    el("polygon", { points: oben.concat(unten).join(" "), class: "zp-luecke" });

    // Ist: Fläche und Linie
    var istJ = Object.keys(ist).map(Number).sort();
    var linie = istJ.map(function (j) { return x(j) + "," + y(ist[j]); }).join(" ");
    el("polygon", { points: x(VON) + "," + y(0) + " " + linie + " " + x(ISTBIS) + "," + y(0), class: "zp-ist-flaeche" });
    el("polyline", { points: linie, class: "zp-ist" });
    // Hälfte von 1990 als Orientierung
    el("line", { x1: L, x2: W - R, y1: y(BASIS / 2), y2: y(BASIS / 2), class: "zp-haelfte" });
    el("text", { x: x(VON + 1), y: y(BASIS / 2) - 6, class: "zp-notiz" }).textContent = "Hälfte von " + VON;

    // Ziel und Projektion
    s.projs.forEach(function (pr, i) {
      var k = PROJ[i].klasse || "proj";
      el("polyline", { points: pr.map(function (p) { return x(p[0]) + "," + y(p[1]); }).join(" "), class: "zp-proj " + k });
      pr.slice(1).forEach(function (p) { el("circle", { cx: x(p[0]), cy: y(p[1]), r: 3.5, class: "zp-proj-punkt " + k }); });
    });
    el("polyline", { points: s.ziel.map(function (p) { return x(p[0]) + "," + y(p[1]); }).join(" "), class: "zp-ziel" });
    D.ziele.forEach(function (z) { el("circle", { cx: x(z[0]), cy: y(z[1]), r: 5, class: "zp-ziel-punkt" }); });

    // Rest im Zieljahr als Klammer
    var REST = D.rest || { jahr: 2045, wert: 212.5, text: ["212 Mio. t", "Rest 2045"] };
    var xr = x(REST.jahr) + 7;
    el("path", { d: "M" + (xr - 4) + " " + y(REST.wert) + "h4v" + (y(0) - y(REST.wert)) + "h-4", class: "zp-klammer" });
    if (!schmal) {
      el("text", { x: xr + 6, y: (y(REST.wert) + y(0)) / 2 - 4, class: "zp-notiz zp-rot" }).textContent = REST.text[0];
      el("text", { x: xr + 6, y: (y(REST.wert) + y(0)) / 2 + 11, class: "zp-notiz" }).textContent = REST.text[1];
    }

    // Cursor
    s.cursor = el("g", { class: "zp-cursor" });
    el("line", { y1: O, y2: H - U, class: "zp-cursor-linie" }, s.cursor);
    s.pIst = el("circle", { r: 5.5, class: "zp-c-ist" }, s.cursor);
    s.pZiel = el("circle", { r: 5.5, class: "zp-c-ziel" }, s.cursor);
    s.pProjs = s.projs.map(function (pr, i) { return el("circle", { r: 5.5, class: "zp-c-proj " + (PROJ[i].klasse || "proj") }, s.cursor); });

    // Überfahren und Klick: nächstes ganzes Jahr
    var flaeche = el("rect", { x: L, y: O, width: W - L - R, height: H - O - U, fill: "transparent", class: "zp-flaeche" });
    function jahrAus(e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
      return Math.max(VON, Math.min(BIS, Math.round(VON + (px - L) / (W - L - R) * (BIS - VON))));
    }
    flaeche.addEventListener("pointermove", function (e) { zeige(jahrAus(e)); });
    flaeche.addEventListener("pointerleave", function () { zeige(wahl); });
    flaeche.addEventListener("click", function (e) { waehlen(jahrAus(e)); });
    zeige(wahl);
  }

  function setze(c, j, v) {
    c.style.display = v == null ? "none" : "";
    if (v != null) { c.setAttribute("cx", s.x(j)); c.setAttribute("cy", s.y(v)); }
  }
  // Index: fett die Veränderung gegenüber dem Basisjahr, daneben (falls bekannt) Mio. t; sonst fett Mio. t, daneben Prozent
  function zeile(klasse, name, v, extra) {
    extra = extra || {};
    var etwa = extra.etwa ? "≈ " : "";
    if (INDEX) return '<div class="zp-zeile ' + klasse + '"><dt>' + name + "</dt><dd><b>" + etwa + (extra.text || prozent(v)) + "</b> <span>" + (extra.neben || "") + "</span></dd></div>";
    return '<div class="zp-zeile ' + klasse + '"><dt>' + name + "</dt><dd><b>" + etwa + zahl(Math.round(v * 10) / 10) + "</b> Mio. t <span>" + (extra.text || prozent(v)) + "</span></dd></div>";
  }
  function zeige(j) {
    if (!s.cursor) return;
    var vi = ist[j] != null ? ist[j] : null;
    var vz = j > ISTBIS ? wert(s.ziel, j) : null;
    var vps = s.projs.map(function (pr) { return j > ISTBIS ? wert(pr, j) : null; }), vp = vps[0];
    s.cursor.querySelector("line").setAttribute("x1", s.x(j)); s.cursor.querySelector("line").setAttribute("x2", s.x(j));
    setze(s.pIst, j, vi); setze(s.pZiel, j, vz);
    s.pProjs.forEach(function (c, i) { setze(c, j, vps[i]); });

    var ziel = D.ziele.filter(function (z) { return z[0] === j; })[0];
    var h = '<div class="zp-jahr">' + j + "</div><dl>";
    var istText = D.ist_texte && D.ist_texte[j];
    if (vi != null) h += zeile("ist", j === VON ? "Ausstoß" : "Ist", vi, istText ? { text: istText[0], neben: istText[1] } : null);
    if (vz != null) h += zeile("ziel", "Ziel", vz, ziel ? { text: ziel[2], neben: ziel[4] } : { etwa: true });
    PROJ.forEach(function (p, i) {
      if (vps[i] == null) return;
      var pt = p.punkte.filter(function (q) { return q[0] === j; })[0];
      h += zeile(p.klasse || "proj", p.name, vps[i], pt && pt[2] ? { text: pt[2], neben: pt[3] } : { etwa: true });
    });
    if (vz != null && vp != null && vp - vz > .5) {
      var pp = Math.round(vp - vz), luecke = INDEX ? pp + " %-Punkt" + (pp === 1 ? "" : "e") : zahl(Math.round(vp - vz)) + "</b> Mio. t<b>";
      h += '<div class="zp-zeile luecke"><dt>Lücke</dt><dd><b>' + (ziel ? "" : "≈ ") + luecke + "</b>" + (INDEX && D.punkt_mt ? " <span>≈ " + zahl(Math.round((vp - vz) * D.punkt_mt / 10) * 10) + " Mio. t</span>" : "") + "</dd></div>";
    }
    h += "</dl>";
    var text = D.texte[j];
    if (text) h += '<p class="zp-text">' + (ziel ? "<b>" + ziel[3] + ".</b> " : "") + text + "</p>";
    else if (j > ISTBIS) h += '<p class="zp-text zp-leise">Zwischenjahr: Ziel und Projektion linear zwischen den Stützjahren verbunden.</p>';
    detail.innerHTML = h;
  }
  function waehlen(j) {
    wahl = j;
    knoepfe.forEach(function (b) { b.setAttribute("aria-selected", +b.dataset.j === j ? "true" : "false"); });
    zeige(j);
  }
  }
})();
