// Game runtime for KOTA ARUNA: vehicles, missions, combat, wanted level,
// radio, HUD and the two-district open world. No build step, no network.

import * as THREE from 'three';
import {
  CREW,
  DISTRICTS,
  FIXED_STEP,
  LAYOUT,
  MISSIONS,
  PALETTE,
  RADIO,
  START_MONEY,
  TITLE,
  WANTED,
  WEAPONS,
} from './config.js';
import { buildCity } from './city.js';
import { makeRandom } from './random.js';

const TAU = Math.PI * 2;
const query = new URLSearchParams(window.location.search);
const requestedSeed = Number.parseInt(query.get('seed') ?? '1337', 10);
const seed = Number.isFinite(requestedSeed) ? requestedSeed : 1337;
const photoMode = query.get('shot') ?? '';
const decorativeRandom = makeRandom(seed + 811);

const element = (id) => document.getElementById(id);
const canvas = element('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor('#241a3e', 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.4,
  4600,
);
const city = buildCity(THREE, seed);

const ui = {
  start: element('start'),
  startButton: element('start-button'),
  missionNumber: element('mission-number'),
  missionTitle: element('mission-title'),
  missionBrief: element('mission-brief'),
  missionObjective: element('mission-objective'),
  missionReward: element('mission-reward'),
  district: element('district-name'),
  districtTag: element('district-tag'),
  money: element('money-value'),
  wantedName: element('wanted-name'),
  stars: Array.from(document.querySelectorAll('.star')),
  speaker: element('speaker-name'),
  dialogue: element('dialogue-line'),
  dialogueBox: element('dialogue'),
  prompt: element('prompt'),
  toast: element('toast'),
  health: element('health-fill'),
  armor: element('armor-fill'),
  slots: Array.from(document.querySelectorAll('[data-slot]')),
  radioName: element('radio-name'),
  radioFreq: element('radio-freq'),
  radioTag: element('radio-tag'),
  radioState: element('radio-state'),
  vehicle: element('vehicle-label'),
  speedText: element('speed-value'),
  map: element('minimap'),
  speedo: element('speedo'),
};
const mapCtx = ui.map.getContext('2d');
const speedCtx = ui.speedo.getContext('2d');

const state = {
  mode: 'foot',
  x: 238,
  z: 86,
  y: 0,
  heading: -0.5,
  speed: 0,
  verticalSpeed: 0,
  lift: 0,
  pitch: 0,
  roll: 0,
  rotor: 0,
  money: START_MONEY,
  wanted: 0,
  heatTime: 0,
  crimeTime: -999,
  health: 100,
  armor: 50,
  weapon: 1,
  ammo: WEAPONS.map((weapon) => weapon.capacity),
  fireCooldown: 0,
  radio: 0,
  radioOn: false,
  mission: 0,
  missionDone: false,
  searchlight: false,
  time: 0,
  running: Boolean(photoMode),
  paused: false,
  toastUntil: 0,
  dialogueUntil: 0,
  cameraTarget: new THREE.Vector3(210, 4, 70),
  cameraPosition: new THREE.Vector3(260, 24, 130),
  cinematic: null,
};

// ------------------------------------------------------------- character art
function makePerson(color, withLabel) {
  const figure = new THREE.Group();
  const shirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.78, 1.9, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75 }),
  );
  shirt.position.y = 1.6;
  figure.add(shirt);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#e8b98e', roughness: 0.9 }),
  );
  head.position.y = 3;
  figure.add(head);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.35, 0.4),
      new THREE.MeshStandardMaterial({ color: '#202235', roughness: 0.9 }),
    );
    leg.position.set(side * 0.33, 0.68, 0);
    figure.add(leg);
  }
  if (withLabel) {
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({
      map: withLabel.texture,
      transparent: true,
      depthTest: false,
      toneMapped: false,
    }));
    badge.position.y = 4.6;
    badge.scale.set(17, 4.4, 1);
    figure.add(badge);
  }
  return figure;
}

function nameTexture(text, color) {
  const plate = document.createElement('canvas');
  plate.width = 320;
  plate.height = 80;
  const brush = plate.getContext('2d');
  brush.fillStyle = 'rgba(16,12,28,0.72)';
  brush.fillRect(0, 0, 320, 80);
  brush.strokeStyle = color;
  brush.lineWidth = 4;
  brush.strokeRect(3, 3, 314, 74);
  brush.fillStyle = '#fff2d8';
  brush.font = 'bold 38px sans-serif';
  brush.textAlign = 'center';
  brush.textBaseline = 'middle';
  brush.fillText(text, 160, 42);
  const texture = new THREE.CanvasTexture(plate);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture };
}

