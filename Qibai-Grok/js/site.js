"use strict";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const debug = new URLSearchParams(location.search).has("marks");
const root = document.documentElement;
const started = performance.now();

const navLinks = [...document.querySelectorAll("[data-nav]")];
const navReserve = document.getElementById("nav-reserve");
const mark = document.getElementById("mark");
const soundBtn = document.getElementById("sound");
const soundState = document.getElementById("sound-state");
const live = document.getElementById("live");
const letter = document.getElementById("letter");
const finale = document.getElementById("finale");
const finaleSticky = document.getElementById("finale-sticky");
const coda = document.getElementById("coda");
const lights = document.getElementById("lights");
const afterDark = document.getElementById("after-dark");
const flash = document.getElementById("flash");
const hall = document.getElementById("hall");
const hallDay = document.getElementById("hall-day");
const heroDay = document.querySelector(".hero-figure .day");
const grain = document.getElementById("grain");
const hud = document.getElementById("hud");
const themeMeta = document.getElementById("theme-color");
const dialog = document.getElementById("reserve");
const form = document.getElementById("reserve-form");
const nameInput = document.getElementById("guest-name");
const errorEl = document.getElementById("form-error");
const successBox = document.getElementById("reserve-success");
const successText = document.getElementById("reserve-success-text");
const reserveTitle = document.getElementById("reserve-title");
const reserveKicker = document.getElementById("reserve-kicker");
const reserveLead = document.getElementById("reserve-lead");
const reserveOk = document.getElementById("reserve-ok");

const swaps = [...document.querySelectorAll("[data-swap]")];
const stages = [
  [["居所", "方法", "手记"], "预约", "栖白 — 私人安眠居所"],
  [["居所", "方法", "手记"], "留下", "栖白 — 再往下一点"],
  [["房间", "听着", "手记"], "别走", "栖白 — 你还醒着吗"],
  [["里面", "床尾", "看着"], "入住", "栖白 — 灯还开着"],
];

let seen = root.classList.contains("seen");
let stage = -1;
let guestName = "";
let reserved = false;
let soundOn = false;
let wentBack = false;
let approachedEdge = false;
let blackoutArmed = false;
let lastY = window.scrollY;
let armed = false;
let titleNow = document.title;
let audio = null;

const favSeen =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#141513"/><circle cx="16" cy="16" r="6.25" fill="none" stroke="#efe8dc" stroke-width="1.3"/><circle cx="13.4" cy="15.2" r="0.9" fill="#efe8dc"/><circle cx="18.6" cy="15.2" r="0.9" fill="#efe8dc"/></svg>'
  );

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function ramp(p, a, b) {
  if (p <= a) return 0;
  if (p >= b) return 1;
  const t = (p - a) / (b - a);
  return t * t * (3 - 2 * t);
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (i) => Math.round(((pa >> i) & 255) + (((pb >> i) & 255) - ((pa >> i) & 255)) * t);
  const n = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return "#" + n.toString(16).padStart(6, "0");
}

function passed(el, ratio) {
  if (!el) return false;
  return el.getBoundingClientRect().top < window.innerHeight * ratio;
}

function travel(el) {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  return clamp((vh - rect.top) / (rect.height + vh), 0, 1);
}

function paintGrain() {
  if (!grain) return;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const img = ctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 190 + Math.random() * 65;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grain.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
  grain.style.backgroundSize = "160px 160px";
}

function markSeen() {
  if (seen) return;
  seen = true;
  root.classList.add("seen");
  try {
    sessionStorage.setItem("qibai-seen", "1");
  } catch (err) {}
  const icon = document.getElementById("favicon");
  if (icon) icon.href = favSeen;
  if (heroDay) {
    heroDay.alt = "夜里的主卧，床头亮着一盏灯，椅子旁边站着一个女人";
  }
}

function syncMarkLabel(finaleActive) {
  if (!mark) return;
  const next = seen && !finaleActive ? "栖白，不要走" : "栖白";
  if (mark.getAttribute("aria-label") !== next) mark.setAttribute("aria-label", next);
}

