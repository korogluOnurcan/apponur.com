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

  function advance(dir) {
    idx = (idx + dir + data.cards.length) % data.cards.length;
    render();
    live.textContent = q.textContent;
  }

  // Turn the card back to the question side without animating it.
  function unflipNow() {
    var inner = card.querySelector(".card-inner");
    inner.style.transition = "none";
    card.classList.remove("flipped");
    card.setAttribute("aria-pressed", "false");
    void inner.offsetWidth;
    inner.style.transition = "";
  }

  // Swap the text only while the question side faces the viewer,
  // so the next answer never shows during the flip back.
  function step(dir) {
    if (busy) return;
    if (card.classList.contains("flipped")) {
      busy = true;
      card.classList.remove("flipped");
      card.setAttribute("aria-pressed", "false");
      setTimeout(function () { advance(dir); busy = false; }, reduced ? 0 : 480);
    } else {
      advance(dir);
    }
  }

  // After a swipe the card leaves on the side it was thrown to
  // and the next one comes in from the other side.
  function swipeOut(dir) {
    if (reduced) { unflipNow(); advance(dir); setOffset(0); return; }
    busy = true;
    card.style.transition = "transform .2s ease-in, opacity .2s";
    card.style.transform = "translateX(" + (-dir * 110) + "%) rotate(" + (-dir * 8) + "deg)";
    card.style.opacity = "0";
    setTimeout(function () {
      card.style.transition = "none";
      unflipNow();
      advance(dir);
      card.style.transform = "translateX(" + (dir * 40) + "%)";
      void card.offsetWidth;
      card.style.transition = "transform .25s ease-out, opacity .25s";
      card.style.transform = "";
      card.style.opacity = "";
      setTimeout(function () { card.style.transition = ""; busy = false; }, 260);
    }, 200);
  }

  function setOffset(dx) {
    card.style.transform = dx ? "translateX(" + dx + "px) rotate(" + (dx / 25) + "deg)" : "";
  }

  card.addEventListener("click", flip);
  document.getElementById("next").addEventListener("click", function () { step(1); });
  card.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });

  // Swipe with a finger or drag with the mouse: Pointer Events cover both.
  // A short horizontal move still counts as a tap; a vertical move scrolls the page.
  var drag = null, swallowClick = false;
  card.addEventListener("pointerdown", function (e) {
    swallowClick = false;
    if (busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, moving: false };
  });
  card.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moving) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      drag.moving = true;
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
      card.classList.add("dragging");
    }
    drag.dx = dx;
    setOffset(dx);
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (!d.moving) return;
    swallowClick = true;
    card.classList.remove("dragging");
    if (e.type === "pointerup" && Math.abs(d.dx) > Math.min(90, card.offsetWidth * 0.22)) swipeOut(d.dx < 0 ? 1 : -1);
    else setOffset(0);
  }
  card.addEventListener("pointerup", endDrag);
  card.addEventListener("pointercancel", endDrag);
  // A drag ends with a click on the card; do not let it flip the card.
  card.addEventListener("click", function (e) {
    if (swallowClick) { e.stopImmediatePropagation(); e.preventDefault(); swallowClick = false; }
  }, true);
  card.addEventListener("dragstart", function (e) { e.preventDefault(); });

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
