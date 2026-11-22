/* ============================================================
   SOMNIA — sound design (procedural, no samples)
   Nothing plays until the visitor says yes.
   ============================================================ */
window.SomniaSound = (function () {
  "use strict";

  var ctx = null;
  var master = null;
  var comp = null;
  var bus = null;              // everything musical
  var enabled = false;
  var act = 0;
  var finalMode = false;
  var nodes = {};
  var timers = { beat: null, whisper: null, creak: null, fade: null };
  var START_GAIN = 0.42;

  function now() { return ctx ? ctx.currentTime : 0; }

  function makeNoise(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buf;
  }

  function init() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 26;
    comp.ratio.value = 4;
    comp.attack.value = 0.02;
    comp.release.value = 0.35;
    master.connect(comp);
    comp.connect(ctx.destination);

    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(master);

    var noiseBuf = makeNoise(4);

    /* ---- room tone: the house settling ---- */
    var room = ctx.createBufferSource();
    room.buffer = noiseBuf;
    room.loop = true;
    var roomFilter = ctx.createBiquadFilter();
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 220;
    roomFilter.Q.value = 0.6;
    var roomGain = ctx.createGain();
    roomGain.gain.value = 0.16;
    room.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(bus);
    room.start();
    nodes.roomGain = roomGain;
    nodes.roomFilter = roomFilter;

    /* ---- air: almost inaudible hiss, the room breathing ---- */
    var air = ctx.createBufferSource();
    air.buffer = noiseBuf;
    air.loop = true;
    var airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 1400;
    airFilter.Q.value = 0.5;
    var airGain = ctx.createGain();
    airGain.gain.value = 0.012;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(bus);
    air.start(0, 1.3);
    nodes.airGain = airGain;

    /* ---- drone: two low tones a fifth apart ---- */
    var droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;
    var droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 260;
    droneFilter.connect(droneGain);
    droneGain.connect(bus);

    [41.2, 55.0, 82.4].forEach(function (freq, i) {
      var o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.value = i === 2 ? 0.05 : 0.14;
      o.connect(g);
      g.connect(droneFilter);
      o.start();
      nodes["osc" + i] = o;
    });
    nodes.droneGain = droneGain;
    nodes.droneFilter = droneFilter;

    /* slow amplitude breathing on the drone */
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(droneGain.gain);
    lfo.start();

    return true;
  }

  function fade(param, value, seconds, delay) {
    if (!ctx) return;
    var t = now() + (delay || 0);
    param.cancelScheduledValues(t);
    param.setValueAtTime(Math.max(param.value, 0.0001), t);
    param.exponentialRampToValueAtTime(Math.max(value, 0.0001), t + seconds);
  }

  function thump(t, strength, freq) {
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "sine";
    var f0 = freq || 62;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * strength, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.5);
  }

  function bpmForAct() {
    if (finalMode) return 30;
    if (act >= 4) return 86;
    if (act === 3) return 74;
    if (act === 2) return 58;
    return 52;
  }

  function heartbeat() {
    timers.beat = null;
    if (!enabled || !ctx) return;
    if (act >= 2) {
      var t = now() + 0.05;
      var strength = finalMode ? 0.34 : (act >= 4 ? 0.9 : act === 3 ? 0.7 : 0.45);
      thump(t, strength);
      thump(t + 0.15, strength * 0.55);
    }
    var bpm = bpmForAct();
    var delay = (60 / bpm) * 1000;
    if (finalMode) delay *= 1.18;
    timers.beat = setTimeout(heartbeat, delay);
  }

  function whisper() {
    timers.whisper = null;
    if (!enabled || !ctx || act < 3) {
      timers.whisper = setTimeout(whisper, 4000);
      return;
    }
    var t = now() + Math.random() * 0.6;
    var src = ctx.createBufferSource();
    src.buffer = nodes.whisperBuf || (nodes.whisperBuf = makeNoise(2));
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700 + Math.random() * 1100;
    bp.Q.value = 7 + Math.random() * 6;
    var g = ctx.createGain();
    var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var dur = 0.5 + Math.random() * 1.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.07, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    if (pan) {
      pan.pan.value = Math.random() * 2 - 1;
      g.connect(pan);
      pan.connect(bus);
    } else {
      g.connect(bus);
    }
    src.start(t, Math.random());
    src.stop(t + dur + 0.1);

    var wait = act >= 4 ? 3500 + Math.random() * 5000 : 7000 + Math.random() * 9000;
    timers.whisper = setTimeout(whisper, wait);
  }

  function creak() {
    timers.creak = null;
    if (!enabled || !ctx || act < 2) {
      timers.creak = setTimeout(creak, 6000);
      return;
    }
    var t = now() + Math.random() * 2;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    o.type = "sawtooth";
    var base = 70 + Math.random() * 120;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * (0.8 + Math.random() * 0.5), t + 1.6);
    f.type = "bandpass";
    f.frequency.value = 320 + Math.random() * 500;
    f.Q.value = 9;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.018, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(f);
    f.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 2);
    timers.creak = setTimeout(creak, 9000 + Math.random() * 16000);
  }

  function enable() {
    if (!ctx && !init()) return false;
    if (ctx.state === "suspended") ctx.resume();
    enabled = true;
    fade(master.gain, START_GAIN, 3.5);
    fade(nodes.droneGain.gain, 0.5, 6, 0.3);
    fade(nodes.roomGain.gain, 0.2, 4);
    if (!timers.beat) heartbeat();
    if (!timers.whisper) timers.whisper = setTimeout(whisper, 6000);
    if (!timers.creak) timers.creak = setTimeout(creak, 12000);
    return true;
  }

  function disable() {
    enabled = false;
    if (ctx) fade(master.gain, 0.0001, 1.6);
    [timers.beat, timers.whisper, timers.creak].forEach(function (t) { if (t) clearTimeout(t); });
    timers.beat = timers.whisper = timers.creak = null;
  }

  function toggle() {
    if (enabled) { disable(); return false; }
    return enable();
  }

  function setAct(n) {
    act = n;
    if (!ctx) return;
    if (!enabled) return;
    if (n >= 2) {
      if (!timers.beat) heartbeat();
      if (!timers.whisper) timers.whisper = setTimeout(whisper, 5000);
    }
    // the room tightens as the page goes down
    fade(nodes.droneFilter.frequency, 260 + n * 70, 4);
    fade(nodes.droneGain.gain, 0.5 + n * 0.12, 5);
    fade(nodes.airGain.gain, 0.012 + n * 0.006, 5);
    if (n >= 4) {
      var drift = 1 + 0.012;
      try {
        nodes.osc0.frequency.linearRampToValueAtTime(41.2 * drift, now() + 20);
        nodes.osc1.frequency.linearRampToValueAtTime(55.0 * drift, now() + 20);
      } catch (e) { /* ignore */ }
    }
  }

  function boom() {
    if (!ctx || !enabled) return;
    var t = now();
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(96, t);
    o.frequency.exponentialRampToValueAtTime(21, t + 2.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 3.5);

    var n = ctx.createBufferSource();
    n.buffer = makeNoise(1.2);
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 140;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    n.connect(lp); lp.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 1.3);
  }

  function finale() {
    if (!ctx || !enabled) return;
    finalMode = true;
    if (timers.whisper) { clearTimeout(timers.whisper); timers.whisper = null; }
    if (timers.creak) { clearTimeout(timers.creak); timers.creak = null; }
    fade(nodes.droneGain.gain, 0.001, 16, 1);
    fade(nodes.roomGain.gain, 0.001, 14, 2);
    fade(nodes.airGain.gain, 0.001, 10, 1);
    timers.fade = setTimeout(function () {
      if (timers.beat) { clearTimeout(timers.beat); timers.beat = null; }
      fade(master.gain, 0.0001, 3);
      setTimeout(function () { if (ctx && ctx.state === "running") ctx.suspend(); }, 3200);
    }, 14000);
  }

  return {
    enable: enable,
    disable: disable,
    toggle: toggle,
    isEnabled: function () { return enabled; },
    setAct: setAct,
    boom: boom,
    finale: finale
  };
})();
