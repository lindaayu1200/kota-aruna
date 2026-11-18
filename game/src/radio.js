// KOTA ARUNA — in-car radio.
//
// Three original stations, each with its own tempo, scale and procedural arrangement. Nothing is
// sampled: leads, bass lines, kicks, snares and hats are synthesised with WebAudio oscillators and
// a shared noise buffer. A short two-tone station ident plays whenever the dial changes.
//
// AudioContext is created only in unlock(), which main.js calls from the MULAI button gesture.
// R (handled in main.js) walks OFF → station 1 → station 2 → station 3 → OFF; [ and ] step the dial
// directly. The radio is audible only while Ara is in a car and the game is not paused.

export const STATIONS = [
  {
    id: 'senja', freq: '87.6', name: 'SENJA FM', tag: 'Chill synth untuk senja',
    bpm: 88, root: 220, scale: [0, 3, 5, 7, 10], wave: 'sine', drums: 'soft',
    pattern: [0, null, 2, null, 4, null, 2, 1, 0, null, 3, null, 4, null, 2, null],
    bassSteps: [0, 4, 8, 12], color: '#55e6ff',
  },
  {
    id: 'aruna', freq: '91.2', name: 'ARUNA WAVE', tag: 'Upbeat pesisir',
    bpm: 124, root: 261.63, scale: [0, 2, 4, 7, 9], wave: 'triangle', drums: 'four',
    pattern: [0, 2, 4, 2, 3, 4, 2, 1, 0, 2, 4, 5, 4, 2, 3, 1],
    bassSteps: [0, 3, 6, 8, 11, 14], color: '#ffc857',
  },
  {
    id: 'pasir', freq: '104.7', name: 'PASIR HITS', tag: 'Drum & bass kota malam',
    bpm: 174, root: 196, scale: [0, 1, 3, 5, 7, 10], wave: 'sawtooth', drums: 'dnb',
    pattern: [0, null, 4, 3, 2, null, 5, 4, 0, 3, 4, null, 5, 4, 2, null],
    bassSteps: [0, 2, 5, 7, 10, 12, 14], color: '#ff5fa2',
  },
];

function makeNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.7), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x5a17c0de;
  for (let i = 0; i < data.length; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = (seed / 2147483648) - 1;
  }
  return buffer;
}

function hz(root, scale, degree, octave = 1) {
  const step = scale[((degree % scale.length) + scale.length) % scale.length];
  return root * Math.pow(2, step / 12) * octave;
}

function tone(ctx, dest, frequency, time, duration, type, peak, options = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, frequency), time);
  if (options.detune) osc.detune.setValueAtTime(options.detune, time);
  if (options.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.glide), time + duration * 0.8);
  let tail = osc;
  if (options.cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(options.cutoff, time);
    osc.connect(filter);
    tail = filter;
  }
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + Math.min(0.02, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  tail.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration + 0.03);
}

