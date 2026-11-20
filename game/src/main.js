import * as THREE from 'three';
import {
  BOUNDS,
  CONTRACTS,
  CREW,
  DEPARTURES,
  FRAME_TEXT,
  GUNS,
  GRID,
  HEAT,
  IDENTITY,
  STATIONS,
  START_MONEY,
  STEP,
  ZONES,
} from './config.js';
import { assembleCity } from './city.js';
import { makeRng } from './random.js';

const TAU = Math.PI * 2;
const DOWN = new THREE.Vector3(0, -1, 0);
const query = new URLSearchParams(window.location.search);
const requestedSeed = Number.parseInt(query.get('seed') ?? '1337', 10);
const worldSeed = Number.isFinite(requestedSeed) ? requestedSeed : 1337;
const photoFrame = query.get('shot') ?? query.get('frame') ?? '';
const dice = makeRng(worldSeed + 811);

const byId = (id) => document.getElementById(id);
const ui = {
  canvas: byId('scene-canvas'),
  title: byId('title-screen'),
  begin: byId('start-button'),
  jobCount: byId('job-count'),
  jobName: byId('job-name'),
  jobStory: byId('job-story'),
  jobTask: byId('job-task'),
  jobPay: byId('job-pay'),
  jobFoot: byId('job-foot'),
  zone: byId('zone-name'),
  zoneNote: byId('zone-note'),
  cash: byId('cash-readout'),
  heatWord: byId('heat-word'),
  heatPips: Array.from(document.querySelectorAll('.heat-pip')),
  life: byId('life-fill'),
  armor: byId('armor-fill'),
  guns: Array.from(document.querySelectorAll('.gun-slot')),
  station: byId('station-name'),
  stationDetail: byId('station-detail'),
  stationState: byId('station-state'),
  map: byId('mini-map'),
  dial: byId('dial'),
  ride: byId('ride-state'),
  speed: byId('dial-value'),
  notice: byId('toast-note'),
  hint: byId('action-hint'),
  talk: byId('talk-box'),
  speaker: byId('talk-who'),
  line: byId('talk-text'),
};
const mapInk = ui.map.getContext('2d');
const dialInk = ui.dial.getContext('2d');

const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.4, 4600);
const city = assembleCity(THREE, worldSeed);

const state = {
  mode: 'walk',
  x: 238,
  z: 86,
  altitude: 0,
  yaw: -0.5,
  speed: 0,
  climb: 0,
  pitch: 0,
  roll: 0,
  rotor: 0,
  money: START_MONEY,
  heat: 0,
  quiet: 0,
  crimeAt: -99,
  life: 100,
  armor: 50,
  gun: 1,
  ammo: GUNS.map((gun) => gun.rounds),
  trigger: 0,
  station: 0,
  radio: false,
  job: 0,
  finished: false,
  lamp: false,
  time: 0,
  playing: Boolean(photoFrame),
  paused: false,
  frozen: Boolean(photoFrame),
  noticeUntil: 0,
  talkUntil: 0,
  eye: new THREE.Vector3(260, 24, 130),
  look: new THREE.Vector3(210, 4, 70),
  vista: null,
};

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const separation = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function openSpot(origin, radius = 2) {
  for (let ring = 0; ring <= 64; ring += 4) {
    for (let step = 0; step < 16; step += 1) {
      const angle = (step / 16) * TAU;
      const x = origin.x + Math.cos(angle) * ring;
      const z = origin.z + Math.sin(angle) * ring;
      if (!solidAt(x, z, radius) && !city.inWater(x, z)) return { x, z };
    }
  }
  return { x: origin.x, z: origin.z };
}

const moneyText = (amount) => `$${amount.toLocaleString('en-US')}`;
const currentJob = () => CONTRACTS[Math.min(state.job, CONTRACTS.length - 1)];
const crewMember = (id) => CREW.find((person) => person.id === id) ?? CREW[0];

function markerSprite(text, tint) {
  const board = document.createElement('canvas');
  board.width = 320;
  board.height = 80;
  const brush = board.getContext('2d');
  brush.fillStyle = 'rgba(15,11,27,0.76)';
  brush.fillRect(0, 0, 320, 80);
  brush.strokeStyle = tint;
  brush.lineWidth = 4;
  brush.strokeRect(3, 3, 314, 74);
  brush.fillStyle = '#fff2d8';
  brush.font = 'bold 38px sans-serif';
  brush.textAlign = 'center';
  brush.textBaseline = 'middle';
  brush.fillText(text.toUpperCase(), 160, 42);
  const texture = new THREE.CanvasTexture(board);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthTest: false, toneMapped: false,
  }));
  sprite.position.y = 4.6;
  sprite.scale.set(17, 4.4, 1);
  return sprite;
}

function figure(color, name = '') {
  const person = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.76 });
  const skin = new THREE.MeshStandardMaterial({ color: '#e9bb92', roughness: 0.9 });
  const denim = new THREE.MeshStandardMaterial({ color: '#222436', roughness: 0.9 });
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, 1.9, 8), cloth);
  chest.position.y = 1.6;
  person.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), skin);
  head.position.y = 3;
  person.add(head);
  const legs = new THREE.CylinderGeometry(0.36, 0.42, 1.35, 7);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(legs, denim);
    leg.position.set(side * 0.33, 0.68, 0);
    person.add(leg);
  }
  if (name) person.add(markerSprite(name, color));
  return person;
}