function makeCar(paint, police = false) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.05, 5.1),
    new THREE.MeshStandardMaterial({ color: paint, roughness: 0.38, metalness: 0.45 }),
  );
  body.position.y = 1.1;
  car.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.85, 2.4),
    new THREE.MeshStandardMaterial({ color: police ? '#172238' : PALETTE.glass, roughness: 0.25, metalness: 0.35 }),
  );
  cabin.position.set(0, 1.95, -0.25);
  car.add(cabin);
  const wheelShape = new THREE.CylinderGeometry(0.58, 0.58, 0.38, 14);
  wheelShape.rotateZ(Math.PI / 2);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#12131b', roughness: 0.95 });
  for (const side of [-1, 1]) {
    for (const depth of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(wheelShape, wheelMaterial);
      wheel.position.set(side * 1.28, 0.62, depth);
      car.add(wheel);
    }
  }
  const lampMaterial = new THREE.MeshBasicMaterial({ color: '#ffe7b8', toneMapped: false });
  const tailMaterial = new THREE.MeshBasicMaterial({ color: '#ff4b5d', toneMapped: false });
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.14), lampMaterial);
    lamp.position.set(side * 0.78, 1.2, 2.58);
    car.add(lamp);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.14), tailMaterial);
    tail.position.set(side * 0.78, 1.2, -2.58);
    car.add(tail);
  }
  if (police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.22, 0.45),
      new THREE.MeshBasicMaterial({ color: '#5cc8ff', toneMapped: false }),
    );
    bar.position.set(0, 2.55, -0.2);
    car.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.22, 0.45),
      new THREE.MeshBasicMaterial({ color: '#ff4d6d', toneMapped: false }),
    );
    red.position.set(0.02, 2.55, 0.3);
    car.add(red);
  }
  return car;
}

function makeHelicopter() {
  const craft = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: '#e8e3dc', roughness: 0.5, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1d2230', roughness: 0.5, metalness: 0.3 });

  const hull = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 14), shell);
  hull.scale.set(1.05, 0.85, 2);
  hull.position.y = 2.1;
  craft.add(hull);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, 16, 12),
    new THREE.MeshStandardMaterial({ color: PALETTE.glass, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.86 }),
  );
  glass.scale.set(1, 0.8, 1.05);
  glass.position.set(0, 2.25, 2.05);
  craft.add(glass);

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 6.5), shell);
  boom.position.set(0, 2.35, -5.1);
  craft.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 1.5), shell);
  fin.position.set(0, 3.3, -8);
  craft.add(fin);

  const rotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 12), dark);
  rotorHub.position.y = 4.1;
  craft.add(rotorHub);
  const mainRotor = new THREE.Group();
  mainRotor.position.y = 4.45;
  for (let index = 0; index < 4; index += 1) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: '#2b2d39', roughness: 0.7, metalness: 0.4 }),
    );
    blade.rotation.y = (index / 4) * TAU;
    blade.position.set(Math.sin((index / 4) * TAU) * 6, 0, Math.cos((index / 4) * TAU) * 6);
    mainRotor.add(blade);
  }
  craft.add(mainRotor);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.5, 3.3, -8.3);
  for (let index = 0; index < 2; index += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.7, 0.35), dark);
    blade.rotation.z = index * Math.PI / 2;
    tailRotor.add(blade);
  }
  craft.add(tailRotor);

  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.4, 8), dark);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * 1.7, 0.2, 0);
    craft.add(skid);
    for (const depth of [-1.8, 1.8]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8), dark);
      strut.position.set(side * 1.45, 0.9, depth);
      craft.add(strut);
    }
  }
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(4.7, 0.12, 0.7),
    new THREE.MeshBasicMaterial({ color: PALETTE.neonPink, toneMapped: false }),
  );
  stripe.position.set(0, 1.35, 0.5);
  craft.add(stripe);
  return { craft, mainRotor, tailRotor };
}

const footModel = makePerson('#ffd68f', null);
city.scene.add(footModel);

const carModel = makeCar('#ff6f91');
carModel.position.set(246, 0, 98);
carModel.rotation.y = -0.5;
city.scene.add(carModel);

const helicopter = makeHelicopter();
helicopter.craft.visible = false;
city.scene.add(helicopter.craft);

const spotTarget = new THREE.Object3D();
city.scene.add(spotTarget);
const searchLight = new THREE.SpotLight('#fff1c9', 0, 260, Math.PI / 8, 0.42, 1.1);
searchLight.target = spotTarget;
city.scene.add(searchLight);