function liveText() {
  const seconds = Math.max(0, Math.round((performance.now() - started) / 1000));
  const hour = new Date().getHours();
  const bits = [`你在这页停留了 ${seconds} 秒。`];
  if (seconds >= 12) bits.push("从第十二秒起，这间房子把你算进住客。");
  if (hour >= 23 || hour < 5) bits.push("这个钟点，入住立刻生效。");
  else bits.push("你那里即使是白天，房子里也已经熄过一次灯。");
  if (reserved) {
    bits.push(
      guestName && guestName !== "你"
        ? `${guestName}，这个称呼房子已经念过一遍。`
        : "你没有留称呼。可以，称呼是房子准备的。"
    );
  } else if (soundOn) bits.push("声音开着。这间房子把这也当成同意。");
  else if (wentBack) bits.push("你往回滚过。上面的句子还会装一会儿没事。");
  else if (approachedEdge) bits.push("你把光标放到过视窗的边缘。");
  bits.push("再往下就是房间。");
  return bits.join("");
}

function renderLive() {
  if (live) live.textContent = liveText();
}

function dialogIsLate() {
  return seen || passed(document.getElementById("notes"), 0.55);
}

function openReserve() {
  if (!dialog) return;
  const y = window.scrollY;
  const late = dialogIsLate();
  if (form) form.hidden = false;
  if (successBox) successBox.hidden = true;
  if (errorEl) errorEl.textContent = "";
  if (reserveKicker) reserveKicker.textContent = late ? "入住" : "预约";
  if (reserveTitle) reserveTitle.textContent = late ? "留下" : "预约一夜";
  if (reserveLead) {
    reserveLead.textContent = late
      ? "这一栏是走个形式。你的位置已经留好了。"
      : "留下称呼，和一种能找到你的方式。地址会在出发前送达。";
  }
  if (reserveOk) reserveOk.textContent = late ? "确认留下" : "提交";
  if (nameInput) {
    nameInput.placeholder = late ? "可以不填" : "";
    if (guestName && guestName !== "你") nameInput.value = guestName;
  }
  dialog.showModal();
  if (window.scrollY !== y) window.scrollTo(0, y);
  if (nameInput) nameInput.focus();
}

function ensureAudio() {
  if (audio) return audio;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = "sine";
  oscB.type = "sine";
  oscA.frequency.value = 55;
  oscB.frequency.value = 82.4;
  const bed = ctx.createGain();
  bed.gain.value = 0;
  oscA.connect(bed);
  oscB.connect(bed);
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  bed.connect(ctx.destination);
  oscA.start();
  oscB.start();
  noise.start();
  audio = { ctx, oscB, bed, noiseGain, tension: -1 };
  return audio;
}

function thud() {
  if (!audio || !soundOn) return;
  const { ctx } = audio;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 46;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);
}

function blackout() {
  if (!finaleSticky || !lights || !afterDark) return;
  if (blackoutArmed) {
    afterDark.hidden = false;
    afterDark.textContent = "再按一次，也没有更多的灯了。";
    return;
  }
  blackoutArmed = true;
  finaleSticky.classList.add("dark");
  lights.textContent = "灯已灭";
  lights.setAttribute("aria-pressed", "true");
  thud();
  const line = "灯灭了以后，她就不需要站在你看得见的地方。";
  if (reduced) {
    afterDark.hidden = false;
    afterDark.textContent = line;
    return;
  }
  window.setTimeout(() => flash && flash.classList.add("on"), 680);
  window.setTimeout(() => flash && flash.classList.remove("on"), 860);
  window.setTimeout(() => {
    afterDark.hidden = false;
    afterDark.textContent = line;
  }, 980);
}

