/* ==========================================================================
   Visuals Engine — Procedural Canvas Horror Renderers
   1. FXOverlayCanvas (film grain, VHS tears, floating dark ash)
   2. CCTVSurveillanceCanvas (live night-vision camera + approaching entity)
   3. WatchingEyesCanvas (cursor-tracking blinking eyes hidden in dark margins)
   4. CorridorAtmosphereCanvas (flickering dust, wet shadows, creeping fog)
   5. ClimaxScareCanvas (VHS slicing, RGB split & lunging entity face)
   ========================================================================== */

class HorrorVisuals {
  constructor() {
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.progress = 0;
    this.aftermath = false;
    this.corridorProgress = 0;

    // Canvases
    this.fxCanvas = document.getElementById("fx-canvas");
    this.fxCtx = this.fxCanvas.getContext("2d");

    this.cctvCanvas = document.getElementById("cctv-canvas");
    this.cctvCtx = this.cctvCanvas ? this.cctvCanvas.getContext("2d") : null;

    this.eyesCanvas = document.getElementById("eyes-canvas");
    this.eyesCtx = this.eyesCanvas ? this.eyesCanvas.getContext("2d") : null;

    this.corridorCanvas = document.getElementById("corridor-canvas");
    this.corridorCtx = this.corridorCanvas ? this.corridorCanvas.getContext("2d") : null;

    this.climaxCanvas = document.getElementById("climax-canvas");
    this.climaxCtx = this.climaxCanvas ? this.climaxCanvas.getContext("2d") : null;

    // Preload entity image for climax canvas manipulation
    this.entityImg = new Image();
    this.entityImg.src = "assets/horror-entity.jpg";
    this.entityLoaded = false;
    this.entityImg.onload = () => {
      this.entityLoaded = true;
    };

    // Watching eyes definitions
    this.eyes = this.createEyes();

    // Dust/ash particles
    this.ash = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.8 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.0005,
      vy: 0.0003 + Math.random() * 0.0008,
      alpha: 0.15 + Math.random() * 0.45
    }));

    // CCTV state
    this.cctvEntityPhase = 0;
    this.cctvGlitchFrames = 0;
    this.cctvFrameCount = 0;

    // Climax animation state
    this.climaxActive = false;
    this.climaxStart = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  createEyes() {
    const spots = [
      { rx: 0.09, ry: 0.14, size: 32 },
      { rx: 0.91, ry: 0.18, size: 36 },
      { rx: 0.06, ry: 0.44, size: 28 },
      { rx: 0.93, ry: 0.52, size: 30 },
      { rx: 0.11, ry: 0.78, size: 38 },
      { rx: 0.88, ry: 0.84, size: 34 },
      { rx: 0.24, ry: 0.09, size: 22 },
      { rx: 0.76, ry: 0.92, size: 26 }
    ];
    return spots.map((s) => ({
      ...s,
      blink: 0,
      nextBlink: 120 + Math.random() * 240,
      pupilX: 0,
      pupilY: 0
    }));
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.fxCanvas) {
      this.fxCanvas.width = Math.floor(w * 0.5);
      this.fxCanvas.height = Math.floor(h * 0.5);
    }
    if (this.eyesCanvas && this.eyesCanvas.parentElement) {
      const rect = this.eyesCanvas.parentElement.getBoundingClientRect();
      this.eyesCanvas.width = Math.max(300, Math.floor(rect.width));
      this.eyesCanvas.height = Math.max(400, Math.floor(rect.height));
    }
    if (this.corridorCanvas) {
      this.corridorCanvas.width = w;
      this.corridorCanvas.height = h;
    }
    if (this.climaxCanvas) {
      this.climaxCanvas.width = w;
      this.climaxCanvas.height = h;
    }
  }

  setState(progress, aftermath, corridorProgress) {
    this.progress = progress;
    this.aftermath = aftermath;
    this.corridorProgress = corridorProgress;
  }

  triggerClimax(durationMs = 2600) {
    this.climaxActive = true;
    this.climaxStart = performance.now();
    this.climaxDuration = durationMs;
  }

  stopClimax() {
    this.climaxActive = false;
  }

  loop(now) {
    this.cctvFrameCount++;
    const effectiveP = this.aftermath ? Math.max(0.55, this.progress) : this.progress;

    // 1. Global FX Grain & VHS Tears
    if (effectiveP > 0.26) {
      this.renderFX(effectiveP);
    }

    // 2. CCTV Feed (only render when near Act 4 for smoothness)
    if (this.cctvCtx && this.progress > 0.32 && this.progress < 0.8) {
      this.renderCCTV(now);
    }

    // 3. Watching Eyes
    if (this.eyesCtx && this.progress > 0.34 && this.progress < 0.82) {
      this.renderEyes();
    }

    // 4. Corridor Atmosphere
    if (this.corridorCtx && this.progress > 0.74) {
      this.renderCorridorFX(now);
    }

    // 5. Climax Scare Canvas
    if (this.climaxActive && this.climaxCtx) {
      this.renderClimax(now);
    }

    requestAnimationFrame(this.loop);
  }

  renderFX(p) {
    const ctx = this.fxCtx;
    const w = this.fxCanvas.width;
    const h = this.fxCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle analog snow dots
    const density = Math.floor((p - 0.25) * 420);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < density; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Occasional VHS horizontal static tear
    if (p > 0.45 && Math.random() < (p - 0.4) * 0.16) {
      const tearY = Math.random() * h;
      const tearH = 1 + Math.random() * (p > 0.75 ? 9 : 3);
      ctx.fillStyle = Math.random() < 0.35 ? "rgba(220,38,38,0.28)" : "rgba(255,255,255,0.18)";
      ctx.fillRect(0, tearY, w, tearH);
    }

    // Floating dark red/grey ash particles in deep horror acts
    if (p > 0.58) {
      for (const a of this.ash) {
        a.x = (a.x + a.vx + 1) % 1;
        a.y = (a.y + a.vy) % 1;
        ctx.beginPath();
        ctx.arc(a.x * w, a.y * h, a.r * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 180, 180, ${a.alpha * (p - 0.55)})`;
        ctx.fill();
      }
    }
  }

  renderCCTV(now) {
    const ctx = this.cctvCtx;
    const w = this.cctvCanvas.width;
    const h = this.cctvCanvas.height;

    // Slight frame-rate cap (around 15-20 fps feel)
    if (this.cctvFrameCount % 2 !== 0) return;

    // Background dark night-vision room/hallway perspective
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.48, 30, w * 0.5, h * 0.5, w * 0.65);
    grad.addColorStop(0, "#1c2b20");
    grad.addColorStop(0.55, "#0b140d");
    grad.addColorStop(1, "#020503");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw hallway walls & doorway geometry
    ctx.strokeStyle = "rgba(134, 239, 172, 0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Perspective lines
    ctx.moveTo(0, 0); ctx.lineTo(w * 0.34, h * 0.2);
    ctx.moveTo(w, 0); ctx.lineTo(w * 0.66, h * 0.2);
    ctx.moveTo(0, h); ctx.lineTo(w * 0.34, h * 0.8);
    ctx.moveTo(w, h); ctx.lineTo(w * 0.66, h * 0.8);
    // Far doorway frame
    ctx.rect(w * 0.38, h * 0.22, w * 0.24, h * 0.58);
    ctx.stroke();

    // Pitch black inside open doorway
    ctx.fillStyle = "#010302";
    ctx.fillRect(w * 0.385, h * 0.225, w * 0.23, h * 0.57);

    // Progress of silhouette inside CCTV based on scroll within Act 4 (0.44 -> 0.66)
    const localP = Math.max(0, Math.min(1, (this.progress - 0.44) / 0.2));
    const flicker = Math.sin(now * 0.02) > 0.88 ? 0.4 : 1;

    // Trigger random CCTV signal tear
    if (Math.random() < 0.025) this.cctvGlitchFrames = 5;

    // Draw the gaunt figure stepping out of doorway & tilting head
    if (localP > 0.08 && this.cctvGlitchFrames === 0) {
      const scale = 0.68 + localP * 0.95; // Gets closer as you scroll!
      const cx = w * 0.5 + Math.sin(now * 0.0015) * 6;
      const baseY = h * (0.78 + localP * 0.16);
      const headTilt = Math.sin(now * 0.0022) * 0.18 + (localP > 0.6 ? 0.28 : 0);

      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(scale, scale);

      // Elongated torso silhouette
      ctx.fillStyle = "rgba(4, 7, 5, 0.94)";
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.quadraticCurveTo(-36, -155, -24, -195);
      ctx.lineTo(24, -195);
      ctx.quadraticCurveTo(36, -155, 42, 0);
      ctx.closePath();
      ctx.fill();

      // Long thin hanging arms
      ctx.strokeStyle = "rgba(4, 7, 5, 0.92)";
      ctx.lineWidth = 11;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-26, -182);
      ctx.quadraticCurveTo(-52, -110, -46, -24);
      ctx.moveTo(26, -182);
      ctx.quadraticCurveTo(54, -108, 44, -20);
      ctx.stroke();

      // Tilting pale-shadow head
      ctx.save();
      ctx.translate(0, -210);
      ctx.rotate(headTilt);
      ctx.fillStyle = "#080d09";
      ctx.beginPath();
      ctx.ellipse(0, -18, 22, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // IR eye-shine (glowing pinpoint night-vision reflection!)
      if (localP > 0.22) {
        const eyeGlow = 0.55 + localP * 0.45;
        ctx.fillStyle = `rgba(220, 255, 220, ${eyeGlow * flicker})`;
        ctx.shadowColor = "#bbf7d0";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-8, -20, 2.5, 0, Math.PI * 2);
        ctx.arc(8, -20, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      ctx.restore();

      // Motion detection bounding box around the entity
      const boxW = 110 * scale;
      const boxH = 250 * scale;
      const boxX = cx - boxW / 2;
      const boxY = baseY - boxH - 10;
      ctx.strokeStyle = localP > 0.65 ? "rgba(239, 68, 68, 0.78)" : "rgba(163, 230, 53, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);

      ctx.font = "12px monospace";
      ctx.fillStyle = localP > 0.65 ? "#f87171" : "#bef264";
      const label = localP > 0.72
        ? "ALERT // IT SEES THE CAMERA"
        : localP > 0.42
        ? "SUBJECT_00 // HEARTBEAT: 0 BPM"
        : "MOTION // UNIDENTIFIED (99.1%)";
      ctx.fillText(label, boxX + 4, Math.max(24, boxY - 8));
    }

    // Night-vision scanlines & heavy grain
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1.5);
    }

    for (let i = 0; i < 650; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      const br = Math.random() > 0.5 ? "rgba(187,247,208,0.12)" : "rgba(0,0,0,0.22)";
      ctx.fillStyle = br;
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Glitch static blast
    if (this.cctvGlitchFrames > 0) {
      this.cctvGlitchFrames--;
      for (let i = 0; i < 18; i++) {
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.3 ? "rgba(210,255,215,0.22)" : "rgba(220,38,38,0.28)";
        ctx.fillRect(0, y, w, 4 + Math.random() * 18);
      }
    }

    // Lens vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.62);
    vig.addColorStop(0, "transparent");
    vig.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // Crosshair center
    ctx.strokeStyle = "rgba(163, 230, 53, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 14, h / 2); ctx.lineTo(w / 2 + 14, h / 2);
    ctx.moveTo(w / 2, h / 2 - 14); ctx.lineTo(w / 2, h / 2 + 14);
    ctx.stroke();
  }

  renderEyes() {
    const ctx = this.eyesCtx;
    const w = this.eyesCanvas.width;
    const h = this.eyesCanvas.height;
    const rect = this.eyesCanvas.getBoundingClientRect();

    ctx.clearRect(0, 0, w, h);

    // Mouse coordinates relative to eyes canvas
    const mx = this.mouseX - rect.left;
    const my = this.mouseY - rect.top;

    for (const eye of this.eyes) {
      const ex = eye.rx * w;
      const ey = eye.ry * h;
      const r = eye.size;

      // Blink timer
      eye.nextBlink--;
      if (eye.nextBlink <= 0) {
        eye.blink = 1;
        eye.nextBlink = 140 + Math.random() * 320;
      }
      if (eye.blink > 0) {
        eye.blink = Math.max(0, eye.blink - 0.14);
      }

      const openness = 1 - Math.sin(eye.blink * Math.PI);
      if (openness < 0.08) continue;

      // Smoothly track mouse
      const angle = Math.atan2(my - ey, mx - ex);
      const dist = Math.min(r * 0.26, Math.hypot(mx - ex, my - ey) * 0.03);
      const targetPx = Math.cos(angle) * dist;
      const targetPy = Math.sin(angle) * dist;
      eye.pupilX += (targetPx - eye.pupilX) * 0.14;
      eye.pupilY += (targetPy - eye.pupilY) * 0.14;

      ctx.save();
      ctx.translate(ex, ey);

      // Almond eye clip path
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.quadraticCurveTo(0, -r * 0.62 * openness, r, 0);
      ctx.quadraticCurveTo(0, r * 0.62 * openness, -r, 0);
      ctx.closePath();
      ctx.save();
      ctx.clip();

      // Bloodshot shadowy sclera
      const scGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
      scGrad.addColorStop(0, "rgba(215, 210, 200, 0.34)");
      scGrad.addColorStop(0.65, "rgba(110, 25, 25, 0.28)");
      scGrad.addColorStop(1, "rgba(10, 4, 4, 0.7)");
      ctx.fillStyle = scGrad;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      // Iris
      ctx.beginPath();
      ctx.arc(eye.pupilX, eye.pupilY, r * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(153, 27, 27, 0.72)";
      ctx.fill();

      // Pinpoint dilated pupil
      ctx.beginPath();
      ctx.arc(eye.pupilX, eye.pupilY, r * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = "#030304";
      ctx.fill();

      // Wet highlight
      ctx.beginPath();
      ctx.arc(eye.pupilX - r * 0.08, eye.pupilY - r * 0.08, r * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 240, 240, 0.72)";
      ctx.fill();

      ctx.restore();

      // Outer dark eyelid shadow
      ctx.strokeStyle = "rgba(185, 28, 28, 0.24)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  renderCorridorFX(now) {
    const ctx = this.corridorCtx;
    const w = this.corridorCanvas.width;
    const h = this.corridorCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Creeping mist/shadow tendrils from edges as corridor progresses
    const p = this.corridorProgress;
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * (0.28 - p * 0.12), w * 0.5, h * 0.5, w * 0.65);
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(0.7, `rgba(0, 0, 0, ${0.45 + p * 0.3})`);
    vig.addColorStop(1, "rgba(0, 0, 0, 0.96)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // Subtle floating corridor dust illuminated by dying fluorescent tube
    ctx.fillStyle = "rgba(195, 220, 205, 0.16)";
    for (let i = 0; i < 36; i++) {
      const px = ((Math.sin(now * 0.0003 + i * 7.3) + 1) * 0.5) * w;
      const py = ((now * 0.00004 * (1 + (i % 4)) + i * 0.17) % 1) * h;
      ctx.beginPath();
      ctx.arc(px, py, 1 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderClimax(now) {
    const ctx = this.climaxCtx;
    const w = this.climaxCanvas.width;
    const h = this.climaxCanvas.height;
    const elapsed = now - this.climaxStart;
    const t = Math.min(1, elapsed / this.climaxDuration);

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    // Lunging zoom curve
    const lunge = 1.05 + Math.pow(t, 0.55) * 0.58;
    const jitterX = (Math.random() - 0.5) * (28 * (1 - t * 0.45));
    const jitterY = (Math.random() - 0.5) * (22 * (1 - t * 0.45));

    if (this.entityLoaded) {
      const aspect = this.entityImg.width / this.entityImg.height;
      let drawW = w * lunge;
      let drawH = drawW / aspect;
      if (drawH < h * lunge) {
        drawH = h * lunge;
        drawW = drawH * aspect;
      }
      const dx = (w - drawW) / 2 + jitterX;
      const dy = (h - drawH) / 2 + jitterY;

      // Base terrifying entity image
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(this.entityImg, dx, dy, drawW, drawH);

      // Red chromatic aberration ghost shift
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35;
      ctx.filter = "sepia(1) saturate(6) hue-rotate(-50deg) contrast(1.5)";
      ctx.drawImage(this.entityImg, dx - 14 * Math.random(), dy + 4, drawW, drawH);
      ctx.filter = "none";
      ctx.restore();

      // Horizontal VHS violent slice displacement
      const slices = 10;
      for (let i = 0; i < slices; i++) {
        if (Math.random() > 0.55) continue;
        const sy = Math.random() * h;
        const sh = 6 + Math.random() * 28;
        const offset = (Math.random() - 0.5) * 70;
        ctx.drawImage(this.climaxCanvas, 0, sy, w, sh, offset, sy, w, sh);
      }
    }

    // Crimson vignette + analog noise bars
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.14, w / 2, h / 2, w * 0.65);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.75, "rgba(90,0,0,0.45)");
    grad.addColorStop(1, "rgba(0,0,0,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle dark scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
  }
}

window.HorrorVisuals = HorrorVisuals;