function sedan(paint, police = false) {
  const vehicle = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.05, 5.1),
    new THREE.MeshStandardMaterial({ color: paint, roughness: 0.38, metalness: 0.45 }),
  );
  shell.position.y = 1.1;
  vehicle.add(shell);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.85, 2.4),
    new THREE.MeshStandardMaterial({
      color: police ? '#17243b' : '#8adcf1', roughness: 0.24, metalness: 0.32,
      transparent: true, opacity: police ? 1 : 0.9,
    }),
  );
  glass.position.set(0, 1.95, -0.25);
  vehicle.add(glass);
  const wheelForm = new THREE.CylinderGeometry(0.58, 0.58, 0.38, 14);
  wheelForm.rotateZ(Math.PI / 2);
  const rubber = new THREE.MeshStandardMaterial({ color: '#12131b', roughness: 0.95 });
  for (const side of [-1, 1]) {
    for (const depth of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(wheelForm, rubber);
      wheel.position.set(side * 1.28, 0.62, depth);
      vehicle.add(wheel);
    }
  }
  const white = new THREE.MeshBasicMaterial({ color: '#ffe7ba', toneMapped: false });
  const red = new THREE.MeshBasicMaterial({ color: '#ff4b5d', toneMapped: false });
  for (const side of [-1, 1]) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.14), white);
    front.position.set(side * 0.78, 1.2, 2.58);
    vehicle.add(front);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.14), red);
    back.position.set(side * 0.78, 1.2, -2.58);
    vehicle.add(back);
  }
  if (police) {
    for (const [offset, color, depth] of [[-0.35, '#5cc8ff', -0.2], [0.35, '#ff4d6d', 0.3]]) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.22, 0.45),
        new THREE.MeshBasicMaterial({ color, toneMapped: false }),
      );
      bar.position.set(offset, 2.55, depth);
      vehicle.add(bar);
    }
  }
  return vehicle;
}

function chopper() {
  const craft = new THREE.Group();
  const pale = new THREE.MeshStandardMaterial({ color: '#e9e4dd', roughness: 0.5, metalness: 0.25 });
  const iron = new THREE.MeshStandardMaterial({ color: '#1e2331', roughness: 0.5, metalness: 0.3 });
  const hull = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 14), pale);
  hull.scale.set(1.05, 0.85, 2);
  hull.position.y = 2.1;
  craft.add(hull);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, 16, 12),
    new THREE.MeshStandardMaterial({
      color: '#8adcf1', roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.85,
    }),
  );
  canopy.scale.set(1, 0.8, 1.05);
  canopy.position.set(0, 2.25, 2.05);
  craft.add(canopy);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 6.5), pale);
  boom.position.set(0, 2.35, -5.1);
  craft.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 1.5), pale);
  fin.position.set(0, 3.3, -8);
  craft.add(fin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 12), iron);
  mast.position.y = 4.1;
  craft.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.position.y = 4.45;
  const bladeForm = new THREE.BoxGeometry(0.55, 0.09, 12);
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#2b2d39', roughness: 0.7, metalness: 0.4 });
  for (let blade = 0; blade < 4; blade += 1) {
    const angle = (blade / 4) * TAU;
    const wing = new THREE.Mesh(bladeForm, bladeMat);
    wing.rotation.y = angle;
    wing.position.set(Math.sin(angle) * 6, 0, Math.cos(angle) * 6);
    mainRotor.add(wing);
  }
  craft.add(mainRotor);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.5, 3.3, -8.3);
  for (let blade = 0; blade < 2; blade += 1) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.7, 0.35), iron);
    wing.rotation.z = blade * Math.PI / 2;
    tailRotor.add(wing);
  }
  craft.add(tailRotor);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.4, 8), iron);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(side * 1.7, 0.2, 0);
    craft.add(rail);
    for (const depth of [-1.8, 1.8]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8), iron);
      strut.position.set(side * 1.45, 0.9, depth);
      craft.add(strut);
    }
  }
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(4.7, 0.12, 0.7),
    new THREE.MeshBasicMaterial({ color: '#ff63a8', toneMapped: false }),
  );
  stripe.position.set(0, 1.35, 0.5);
  craft.add(stripe);
  return { craft, mainRotor, tailRotor };
}

const hero = figure('#ffd68f');
city.scene.add(hero);

const ride = sedan('#ff6f91');
city.scene.add(ride);

const spawn = openSpot(DEPARTURES[0]);
state.x = spawn.x;
state.z = spawn.z;
state.yaw = DEPARTURES[0].facing;
hero.position.set(state.x, 0, state.z);
const parked = openSpot({ x: state.x + 12, z: state.z + 10 }, 3);
ride.position.set(parked.x, 0, parked.z);
ride.rotation.y = state.yaw;

const aircraft = chopper();
aircraft.craft.visible = false;
city.scene.add(aircraft.craft);

const beamAim = new THREE.Object3D();
city.scene.add(beamAim);
const beamLight = new THREE.SpotLight('#fff1c9', 0, 270, Math.PI / 8, 0.42, 1.1);
beamLight.target = beamAim;
city.scene.add(beamLight);
const coneForm = new THREE.ConeGeometry(20, 92, 20, 1, true);
coneForm.translate(0, -46, 0);
const beamCone = new THREE.Mesh(
  coneForm,
  new THREE.MeshBasicMaterial({
    color: '#ffe8b6', transparent: true, opacity: 0.1,
    blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  }),
);
beamCone.visible = false;
city.scene.add(beamCone);

const crewFigures = new Map();
for (const person of CREW) {
  const assignment = CONTRACTS.find((job) => job.lead === person.id) ?? CONTRACTS[0];
  const model = figure(person.color, person.name);
  model.position.set(assignment.at.x + 9, 0, assignment.at.z + 7);
  city.scene.add(model);
  crewFigures.set(person.id, model);
}