function update() {
  const y = window.scrollY;
  if (armed && y < lastY - 20) wentBack = true;
  lastY = y;
  armed = true;

  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const p = clamp(y / max, 0, 1);
  const dirt = ramp(p, 0.16, 0.9);
  const paper = mixHex("#e7e1d4", "#c4bfb3", dirt);
  const muted = mixHex("#5e584f", "#4d4942", dirt);

  root.style.setProperty("--paper", paper);
  root.style.setProperty("--muted", muted);
  root.style.setProperty("--sat", (1 - ramp(p, 0.22, 0.82) * 0.72).toFixed(3));
  root.style.setProperty("--vig", (ramp(p, 0.28, 0.86) * 0.58).toFixed(3));
  root.style.setProperty("--p", p.toFixed(4));
  root.style.setProperty("--hero-night", seen ? "1" : "0");

  const hallNight = ramp(travel(hall), 0.3, 0.5);
  root.style.setProperty("--hall-night", hallNight.toFixed(3));
  if (hallDay && hallDay.dataset.baseAlt) {
    const nightAlt = hallNight > 0.62;
    const next = nightAlt
      ? "同一条走廊在夜里，高窗前站着一个女人"
      : hallDay.dataset.baseAlt;
    if (hallDay.alt !== next) hallDay.alt = next;
  }

  const vh = window.innerHeight || 1;
  const band = (el) => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp((Math.min(rect.bottom, vh) - Math.max(rect.top, 0)) / vh, 0, 1);
  };
  const roomRatio = band(finaleSticky);
  const codaRatio = band(coda);
  const inRoom = roomRatio > 0.62;
  const finaleActive = inRoom || codaRatio > 0.4;
  root.classList.toggle("in-room", inRoom);
  root.classList.toggle("finale-active", finaleActive);
  if (roomRatio > 0.55) markSeen();

  const letterRect = letter ? letter.getBoundingClientRect() : null;
  if (letterRect) {
    const tear = clamp((vh - letterRect.top) / vh, 0, 1);
    root.style.setProperty("--tear", tear.toFixed(3));
    const mid = letterRect.top + letterRect.height / 2;
    const rise = clamp(1 - Math.abs(mid - vh / 2) / vh, 0, 1);
    root.style.setProperty("--rise", rise.toFixed(3));
  }

  let nextStage = 0;
  if (roomRatio > 0.45 || codaRatio > 0.3) nextStage = 3;
  else if (passed(letter, 0.72)) nextStage = 2;
  else if (passed(document.getElementById("notes"), 0.5)) nextStage = 1;
  if (nextStage !== stage) {
    stage = nextStage;
    const pack = stages[stage];
    navLinks.forEach((link, i) => {
      link.textContent = pack[0][i];
    });
    if (navReserve) navReserve.textContent = pack[1];
  }

  for (const el of swaps) {
    const line = Number(el.dataset.swap);
    const on = el.getBoundingClientRect().top < vh * line;
    if (el.classList.contains("on") === on) continue;
    el.classList.toggle("on", on);
    const early = el.querySelector(".early");
    const late = el.querySelector(".late");
    if (early) early.setAttribute("aria-hidden", on ? "true" : "false");
    if (late) late.setAttribute("aria-hidden", on ? "false" : "true");
  }

  let title = stages[stage][2];
  if (blackoutArmed && (stage === 3 || finaleActive)) title = "栖白 — 灯灭了";
  if (seen && y < 48 && !document.hidden) title = "栖白 — 你还在这里";
  if (document.hidden && seen) title = "栖白 — 我们还在";
  if (title !== titleNow) {
    titleNow = title;
    document.title = title;
  }

  syncMarkLabel(finaleActive);
  if (themeMeta) themeMeta.content = finaleActive ? "#070807" : paper;
  if (grain) {
    grain.style.opacity = String(finaleActive ? 0.16 : 0.05 + ramp(p, 0.2, 0.9) * 0.1);
    grain.style.mixBlendMode = finaleActive ? "screen" : "multiply";
  }

  if (soundOn && audio) {
    const tension = Math.max(root.classList.contains("in-room") ? 1 : 0, ramp(p, 0.35, 0.92));
    if (Math.abs(tension - audio.tension) > 0.03) {
      audio.tension = tension;
      const now = audio.ctx.currentTime;
      audio.oscB.frequency.setTargetAtTime(82.4 - tension * 24, now, 0.7);
      audio.bed.gain.setTargetAtTime(0.012 + tension * 0.02, now, 0.7);
      audio.noiseGain.gain.setTargetAtTime(0.003 + tension * 0.018, now, 0.7);
    }
  }

  if (debug && hud) {
    hud.hidden = false;
    hud.textContent = `p ${p.toFixed(2)}  hall ${hallNight.toFixed(2)}  stage ${stage}  seen ${seen ? 1 : 0}  room ${inRoom ? 1 : 0}`;
  }
}

