// ESRS-Tabelle (von Jing gewählt, 23.10.2026) auf unternehmen/berichtspflichten.qmd.
// Dieselben Daten wie das ESG-Rad (daten/data/esg_rad.json), damit beide gleich bleiben.
// Zeilen = zehn ESRS-Themen, gruppiert nach Umwelt / Soziales / Unternehmensführung; Filter nach Abteilung.
(function () {
  var box = document.querySelector(".esrs-tabelle");
  if (!box) return;
  var root = box.dataset.root || "";
  function chips(a, k) {
    if (!a.length) return '<span class="et-leer">–</span>';
    return a.map(function (x) {
      var n = typeof x === "string" ? x : x[0], h = typeof x === "string" ? null : x[1];
      return h ? '<a class="chip ' + k + '" href="' + root + "unternehmen/" + h + '">' + n + "</a>" : '<span class="chip ' + k + '">' + n + "</span>";
    }).join("");
  }
  fetch(box.dataset.quelle).then(function (r) { return r.json(); }).then(function (d) {
    var A = d.abteilungen, html = '<table><thead><tr><th>ESRS-Thema</th><th>Im ESRS genannt</th><th>Weitere Regeln EU / DE</th><th>China: Leitlinie Shenzhen</th><th>Zuständig</th></tr></thead><tbody>', letzte = "";
    d.themen.forEach(function (t) {
      if (t.saeule !== letzte) { html += '<tr class="et-saeule ' + t.saeule + '" data-s="' + t.saeule + '"><td colspan="5">' + d.saeulen[t.saeule] + "</td></tr>"; letzte = t.saeule; }
      html += '<tr class="' + t.saeule + '" data-abt="' + t.abteilungen.join(" ") + '"><td class="et-thema"><span>' + t.code + "</span><strong>" + t.name + "</strong><small>" + t.text + "</small></td>" +
        '<td data-k="Im ESRS genannt">' + chips(t.esrs_nennt, "") + '</td><td data-k="Weitere Regeln EU / DE">' + chips(t.pflichten, "pflicht") + "</td>" +
        '<td data-k="China: Leitlinie Shenzhen">' + t.china + '</td><td data-k="Zuständig">' + t.abteilungen.map(function (k) { return A[k][0]; }).join(", ") + "</td></tr>";
    });
    box.querySelector(".et-inhalt").innerHTML = html + "</tbody></table>";
    var f = box.querySelector(".et-filter"), tb = box.querySelector("tbody");
    [["alle", "Alle"]].concat(Object.keys(A).map(function (k) { return [k, A[k][0]]; })).forEach(function (x, i) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = x[1]; b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.addEventListener("click", function () {
        f.querySelectorAll("button").forEach(function (y) { y.setAttribute("aria-pressed", y === b ? "true" : "false"); });
        tb.querySelectorAll("tr[data-abt]").forEach(function (r) { r.classList.toggle("et-weg", x[0] !== "alle" && r.dataset.abt.split(" ").indexOf(x[0]) < 0); });
        tb.querySelectorAll("tr.et-saeule").forEach(function (r) { r.classList.toggle("et-weg", !tb.querySelector("tr." + r.dataset.s + "[data-abt]:not(.et-weg)")); });
      });
      f.appendChild(b);
    });
  }).catch(function () { box.style.display = "none"; });
})();
