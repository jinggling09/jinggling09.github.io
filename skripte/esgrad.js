// ESG-Rad (von Jing gewählt, 23.10.2026, Vorbild: Capgemini „Integrating ESG into Business Operations“).
// Innen E · S · G, Ring = zehn ESRS-Themen, Punkte außen = zuständige Abteilungen.
// Daten aus daten/data/esg_rad.json; Überfahren, Fokus oder Antippen zeigt Angaben im Feld daneben.
(function () {
  var fig = document.querySelector("figure.esgrad");
  if (!fig) return;
  var svg = fig.querySelector("svg"), panel = fig.querySelector(".er-feld"), leg = fig.querySelector(".er-abt"), root = fig.dataset.root || "";
  var ns = "http://www.w3.org/2000/svg", C = 300, R0 = 70, R1 = 125, R2 = 215, LU = 1.2;
  var FARBE = { e: "#2e7d5b", s: "#a8741a", g: "#3c5a8a" }, MITTEL = { e: "#8cc3a7", s: "#e2bf82", g: "#a9bbd8" }, HELL = { e: "#cfe5d9", s: "#f1e2c6", g: "#d6deeb" };
  function el(n, a, p) { var e = document.createElementNS(ns, n); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; }
  function pol(r, g) { var w = (g - 90) * Math.PI / 180; return [C + r * Math.cos(w), C + r * Math.sin(w)]; }
  function bogen(r1, r2, a, b) {
    var p1 = pol(r2, a), p2 = pol(r2, b), p3 = pol(r1, b), p4 = pol(r1, a), f = b - a > 180 ? 1 : 0;
    return "M" + p1 + "A" + r2 + " " + r2 + " 0 " + f + " 1 " + p2 + "L" + p3 + "A" + r1 + " " + r1 + " 0 " + f + " 0 " + p4 + "Z";
  }
  function chips(a, k) {
    if (!a.length) return '<span class="er-leer">–</span>';
    return a.map(function (x) {
      var n = typeof x === "string" ? x : x[0], h = typeof x === "string" ? null : x[1];
      return h ? '<a class="chip ' + k + '" href="' + root + "unternehmen/" + h + '">' + n + "</a>" : '<span class="chip ' + k + '">' + n + "</span>";
    }).join("");
  }

  fetch(fig.dataset.quelle).then(function (r) { return r.json(); }).then(function (d) {
    var T = d.themen, A = d.abteilungen, w = 360 / T.length, segs = [];
    ["e", "s", "g"].forEach(function (k) {
      var idx = T.map(function (t, i) { return t.saeule === k ? i : -1; }).filter(function (i) { return i >= 0; });
      var a = idx[0] * w, b = (idx[idx.length - 1] + 1) * w, p = pol((R0 + R1) / 2 - 2, (a + b) / 2);
      el("path", { d: bogen(R0, R1 - 4, a + LU, b - LU), fill: FARBE[k] });
      el("text", { x: p[0], y: p[1] + 5, "text-anchor": "middle", class: "er-saeule" }).textContent = k.toUpperCase();
    });
    el("circle", { cx: C, cy: C, r: R0 - 6, fill: "#fff", stroke: "#dfe5e1" });
    el("text", { x: C, y: C + 6, "text-anchor": "middle", class: "er-mitte" }).textContent = "ESRS";

    T.forEach(function (t, i) {
      var a = i * w + LU, b = (i + 1) * w - LU, m = (a + b) / 2, p = pol((R1 + R2) / 2, m);
      var s = el("path", { d: bogen(R1, R2, a, b), fill: HELL[t.saeule], class: "er-seg", tabindex: 0, role: "button", "aria-label": "ESRS " + t.code + " " + t.name });
      el("text", { x: p[0], y: p[1] - 4, "text-anchor": "middle", class: "er-code" }).textContent = t.code;
      el("text", { x: p[0], y: p[1] + 13, "text-anchor": "middle", class: "er-kurz" }).textContent = t.kurz;
      t.abteilungen.forEach(function (k, j) { var q = pol(R2 + 16 + j * 13, m); el("circle", { cx: q[0], cy: q[1], r: 4.5, fill: A[k][1] }); });
      s.dataset.s = t.saeule; segs.push(s);
      function an() { segs.forEach(function (x) { x.setAttribute("fill", x === s ? MITTEL[x.dataset.s] : HELL[x.dataset.s]); x.classList.toggle("er-aus", x !== s); }); zeige(t); }
      s.addEventListener("mouseenter", an); s.addEventListener("focus", an); s.addEventListener("click", an);
    });

    function zeige(t) {
      panel.className = "er-feld " + t.saeule;
      panel.innerHTML = '<div class="er-kopf">' + d.saeulen[t.saeule] + " · ESRS " + t.code + "</div><h3>" + t.name + "</h3><p>" + t.text + "</p>" +
        "<dl><dt>Zuständig im Betrieb</dt><dd>" + t.abteilungen.map(function (k) { return A[k][0]; }).join(" · ") + "</dd>" +
        "<dt>Im ESRS genannt</dt><dd>" + chips(t.esrs_nennt, "") + "</dd>" +
        "<dt>Weitere Regeln EU / DE</dt><dd>" + chips(t.pflichten, "pflicht") + "</dd>" +
        "<dt>China (Leitlinie der Börse Shenzhen)</dt><dd>" + t.china + "</dd></dl>";
    }
    leg.innerHTML = Object.keys(A).map(function (k) { return '<span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4.5" fill="' + A[k][1] + '"/></svg>' + A[k][0] + "</span>"; }).join("");
    panel.innerHTML = '<div class="er-kopf">So liest man das Rad</div><h3>Zehn Themen, ein Bericht</h3><p>Der CSRD-Bericht gliedert sich nach den ESRS in zehn Themen. Welche ein Unternehmen berichten muss, entscheidet die Wesentlichkeitsanalyse. Die Punkte außen zeigen, welche Abteilungen meist die Daten liefern.</p><p class="er-leer">Thema im Rad wählen</p>';
  }).catch(function () { fig.style.display = "none"; });
})();