const coneShape = new THREE.ConeGeometry(20, 90, 20, 1, true);
coneShape.translate(0, -45, 0);
const lightCone = new THREE.Mesh(
  coneShape,
  new THREE.MeshBasicMaterial({
    color: '#ffe8b6',
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
);
lightCone.visible = false;
city.scene.add(lightCone);

const crewFigures = new Map();
CREW.forEach((member, index) => {
  const anchor = MISSIONS[index].marker;
  const figure = makePerson(member.color, nameTexture(member.name.toUpperCase(), member.color));
  figure.position.set(anchor.x + 9, 0, anchor.z + 7);
  figure.rotation.y = index;
  city.scene.add(figure);
  crewFigures.set(member.id, figure);
});

const walkers = [];
for (let index = 0; index < 18; index += 1) {
  const person = makePerson(decorativeRandom.choose(['#d7a4c8', '#8bd0d6', '#e3c78b', '#b6a4dc']), null);
  const x = decorativeRandom.between(-200, 380);
  const z = decorativeRandom.between(-360, 360);
  person.position.set(x, 0, z);
  city.scene.add(person);
  walkers.push({ mesh: person, x, z, heading: decorativeRandom.between(0, TAU), speed: decorativeRandom.between(0.8, 2.1) });
}

const police = [];
const effects = [];

const marker = new THREE.Group();
const markerRing = new THREE.Mesh(
  new THREE.TorusGeometry(9.5, 0.7, 10, 48),
  new THREE.MeshBasicMaterial({ color: PALETTE.neonBlue, toneMapped: false }),
);
markerRing.rotation.x = -Math.PI / 2;
markerRing.position.y = 0.8;
marker.add(markerRing);
const markerColumn = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 5.5, 105, 14, 1, true),
  new THREE.MeshBasicMaterial({
    color: PALETTE.neonBlue,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
);
markerColumn.position.y = 52;
marker.add(markerColumn);
city.scene.add(marker);

// ------------------------------------------------------------------- helpers
function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function distanceTo(x, z, point) {
  return Math.hypot(x - point.x, z - point.z);
}

function mission() {
  return MISSIONS[Math.min(state.mission, MISSIONS.length - 1)];
}

function crewName(id) {
  const member = CREW.find((person) => person.id === id);
  return member ? member.name : 'Ara';
}

function toast(text, seconds = 3) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  state.toastUntil = state.time + seconds;
}

function dialogue(person, line, seconds = 6) {
  ui.speaker.textContent = person.toUpperCase();
  ui.dialogue.textContent = line;
  ui.dialogueBox.classList.add('show');
  state.dialogueUntil = state.time + seconds;
}

function refreshMission() {
  const current = mission();
  ui.missionNumber.textContent = `MISSI ${current.number} / 07`;
  ui.missionTitle.textContent = current.title;
  ui.missionBrief.textContent = current.brief;
  ui.missionObjective.textContent = current.objective;
  ui.missionReward.textContent = `$${current.payout.toLocaleString('en-US')}`;
  marker.position.set(current.marker.x, 0, current.marker.z);
  if (state.mission === MISSIONS.length - 1) {
    dialogue('Sinta', current.dialogue, 9);
  }
}

function addWanted(amount, quiet = false) {
  state.wanted = clamp(state.wanted + amount, 0, 5);
  state.heatTime = 0;
  state.crimeTime = state.time;
  if (!quiet && amount > 0) {
    toast(`PERHATIAN POLISI — ${WANTED[state.wanted].name}`, 2.5);
  }
}

function obstructed(x, z, radius = 2) {
  if (city.overWater(x, z) && !city.isRoad(x, z)) return true;
  for (const box of city.solid) {
    if (Math.abs(x - box.x) < box.halfX + radius && Math.abs(z - box.z) < box.halfZ + radius) {
      return true;
    }
  }
  return false;
}

function moveWithCollision(x, z, nextX, nextZ, radius) {
  if (!obstructed(nextX, nextZ, radius)) return { x: nextX, z: nextZ, hit: false };
  if (!obstructed(nextX, z, radius)) return { x: nextX, z, hit: true };
  if (!obstructed(x, nextZ, radius)) return { x, z: nextZ, hit: true };
  return { x, z, hit: true };
}

// --------------------------------------------------------------------- radio
let audio = null;

function createTone(context, output, frequency, length, volume, kind, when) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = kind;
  oscillator.frequency.setValueAtTime(frequency, when);
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(volume, when + 0.014);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(when);
  oscillator.stop(when + length + 0.03);
}

function bootRadio() {
  if (audio) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  try {
    const context = new AudioEngine();
    const master = context.createGain();
    master.gain.value = 0.09;
    master.connect(context.destination);
    audio = { context, master, tick: 0 };
    window.setInterval(playRadioBeat, 150);
  } catch {
    audio = null;
  }
}

function playRadioBeat() {
  if (!audio || !state.radioOn || state.paused) return;
  const context = audio.context;
  if (context.state === 'suspended') return;
  const station = RADIO[state.radio];
  const beat = 60 / station.bpm;
  const when = context.currentTime + 0.03;
  const step = audio.tick % 16;
  const scale = [0, 3, 5, 7, 10, 12, 15];
  const root = station.root;

  if (step % 4 === 0) createTone(context, audio.master, 58, beat * 0.55, 0.65, 'sine', when);
  if (step % 8 === 4) createTone(context, audio.master, 145, beat * 0.35, 0.22, 'triangle', when);
  if (step % 2 === 0) createTone(context, audio.master, 3400, beat * 0.08, 0.06, 'square', when);
  const bassNote = root / 2 * Math.pow(2, scale[step % scale.length] / 12);
  createTone(context, audio.master, bassNote, beat * 0.8, 0.2, 'sawtooth', when);
  if (step === 2 || step === 6 || step === 11) {
    const lead = root * Math.pow(2, scale[(step + state.radio) % scale.length] / 12);
    createTone(context, audio.master, lead, beat * 1.1, 0.12, 'triangle', when);
  }
  audio.tick += 1;
}

function updateRadioLabel() {
  const station = RADIO[state.radio];
  ui.radioName.textContent = station.name;
  ui.radioFreq.textContent = `${station.freq} FM`;
  ui.radioTag.textContent = station.tag;
  ui.radioState.textContent = state.radioOn ? '● ON AIR' : '○ OFF';
}

// -------------------------------------------------------------------- combat
function spawnTracer(from, to, color = '#ffe2a4') {
  const geometry = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false }),
  );
  city.scene.add(line);
  effects.push({ mesh: line, life: 0.14, total: 0.14, kind: 'tracer' });
}

function spawnBurst(position, color = '#ffb060', size = 3) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(size, 10, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  flash.position.copy(position);
  city.scene.add(flash);
  effects.push({ mesh: flash, life: 0.35, total: 0.35, kind: 'burst' });
}