function noiseHit(ctx, dest, buffer, time, duration, peak, cutoff, type = 'bandpass') {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(cutoff, time);
  filter.Q.value = type === 'bandpass' ? 1.1 : 0.6;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(Math.max(0.0002, peak), time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
  src.stop(time + duration + 0.02);
}

function kick(ctx, dest, time, peak = 0.3) {
  tone(ctx, dest, 128, time, 0.16, 'sine', peak, { glide: 44 });
}

function snare(ctx, dest, buffer, time, peak = 0.16) {
  noiseHit(ctx, dest, buffer, time, 0.13, peak, 1700, 'bandpass');
  tone(ctx, dest, 190, time, 0.07, 'triangle', peak * 0.35, { glide: 120 });
}

function hat(ctx, dest, buffer, time, peak = 0.05) {
  noiseHit(ctx, dest, buffer, time, 0.035, peak, 7200, 'highpass');
}

/** The DJ bumper: two bright beeps and a small burst of filtered static. */
function stationIdent(ctx, dest, buffer, time, station) {
  noiseHit(ctx, dest, buffer, time, 0.12, 0.035, 2600, 'bandpass');
  tone(ctx, dest, 1046.5, time + 0.05, 0.1, 'square', 0.05, { cutoff: 3200 });
  tone(ctx, dest, 1568, time + 0.18, 0.14, 'square', 0.05, { cutoff: 3600 });
  tone(ctx, dest, hz(station.root, station.scale, 0, 2), time + 0.34, 0.24, station.wave, 0.045, { cutoff: 2600 });
}

/** One sixteenth-note slot of a station's arrangement. */
function playStep(ctx, dest, buffer, station, step, time) {
  const s = step % 16;
  const degree = station.pattern[s];
  if (degree !== null && degree !== undefined) {
    const octave = station.id === 'pasir' && s % 4 === 0 ? 2 : 1;
    const leadHz = hz(station.root, station.scale, degree, octave);
    const leadDur = station.id === 'senja' ? 0.46 : station.id === 'aruna' ? 0.15 : 0.1;
    tone(ctx, dest, leadHz, time, leadDur, station.wave,
      station.id === 'senja' ? 0.055 : 0.07,
      { cutoff: station.id === 'pasir' ? 2600 : 3400, detune: station.id === 'senja' ? 7 : 0 });
    if (station.id === 'senja') tone(ctx, dest, leadHz * 2, time + 0.02, 0.38, 'sine', 0.022);
    if (station.id === 'pasir' && s % 4 === 0) tone(ctx, dest, leadHz * 0.5, time, 0.12, 'square', 0.028, { cutoff: 1400 });
  }

  if (station.bassSteps.includes(s)) {
    const bassDegree = station.id === 'aruna' ? (s === 8 ? 4 : s === 14 ? 3 : 0)
      : station.id === 'pasir' ? (s % 4 === 2 ? 3 : 0) : (s === 8 ? 2 : 0);
    const bassHz = hz(station.root, station.scale, bassDegree, 0.25);
    tone(ctx, dest, bassHz, time, station.id === 'senja' ? 0.4 : 0.14,
      station.id === 'senja' ? 'sine' : 'triangle', station.id === 'pasir' ? 0.17 : 0.11,
      { cutoff: station.id === 'pasir' ? 520 : 700 });
  }

  if (station.drums === 'soft') {
    if (s === 0 || s === 8) kick(ctx, dest, time, 0.14);
    if (s === 4 || s === 12) snare(ctx, dest, buffer, time, 0.055);
    if (s % 4 === 2) hat(ctx, dest, buffer, time, 0.018);
  } else if (station.drums === 'four') {
    if (s % 4 === 0) kick(ctx, dest, time, 0.26);
    if (s === 4 || s === 12) snare(ctx, dest, buffer, time, 0.14);
    if (s % 2 === 0) hat(ctx, dest, buffer, time, s % 4 === 2 ? 0.045 : 0.022);
  } else {
    if (s === 0 || s === 6 || s === 10) kick(ctx, dest, time, 0.3);
    if (s === 4 || s === 12) snare(ctx, dest, buffer, time, 0.2);
    hat(ctx, dest, buffer, time, s % 4 === 2 ? 0.06 : 0.028);
    if (s === 7 || s === 15) snare(ctx, dest, buffer, time, 0.05);
  }
}

export function createRadio(options = {}) {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let unlocked = false;
  let inVehicle = false;
  let muted = false;
  let on = false;
  let index = 0;
  let timer = null;
  let nextTime = 0;
  let stepCounter = 0;
  const stationViews = STATIONS.map((station) => ({ ...station }));
  const stateOut = {
    on: false, inVehicle: false, muted: false, unlocked: false, playing: false,
    index: 0, station: stationViews[0], freq: STATIONS[0].freq,
    name: STATIONS[0].name, tag: STATIONS[0].tag, label: '', stations: stationViews,
  };

  function audible() {
    return unlocked && inVehicle && !muted && on && !!ctx;
  }

  function applyGain() {
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(audible() ? 0.55 : 0, ctx.currentTime, 0.07);
  }

  function schedule() {
    if (!audible()) return;
    const station = STATIONS[index];
    const stepDuration = 60 / station.bpm / 4;
    let guard = 0;
    while (nextTime < ctx.currentTime + 0.2 && guard < 16) {
      playStep(ctx, master, noiseBuffer, station, stepCounter, nextTime);
      nextTime += stepDuration;
      stepCounter = (stepCounter + 1) % 16;
      guard += 1;
    }
  }

  function stopPlayback() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startPlayback() {
    stopPlayback();
    if (!audible()) return;
    const station = STATIONS[index];
    stepCounter = 0;
    nextTime = ctx.currentTime + 0.06;
    stationIdent(ctx, master, noiseBuffer, nextTime, station);
    nextTime += 0.42;
    schedule();
    timer = setInterval(schedule, 40);
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
      noiseBuffer = makeNoiseBuffer(ctx);
      unlocked = true;
      if (ctx.resume) ctx.resume();
      applyGain();
      if (audible()) startPlayback();
      return true;
    } catch (error) {
      ctx = null;
      master = null;
      unlocked = false;
      return false;
    }
  }

  function setInVehicle(value) {
    const next = !!value;
    if (next === inVehicle) return;
    inVehicle = next;
    if (!inVehicle) stopPlayback();
    else if (on && !muted) startPlayback();
    applyGain();
  }

  function setMuted(value) {
    const next = !!value;
    if (next === muted) return;
    muted = next;
    if (muted) stopPlayback();
    else if (inVehicle && on) startPlayback();
    applyGain();
  }

  /** R in a car: switch on, then walk the dial, then switch off again. */
  function pressR() {
    if (!inVehicle || muted) return false;
    if (!on) {
      on = true;
      startPlayback();
    } else if (index < STATIONS.length - 1) {
      index += 1;
      startPlayback();
    } else {
      on = false;
      stopPlayback();
    }
    applyGain();
    return true;
  }

  function cycle(direction = 1) {
    if (!inVehicle || muted) return false;
    if (!on) {
      on = true;
    } else {
      index = (index + (direction >= 0 ? 1 : STATIONS.length - 1)) % STATIONS.length;
    }
    startPlayback();
    applyGain();
    return true;
  }

  function setStation(number) {
    const next = ((Math.round(finiteNumber(number)) % STATIONS.length) + STATIONS.length) % STATIONS.length;
    if (!on || index !== next) {
      on = true;
      index = next;
      if (inVehicle) startPlayback();
    }
    applyGain();
  }

  function finiteNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function toggle() {
    if (!inVehicle || muted) return false;
    on = !on;
    if (on) startPlayback();
    else stopPlayback();
    applyGain();
    return true;
  }

  function stop() {
    on = false;
    stopPlayback();
    applyGain();
  }

  /** One reusable snapshot; the HUD reads it in the same frame it asks for it. */
  function getState() {
    const station = STATIONS[index];
    const playing = audible();
    stateOut.on = on;
    stateOut.inVehicle = inVehicle;
    stateOut.muted = muted;
    stateOut.unlocked = unlocked;
    stateOut.playing = playing;
    stateOut.index = index;
    stateOut.station = stationViews[index];
    stateOut.freq = station.freq;
    stateOut.name = station.name;
    stateOut.tag = station.tag;
    stateOut.label = playing ? `♪ ${station.freq}  ${station.name}` : `×  RADIO ${on ? 'STANDBY' : 'OFF'}`;
    return stateOut;
  }

  // [ and ] are dialect controls, kept inside the radio so main.js only owns the R edge.
  function onKeyDown(event) {
    if (event.code !== 'BracketLeft' && event.code !== 'BracketRight') return;
    if (!inVehicle || muted || event.repeat) return;
    event.preventDefault();
    cycle(event.code === 'BracketRight' ? 1 : -1);
  }
  if (typeof window !== 'undefined') window.addEventListener('keydown', onKeyDown);

  return {
    unlock, setInVehicle, setMuted, pressR, cycle, next: () => cycle(1), prev: () => cycle(-1),
    setStation, toggle, stop, getState, STATIONS,
    get name() { return `${STATIONS[index].freq} ${STATIONS[index].name}`; },
    get on() { return on; },
    dispose() {
      stop();
      if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown);
      if (ctx && ctx.close) ctx.close();
    },
  };
}
