// "Try it" quiz on the home pages: 5 random civics questions in a phone frame,
// instant feedback with a short explanation, then a score and the store links.
(function () {
  var root = document.getElementById("quiz");
  var dataEl = document.getElementById("quiz-data");
  if (!root || !dataEl) return;

  var D = JSON.parse(dataEl.textContent), L = D.labels, N = 5;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var countEl = root.querySelector(".app-count");
  var progEl = root.querySelector(".app-progress");
  var bodyEl = root.querySelector(".app-body");
  var order, i, score, results, answered, opts, optButtons, fbEl, nextBtn;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function shuffle(a) {
    for (var k = a.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1)), t = a[k]; a[k] = a[j]; a[j] = t;
    }
    return a;
  }
  function show(view) {
    while (bodyEl.firstChild) bodyEl.removeChild(bodyEl.firstChild);
    if (!reduced) view.classList.add("enter");
    bodyEl.appendChild(view);
    bodyEl.scrollTop = 0;
  }
  function paintProgress(current) {
    var bars = progEl.children;
    for (var k = 0; k < bars.length; k++) {
      bars[k].className = k < results.length ? (results[k] ? "ok" : "bad") : (k === current ? "now" : "");
    }
  }

  function start() {
    var all = D.questions.map(function (_, k) { return k; });
    order = shuffle(all).slice(0, N);
    i = 0; score = 0; results = [];
    renderQuestion();
  }

  function renderQuestion() {
    var q = D.questions[order[i]];
    answered = false;
    opts = shuffle(q.o.map(function (t, k) { return { t: t, ok: k === q.a }; }));
    countEl.textContent = fmt(L.of, { n: i + 1, t: N });
    paintProgress(i);

    var view = el("div", "app-view");
    var qEl = el("p", "app-q", q.q);
    qEl.id = "quiz-q";
    view.appendChild(qEl);
    if (q.en) {
      var en = el("p", "app-en");
      en.appendChild(el("span", null, L.inEnglish + " "));
      en.appendChild(document.createTextNode(q.en));
      view.appendChild(en);
    }
    var group = el("div", "app-opts");
    group.setAttribute("role", "group");
    group.setAttribute("aria-labelledby", "quiz-q");
    optButtons = opts.map(function (o, k) {
      var b = el("button", "app-opt");
      b.type = "button";
      b.appendChild(el("span", "app-key", "ABCD".charAt(k)));
      b.appendChild(el("span", "app-txt", o.t));
      var mark = el("span", "app-mark"); mark.setAttribute("aria-hidden", "true");
      b.appendChild(mark);
      b.addEventListener("click", function (e) { answer(k, e.detail === 0); });
      group.appendChild(b);
      return b;
    });
    view.appendChild(group);

    fbEl = el("div", "app-fb");
    fbEl.setAttribute("aria-live", "polite");
    view.appendChild(fbEl);

    nextBtn = el("button", "app-next", i === N - 1 ? L.finish : L.next);
    nextBtn.type = "button";
    nextBtn.hidden = true;
    nextBtn.addEventListener("click", advance);
    view.appendChild(nextBtn);
    show(view);
  }

  // fromKeyboard: move focus to "Next" so keyboard and screen-reader users can continue;
  // after a tap or click the focus ring would only distract.
  function answer(k, fromKeyboard) {
    if (answered) return;           // a second tap or key press is ignored
    answered = true;
    var right = opts[k].ok, correct = "";
    if (right) score++;
    results.push(right);
    optButtons.forEach(function (b, j) {
      b.disabled = true;
      if (opts[j].ok) { b.classList.add("is-right"); correct = opts[j].t; }
      else if (j === k) b.classList.add("is-wrong");
      else b.classList.add("is-dim");
    });
    optButtons[k].setAttribute("aria-label", optButtons[k].textContent + " — " + (right ? L.right : L.wrong));

    fbEl.className = "app-fb show " + (right ? "ok" : "bad");
    fbEl.appendChild(el("b", null, right ? L.right : L.wrong));
    if (!right) fbEl.appendChild(el("span", "ans", L.answerIs + " " + correct));
    fbEl.appendChild(el("p", null, D.questions[order[i]].w));
    paintProgress(-1);

    nextBtn.hidden = false;
    if (fromKeyboard) { try { nextBtn.focus({ preventScroll: true }); } catch (e) { nextBtn.focus(); } }
    // keep the button in view inside the small screen
    var bottom = nextBtn.offsetTop + nextBtn.offsetHeight + 20 - bodyEl.clientHeight;
    if (bottom > bodyEl.scrollTop) bodyEl.scrollTop = bottom;
  }

  function advance() {
    i++;
    if (i < N) renderQuestion(); else renderResult();
  }

  function renderResult() {
    countEl.textContent = fmt(L.scoreOf, { s: score, t: N });
    paintProgress(-1);
    var level = L.levels[score];
    var view = el("div", "app-view app-result");

    var r = 52, len = 2 * Math.PI * r;
    var ring = el("div", "ring" + (score < 3 ? " low" : ""));
    ring.setAttribute("role", "img");
    ring.setAttribute("aria-label", fmt(L.scoreOf, { s: score, t: N }));
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 132 132");
    svg.setAttribute("aria-hidden", "true");
    [["track", len, 0], ["val", len, len]].forEach(function (c) {
      var circle = document.createElementNS(ns, "circle");
      circle.setAttribute("class", c[0]);
      circle.setAttribute("cx", "66"); circle.setAttribute("cy", "66"); circle.setAttribute("r", String(r));
      circle.setAttribute("stroke-dasharray", String(c[1]));
      circle.setAttribute("stroke-dashoffset", String(c[2]));
      svg.appendChild(circle);
    });
    ring.appendChild(svg);
    var num = el("span"); num.setAttribute("aria-hidden", "true");
    var inner = el("span", null, score + "/" + N);
    inner.appendChild(el("small", null, Math.round(score / N * 100) + "%"));
    num.appendChild(inner);
    ring.appendChild(num);
    view.appendChild(ring);

    var h = el("h3", null, level[0]);
    h.setAttribute("tabindex", "-1");
    view.appendChild(h);
    view.appendChild(el("p", null, level[1]));
    view.appendChild(el("p", "note", score >= 3 ? L.passed : L.failed));
    view.appendChild(el("p", "cta-label", L.cta));

    var stores = el("div", "app-stores stores");
    [["ios", L.ios, "M16.37 12.6c.02 2.43 2.13 3.24 2.15 3.25-.02.06-.34 1.15-1.11 2.28-.67.98-1.36 1.95-2.46 1.97-1.07.02-1.42-.64-2.65-.64-1.23 0-1.62.62-2.64.66-1.06.04-1.87-1.06-2.54-2.03-1.38-2-2.43-5.64-1.02-8.1.7-1.22 1.96-2 3.32-2.02 1.04-.02 2.02.7 2.65.7.64 0 1.82-.86 3.07-.74.52.02 1.99.21 2.93 1.59-.08.05-1.75 1.02-1.73 3.05zM14.36 4.98c.56-.68.94-1.63.84-2.57-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.57-.85 2.49.9.07 1.82-.46 2.38-1.14z"],
     ["android", L.android, "M4 3.3v17.4c0 .3.17.56.42.68L13.6 12 4.42 2.62A.75.75 0 0 0 4 3.3zm10.68 7.62 2.5-2.5L6.1 2.1l8.58 8.82zm0 2.16L6.1 21.9l11.08-6.32-2.5-2.5zm5.97-2.04-2.4-1.37-2.73 2.33 2.73 2.33 2.4-1.37c.7-.4.7-1.52 0-1.92z"]
    ].forEach(function (s) {
      var a = el("a", "store " + s[0]);
      a.href = D.links[s[0]];
      var ic = document.createElementNS(ns, "svg"); ic.setAttribute("viewBox", "0 0 24 24"); ic.setAttribute("aria-hidden", "true");
      var p = document.createElementNS(ns, "path"); p.setAttribute("d", s[2]); ic.appendChild(p);
      a.appendChild(ic);
      var t = el("span"); t.appendChild(el("small", null, s[1][0])); t.appendChild(el("b", null, s[1][1]));
      a.appendChild(t);
      stores.appendChild(a);
    });
    view.appendChild(stores);

    var again = el("button", "app-again", L.again);
    again.type = "button";
    again.addEventListener("click", start);
    view.appendChild(again);
    show(view);

    var val = svg.querySelector(".val"), target = String(len * (1 - score / N));
    // A timer, not requestAnimationFrame: rAF never fires in a background tab,
    // which would leave the ring empty. The CSS transition does the animation.
    if (reduced) val.setAttribute("stroke-dashoffset", target);
    else setTimeout(function () { val.setAttribute("stroke-dashoffset", target); }, 40);
    try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
  }

  // 1-4 or A-D picks an answer while the focus is inside the demo.
  root.addEventListener("keydown", function (e) {
    if (answered || e.altKey || e.ctrlKey || e.metaKey || !optButtons) return;
    var k = "1234".indexOf(e.key);
    if (k < 0) k = "abcd".indexOf(e.key.toLowerCase());
    if (k >= 0 && k < optButtons.length && document.body.contains(optButtons[k])) { e.preventDefault(); answer(k, true); }
  });

  start();
})();
