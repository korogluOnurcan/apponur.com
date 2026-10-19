// Language handling for apponur.com.
// The home and guide pages have separate English (/) and Spanish (/es/) URLs.
// Privacy, terms and support hold both languages on one URL and switch in place.
// Order for those pages: ?lang=es|en in the URL, then the visitor's last choice, then the browser language.
(function () {
  function stored() { try { return localStorage.getItem("lang"); } catch (e) { return null; } }
  function store(l) { try { localStorage.setItem("lang", l); } catch (e) {} }

  var q = new URLSearchParams(location.search).get("lang");
  var fixed = document.documentElement.getAttribute("data-fixed-lang");

  // Old links such as /?lang=es go to the Spanish home page.
  if (fixed === "en" && q === "es" && document.querySelector("link[hreflang='es']")) {
    location.replace(new URL(document.querySelector("link[hreflang='es']").href).pathname + location.hash);
    return;
  }

  if (fixed) {
    document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll(".lang a[hreflang]").forEach(function (a) {
        a.addEventListener("click", function () { store(a.getAttribute("hreflang")); });
      });
    });
    store(fixed);
    return;
  }

  var initial = (q === "es" || q === "en") ? q
    : (stored() || ((navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en"));

  function apply(l) {
    document.documentElement.lang = l;
    store(l);
    document.querySelectorAll("[data-en]").forEach(function (el) {
      el.textContent = el.getAttribute("data-" + l);
    });
    document.querySelectorAll("[data-href-en]").forEach(function (el) {
      el.setAttribute("href", el.getAttribute("data-href-" + l));
    });
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === l);
    });
    var t = document.querySelector("meta[name='title-" + l + "']");
    if (t) document.title = t.content;
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { apply(b.dataset.lang); });
    });
    apply(initial);
  });
})();
