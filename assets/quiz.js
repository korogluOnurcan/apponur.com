// Home-page demo: the app's own test screen and result screen with the app's free Test 1
// (the 20 questions free users get), colors and motion (fragment_question + TestQuestionPage,
// fragment_result + TestResultPage). A tap anywhere that is not a button opens the store.
(function () {
  "use strict";
  var root = document.getElementById("quiz");
  var dataEl = document.getElementById("quiz-data");
  if (!root || !dataEl || !root.animate) return;

  var D = JSON.parse(dataEl.textContent), L = D.labels, N = D.total, PASS = D.passMark;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SLIDE = { duration: 300, easing: "cubic-bezier(.4,0,.2,1)" };   // PageSlide: FastOutSlowIn, 300 ms
  var PUSH = { duration: 400, easing: "cubic-bezier(.45,0,.55,1)" };  // from_right / to_left, 400 ms
  var NS = "http://www.w3.org/2000/svg";
  var M = "0 -960 960 960";
  var ICONS = {
    back: [M, "m450.09-480 146.95 146.96Q612-318.09 612-296t-14.96 37.04Q582.09-244 560-244t-37.04-14.96L339.52-442.39q-7.69-7.7-11.61-17.52Q324-469.74 324-480t3.91-20.09q3.92-9.82 11.61-17.52l183.44-183.43Q537.91-716 560-716t37.04 14.96Q612-686.09 612-664t-14.96 37.04L450.09-480Z"],
    fwd: [M, "M485.91-480 338.96-626.96Q324-641.91 324-664t14.96-37.04Q353.91-716 376-716t37.04 14.96l183.44 183.43q7.69 7.7 11.61 17.52Q612-490.26 612-480t-3.91 20.09q-3.92 9.82-11.61 17.52L413.04-258.96Q398.09-244 376-244t-37.04-14.96Q324-273.91 324-296t14.96-37.04L485.91-480Z"],
    speak: [M, "M766.22-481q0-82.52-43.88-150.9-43.88-68.38-117.41-102.62-15.47-7.24-22.47-22.46-7-15.22-1.53-30.93 6.24-16.72 22.34-23.96 16.1-7.24 32.58 0 97.48 43.96 155.72 133.05Q849.8-589.72 849.8-481t-58.23 197.82q-58.24 89.09-155.72 133.05-16.48 7.24-32.58 0-16.1-7.24-22.34-23.96-5.47-15.71 1.53-30.93 7-15.22 22.47-22.46 73.53-34.24 117.41-102.62 43.88-68.38 43.88-150.9ZM274.98-351.87H155.7q-19.16 0-32.33-13.17-13.17-13.18-13.17-32.33v-165.26q0-19.15 13.17-32.33 13.17-13.17 32.33-13.17h119.28L408.65-741.8q21.63-21.64 49.6-9.82 27.97 11.82 27.97 42.4v458.44q0 30.58-27.97 42.4t-49.6-9.82L274.98-351.87ZM669.8-480q0 42.48-19.47 80.34-19.48 37.86-51.44 62.57-10.72 6.48-21.69.5-10.98-5.98-10.98-18.69v-251.44q0-12.71 10.98-18.57 10.97-5.86 21.69.62 31.96 25.71 51.44 63.95Q669.8-522.48 669.8-480Z"],
    fav: [M, "m480-219.09-151.61 64.66q-53 22.08-100.3-9.09-47.31-31.18-47.31-88.22v-501.48q0-44.3 30.85-75.15 30.85-30.85 75.15-30.85h386.44q44.3 0 75.15 30.85 30.85 30.85 30.85 75.15v501.48q0 57.04-47.31 88.22-47.3 31.17-100.3 9.09L480-219.09Zm0-115.69 193.22 82.61v-501.05H286.78v501.05L480-334.78Zm0-418.44H286.78h386.44H480Z"],
    favOn: [M, "m480-219.09-151.61 64.66q-53 22.08-100.3-9.05-47.31-31.13-47.31-88.26v-501.48q0-44.3 30.85-75.15 30.85-30.85 75.15-30.85h386.44q44.3 0 75.15 30.85 30.85 30.85 30.85 75.15v501.48q0 57.13-47.31 88.26-47.3 31.13-100.3 9.05L480-219.09Z"],
    replay: [M, "M331.87-87.3q-69.17-29.92-120.5-81.24-51.33-51.33-81.24-120.5-29.91-69.18-29.91-147.57 0-22.09 15.45-37.54 15.46-15.46 37.55-15.46 22.08 0 37.54 15.46 15.46 15.45 15.46 37.54 0 114.18 79.8 193.7 79.81 79.52 193.98 79.52 114.17 0 193.98-79.81 79.8-79.8 79.8-193.97 0-114.18-80.08-193.7-80.09-79.52-194.27-79.52h-6.56l26.65 26.65q13.13 13.13 12.91 31.11-.21 17.98-12.91 31.11-13.13 13.13-31.89 13.35-18.76.21-31.89-12.92l-104.7-104.69q-15.95-15.96-15.95-37.61T331.04-801l104.7-104.7q13.13-13.13 31.89-12.91 18.76.22 31.89 13.91 12.7 13.13 12.63 31.4-.06 18.26-13.19 31.39l-25.53 25.52h6q78.96 0 148.14 29.91 69.17 29.91 120.78 81.24t81.52 120.22q29.91 68.89 29.91 147.85 0 78.95-29.91 148.13-29.91 69.17-81.24 120.5-51.33 51.32-120.5 81.24Q558.96-57.39 480-57.39T331.87-87.3Z"],
    check: [M, "m382-388 321-321q19-19 45-19t45 19q19 19 19 45t-19 45L427-253q-19 19-45 19t-45-19L167-423q-19-19-19-45t19-45q19-19 45-19t45 19l125 125Z"],
    close: [M, "M480-392 300-212q-18 18-44 18t-44-18q-18-18-18-44t18-44l180-180-180-180q-18-18-18-44t18-44q18-18 44-18t44 18l180 180 180-180q18-18 44-18t44 18q18 18 18 44t-18 44L568-480l180 180q18 18 18 44t-18 44q-18 18-44 18t-44-18L480-392Z"],
    grid: [M, "M202.87-520q-37.54 0-64.27-26.73-26.73-26.73-26.73-64.27v-146.13q0-37.54 26.73-64.27 26.73-26.73 64.27-26.73H349q37.54 0 64.27 26.73Q440-794.67 440-757.13V-611q0 37.54-26.73 64.27Q386.54-520 349-520H202.87Zm0 408.13q-37.54 0-64.27-26.73-26.73-26.73-26.73-64.27V-349q0-37.54 26.73-64.27Q165.33-440 202.87-440H349q37.54 0 64.27 26.73Q440-386.54 440-349v146.13q0 37.54-26.73 64.27-26.73 26.73-64.27 26.73H202.87ZM611-520q-37.54 0-64.27-26.73Q520-573.46 520-611v-146.13q0-37.54 26.73-64.27 26.73-26.73 64.27-26.73h146.13q37.54 0 64.27 26.73 26.73 26.73 26.73 64.27V-611q0 37.54-26.73 64.27Q794.67-520 757.13-520H611Zm0 408.13q-37.54 0-64.27-26.73Q520-165.33 520-202.87V-349q0-37.54 26.73-64.27Q573.46-440 611-440h146.13q37.54 0 64.27 26.73 26.73 26.73 26.73 64.27v146.13q0 37.54-26.73 64.27-26.73 26.73-64.27 26.73H611Z"],
    expand: [M, "M456-343q-12-5-21-14L252-540q-18-18-18-44t18-44q18-18 44-18t44 18l140 140 140-140q18-18 44-18t44 18q18 18 18 44t-18 44L525-357q-9 9-21 14t-24 5q-12 0-24-5Z"],
    verified: [M, "m438-454.63-56.33-55.57q-11.71-11.71-29.05-11.71t-29.82 12.48q-11.71 11.71-11.71 29.43t11.71 29.43l83.13 83.14q13.68 13.67 32.07 13.67t32.07-13.67L637.2-534.57q12.47-12.47 12.09-29.43-.38-16.96-12.09-29.43-12.48-12.48-29.82-12.86-17.34-.38-29.81 12.09L438-454.63ZM320.26-84.02l-57.28-97.05-108.81-23.76q-16.91-3.47-27.22-17.65-10.32-14.17-8.32-31.32l11-111.57-74.04-85.04Q44.15-463.09 44.15-480t11.44-29.59l74.04-85.04-11-111.57q-2-17.15 8.32-31.32 10.31-14.18 27.22-17.65l108.81-23.76 57.28-97.05q8.96-14.67 24.99-19.89 16.03-5.22 31.95 1.5L480-850.85l102.8-43.52q15.92-6.72 31.95-1.5t24.99 19.89l57.28 97.05 108.81 23.76q16.91 3.47 27.22 17.65 10.32 14.17 8.32 31.32l-11 111.57 74.04 85.04q11.44 12.68 11.44 29.59t-11.44 29.59l-74.04 85.04 11 111.57q2 17.15-8.32 31.32-10.31 14.18-27.22 17.65l-108.81 23.76-57.28 97.05q-8.96 14.67-24.99 19.89-16.03 5.22-31.95-1.5L480-109.15 377.2-65.63q-15.92 6.72-31.95 1.5t-24.99-19.89Z"],
    more: [M, "M472-480 332-620q-18-18-18-44t18-44q18-18 44-18t44 18l183 183q9 9 14 21t5 24q0 12-5 24t-14 21L420-252q-18 18-44 18t-44-18q-18-18-18-44t18-44l140-140Z"],
    apple: ["0 0 24 24", "M16.37 12.6c.02 2.43 2.13 3.24 2.15 3.25-.02.06-.34 1.15-1.11 2.28-.67.98-1.36 1.95-2.46 1.97-1.07.02-1.42-.64-2.65-.64-1.23 0-1.62.62-2.64.66-1.06.04-1.87-1.06-2.54-2.03-1.38-2-2.43-5.64-1.02-8.1.7-1.22 1.96-2 3.32-2.02 1.04-.02 2.02.7 2.65.7.64 0 1.82-.86 3.07-.74.52.02 1.99.21 2.93 1.59-.08.05-1.75 1.02-1.73 3.05zM14.36 4.98c.56-.68.94-1.63.84-2.57-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.57-.85 2.49.9.07 1.82-.46 2.38-1.14z"],
    play: ["0 0 24 24", "M4 3.3v17.4c0 .3.17.56.42.68L13.6 12 4.42 2.62A.75.75 0 0 0 4 3.3zm10.68 7.62 2.5-2.5L6.1 2.1l8.58 8.82zm0 2.16L6.1 21.9l11.08-6.32-2.5-2.5zm5.97-2.04-2.4-1.37-2.73 2.33 2.73 2.33 2.4-1.37c.7-.4.7-1.52 0-1.92z"]
  };
  // The option and header marks (ic_option_correct / ic_option_wrong / ic_test_passed / ic_test_failed).
  var SQUIRCLE = "M3.554,12.336a11.785,11.785,0,0,1,8.782-8.782,20.95,20.95,0,0,1,9.569,0,11.785,11.785,0,0,1,8.782,8.782,20.951,20.951,0,0,1,0,9.569A11.785,11.785,0,0,1,21.9,30.686a20.951,20.951,0,0,1-9.569,0A11.785,11.785,0,0,1,3.554,21.9,20.95,20.95,0,0,1,3.554,12.336Z";
  var BADGE = "M3.763,15.869A16.245,16.245,0,0,1,15.869,3.763a28.881,28.881,0,0,1,13.191,0A16.245,16.245,0,0,1,41.166,15.869a28.881,28.881,0,0,1,0,13.191A16.245,16.245,0,0,1,29.06,41.166a28.881,28.881,0,0,1-13.191,0A16.245,16.245,0,0,1,3.763,29.06,28.881,28.881,0,0,1,3.763,15.869Z";

  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function icon(name) {
    var s = svgEl("svg", { viewBox: ICONS[name][0], "aria-hidden": "true" });
    s.appendChild(svgEl("path", { d: ICONS[name][1] }));
    return s;
  }
  function optionMark(right) {
    var s = svgEl("svg", { viewBox: "0 0 29.756 29.756", "aria-hidden": "true", class: "ic" });
    var g = svgEl("g", { transform: "translate(-2.242 -2.242)" });
    g.appendChild(svgEl("path", { d: SQUIRCLE, fill: "#fff", stroke: "#fff", "stroke-width": "1.5" }));
    g.appendChild(right
      ? svgEl("path", { d: "M9.25,12.746l3.138,3.138L17.879,10", transform: "translate(3.556 3.982)", fill: "none", stroke: "#A2CB76", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" })
      : svgEl("path", { d: "M15.779,10.232l-5.547,5.547m5.547,0-5.547-5.547", transform: "translate(4.114 4.114)", fill: "none", stroke: "#F55364", "stroke-width": "2.5", "stroke-linecap": "round" }));
    s.appendChild(g);
    return s;
  }
  function headerMark(passed) {
    var s = svgEl("svg", { viewBox: "0 0 38.93 38.93", "aria-hidden": "true" });
    var g = svgEl("g", { transform: "translate(-3 -3)" });
    g.appendChild(svgEl("path", { d: BADGE, fill: passed ? "#86B953" : "#E22401" }));
    g.appendChild(passed
      ? svgEl("path", { d: "M9.25,13.785l4.326,4.326L21.145,10", transform: "translate(7.267 8.139)", fill: "none", stroke: "#fff", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" })
      : svgEl("path", { d: "M17.885,10.232l-7.653,7.652m7.653,0-7.653-7.652", transform: "translate(8.422 8.422)", fill: "none", stroke: "#fff", "stroke-width": "2.5", "stroke-linecap": "round" }));
    s.appendChild(g);
    return s;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(cls, label) {
    var b = el("button", cls + " press");
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    return b;
  }
  function fmt(s, n) { return s.replace("{n}", n); }

  // ---------- state ----------
  var questions = [], answers = [], favorites = {}, idx = 0, mode = "test";
  var page = null, busy = false, Q = null, slide = null;
  var live = el("p", "sr-only"); live.setAttribute("aria-live", "polite");

  // The visitor's store: Google Play on Android, the App Store everywhere else.
  var STORE = /android/i.test(navigator.userAgent) ? D.links.android : D.links.ios;
  function openStore() {
    var a = document.createElement("a");
    a.href = STORE; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  }
  function counts() {
    var c = 0, w = 0;
    answers.forEach(function (a, i) { if (a === null) return; if (a === questions[i].a) c++; else w++; });
    return { c: c, w: w, done: c + w };
  }

  // ---------- speech (the app reads questions aloud with the phone's own voice) ----------
  // Browsers often default to a novelty or very old voice, so pick the most natural one the
  // device has: neural / natural voices first, then premium and enhanced, Google's, then the
  // well-known good system voices. Novelty voices are never used.
  var synth = "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function" ? window.speechSynthesis : null;
  var canSpeak = !!synth, voice = null, speaking = false;
  // Novelty voices, by English name, by their names on a Turkish or Spanish system, and by voiceURI
  // (com.apple.speech.synthesis.voice.BadNews, ...), which does not change with the system language.
  var NOVELTY = /\b(albert|bad ?news|bahh|bells|boing|bubbles|cellos|wobble|fred|good ?news|jester|junior|organ|pipe ?organ|superstar|ralph|trinoids|whisper|zarvox|deranged|hysterical|kathy|princess|vicki|victoria|bruce|agnes)\b/i;
  // JavaScript's \b only knows ASCII letters, so the localized names (İyi Haber, ...) get their own test.
  var NOVELTY_LOCAL = /(İ|i̇|i|ı)yi haber|kötü haber|^org(\s|$)|noticias|órgano|burbujas|campanas/i;
  var OLD = /eloquence|\b(grandma|grandpa|rocko|eddy|flo|reed|sandy|shelley)\b/i;   // older, flatter voices
  var GOOD = /\b(samantha|ava|allison|susan|zoe|evan|nathan|joelle|tom|noelle|nicky|aaron|paulina|m[oó]nica|juan|marisol|jorge|diego|isabela|francisca|ang[eé]lica|soledad)\b/i;
  function score(v) {
    var n = (v.name || "") + " " + (v.voiceURI || ""), lang = (v.lang || "").replace("_", "-").toLowerCase(), want = L.voice.toLowerCase();
    if (lang.slice(0, 2) !== want.slice(0, 2) || NOVELTY.test(n) || NOVELTY_LOCAL.test(n) || NOVELTY_LOCAL.test(v.name || "")) return -1;
    var sc = lang === want ? 6 : /^es-(mx|us|419)|^en-(us|ca)/.test(lang) ? 4 : 0;
    if (/natural|neural/i.test(n)) sc += 100;
    else if (/premium/i.test(n)) sc += 90;
    else if (/enhanced|mejorad|geliştirilmiş/i.test(n)) sc += 80;
    else if (/google/i.test(n)) sc += 70;
    else if (GOOD.test(n)) sc += 60;
    else if (OLD.test(n)) sc += 10;
    else sc += 30;
    return sc;
  }
  function chooseVoice() {
    if (!synth) return;
    var best = null, bestScore = -1;
    (synth.getVoices() || []).forEach(function (v) { var sc = score(v); if (sc > bestScore) { best = v; bestScore = sc; } });
    voice = best;
  }
  if (synth) {
    chooseVoice();
    if (synth.addEventListener) synth.addEventListener("voiceschanged", chooseVoice);
    else synth.onvoiceschanged = chooseVoice;
  }
  // The speaker turns blue while reading, as in the app (QuestionFragment's speaker tint).
  function setSpeaking(on) {
    speaking = on;
    var b = Q && Q.speak;
    if (!b) return;
    b.classList.toggle("on", on);
    b.setAttribute("aria-label", on ? L.stop : L.speak);
  }
  function speak(text) {
    if (!synth) return;
    try {
      synth.cancel();
      if (!voice) chooseVoice();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = voice ? voice.lang : L.voice;
      if (voice) u.voice = voice;
      u.rate = 1; u.pitch = 1;
      u.onstart = function () { setSpeaking(true); };
      u.onend = u.onerror = function () { setSpeaking(false); };
      synth.speak(u);
    } catch (e) { setSpeaking(false); }
  }
  function hush() { if (synth) try { synth.cancel(); } catch (e) {} setSpeaking(false); }

  // ---------- screen transitions ----------
  // A new screen comes in from the right while the old one leaves to the left (and the other way
  // round when going back), like the app's NavController.push.
  function show(next, forward, focus) {
    hush();
    var old = page;
    page = next;
    root.appendChild(next);
    function done() {
      if (focus) { var f = next.querySelector("button"); if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
      if (next._onShown) next._onShown();
    }
    if (!old || reduced) {
      if (old) old.remove();
      done();
      return;
    }
    busy = true;
    var dir = forward ? 1 : -1;
    old.animate([{ transform: "translateX(0)" }, { transform: "translateX(" + (-100 * dir) + "%)" }], PUSH);
    var a = next.animate([{ transform: "translateX(" + (100 * dir) + "%)" }, { transform: "translateX(0)" }], PUSH);
    var ended = false;
    function end() {
      if (ended) return;
      ended = true;
      old.remove();
      try { a.cancel(); } catch (e) {}   // lands the new screen in place if the motion was late
      busy = false;
      done();
    }
    a.onfinish = end; a.oncancel = end;
    setTimeout(end, PUSH.duration + 250);   // never stay blocked if the animation is dropped
  }

  // ---------- question page ----------
  function questionPage() {
    var p = el("div", "app-page");
    var bar = el("div", "a-bar");
    var back = button("a-circle", L.back); back.appendChild(icon("back"));
    var spk = button("a-circle speak", L.speak); spk.appendChild(icon("speak"));
    if (!canSpeak) spk.style.visibility = "hidden";
    var titles = el("div", "a-titles");
    titles.appendChild(el("div", "a-title", L.title));
    titles.appendChild(el("div", "a-sub", L.subtitle));
    bar.appendChild(back); bar.appendChild(spk); bar.appendChild(titles);
    p.appendChild(bar);

    var head = null, revnum = null, cn = null, wn = null, pos = null;
    if (mode === "review") {
      revnum = el("div", "a-revnum");
      p.appendChild(revnum);
    } else {
      head = el("div", "a-head");
      head.setAttribute("role", "status");
      var c = el("span", "c"); c.appendChild(headerMark(true)); cn = el("span", null, "0"); c.appendChild(cn);
      pos = el("span", "pos");
      var w = el("span", "w"); wn = el("span", null, "0"); w.appendChild(wn); w.appendChild(headerMark(false));
      head.appendChild(c); head.appendChild(pos); head.appendChild(w);
      p.appendChild(head);
    }
    var view = el("div", "a-view");
    var scroll = el("div", "a-scroll");
    view.appendChild(scroll);
    p.appendChild(view);
    var prog = el("div", "a-prog"); var fillBar = el("i"); prog.appendChild(fillBar);
    p.appendChild(prog);
    var nav = el("div", "a-nav");
    var prev = button("nb", L.previous); prev.appendChild(icon("back"));
    var fav = button("fav", L.favAdd);
    var next = button("nb", L.next); next.appendChild(icon("fwd"));
    nav.appendChild(prev); nav.appendChild(fav); nav.appendChild(next);
    p.appendChild(nav);
    p.appendChild(live);

    back.addEventListener("click", function (e) { if (mode === "review") toResult(false, e.detail === 0); else go(-1, e.detail === 0); });
    spk.addEventListener("click", function () { if (speaking) hush(); else speak(questions[idx].q); });
    prev.addEventListener("click", function (e) { go(-1, e.detail === 0); });
    next.addEventListener("click", function (e) { go(1, e.detail === 0); });
    fav.addEventListener("click", function () {
      var on = !favorites[questions[idx].n];
      favorites[questions[idx].n] = on;
      drawFav(true, on);
    });

    Q = { page: p, scroll: scroll, view: view, head: head, revnum: revnum, cn: cn, wn: wn, pos: pos, bar: fillBar, fav: fav, speak: spk };
    fill(scroll, idx);
    chrome(false);
    return p;
  }

  function drawFav(animate, on) {
    var f = Q.fav;
    if (on === undefined) on = !!favorites[questions[idx].n];
    while (f.firstChild) f.removeChild(f.firstChild);
    f.appendChild(icon(on ? "favOn" : "fav"));
    f.setAttribute("aria-label", on ? L.favRemove : L.favAdd);
    f.setAttribute("aria-pressed", on ? "true" : "false");
    if (animate && !reduced) {
      f.classList.remove("pop", "out"); void f.offsetWidth; f.classList.add(on ? "pop" : "out");
    }
  }

  // Header counts or the review number, the progress capsule and the bookmark.
  function chrome(animated) {
    var k = counts();
    if (Q.head) {
      Q.cn.textContent = k.c; Q.wn.textContent = k.w;
      Q.pos.textContent = L.question + " " + (idx + 1) + "/" + N;
      Q.head.setAttribute("aria-label", L.question + " " + (idx + 1) + "/" + N + ", " + L.correct + " " + k.c + ", " + L.wrong + " " + k.w);
    } else {
      while (Q.revnum.firstChild) Q.revnum.removeChild(Q.revnum.firstChild);
      Q.revnum.appendChild(el("b", null, L.question + " " + (idx + 1)));
      Q.revnum.appendChild(document.createTextNode("/" + N));
    }
    if (!animated) Q.bar.style.transition = "none";
    Q.bar.style.width = (k.done / N * 100) + "%";
    if (!animated) { void Q.bar.offsetWidth; Q.bar.style.transition = ""; }
    drawFav(false);
  }

  // Draws question i into a scroll box: the question, then the four options, with the
  // explanation folded under the right one.
  function fill(scroll, i) {
    while (scroll.firstChild) scroll.removeChild(scroll.firstChild);
    var q = questions[i];
    scroll.appendChild(el("p", "a-q", q.q));
    q.o.forEach(function (text, k) {
      var wrap = el("div", "a-opt");
      var b = button("a-btn");
      b.appendChild(el("span", "ic"));
      b.appendChild(el("span", "tx", text));
      b.addEventListener("click", function () { choose(i, k, text); });
      wrap.appendChild(b);
      if (k === q.a && q.e) {
        var exp = el("div", "a-exp"); var inner = el("div"); inner.appendChild(el("p", null, q.e)); exp.appendChild(inner);
        exp.setAttribute("aria-hidden", "true");
        wrap.appendChild(exp);
      }
      scroll.appendChild(wrap);
    });
    look(scroll, i);
  }

  // The look of each option (TestQuestionPage.bindOption).
  function look(scroll, i) {
    var q = questions[i], a = answers[i], answered = a !== null;
    var wraps = scroll.querySelectorAll(".a-opt");
    for (var k = 0; k < wraps.length; k++) {
      var b = wraps[k].querySelector(".a-btn"), right = k === q.a;
      var kind = answered && k === a && right ? "right" : answered && k === a ? "wrong" : answered && right ? "right" : mode === "review" && right ? "revealed" : "";
      b.className = "a-btn press" + (kind ? " " + kind : "");
      b.replaceChild(kind === "right" ? optionMark(true) : kind === "wrong" ? optionMark(false) : el("span", "ic"), b.firstChild);
      b.setAttribute("aria-disabled", answered || mode === "review" ? "true" : "false");
      var text = q.o[k];
      b.setAttribute("aria-label", text + (kind === "right" || kind === "revealed" ? ", " + L.correct : kind === "wrong" ? ", " + L.wrong : ""));
      var exp = wraps[k].querySelector(".a-exp");
      if (exp) {
        var open = kind === "right" || kind === "revealed";
        exp.classList.toggle("open", open);
        exp.setAttribute("aria-hidden", open ? "false" : "true");
      }
    }
  }

  function choose(i, k, text) {
    if (busy || i !== idx) return;
    if (mode === "review" || answers[i] !== null) { speak(text); return; }   // an answered option is read aloud, as in the app
    answers[i] = k;
    look(Q.scroll, i);
    chrome(true);
    var q = questions[i];
    live.textContent = (k === q.a ? L.correct : L.wrong) + ". " + q.e;
  }

  // Previous / next question, sliding like PageSlide: a picture of the old page leaves while the
  // new one comes in, both fully visible; a tap during the motion ends it at once.
  function go(step, keyboard) {
    if (busy) return;
    var to = idx + step;
    if (to < 0) return;
    if (to >= N) { toResult(true, keyboard); return; }
    finishSlide();
    hush();
    var cur = Q.scroll, picture = cur.cloneNode(true);
    picture.setAttribute("aria-hidden", "true");
    picture.style.pointerEvents = "none";
    Q.view.appendChild(picture);
    picture.scrollTop = cur.scrollTop;
    idx = to;
    fill(cur, idx);
    cur.scrollTop = 0;
    chrome(false);
    if (reduced) { picture.remove(); return; }
    var dir = step > 0 ? 1 : -1;
    var a1 = picture.animate([{ transform: "translateX(0)" }, { transform: "translateX(" + (-100 * dir) + "%)" }], SLIDE);
    var a2 = cur.animate([{ transform: "translateX(" + (100 * dir) + "%)" }, { transform: "translateX(0)" }], SLIDE);
    var s = { a: [a1, a2], picture: picture };
    slide = s;
    a2.onfinish = function () { if (slide === s) finishSlide(); };
    setTimeout(function () { if (slide === s) finishSlide(); }, SLIDE.duration + 250);
  }
  function finishSlide() {
    if (!slide) return;
    var s = slide; slide = null;
    s.a.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    s.picture.remove();
  }

  // ---------- result page ----------
  function toResult(forward, keyboard) {
    if (busy) return;
    finishSlide();
    var celebrate = mode === "test";
    mode = "result";
    show(resultPage(celebrate), forward, keyboard);
  }

  function resultPage(celebrate) {
    var k = counts(), c = k.c, w = k.w;
    var p = el("div", "app-page");
    var bar = el("div", "a-bar");
    var back = button("a-circle", L.back); back.appendChild(icon("back"));
    var titles = el("div", "a-titles a-left");
    titles.appendChild(el("div", "a-title", L.subtitle));
    titles.appendChild(el("div", "a-sub", L.title));
    var tryAgain = button("r-try");
    tryAgain.appendChild(el("span", null, L.tryAgain)); tryAgain.appendChild(icon("replay"));
    bar.appendChild(back); bar.appendChild(titles); bar.appendChild(tryAgain);
    p.appendChild(bar);

    var scroll = el("div", "r-scroll");
    var card = el("div", "r-card");
    var ring = el("div", "r-ring");
    var svg = svgEl("svg", { viewBox: "0 0 236 236", "aria-hidden": "true" });
    ring.appendChild(svg);
    var center = el("div", "r-center");
    var score = el("div", "r-score");
    var num = el("b", null, String(celebrate && !reduced ? 0 : c));
    score.appendChild(num); score.appendChild(el("span", null, "/" + N));
    center.appendChild(score); center.appendChild(el("small", null, L.correct));
    ring.appendChild(center);
    ring.setAttribute("role", "img");
    ring.setAttribute("aria-label", c + "/" + N + " " + L.correct);
    card.appendChild(ring);

    var passed = c >= PASS;
    var head = el("h3", "r-head", headline(c));
    head.style.color = passed ? "#86B953" : "#E22401";
    card.appendChild(head);
    card.appendChild(el("p", "r-msg", message(c, w)));
    var review = button("r-review");
    review.appendChild(el("span", null, L.review)); review.appendChild(icon("more"));
    card.appendChild(review);
    scroll.appendChild(card);

    var tiles = el("div", "r-tiles");
    [[c, L.correct, "check", "#86B953", "rgba(134,185,83,.14)"], [w, L.wrong, "close", "#E22401", "rgba(226,36,1,.14)"]].forEach(function (t) {
      var tile = el("div", "r-tile");
      var i = el("span", "i"); i.style.color = t[3]; i.style.background = t[4]; i.appendChild(icon(t[2]));
      tile.appendChild(i); tile.appendChild(el("b", null, String(t[0]))); tile.appendChild(el("small", null, t[1]));
      tiles.appendChild(tile);
    });
    scroll.appendChild(tiles);
    var bars = topicsCard(scroll);

    var cta = el("div", "r-cta");
    var t = el("div", "t");
    var ic = el("span", "i"); var img = el("img"); img.src = D.icon; img.alt = ""; img.width = 36; img.height = 36; ic.appendChild(img);
    var tt = el("div"); tt.appendChild(el("b", null, L.ctaTitle)); tt.appendChild(el("small", null, L.ctaSub));
    t.appendChild(ic); t.appendChild(tt); cta.appendChild(t);
    var stores = el("div", "r-stores");
    var order = /android/i.test(navigator.userAgent) ? ["android", "ios"] : ["ios", "android"];
    order.forEach(function (s) {
      var a = el("a", "r-store press");
      a.href = D.links[s];
      a.appendChild(icon(s === "ios" ? "apple" : "play"));
      var label = el("span"); label.appendChild(el("small", null, L[s][0])); label.appendChild(document.createTextNode(L[s][1]));
      a.appendChild(label);
      stores.appendChild(a);
    });
    cta.appendChild(stores);
    scroll.appendChild(cta);
    p.appendChild(scroll);

    var next = button("r-next");
    next.textContent = L.nextTest;
    p.appendChild(next);

    back.addEventListener("click", function (e) { openReview(idx, e.detail === 0); });
    review.addEventListener("click", function (e) { openReview(0, e.detail === 0); });
    tryAgain.addEventListener("click", function (e) { if (!busy) start(questions, false, e.detail === 0); });
    next.addEventListener("click", openStore);   // the next tests are Premium in the app

    var draw = drawRing(svg, c / N, w / N, PASS / N);
    p._onShown = function () {
      if (!celebrate || reduced) { draw(1, 1); bars.forEach(function (b) { b(1); }); return; }
      animateRing(draw, num, c, bars);
      if (passed) setTimeout(function () { if (page === p) confetti(p); }, 1200);
    };
    return p;
  }

  // Results by Topic: folded, one row per topic in the app's topic order, bars that fill with the ring.
  function topicsCard(scroll) {
    var rows = [];
    D.topics.forEach(function (t) {
      var r = { name: t.name, c: 0, w: 0, total: 0 };
      questions.forEach(function (q, i) {
        if (q.n < t.first || q.n > t.last) return;
        r.total++;
        if (answers[i] === null) return;
        if (answers[i] === q.a) r.c++; else r.w++;
      });
      if (r.total) rows.push(r);
    });
    if (rows.length <= 1) return [];
    var card = el("div", "r-topics");
    var hd = button("hd");
    hd.setAttribute("aria-expanded", "false");
    var i = el("span", "i"); i.appendChild(icon("grid"));
    var tt = el("span", "tt");
    var perfect = rows.filter(function (r) { return r.c === r.total; }).length;
    tt.appendChild(el("b", null, L.resultsTopic));
    tt.appendChild(el("small", null, fmt(L.topicsCount, rows.length) + (perfect ? " · " + fmt(L.allCorrect, perfect) : "")));
    var chev = icon("expand"); chev.setAttribute("class", "chev");
    hd.appendChild(i); hd.appendChild(tt); hd.appendChild(chev);
    card.appendChild(hd);
    var list = el("div", "r-rows"); var inner = el("div"); list.appendChild(inner);
    var bars = [];
    rows.forEach(function (r, k) {
      var row = el("div", "r-row");
      var hr = el("hr"); hr.style.opacity = k === 0 ? "1" : "0.6"; row.appendChild(hr);
      var ln = el("div", "ln");
      ln.appendChild(el("span", "nm", r.name));
      if (r.c === r.total) { var ok = icon("verified"); ok.setAttribute("class", "ok"); ln.appendChild(ok); }
      ln.appendChild(el("span", "sc", r.c + "/" + r.total));
      row.appendChild(ln);
      var bar = el("div", "bar"); var g = el("i"); var red = el("i");
      g.style.background = "#86B953"; red.style.background = "#E22401";
      bar.appendChild(g); bar.appendChild(red); row.appendChild(bar);
      inner.appendChild(row);
      bars.push(function (progress) {
        var cw = r.c / r.total * 100 * progress, ww = r.w / r.total * 100 * progress;
        g.style.width = cw + "%"; red.style.left = cw + "%"; red.style.width = ww + "%";
      });
    });
    card.appendChild(list);
    list.setAttribute("aria-hidden", "true");
    hd.addEventListener("click", function () {
      var open = card.classList.toggle("open");
      hd.setAttribute("aria-expanded", open ? "true" : "false");
      list.setAttribute("aria-hidden", open ? "false" : "true");
    });
    scroll.appendChild(card);
    bars.forEach(function (b) { b(0); });
    return bars;
  }

  function openReview(at, keyboard) {
    if (busy) return;
    mode = "review"; idx = at;
    show(questionPage(), true, keyboard);
  }

  function start(set, forward, keyboard) {
    questions = set; answers = set.map(function () { return null; }); idx = 0; mode = "test";
    show(questionPage(), forward, keyboard);
  }

  // TestResultPage.headline / message, with this demo's 5 questions and pass mark of 3.
  function headline(c) {
    return c === N ? L.perfect : c >= PASS ? L.passed : PASS - c <= 3 ? L.close : L.keep;
  }
  function message(c, w) {
    if (c === N) return L.perfectMsg;
    if (c >= PASS) return w === 0 ? L.passedMsg : w === 1 ? L.oneMistake : fmt(L.mistakes, w);
    var gap = PASS - c === 1 ? L.oneMissing : PASS - c <= 3 ? fmt(L.fewMissing, PASS - c) : fmt(L.needCorrect, PASS);
    return gap + " " + (w === 0 ? L.answerEvery : w === 1 ? L.reviewOne : fmt(L.reviewMistakes, w));
  }

  // ResultScoreRingView: a 188dp circle with a 16dp band, green for right answers then red for
  // wrong ones, and a dashed green pass mark across the band.
  function drawRing(svg, cf, wf, pf) {
    var cx = 118, cy = 118, r = 94, band = 16;
    function pt(f) { var a = f * 2 * Math.PI; return (cx + r * Math.sin(a)).toFixed(2) + " " + (cy - r * Math.cos(a)).toFixed(2); }
    function arc(f0, f1) {
      if (f1 - f0 >= 0.9999) return "M" + pt(0) + " A" + r + " " + r + " 0 1 1 " + pt(0.5) + " A" + r + " " + r + " 0 1 1 " + pt(0.99999);
      return "M" + pt(f0) + " A" + r + " " + r + " 0 " + (f1 - f0 > 0.5 ? 1 : 0) + " 1 " + pt(f1);
    }
    svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "#FFFFFF", "stroke-width": band }));
    var red = svgEl("path", { fill: "none", stroke: "#E22401", "stroke-width": band, "stroke-linecap": "round" });
    var green = svgEl("path", { fill: "none", stroke: "#86B953", "stroke-width": band });
    var dot = svgEl("circle", { cx: cx, cy: cy - r, r: band / 2, fill: "#86B953" });
    var mark = svgEl("g", { transform: "rotate(" + pf * 360 + " " + cx + " " + cy + ")", opacity: "0" });
    mark.appendChild(svgEl("line", { x1: cx, y1: cy - r - band / 2, x2: cx, y2: cy - r + band / 2, stroke: "#F5F4F4", "stroke-width": 6 }));
    mark.appendChild(svgEl("line", { x1: cx, y1: cy - r - band / 2 - 8, x2: cx, y2: cy - r + band / 2 + 8, stroke: "#86B953", "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "4 4.5" }));
    [red, green, dot, mark].forEach(function (n) { svg.appendChild(n); });
    return function (progress, markAlpha) {
      var filled = (cf + wf) * progress, correctEnd = Math.min(filled, cf), showsWrong = filled > cf;
      if (showsWrong) red.setAttribute("d", arc(Math.max(0, cf - 0.01), filled)); else red.removeAttribute("d");
      if (correctEnd > 0) green.setAttribute("d", arc(0, correctEnd)); else green.removeAttribute("d");
      green.setAttribute("stroke-linecap", showsWrong ? "butt" : "round");
      dot.style.display = showsWrong && correctEnd > 0 ? "" : "none";
      mark.setAttribute("opacity", pf > 0 && pf < 1 ? String(Math.max(0, Math.min(1, markAlpha))) : "0");
    };
  }

  // Fills the ring once (1100 ms after a 200 ms pause, accelerate-decelerate) while the score
  // counts up; the pass mark pops in at 1000 ms. Time-based, so a hidden tab just jumps ahead.
  function animateRing(draw, num, c, bars) {
    var t0 = null, over = false;
    draw(0, 0);
    function end() { over = true; draw(1, 1); num.textContent = String(c); bars.forEach(function (b) { b(1); }); }
    function frame(now) {
      if (over) return;
      if (t0 === null) t0 = now;
      var t = now - t0;
      var p = Math.max(0, Math.min(1, (t - 200) / 1100));
      var e = (1 - Math.cos(Math.PI * p)) / 2;
      var m = Math.max(0, Math.min(1, (t - 1000) / 400));
      var o = m === 0 ? 0 : 1 + 2.70158 * Math.pow(m - 1, 3) + 1.70158 * Math.pow(m - 1, 2);
      draw(e, o);
      num.textContent = String(Math.round(e * c));
      bars.forEach(function (b) { b(e); });
      if (t < 1400) requestAnimationFrame(frame); else end();
    }
    requestAnimationFrame(frame);
    setTimeout(function () { if (!over) end(); }, 2000);   // a background tab gets no frames
  }

  // The app's confetti on a passed test: the flag's colors, burst from the upper middle.
  function confetti(p) {
    if (reduced) return;
    var cv = el("canvas", "r-confetti"), w = p.clientWidth, h = p.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.setAttribute("aria-hidden", "true");
    p.appendChild(cv);
    var ctx = cv.getContext("2d");
    if (!ctx) { cv.remove(); return; }
    ctx.scale(dpr, dpr);
    var colors = ["#B31942", "#8AAADE", "#0A3161", "#DFE8F7"], scale = w / 412, parts = [];
    for (var k = 0; k < 80; k++) {
      var ang = Math.random() * Math.PI * 2, sp = Math.random() * 30 * scale;
      parts.push({ x: w / 2, y: h * 0.3, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        s: (6 + Math.random() * 6) * scale, c: colors[k % 4], born: k * 1.25 });
    }
    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = now - t0, alive = false;
      ctx.clearRect(0, 0, w, h);
      parts.forEach(function (q) {
        if (t < q.born) { alive = true; return; }
        q.vx *= 0.9; q.vy = q.vy * 0.9 + 0.5 * scale; q.x += q.vx; q.y += q.vy; q.r += q.vr;
        var fade = Math.max(0, 1 - (t - q.born) / 2600);
        if (fade > 0 && q.y < h + 20) alive = true;
        ctx.globalAlpha = fade;
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore();
      });
      if (alive && cv.isConnected) requestAnimationFrame(frame); else cv.remove();
    }
    requestAnimationFrame(frame);
    setTimeout(function () { cv.remove(); }, 4000);
  }

  // 1-4 or A-D answers and the arrow keys move between questions, while the demo has focus.
  root.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || mode === "result" || !Q) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(1, true); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1, true); return; }
    if (!e.key || e.key.length !== 1) return;
    var k = "1234".indexOf(e.key);
    if (k < 0) k = "abcd".indexOf(e.key.toLowerCase());
    if (k >= 0 && mode === "test") { e.preventDefault(); choose(idx, k, questions[idx].o[k]); }
  });

  // Everything in the phone that is not a button or a link takes the visitor to the store.
  var device = root.closest(".phone") || root;
  device.classList.add("to-store");
  device.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("button, a")) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;   // selecting text is not a tap
    openStore();
  });

  while (root.firstChild) root.removeChild(root.firstChild);
  start(D.questions.slice(0, N), true, false);
})();