function fireWeapon() {
  if (!state.running || state.fireCooldown > 0) return;
  const weapon = WEAPONS[state.weapon];
  if (state.ammo[state.weapon] <= 0) {
    toast('AMMO HABIS — TEKAN 1-4 UNTUK GANTI SENJATA', 2);
    return;
  }
  state.fireCooldown = weapon.rate;
  if (state.ammo[state.weapon] !== Infinity) state.ammo[state.weapon] -= 1;

  const origin = new THREE.Vector3(
    state.x + Math.sin(state.heading) * 2,
    state.mode === 'heli' ? state.y + 1.8 : 2.2,
    state.z + Math.cos(state.heading) * 2,
  );
  const direction = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  const target = origin.clone().addScaledVector(direction, weapon.id === 'fists' ? 5 : 95);

  let struck = null;
  let struckDistance = Infinity;
  const targets = [
    ...walkers.map((walker) => walker.mesh),
    ...police.map((unit) => unit.mesh),
  ];
  for (const candidate of targets) {
    const offset = candidate.position.clone().sub(origin);
    const along = offset.dot(direction);
    if (along < 0 || along > (weapon.id === 'fists' ? 5 : 90)) continue;
    const sideways = offset.clone().addScaledVector(direction, -along).length();
    const isPoliceUnit = police.some((entry) => entry.mesh === candidate);
    if (sideways < (isPoliceUnit ? 4 : 2.4) && along < struckDistance) {
      struck = candidate;
      struckDistance = along;
    }
  }
  if (struck) {
    target.copy(struck.position);
    target.y += 1.4;
    spawnBurst(target.clone(), '#ff7b7b', 1.6);
    if (police.some((unit) => unit.mesh === struck)) {
      const unit = police.find((entry) => entry.mesh === struck);
      unit.health -= weapon.damage;
      if (unit.health <= 0) {
        city.scene.remove(unit.mesh);
        police.splice(police.indexOf(unit), 1);
        state.money += 220;
        toast('+$220 — MOBIL POLISI DINONAKTIFKAN', 2);
      }
    } else {
      const walker = walkers.find((entry) => entry.mesh === struck);
      if (walker) {
        walker.mesh.visible = false;
        addWanted(2);
      }
    }
  }
  spawnTracer(origin, target, weapon.id === 'launcher' ? '#ff8ef0' : '#ffe2a4');
  spawnBurst(origin, '#fff0bd', 1.1);
  addWanted(1);
}

// -------------------------------------------------------------- police waves
function spawnPolice() {
  const angle = decorativeRandom.between(0, TAU);
  const radius = decorativeRandom.between(110, 175);
  const x = clamp(state.x + Math.cos(angle) * radius, -290, 450);
  const z = clamp(state.z + Math.sin(angle) * radius, -430, 430);
  const mesh = makeCar('#e8edf5', true);
  mesh.position.set(x, 0, z);
  city.scene.add(mesh);
  police.push({ mesh, x, z, heading: decorativeRandom.between(0, TAU), speed: 0, health: 100 });
}

function updatePolice(delta) {
  const desired = state.wanted * 2;
  if (police.length < desired && state.time - state.crimeTime > 2) {
    if (Math.floor(state.time * 2) % 2 === 0) spawnPolice();
  }
  for (const unit of police) {
    const dx = state.x - unit.x;
    const dz = state.z - unit.z;
    const wantedHeading = Math.atan2(dx, dz);
    let turn = wantedHeading - unit.heading;
    while (turn > Math.PI) turn -= TAU;
    while (turn < -Math.PI) turn += TAU;
    unit.heading += clamp(turn, -1.9 * delta, 1.9 * delta);
    unit.speed = Math.min(34, unit.speed + 17 * delta);
    const nextX = unit.x + Math.sin(unit.heading) * unit.speed * delta;
    const nextZ = unit.z + Math.cos(unit.heading) * unit.speed * delta;
    const result = moveWithCollision(unit.x, unit.z, nextX, nextZ, 2.2);
    unit.x = result.x;
    unit.z = result.z;
    unit.mesh.position.set(unit.x, 0, unit.z);
    unit.mesh.rotation.y = unit.heading;
    if (Math.hypot(dx, dz) < 6 && state.mode !== 'heli') {
      state.health = Math.max(0, state.health - 9 * delta);
      addWanted(1, true);
    }
  }
}

function updateEffects(delta) {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    effect.life -= delta;
    if (effect.kind === 'burst') {
      effect.mesh.scale.setScalar(1 + (1 - effect.life / effect.total) * 2.4);
      effect.mesh.material.opacity = Math.max(0, effect.life / effect.total) * 0.8;
    } else {
      effect.mesh.material.opacity = Math.max(0, effect.life / effect.total);
    }
    if (effect.life <= 0) {
      city.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      effects.splice(index, 1);
    }
  }
}

