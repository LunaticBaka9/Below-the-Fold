/* ==========================================================================
   明镜 LUMINA — Main Narrative Scroll & Psychological Horror Controller
   Drives continuous 0% -> 100% transformation across 7 Acts, text corruption,
   browser-aware eeriness, corridor pacing, climax scare, and Aftermath Mode.
   ========================================================================== */

(() => {
  const audio = new window.HorrorAudioEngine();
  const visuals = new window.HorrorVisuals();

  // DOM References
  const body = document.body;
  const root = document.documentElement;
  const fxCanvas = document.getElementById("fx-canvas");
  const crtOverlay = document.getElementById("crt-overlay");
  const vignetteOverlay = document.getElementById("vignette-overlay");
  const flashlightOverlay = document.getElementById("flashlight-overlay");
  const heartbeatOverlay = document.getElementById("heartbeat-overlay");
  const scareOverlay = document.getElementById("scare-overlay");
  const scareFlash = document.getElementById("scare-flash");
  const scareSubtitles = document.getElementById("scare-subtitles");
  const favicon = document.getElementById("dynamic-favicon");

  const audioToggle = document.getElementById("audio-toggle");
  const audioDot = document.getElementById("audio-dot");
  const audioLabel = document.getElementById("audio-label");
  const resetBtn = document.getElementById("reset-btn");
  const fullResetBottom = document.getElementById("full-reset-bottom");

  const navLinks = document.querySelectorAll("#nav-links a");
  const navCta = document.getElementById("nav-cta");
  const brandName = document.getElementById("brand-name");

  // Hero elements
  const heroBadgeText = document.getElementById("hero-badge-text");
  const heroTitle = document.getElementById("hero-title");
  const heroSubtitle = document.getElementById("hero-subtitle");
  const heroCamStatus = document.getElementById("hero-cam-status");
  const heroLiveChip = document.getElementById("hero-live-chip");
  const dashTemp = document.getElementById("dash-temp");
  const dashMood = document.getElementById("dash-mood");
  const dashOcc = document.getElementById("dash-occ");
  const dashAudio = document.getElementById("dash-audio");
  const scrollHint = document.getElementById("scroll-hint");

  // Act 2 & 3 elements
  const featureCards = document.querySelectorAll(".feature-card");
  const subtleLogText = document.getElementById("subtle-log-text");
  const testimonialCards = document.querySelectorAll(".testimonial-card");
  const metricsPanel = document.getElementById("metrics-panel");
  const mRetention = document.getElementById("m-retention");
  const mResponse = document.getElementById("m-response");
  const mClock = document.getElementById("m-clock");
  const mDwell = document.getElementById("m-dwell");
  const personalCreepLine = document.getElementById("personal-creep-line");
  const cctvTimestamp = document.getElementById("cctv-timestamp");
  const cctvStatus = document.getElementById("cctv-status");

  // Act 6 & 7 elements
  const corridorSection = document.getElementById("corridor");
  const corridorBgImg = document.getElementById("corridor-bg-img");
  const corridorFigure = document.getElementById("corridor-figure");
  const corridorFlickerMask = document.getElementById("corridor-flicker-mask");
  const corridorCaption = document.getElementById("corridor-caption");
  const corridorMeters = document.getElementById("corridor-meters");

  const chamberEntityPeek = document.getElementById("chamber-entity-peek");
  const escapeBtn = document.getElementById("escape-btn");
  const replayClimaxBtn = document.getElementById("replay-climax-btn");
  const aftermathFooter = document.getElementById("aftermath-footer");
  const trapFeedback = document.getElementById("trap-feedback");

  // State
  const startTime = Date.now();
  let progress = 0;
  let aftermath = false;
  let climaxTriggered = false;
  let climaxPlaying = false;
  let currentFaviconState = "clean";
  let lastCorridorStep = -1;
  let corruptedSet = new WeakSet();

  // Palette Stops for smooth background/card/text interpolation
  const colorStops = [
    { p: 0.00, bg: [255, 255, 255], card: [255, 255, 255], text: [15, 23, 42], muted: [71, 85, 105] },
    { p: 0.16, bg: [248, 250, 249], card: [252, 253, 252], text: [15, 23, 42], muted: [71, 85, 105] },
    { p: 0.30, bg: [222, 226, 220], card: [232, 236, 230], text: [24, 28, 26], muted: [68, 74, 70] },
    { p: 0.44, bg: [122, 128, 121], card: [108, 114, 108], text: [18, 20, 19], muted: [36, 40, 38] },
    { p: 0.56, bg: [20, 22, 22],    card: [26, 26, 29],    text: [224, 224, 228], muted: [148, 152, 158] },
    { p: 0.72, bg: [7, 7, 9],       card: [12, 12, 15],    text: [232, 232, 236], muted: [140, 140, 150] },
    { p: 1.00, bg: [2, 2, 3],       card: [8, 8, 10],      text: [244, 244, 246], muted: [135, 135, 145] }
  ];

  const FAVICONS = {
    clean: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%234f46e5'/%3E%3Cstop offset='100%25' stop-color='%230ea5e9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='16' fill='url(%23g)'/%3E%3Ccircle cx='32' cy='32' r='14' fill='none' stroke='white' stroke-width='4'/%3E%3Ccircle cx='32' cy='32' r='5' fill='white'/%3E%3C/svg%3E",
    weird: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23262926'/%3E%3Cpath d='M8 32 Q32 10 56 32 Q32 54 8 32 Z' fill='%23d6d3d1'/%3E%3Ccircle cx='32' cy='32' r='9' fill='%2318181b'/%3E%3Ccircle cx='32' cy='32' r='3' fill='%23ef4444'/%3E%3C/svg%3E",
    horror: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%23050202'/%3E%3Cpath d='M6 32 Q32 6 58 32 Q32 58 6 32 Z' fill='%23991b1b'/%3E%3Ccircle cx='32' cy='32' r='10' fill='%23000'/%3E%3Ccircle cx='32' cy='32' r='3.5' fill='%23ff0000'/%3E%3C/svg%3E"
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function samplePalette(p) {
    for (let i = 0; i < colorStops.length - 1; i++) {
      const a = colorStops[i];
      const b = colorStops[i + 1];
      if (p >= a.p && p <= b.p) {
        const localT = (p - a.p) / (b.p - a.p);
        const mix = (k) =>
          `rgb(${Math.round(lerp(a[k][0], b[k][0], localT))}, ${Math.round(lerp(a[k][1], b[k][1], localT))}, ${Math.round(lerp(a[k][2], b[k][2], localT))})`;
        return { bg: mix("bg"), card: mix("card"), text: mix("text"), muted: mix("muted") };
      }
    }
    const last = colorStops[colorStops.length - 1];
    return {
      bg: `rgb(${last.bg.join(",")})`,
      card: `rgb(${last.card.join(",")})`,
      text: `rgb(${last.text.join(",")})`,
      muted: `rgb(${last.muted.join(",")})`
    };
  }

  // Glitchy character-scramble transition when text corrupts
  const GLITCH_CHARS = "▓▒░█▄▀■□?!@#¥%01亡影门黑看听";
  function corruptText(el, targetText) {
    if (!el || el.textContent === targetText) return;
    let frame = 0;
    const totalFrames = 14;
    const len = targetText.length;

    const step = () => {
      frame++;
      const revealCount = Math.floor((frame / totalFrames) * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        if (i < revealCount || targetText[i] === " " || targetText[i] === "，") {
          out += targetText[i];
        } else if (i < revealCount + 8) {
          out += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        } else {
          out += targetText[i];
        }
      }
      el.textContent = out;
      if (frame < totalFrames) {
        requestAnimationFrame(step);
      } else {
        el.textContent = targetText;
      }
    };
    requestAnimationFrame(step);
  }

  function setFavicon(state) {
    if (currentFaviconState === state) return;
    currentFaviconState = state;
    if (favicon) favicon.href = FAVICONS[state];
  }

  function detectClientCreepInfo() {
    const ua = navigator.userAgent;
    let os = "这台电脑";
    if (ua.includes("Win")) os = "Windows 终端";
    else if (ua.includes("Mac")) os = "macOS 终端";
    else if (ua.includes("Linux")) os = "Linux 终端";
    else if (ua.includes("Android") || ua.includes("iPhone")) os = "这块移动屏幕";
    return `${os} · ${window.screen.width}×${window.screen.height}`;
  }
  const clientInfo = detectClientCreepInfo();

  // Heartbeat visual pulse callback
  audio.onHeartbeatPulse = (intensity) => {
    heartbeatOverlay.style.opacity = String(0.18 + intensity * 0.55);
    setTimeout(() => {
      heartbeatOverlay.style.opacity = String(intensity * 0.14);
    }, 170);
  };

  // Mouse tracking for flashlight & subtle micro-interactions
  window.addEventListener("mousemove", (e) => {
    root.style.setProperty("--mouse-x", `${e.clientX}px`);
    root.style.setProperty("--mouse-y", `${e.clientY}px`);
  });

  // Audio toggle & first-gesture gentle unlock option
  function updateAudioButtonUI() {
    if (audio.enabled) {
      audioDot.classList.add("on");
      audioLabel.textContent = progress > 0.55 || aftermath
        ? "环境音：正在倾听你（静音）"
        : "沉浸声效：已开启";
    } else {
      audioDot.classList.remove("on");
      audioLabel.textContent = progress > 0.55 || aftermath
        ? "声音已关闭（它仍在暗处）"
        : "沉浸声效：点击开启（强烈推荐）";
    }
  }

  audioToggle.addEventListener("click", async () => {
    if (audio.enabled) {
      audio.disable();
    } else {
      await audio.enable();
      audio.update(progress, aftermath);
    }
    updateAudioButtonUI();
  });

  // Subtle Hero Easter Egg on early scroll
  let heroFlickerDone = false;
  function maybeHeroEasterEgg(p) {
    if (aftermath) return;
    if (p > 0.04 && p < 0.14 && !heroFlickerDone) {
      heroFlickerDone = true;
      heroLiveChip.classList.add("eerie");
      heroCamStatus.textContent = "红外摄像头：正在注视你的眼睛";
      dashOcc.textContent = "2 位";
      dashOcc.classList.add("alert");
      setTimeout(() => {
        if (!aftermath && progress < 0.25) {
          heroLiveChip.classList.remove("eerie");
          heroCamStatus.textContent = "环境光感应：柔和晨光模式";
          dashOcc.textContent = "1 位";
          dashOcc.classList.remove("alert");
        }
      }, 650);
    }
  }

  // Main Scroll Update Loop
  function onScroll() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    root.style.setProperty("--p", progress.toFixed(4));

    const effectiveP = aftermath ? Math.max(0.62, progress) : progress;

    // 1. Smooth background & text palette transition
    if (!aftermath) {
      const pal = samplePalette(progress);
      root.style.setProperty("--bg-page", pal.bg);
      root.style.setProperty("--bg-card", pal.card);
      root.style.setProperty("--text-main", pal.text);
      root.style.setProperty("--text-muted", pal.muted);
    }

    // 2. Phase body classes
    body.classList.toggle("uncanny-phase", !aftermath && progress >= 0.18 && progress < 0.45);
    body.classList.toggle("dark-phase", aftermath || (progress >= 0.45 && progress < 0.68));
    body.classList.toggle("horror-phase", aftermath || progress >= 0.68);

    // 3. Atmospheric Overlays
    fxCanvas.style.opacity = effectiveP > 0.26 ? String(Math.min(0.85, (effectiveP - 0.26) * 1.15)) : "0";
    crtOverlay.style.opacity = effectiveP > 0.42 ? String(Math.min(0.65, (effectiveP - 0.42) * 1.1)) : "0";
    vignetteOverlay.style.opacity = effectiveP > 0.28 ? String(Math.min(0.95, (effectiveP - 0.28) * 1.25)) : "0";

    // Cursor flashlight activates in Act 5 (abyss) & Aftermath top
    const showFlashlight = (progress > 0.64 && progress < 0.86) || (aftermath && progress < 0.45);
    flashlightOverlay.style.opacity = showFlashlight ? "1" : "0";

    // 4. Navbar & Document Title & Favicon progressive corruption
    if (aftermath) {
      document.title = "欢迎回来 · 门已经锁死了";
      setFavicon("horror");
      brandName.innerHTML = '明镜 <span class="brand-en" style="color:#ef4444">IT SEES YOU</span>';
      navCta.textContent = "你逃不掉的";
      navLinks.forEach((a) => (a.textContent = a.dataset.horror));
    } else if (progress < 0.22) {
      document.title = "明镜 Lumina — 懂你的智慧居家伴侣";
      setFavicon("clean");
      brandName.innerHTML = '明镜 <span class="brand-en">Lumina</span>';
      navCta.textContent = navCta.dataset.clean;
      navLinks.forEach((a) => (a.textContent = a.dataset.clean));
    } else if (progress < 0.50) {
      document.title = "明镜 Lumina — 它知道你在家";
      setFavicon("weird");
      brandName.innerHTML = '明镜 <span class="brand-en">Lumina?</span>';
      navCta.textContent = navCta.dataset.weird;
      navLinks.forEach((a) => (a.textContent = a.dataset.weird));
    } else if (progress < 0.80) {
      document.title = "不要再往下滑了";
      setFavicon("horror");
      brandName.innerHTML = '明镜 <span class="brand-en" style="color:#ef4444">CAM-04</span>';
      navCta.textContent = navCta.dataset.horror;
      navLinks.forEach((a) => (a.textContent = a.dataset.horror));
    } else {
      document.title = "它在你身后";
      setFavicon("horror");
      brandName.innerHTML = '<span style="color:#ef4444">不要回头</span>';
      navCta.textContent = "救命";
    }

    maybeHeroEasterEgg(progress);

    // 5. Act 2: Features slight tilt & copy corruption as they cross viewport
    featureCards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      const enteredMid = rect.top < window.innerHeight * 0.62;
      if (enteredMid || aftermath) {
        card.classList.add(`tilted-${idx + 1}`);
        if (rect.top < window.innerHeight * 0.42 || aftermath) {
          card.classList.add("corrupted");
          const pEl = card.querySelector(".corruptible");
          const metaEl = card.querySelector(".feature-meta");
          if (pEl && !corruptedSet.has(pEl)) {
            corruptedSet.add(pEl);
            corruptText(pEl, pEl.dataset.corrupt);
            if (metaEl) metaEl.textContent = metaEl.dataset.corrupt;
            audio.playGlitchTick();
          }
        }
      }
    });

    if (progress > 0.24 || aftermath) {
      subtleLogText.textContent =
        progress > 0.36 || aftermath
          ? `⚠ 异常警告：卧室门外检测到缓慢移动的热源。房间内共有 2 名对象。`
          : `系统日志：已识别到你独自坐在屏幕前。距离镜头约 52cm。`;
    }

    // 6. Act 3: Testimonials & Metrics corruption
    testimonialCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.52 || aftermath) {
        if (!card.classList.contains("corrupted")) {
          card.classList.add("corrupted");
          const q = card.querySelector(".t-quote");
          const stars = card.querySelector(".stars");
          const role = card.querySelector(".t-role");
          if (q) corruptText(q, q.dataset.corrupt);
          if (stars) stars.textContent = stars.dataset.corrupt;
          if (role) role.textContent = role.dataset.corrupt;
          audio.playGlitchTick();
        }
      }
    });

    // Corrupt section titles in Act 3
    document.querySelectorAll(".testimonials-section .section-head .corruptible").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if ((rect.top < window.innerHeight * 0.48 || aftermath) && !corruptedSet.has(el)) {
        corruptedSet.add(el);
        corruptText(el, el.dataset.corrupt);
      }
    });

    if (metricsPanel) {
      const rect = metricsPanel.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.58 || aftermath) {
        if (!metricsPanel.classList.contains("corrupted")) {
          metricsPanel.classList.add("corrupted");
          corruptText(mRetention, mRetention.dataset.corrupt);
          corruptText(mResponse, mResponse.dataset.corrupt);
          metricsPanel.querySelectorAll(".corruptible").forEach((el) => corruptText(el, el.dataset.corrupt));
          audio.playGlitchTick();
        }
      }
    }

    // 7. Act 6: Sticky Corridor Walkthrough
    let corridorP = 0;
    if (corridorSection) {
      const rect = corridorSection.getBoundingClientRect();
      const totalTravel = corridorSection.offsetHeight - window.innerHeight;
      if (totalTravel > 0) {
        corridorP = Math.max(0, Math.min(1, -rect.top / totalTravel));
      }
      updateCorridorScene(corridorP);
    }

    // 8. Act 7: Chamber Entity Peek & Climax Auto-Trigger
    if (progress > 0.93) {
      chamberEntityPeek.style.opacity = String(Math.min(1, (progress - 0.93) * 14));
    } else {
      chamberEntityPeek.style.opacity = "0";
    }

    if (progress >= 0.985 && !climaxTriggered && !climaxPlaying) {
      triggerClimaxSequence();
    }

    // Update Audio & Visuals engines
    audio.update(progress, aftermath);
    visuals.setState(progress, aftermath, corridorP);
    updateAudioButtonUI();
  }

  function updateCorridorScene(cp) {
    // Camera moves forward into the hallway
    const zoom = 1 + cp * 0.72;
    const swayX = Math.sin(cp * Math.PI * 6) * (cp * 12);
    const swayY = Math.cos(cp * Math.PI * 12) * (cp * 6);
    corridorBgImg.style.transform = `scale(${zoom.toFixed(3)}) translate(${swayX.toFixed(1)}px, ${swayY.toFixed(1)}px)`;

    // Distance meter counting down to 0.0m
    const meters = Math.max(0, (1 - cp) * 18).toFixed(1);
    corridorMeters.textContent = `${meters} m`;

    // Scripted horror movie light-flicker beats!
    // Step 0 (0.0-0.25): empty hallway
    // Step 1 (0.25-0.48): flicker -> gaunt figure far away
    // Step 2 (0.48-0.72): flicker -> figure MUCH closer!
    // Step 3 (0.72-0.88): flicker -> figure VANISHED (scariest beat!)
    // Step 4 (0.88-1.00): lights die almost completely, eyes right in front
    let step = 0;
    if (cp < 0.24) step = 0;
    else if (cp < 0.48) step = 1;
    else if (cp < 0.72) step = 2;
    else if (cp < 0.87) step = 3;
    else step = 4;

    if (step !== lastCorridorStep && cp > 0.02 && cp < 0.99) {
      lastCorridorStep = step;
      // Trigger electrical fluorescent flicker blackout!
      audio.playFlickerBuzz();
      corridorFlickerMask.style.opacity = "0.96";
      setTimeout(() => (corridorFlickerMask.style.opacity = "0.18"), 90);
      setTimeout(() => (corridorFlickerMask.style.opacity = "0.94"), 170);
      setTimeout(() => (corridorFlickerMask.style.opacity = step === 4 ? "0.68" : "0.15"), 260);
    }

    if (step === 0) {
      corridorFigure.style.opacity = "0";
      corridorCaption.textContent = "走廊尽头的日光灯在滋滋作响……";
    } else if (step === 1) {
      corridorFigure.style.opacity = "0.58";
      corridorFigure.style.transform = "translate(-50%, -50%) scale(0.20)";
      corridorCaption.textContent = "前面门缝里……是不是站着一个人？";
    } else if (step === 2) {
      corridorFigure.style.opacity = "0.90";
      corridorFigure.style.transform = "translate(-50%, -48%) scale(0.56)";
      corridorCaption.textContent = "它动了。刚才它明明在更远的地方。";
    } else if (step === 3) {
      corridorFigure.style.opacity = "0";
      corridorCaption.textContent = "……不见了。它去哪了？";
    } else {
      corridorFigure.style.opacity = "0.96";
      corridorFigure.style.transform = "translate(-50%, -45%) scale(1.18)";
      corridorCaption.textContent = "就在你面前。";
    }
  }

  // THE HORROR MOVIE CLIMAX SEQUENCE
  function triggerClimaxSequence() {
    if (climaxPlaying) return;
    climaxTriggered = true;
    climaxPlaying = true;

    scareOverlay.classList.add("active");
    scareSubtitles.textContent = "";
    visuals.triggerClimax(2700);
    audio.playClimaxSting();

    // Controlled dramatic crimson flash (non-epileptic, cinematic pulse)
    scareFlash.style.opacity = "0.9";
    setTimeout(() => (scareFlash.style.opacity = "0.15"), 180);
    setTimeout(() => (scareFlash.style.opacity = "0.65"), 520);
    setTimeout(() => (scareFlash.style.opacity = "0"), 950);

    // Camera shake
    body.classList.add("shaking");
    let shakeFrame = 0;
    const shakeInterval = setInterval(() => {
      shakeFrame++;
      const amp = Math.max(0, 18 - shakeFrame * 0.6);
      root.style.setProperty("--shake-x", `${((Math.random() - 0.5) * amp).toFixed(1)}px`);
      root.style.setProperty("--shake-y", `${((Math.random() - 0.5) * amp).toFixed(1)}px`);
      if (shakeFrame > 30) {
        clearInterval(shakeInterval);
        body.classList.remove("shaking");
        root.style.setProperty("--shake-x", "0px");
        root.style.setProperty("--shake-y", "0px");
      }
    }, 45);

    setTimeout(() => {
      scareSubtitles.textContent = "找 到 你 了 。";
    }, 600);

    setTimeout(() => {
      scareSubtitles.textContent = "你 不 应 该 回 头 的 。";
    }, 1550);

    setTimeout(() => {
      scareOverlay.classList.remove("active");
      visuals.stopClimax();
      climaxPlaying = false;
      enterAftermathMode();
    }, 2800);
  }

  // Permanent Haunted State when scrolling back up!
  function enterAftermathMode() {
    aftermath = true;
    body.classList.add("aftermath");
    resetBtn.classList.remove("hidden");
    replayClimaxBtn.classList.remove("hidden");
    aftermathFooter.classList.remove("hidden");

    // Rewrite the once-innocent Hero Section into a nightmare mirror
    heroBadgeText.textContent = "警告 // 室内光线已彻底切断 · 0 条出口可用";
    heroTitle.innerHTML = '欢迎回到顶部，<br /><span class="gradient-text">你以为这里还安全吗？</span>';
    heroSubtitle.textContent =
      "所有柔和的灯光都已经熄灭了。客厅空无一人，但门锁是从里面反锁的。明镜不再只是观察你——它现在就住在你的房间里。";
    heroLiveChip.classList.add("eerie");
    heroCamStatus.textContent = "REC ● 它正站在你身后";
    dashTemp.textContent = "4.2°C";
    dashMood.textContent = "极度恐惧";
    dashMood.classList.add("alert");
    dashOcc.textContent = "2 位（距离 0.4m）";
    dashOcc.classList.add("alert");
    dashAudio.textContent = "呼吸声";
    dashAudio.classList.add("alert");
    scrollHint.innerHTML = '<span style="color:#ef4444">门打不开了。你随时可以点击右下角重置体验。</span>';

    escapeBtn.textContent = "回到顶部（看看上面变成了什么）";
    onScroll();
  }

  function resetExperience() {
    aftermath = false;
    climaxTriggered = false;
    climaxPlaying = false;
    lastCorridorStep = -1;
    heroFlickerDone = false;
    corruptedSet = new WeakSet();

    body.classList.remove("aftermath", "uncanny-phase", "dark-phase", "horror-phase");
    resetBtn.classList.add("hidden");
    replayClimaxBtn.classList.add("hidden");
    aftermathFooter.classList.add("hidden");

    // Restore clean Hero copy
    heroBadgeText.textContent = "Lumina OS 4.2 全新发布 · 荣获 2026 红点设计奖";
    heroTitle.innerHTML = '让你的家，<br /><span class="gradient-text" id="hero-title-accent">比你更早一步懂你。</span>';
    heroSubtitle.textContent =
      "明镜 Lumina 将柔和的环境光、无感睡眠感知与温柔的 AI 陪伴融为一体。无需任何繁琐设置，只需静静放置于客厅，它就能学习你的呼吸节奏与生活习惯，为每一天打造恰到好处的宁静与安心。";
    heroLiveChip.classList.remove("eerie");
    heroCamStatus.textContent = "环境光感应：柔和晨光模式";
    dashTemp.textContent = "22.5°C";
    dashMood.textContent = "96% 放松";
    dashMood.classList.remove("alert");
    dashOcc.textContent = "1 位";
    dashOcc.classList.remove("alert");
    dashAudio.textContent = "安静";
    dashAudio.classList.remove("alert");
    scrollHint.innerHTML = '<span>向下滚动，探索明镜如何融入你的生活</span><div class="scroll-mouse"><span></span></div>';
    subtleLogText.textContent = "一切运转正常。你的心率平稳，房间很安静。";

    // Restore clean cards & corruptibles
    featureCards.forEach((c, idx) => {
      c.classList.remove("corrupted", `tilted-${idx + 1}`);
      const meta = c.querySelector(".feature-meta");
      if (meta && meta.dataset.clean) meta.textContent = meta.dataset.clean;
    });
    testimonialCards.forEach((c) => {
      c.classList.remove("corrupted");
      const stars = c.querySelector(".stars");
      const role = c.querySelector(".t-role");
      if (stars) stars.textContent = stars.dataset.clean;
      if (role) role.textContent = role.dataset.clean;
    });
    if (metricsPanel) {
      metricsPanel.classList.remove("corrupted");
      mRetention.textContent = mRetention.dataset.clean;
      mResponse.textContent = mResponse.dataset.clean;
    }
    document.querySelectorAll(".corruptible").forEach((el) => {
      if (el.dataset.clean) el.textContent = el.dataset.clean;
    });

    escapeBtn.textContent = "逃离这里 · 返回顶部";
    trapFeedback.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(onScroll, 120);
  }

  // Interactive Traps
  navCta.addEventListener("click", () => {
    if (progress < 0.25 && !aftermath) {
      document.getElementById("features").scrollIntoView({ behavior: "smooth" });
    } else {
      audio.playGlitchTick();
      navCta.textContent = "太晚了";
      window.scrollBy({ top: 260, behavior: "smooth" });
    }
  });

  document.querySelectorAll(".trap-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      audio.playGlitchTick();
      trapFeedback.textContent = `> ${btn.dataset.trap}`;
      btn.textContent = "已锁定";
    });
  });

  escapeBtn.addEventListener("click", () => {
    if (!climaxTriggered) {
      triggerClimaxSequence();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  replayClimaxBtn.addEventListener("click", () => {
    triggerClimaxSequence();
  });

  resetBtn.addEventListener("click", resetExperience);
  fullResetBottom.addEventListener("click", resetExperience);

  // Live clock + dwell timer (creepy real-time personalization)
  setInterval(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const timeStr = `${hh}:${mm}:${ss}`;

    if (mClock) mClock.textContent = timeStr;
    if (cctvTimestamp) cctvTimestamp.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${timeStr}`;

    const dwellSec = Math.floor((Date.now() - startTime) / 1000);
    if (mDwell) mDwell.textContent = `${dwellSec}s`;

    if (personalCreepLine) {
      if (progress > 0.34 || aftermath) {
        personalCreepLine.textContent = `已锁定访问源：${clientInfo} · 本地时间 ${timeStr} · 你已在这里停留 ${dwellSec} 秒，背后的门锁检查过了吗？`;
      } else {
        personalCreepLine.textContent = "";
      }
    }

    if (cctvStatus) {
      cctvStatus.textContent =
        progress > 0.56
          ? `ALERT: SUBJECT APPROACHING LENS // ${timeStr}`
          : "MOTION DETECTED: UNKNOWN SILHOUETTE";
    }
  }, 500);

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
