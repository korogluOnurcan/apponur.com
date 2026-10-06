// Language switching for apponur.com pages.
// Order: ?lang=es|en in the URL, then the visitor's last choice, then the browser language.
(function () {
  function stored() { try { return localStorage.getItem("lang"); } catch (e) { return null; } }
  function store(l) { try { localStorage.setItem("lang", l); } catch (e) {} }

  var q = new URLSearchParams(location.search).get("lang");
  var initial = (q === "es" || q === "en") ? q
    : (stored() || ((navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en"));

  function apply(l) {
    document.documentElement.lang = l;
    store(l);
    document.querySelectorAll("[data-en]").forEach(function (el) {
      el.textContent = l === "es" ? el.getAttribute("data-es") : el.getAttribute("data-en");
    });
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === l);
    });
    var t = document.querySelector("meta[name='title-" + l + "']");
    if (t) document.title = t.content;
    if (typeof window.onLangChange === "function") window.onLangChange(l);
  }

  window.siteLang = { initial: initial, apply: apply };
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { apply(b.dataset.lang); });
    });
    apply(initial);
  });
})();