// --------------------------------------------------------------- player step
function updateFoot(delta) {
  const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const magnitude = Math.hypot(forward, strafe) || 1;
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 13 : 7.5;
  const moveX = (Math.sin(state.heading) * forward + Math.cos(state.heading) * strafe) / magnitude;
  const moveZ = (Math.cos(state.heading) * forward - Math.sin(state.heading) * strafe) / magnitude;
  if (forward !== 0 || strafe !== 0) {
    state.heading = Math.atan2(moveX, moveZ);
    const result = moveWithCollision(
      state.x,
      state.z,
      state.x + moveX * speed * delta,
      state.z + moveZ * speed * delta,
      1.4,
    );
    state.x = result.x;
    state.z = result.z;
    if (result.hit) state.speed *= 0.4;
  }
  state.speed = forward !== 0 || strafe !== 0 ? speed : 0;
  footModel.visible = true;
  footModel.position.set(state.x, 0, state.z);
  footModel.rotation.y = state.heading;
}

function updateCar(delta) {
  const throttle = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const steering = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const offRoad = !city.isRoad(state.x, state.z);
  const topSpeed = offRoad ? 24 : 54;
  if (throttle > 0) state.speed += (offRoad ? 15 : 27) * delta;
  else if (throttle < 0) state.speed -= 38 * delta;
  else state.speed *= 1 - 1.1 * delta;
  if (keys.has('Space')) state.speed *= 1 - 2.5 * delta;
  state.speed = clamp(state.speed, -12, topSpeed);

  const grip = keys.has('Space') ? 2.2 : 1;
  state.heading += steering * grip * (0.55 + Math.min(1.3, Math.abs(state.speed) / 22)) * delta * (state.speed < -0.5 ? -1 : 1);
  const nextX = state.x + Math.sin(state.heading) * state.speed * delta;
  const nextZ = state.z + Math.cos(state.heading) * state.speed * delta;
  const result = moveWithCollision(state.x, state.z, nextX, nextZ, 2.4);
  if (result.hit && Math.abs(state.speed) > 14) {
    state.speed *= -0.24;
    addWanted(1, true);
    toast('TABRAKAN — BADAN MOBIL RUSAK', 1.6);
    state.health = Math.max(0, state.health - 3);
  }
  state.x = result.x;
  state.z = result.z;
  carModel.position.set(state.x, 0, state.z);
  carModel.rotation.y = state.heading;
  carModel.rotation.z = -steering * Math.min(0.07, Math.abs(state.speed) * 0.0018);
}

function updateHeli(delta) {
  const ahead = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const turn = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const climb = (keys.has('Space') ? 1 : 0) - (keys.has('KeyC') || keys.has('ControlLeft') ? 1 : 0);

  state.heading += turn * 1.35 * delta;
  state.speed = clamp(state.speed + ahead * 26 * delta - state.speed * 0.65 * delta, -18, 72);
  state.lift = clamp(state.lift + climb * 22 * delta - state.lift * 1.4 * delta, -24, 26);
  state.y = clamp(state.y + state.lift * delta, 9, 240);
  state.x = clamp(state.x + Math.sin(state.heading) * state.speed * delta, -560, 500);
  state.z = clamp(state.z + Math.cos(state.heading) * state.speed * delta, -500, 500);
  state.rotor += delta * (26 + Math.abs(state.speed) * 0.15);
  state.pitch += (-ahead * 0.13 - state.pitch) * Math.min(1, delta * 4);
  state.roll += (turn * 0.18 - state.roll) * Math.min(1, delta * 4);

  helicopter.craft.position.set(state.x, state.y, state.z);
  helicopter.craft.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
  helicopter.mainRotor.rotation.y = state.rotor;
  helicopter.tailRotor.rotation.x = state.rotor * 2.4;

  const facing = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  const beamTarget = new THREE.Vector3(state.x, Math.max(1, state.y - 45), state.z)
    .addScaledVector(facing, 34);
  spotTarget.position.copy(beamTarget);
  spotTarget.updateMatrixWorld();
  searchLight.position.set(state.x, state.y + 1.5, state.z);
  const beamVector = beamTarget.clone().sub(searchLight.position).normalize();
  lightCone.position.copy(searchLight.position);
  lightCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamVector);
}

function updateWalkers(delta) {
  for (const walker of walkers) {
    if (!walker.mesh.visible) continue;
    walker.heading += Math.sin(state.time * 0.7 + walker.x) * 0.4 * delta;
    const stepX = Math.sin(walker.heading) * walker.speed * delta;
    const stepZ = Math.cos(walker.heading) * walker.speed * delta;
    const result = moveWithCollision(walker.x, walker.z, walker.x + stepX, walker.z + stepZ, 1);
    if (result.hit) walker.heading += Math.PI * 0.6;
    walker.x = result.x;
    walker.z = result.z;
    walker.mesh.position.set(walker.x, 0, walker.z);
    walker.mesh.rotation.y = walker.heading;
  }
}

function completeMission() {
  if (state.missionDone || state.mission >= MISSIONS.length) return;
  const current = mission();
  state.money += current.payout;
  toast(`MISSI SELESAI  +$${current.payout.toLocaleString('en-US')}`, 4);
  if (current.id === 'm4') state.searchlight = false;
  if (current.id === 'm5' || current.id === 'm6') addWanted(2);
  state.mission += 1;
  if (state.mission >= MISSIONS.length) {
    state.missionDone = true;
    marker.visible = false;
    ui.missionNumber.textContent = 'SELESAI / 07';
    ui.missionTitle.textContent = 'PASANG SURUT';
    ui.missionObjective.textContent = 'Kota Aruna selamat — kru masih utuh';
    ui.missionReward.textContent = '$0';
    dialogue('Ara', 'Pasang surut. Air balik, kita juga. Terima kasih, kru.', 12);
  } else {
    refreshMission();
    dialogue(crewName(current.crew), current.rewardLine, 6);
  }
}

