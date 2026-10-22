// Startseite: gezeichnete Erde mit EU, Deutschland und China (von Jing gewählt, 21.10.2026).
// Landmassen aus Natural Earth (world-atlas, 1:110 Mio.), Projektion mit d3-geo.
// Sprache, Beschriftungen und Ziele der Links stehen als data-Attribute am <svg id="sb-erde">.
(function () {
  var svg = document.getElementById("sb-erde");
  if (!svg || !window.d3 || !window.topojson) return;
  var namen = JSON.parse(svg.dataset.namen), links = JSON.parse(svg.dataset.links);
  // EU-27 (ISO 3166-1 numerisch); China einschließlich Taiwan wie auf den übrigen Karten der Website
  var EU = ["040","056","100","191","196","203","208","233","246","250","276","300","348","372","380","428","440","442","470","528","616","620","642","703","705","724","752"];
  var CN = ["156", "158"];
  var proj = d3.geoOrthographic().scale(250).translate([400, 400]).clipAngle(90).precision(.4);
  var pfad = d3.geoPath(proj);
  var basis = [-58, -32, 0], rot = basis.slice();
  var land, eu, cn, de, punkte;
  var aktiv = null, groesse = { eu: 24, de: 24, cn: 24 }, weich = true;
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gezogen = false, t0 = performance.now();
  var el = function (id) { return document.getElementById(id); };

  function zeichne() {
    proj.rotate(rot);
    el("sb-gitter").setAttribute("d", pfad(d3.geoGraticule10()));
    el("sb-land").setAttribute("d", pfad(land));
    el("sb-eu").setAttribute("d", pfad(eu));
    el("sb-cn").setAttribute("d", pfad(cn));
    el("sb-de").setAttribute("d", pfad(de));
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
    if (ruhig || gezogen) zeichne();
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
        z.addEventListener("click", function () { location.href = links[p.key]; });
      });
    });
  }

  fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then(function (r) { return r.json(); }).then(function (topo) {
    var alle = topojson.feature(topo, topo.objects.countries).features;
    land = topojson.merge(topo, topo.objects.countries.geometries);
    eu = { type: "FeatureCollection", features: alle.filter(function (f) { return EU.indexOf(f.id) >= 0 && f.id !== "276"; }) };
    cn = { type: "FeatureCollection", features: alle.filter(function (f) { return CN.indexOf(f.id) >= 0; }) };
    de = { type: "FeatureCollection", features: alle.filter(function (f) { return f.id === "276"; }) };
    punkte = [
      { key: "eu", lonlat: [2, 47], dx: -10, dy: 6, anker: "end", farbe: "#3c5a8a" },
      { key: "de", lonlat: [10.4, 51.2], dx: 6, dy: -14, farbe: "#8a6a00" },
      { key: "cn", lonlat: [103, 35], dx: 0, dy: 8, anker: "middle", farbe: "#ffffff", halo: "#7a2a1e" }
    ];
    legeAn();
    zeichne();
    // sanftes Pendeln, damit Europa und China sichtbar bleiben; Ziehen dreht, Doppelklick setzt zurück
    function schritt(t) {
      if (!gezogen) { rot = [basis[0] + 14 * Math.sin((t - t0) / 6000), basis[1], 0]; zeichne(); }
      requestAnimationFrame(schritt);
    }
    if (!ruhig) requestAnimationFrame(schritt); else weich = false;
    setInterval(function () { if (gezogen || ruhig) zeichne(); }, 40);
    var ids = { "sb-eu": "eu", "sb-de": "de", "sb-cn": "cn" };
    Object.keys(ids).forEach(function (id) {
      el(id).addEventListener("pointerenter", function () { setzeAktiv(ids[id]); });
      el(id).addEventListener("pointerleave", function () { setzeAktiv(null, ids[id]); });
    });
    var welt = el("sb-welt"), start = null, weg = 0, ziel = null;
    welt.addEventListener("pointerdown", function (e) {
      ziel = ids[e.target.id]; if (ziel) { aktiv = ziel; zeichne(); }
      weg = 0; start = [e.clientX, e.clientY, rot[0], rot[1]]; welt.setPointerCapture(e.pointerId);
    });
    welt.addEventListener("pointermove", function (e) {
      if (!start) return;
      weg = Math.max(weg, Math.abs(e.clientX - start[0]) + Math.abs(e.clientY - start[1]));
      if (weg < 5) return;
      gezogen = true;
      rot = [start[2] + (e.clientX - start[0]) * .4, Math.max(-70, Math.min(70, start[3] - (e.clientY - start[1]) * .4)), 0];
      zeichne();
    });
    welt.addEventListener("pointerup", function () { start = null; if (weg < 5 && ziel) location.href = links[ziel]; });
    welt.addEventListener("dblclick", function () { gezogen = false; t0 = performance.now(); });
  }).catch(function () { /* ohne Kartendaten bleibt die blaue Kugel stehen */ });

  // Einstiege in der Zeichnung (SVG-Gruppen mit role="link"): Klick und Enter/Leertaste
  // ruhige Trefferfläche: unsichtbares Rechteck um Schrift, Punkt und Pfeil (sonst flackert das
  // Vergrößern, weil der Zeiger zwischen die Buchstaben fällt); erst nach dem Laden der Handschrift messen
  function flaechen() {
    document.querySelectorAll(".sb-hot").forEach(function (h) {
      var alt = h.querySelector(".sb-flaeche"); if (alt) alt.remove();
      var b = h.getBBox(), r = document.createElementNS("http://www.w3.org/2000/svg", "rect"), p = 16;
      r.setAttribute("class", "sb-flaeche"); r.setAttribute("rx", "12");
      r.setAttribute("x", b.x - p); r.setAttribute("y", b.y - p); r.setAttribute("width", b.width * 1.3 + 2 * p); r.setAttribute("height", b.height + 2 * p);
      h.insertBefore(r, h.firstChild);
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(flaechen); else flaechen();
  document.querySelectorAll(".sb-hot[data-href]").forEach(function (h) {
    h.addEventListener("click", function () { location.href = h.dataset.href; });
    h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); location.href = h.dataset.href; } });
  });
  // Windräder: bei „Bewegung reduzieren“ SVG-Animationen anhalten
  if (ruhig) document.querySelectorAll(".startbild svg, .sb-kacheln svg").forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
})();
