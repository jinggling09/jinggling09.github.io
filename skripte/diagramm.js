// Werkzeugleiste für Diagramme (Jing, 03.11.2026): „Vollbild“ und „Als Bild speichern“ (PNG).
// Gilt für alle figure.gov-diagramm (Governance-Diagramme der Länderseiten).
// PNG: SVG mit berechneten Stilen und eingebetteter Schrift (Source Sans 3) auf eine Leinwand,
// darunter die Legende aus der Bildunterschrift und eine Quellenzeile. Nichts wird hochgeladen.
(function () {
  var figuren = document.querySelectorAll("figure.gov-diagramm");
  if (!figuren.length) return;

  var EIGENSCHAFTEN = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
    "stroke-opacity", "opacity", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "letter-spacing", "visibility"];
  var SCHRIFT_CSS = "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap";
  var schriftCache = null;

  function alsDataUrl(blob) {
    return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsDataURL(blob); });
  }
  // @font-face-Regeln für lateinische Zeichen mit eingebetteten Schriftdateien (sonst fällt das Bild auf Arial zurück)
  function schrift() {
    if (schriftCache) return schriftCache;
    schriftCache = fetch(SCHRIFT_CSS).then(function (r) { return r.text(); }).then(function (css) {
      var regeln = css.match(/@font-face\s*{[^}]*}/g) || [];
      regeln = regeln.filter(function (r) { return /U\+0000-00FF|U\+0100-02BA/.test(r); });
      return Promise.all(regeln.map(function (r) {
        var url = (r.match(/url\(([^)]+)\)/) || [])[1];
        if (!url) return "";
        return fetch(url).then(function (x) { return x.blob(); }).then(alsDataUrl).then(function (d) { return r.replace(url, d); });
      }));
    }).then(function (l) { return l.join("\n"); }).catch(function () { return ""; });
    return schriftCache;
  }

  function stileEinbetten(original, kopie) {
    var o = original.querySelectorAll("*"), k = kopie.querySelectorAll("*");
    for (var i = 0; i < o.length; i++) {
      var cs = getComputedStyle(o[i]), st = "";
      EIGENSCHAFTEN.forEach(function (p) { var v = cs.getPropertyValue(p); if (v) st += p + ":" + v + ";"; });
      k[i].setAttribute("style", st + (k[i].getAttribute("style") || ""));
    }
  }

  // Legende aus der Bildunterschrift zeichnen (Linienmuster .gl, Farbkästchen .gk, Text dazwischen)
  function legende(ctx, fig, x0, y0, breite) {
    var cap = fig.querySelector("figcaption"); if (!cap) return y0;
    var x = x0, y = y0, zeile = 26;
    ctx.font = "15px 'Source Sans 3', sans-serif"; ctx.textBaseline = "middle";
    function platz(w) { if (x + w > x0 + breite) { x = x0; y += zeile; } }
    cap.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var t = n.textContent.replace(/\s+/g, " "); if (!t.trim()) { x += 6; return; }
        var w = ctx.measureText(t).width; platz(w); ctx.fillStyle = "#5b6b63"; ctx.fillText(t, x, y); x += w; return;
      }
      var text = n.textContent.trim(), tw = ctx.measureText(text).width;
      if (n.classList.contains("gl")) {
        var vor = getComputedStyle(n, "::before");
        platz(26 + tw + 14);
        ctx.save(); ctx.strokeStyle = vor.borderTopColor; ctx.lineWidth = parseFloat(vor.borderTopWidth) || 2.5;
        if (vor.borderTopStyle === "dashed") ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y); ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#5b6b63"; ctx.fillText(text, x + 26, y); x += 26 + tw + 14;
      } else {
        platz(tw + 12 + 8);
        ctx.fillStyle = getComputedStyle(n).backgroundColor; ctx.fillRect(x, y - 11, tw + 12, 22);
        ctx.fillStyle = "#5b6b63"; ctx.fillText(text, x + 6, y); x += tw + 12 + 8;
      }
    });
    return y + zeile;
  }

  function speichern(fig, knopf) {
    var svg = fig.querySelector("svg"), vb = svg.viewBox.baseVal, W = vb.width, H = vb.height;
    var alt = knopf.innerHTML; knopf.disabled = true; knopf.textContent = "…";
    var kopie = svg.cloneNode(true);
    stileEinbetten(svg, kopie);
    kopie.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    kopie.setAttribute("width", W); kopie.setAttribute("height", H);
    kopie.removeAttribute("style");
    Promise.all([schrift(), document.fonts ? document.fonts.ready : null]).then(function (e) {
      if (e[0]) { var st = document.createElementNS("http://www.w3.org/2000/svg", "style"); st.textContent = e[0]; kopie.insertBefore(st, kopie.firstChild); }
      var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(kopie)], { type: "image/svg+xml;charset=utf-8" }));
      var bild = new Image();
      bild.onload = function () {
        var f = 2, rand = 28, unten = 110, c = document.createElement("canvas");
        c.width = (W + 2 * rand) * f; c.height = (H + 2 * rand + unten) * f;
        var ctx = c.getContext("2d"); ctx.scale(f, f);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(bild, rand, rand, W, H);
        var y = legende(ctx, fig, rand, rand + H + 24, W);
        ctx.font = "13px 'Source Sans 3', sans-serif"; ctx.fillStyle = "#8a958f";
        ctx.fillText("Jing Hu · " + location.href.split("#")[0] + " · Stand " + new Date().toLocaleDateString("de-DE"), rand, y + 10);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          var a = document.createElement("a"), name = location.pathname.split("/").pop().replace(/\.html?$/, "") || "diagramm";
          a.href = URL.createObjectURL(b); a.download = "governance-" + name + ".png";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
          knopf.disabled = false; knopf.innerHTML = alt;
        }, "image/png");
      };
      bild.onerror = function () { knopf.disabled = false; knopf.innerHTML = alt; };
      bild.src = url;
    });
  }

  figuren.forEach(function (fig) {
    var vb = fig.querySelector("svg").viewBox.baseVal;
    if (vb && vb.height) fig.style.setProperty("--dg-q", vb.width / vb.height);   // Seitenverhältnis für das Vollbild
    var leiste = document.createElement("div"); leiste.className = "dg-werkzeug";
    var voll = document.createElement("button"), bildKnopf = document.createElement("button");
    voll.type = bildKnopf.type = "button";
    bildKnopf.innerHTML = "<span aria-hidden='true'>↓</span> Als Bild speichern";
    leiste.append(voll, bildKnopf);
    fig.insertBefore(leiste, fig.firstChild);

    function beschriften() {
      var an = fig.classList.contains("dg-gross");
      voll.innerHTML = an ? "<span aria-hidden='true'>✕</span> Schließen" : "<span aria-hidden='true'>⤢</span> Vollbild";
      voll.setAttribute("aria-pressed", an ? "true" : "false");
    }
    function an() {
      fig.classList.add("dg-gross"); document.documentElement.classList.add("dg-offen"); beschriften();
      if (fig.requestFullscreen) fig.requestFullscreen().catch(function () {});
    }
    function aus() {
      fig.classList.remove("dg-gross"); document.documentElement.classList.remove("dg-offen"); beschriften();
      if (document.fullscreenElement === fig && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    }
    voll.addEventListener("click", function () { fig.classList.contains("dg-gross") ? aus() : an(); });
    bildKnopf.addEventListener("click", function () { speichern(fig, bildKnopf); });
    document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && fig.classList.contains("dg-gross")) aus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && fig.classList.contains("dg-gross")) aus(); });
    beschriften();
  });
})();