function tryMissionAction() {
  const current = mission();
  if (!current || state.missionDone) return;
  const range = state.mode === 'heli' ? 48 : state.mode === 'car' ? 24 : 17;
  if (distanceTo(state.x, state.z, current.marker) > range) {
    toast('DEKATI TITIK MISSI DULU', 2);
    return;
  }
  if (current.id === 'm4' && state.mode !== 'heli') {
    toast('MISSI INI BUTUH HELIKOPTER — TEKAN H', 3);
    return;
  }
  completeMission();
}

function enterVehicle(kind) {
  if (kind === 'heli') {
    const nearPad = distanceTo(state.x, state.z, LAYOUT.helipad) < 68;
    if (!nearPad && state.mission < 3) {
      toast('HELIKOPTER HANYA DI HELIPAD TELUK ARUNA', 2.5);
      return;
    }
    state.mode = 'heli';
    state.y = state.y < 8 ? 24 : state.y;
    toast('HELIKOPTER AKTIF — SPACE/C NAIK/TURUN, L SOROTAN', 4);
  } else {
    state.mode = 'car';
    state.y = 0;
    carModel.position.set(state.x, 0, state.z);
    carModel.rotation.y = state.heading;
    toast('MOBIL AKTIF — W/S GAS/REM, A/D BELOK', 3);
  }
  helicopter.craft.visible = state.mode === 'heli';
  carModel.visible = state.mode === 'car';
  footModel.visible = state.mode === 'foot';
}

function leaveVehicle() {
  if (state.mode === 'foot') return;
  if (state.mode === 'heli' && state.y > 12) {
    toast('TURUNKAN HELIKOPTER DULU', 2);
    return;
  }
  state.mode = 'foot';
  state.y = 0;
  state.speed = 0;
  state.searchlight = false;
  state.x += 6;
  helicopter.craft.visible = false;
  carModel.visible = false;
  footModel.visible = true;
  toast('KAMU TURUN', 1.6);
}

// ------------------------------------------------------------------- controls
const keys = new Set();

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (!state.running) return;

  if (event.code === 'Digit1') selectWeapon(0);
  if (event.code === 'Digit2') selectWeapon(1);
  if (event.code === 'Digit3') selectWeapon(2);
  if (event.code === 'Digit4') selectWeapon(3);
  if (event.code === 'KeyR') {
    state.radio = (state.radio + 1) % RADIO.length;
    updateRadioLabel();
  }
  if (event.code === 'KeyM') {
    state.radioOn = !state.radioOn;
    updateRadioLabel();
  }
  if (event.code === 'KeyE') tryMissionAction();
  if (event.code === 'KeyF') {
    if (state.mode === 'foot') enterVehicle('car');
    else leaveVehicle();
  }
  if (event.code === 'KeyH') {
    if (state.mode === 'heli') leaveVehicle();
    else enterVehicle('heli');
  }
  if (event.code === 'KeyL' && state.mode === 'heli') {
    state.searchlight = !state.searchlight;
    toast(state.searchlight ? 'SOROTAN AKTIF' : 'SOROTAN DIMATIKAN', 1.5);
  }
  if (event.code === 'ControlLeft' && state.mode !== 'heli') fireWeapon();
  if (event.code === 'KeyP') state.paused = !state.paused;
});

window.addEventListener('keyup', (event) => keys.delete(event.code));
canvas.addEventListener('mousedown', (event) => {
  if (event.button === 0) fireWeapon();
});

function selectWeapon(index) {
  state.weapon = index;
  toast(`SENJATA: ${WEAPONS[index].name}`, 1.6);
}

ui.startButton.addEventListener('click', () => {
  state.running = true;
  state.radioOn = true;
  ui.start.classList.add('hidden');
  bootRadio();
  refreshMission();
  updateRadioLabel();
  toast('SAPA TELUK — TEMUI ARA DI PELABUHAN', 4);
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
});

// ------------------------------------------------------------------- drawing
function updateCamera(delta, time) {
  let desiredPosition;
  let desiredTarget;
  if (state.cinematic) {
    const view = state.cinematic;
    const drift = Math.sin(time * 0.14) * 16;
    desiredPosition = new THREE.Vector3(view.position[0] + drift, view.position[1], view.position[2] - drift * 0.4);
    desiredTarget = new THREE.Vector3(view.target[0], view.target[1], view.target[2]);
  } else if (state.mode === 'heli') {
    const facing = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
    desiredPosition = new THREE.Vector3(state.x, state.y, state.z)
      .addScaledVector(facing, -46)
      .add(new THREE.Vector3(0, 20, 0));
    desiredTarget = new THREE.Vector3(state.x, state.y - 22, state.z).addScaledVector(facing, 28);
  } else {
    const distance = state.mode === 'car' ? 21 : 15;
    const height = state.mode === 'car' ? 9 : 7.5;
    const facing = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
    desiredPosition = new THREE.Vector3(state.x, state.y, state.z)
      .addScaledVector(facing, -distance)
      .add(new THREE.Vector3(0, height, 0));
    desiredTarget = new THREE.Vector3(state.x, state.y + 2, state.z).addScaledVector(facing, 8);
  }
  const startingShot = state.time <= FIXED_STEP * 2;
  const blend = startingShot ? 1 : (state.cinematic ? 0.045 : Math.min(1, delta * 5.5));
  state.cameraPosition.lerp(desiredPosition, blend);
  state.cameraTarget.lerp(desiredTarget, blend);
  camera.position.copy(state.cameraPosition);
  camera.lookAt(state.cameraTarget);
}

