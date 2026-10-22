```{=html}
<!-- Umschalter EU · Deutschland · China über dem Titel (von Jing gewünscht, 22.10.2026); Skript schiebt ihn vor den Titelblock -->
<nav class="laender-wahl" aria-label="Land wählen">
  <a class="lw-eu" href="eu.html"><span class="lw-punkt"></span>EU</a>
  <a class="lw-de" href="deutschland.html"><span class="lw-punkt"></span>Deutschland</a>
  <a class="lw-cn" href="china.html"><span class="lw-punkt"></span>China</a>
</nav>
<script>
document.addEventListener("DOMContentLoaded", function () {
  var w = document.querySelector("nav.laender-wahl"), t = document.getElementById("title-block-header");
  if (!w) return;
  if (t) t.parentNode.insertBefore(w, t);
  w.querySelectorAll("a").forEach(function (a) {
    if (a.pathname === location.pathname) { a.classList.add("aktiv"); a.setAttribute("aria-current", "page"); }
  });
});
</script>
```
