/* ============================================================
   恒视科技 EverWatch — 滚动恐怖引擎
   阶段：0 正常 → 1 微妙异常 → 2 明显不对劲 → 3 崩坏
        → 4 故障/跳吓 → 5 终局（走廊 → 黑屏 → 那张脸）
   无外部依赖；所有音效由 WebAudio 实时合成。
   预览调试：?stage=0..5 锁定阶段；?phase=face 直达终局脸部；?mute=1
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const params = new URLSearchParams(location.search);
  const LOCKED = params.has("stage");
  const LOCK_STAGE = clamp(parseInt(params.get("stage") || "0", 10) || 0, 0, 5);
  const MUTE = params.get("mute") === "1" || LOCKED;

  /* 阶段阈值（滚动进度） */
  const BOUNDS = [0.12, 0.30, 0.50, 0.70, 0.88];
  const stageOf = p => { let s = 0; for (const b of BOUNDS) if (p >= b) s++; return s; };
  const LOCK_DREAD = [0.04, 0.20, 0.40, 0.60, 0.79, 0.95];

  const TITLES = [
    "恒视科技 EverWatch — 守护你的家",
    "恒视科技 EverWatch — 守护着你",
    "恒视科技 — 它在看你",
    "别往下滚了",
    "它在你身后",
    "我看见你了",
  ];
  const FAV_NORMAL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%234f6df5'/%3E%3Ccircle cx='16' cy='16' r='7' fill='white'/%3E%3Ccircle cx='16' cy='16' r='3.4' fill='%231c2333'/%3E%3C/svg%3E";
  const FAV_RED = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%236e0d16'/%3E%3Ccircle cx='16' cy='16' r='7' fill='%23f2ede2'/%3E%3Ccircle cx='16' cy='16' r='3.4' fill='%23050304'/%3E%3C/svg%3E";
  const FAV_DEAD = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23050304'/%3E%3Ccircle cx='16' cy='16' r='7' fill='%23a1121f'/%3E%3Ccircle cx='16' cy='16' r='2.6' fill='%23050304'/%3E%3C/svg%3E";

  const GLYPHS = "它看着你别回头谁在哪死墙里▓▒░#@%&§Ø";
  const WHISPERS = {
    2: ["还在吗？", "别停下。", "它注意到你了。"],
    3: ["怎么停下来了？", "继续。它喜欢看你滚动。", "你停下来的时候，它就近一点。"],
    4: ["它不喜欢等待。", "别回头。", "你身后有呼吸声。", "屏幕反光里那个不是你。"],
  };

  /* ---------------- 状态 ---------------- */
  let dread = 0, stage = -1, rawP = 0;
  let seen = sessionStorage.getItem("ew_seen") === "1";
  let scared = sessionStorage.getItem("ew_scare") === "1";
  let cookieDone = false, cookieShown = false;
  let finaleActive = false, finaleDone = false;
  const finaleTimers = [];
  let lastAct = performance.now(), lastWhisper = 0;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const startTime = Date.now();

  /* ---------------- 文字腐化 ---------------- */
  const swapEls = $$("[data-s1],[data-s2],[data-s3],[data-s4]").map(el => {
    el._origHTML = el.innerHTML;
    el._origText = el.textContent;
    el._current = el._origText;
    el._raf = 0;
    el._busy = false;
    return el;
  });

  function targetFor(el, n) {
    for (let k = 4; k >= 1; k--) {
      if (k <= n && el.dataset["s" + k] != null) return el.dataset["s" + k];
    }
    return el._origText;
  }

  function scrambleTo(el, target) {
    if (el._current === target) return;
    el._current = target;
    cancelAnimationFrame(el._raf);
    if (RM) { finish(); return; }
    el._busy = true;
    const dur = 420, t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      const reveal = Math.floor(t * target.length);
      let out = target.slice(0, reveal);
      for (let i = reveal; i < target.length; i++) {
        out += target[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) el._raf = requestAnimationFrame(step);
      else finish();
    };
    function finish() {
      el._busy = false;
      if (target === el._origText) el.innerHTML = el._origHTML;
      else el.textContent = target;
    }
    el._raf = requestAnimationFrame(step);
  }

  /* ---------------- 阶段应用 ---------------- */
  const marqueeTrack = $("#marqueeTrack");
  function setMarquee(n) {
    const text = n >= 4
      ? "别看屏幕 · 看身后 · 它在你身后 · 别回头 · 它数到三了 · "
      : "不要往下滚动 · 它已经注意到你了 · 不要往下滚动 · 关掉声音也没有用 · ";
    const half = `<span>${text.repeat(3)}</span>`;
    marqueeTrack.innerHTML = half + half;
  }

  function applyStage(n) {
    if (n === stage) return;
    const prev = stage;
    stage = n;
    document.body.dataset.stage = String(n);
    document.title = TITLES[n];
    $("#favicon").href = n >= 5 ? FAV_DEAD : n >= 3 ? FAV_RED : FAV_NORMAL;
    for (const el of swapEls) scrambleTo(el, targetFor(el, n));
    if (n >= 3) setMarquee(n);
    if (n >= 2 && !cookieShown && !LOCKED) {
      cookieShown = true;
      setTimeout(() => { if (!cookieDone) $("#cookie").classList.add("show"); }, 1400);
    }
    if (n >= 4 && prev < 4 && !scared && !RM && !LOCKED) doScare();
    Audio.setStage(n);
  }

  function setDread(v) {
    dread = v;
    document.documentElement.style.setProperty("--dread", v.toFixed(4));
    $("#progressBar").style.width = (rawP * 100).toFixed(2) + "%";
    const label = $("#progressLabel");
    label.textContent = stage >= 3
      ? `剩余理智 ${Math.max(0, Math.round((1 - rawP) * 100))}%`
      : stage === 2 ? `信号强度 ${Math.round((1 - rawP) * 100)}%` : "";
    Audio.setDread(v);
  }

  /* ---------------- 滚动引擎 ---------------- */
  let scrollQueued = false;
  function onScroll() {
    lastAct = performance.now();
    if (scrollQueued || LOCKED) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      rawP = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
      const floor = seen ? 0.34 : 0;
      setDread(Math.max(rawP, floor));
      applyStage(stageOf(Math.max(rawP, floor)));
      if (rawP >= 0.88 && !finaleActive) startFinale();
      else if (rawP < 0.86 && finaleActive) abortFinale();
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });

  /* ---------------- 跳吓 ---------------- */
  function doScare() {
    scared = true;
    sessionStorage.setItem("ew_scare", "1");
    const el = $("#scare");
    el.classList.add("on");
    Audio.sting();
    if (navigator.vibrate) navigator.vibrate(90);
    setTimeout(() => el.classList.remove("on"), 150);
  }

  /* ---------------- 微故障 & 字符闪烁 ---------------- */
  const glitchPool = $$(".glitchable");
  setInterval(() => {
    if (stage < 1 || finaleActive) return;
    const chance = [0, 0.14, 0.28, 0.46, 0.7][stage] || 0;
    if (Math.random() > chance) return;
    const visible = glitchPool.filter(el => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.width > 0;
    });
    if (!visible.length) return;
    const el = visible[(Math.random() * visible.length) | 0];
    el.classList.add("microglitch");
    setTimeout(() => el.classList.remove("microglitch"), 180);
    if (stage >= 3 && !el._busy && Math.random() < 0.35 && el.children.length === 0) {
      const txt = el.textContent;
      if (txt.length > 3) {
        const i = (Math.random() * txt.length) | 0;
        el.textContent = txt.slice(0, i) + GLYPHS[(Math.random() * GLYPHS.length) | 0] + txt.slice(i + 1);
        setTimeout(() => { if (!el._busy && el._current === txt) el.textContent = txt; }, 200);
      }
    }
  }, 240);

  /* ---------------- 眼球追踪 ---------------- */
  const trackers = $$(".pupil-track").map(g => ({ g, max: g.closest(".finale-face") ? 5 : 2.6, tx: 0, ty: 0 }));
  const faceWrap = $("#finaleFaceWrap");
  function eyeLoop() {
    if (stage >= 1 || finaleActive) {
      for (const t of trackers) {
        const r = t.g.getBoundingClientRect();
        if (!r.width) continue;
        // 减去上一帧位移，避免反馈漂移
        const cx = r.left + r.width / 2 - t.tx, cy = r.top + r.height / 2 - t.ty;
        const dx = mouse.x - cx, dy = mouse.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(t.max, d / 40);
        t.tx = (dx / d) * k; t.ty = (dy / d) * k;
        t.g.style.transform = `translate(${t.tx}px, ${t.ty}px)`;
      }
      if (finaleActive && finaleDone && !RM) {
        const rx = ((mouse.x / innerWidth) - 0.5) * 5;
        const ry = ((mouse.y / innerHeight) - 0.5) * 3;
        faceWrap.style.transform = `rotate(${rx * 0.4}deg) translate(${rx}px, ${ry}px)`;
      }
    }
    requestAnimationFrame(eyeLoop);
  }
  addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; lastAct = performance.now(); }, { passive: true });
  requestAnimationFrame(eyeLoop);

  /* ---------------- 低语 / 停留计时 ---------------- */
  const whisperEl = $("#whisper");
  let whisperTimer = 0;
  function whisper(text, hold = 3600) {
    whisperEl.textContent = text;
    whisperEl.classList.add("show");
    clearTimeout(whisperTimer);
    whisperTimer = setTimeout(() => whisperEl.classList.remove("show"), hold);
    lastWhisper = performance.now();
    Audio.whisperSound();
  }
  setInterval(() => {
    if (LOCKED || finaleActive || stage < 2) return;
    const now = performance.now();
    if (now - lastAct > 8000 && now - lastWhisper > 16000) {
      const list = WHISPERS[stage] || WHISPERS[2];
      whisper(list[(Math.random() * list.length) | 0]);
    }
  }, 1000);

  const pad = n => String(n).padStart(2, "0");
  setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const suffix = stage >= 3 ? " — 足够它记住你的脸" : stage === 2 ? " — 它也在数" : "";
    $("#dwell").textContent = `你已停留 ${pad(Math.floor(s / 60))}:${pad(s % 60)}${suffix}`;
    const d = new Date();
    $("#hudTime").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, 1000);

  /* ---------------- Cookie / 提示 / 杂项 ---------------- */
  $("#cookieOk").addEventListener("click", () => { cookieDone = true; $("#cookie").classList.remove("show"); });
  $("#cookieNo").addEventListener("click", () => {
    cookieDone = true; $("#cookie").classList.remove("show");
    if (stage >= 2) whisper(stage >= 3 ? "拒绝不了。" : "没有用。");
  });
  $("#noticeClose").addEventListener("click", () => $("#notice").classList.add("hide"));
  setTimeout(() => $("#notice").classList.add("hide"), 11000);

  let brandClicks = 0;
  $("#brand").addEventListener("click", () => {
    if (++brandClicks >= 3) { brandClicks = 0; whisper("别碰我。"); }
  });

  if (sessionStorage.getItem("ew_escaped") === "1") {
    sessionStorage.removeItem("ew_escaped");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    setTimeout(() => whisper("你逃出来了。这次。", 4200), 2200);
  }

  /* ---------------- 卡片倾斜 ---------------- */
  $$(".glitchable-card").forEach(el => el.style.setProperty("--tilt", rand(-1.1, 1.1).toFixed(2) + "deg"));

  /* ============================================================
     音频引擎（全部实时合成，无音频文件）
     ============================================================ */
  const Audio = (() => {
    let ctx = null, master, droneGain, windGain, eerieGain;
    let soundOn = !MUTE, started = false, heartTimer = 0, whisperTimer2 = 0, breathTimer = 0;
    let noiseBuf = null, mode = "page";

    function noise() {
      if (noiseBuf) return noiseBuf;
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    }
    function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true; return s; }

    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = soundOn ? 0.9 : 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 8;
      master.connect(comp); comp.connect(ctx.destination);

      // 低频嗡鸣
      droneGain = ctx.createGain(); droneGain.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 240;
      lp.connect(droneGain); droneGain.connect(master);
      [[55, "sine", 1], [55.7, "sine", 1], [110.3, "triangle", 0.28]].forEach(([f, type, g]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = g;
        o.connect(og); og.connect(lp); o.start();
      });

      // 风声
      windGain = ctx.createGain(); windGain.gain.value = 0;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.7;
      noiseSrc().connect(bp); bp.connect(windGain); windGain.connect(master);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
      const lfoG = ctx.createGain(); lfoG.gain.value = 280;
      lfo.connect(lfoG); lfoG.connect(bp.frequency); lfo.start();

      // 终局高频耳鸣
      eerieGain = ctx.createGain(); eerieGain.gain.value = 0;
      const eo = ctx.createOscillator(); eo.type = "sine"; eo.frequency.value = 1244;
      const vib = ctx.createOscillator(); vib.frequency.value = 0.4;
      const vibG = ctx.createGain(); vibG.gain.value = 9;
      vib.connect(vibG); vibG.connect(eo.frequency); vib.start();
      eo.connect(eerieGain); eerieGain.connect(master); eo.start();
    }

    function ensure() {
      if (started) { if (ctx.state === "suspended" && soundOn) ctx.resume(); return; }
      try { build(); started = true; scheduleHeart(); scheduleWhisper(); }
      catch (e) { started = false; }
    }

    function env(g, t0, peak, a, d) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    }

    function thump(peak) {
      if (!started || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(58, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
      const g = ctx.createGain(); env(g, t, peak, 0.006, 0.17);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
    }
    function scheduleHeart() {
      clearTimeout(heartTimer);
      const beat = () => {
        if (started && ctx.state === "running" && soundOn && stage >= 3 && mode !== "silence") {
          const k = clamp((dread - 0.5) / 0.5, 0, 1);
          const peak = mode === "finale" ? 0.5 : lerp(0.2, 0.42, k);
          thump(peak); setTimeout(() => thump(peak * 0.62), 230);
          heartTimer = setTimeout(beat, mode === "finale" ? 460 : lerp(1350, 500, k));
        } else heartTimer = setTimeout(beat, 700);
      };
      beat();
    }

    function whisperSound() {
      if (!started || ctx.state !== "running" || !soundOn || stage < 2) return;
      const t = ctx.currentTime;
      const s = noiseSrc();
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = rand(1500, 2900); bp.Q.value = 3;
      const am = ctx.createOscillator(); am.frequency.value = rand(6, 11);
      const amG = ctx.createGain(); amG.gain.value = 0.011;
      const g = ctx.createGain(); g.gain.value = 0.012;
      am.connect(amG); amG.connect(g.gain);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      s.connect(bp); bp.connect(g);
      if (pan) { pan.pan.value = rand(-0.8, 0.8); g.connect(pan); pan.connect(master); } else g.connect(master);
      env(g, t, 0.024, 0.5, 1.4);
      s.start(t); s.stop(t + 2.1); am.start(t); am.stop(t + 2.1);
    }
    function scheduleWhisper() {
      clearTimeout(whisperTimer2);
      const loop = () => {
        if (Math.random() < 0.6) whisperSound();
        whisperTimer2 = setTimeout(loop, rand(7000, 15000));
      };
      whisperTimer2 = setTimeout(loop, rand(5000, 9000));
    }

    function sting() {
      if (!started || ctx.state !== "running" || !soundOn) return;
      const t = ctx.currentTime;
      const s = noiseSrc();
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 320;
      const g = ctx.createGain(); env(g, t, 0.3, 0.008, 0.3);
      s.connect(hp); hp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.35);
      const o = ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(920, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.3);
      const og = ctx.createGain(); env(og, t, 0.22, 0.005, 0.32);
      o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.4);
    }

    function breathStart() {
      clearInterval(breathTimer);
      const cycle = () => {
        if (!started || ctx.state !== "running" || !soundOn) return;
        const t = ctx.currentTime;
        const s = noiseSrc();
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 430;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.055, t + 1.7);
        g.gain.linearRampToValueAtTime(0.0001, t + 4.2);
        s.connect(lp); lp.connect(g); g.connect(master);
        s.start(t); s.stop(t + 4.4);
      };
      cycle();
      breathTimer = setInterval(cycle, 4400);
    }
    function breathStop() { clearInterval(breathTimer); }

    return {
      ensure,
      sting, whisperSound,
      setDread(v) {
        if (!started) return;
        const t = ctx.currentTime;
        const d = mode === "finale" ? Math.max(v, 0.85) : v;
        droneGain.gain.setTargetAtTime(Math.pow(d, 1.6) * (mode === "face" ? 0.06 : 0.16), t, 0.6);
        windGain.gain.setTargetAtTime(d * 0.035, t, 0.8);
      },
      setStage(n) {
        if (!started) return;
        if (n < 3) mode = "page";
      },
      finaleRise() {
        if (!started) return;
        mode = "finale";
        const t = ctx.currentTime;
        droneGain.gain.setTargetAtTime(0.2, t, 1.2);
        eerieGain.gain.setTargetAtTime(0.012, t, 2);
        windGain.gain.setTargetAtTime(0.05, t, 1.5);
      },
      cut() {
        if (!started) return;
        mode = "silence";
        const t = ctx.currentTime;
        [droneGain, windGain, eerieGain].forEach(g => g.gain.setTargetAtTime(0.0001, t, 0.03));
      },
      face() {
        if (!started) return;
        mode = "face";
        const t = ctx.currentTime;
        droneGain.gain.setTargetAtTime(0.05, t, 1.5);
        breathStart();
      },
      reset() {
        if (!started) return;
        mode = "page"; breathStop();
        eerieGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
        this.setDread(dread);
      },
      toggle() {
        soundOn = !soundOn;
        if (soundOn) ensure();
        if (started) master.gain.setTargetAtTime(soundOn ? 0.9 : 0, ctx.currentTime, 0.05);
        return soundOn;
      },
      get on() { return soundOn; },
    };
  })();

  /* 首次交互后启动音频（浏览器自动播放策略） */
  const bootAudio = () => { Audio.ensure(); };
  addEventListener("pointerdown", bootAudio, { passive: true });
  addEventListener("keydown", bootAudio);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) Audio.ensure();
  });

  const soundBtn = $("#soundToggle");
  function paintSound() {
    soundBtn.textContent = Audio.on ? "🔊 音效开" : "🔇 音效关";
    soundBtn.setAttribute("aria-pressed", String(Audio.on));
  }
  soundBtn.addEventListener("click", () => { Audio.toggle(); paintSound(); });
  paintSound();

  /* ============================================================
     终局序列
     ============================================================ */
  const finale = $("#finale");
  const hallway = $("#finaleHallway");
  const figure = $("#hallFigure");
  const hallCaption = $("#hallCaption");
  const black = $("#finaleBlack");
  const faceWrapEl = $("#finaleFaceWrap");
  const finaleText = $("#finaleText");
  const finaleHud = $("#finaleHud");
  const finaleExit = $("#finaleExit");

  const FIG_STEPS = [0.3, 0.52, 0.8, 1.25, 2.1];
  const FIG_CAPTIONS = [
    "CAM-07 · 走廊尽头 · 检测到未知人形",
    "CAM-07 · 人形正在接近 · 请勿关闭页面",
    "CAM-07 · 距离：3 米 · 它没有脚步声",
    "CAM-07 · 距离：1 米 · 它在笑",
    "CAM-07 · 距离：0",
  ];
  const FINAL_LINES = ["你终于滚到底了。", "我们等这一刻，等了很久。", "现在，换我们看着你。", "别回头。"];

  function ft(fn, ms) { finaleTimers.push(setTimeout(fn, ms)); }
  function clearFinaleTimers() { while (finaleTimers.length) clearTimeout(finaleTimers.pop()); }

  function setFigure(i) {
    figure.style.transform = `scale(${FIG_STEPS[i]})`;
    hallCaption.textContent = FIG_CAPTIONS[i];
  }

  function typeLine(text, delay) {
    ft(() => {
      const line = document.createElement("span");
      line.className = "line";
      finaleText.appendChild(line);
      if (RM) { line.textContent = text; return; }
      let i = 0;
      const caret = document.createElement("span");
      caret.className = "caret"; caret.textContent = "▌";
      line.appendChild(caret);
      const tick = () => {
        if (!finaleActive) return;
        i++;
        line.textContent = text.slice(0, i);
        if (i < text.length) { line.appendChild(caret); ft(tick, 75); }
      };
      tick();
    }, delay);
  }

  function showFacePhase(instant) {
    hallway.classList.add("gone");
    black.classList.add("on");
    faceWrapEl.classList.add("on");
    Audio.face();
    finaleDone = true;
    if (instant) {
      finaleText.innerHTML = FINAL_LINES.map(l => `<span class="line" style="animation:none;opacity:1">${l}</span>`).join("");
      finaleHud.classList.add("on");
      finaleExit.classList.add("on");
      seen = true; sessionStorage.setItem("ew_seen", "1");
      return;
    }
    FINAL_LINES.forEach((l, i) => typeLine(l, 900 + i * 2700));
    ft(() => { finaleHud.classList.add("on"); }, 900 + FINAL_LINES.length * 2700 + 800);
    ft(() => {
      finaleExit.classList.add("on");
      seen = true; sessionStorage.setItem("ew_seen", "1");
    }, 900 + FINAL_LINES.length * 2700 + 2000);
  }

  function startFinale() {
    if (finaleActive) return;
    finaleActive = true; finaleDone = false;
    finale.classList.add("on");
    finale.setAttribute("aria-hidden", "false");
    hallway.classList.remove("gone", "lights-off");
    black.classList.remove("on");
    faceWrapEl.classList.remove("on");
    faceWrapEl.style.transform = "";
    finaleHud.classList.remove("on");
    finaleExit.classList.remove("on");
    finaleText.innerHTML = "";
    setFigure(0);
    Audio.finaleRise();

    if (LOCKED && params.get("phase") === "face") { showFacePhase(true); return; }

    // 灯每闪一次，它就近一步
    let t = 1500;
    FIG_STEPS.forEach((_, i) => {
      if (i === 0) return;
      ft(() => {
        if (!finaleActive) return;
        hallway.classList.add("lights-off");
        Audio.whisperSound();
        ft(() => {
          if (!finaleActive) return;
          setFigure(i);
          hallway.classList.remove("lights-off");
          if (i >= 3) Audio.sting();
        }, RM ? 60 : 170);
      }, t);
      t += i === FIG_STEPS.length - 1 ? 1100 : 1650;
    });
    // 黑屏切断 → 那张脸
    ft(() => {
      if (!finaleActive) return;
      hallway.classList.add("gone");
      black.classList.add("on");
      Audio.cut();
      ft(() => { if (finaleActive) showFacePhase(false); }, 1400);
    }, t + 500);
  }

  function abortFinale() {
    if (!finaleActive) return;
    finaleActive = false; finaleDone = false;
    clearFinaleTimers();
    finale.classList.remove("on");
    finale.setAttribute("aria-hidden", "true");
    faceWrapEl.style.transform = "";
    Audio.reset();
    if (seen) whisper("回去也没有用。");
  }

  function escapeSite() {
    sessionStorage.removeItem("ew_seen");
    sessionStorage.setItem("ew_escaped", "1");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    location.reload();
  }
  finaleExit.addEventListener("click", () => {
    if (!RM) {
      const el = $("#scare");
      el.classList.add("on");
      Audio.sting();
      setTimeout(escapeSite, 140);
    } else escapeSite();
  });

  /* ---------------- 初始化 ---------------- */
  if (LOCKED) {
    rawP = LOCK_DREAD[LOCK_STAGE];
    setDread(rawP);
    applyStage(LOCK_STAGE);
    if (LOCK_STAGE >= 3) setMarquee(LOCK_STAGE);
    if (LOCK_STAGE === 5) startFinale();
    lastAct = Infinity;
  } else {
    onScroll();
    // 刷新时若停在深处，直接落到对应阶段
    requestAnimationFrame(onScroll);
  }
})();