const strollers = [];
for (let index = 0; index < 18; index += 1) {
  const model = figure(dice.pick(['#d7a4c8', '#8bd0d6', '#e3c78b', '#b6a4dc']));
  const x = dice.range(-200, 380);
  const z = dice.range(-360, 360);
  model.position.set(x, 0, z);
  city.scene.add(model);
  strollers.push({ mesh: model, x, z, yaw: dice.range(0, TAU), pace: dice.range(0.8, 2.1) });
}

const patrols = [];
const sparks = [];

const waypoint = new THREE.Group();
const waypointRing = new THREE.Mesh(
  new THREE.TorusGeometry(9.5, 0.7, 10, 48),
  new THREE.MeshBasicMaterial({ color: '#61f0ff', toneMapped: false }),
);
waypointRing.rotation.x = -Math.PI / 2;
waypointRing.position.y = 0.8;
waypoint.add(waypointRing);
const waypointBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 5.5, 105, 14, 1, true),
  new THREE.MeshBasicMaterial({
    color: '#61f0ff', transparent: true, opacity: 0.11,
    blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  }),
);
waypointBeam.position.y = 52;
waypoint.add(waypointBeam);
city.scene.add(waypoint);

function announce(text, seconds = 3) {
  ui.notice.textContent = text;
  ui.notice.classList.add('shown');
  state.noticeUntil = state.time + seconds;
}

function converse(who, text, seconds = 6) {
  ui.speaker.textContent = who.toUpperCase();
  ui.line.textContent = text;
  ui.talk.classList.add('shown');
  state.talkUntil = state.time + seconds;
}

function refreshJobCard() {
  const job = currentJob();
  ui.jobCount.textContent = state.finished ? '07 / 07' : `${String(job.number).padStart(2, '0')} / 07`;
  ui.jobName.textContent = job.title;
  ui.jobStory.textContent = job.setup;
  ui.jobTask.textContent = state.finished ? 'Kota Aruna selamat — seluruh kru masih utuh' : job.task;
  ui.jobPay.textContent = state.finished ? '$0' : moneyText(job.reward);
  ui.jobFoot.textContent = state.finished ? 'CERITA SELESAI' : 'CERITA KOTA';
  waypoint.position.set(job.at.x, 0, job.at.z);
  waypoint.visible = !state.finished;
}

function raiseHeat(amount, silent = false) {
  state.heat = clamp(state.heat + amount, 0, HEAT.length - 1);
  state.quiet = 0;
  state.crimeAt = state.time;
  if (!silent && amount > 0) {
    announce(`POLISI MENGEJAR — ${HEAT[state.heat].word}`, 2.5);
  }
}

function solidAt(x, z, radius = 2) {
  if (city.inWater(x, z) && !city.onRoad(x, z)) return true;
  return city.solids.some((block) => Math.abs(x - block.x) < block.halfX + radius
    && Math.abs(z - block.z) < block.halfZ + radius);
}

function sidestep(x, z, nextX, nextZ, radius) {
  if (!solidAt(nextX, nextZ, radius)) return { x: nextX, z: nextZ, hit: false };
  if (!solidAt(nextX, z, radius)) return { x: nextX, z, hit: true };
  if (!solidAt(x, nextZ, radius)) return { x, z: nextZ, hit: true };
  return { x, z, hit: true };
}

function note(context, output, hz, length, volume, wave, when) {
  const generator = context.createOscillator();
  const envelope = context.createGain();
  generator.type = wave;
  generator.frequency.setValueAtTime(hz, when);
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(volume, when + 0.014);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
  generator.connect(envelope);
  envelope.connect(output);
  generator.start(when);
  generator.stop(when + length + 0.03);
}

let radioDeck = null;
function wakeRadio() {
  if (radioDeck) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  try {
    const context = new AudioEngine();
    const output = context.createGain();
    output.gain.value = 0.085;
    output.connect(context.destination);
    radioDeck = { context, output, beat: 0 };
    window.setInterval(radioBar, 150);
  } catch {
    radioDeck = null;
  }
}

function radioBar() {
  if (!radioDeck || !state.radio || state.paused) return;
  const deck = radioDeck;
  if (deck.context.state === 'suspended') return;
  const channel = STATIONS[state.station];
  const pulse = 60 / channel.beat;
  const when = deck.context.currentTime + 0.03;
  const step = deck.beat % 16;
  const scale = [0, 3, 5, 7, 10, 12, 15];
  if (step % 4 === 0) note(deck.context, deck.output, 58, pulse * 0.55, 0.62, 'sine', when);
  if (step % 8 === 4) note(deck.context, deck.output, 145, pulse * 0.35, 0.2, 'triangle', when);
  if (step % 2 === 0) note(deck.context, deck.output, 3400, pulse * 0.08, 0.05, 'square', when);
  const bass = channel.tone / 2 * 2 ** (scale[step % scale.length] / 12);
  note(deck.context, deck.output, bass, pulse * 0.8, 0.2, 'sawtooth', when);
  if (step === 2 || step === 6 || step === 11) {
    const lead = channel.tone * 2 ** (scale[(step + state.station) % scale.length] / 12);
    note(deck.context, deck.output, lead, pulse * 1.1, 0.12, 'triangle', when);
  }
  deck.beat += 1;
}

function refreshRadio() {
  const channel = STATIONS[state.station];
  ui.station.textContent = channel.label;
  ui.stationDetail.textContent = `${channel.dial} FM · ${channel.style}`;
  ui.stationState.textContent = state.radio ? '● ON AIR' : '○ MATI';
}

function tracer(from, to, color = '#ffe2a4') {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false }),
  );
  city.scene.add(line);
  sparks.push({ mesh: line, left: 0.14, total: 0.14, kind: 'line' });
}

