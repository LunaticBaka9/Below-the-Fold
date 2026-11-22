/* ==========================================================================
   Procedural Web Audio API Horror Soundscape Engine
   100% synthesized in real time: ambient room -> fluorescent hum ->
   detuned sub-bass drone -> whispered static -> heartbeat -> horror sting.
   ========================================================================== */

class HorrorAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.initialized = false;
    this.progress = 0;

    // Nodes
    this.masterGain = null;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.buzzGain = null;
    this.buzzOsc = null;
    this.noiseGain = null;
    this.noiseFilter = null;
    this.tensionGain = null;
    this.tensionOsc = null;

    // Heartbeat scheduler
    this.heartbeatTimer = null;
    this.onHeartbeatPulse = null;
  }

  init() {
    if (this.initialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(this.ctx.destination);

    // 1. Sub-bass binaural detuned drone (41Hz + 43.2Hz)
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0;
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 140;

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = "sawtooth";
    this.droneOsc1.frequency.value = 41.2;

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = "triangle";
    this.droneOsc2.frequency.value = 43.6;

    this.droneOsc1.connect(droneFilter);
    this.droneOsc2.connect(droneFilter);
    droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc1.start();
    this.droneOsc2.start();

    // 2. Fluorescent light 60Hz/120Hz sickly buzz
    this.buzzGain = this.ctx.createGain();
    this.buzzGain.gain.value = 0.0;
    const buzzFilter = this.ctx.createBiquadFilter();
    buzzFilter.type = "bandpass";
    buzzFilter.frequency.value = 180;
    buzzFilter.Q.value = 3.5;

    this.buzzOsc = this.ctx.createOscillator();
    this.buzzOsc.type = "sawtooth";
    this.buzzOsc.frequency.value = 120;
    this.buzzOsc.connect(buzzFilter);
    buzzFilter.connect(this.buzzGain);
    this.buzzGain.connect(this.masterGain);
    this.buzzOsc.start();

    // 3. Whispering analog tape / wind static (filtered pink noise)
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = 900;
    this.noiseFilter.Q.value = 2.2;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.0;

    noiseSrc.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    noiseSrc.start();

    // 4. High eerie metallic tension sine (horror movie violin harmonic)
    this.tensionGain = this.ctx.createGain();
    this.tensionGain.gain.value = 0.0;
    this.tensionOsc = this.ctx.createOscillator();
    this.tensionOsc.type = "sine";
    this.tensionOsc.frequency.value = 622; // D#5 eerie dissonance
    this.tensionOsc.connect(this.tensionGain);
    this.tensionGain.connect(this.masterGain);
    this.tensionOsc.start();

    this.initialized = true;
    this.scheduleNextHeartbeat();
  }

  async enable() {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.enabled = true;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.75, now, 0.25);
    this.update(this.progress);
    return true;
  }

  disable() {
    this.enabled = false;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.15);
    }
  }

  toggle() {
    if (this.enabled) {
      this.disable();
      return false;
    } else {
      this.enable();
      return true;
    }
  }

  update(p, aftermath = false) {
    this.progress = Math.max(0, Math.min(1, p));
    if (!this.initialized || !this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const effectiveP = aftermath ? Math.max(0.55, this.progress) : this.progress;

    // Drone ramps up from 20% -> 100%
    const droneVol = effectiveP < 0.18 ? 0.0 : Math.min(0.42, (effectiveP - 0.18) * 0.55);
    this.droneGain.gain.setTargetAtTime(droneVol, now, 0.3);
    this.droneOsc1.frequency.setTargetAtTime(41.2 - effectiveP * 7, now, 0.4);
    this.droneOsc2.frequency.setTargetAtTime(43.6 - effectiveP * 4.5, now, 0.4);

    // Fluorescent buzz strongest in uncanny & corridor acts (22% -> 92%)
    const buzzVol =
      effectiveP > 0.2 && effectiveP < 0.96
        ? Math.sin(((effectiveP - 0.2) / 0.76) * Math.PI) * 0.085
        : 0.0;
    this.buzzGain.gain.setTargetAtTime(buzzVol, now, 0.2);

    // Whisper static rises steadily from 35% -> 100%
    const noiseVol = effectiveP < 0.32 ? 0.0 : Math.min(0.32, (effectiveP - 0.32) * 0.48);
    this.noiseGain.gain.setTargetAtTime(noiseVol, now, 0.3);
    // Sweep bandpass like distant breathing/whispers
    const sweep = 650 + Math.sin(now * 0.9) * 350 + effectiveP * 600;
    this.noiseFilter.frequency.setTargetAtTime(sweep, now, 0.25);

    // High dissonant violin-like harmonic rises in Acts 5-6 (65% -> 96%)
    const tensionVol = effectiveP > 0.65 ? Math.min(0.085, (effectiveP - 0.65) * 0.25) : 0.0;
    this.tensionGain.gain.setTargetAtTime(tensionVol, now, 0.35);
    this.tensionOsc.frequency.setTargetAtTime(580 + effectiveP * 240 + Math.sin(now * 4) * 6, now, 0.2);
  }

  scheduleNextHeartbeat() {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);

    const p = this.progress;
    // Heartbeat audible from 58% onward, accelerating from 60 BPM to 138 BPM
    const bpm = 58 + Math.max(0, (p - 0.55) / 0.45) * 82;
    const intervalMs = Math.max(410, Math.round(60000 / bpm));

    if (this.enabled && this.ctx && p > 0.58) {
      const intensity = Math.min(1, (p - 0.58) / 0.38);
      this.playHeartbeatThump(intensity);
      if (this.onHeartbeatPulse) this.onHeartbeatPulse(intensity);
    }

    this.heartbeatTimer = setTimeout(() => this.scheduleNextHeartbeat(), intervalMs);
  }

  playHeartbeatThump(intensity) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    const thump = (delay, peakFreq, vol) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(peakFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(28, now + delay + 0.14);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(vol * intensity, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    };

    // Lub-dub
    thump(0, 72, 0.55);
    thump(0.17, 58, 0.36);
  }

  playGlitchTick() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(140 + Math.random() * 900, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playFlickerBuzz() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(118, now);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playClimaxSting() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    // 1. Massive sub-bass impact boom
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 1.6);
    subGain.gain.setValueAtTime(0.95, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 2.2);

    // 2. Dissonant metallic waterphone / screeching cluster
    const freqs = [311.1, 329.6, 622.2, 659.3, 1244.5, 1318.5];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(f * (0.97 + Math.random() * 0.06), now);
      osc.frequency.linearRampToValueAtTime(f * 1.18, now + 0.45);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, now + 2.3);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.13, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.5);
    });

    // 3. Violent distorted static burst
    const len = Math.floor(this.ctx.sampleRate * 0.85);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }
}

window.HorrorAudioEngine = HorrorAudioEngine;
