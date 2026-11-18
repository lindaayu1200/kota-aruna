// KOTA ARUNA — game sound effects.
//
// All sound is synthesised: a throbbing engine built from two detuned oscillators and a low-pass
// filter, noise-burst gunfire, a two-tone police siren that alternates over time, and a looping
// rotor thump with a slow amplitude modulation for the pursuit helicopter. No audio files.
//
// Like the radio, the AudioContext is created only by unlock(), called from a real user gesture.

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function noiseBuffer(ctx, seconds = 0.5) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x1a2b3c4d;
  for (let i = 0; i < data.length; i += 1) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    data[i] = (seed / 2147483648) - 1;
  }
  return buffer;
}

export function createAudio(options = {}) {
  let ctx = null;
  let master = null;
  let noise = null;
  let unlocked = false;
  let muted = false;

  let engine = null;
  let siren = null;
  let heli = null;

  let engineActive = false;
  let engineRatio = 0;
  let sirenActive = false;
  let sirenPhase = 0;
  let heliState = { active: false, rotorRpm: 0 };

  function ramp(param, value, time = 0.05) {
    if (!ctx || !param) return;
    param.setTargetAtTime(value, ctx.currentTime, time);
  }

  function applyMaster() {
    ramp(master && master.gain, muted ? 0 : 0.85, 0.06);
  }

  function buildEngine() {
    const low = ctx.createOscillator();
    low.type = 'sawtooth';
    low.frequency.value = 48;
    const high = ctx.createOscillator();
    high.type = 'square';
    high.frequency.value = 24;
    const gLow = ctx.createGain();
    gLow.gain.value = 0.75;
    const gHigh = ctx.createGain();
    gHigh.gain.value = 0.25;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 360;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    low.connect(gLow);
    high.connect(gHigh);
    gLow.connect(filter);
    gHigh.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    low.start();
    high.start();
    return { low, high, filter, gain };
  }

  function buildSiren() {
    const low = ctx.createOscillator();
    low.type = 'sine';
    low.frequency.value = 620;
    const high = ctx.createOscillator();
    high.type = 'sine';
    high.frequency.value = 860;
    const gLow = ctx.createGain();
    gLow.gain.value = 0;
    const gHigh = ctx.createGain();
    gHigh.gain.value = 0;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    low.connect(gLow);
    high.connect(gHigh);
    gLow.connect(gain);
    gHigh.connect(gain);
    gain.connect(master);
    low.start();
    high.start();
    return { low, high, gLow, gHigh, gain };
  }

  function buildHeli() {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = ctx.createGain();
    gain.gain.value = 0;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 15;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.05;
    lfo.connect(lfoDepth);
    lfoDepth.connect(gain.gain);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.value = 15;
    const thumpGain = ctx.createGain();
    thumpGain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    source.start();
    lfo.start();
    thump.start();
    return { source, filter, gain, lfo, thump, thumpGain };
  }

  function unlock() {
    if (unlocked) {
      if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return true;
    }
    const AudioCtor = typeof window !== 'undefined'
      ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AudioCtor) return false;
    try {
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      noise = noiseBuffer(ctx);
      engine = buildEngine();
      siren = buildSiren();
      heli = buildHeli();
      unlocked = true;
      if (ctx.resume) ctx.resume();
      applyMaster();
      setEngine(engineActive, engineRatio);
      setSiren(sirenActive);
      setHeli(heliState);
      return true;
    } catch (error) {
      ctx = null;
      master = null;
      unlocked = false;
      return false;
    }
  }

  /** `ratio` is 0..1 of the car's top speed; pitch and volume both rise with it. */
  function setEngine(active, ratio = 0) {
    engineActive = !!active;
    engineRatio = clamp(Number.isFinite(ratio) ? ratio : 0, 0, 1);
    if (!unlocked || !engine) return;
    const on = engineActive && !muted;
    ramp(engine.gain.gain, on ? 0.045 + engineRatio * 0.1 : 0, 0.08);
    ramp(engine.low.frequency, 44 + engineRatio * 145, 0.06);
    ramp(engine.high.frequency, 22 + engineRatio * 72, 0.06);
    ramp(engine.filter.frequency, 320 + engineRatio * 1250, 0.08);
  }

  function setSiren(active) {
    sirenActive = !!active;
    if (!unlocked || !siren) return;
    ramp(siren.gain.gain, sirenActive && !muted ? 0.14 : 0, 0.12);
  }

  /** police.js reports its helicopter state through setRotorAudioHook(). */
  function setHeli(state = {}) {
    heliState = state && typeof state === 'object' ? state : {};
    if (!unlocked || !heli) return;
    const active = !!(heliState.active && !muted);
    const rpm = Number.isFinite(heliState.rotorRpm) ? heliState.rotorRpm : 0;
    const thumpHz = clamp(rpm / 18, 9, 22);
    ramp(heli.gain.gain, active ? 0.075 : 0, 0.18);
    ramp(heli.thumpGain.gain, active ? 0.09 : 0, 0.18);
    ramp(heli.lfo.frequency, thumpHz, 0.18);
    ramp(heli.thump.frequency, thumpHz, 0.18);
    ramp(heli.filter.frequency, 180 + clamp(rpm, 0, 300) * 0.6, 0.18);
  }

  function burst(time, duration, peak, cutoff, filterType = 'bandpass') {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = cutoff;
    filter.Q.value = 1.0;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  function body(time, frequency, duration, peak) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.35), time + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function gunshot(opts = {}) {
    if (!unlocked || muted || !ctx) return;
    const t = ctx.currentTime;
    const distant = !!opts.distant;
    const heavy = /halilintar/i.test(String(opts.weapon || ''));
    const peak = distant ? 0.07 : heavy ? 0.34 : 0.24;
    burst(t, distant ? 0.2 : 0.085, peak, distant ? 680 : heavy ? 900 : 1500);
    if (!distant) {
      body(t, heavy ? 110 : 165, heavy ? 0.14 : 0.09, peak * 0.55);
      if (heavy) burst(t + 0.03, 0.16, 0.12, 420);
    }
  }

  function impact() {
    if (!unlocked || muted || !ctx) return;
    const t = ctx.currentTime;
    burst(t, 0.12, 0.16, 760);
    body(t, 90, 0.16, 0.2);
  }

  function setMuted(value) {
    muted = !!value;
    applyMaster();
    setEngine(engineActive, engineRatio);
    setSiren(sirenActive);
    setHeli(heliState);
  }

  /** Switch which of the two siren tones is loud; called once per rendered frame. */
  function update(dt = 0) {
    if (!unlocked || !siren || !sirenActive) return;
    sirenPhase += Math.max(0, dt) * 2.1;
    const first = Math.floor(sirenPhase) % 2 === 0;
    ramp(siren.gLow.gain, first ? 1 : 0, 0.03);
    ramp(siren.gHigh.gain, first ? 0 : 1, 0.03);
  }

  function getState() {
    return {
      unlocked, muted, engineActive, sirenActive,
      heliActive: !!(heliState && heliState.active),
    };
  }

  return {
    unlock, setEngine, setSiren, setHeli, gunshot, impact, setMuted, update, getState,
    dispose() {
      if (ctx && ctx.close) ctx.close();
      ctx = null;
      unlocked = false;
    },
  };
}