function flare(at, color = '#ffb060', size = 3) {
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(size, 10, 8),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  orb.position.copy(at);
  city.scene.add(orb);
  sparks.push({ mesh: orb, left: 0.35, total: 0.35, kind: 'orb' });
}

function fireGun() {
  if (!state.playing || state.trigger > 0) return;
  const weapon = GUNS[state.gun];
  if (state.ammo[state.gun] <= 0) {
    announce('AMMO HABIS — GANTI SENJATA 1-4', 2);
    return;
  }
  state.trigger = weapon.delay;
  if (state.ammo[state.gun] !== Infinity) state.ammo[state.gun] -= 1;

  const origin = new THREE.Vector3(
    state.x + Math.sin(state.yaw) * 2,
    state.mode === 'fly' ? state.altitude + 1.8 : 2.2,
    state.z + Math.cos(state.yaw) * 2,
  );
  const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  const impact = origin.clone().addScaledVector(forward, weapon.reach);
  const candidates = [...strollers.filter((person) => person.mesh.visible).map((person) => person.mesh),
    ...patrols.map((unit) => unit.mesh)];
  let struck = null;
  let closest = Infinity;
  for (const body of candidates) {
    const offset = body.position.clone().sub(origin);
    const along = offset.dot(forward);
    if (along < 0 || along > weapon.reach) continue;
    const sideways = offset.addScaledVector(forward, -along).length();
    const isCop = patrols.some((unit) => unit.mesh === body);
    if (sideways < (isCop ? 4 : 2.4) && along < closest) {
      struck = body;
      closest = along;
    }
  }
  if (struck) {
    impact.copy(struck.position);
    impact.y += 1.4;
    flare(impact.clone(), '#ff7b7b', 1.6);
    const officer = patrols.find((unit) => unit.mesh === struck);
    if (officer) {
      officer.life -= weapon.harm;
      if (officer.life <= 0) {
        city.scene.remove(officer.mesh);
        patrols.splice(patrols.indexOf(officer), 1);
        state.money += 240;
        announce('+$240 — MOBIL POLISI DINONAKTIFKAN', 2);
      }
    } else {
      const civilian = strollers.find((person) => person.mesh === struck);
      if (civilian) {
        civilian.mesh.visible = false;
        raiseHeat(2);
      }
    }
  }
  tracer(origin, impact, weapon.id === 'launcher' ? '#ff8ef0' : '#ffe2a4');
  flare(origin, '#fff0bd', 1.1);
  raiseHeat(1);
}

function deployPatrol(x, z) {
  const vehicle = sedan('#e9eef5', true);
  const px = x ?? clamp(state.x + dice.range(-175, 175), -290, 450);
  const pz = z ?? clamp(state.z + dice.range(-175, 175), -430, 430);
  vehicle.position.set(px, 0, pz);
  city.scene.add(vehicle);
  patrols.push({ mesh: vehicle, x: px, z: pz, yaw: dice.range(0, TAU), speed: 0, life: 100 });
}

function advancePatrols(delta) {
  const allowed = Math.min(10, state.heat * 2);
  if (patrols.length < allowed && state.time - state.crimeAt > 2 && Math.floor(state.time * 2) % 2 === 0) {
    deployPatrol();
  }
  for (const unit of patrols) {
    const dx = state.x - unit.x;
    const dz = state.z - unit.z;
    const desired = Math.atan2(dx, dz);
    let difference = desired - unit.yaw;
    while (difference > Math.PI) difference -= TAU;
    while (difference < -Math.PI) difference += TAU;
    unit.yaw += clamp(difference, -1.9 * delta, 1.9 * delta);
    unit.speed = Math.min(34, unit.speed + 17 * delta);
    const step = sidestep(unit.x, unit.z,
      unit.x + Math.sin(unit.yaw) * unit.speed * delta,
      unit.z + Math.cos(unit.yaw) * unit.speed * delta, 2.2);
    unit.x = step.x;
    unit.z = step.z;
    unit.mesh.position.set(unit.x, 0, unit.z);
    unit.mesh.rotation.y = unit.yaw;
    if (Math.hypot(dx, dz) < 6 && state.mode !== 'fly') {
      state.life = Math.max(0, state.life - 9 * delta);
      raiseHeat(1, true);
    }
  }
}

function advanceSparks(delta) {
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const effect = sparks[index];
    effect.left -= delta;
    const age = 1 - effect.left / effect.total;
    if (effect.kind === 'orb') {
      effect.mesh.scale.setScalar(1 + age * 2.4);
      effect.mesh.material.opacity = Math.max(0, 1 - age) * 0.8;
    } else {
      effect.mesh.material.opacity = Math.max(0, 1 - age);
    }
    if (effect.left <= 0) {
      city.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      sparks.splice(index, 1);
    }
  }
}

function onFoot(delta) {
  const ahead = (down('KeyW') || down('ArrowUp') ? 1 : 0) - (down('KeyS') || down('ArrowDown') ? 1 : 0);
  const across = (down('KeyD') ? 1 : 0) - (down('KeyA') ? 1 : 0);
  const amount = Math.hypot(ahead, across) || 1;
  const pace = down('ShiftLeft') || down('ShiftRight') ? 13 : 7.5;
  const moving = ahead !== 0 || across !== 0;
  if (moving) {
    const vx = (Math.sin(state.yaw) * ahead + Math.cos(state.yaw) * across) / amount;
    const vz = (Math.cos(state.yaw) * ahead - Math.sin(state.yaw) * across) / amount;
    state.yaw = Math.atan2(vx, vz);
    const step = sidestep(state.x, state.z, state.x + vx * pace * delta, state.z + vz * pace * delta, 1.4);
    state.x = step.x;
    state.z = step.z;
  }
  state.speed = moving ? pace : 0;
  hero.position.set(state.x, 0, state.z);
  hero.rotation.y = state.yaw;
}

