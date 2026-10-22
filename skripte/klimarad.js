// Klimaschutz-Rad (von Jing gewählt, 22.10.2026, Vorbild: Climate Tech Map von Pentagram).
// Ring = Sektoren des KSG, Bogenlänge nach Emissionen; Strahlen = Instrumente je Sektor.
// Daten aus daten/data/de_sektoren.json (dieselbe Datei erzeugt die Sektorkarten darunter).
(function () {
  var fig = document.querySelector("figure.klimarad");
  if (!fig) return;
  var svg = fig.querySelector("svg"), mitte = fig.querySelector(".kr-mitte"), root = fig.dataset.root || "";
  var ns = "http://www.w3.org/2000/svg";
  var C = 450, R1 = 182, R2 = 220, RS = 230, LUECKE = 2;
  function el(n, a, p) { var e = document.createElementNS(ns, n); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; }
  function pol(r, g) { var w = (g - 90) * Math.PI / 180; return [C + r * Math.cos(w), C + r * Math.sin(w)]; }
  function bogen(r1, r2, a, b) {
    var p1 = pol(r2, a), p2 = pol(r2, b), p3 = pol(r1, b), p4 = pol(r1, a), g = b - a > 180 ? 1 : 0;
    return "M" + p1 + "A" + r2 + " " + r2 + " 0 " + g + " 1 " + p2 + "L" + p3 + "A" + r1 + " " + r1 + " 0 " + g + " 0 " + p4 + "Z";
  }
  function symbol(typ, x, y, g) {
    if (typ === "preis") return el("path", { d: "M" + x + " " + (y - 6) + "l6 6-6 6-6-6z", class: "kr-voll" }, g);
    if (typ === "pflicht") return el("rect", { x: x - 4.5, y: y - 4.5, width: 9, height: 9, class: "kr-voll" }, g);
    return el("circle", { cx: x, cy: y, r: 4.8, class: "kr-offen" }, g);
  }
  function link(h) { return h.charAt(0) === "#" ? h : root + h; }
  function zahl(x) { return x.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

  fetch(fig.dataset.quelle).then(function (r) { return r.json(); }).then(function (d) {
    var SEK = d.sektoren, TYP = d.typen, aktiv = null;
    [300, 420, 540].forEach(function (r) { el("circle", { cx: C, cy: C, r: r, class: "kr-hilfslinie" }); });
    el("defs", {}).innerHTML = '<pattern id="kr-schraffur" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#4f7d5c"/><line x1="0" y1="0" x2="0" y2="6" stroke="#cfe0d4" stroke-width="2.4"/></pattern>';
    var gF = el("g", { class: "kr-faecher" }), gS = el("g", {}), gR = el("g", {});
    var summe = SEK.reduce(function (s, x) { return s + x.emissionen_2025; }, 0), frei = 360 - LUECKE * SEK.length, start = -8;
    var ohneLulucf = SEK.reduce(function (s, x) { return s + (x.lulucf ? 0 : x.emissionen_2025); }, 0);

    SEK.forEach(function (s) {
      var r = s.rad, breite = Math.max(frei * s.emissionen_2025 / summe, 4);
      s.a = start; s.b = start + breite; start = s.b + LUECKE;
      s.f = el("path", { d: bogen(R2, 560, s.a, s.b), fill: r.farbe, opacity: 0 }, gF);
      s.el = el("path", { d: bogen(R1, R2, s.a, s.b), fill: s.lulucf ? "url(#kr-schraffur)" : r.farbe, class: "kr-sektor", tabindex: 0, role: "button", "aria-label": s.name + ", " + r.zahl });
      gR.appendChild(s.el);
      if (r.kurz && breite > 14) {
        var pid = "kr-bahn-" + s.id.replace(/[^a-z]/g, ""), m = (s.a + s.b) / 2, unten = m > 90 && m < 270, rr = unten ? R1 + 9 : R2 - 9;
        var p1 = pol(rr, unten ? s.b - 1 : s.a + 1), p2 = pol(rr, unten ? s.a + 1 : s.b - 1);
        el("path", { id: pid, d: "M" + p1 + "A" + rr + " " + rr + " 0 0 " + (unten ? 0 : 1) + " " + p2, fill: "none" }, gR);
        var tp = el("textPath", { href: "#" + pid, startOffset: "50%", "text-anchor": "middle" }, el("text", { class: "kr-name", dy: 4 }, gR));
        tp.textContent = r.kurz;
      }
      s.strahlen = r.instrumente.map(function (ins, i) {
        var g = s.a + (s.b - s.a) * (i + .5) / r.instrumente.length, links = g > 180;
        var grp = el("g", { class: "kr-strahl", tabindex: 0, role: "link", "data-href": link(ins[2]), "aria-label": ins[0] + " (" + TYP[ins[1]] + ")" }, gS);
        var p0 = pol(RS, g), p1 = pol(266, g), ps = pol(279, g), pt = pol(294, g);
        el("line", { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }, grp);
        symbol(ins[1], ps[0], ps[1], grp);
        var tx = el("text", { x: pt[0], y: pt[1], dy: 5, "text-anchor": links ? "end" : "start", transform: "rotate(" + (links ? g + 90 : g - 90) + " " + pt[0] + " " + pt[1] + ")" }, grp);
        tx.textContent = ins[0];
        grp.addEventListener("mouseenter", function () { zeige(s); });
        grp.addEventListener("click", function () { location.href = grp.dataset.href; });
        grp.addEventListener("keydown", function (e) { if (e.key === "Enter") location.href = grp.dataset.href; });
        return grp;
      });
      s.el.addEventListener("click", function (e) { e.stopPropagation(); zeige(aktiv === s ? null : s); });
      s.el.addEventListener("mouseenter", function () { zeige(s); });
      s.el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zeige(s); } });
    });

    function legende() {
      return '<div class="kr-legende">' + Object.keys(TYP).map(function (k) {
        var z = k === "preis" ? '<svg width="12" height="12"><path d="M6 0l6 6-6 6-6-6z"/></svg>' : k === "pflicht" ? '<svg width="10" height="10"><rect width="10" height="10"/></svg>' : '<svg width="12" height="12"><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
        return "<span>" + z + TYP[k] + "</span>";
      }).join("") + "</div>";
    }
    function zeige(s) {
      aktiv = s;
      SEK.forEach(function (x) {
        var an = !s || x === s;
        x.el.classList.toggle("kr-gedimmt", !an);
        x.strahlen.forEach(function (g) { g.classList.toggle("kr-gedimmt", !an); });
        x.f.setAttribute("opacity", s && x === s ? .14 : 0);
      });
      if (!s) {
        mitte.innerHTML = '<div class="kr-titel">Deutschland ' + d.emissionen_jahr + '</div><div class="kr-zahl">' + zahl(ohneLulucf) + ' Mio. t</div><div class="kr-klein">CO₂-Äquivalente, Summe der Sektoren ohne Landnutzung</div>' + legende();
        return;
      }
      var r = s.rad;
      mitte.innerHTML = '<div class="kr-titel">' + s.name + '</div><div class="kr-zahl" style="color:' + r.farbe + '">' + r.zahl + '</div><div class="kr-klein">' + r.klein + '</div><span class="status-chip ' + s.status + '">' + r.budget + '</span><p class="kr-text">' + r.kurztext + "</p>" + (s.nur_beleg ? "" : '<a href="#' + s.id + '">Zur Sektorkarte ↓</a>');
    }
    svg.addEventListener("dblclick", function () { zeige(null); });
    svg.addEventListener("click", function (e) { if (e.target === svg) zeige(null); });
    zeige(null);
  }).catch(function () { fig.style.display = "none"; });
})();
