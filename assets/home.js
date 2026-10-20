// Store-button order and the Spanish suggestion on the home pages.
(function () {
  // Put the visitor's own store first.
  var ua = navigator.userAgent || "";
  if (/android/i.test(ua)) document.documentElement.classList.add("is-android");

  // On the English page, offer Spanish to Spanish-language browsers.
  var hint = document.getElementById("langhint");
  if (hint) {
    var dismissed = false;
    try { dismissed = localStorage.getItem("langhint") === "1"; } catch (e) {}
    if (!dismissed && (navigator.language || "").toLowerCase().indexOf("es") === 0) hint.classList.add("show");
    hint.querySelector("button").addEventListener("click", function () {
      hint.classList.remove("show");
      try { localStorage.setItem("langhint", "1"); } catch (e) {}
    });
  }
})();