function inCar(delta) {
  const throttle = (down('KeyW') || down('ArrowUp') ? 1 : 0) - (down('KeyS') || down('ArrowDown') ? 1 : 0);
  const steering = (down('KeyD') || down('ArrowRight') ? 1 : 0) - (down('KeyA') || down('ArrowLeft') ? 1 : 0);
  const offRoad = !city.onRoad(state.x, state.z);
  const limit = offRoad ? 24 : 54;
  if (throttle > 0) state.speed += (offRoad ? 15 : 27) * delta;
  else if (throttle < 0) state.speed -= 38 * delta;
  else state.speed *= 1 - 1.1 * delta;
  if (down('Space')) state.speed *= 1 - 2.5 * delta;
  state.speed = clamp(state.speed, -12, limit);
  const grip = down('Space') ? 2.2 : 1;
  state.yaw += steering * grip * (0.55 + Math.min(1.3, Math.abs(state.speed) / 22)) * delta
    * (state.speed < -0.5 ? -1 : 1);
  const step = sidestep(state.x, state.z,
    state.x + Math.sin(state.yaw) * state.speed * delta,
    state.z + Math.cos(state.yaw) * state.speed * delta, 2.4);
  if (step.hit && Math.abs(state.speed) > 14) {
    state.speed *= -0.24;
    state.life = Math.max(0, state.life - 3);
    raiseHeat(1, true);
    announce('TABRAKAN — BADAN MOBIL RUSAK', 1.6);
  }
  state.x = step.x;
  state.z = step.z;
  syncSedan();
}

function syncSedan() {
  ride.position.set(state.x, 0, state.z);
  ride.rotation.y = state.yaw;
}

function inAir(delta) {
  const push = (down('KeyW') || down('ArrowUp') ? 1 : 0) - (down('KeyS') || down('ArrowDown') ? 1 : 0);
  const turn = (down('KeyD') || down('ArrowRight') ? 1 : 0) - (down('KeyA') || down('ArrowLeft') ? 1 : 0);
  const rise = (down('Space') ? 1 : 0) - (down('KeyC') || down('ControlLeft') ? 1 : 0);
  state.yaw += turn * 1.35 * delta;
  state.speed = clamp(state.speed + push * 26 * delta - state.speed * 0.65 * delta, -18, 72);
  state.climb = clamp(state.climb + rise * 22 * delta - state.climb * 1.4 * delta, -24, 26);
  state.altitude = clamp(state.altitude + state.climb * delta, 9, 240);
  state.x = clamp(state.x + Math.sin(state.yaw) * state.speed * delta, -560, 500);
  state.z = clamp(state.z + Math.cos(state.yaw) * state.speed * delta, -500, 500);
  state.rotor += delta * (26 + Math.abs(state.speed) * 0.15);
  state.pitch += (-push * 0.13 - state.pitch) * Math.min(1, delta * 4);
  state.roll += (turn * 0.18 - state.roll) * Math.min(1, delta * 4);
  aircraft.craft.position.set(state.x, state.altitude, state.z);
  aircraft.craft.rotation.set(state.pitch, state.yaw, state.roll, 'YXZ');
  aircraft.mainRotor.rotation.y = state.rotor;
  aircraft.tailRotor.rotation.x = state.rotor * 2.4;

  const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  beamAim.position.set(state.x, Math.max(1, state.altitude - 45), state.z)
    .addScaledVector(forward, 34);
  beamLight.position.set(state.x, state.altitude + 1.5, state.z);
  const aim = beamAim.position.clone().sub(beamLight.position).normalize();
  beamCone.position.copy(beamLight.position);
  beamCone.quaternion.setFromUnitVectors(DOWN, aim);
}

function amble(delta) {
  for (const person of strollers) {
    if (!person.mesh.visible) continue;
    person.yaw += Math.sin(state.time * 0.7 + person.x) * 0.4 * delta;
    const step = sidestep(person.x, person.z,
      person.x + Math.sin(person.yaw) * person.pace * delta,
      person.z + Math.cos(person.yaw) * person.pace * delta, 1);
    if (step.hit) person.yaw += Math.PI * 0.6;
    person.x = step.x;
    person.z = step.z;
    person.mesh.position.set(person.x, 0, person.z);
    person.mesh.rotation.y = person.yaw;
  }
}

function completeJob() {
  if (state.finished || state.job >= CONTRACTS.length) return;
  const job = currentJob();
  state.money += job.reward;
  announce(`KONTRAK SELESAI  +${moneyText(job.reward)}`, 4);
  if (job.id === 'c4') state.lamp = false;
  if (job.id === 'c5' || job.id === 'c6') raiseHeat(2);
  state.job += 1;
  if (state.job >= CONTRACTS.length) {
    state.finished = true;
    refreshJobCard();
    converse('Ara', 'Pasang surut. Air balik, kita juga. Terima kasih, kru.', 14);
  } else {
    refreshJobCard();
    converse(crewMember(job.lead).name, job.outro, 6);
  }
}

function attemptJob() {
  const job = currentJob();
  if (!job || state.finished) return;
  const reach = state.mode === 'fly' ? 48 : state.mode === 'car' ? 24 : 17;
  if (separation(state, job.at) > reach) {
    announce('DEKATI TITIK KONTRAK DULU', 2);
    return;
  }
  if (job.needs === 'air' && state.mode !== 'fly') {
    announce('KONTRAK INI BUTUH HELIKOPTER — TEKAN H', 3);
    return;
  }
  completeJob();
}

