// Klimaschutz-Rad (von Jing gewählt, 22.10.2026, Vorbild: Climate Tech Map von Pentagram).
// Ring = Sektoren des KSG, Bogenlänge nach Emissionen; Strahlen = Instrumente je Sektor.
// Daten aus daten/data/de_sektoren.json (dieselbe Datei erzeugt die Sektorkarten darunter).
// Rad, Budgetleiste und Karte hängen zusammen (Jing, 06.11.2026): Ein Sektor ist immer gewählt; Ring und Leiste wählen,
// Überfahren zeigt nur vorübergehend. Die Karten .sektoren .sektor wandern ins Detailfeld .kr-detail;
// ohne Skript bleiben sie als Liste stehen. Das Skript steht in der Seite hinter den Karten.
// Erkunden (Jing, 06.11.2026, Vorbild: Inner Anatomy): Klick auf einen Sektor im Rad öffnet eine Vollbild-Ansicht –
// Kopfzeile mit Pfad, Leiste links, großes Rad in der Mitte, Sektorkarte mit Reitern rechts. In der Seite selbst
// bleibt alles untereinander; die Reiter gibt es nur im Vollbild.
(function () {
  var fig = document.querySelector("figure.klimarad");
  if (!fig) return;
  var block = fig.closest(".kr-block") || fig, gross = false, oeffnen = null;
  var auswahl = document.querySelector(".kr-auswahl"), leiste = auswahl && auswahl.querySelector(".kr-leiste"), detail = auswahl && auswahl.querySelector(".kr-detail");
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
    var SEK = d.sektoren, TYP = d.typen, aktiv = null, wahl = null;
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
        grp.addEventListener("mouseleave", function () { zeige(wahl); });
        grp.addEventListener("click", function () { location.href = grp.dataset.href; });
        grp.addEventListener("keydown", function (e) { if (e.key === "Enter") location.href = grp.dataset.href; });
        return grp;
      });
      s.el.addEventListener("click", function (e) { e.stopPropagation(); waehlen(s); if (!gross && oeffnen) oeffnen(); });
      s.el.addEventListener("mouseenter", function () { zeige(s); });
      s.el.addEventListener("mouseleave", function () { zeige(wahl); });
      s.el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(s); if (!gross && oeffnen) oeffnen(); } });
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
      mitte.innerHTML = '<div class="kr-titel">' + s.name + '</div><div class="kr-zahl" style="color:' + r.farbe + '">' + r.zahl + '</div><div class="kr-klein">' + r.klein + '</div><span class="status-chip ' + s.status + '">' + r.budget + '</span>' + legende();
      SEK.forEach(function (x) { if (x.zeile) x.zeile.classList.toggle("kr-vorschau", x === s && x !== wahl); });
    }

    // Budgetleiste: je Sektor ein Balken um die Nulllinie, links verfehlt, rechts übererfüllt
    var max = Math.max.apply(null, SEK.map(function (x) { return Math.abs(x.budget_mio_t || 0); }));
    leiste.innerHTML = '<div class="kr-leiste-kopf"><span>Budget 2021–2030 nach KSG</span><span class="kr-achse"><i>← verfehlt</i><i>übererfüllt →</i></span><span></span></div>';
    SEK.forEach(function (s) {
      var b = s.budget_mio_t, z = document.createElement("button");
      z.type = "button"; z.className = "kr-zeile" + (b == null ? " kr-ohne-budget" : ""); z.style.setProperty("--s", s.rad.farbe);
      var balken = b == null
        ? '<span class="kr-ohne">kein Budget</span>'
        : '<span class="kr-balken ' + (b < 0 ? "minus" : "plus") + '" style="width:' + (Math.abs(b) / max * 50) + '%"></span>';
      var wert = b == null ? "Ziel 2030 verfehlt" : (b > 0 ? "+" : "−") + Math.abs(b).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Mio. t";
      z.innerHTML = '<span class="kr-zname">' + (s.rad.kurz || "Abfall") + '</span><span class="kr-spur">' + balken + '</span><span class="kr-wert">' + wert + "</span>";
      z.setAttribute("aria-label", s.name + ": " + s.rad.budget);
      z.addEventListener("click", function () { waehlen(s); });
      z.addEventListener("mouseenter", function () { zeige(s); });
      z.addEventListener("mouseleave", function () { zeige(wahl); });
      leiste.appendChild(z); s.zeile = z;
    });

    // Karten ins Detailfeld holen; Abfall hat keine eigene Karte, sondern seinen Beleg
    SEK.forEach(function (s) {
      var k = document.getElementById(s.id);
      if (!k && s.nur_beleg) {
        k = document.createElement("section"); k.className = "sektor";
        k.innerHTML = "<h3>" + s.name + '</h3><p><span class="werte">2025: <strong>' + s.rad.zahl + '</strong></span> <span class="status-chip ' + s.status + '">' + s.rad.budget.replace("Budget 2021–2030 ", "") + "</span></p><p>" + s.rad.kurztext + "</p>";
      }
      if (!k) return;
      s.karte = k; k.hidden = true; detail.appendChild(k);
      // Teile der Karte für die Reiter im Vollbild: Kopfzeile mit Werten, Überblick, Maßnahmen, Instrumente
      k.querySelectorAll(":scope > p").forEach(function (p) {
        var st = p.querySelector(":scope > strong:first-child");
        p.dataset.teil = p.querySelector(".werte") ? "kopf" : st && /^Maßnahmen/.test(st.textContent) && p.firstChild === st ? "massnahmen" : "ueberblick";
      });
      var ins = document.createElement("ul"); ins.className = "kr-instrumente";
      ins.innerHTML = s.rad.instrumente.map(function (i) {
        return '<li class="kr-typ-' + i[1] + '"><a href="' + link(i[2]) + '">' + i[0] + "</a> <small>" + TYP[i[1]] + "</small></li>";
      }).join("");
      ins.dataset.teil = "instrumente";
      if (s.rad.instrumente.length) k.appendChild(ins);
    });
    var liste = document.querySelector(".sektoren"); if (liste && !liste.children.length) liste.hidden = true;

    var kicker = document.createElement("div"); kicker.className = "kr-kicker";
    var reiter = document.createElement("div"); reiter.className = "kr-reiter"; reiter.setAttribute("role", "tablist");
    var REITER = [["ueberblick", "Überblick"], ["massnahmen", "Maßnahmen"], ["instrumente", "Instrumente"]], teil = "ueberblick";
    REITER.forEach(function (x) {
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.teil = x[0];
      b.innerHTML = x[1] + " <small></small>";
      b.addEventListener("click", function () { reiten(x[0]); });
      reiter.appendChild(b);
    });
    var blaettern = document.createElement("div"); blaettern.className = "kr-blaettern";
    blaettern.innerHTML = '<button type="button" class="kr-zurueck"></button><button type="button" class="kr-weiter"></button>';
    detail.appendChild(blaettern);
    var reihe = SEK.filter(function (x) { return x.karte; });
    function nachbar(n) { return reihe[(reihe.indexOf(wahl) + n + reihe.length) % reihe.length]; }
    blaettern.querySelector(".kr-zurueck").addEventListener("click", function () { waehlen(nachbar(-1)); });
    blaettern.querySelector(".kr-weiter").addEventListener("click", function () { waehlen(nachbar(1)); });

    var kopf = document.createElement("div"); kopf.className = "kr-kopf";
    kopf.innerHTML = '<nav class="kr-pfad" aria-label="Pfad"><span>Deutschland</span><i>›</i><span>Sektoren</span><i>›</i><b></b></nav>' + legende() + '<button type="button" class="kr-schliessen" aria-label="Schließen">✕</button>';
    block.insertBefore(kopf, block.firstChild);

    function reiten(x) {
      teil = x; detail.dataset.teil = x;
      reiter.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.teil === x ? "true" : "false"); });
    }
    reiten("ueberblick");
    auswahl.hidden = false;

    function waehlen(s) {
      wahl = s;
      SEK.forEach(function (x) {
        if (x.karte) x.karte.hidden = x !== s;
        if (x.zeile) { x.zeile.setAttribute("aria-pressed", x === s ? "true" : "false"); }
      });
      detail.style.setProperty("--s", s.rad.farbe); block.style.setProperty("--s", s.rad.farbe);
      // Kicker: Anteil an den Emissionen (Landnutzung als Netto-Quelle getrennt)
      kicker.textContent = s.lulucf ? "Sektor · Netto-Quelle " + s.rad.zahl : "Sektor · " + Math.round(s.emissionen_2025 / ohneLulucf * 100) + " % der Emissionen " + d.emissionen_jahr;
      kopf.querySelector("b").textContent = s.name;
      // Kicker über den Titel, Reiter unter die Kopfzeile der gewählten Karte
      if (s.karte) {
        var kz = s.karte.querySelector('[data-teil="kopf"]') || s.karte.querySelector("h3");
        s.karte.insertBefore(kicker, s.karte.firstChild);
        s.karte.insertBefore(reiter, kz ? kz.nextSibling : null);
      }
      // Reiter ohne Inhalt ausblenden, Zahl der Instrumente anzeigen
      var leer = {};
      REITER.forEach(function (x) {
        var b = reiter.querySelector('[data-teil="' + x[0] + '"]'), n = s.karte ? s.karte.querySelectorAll(':scope > [data-teil="' + x[0] + '"]').length : 0;
        leer[x[0]] = !n; b.hidden = !n;
        b.querySelector("small").textContent = x[0] === "instrumente" && n ? s.rad.instrumente.length : "";
      });
      if (leer[teil]) reiten("ueberblick");
      if (reihe) {
        blaettern.querySelector(".kr-zurueck").textContent = "‹ " + nachbar(-1).name;
        blaettern.querySelector(".kr-weiter").textContent = nachbar(1).name + " ›";
      }
      zeige(s);
    }
    waehlen(SEK[0]);
    oeffnen = vollbild();
    kopf.querySelector(".kr-schliessen").addEventListener("click", function () { oeffnen.aus(); });
  }).catch(function () { fig.style.display = "none"; });

  // Vollbild (Jing, 03.11.2026): Knopf oben rechts; echte Vollbild-Ansicht, wo der Browser sie kann,
  // sonst eine Ebene über der Seite. Esc oder der Knopf schließt; ein Link im Rad schließt ebenfalls.
  // Seit 06.11.2026 geht der ganze Block (Rad, Leiste, Karte) ins Vollbild; Rückgabe: an() mit an/aus.
  function vollbild() {
    var knopf = document.createElement("button");
    knopf.type = "button"; knopf.className = "kr-vollbild";
    knopf.innerHTML = "<span aria-hidden='true'>⤢</span> Erkunden";
    fig.insertBefore(knopf, fig.firstChild);
    function an() {
      if (gross) return;
      gross = true; block.classList.add("kr-gross"); document.documentElement.classList.add("kr-offen");
      if (block.requestFullscreen) block.requestFullscreen().catch(function () {});
    }
    function aus() {
      if (!gross) return;
      gross = false; block.classList.remove("kr-gross"); document.documentElement.classList.remove("kr-offen");
      if (document.fullscreenElement === block && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      block.scrollIntoView({ block: "start" });
    }
    an.aus = aus;
    knopf.addEventListener("click", an);
    document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && gross) aus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && gross) aus(); });
    block.addEventListener("click", function (e) { if (e.target.closest("a") && gross) aus(); });
    return an;
  }
})();