function drawMinimap() {
  const ctx = mapCtx;
  const width = ui.map.width;
  const height = ui.map.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const zoom = 0.3;
  const toX = (x) => centerX + (x - state.x) * zoom;
  const toY = (z) => centerY + (z - state.z) * zoom;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerX - 3, 0, TAU);
  ctx.clip();
  ctx.fillStyle = '#1b2033';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#174456';
  ctx.fillRect(0, 0, toX(LAYOUT.shoreX), height);
  ctx.fillRect(
    toX(LAYOUT.channel.fromX),
    toY(LAYOUT.channel.z - LAYOUT.channel.halfWidth),
    (LAYOUT.channel.toX - LAYOUT.channel.fromX) * zoom,
    LAYOUT.channel.halfWidth * 2 * zoom,
  );

  for (const district of DISTRICTS) {
    ctx.beginPath();
    ctx.arc(toX(district.center.x), toY(district.center.z), district.radius * zoom, 0, TAU);
    ctx.strokeStyle = district.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = district.color;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(9, 11, 22, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(district.name, toX(district.center.x), toY(district.center.z) - 13);
    ctx.fillText(district.name, toX(district.center.x), toY(district.center.z) - 13);
  }

  for (const road of city.roads) {
    ctx.beginPath();
    ctx.moveTo(toX(road.ax), toY(road.az));
    ctx.lineTo(toX(road.bx), toY(road.bz));
    ctx.strokeStyle = road.type === 'ring' ? '#6a6d93' : '#4c526d';
    ctx.lineWidth = road.type === 'ring' ? 3 : 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#ffd58a';
  ctx.fillRect(toX(LAYOUT.helipad.x) - 4, toY(LAYOUT.helipad.z) - 4, 8, 8);

  const current = mission();
  if (current && !state.missionDone) {
    const markerX = toX(current.marker.x);
    const markerY = toY(current.marker.z);
    ctx.strokeStyle = '#65f0ff';
    ctx.fillStyle = 'rgba(101,240,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(markerX, markerY - 8);
    ctx.lineTo(markerX + 8, markerY);
    ctx.lineTo(markerX, markerY + 8);
    ctx.lineTo(markerX - 8, markerY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#ff4d6d';
  for (const unit of police) {
    ctx.beginPath();
    ctx.arc(toX(unit.x), toY(unit.z), 3, 0, TAU);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(Math.PI - state.heading);
  ctx.fillStyle = '#fff0c8';
  ctx.strokeStyle = '#ff9c62';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(7, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  ctx.fillStyle = '#ffd9a5';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', centerX, 12);
}

function drawSpeedometer() {
  const ctx = speedCtx;
  const width = ui.speedo.width;
  const height = ui.speedo.height;
  const centerX = width / 2;
  const centerY = height - 12;
  const radius = 76;
  const start = Math.PI;
  const sweep = Math.PI;
  const shown = state.mode === 'heli' ? Math.abs(state.speed) * 3.2 : Math.abs(state.speed) * 3.6;
  const fraction = clamp(shown / 240, 0, 1);

  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, start, start + sweep);
  ctx.strokeStyle = 'rgba(255,224,180,0.18)';
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, start, start + sweep * fraction);
  ctx.strokeStyle = state.wanted > 2 ? '#ff7d92' : '#69e7f5';
  ctx.lineWidth = 11;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,230,196,0.6)';
  ctx.lineWidth = 1.5;
  for (let index = 0; index <= 8; index += 1) {
    const angle = start + (index / 8) * sweep;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * (radius - 12), centerY + Math.sin(angle) * (radius - 12));
    ctx.lineTo(centerX + Math.cos(angle) * (radius + 11), centerY + Math.sin(angle) * (radius + 11));
    ctx.stroke();
  }
  const needleAngle = start + sweep * fraction;
  ctx.strokeStyle = '#fff0cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + Math.cos(needleAngle) * (radius - 8), centerY + Math.sin(needleAngle) * (radius - 8));
  ctx.stroke();
  ctx.fillStyle = '#fff0cc';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, TAU);
  ctx.fill();
  ui.speedText.textContent = `${Math.round(shown)}`;
}

function updateHud() {
  const district = DISTRICTS.find((entry) => entry.id === city.districtAt(state.x, state.z));
  ui.district.textContent = district.name;
  ui.districtTag.textContent = district.tag;
  ui.money.textContent = `$${state.money.toLocaleString('en-US')}`;
  ui.wantedName.textContent = WANTED[state.wanted].name;
  ui.stars.forEach((star, index) => star.classList.toggle('lit', index < state.wanted));
  ui.health.style.width = `${state.health}%`;
  ui.armor.style.width = `${state.armor}%`;
  ui.slots.forEach((slot, index) => {
    slot.classList.toggle('active', index === state.weapon);
    const amount = slot.querySelector('.slot-ammo');
    if (amount) {
      amount.textContent = state.ammo[index] === Infinity ? '∞' : String(state.ammo[index]);
    }
  });
  ui.vehicle.textContent = state.mode === 'heli'
    ? `HELICOPTER ${state.searchlight ? '/ SOROTAN ON' : ''}`
    : state.mode === 'car' ? 'MOBIL / JALANAN KOTA' : 'JALAN KAKI';
  const current = mission();
  if (current && !state.missionDone && distanceTo(state.x, state.z, current.marker) < (state.mode === 'heli' ? 48 : 24)) {
    ui.prompt.textContent = 'TEKAN E UNTUK MISSI';
    ui.prompt.classList.add('show');
  } else {
    ui.prompt.classList.remove('show');
  }
  if (state.time > state.toastUntil) ui.toast.classList.remove('show');
  if (state.time > state.dialogueUntil) ui.dialogueBox.classList.remove('show');
}

