(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ===== 1. SCROLL PROGRESS -> --p & data-stage ===== */
  let progress = 0, stage = 0;
  function onScroll() {
    const finEl = document.getElementById('s-finale');
    const finTop = finEl ? finEl.offsetTop : document.documentElement.scrollHeight;
    const span = Math.max(1, finTop - innerHeight);
    progress = clamp(scrollY / span, 0, 1);
    root.style.setProperty('--p', progress.toFixed(4));
    const next = scrollY >= finTop ? 5 : Math.min(4, Math.floor(progress * 5));
    if (next !== stage) { stage = next; body.dataset.stage = stage; onStage(stage); }
  }
  function onStage(s) { /* hooks per stage */ }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ===== 2. TEXT CORRUPTION ===== */
  const GLITCH = '█▓▒░▚▞▙▛▜▟¦';
  const ZALGO = ['̀','́','̂','̆','̇','̈','̊','̖','̗','̣','̤','̴','̵','̶','̷','̸'];
  const SKIP = /[\s，。！？：、·%]/;
  const pick = a => a[(Math.random() * a.length) | 0];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes = [];
  document.querySelectorAll('[data-corrupt]').forEach(el => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) nodes.push({ n, el, orig: n.nodeValue });
  });
  const seen = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
  new Set(nodes.map(o => o.el)).forEach(el => io.observe(el));
  let o_isPrice = false;
  function corrupt(s, k, price) {
    o_isPrice = !!price;
    let out = '';
    for (const ch of s) {
      if (SKIP.test(ch) || /[0-9,¥]/.test(ch) && o_isPrice) { out += ch; continue; }
      const r = Math.random();
      if (r < k * 0.05) out += pick(GLITCH);
      else if (/[㐀-鿿]/.test(ch)) out += r < k * 0.12 ? pick('死血逃它眼醒') : ch;
      else if (r < k * 0.5) { let z = ch; for (let i = 0, c = 1 + ((k * 2) | 0); i < c; i++) z += pick(ZALGO); out += z; }
      else out += ch;
    }
    return out;
  }
  /* 锁定腐化元素的尺寸：组合符和块状字符会改变换行与行高，让页面越滚越长 */
  const lockEls = [...new Set(nodes.map(o => o.el))];
  function lockSizes() {
    for (const o of nodes) o.n.nodeValue = o.orig;
    for (const el of lockEls) el.style.height = '';
    const hs = lockEls.map(el => getComputedStyle(el).display === 'inline' ? 0 : el.getBoundingClientRect().height);
    lockEls.forEach((el, i) => { if (hs[i]) el.style.height = hs[i] + 'px'; });
  }
  let lockT = 0;
  addEventListener('resize', () => { clearTimeout(lockT); lockT = setTimeout(lockSizes, 150); });
  addEventListener('load', lockSizes);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockSizes);
  lockSizes();
  const level = () => clamp((progress - 0.12) * 1.25, 0, 1) * 0.7;
  setInterval(() => {
    if (reduced) return;
    const k = level();
    for (const o of nodes) {
      if (!seen.has(o.el)) continue;
      if (k <= 0) { if (o.n.nodeValue !== o.orig) o.n.nodeValue = o.orig; continue; }
      if (Math.random() < 0.3) o.n.nodeValue = corrupt(o.orig, k, o.el.closest('.price') !== null);
    }
  }, 150);

  /* ===== 3. CURSOR / MOUSE EFFECTS ===== */
  const overlay = document.getElementById('fx-overlay');
  function flash() {
    if (reduced) return;
    overlay.classList.remove('on'); void overlay.offsetWidth; overlay.classList.add('on');
    body.classList.add('shake'); setTimeout(() => body.classList.remove('shake'), 450);
  }

  const eyes = [...document.querySelectorAll('.eye')];
  let mx = innerWidth / 2, my = innerHeight / 2, raf = 0;
  function trackEyes() {
    raf = 0;
    for (const el of eyes) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      el.style.setProperty('--mx', (dx / d).toFixed(3));
      el.style.setProperty('--my', (dy / d).toFixed(3));
    }
  }
  const queueEyes = () => { if (!raf) raf = requestAnimationFrame(trackEyes); };
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; queueEyes(); }, { passive: true });
  addEventListener('scroll', queueEyes, { passive: true });

  const cancel = document.getElementById('cancel');
  if (cancel) {
    const lines = ['取消订单', '你确定吗？', '它会难过的', '别走', '太晚了'];
    let tries = 0;
    cancel.addEventListener('pointerenter', () => {
      if (tries >= 5) return;
      tries++;
      cancel.textContent = lines[Math.min(tries, lines.length - 1)];
      const dx = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 120);
      const dy = (Math.random() - 0.5) * 80;
      cancel.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + ((Math.random() - 0.5) * 12) + 'deg)';
    });
    cancel.addEventListener('click', () => {
      cancel.textContent = '已无法取消';
      cancel.style.transform = 'none';
      cancel.style.color = '#ff3b2f';
      cancel.style.borderColor = '#ff3b2f';
      flash();
    });
  }

  const timerEl = document.getElementById('timer');
  if (timerEl) {
    let left = 197;
    const fmt = n => String(n).padStart(2, '0');
    setInterval(() => {
      if (left > 0) left--;
      timerEl.textContent = left > 0 ? '00:' + fmt(Math.floor(left / 60)) + ':' + fmt(left % 60) : '它已经来了';
    }, 1000);
  }

  /* ===== 4. AUDIO (WebAudio 合成环境音，需用户交互后启动) ===== */
  let ac = null, master = null, droneGain = null, droneFilter = null, beatTimer = 0;
  function thump(t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(75, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.3);
  }
  function scheduleBeat() {
    const k = clamp((progress - 0.5) / 0.5, 0, 1);
    if (ac && ac.state === 'running' && progress > 0.55 && lastF < 0.93) {
      thump(ac.currentTime, 0.25 + k * 0.6);
      thump(ac.currentTime + 0.2, 0.15 + k * 0.4);
    }
    beatTimer = setTimeout(scheduleBeat, 60000 / (55 + k * 90));
  }
  function hit() {
    if (!ac || ac.state !== 'running' || lastF >= 0.93) return;
    const t = ac.currentTime, len = (ac.sampleRate * 0.35) | 0;
    const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(g); g.connect(master);
    src.start(t);
    thump(t, 0.9);
  }
  function updateAudio() {
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime;
    droneGain.gain.setTargetAtTime(clamp((progress - 0.25) * 0.4, 0, 0.3), t, 0.4);
    droneFilter.frequency.setTargetAtTime(110 + progress * 700, t, 0.4);
    master.gain.setTargetAtTime(lastF >= 0.93 ? 0 : 0.9, t, 0.15);
  }
  function startAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || reduced) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);
    droneFilter = ac.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 110;
    droneGain = ac.createGain();
    droneGain.gain.value = 0;
    droneFilter.connect(droneGain);
    droneGain.connect(master);
    [55, 55.7, 82.4].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      o.connect(droneFilter);
      o.start();
    });
    scheduleBeat();
    setInterval(updateAudio, 200);
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, startAudio, { passive: true }));
  overlay.addEventListener('animationstart', hit);

  /* ===== 5. FINALE SEQUENCE ===== */
  const fin = document.getElementById('s-finale');
  const finMarks = [0.12, 0.42, 0.66, 0.93];
  const baseTitle = document.title;
  let lastF = 0;
  function updateFinale() {
    if (!fin) return;
    const total = fin.offsetHeight - innerHeight;
    const f = total > 0 ? clamp(-fin.getBoundingClientRect().top / total, 0, 1) : 0;
    fin.style.setProperty('--f', f.toFixed(4));
    if (f > lastF) {
      for (const m of finMarks) if (lastF < m && f >= m) flash();
    }
    lastF = f;
    if (f >= 0.93) document.title = '……';
    else if (f >= 0.6) document.title = '别回头';
    else if (f >= 0.02) document.title = '03:17';
    else document.title = baseTitle;
  }
  addEventListener('scroll', updateFinale, { passive: true });
  addEventListener('resize', updateFinale);
  updateFinale();

  onScroll();
})();
