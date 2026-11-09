// Zielpfad Deutschland (Jing, 09.11.2026): Ist-Emissionen 1990–2025, Ziele nach KSG und UBA-Projektion bis 2045.
// Markup in laender/deutschland.qmd: div#zielpfad mit Meilenstein-Knöpfen, JSON .zp-daten (Ziele, Projektion, Texte)
// und der alten Balkengrafik figure.pfad als Ersatz ohne Skript. Ist-Werte aus daten/data/de_thg_gesamt.csv.
// Überfahren zeigt jedes Jahr, Klick oder Meilenstein-Knopf hält es fest; die Grafik wird in Pixelbreite gezeichnet,
// damit die Schrift auch auf dem Handy lesbar bleibt.
(function () {
  var box = document.getElementById("zielpfad");
  if (!box) return;
  var D = JSON.parse(box.querySelector(".zp-daten").textContent);
  var grafik = box.querySelector(".zp-grafik"), detail = box.querySelector(".zp-detail");
  var knoepfe = box.querySelectorAll(".zp-marken button");
  var ns = "http://www.w3.org/2000/svg", ist = {}, BASIS, wahl = 2025, svg, s = {};

  function el(n, a, p) { var e = document.createElementNS(ns, n); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; }
  function zahl(x) { return x.toLocaleString("de-DE", { maximumFractionDigits: 1 }); }
  function prozent(x) { var v = Math.round((x / BASIS - 1) * 100); return (v < 0 ? "−" : "+") + Math.abs(v) + " %"; }
  // Wert einer Reihe [[jahr, wert], …] im Jahr j, linear verbunden; außerhalb: null
  function wert(reihe, j) {
    for (var i = 0; i < reihe.length - 1; i++) {
      var a = reihe[i], b = reihe[i + 1];
      if (j >= a[0] && j <= b[0]) return a[1] + (b[1] - a[1]) * (j - a[0]) / (b[0] - a[0]);
    }
    return null;
  }

  fetch(box.dataset.quelle).then(function (r) { return r.text(); }).then(function (txt) {
    txt.trim().split("\n").slice(1).forEach(function (z) { var t = z.split(","); ist[+t[0]] = +t[1]; });
    BASIS = ist[1990];
    // Zielpfad beginnt am letzten Ist-Wert
    s.ziel = [[2025, ist[2025]]].concat(D.ziele.map(function (z) { return [z[0], z[1]]; }));
    s.proj = D.projektion.map(function (z) { return [z[0], z[1]]; });
    box.classList.add("zp-js");
    zeichnen();
    var breite = grafik.clientWidth;
    addEventListener("resize", function () { if (grafik.clientWidth !== breite) { breite = grafik.clientWidth; zeichnen(); } });
    knoepfe.forEach(function (b) { b.addEventListener("click", function () { waehlen(+b.dataset.j); }); });
    waehlen(2025);
  }).catch(function () { /* ohne Daten bleibt die Balkengrafik stehen */ });

  function zeichnen() {
    var W = grafik.clientWidth, schmal = W < 560, H = schmal ? 290 : 360;
    var L = schmal ? 40 : 48, R = schmal ? 14 : 76, O = 14, U = 26;
    var x = function (j) { return L + (j - 1990) / (2045 - 1990) * (W - L - R); };
    var y = function (v) { return O + (1 - v / 1300) * (H - O - U); };
    s.x = x; s.y = y; s.H = H; s.O = O; s.U = U;
    grafik.innerHTML = "";
    svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Linie der Treibhausgasemissionen 1990 bis 2025, danach Zielpfad und Projektion bis 2045");
    grafik.appendChild(svg);

    // Raster und Achsen
    [0, 250, 500, 750, 1000, 1250].forEach(function (v) {
      el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "zp-raster" });
      el("text", { x: L - 6, y: y(v) + 4, class: "zp-achse", "text-anchor": "end" }).textContent = v.toLocaleString("de-DE");
    });
    (schmal ? [1990, 2010, 2030, 2045] : [1990, 2000, 2010, 2020, 2030, 2040, 2045]).forEach(function (j) {
      el("text", { x: x(j), y: H - 8, class: "zp-achse", "text-anchor": "middle" }).textContent = j;
    });

    // Lücke zwischen Projektion und Ziel
    var jahre = []; for (var j = 2025; j <= 2045; j++) jahre.push(j);
    var oben = jahre.map(function (j) { return x(j) + "," + y(wert(s.proj, j)); });
    var unten = jahre.slice().reverse().map(function (j) { return x(j) + "," + y(wert(s.ziel, j)); });
    el("polygon", { points: oben.concat(unten).join(" "), class: "zp-luecke" });

    // Ist: Fläche und Linie
    var istJ = Object.keys(ist).map(Number).sort();
    var linie = istJ.map(function (j) { return x(j) + "," + y(ist[j]); }).join(" ");
    el("polygon", { points: x(1990) + "," + y(0) + " " + linie + " " + x(2025) + "," + y(0), class: "zp-ist-flaeche" });
    el("polyline", { points: linie, class: "zp-ist" });
    // Hälfte von 1990 als Orientierung
    el("line", { x1: L, x2: W - R, y1: y(BASIS / 2), y2: y(BASIS / 2), class: "zp-haelfte" });
    el("text", { x: x(1991), y: y(BASIS / 2) - 6, class: "zp-notiz" }).textContent = "Hälfte von 1990";

    // Ziel und Projektion
    el("polyline", { points: s.proj.map(function (p) { return x(p[0]) + "," + y(p[1]); }).join(" "), class: "zp-proj" });
    el("polyline", { points: s.ziel.map(function (p) { return x(p[0]) + "," + y(p[1]); }).join(" "), class: "zp-ziel" });
    s.proj.slice(1).forEach(function (p) { el("circle", { cx: x(p[0]), cy: y(p[1]), r: 3.5, class: "zp-proj-punkt" }); });
    D.ziele.forEach(function (z) { el("circle", { cx: x(z[0]), cy: y(z[1]), r: 5, class: "zp-ziel-punkt" }); });

    // Restemissionen 2045 als Klammer
    var x45 = x(2045) + 7;
    el("path", { d: "M" + (x45 - 4) + " " + y(212.5) + "h4v" + (y(0) - y(212.5)) + "h-4", class: "zp-klammer" });
    if (!schmal) {
      var tk = el("text", { x: x45 + 6, y: (y(212.5) + y(0)) / 2 - 4, class: "zp-notiz zp-rot" });
      tk.textContent = "212 Mio. t";
      el("text", { x: x45 + 6, y: (y(212.5) + y(0)) / 2 + 11, class: "zp-notiz" }).textContent = "Rest 2045";
    }

    // Cursor
    s.cursor = el("g", { class: "zp-cursor" });
    el("line", { y1: O, y2: H - U, class: "zp-cursor-linie" }, s.cursor);
    s.pIst = el("circle", { r: 5.5, class: "zp-c-ist" }, s.cursor);
    s.pZiel = el("circle", { r: 5.5, class: "zp-c-ziel" }, s.cursor);
    s.pProj = el("circle", { r: 5.5, class: "zp-c-proj" }, s.cursor);

    // Überfahren und Klick: nächstes ganzes Jahr
    var flaeche = el("rect", { x: L, y: O, width: W - L - R, height: H - O - U, fill: "transparent", class: "zp-flaeche" });
    function jahrAus(e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
      return Math.max(1990, Math.min(2045, Math.round(1990 + (px - L) / (W - L - R) * 55)));
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
  function zeile(klasse, name, v, extra) {
    return '<div class="zp-zeile ' + klasse + '"><dt>' + name + "</dt><dd><b>" + (extra && extra.etwa ? "≈ " : "") + zahl(Math.round(v * 10) / 10) + "</b> Mio. t <span>" + (extra && extra.text ? extra.text : prozent(v)) + "</span></dd></div>";
  }
  function zeige(j) {
    if (!s.cursor) return;
    var vi = ist[j] != null ? ist[j] : null;
    var vz = j > 2025 ? wert(s.ziel, j) : null, vp = j > 2025 ? wert(s.proj, j) : null;
    s.cursor.querySelector("line").setAttribute("x1", s.x(j)); s.cursor.querySelector("line").setAttribute("x2", s.x(j));
    setze(s.pIst, j, vi); setze(s.pZiel, j, vz); setze(s.pProj, j, vp);

    var ziel = D.ziele.filter(function (z) { return z[0] === j; })[0];
    var proj = D.projektion.filter(function (p) { return p[0] === j; })[0];
    var h = '<div class="zp-jahr">' + j + "</div><dl>";
    if (vi != null) h += zeile("ist", j === 1990 ? "Ausstoß" : "Ist", vi);
    if (vz != null) h += zeile("ziel", "Ziel", vz, ziel ? { text: ziel[2] } : { etwa: true });
    if (vp != null) h += zeile("proj", "Projektion", vp, proj && proj[2] ? { text: proj[2] } : { etwa: true });
    if (vz != null && vp != null && vp - vz > .5) h += '<div class="zp-zeile luecke"><dt>Lücke</dt><dd><b>' + (ziel ? "" : "≈ ") + zahl(Math.round(vp - vz)) + "</b> Mio. t</dd></div>";
    h += "</dl>";
    var text = D.texte[j];
    if (text) h += '<p class="zp-text">' + (ziel ? "<b>" + ziel[3] + ".</b> " : "") + text + "</p>";
    else if (j > 2025) h += '<p class="zp-text zp-leise">Zwischenjahr: Ziel und Projektion linear zwischen den Stützjahren verbunden.</p>';
    detail.innerHTML = h;
  }
  function waehlen(j) {
    wahl = j;
    knoepfe.forEach(function (b) { b.setAttribute("aria-selected", +b.dataset.j === j ? "true" : "false"); });
    zeige(j);
  }
})();