function setMode(mode) {
  state.mode = mode;
  hero.visible = mode === 'walk';
  ride.visible = mode === 'car';
  aircraft.craft.visible = mode === 'fly';
  if (mode !== 'fly') {
    state.lamp = false;
    state.altitude = 0;
  }
}

function boardVehicle(kind) {
  if (kind === 'fly' && separation(state, GRID.pad) > 68 && state.job < 3) {
    announce('HELIKOPTER HANYA DI HELIPAD TELUK ARUNA', 2.5);
    return;
  }
  setMode(kind);
  if (kind === 'fly') {
    if (state.altitude < 8) state.altitude = 24;
    inAir(0);
    announce('HELI AKTIF — SPACE/C NAIK/TURUN, L SOROTAN', 4);
  } else {
    syncSedan();
    announce('MOBIL AKTIF — W/S GAS/REM, A/D BELOK', 3);
  }
}

function leaveVehicle() {
  if (state.mode === 'walk') return;
  if (state.mode === 'fly' && state.altitude > 12) {
    announce('TURUNKAN HELIKOPTER DULU', 2);
    return;
  }
  setMode('walk');
  state.x += 6;
  state.speed = 0;
  announce('KAMU TURUN', 1.6);
}

const pressed = new Set();
function down(code) {
  return pressed.has(code);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  pressed.add(event.code);
  if (!state.playing || event.repeat) return;
  if (event.code.startsWith('Digit')) {
    const slot = Number(event.code.slice(5)) - 1;
    if (slot >= 0 && slot < GUNS.length) {
      state.gun = slot;
      announce(`SENJATA: ${GUNS[slot].label}`, 1.6);
    }
  }
  if (event.code === 'KeyR') {
    state.station = (state.station + 1) % STATIONS.length;
    refreshRadio();
  }
  if (event.code === 'KeyM') {
    state.radio = !state.radio;
    if (state.radio) wakeRadio();
    refreshRadio();
  }
  if (event.code === 'KeyE') attemptJob();
  if (event.code === 'KeyF') {
    if (state.mode === 'walk') boardVehicle('car');
    else leaveVehicle();
  }
  if (event.code === 'KeyH') {
    if (state.mode === 'fly') leaveVehicle();
    else boardVehicle('fly');
  }
  if (event.code === 'KeyL' && state.mode === 'fly') {
    state.lamp = !state.lamp;
    announce(state.lamp ? 'SOROTAN AKTIF' : 'SOROTAN DIMATIKAN', 1.5);
  }
  if (event.code === 'ControlLeft' && state.mode !== 'fly') fireGun();
  if (event.code === 'KeyP') state.paused = !state.paused;
});
window.addEventListener('keyup', (event) => pressed.delete(event.code));
ui.canvas.addEventListener('mousedown', (event) => {
  if (event.button === 0) fireGun();
});
ui.begin.addEventListener('click', () => {
  state.playing = true;
  state.radio = true;
  ui.title.classList.add('gone');
  wakeRadio();
  refreshJobCard();
  refreshRadio();
  announce(`${CONTRACTS[0].title} — ${CONTRACTS[0].task}`, 4);
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

function moveCamera(delta) {
  let wanted;
  let focus;
  if (state.vista) {
    const view = state.vista;
    const sway = Math.sin(state.time * 0.14) * 16;
    wanted = new THREE.Vector3(view.eye[0] + sway, view.eye[1], view.eye[2] - sway * 0.4);
    focus = new THREE.Vector3(view.look[0], view.look[1], view.look[2]);
  } else if (state.mode === 'fly') {
    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    wanted = new THREE.Vector3(state.x, state.altitude, state.z)
      .addScaledVector(forward, -46)
      .add(new THREE.Vector3(0, 20, 0));
    focus = new THREE.Vector3(state.x, state.altitude - 22, state.z)
      .addScaledVector(forward, 28);
  } else {
    const behind = state.mode === 'car' ? 21 : 15;
    const height = state.mode === 'car' ? 9 : 7.5;
    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    wanted = new THREE.Vector3(state.x, state.altitude, state.z)
      .addScaledVector(forward, -behind)
      .add(new THREE.Vector3(0, height, 0));
    focus = new THREE.Vector3(state.x, state.altitude + 2, state.z)
      .addScaledVector(forward, 8);
  }
  const blend = state.vista ? 0.045 : Math.min(1, delta * 5.5);
  state.eye.lerp(wanted, blend);
  state.look.lerp(focus, blend);
  camera.position.copy(state.eye);
  camera.lookAt(state.look);
}

function drawMap() {
  const pen = mapInk;
  const size = ui.map.width;
  const center = size / 2;
  const zoom = 0.3;
  const px = (x) => center + (x - state.x) * zoom;
  const py = (z) => center + (z - state.z) * zoom;

  pen.clearRect(0, 0, size, size);
  pen.save();
  pen.beginPath();
  pen.arc(center, center, center - 3, 0, TAU);
  pen.clip();
  pen.fillStyle = '#1c2134';
  pen.fillRect(0, 0, size, size);
  pen.fillStyle = '#174555';
  pen.fillRect(0, 0, px(GRID.coast), size);
  pen.fillRect(
    px(GRID.waterway.west), py(GRID.waterway.z - GRID.waterway.half),
    (GRID.waterway.east - GRID.waterway.west) * zoom,
    GRID.waterway.half * 2 * zoom,
  );

  for (const zone of ZONES) {
    pen.beginPath();
    pen.arc(px(zone.x), py(zone.z), zone.radius * zoom, 0, TAU);
    pen.strokeStyle = zone.color;
    pen.globalAlpha = 0.6;
    pen.lineWidth = 1.4;
    pen.stroke();
    pen.globalAlpha = 1;
    pen.font = 'bold 13px sans-serif';
    pen.textAlign = 'center';
    pen.strokeStyle = 'rgba(9,11,22,0.85)';
    pen.lineWidth = 3;
    pen.strokeText(zone.label, px(zone.x), py(zone.z) - 13);
    pen.fillStyle = zone.color;
    pen.fillText(zone.label, px(zone.x), py(zone.z) - 13);
  }

  for (const lane of city.lanes) {
    pen.beginPath();
    pen.moveTo(px(lane.ax), py(lane.az));
    pen.lineTo(px(lane.bx), py(lane.bz));
    pen.strokeStyle = lane.kind === 'orbital' ? '#6a6d93' : '#4d546e';
    pen.lineWidth = lane.kind === 'orbital' ? 3 : 2;
    pen.stroke();
  }
  pen.fillStyle = '#ffd58a';
  pen.fillRect(px(GRID.pad.x) - 4, py(GRID.pad.z) - 4, 8, 8);

  if (!state.finished) {
    const job = currentJob();
    const mx = px(job.at.x);
    const my = py(job.at.z);
    pen.beginPath();
    pen.moveTo(mx, my - 8);
    pen.lineTo(mx + 8, my);
    pen.lineTo(mx, my + 8);
    pen.lineTo(mx - 8, my);
    pen.closePath();
    pen.fillStyle = 'rgba(101,240,255,0.35)';
    pen.fill();
    pen.strokeStyle = '#65f0ff';
    pen.lineWidth = 2;
    pen.stroke();
  }
  pen.fillStyle = '#ff4d6d';
  for (const unit of patrols) {
    pen.beginPath();
    pen.arc(px(unit.x), py(unit.z), 3, 0, TAU);
    pen.fill();
  }

  pen.save();
  pen.translate(center, center);
  pen.rotate(Math.PI - state.yaw);
  pen.fillStyle = '#fff0c8';
  pen.strokeStyle = '#ff9c62';
  pen.lineWidth = 1.5;
  pen.beginPath();
  pen.moveTo(0, -10);
  pen.lineTo(7, 8);
  pen.lineTo(0, 4);
  pen.lineTo(-7, 8);
  pen.closePath();
  pen.fill();
  pen.stroke();
  pen.restore();
  pen.restore();
  pen.fillStyle = '#ffd9a5';
  pen.font = 'bold 9px sans-serif';
  pen.textAlign = 'center';
  pen.fillText('N', center, 12);
}

function drawDial() {
  const pen = dialInk;
  const width = ui.dial.width;
  const height = ui.dial.height;
  const cx = width / 2;
  const cy = height - 12;
  const radius = 76;
  const from = Math.PI;
  const sweep = Math.PI;
  const shown = state.mode === 'fly' ? Math.abs(state.speed) * 3.2 : Math.abs(state.speed) * 3.6;
  const amount = clamp(shown / 240, 0, 1);

  pen.clearRect(0, 0, width, height);
  pen.lineCap = 'round';
  pen.beginPath();
  pen.arc(cx, cy, radius, from, from + sweep);
  pen.strokeStyle = 'rgba(255,224,180,0.18)';
  pen.lineWidth = 11;
  pen.stroke();
  pen.beginPath();
  pen.arc(cx, cy, radius, from, from + sweep * amount);
  pen.strokeStyle = state.heat > 2 ? '#ff7d92' : '#69e7f5';
  pen.lineWidth = 11;
  pen.stroke();
  pen.strokeStyle = 'rgba(255,230,196,0.6)';
  pen.lineWidth = 1.5;
  for (let notch = 0; notch <= 8; notch += 1) {
    const angle = from + (notch / 8) * sweep;
    pen.beginPath();
    pen.moveTo(cx + Math.cos(angle) * (radius - 12), cy + Math.sin(angle) * (radius - 12));
    pen.lineTo(cx + Math.cos(angle) * (radius + 11), cy + Math.sin(angle) * (radius + 11));
    pen.stroke();
  }
  const needle = from + sweep * amount;
  pen.strokeStyle = '#fff0cc';
  pen.lineWidth = 3;
  pen.beginPath();
  pen.moveTo(cx, cy);
  pen.lineTo(cx + Math.cos(needle) * (radius - 8), cy + Math.sin(needle) * (radius - 8));
  pen.stroke();
  pen.fillStyle = '#fff0cc';
  pen.beginPath();
  pen.arc(cx, cy, 4, 0, TAU);
  pen.fill();
  ui.speed.textContent = `${Math.round(shown)}`;
}

function refreshHud() {
  const zone = ZONES.find((entry) => entry.key === city.districtAt(state.x, state.z)) ?? ZONES[0];
  ui.zone.textContent = zone.label;
  ui.zoneNote.textContent = zone.note;
  ui.cash.textContent = moneyText(state.money);
  ui.heatWord.textContent = HEAT[state.heat].word;
  ui.heatWord.style.color = HEAT[state.heat].tint;
  ui.heatPips.forEach((pip, index) => pip.classList.toggle('on', index < state.heat));
  ui.life.style.width = `${state.life}%`;
  ui.armor.style.width = `${state.armor}%`;
  ui.guns.forEach((slot, index) => {
    slot.classList.toggle('active', index === state.gun);
    const counter = slot.querySelector('.gun-count');
    if (counter) counter.textContent = state.ammo[index] === Infinity ? '∞' : String(state.ammo[index]);
  });
  ui.ride.textContent = state.mode === 'fly'
    ? `HELICOPTER ${state.lamp ? '/ SOROTAN ON' : ''}`
    : state.mode === 'car' ? 'MOBIL / JALANAN KOTA' : 'JALAN KAKI';
  const job = currentJob();
  const reach = state.mode === 'fly' ? 48 : 24;
  ui.hint.classList.toggle('shown', !state.finished && separation(state, job.at) < reach);
  if (state.time > state.noticeUntil) ui.notice.classList.remove('shown');
  if (state.time > state.talkUntil) ui.talk.classList.remove('shown');
}

function pointOnRing(angle) {
  return {
    x: GRID.ring.x + Math.cos(angle) * GRID.ring.rx,
    z: GRID.ring.z + Math.sin(angle) * GRID.ring.rz,
  };
}

function stageFrame(mode) {
  ui.title.classList.add('gone');
  state.playing = true;
  state.frozen = true;
  state.radio = true;
  if (mode === 'harbor') {
    state.x = 224;
    state.z = 96;
    state.yaw = 0.5;
    hero.position.set(state.x, 0, state.z);
    state.vista = { eye: [470, 170, 400], look: [155, 45, 25] };
    converse('Ara', crewMember('ara').quote, 14);
  } else if (mode === 'pursuit') {
    setMode('car');
    const spot = pointOnRing(-1.1);
    state.x = spot.x;
    state.z = spot.z;
    state.yaw = 1.07;
    state.speed = 42;
    state.heat = 3;
    syncSedan();
    for (let index = 0; index < 3; index += 1) {
      deployPatrol(
        spot.x + Math.sin(state.yaw) * (42 + index * 26),
        spot.z + Math.cos(state.yaw) * (42 + index * 26),
      );
    }
    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    state.vista = {
      eye: [spot.x - forward.x * 52 - forward.z * 18, 34, spot.z - forward.z * 52 + forward.x * 18],
      look: [spot.x + forward.x * 30, 4, spot.z + forward.z * 30],
    };
    converse('Dimas', crewMember('dimas').quote, 14);
  } else if (mode === 'beam') {
    state.job = 3;
    setMode('fly');
    state.x = -230;
    state.z = -90;
    state.altitude = 72;
    state.yaw = 2.2;
    state.speed = 18;
    state.lamp = true;
    inAir(0);
    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    state.vista = {
      eye: [state.x - forward.x * 46, state.altitude + 20, state.z - forward.z * 46],
      look: [state.x + forward.x * 34, state.altitude - 22, state.z + forward.z * 34],
    };
    refreshJobCard();
    converse('Ara', CONTRACTS[3].intro, 14);
  } else if (mode === 'tide') {
    setMode('walk');
    state.x = GRID.pad.x + 2;
    state.z = GRID.pad.z - 32;
    state.yaw = 0;
    state.job = CONTRACTS.length - 1;
    state.heat = 2;
    hero.position.set(state.x, 0, state.z);
    refreshJobCard();
    aircraft.craft.visible = true;
    aircraft.craft.position.set(GRID.pad.x + 16, 2.6, GRID.pad.z + 8);
    aircraft.craft.rotation.set(0, 0.7, 0);
    CREW.forEach((person, index) => {
      const angle = (index / CREW.length) * TAU;
      crewFigures.get(person.id).position.set(
        GRID.pad.x + Math.cos(angle) * 34,
        0,
        GRID.pad.z + Math.sin(angle) * 34,
      );
    });
    state.vista = {
      eye: [GRID.pad.x + 92, 46, GRID.pad.z + 90],
      look: [GRID.pad.x, 8, GRID.pad.z],
    };
    converse('Sinta', CONTRACTS[CONTRACTS.length - 1].intro, 14);
  }
  if (FRAME_TEXT[mode]) document.title = `${FRAME_TEXT[mode]} — ${IDENTITY.name}`;
  refreshRadio();
  moveCamera(1);
}

refreshJobCard();
refreshRadio();
if (photoFrame) stageFrame(photoFrame);

let previous = performance.now() / 1000;
let remainder = 0;
let firstFrame = true;
function tickFrame(milliseconds) {
  const now = milliseconds / 1000;
  let elapsed = now - previous;
  previous = now;
  if (!Number.isFinite(elapsed) || elapsed <= 0) elapsed = STEP;
  if (elapsed > 0.2) elapsed = 0.2;
  remainder += elapsed;
  while (remainder >= STEP) {
    remainder -= STEP;
    state.time += STEP;
    city.tick(state.time);
    if (!state.frozen && state.playing && !state.paused) {
      state.trigger = Math.max(0, state.trigger - STEP);
      if (state.mode === 'walk') onFoot(STEP);
      else if (state.mode === 'car') inCar(STEP);
      else inAir(STEP);
      amble(STEP);
      advancePatrols(STEP);
      advanceSparks(STEP);
      if (state.heat > 0 && state.time - state.crimeAt > 16) {
        state.quiet += STEP;
        if (state.quiet > 9) {
          state.heat -= 1;
          state.quiet = 0;
        }
      }
      if (state.life < 100) state.life = Math.min(100, state.life + STEP / 3);
    }
  }

  const lampOn = state.lamp && state.mode === 'fly';
  beamLight.intensity = lampOn ? 9 : 0;
  beamCone.visible = lampOn;
  waypointRing.rotation.z += elapsed * 0.6;
  waypointRing.scale.setScalar(1 + Math.sin(state.time * 3) * 0.06);

  moveCamera(elapsed);
  refreshHud();
  drawMap();
  drawDial();
  renderer.render(city.scene, camera);
  if (firstFrame) {
    firstFrame = false;
    document.body.dataset.ready = '1';
  }
  window.requestAnimationFrame(tickFrame);
}
window.requestAnimationFrame(tickFrame);

window.__KOTA_ARUNA = { state, city, camera, renderer, crewFigures, stageFrame, DEPARTURES, BOUNDS };
