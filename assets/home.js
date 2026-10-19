// Flashcard demo, store-button order and the Spanish suggestion on the home pages.
(function () {
  var data = JSON.parse(document.getElementById("cards").textContent);
  var card = document.getElementById("card");
  var q = document.getElementById("question");
  var a = document.getElementById("answerText");
  var counters = document.querySelectorAll("[data-counter]");
  var dots = document.getElementById("dots");
  var live = document.getElementById("cardLive");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var idx = 0, busy = false;

  data.cards.forEach(function () { dots.appendChild(document.createElement("span")); });

  function render() {
    var c = data.cards[idx], n = (idx + 1) + " / " + data.cards.length;
    q.textContent = c[0];
    a.textContent = c[1];
    counters.forEach(function (el) { el.textContent = n; });
    Array.prototype.forEach.call(dots.children, function (d, i) { d.className = i === idx ? "on" : ""; });
  }

  function flip() {
    if (busy) return;
    var on = card.classList.toggle("flipped");
    card.setAttribute("aria-pressed", on);
    live.textContent = on ? data.answerLabel + ": " + a.textContent : q.textContent;
  }

  // Swap the text only while the question side faces the viewer,
  // so the next answer never shows during the flip back.
  function step(dir) {
    if (busy) return;
    var go = function () {
      idx = (idx + dir + data.cards.length) % data.cards.length;
      render();
      live.textContent = q.textContent;
    };
    if (card.classList.contains("flipped")) {
      busy = true;
      card.classList.remove("flipped");
      card.setAttribute("aria-pressed", "false");
      setTimeout(function () { go(); busy = false; }, reduced ? 0 : 480);
    } else {
      go();
    }
  }

  card.addEventListener("click", flip);
  document.getElementById("next").addEventListener("click", function () { step(1); });
  card.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });

  // Swipe left or right on touch screens.
  var x0 = null, swiped = false;
  card.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; swiped = false; }, { passive: true });
  card.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) { swiped = true; step(dx < 0 ? 1 : -1); }
  });
  card.addEventListener("click", function (e) { if (swiped) { e.stopImmediatePropagation(); swiped = false; } }, true);

  render();

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
