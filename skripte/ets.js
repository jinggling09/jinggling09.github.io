// Kreislauf des Emissionshandels (Jing, 24.11.2026): wissen/eu-ets.qmd, section#ets-kreis.
// Fünf Schritte als Knöpfe in einer Reihe; der Text des gewählten Schritts erscheint im Detailfeld darunter.
// Ohne Skript bleiben alle Schritte mit Text untereinander stehen.
(function () {
  var box = document.getElementById("ets-kreis");
  if (!box) return;
  var schritte = [].slice.call(box.querySelectorAll(".ets-schritte > li"));
  var detail = box.querySelector(".ets-detail");
  if (!schritte.length || !detail) return;

  schritte.forEach(function (li) { var t = li.querySelector(".ets-text"); t.hidden = true; detail.appendChild(t); li._text = t; });
  box.classList.add("ets-js");

  function waehlen(i) {
    schritte.forEach(function (li, j) {
      var an = i === j;
      li.classList.toggle("ets-wahl", an);
      li.querySelector(".ets-knopf").setAttribute("aria-pressed", an ? "true" : "false");
      li._text.hidden = !an;
    });
    detail.dataset.n = i + 1;
    detail.dataset.titel = schritte[i].querySelector(".ets-knopf strong").textContent;   // Handy: Name über dem Text, weil die Knöpfe nur Ziffern zeigen
  }
  schritte.forEach(function (li, i) {
    li.querySelector(".ets-knopf").addEventListener("click", function () { waehlen(i); });
  });
  box.addEventListener("keydown", function (e) {
    var i = schritte.findIndex(function (li) { return li.classList.contains("ets-wahl"); });
    if (e.key === "ArrowRight") { waehlen((i + 1) % schritte.length); schritte[(i + 1) % schritte.length].querySelector(".ets-knopf").focus(); }
    else if (e.key === "ArrowLeft") { var k = (i - 1 + schritte.length) % schritte.length; waehlen(k); schritte[k].querySelector(".ets-knopf").focus(); }
  });
  waehlen(0);
})();
