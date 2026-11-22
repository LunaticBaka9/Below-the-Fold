/* ============================================================
   SOMNIA — behaviour
   A perfectly normal marketing site for the first 11 minutes.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (v, a, b) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var body = document.body;

  var state = {
    act: 0,
    name: "",
    email: "",
    start: Date.now(),
    voidOpen: false,
    endArmed: false,
    endOpened: false,
    boomDone: false,
    nextBlink: 0,
    blinkAt: -1e9,
    finaleStarted: false,
    ghostFree: false,
    act4Since: 0,
    mouse: { x: window.innerWidth * 0.72, y: window.innerHeight * 0.4 },
    ghost: { x: window.innerWidth * 0.72, y: window.innerHeight * 0.4 },
    travelPx: 0,
    lastMouse: null,
    v: 0,
    hiddenAt: 0,
    sessionId: String(Math.floor(Math.random() * 8999) + 1000),
    sectionTimer: null
  };

  /* ---------------------------------------------------------
     tiny utilities
     --------------------------------------------------------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function elapsedMs() { return Date.now() - state.start; }
  function fmtClock() {
    var d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function fmtShort() {
    var d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function fmtElapsed() {
    var s = Math.floor(elapsedMs() / 1000);
    return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  }
  function fmtElapsedLong() {
    var s = Math.floor(elapsedMs() / 1000);
    return Math.floor(s / 60) + "m " + pad(s % 60) + "s";
  }
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------------------------------------------------
     waveforms
     --------------------------------------------------------- */
  $$("[data-wave]").forEach(function (wave) {
    var n = parseInt(wave.getAttribute("data-wave"), 10) || 30;
    for (var i = 0; i < n; i++) {
      var bar = document.createElement("i");
      var h = 8 + Math.pow(Math.random(), 0.7) * 88;
      bar.style.height = h.toFixed(1) + "%";
      bar.style.animationDelay = (-Math.random() * 4).toFixed(2) + "s";
      bar.style.animationDuration = (2.4 + Math.random() * 2.6).toFixed(2) + "s";
      bar.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
      wave.appendChild(bar);
    }
  });

  /* ---------------------------------------------------------
     live readouts — the page is paying attention
     --------------------------------------------------------- */
  var live = {
    time: $$('[data-live="time"]'),
    timeShort: $$('[data-live="timeShort"]'),
    elapsedShort: $$('[data-live="elapsedShort"]'),
    elapsedLong: $$('[data-live="elapsedLong"]'),
    screen: $$('[data-live="screen"]'),
    travel: $$('[data-live="travel"]'),
    name: $$('[data-live="name"]'),
    status: $$('[data-live="status"]'),
    devices: $$('[data-live="devices"]'),
    sessionId: $$('[data-live="sessionId"]')
  };
  function fill(list, text) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].textContent !== text) list[i].textContent = text;
    }
  }
  live.screen.forEach(function (el) {
    el.textContent = window.screen.width + " × " + window.screen.height;
  });
  fill(live.sessionId, state.sessionId);

  function tick() {
    fill(live.time, fmtClock());
    fill(live.timeShort, fmtShort());
    fill(live.elapsedShort, fmtElapsed());
    fill(live.elapsedLong, fmtElapsedLong());
    var m = (state.travelPx * 0.000264583);
    fill(live.travel, m.toFixed(1) + " m");
    fill(live.name, state.name || (state.act >= 3 ? "unread" : "—"));
    fill(live.devices, state.act >= 3 ? "2" : "1");
  }
  tick();
  setInterval(tick, 500);

  /* ---------------------------------------------------------
     act system — the page changes its mind
     --------------------------------------------------------- */
  var SWAPS = {
    "nav-reviews": { 2: "Witnesses", 3: "Witnesses", 4: "Witnesses" },
    "nav-pricing": { 3: "Terms", 4: "Terms" },
    "nav-science": { 3: "Evidence", 4: "Evidence" },
    "cta": { 2: "Start tonight", 3: "Already started", 4: "Already started" },
    "faq-1": { 3: "Nothing leaves the house. Nothing has left the house since you arrived." },
    "faq-2": { 3: "Yes. It prefers when you are alone." },
    "faq-3": { 3: "You can try." },
    "captureNote": { 3: "No card. No commitment. No exit." }
  };
  var swapEls = $$("[data-swap]");
  swapEls.forEach(function (el) {
    el.setAttribute("data-original", el.textContent);
  });
  function applySwaps(act) {
    swapEls.forEach(function (el) {
      if (el.dataset && el.dataset.locked) return;
      var conf = SWAPS[el.getAttribute("data-swap")];
      if (!conf) return;
      var text = el.getAttribute("data-original");
      for (var i = 0; i <= act; i++) {
        if (conf[i] != null) text = conf[i];
      }
      if (el.textContent !== text) el.textContent = text;
    });
  }

  var TITLES = [
    "Somnia — Sleep is a skill.",
    "Somnia — Sleep is a skill.",
    "Somnia — Are you still awake?",
    "don't.",
    "still here"
  ];
  var FAVICONS = [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230e2a23'/%3E%3Cpath d='M43 15a20 20 0 1 0 7 36A22 22 0 0 1 43 15z' fill='%23f1ece2'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230e2a23'/%3E%3Cpath d='M43 15a20 20 0 1 0 7 36A22 22 0 0 1 43 15z' fill='%23f1ece2'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23171511'/%3E%3Cpath d='M7 32s9-13 25-13 25 13 25 13-9 13-25 13S7 32 7 32Z' fill='%23d9cdb7'/%3E%3Ccircle cx='32' cy='32' r='7.5' fill='%23171511'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230a0908'/%3E%3Cpath d='M7 32s9-13 25-13 25 13 25 13-9 13-25 13S7 32 7 32Z' fill='%238f2a1d'/%3E%3Ccircle cx='32' cy='32' r='7.5' fill='%23000'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23000'/%3E%3Ccircle cx='32' cy='32' r='3' fill='%233a0c08'/%3E%3C/svg%3E"
  ];
  var THEMES = ["#f2ede3", "#efe9dc", "#171511", "#0a0908", "#000000"];
  var faviconEl = $("#favicon");
  var themeEl = $("#themeColor");

  function setAct(n) {
    if (n === state.act || n == null) return;
    state.act = n;
    root.setAttribute("data-act", String(n));
    applySwaps(n);
    if (!state.finaleStarted) document.title = TITLES[n];
    if (faviconEl) faviconEl.setAttribute("href", FAVICONS[n]);
    if (themeEl) themeEl.setAttribute("content", THEMES[n]);
    if (window.SomniaSound) window.SomniaSound.setAct(n);
    updateSoundUI();
    if (n === 4 && !state.act4Since) state.act4Since = Date.now();
    var sleepers = $("#sleeperCount");
    if (sleepers) sleepers.textContent = (41000 + n).toLocaleString("en-US");
    if (n >= 3 && typeof consent !== "undefined" && consent) consent.classList.remove("is-shown");
    tick();
  }

  /* ---------------------------------------------------------
     scroll engine
     --------------------------------------------------------- */
  var sections = [];
  var scrollThumb = $("#scrollThumb");
  var endEl = $("#end");
  var voidEl = $("#void");
  var finalEl = $("#final");
  var scienceEl = $("#science");
  var faceEl = $("#face");
  var faceWrap = $("#faceWrap");
  var ghostEl = $("#ghostCursor");
  var lastY = 0;

  function measure() {
    sections = $$("[data-act]").map(function (el) {
      var rect = el.getBoundingClientRect();
      return {
        el: el,
        act: parseInt(el.getAttribute("data-act"), 10),
        top: rect.top + window.scrollY,
        height: rect.height
      };
    }).filter(function (s) { return s.height > 0; });
  }

  function updateActFromScroll(center) {
    var act = 0;
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (center >= s.top - 1 && center < s.top + s.height) act = s.act;
    }
    // once the page has turned, it does not turn back
    if (state.act >= 3 && act < 3) act = 3;
    setAct(act);
  }

  function onFrame() {
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    var p = max > 0 ? clamp(y / max, 0, 1) : 0;

    if (scrollThumb) scrollThumb.style.width = (p * 100).toFixed(2) + "%";

    body.classList.toggle("is-scrolled", y > 30);

    var center = y + vh * 0.5;
    updateActFromScroll(center);

    /* the doorway opens as you descend */
    if (scienceEl) {
      var sr = scienceEl.getBoundingClientRect();
      var total = sr.height - vh;
      if (total > 0 && sr.top < vh && sr.bottom > 0) {
        var d = clamp(-sr.top / total, 0, 1);
        scienceEl.style.setProperty("--door", d.toFixed(3));
        scienceEl.style.setProperty("--presence", (smooth(d, 0.5, 0.92) * 0.5).toFixed(3));
      }
    }

    if (state.voidOpen) updateVoid(y, vh);

    /* the second cursor */
    if (state.act >= 3 && !reduceMotion) {
      body.classList.add("has-ghost");
      var gx = state.ghost.x, gy = state.ghost.y;
      if (state.act >= 4 && Date.now() - state.act4Since > 5000) {
        var tx = vh * 0.5, ty = vh * 0.55;
        gx = lerp(gx, tx, 0.012);
        gy = lerp(gy, ty, 0.012);
      } else {
        gx = lerp(gx, state.mouse.x, 0.045);
        gy = lerp(gy, state.mouse.y, 0.045);
      }
      state.ghost.x = gx;
      state.ghost.y = gy;
      ghostEl.style.transform = "translate(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px)";
    }

    checkBottom(y, max);
    lastY = y;
    requestAnimationFrame(onFrame);
  }

  /* ---------------------------------------------------------
     the fake ending
     --------------------------------------------------------- */
  var endTitle = $("#endTitle");
  var endSub = $("#endSub");
  var endEyebrow = $("#endEyebrow");
  var endChevron = $("#endChevron");

  function checkBottom(y, max) {
    if (state.endOpened) return;
    var atBottom = y >= max - 3;

    if (atBottom && state.act >= 3 && !state.endArmed) {
      state.endArmed = true;
      state.sectionTimer = setTimeout(armEnding, 2300);
    } else if (!atBottom && state.endArmed) {
      state.endArmed = false;
      clearTimeout(state.sectionTimer);
      endEl.classList.remove("is-ready");
      endSub.textContent = "There’s nothing below this.";
      endEyebrow.textContent = "End of page";
    }
  }

  function armEnding() {
    if (state.endOpened) return;
    endSub.textContent = "It’s still below you.";
    endEyebrow.textContent = "Don’t";
    endEl.classList.add("is-ready");
    setTimeout(openVoid, 1250);
  }

  function openVoid() {
    if (state.endOpened || !state.endArmed) return;
    state.endOpened = true;
    state.voidOpen = true;
    voidEl.classList.add("is-open");
    finalEl.classList.add("is-open");
    setTimeout(measure, 1750);
    if (window.SomniaSound) window.SomniaSound.setAct(4);
  }

  /* ---------------------------------------------------------
     the room
     --------------------------------------------------------- */
  var voidLines = $$(".void-line");
  var faceEyes = $("#faceEyes");
  var voidGlow = $(".void-glow");

  function updateVoid(y, vh) {
    var r = voidEl.getBoundingClientRect();
    var total = r.height - vh;
    if (total <= 0) return;
    var v = clamp(-r.top / total, 0, 1);
    state.v = v;

    var reveal = smooth(v, 0.16, 0.64);
    var open = smooth(v, 0.4, 0.62);
    var close = smooth(v, 0.62, 0.95);
    var t = performance.now();
    if (v > 0.5 && t > state.nextBlink) {
      state.blinkAt = t;
      state.nextBlink = t + 4800 + Math.random() * 6500;
    }
    var blinkAge = t - (state.blinkAt || -1e9);
    var blink = blinkAge < 190 ? 0.04 : 1;

    var hint = $("#voidHint");
    if (hint) hint.classList.toggle("is-on", v < 0.08);

    if (reveal > 0.001) {
      var breathe = reduceMotion ? 0 : Math.sin(t / 4200) * 0.006;
      var sway = reduceMotion ? 0 : Math.sin(t / 9000) * 0.55;
      var scale = 0.56 + reveal * 0.12 + close * 0.62 + breathe;
      faceWrap.style.opacity = (reveal * 0.96).toFixed(3);
      faceWrap.style.transform = "translateY(" + ((1 - reveal) * 4 - close * 7).toFixed(2) + "vh) rotate(" + sway.toFixed(3) + "deg) scale(" + scale.toFixed(4) + ")";
      faceWrap.style.setProperty("--look-x", ((state.mouse.x / window.innerWidth - 0.5) * 26).toFixed(1) + "px");
      faceWrap.style.setProperty("--look-y", ((state.mouse.y / window.innerHeight - 0.5) * 16).toFixed(1) + "px");
    } else {
      faceWrap.style.opacity = "0";
    }

    faceEyes.style.opacity = open.toFixed(3);
    faceEyes.style.transform = "scale(" + (1 + close * 0.09).toFixed(3) + "," + ((0.02 + open * 0.98) * blink).toFixed(3) + ")";
    voidGlow.style.opacity = (reveal * 0.9).toFixed(3);

    if (v > 0.12 && !faceWrap.classList.contains("is-focus")) faceWrap.classList.add("is-focus");
    faceWrap.classList.toggle("is-clear", v > 0.66);
    faceWrap.classList.toggle("is-mouth-open", v > 0.86);

    var active = -1;
    for (var i = 0; i < voidLines.length; i++) {
      if (v >= parseFloat(voidLines[i].getAttribute("data-v"))) active = i;
    }
    for (var j = 0; j < voidLines.length; j++) {
      voidLines[j].classList.toggle("is-on", j === active);
    }

    if (v > 0.9 && !state.boomDone) {
      state.boomDone = true;
      if (window.SomniaSound) window.SomniaSound.boom();
      document.body.classList.add("is-shaking");
      setTimeout(function () { document.body.classList.remove("is-shaking"); }, 900);
    }

    /* whispers accumulate in the dark */
    $$("[data-w]").forEach(function (el) {
      var t = parseFloat(el.getAttribute("data-w"));
      var on = state.act >= 4 && v >= t && v < 0.97;
      if (on !== el.classList.contains("is-on")) el.classList.toggle("is-on", on);
    });
  }

  /* ---------------------------------------------------------
     the final page
     --------------------------------------------------------- */
  var finalTitle = $("#finalTitle");
  var finalNote1 = $("#finalNote1");
  var finalNote2 = $("#finalNote2");
  var finalMark = $("#finalMark");

  function startFinale() {
    if (state.finaleStarted) return;
    state.finaleStarted = true;
    document.title = "good night";
    body.classList.add("is-final");
    if (state.name) {
      finalTitle.innerHTML = "Good night, <span class=\"final-name\">" + escapeHTML(state.name) + "</span>.";
    }
    setTimeout(function () { finalNote1.classList.add("is-visible"); }, 1400);
    setTimeout(function () { finalNote2.classList.add("is-visible"); }, 7200);
    if (/^zh/i.test(navigator.language || "")) {
      var note3 = $("#finalNote3");
      setTimeout(function () { note3.classList.add("is-visible"); }, 11800);
    }
    if (window.SomniaSound) window.SomniaSound.finale();
  }

  if ("IntersectionObserver" in window) {
    var finalObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) startFinale();
      });
    }, { threshold: 0.35 });
    finalObs.observe(finalEl);

    /* session panel: statuses degrade the longer you sit there */
    var sessionEl = $("#session");
    var sessionWhisper = $("#sessionWhisper");
    var sessionStarted = false;
    var sessionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || sessionStarted) return;
        sessionStarted = true;
        setTimeout(function () { fill(live.status, "Still awake"); }, 4800);
        setTimeout(function () {
          fill(live.status, "Not alone");
          sessionWhisper.textContent = "You are not the only one looking at this page.";
        }, 10200);
        setTimeout(function () {
          sessionWhisper.textContent = "You are not the only thing in the room.";
        }, 19000);
      });
    }, { threshold: 0.4 });
    sessionObs.observe(sessionEl);
  }

  /* ---------------------------------------------------------
     input — the form, the cursor, the name
     --------------------------------------------------------- */
  var form = $("#captureForm");
  var email = $("#email");
  var captureNote = $("#captureNote");
  var oddCaption = document.querySelector(".quote-odd figcaption");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var val = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
      captureNote.textContent = "That doesn’t look like an address.";
      captureNote.classList.add("is-warn");
      email.focus();
      return;
    }
    state.email = val;
    var local = val.split("@")[0] || "";
    var clean = local.replace(/[._+\-].*$/, "").replace(/[^A-Za-z\u00C0-\u024F\u4e00-\u9fa5]/g, "");
    state.name = capitalize(clean);
    email.value = state.email;
    email.blur();
    form.classList.add("is-done");
    captureNote.classList.remove("is-warn");
    captureNote.textContent = state.name
      ? "Welcome, " + state.name + ". Your first night is tonight."
      : "Welcome. Your first night is tonight.";
    form.querySelector("button").textContent = "You’re in";
    captureNote.dataset.locked = "1";
    tick();
    if (oddCaption && state.name) oddCaption.textContent = state.name + " — tonight";
    var sessionWhisperEl = $("#sessionWhisper");
    if (sessionWhisperEl && sessionWhisperEl.textContent.indexOf("only one") > -1) {
      sessionWhisperEl.textContent = state.name + ", you are the only one looking at this page.";
    }
    setTimeout(function () {
      captureNote.textContent = "We’ll be in touch before you sleep.";
    }, 4200);
  });

  document.addEventListener("mousemove", function (e) {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    if (state.lastMouse) {
      var dx = e.clientX - state.lastMouse.x;
      var dy = e.clientY - state.lastMouse.y;
      state.travelPx += Math.sqrt(dx * dx + dy * dy);
    }
    state.lastMouse = { x: e.clientX, y: e.clientY };
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      state.hiddenAt = Date.now();
    } else if (state.hiddenAt && Date.now() - state.hiddenAt > 3500 && state.act >= 2) {
      var away = Math.round((Date.now() - state.hiddenAt) / 1000);
      var whisper = $("#sessionWhisper");
      if (whisper) whisper.textContent = "You looked away for " + away + " seconds. It didn’t.";
    }
  });

  /* ---------------------------------------------------------
     sound consent
     --------------------------------------------------------- */
  var consent = $("#consent");
  var soundToggle = $("#soundToggle");
  var soundText = $(".sound-text", soundToggle);

  function updateSoundUI() {
    var on = window.SomniaSound && window.SomniaSound.isEnabled();
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    if (soundText) {
      soundText.textContent = on ? (state.act >= 3 ? "Listening" : "Sound on") : "Sound off";
    }
  }
  setTimeout(function () { consent.classList.add("is-shown"); }, 2000);

  $("#consentAllow").addEventListener("click", function () {
    if (window.SomniaSound) {
      window.SomniaSound.enable();
      window.SomniaSound.setAct(state.act);
    }
    updateSoundUI();
    consent.classList.remove("is-shown");
  });
  $("#consentDeny").addEventListener("click", function () {
    consent.classList.remove("is-shown");
  });
  soundToggle.addEventListener("click", function () {
    if (!window.SomniaSound) return;
    window.SomniaSound.toggle();
    if (window.SomniaSound.isEnabled()) {
      window.SomniaSound.setAct(state.act);
      consent.classList.remove("is-shown");
    }
    updateSoundUI();
  });

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  function boot() {
    measure();
    requestAnimationFrame(function () {
      body.classList.add("is-loaded");
      requestAnimationFrame(onFrame);
    });
    setTimeout(measure, 600);
    setTimeout(measure, 2000);
    applySwaps(0);
    setAct(0);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
  }

  window.addEventListener("resize", function () {
    measure();
  });

  window.addEventListener("load", measure);

  if (document.readyState === "complete") boot();
  else window.addEventListener("DOMContentLoaded", boot);

  // expose a tiny debug hook (useful when testing the ending)
  window.__somnia = {
    state: state,
    to: function (fraction) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round(max * fraction));
    }
  };
})();