// ---------------------------------------------------------------- photo setup
function applyPhotoMode() {
  ui.start.classList.add('hidden');
  state.running = true;
  if (photoMode === 'cover') {
    state.x = 224;
    state.z = 96;
    state.heading = 0.5;
    state.cinematic = { position: [455, 185, 430], target: [150, 52, 35] };
    dialogue('Ara', CREW[0].line, 14);
  } else if (photoMode === 'chase') {
    enterVehicle('car');
    state.x = ringX(-1.1);
    state.z = ringZ(-1.1);
    state.heading = 1.07;
    state.speed = 42;
    addWanted(3, true);
    dialogue('Dimas', CREW[1].line, 14);
  } else if (photoMode === 'marina') {
    state.mission = 3;
    enterVehicle('heli');
    state.x = -230;
    state.z = -90;
    state.y = 72;
    state.heading = 2.2;
    state.speed = 18;
    state.searchlight = true;
    refreshMission();
    dialogue('Ara', MISSIONS[3].dialogue, 14);
  } else if (photoMode === 'finale') {
    state.x = LAYOUT.helipad.x + 2;
    state.z = LAYOUT.helipad.z - 32;
    state.heading = 0;
    state.mission = 6;
    state.wanted = 2;
    helicopter.craft.position.set(LAYOUT.helipad.x + 16, 2.6, LAYOUT.helipad.z + 8);
    helicopter.craft.rotation.y = 0.7;
    helicopter.craft.visible = true;
    refreshMission();
    CREW.forEach((member, index) => {
      const figure = crewFigures.get(member.id);
      const angle = (index / CREW.length) * TAU;
      figure.position.set(
        LAYOUT.helipad.x + Math.cos(angle) * 34,
        0,
        LAYOUT.helipad.z + Math.sin(angle) * 34,
      );
    });
    state.cinematic = {
      position: [LAYOUT.helipad.x + 92, 108, LAYOUT.helipad.z + 118],
      target: [LAYOUT.helipad.x, 4, LAYOUT.helipad.z],
    };
  }
  updateRadioLabel();
}

function ringX(angle) {
  return LAYOUT.ring.x + Math.cos(angle) * LAYOUT.ring.rx;
}

function ringZ(angle) {
  return LAYOUT.ring.z + Math.sin(angle) * LAYOUT.ring.rz;
}

// ------------------------------------------------------------------- main loop
refreshMission();
updateRadioLabel();
if (photoMode) applyPhotoMode();

let previous = performance.now() / 1000;
let accumulator = 0;

function frame(nowMilliseconds) {
  const now = nowMilliseconds / 1000;
  let delta = now - previous;
  previous = now;
  if (!Number.isFinite(delta) || delta <= 0) delta = FIXED_STEP;
  if (delta > 0.2) delta = 0.2;

  accumulator += delta;
  while (accumulator >= FIXED_STEP) {
    accumulator -= FIXED_STEP;
    if (!state.paused && state.running) {
      state.time += FIXED_STEP;
      city.update(state.time);
      state.fireCooldown = Math.max(0, state.fireCooldown - FIXED_STEP);
      if (state.mode === 'foot') updateFoot(FIXED_STEP);
      else if (state.mode === 'car') updateCar(FIXED_STEP);
      else updateHeli(FIXED_STEP);
      updateWalkers(FIXED_STEP);
      updatePolice(FIXED_STEP);
      updateEffects(FIXED_STEP);
      if (state.wanted > 0 && state.time - state.crimeTime > 16) {
        state.heatTime += FIXED_STEP;
        if (state.heatTime > 9) {
          state.wanted -= 1;
          state.heatTime = 0;
        }
      }
      if (state.health < 100 && state.time % 3 < FIXED_STEP) state.health += 1;
    }
  }

  markerRing.rotation.z += delta * 0.6;
  markerRing.scale.setScalar(1 + Math.sin(state.time * 3) * 0.06);
  searchLight.intensity = state.searchlight && state.mode === 'heli' ? 9 : 0;
  lightCone.visible = state.searchlight && state.mode === 'heli';

  updateCamera(delta, state.time);
  updateHud();
  drawMinimap();
  drawSpeedometer();
  renderer.render(city.scene, camera);
  window.requestAnimationFrame(frame);
}
window.requestAnimationFrame(frame);

window.__KOTA_ARUNA = {
  state,
  city,
  camera,
  renderer,
  crewFigures,
  applyPhotoMode,
  setPhoto(name) {
    const url = new URL(window.location.href);
    url.searchParams.set('shot', name);
    window.location.href = url.toString();
  },
};