let ticking = false;
function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    update();
  });
}

function bind() {
  paintGrain();
  if (hallDay) hallDay.dataset.baseAlt = hallDay.alt;
  if (seen) {
    const icon = document.getElementById("favicon");
    if (icon) icon.href = favSeen;
    if (heroDay) heroDay.alt = "夜里的主卧，床头亮着一盏灯，椅子旁边站着一个女人";
  }

  document.querySelectorAll("[data-open-reserve]").forEach((btn) => {
    btn.addEventListener("click", openReserve);
  });

  document.getElementById("reserve-cancel")?.addEventListener("click", () => dialog.close());
  document.getElementById("reserve-close")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const late = dialogIsLate();
    const raw = (nameInput?.value || "").replace(/[\u0000-\u001F]/g, "").trim().slice(0, 24);
    if (!late && !raw) {
      if (errorEl) errorEl.textContent = "请留下称呼，方便我们回复。";
      nameInput?.focus();
      return;
    }
    if (errorEl) errorEl.textContent = "";
    guestName = raw || "你";
    reserved = true;
    if (form) form.hidden = true;
    if (successBox) successBox.hidden = false;
    if (successText) {
      successText.textContent = late
        ? `${guestName}，位置留好了。请不要整理行李。进门的时候，行李已经在柜子里，柜子没有把手。`
        : `${guestName}，记下了。黄昏前会有人致电，确认抵达的时间。`;
    }
    renderLive();
    document.getElementById("reserve-close")?.focus();
  });

  soundBtn?.addEventListener("click", async () => {
    const node = ensureAudio();
    if (!node) return;
    if (node.ctx.state === "suspended") await node.ctx.resume();
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    if (soundState) soundState.textContent = soundOn ? "，开" : "，关";
    const now = node.ctx.currentTime;
    node.bed.gain.setTargetAtTime(soundOn ? 0.012 : 0, now, 0.25);
    node.noiseGain.gain.setTargetAtTime(soundOn ? 0.003 : 0, now, 0.25);
    if (!soundOn) node.tension = -1;
    renderLive();
  });

  lights?.addEventListener("click", () => {
    markSeen();
    blackout();
    update();
  });

  document.getElementById("hall-night")?.addEventListener("error", () => {
    document.querySelectorAll("[data-needs-figure]").forEach((node) => {
      const parent = node.parentElement;
      node.remove();
      if (parent?.hasAttribute("data-swap")) {
        parent.removeAttribute("data-swap");
        parent.classList.remove("on");
      }
    });
  });
  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => img.remove());
  });

  window.addEventListener("pointermove", (event) => {
    if (event.clientY < 8 || event.clientX < 6 || event.clientY > window.innerHeight - 6) {
      approachedEdge = true;
    }
  }, { passive: true });

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  document.addEventListener("visibilitychange", () => {
    update();
  });

  if (!reduced) {
    const glitch = () => {
      window.setTimeout(() => {
        if (stage >= 2 && !root.classList.contains("finale-active") && mark) {
          mark.classList.add("glitch");
          window.setTimeout(() => mark.classList.remove("glitch"), 140);
        }
        glitch();
      }, 7000 + Math.random() * 6000);
    };
    glitch();
  }

  window.setInterval(renderLive, 1000);
  renderLive();
  update();
}

bind();
