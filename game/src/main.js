import * as THREE from 'three';
import {
  ALERT_TIERS,
  CREW,
  DISTRICTS,
  FRAME_TIME,
  MISSIONS,
  RADIO_CHANNELS,
  SHOT_CAPTIONS,
  START_CASH,
  START_POINTS,
  STREET_GRID,
  WEAPONS,
} from './config.js';
import { buildCity } from './city.js';
import { createGenerator } from './random.js';

const TURN = Math.PI * 2;
const DOWN = new THREE.Vector3(0, -1, 0);
const options = new URLSearchParams(window.location.search);
const requestedSeed = Number.parseInt(options.get('seed') ?? '1337', 10);
const worldSeed = Number.isFinite(requestedSeed) ? requestedSeed : 1337;
const photoMode = options.get('shot') ?? options.get('view') ?? '';
const chance = createGenerator(worldSeed + 811);

const grab = (id) => document.getElementById(id);
const screen = grab('view');
const panel = {
  intro: grab('intro'),
  begin: grab('begin'),
  missionCount: grab('mission-count'),
  missionTitle: grab('mission-title'),
  missionBrief: grab('mission-brief'),
  missionTask: grab('mission-objective'),
  missionPay: grab('mission-pay'),
  missionTag: grab('mission-tag'),
  district: grab('district-name'),
  districtCaption: grab('district-caption'),
  wallet: grab('wallet'),
  alertWord: grab('alert-word'),
  stars: Array.from(document.querySelectorAll('.star')),
  healthFill: grab('health-fill'),
  armorFill: grab('armor-fill'),
  slots: Array.from(document.querySelectorAll('.slot')),
  radioName: grab('radio-name'),
  radioFrequency: grab('radio-frequency'),
  radioMood: grab('radio-mood'),
  radioState: grab('radio-state'),
  map: grab('map'),
  gauge: grab('gauge'),
  vehicle: grab('vehicle-state'),
  speed: grab('speed-value'),
  toast: grab('toast'),
  prompt: grab('prompt'),
  dialogue: grab('dialogue'),
  speaker: grab('speaker'),
  line: grab('line'),
};
const mapPen = panel.map.getContext('2d');
const gaugePen = panel.gauge.getContext('2d');

const renderer = new THREE.WebGLRenderer({
  canvas: screen,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.4, 4600);
const city = buildCity(THREE, worldSeed);

const run = {
  mode: 'foot',
  x: 238,
  z: 86,
  altitude: 0,
  heading: -0.5,
  speed: 0,
  lift: 0,
  nose: 0,
  bank: 0,
  rotor: 0,
  cash: START_CASH,
  alert: 0,
  calm: 0,
  lastCrime: -99,
  health: 100,
  armor: 50,
  weapon: 1,
  ammo: WEAPONS.map((gun) => gun.stock),
  shotTimer: 0,
  station: 0,
  tuned: false,
  mission: 0,
  complete: false,
  searchlight: false,
  clock: 0,
  active: Boolean(photoMode),
  paused: false,
  toastUntil: 0,
  talkUntil: 0,
  eye: new THREE.Vector3(260, 24, 130),
  focus: new THREE.Vector3(210, 4, 70),
  vista: null,
};

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const flatDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const money = (amount) => `$${amount.toLocaleString('en-US')}`;
const missionNow = () => MISSIONS[Math.min(run.mission, MISSIONS.length - 1)];
const crewMember = (id) => CREW.find((person) => person.id === id) ?? CREW[0];

function labelSprite(text, tint) {
  const board = document.createElement('canvas');
  board.width = 320;
  board.height = 80;
  const brush = board.getContext('2d');
  brush.fillStyle = 'rgba(15,11,27,0.74)';
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

function makePedestrian(color, label = '') {
  const person = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.8, 1.9, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.76 }),
  );
  torso.position.y = 1.6;
  person.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#e9bb92', roughness: 0.9 }),
  );
  head.position.y = 3;
  person.add(head);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 1.35, 0.42),
      new THREE.MeshStandardMaterial({ color: '#222436', roughness: 0.9 }),
    );
    leg.position.set(side * 0.33, 0.68, 0);
    person.add(leg);
  }
  if (label) person.add(labelSprite(label, color));
  return person;
}

function makeCar(paint, police = false) {
  const car = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.05, 5.1),
    new THREE.MeshStandardMaterial({ color: paint, roughness: 0.38, metalness: 0.45 }),
  );
  shell.position.y = 1.1;
  car.add(shell);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.85, 2.4),
    new THREE.MeshStandardMaterial({
      color: police ? '#17243b' : '#8adcf1',
      roughness: 0.24, metalness: 0.32,
      transparent: true, opacity: police ? 1 : 0.9,
    }),
  );
  cabin.position.set(0, 1.95, -0.25);
  car.add(cabin);

  const wheelShape = new THREE.CylinderGeometry(0.58, 0.58, 0.38, 14);
  wheelShape.rotateZ(Math.PI / 2);
  const rubber = new THREE.MeshStandardMaterial({ color: '#12131b', roughness: 0.95 });
  for (const side of [-1, 1]) {
    for (const depth of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(wheelShape, rubber);
      wheel.position.set(side * 1.28, 0.62, depth);
      car.add(wheel);
    }
  }
  const whiteLight = new THREE.MeshBasicMaterial({ color: '#ffe7ba', toneMapped: false });
  const redLight = new THREE.MeshBasicMaterial({ color: '#ff4b5d', toneMapped: false });
  for (const side of [-1, 1]) {
    const headlamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.14), whiteLight);
    headlamp.position.set(side * 0.78, 1.2, 2.58);
    car.add(headlamp);
    const taillamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.14), redLight);
    taillamp.position.set(side * 0.78, 1.2, -2.58);
    car.add(taillamp);
  }
  if (police) {
    for (const [offset, color, depth] of [[-0.35, '#5cc8ff', -0.2], [0.35, '#ff4d6d', 0.3]]) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.22, 0.45),
        new THREE.MeshBasicMaterial({ color, toneMapped: false }),
      );
      bar.position.set(offset, 2.55, depth);
      car.add(bar);
    }
  }
  return car;
}

function makeChopper() {
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
  for (let blade = 0; blade < 4; blade += 1) {
    const angle = (blade / 4) * TURN;
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: '#2b2d39', roughness: 0.7, metalness: 0.4 }),
    );
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

const hero = makePedestrian('#ffd68f');
city.scene.add(hero);

const streetCar = makeCar('#ff6f91');
streetCar.position.set(246, 0, 98);
streetCar.rotation.y = -0.5;
city.scene.add(streetCar);

const helicopter = makeChopper();
helicopter.craft.visible = false;
city.scene.add(helicopter.craft);

const beamTarget = new THREE.Object3D();
city.scene.add(beamTarget);
const beamLight = new THREE.SpotLight('#fff1c9', 0, 270, Math.PI / 8, 0.42, 1.1);
beamLight.target = beamTarget;
city.scene.add(beamLight);
const coneGeometry = new THREE.ConeGeometry(20, 92, 20, 1, true);
coneGeometry.translate(0, -46, 0);
const beamCone = new THREE.Mesh(
  coneGeometry,
  new THREE.MeshBasicMaterial({
    color: '#ffe8b6', transparent: true, opacity: 0.1,
    blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  }),
);
beamCone.visible = false;
city.scene.add(beamCone);

const crewFigures = new Map();
CREW.forEach((person) => {
  const assigned = MISSIONS.find((entry) => entry.lead === person.id) ?? MISSIONS[0];
  const figure = makePedestrian(person.color, person.name);
  figure.position.set(assigned.point.x + 9, 0, assigned.point.z + 7);
  city.scene.add(figure);
  crewFigures.set(person.id, figure);
});

const walkers = [];
for (let index = 0; index < 18; index += 1) {
  const stranger = makePedestrian(chance.choose(['#d7a4c8', '#8bd0d6', '#e3c78b', '#b6a4dc']));
  const x = chance.between(-200, 380);
  const z = chance.between(-360, 360);
  stranger.position.set(x, 0, z);
  city.scene.add(stranger);
  walkers.push({ mesh: stranger, x, z, heading: chance.between(0, TURN), pace: chance.between(0.8, 2.1) });
}

const pursuers = [];
const sparks = [];

const waypoint = new THREE.Group();
const waypointRing = new THREE.Mesh(
  new THREE.TorusGeometry(9.5, 0.7, 10, 48),
  new THREE.MeshBasicMaterial({ color: '#61f0ff', toneMapped: false }),
);
waypointRing.rotation.x = -Math.PI / 2;
waypointRing.position.y = 0.8;
waypoint.add(waypointRing);
const waypointShaft = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 5.5, 105, 14, 1, true),
  new THREE.MeshBasicMaterial({
    color: '#61f0ff', transparent: true, opacity: 0.11,
    blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  }),
);
waypointShaft.position.y = 52;
waypoint.add(waypointShaft);
city.scene.add(waypoint);

function toast(text, seconds = 3) {
  panel.toast.textContent = text;
  panel.toast.classList.add('visible');
  run.toastUntil = run.clock + seconds;
}

function speak(name, text, seconds = 6) {
  panel.speaker.textContent = name.toUpperCase();
  panel.line.textContent = text;
  panel.dialogue.classList.add('visible');
  run.talkUntil = run.clock + seconds;
}

function refreshMissionCard() {
  const job = missionNow();
  panel.missionCount.textContent = run.complete ? '07 / 07' : `${String(job.number).padStart(2, '0')} / 07`;
  panel.missionTitle.textContent = job.title;
  panel.missionBrief.textContent = job.brief;
  panel.missionTask.textContent = job.objective;
  panel.missionPay.textContent = money(job.pay);
  panel.missionTag.textContent = run.complete ? 'CERITA SELESAI' : 'CERITA KOTA';
  waypoint.position.set(job.point.x, 0, job.point.z);
  waypoint.visible = !run.complete;
}

function raiseAlert(amount, quiet = false) {
  run.alert = clamp(run.alert + amount, 0, ALERT_TIERS.length - 1);
  run.calm = 0;
  run.lastCrime = run.clock;
  if (!quiet && amount > 0) {
    toast(`POLISI MENGEJAR — ${ALERT_TIERS[run.alert].label}`, 2.5);
  }
}

function obstructed(x, z, radius = 2) {
  if (city.isWater(x, z) && !city.isRoad(x, z)) return true;
  return city.obstacles.some((solid) => Math.abs(x - solid.x) < solid.halfX + radius
    && Math.abs(z - solid.z) < solid.halfZ + radius);
}

function stepAround(x, z, nextX, nextZ, radius) {
  if (!obstructed(nextX, nextZ, radius)) return { x: nextX, z: nextZ, hit: false };
  if (!obstructed(nextX, z, radius)) return { x: nextX, z: z, hit: true };
  if (!obstructed(x, nextZ, radius)) return { x, z: nextZ, hit: true };
  return { x, z, hit: true };
}

function composeNote(context, output, hz, length, volume, wave, when) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(hz, when);
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(volume, when + 0.014);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(when);
  oscillator.stop(when + length + 0.03);
}

let radioDeck = null;
function igniteRadio() {
  if (radioDeck) return;
  const Engine = window.AudioContext || window.webkitAudioContext;
  if (!Engine) return;
  try {
    const context = new Engine();
    const output = context.createGain();
    output.gain.value = 0.085;
    output.connect(context.destination);
    radioDeck = { context, output, beat: 0 };
    window.setInterval(playRadioBar, 150);
  } catch {
    radioDeck = null;
  }
}

function playRadioBar() {
  if (!radioDeck || !run.tuned || run.paused) return;
  const deck = radioDeck;
  if (deck.context.state === 'suspended') return;
  const channel = RADIO_CHANNELS[run.station];
  const beat = 60 / channel.tempo;
  const when = deck.context.currentTime + 0.03;
  const step = deck.beat % 16;
  const notes = [0, 3, 5, 7, 10, 12, 15];
  if (step % 4 === 0) composeNote(deck.context, deck.output, 58, beat * 0.55, 0.62, 'sine', when);
  if (step % 8 === 4) composeNote(deck.context, deck.output, 145, beat * 0.35, 0.2, 'triangle', when);
  if (step % 2 === 0) composeNote(deck.context, deck.output, 3400, beat * 0.08, 0.05, 'square', when);
  const bass = channel.root / 2 * 2 ** (notes[step % notes.length] / 12);
  composeNote(deck.context, deck.output, bass, beat * 0.8, 0.2, 'sawtooth', when);
  if (step === 2 || step === 6 || step === 11) {
    const lead = channel.root * 2 ** (notes[(step + run.station) % notes.length] / 12);
    composeNote(deck.context, deck.output, lead, beat * 1.1, 0.12, 'triangle', when);
  }
  deck.beat += 1;
}

function refreshRadio() {
  const channel = RADIO_CHANNELS[run.station];
  panel.radioName.textContent = channel.label;
  panel.radioFrequency.textContent = `${channel.frequency} FM`;
  panel.radioMood.textContent = channel.mood;
  panel.radioState.textContent = run.tuned ? '● ON AIR' : '○ MATI';
}

function drawTracer(from, to, color = '#ffe2a4') {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false }),
  );
  city.scene.add(line);
  sparks.push({ mesh: line, remaining: 0.14, total: 0.14, kind: 'line' });
}

function drawBurst(at, color = '#ffb060', size = 3) {
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(size, 10, 8),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  orb.position.copy(at);
  city.scene.add(orb);
  sparks.push({ mesh: orb, remaining: 0.35, total: 0.35, kind: 'orb' });
}

function shoot() {
  if (!run.active || run.shotTimer > 0) return;
  const weapon = WEAPONS[run.weapon];
  if (run.ammo[run.weapon] <= 0) {
    toast('AMMO HABIS — GANTI SENJATA 1-4', 2);
    return;
  }
  run.shotTimer = weapon.cooldown;
  if (run.ammo[run.weapon] !== Infinity) run.ammo[run.weapon] -= 1;

  const origin = new THREE.Vector3(
    run.x + Math.sin(run.heading) * 2,
    run.mode === 'air' ? run.altitude + 1.8 : 2.2,
    run.z + Math.cos(run.heading) * 2,
  );
  const forward = new THREE.Vector3(Math.sin(run.heading), 0, Math.cos(run.heading));
  const end = origin.clone().addScaledVector(forward, weapon.range);
  let hit = null;
  let nearest = Infinity;
  const targets = [
    ...walkers.filter((person) => person.mesh.visible).map((person) => person.mesh),
    ...pursuers.map((unit) => unit.mesh),
  ];
  for (const body of targets) {
    const offset = body.position.clone().sub(origin);
    const along = offset.dot(forward);
    if (along < 0 || along > weapon.range) continue;
    const sideways = offset.addScaledVector(forward, -along).length();
    const isPolice = pursuers.some((unit) => unit.mesh === body);
    if (sideways < (isPolice ? 4 : 2.4) && along < nearest) {
      hit = body;
      nearest = along;
    }
  }
  if (hit) {
    end.copy(hit.position);
    end.y += 1.4;
    drawBurst(end.clone(), '#ff7b7b', 1.6);
    const cop = pursuers.find((unit) => unit.mesh === hit);
    if (cop) {
      cop.health -= weapon.damage;
      if (cop.health <= 0) {
        city.scene.remove(cop.mesh);
        pursuers.splice(pursuers.indexOf(cop), 1);
        run.cash += 240;
        toast('+$240 — MOBIL POLISI DINONAKTIFKAN', 2);
      }
    } else {
      const civilian = walkers.find((person) => person.mesh === hit);
      if (civilian) {
        civilian.mesh.visible = false;
        raiseAlert(2);
      }
    }
  }
  drawTracer(origin, end, weapon.id === 'rocket' ? '#ff8ef0' : '#ffe2a4');
  drawBurst(origin, '#fff0bd', 1.1);
  raiseAlert(1);
}

function deployPursuer(x, z) {
  const car = makeCar('#e9eef5', true);
  const px = x ?? clamp(run.x + chance.between(-175, 175), -290, 450);
  const pz = z ?? clamp(run.z + chance.between(-175, 175), -430, 430);
  car.position.set(px, 0, pz);
  city.scene.add(car);
  pursuers.push({
    mesh: car, x: px, z: pz,
    heading: chance.between(0, TURN), speed: 0, health: 100,
  });
}

function updatePursuers(delta) {
  if (pursuers.length < run.alert * 2 && run.clock - run.lastCrime > 2
    && Math.floor(run.clock * 2) % 2 === 0) {
    deployPursuer();
  }
  for (const unit of pursuers) {
    const dx = run.x - unit.x;
    const dz = run.z - unit.z;
    const desired = Math.atan2(dx, dz);
    let difference = desired - unit.heading;
    while (difference > Math.PI) difference -= TURN;
    while (difference < -Math.PI) difference += TURN;
    unit.heading += clamp(difference, -1.9 * delta, 1.9 * delta);
    unit.speed = Math.min(34, unit.speed + 17 * delta);
    const next = stepAround(unit.x, unit.z,
      unit.x + Math.sin(unit.heading) * unit.speed * delta,
      unit.z + Math.cos(unit.heading) * unit.speed * delta, 2.2);
    unit.x = next.x;
    unit.z = next.z;
    unit.mesh.position.set(unit.x, 0, unit.z);
    unit.mesh.rotation.y = unit.heading;
    if (Math.hypot(dx, dz) < 6 && run.mode !== 'air') {
      run.health = Math.max(0, run.health - 9 * delta);
      raiseAlert(1, true);
    }
  }
}

function updateSparks(delta) {
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    spark.remaining -= delta;
    const age = 1 - spark.remaining / spark.total;
    if (spark.kind === 'orb') {
      spark.mesh.scale.setScalar(1 + age * 2.4);
      spark.mesh.material.opacity = Math.max(0, 1 - age) * 0.8;
    } else {
      spark.mesh.material.opacity = Math.max(0, 1 - age);
    }
    if (spark.remaining <= 0) {
      city.scene.remove(spark.mesh);
      spark.mesh.geometry.dispose();
      spark.mesh.material.dispose();
      sparks.splice(index, 1);
    }
  }
}

const held = new Set();
function onFoot(delta) {
  const forward = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0)
    - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
  const sideways = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
  const amount = Math.hypot(forward, sideways) || 1;
  const pace = held.has('ShiftLeft') || held.has('ShiftRight') ? 13 : 7.5;
  const moving = forward !== 0 || sideways !== 0;
  if (moving) {
    const vx = (Math.sin(run.heading) * forward + Math.cos(run.heading) * sideways) / amount;
    const vz = (Math.cos(run.heading) * forward - Math.sin(run.heading) * sideways) / amount;
    run.heading = Math.atan2(vx, vz);
    const next = stepAround(run.x, run.z, run.x + vx * pace * delta, run.z + vz * pace * delta, 1.4);
    run.x = next.x;
    run.z = next.z;
  }
  run.speed = moving ? pace : 0;
  hero.position.set(run.x, 0, run.z);
  hero.rotation.y = run.heading;
}

function inCar(delta) {
  const throttle = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0)
    - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
  const wheel = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0)
    - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
  const offRoad = !city.isRoad(run.x, run.z);
  const topSpeed = offRoad ? 24 : 54;
  if (throttle > 0) run.speed += (offRoad ? 15 : 27) * delta;
  else if (throttle < 0) run.speed -= 38 * delta;
  else run.speed *= 1 - 1.1 * delta;
  if (held.has('Space')) run.speed *= 1 - 2.5 * delta;
  run.speed = clamp(run.speed, -12, topSpeed);
  const grip = held.has('Space') ? 2.2 : 1;
  run.heading += wheel * grip * (0.55 + Math.min(1.3, Math.abs(run.speed) / 22)) * delta
    * (run.speed < -0.5 ? -1 : 1);
  const next = stepAround(run.x, run.z,
    run.x + Math.sin(run.heading) * run.speed * delta,
    run.z + Math.cos(run.heading) * run.speed * delta, 2.4);
  if (next.hit && Math.abs(run.speed) > 14) {
    run.speed *= -0.24;
    run.health = Math.max(0, run.health - 3);
    raiseAlert(1, true);
    toast('TABRAKAN — BADAN MOBIL RUSAK', 1.6);
  }
  run.x = next.x;
  run.z = next.z;
  streetCar.position.set(run.x, 0, run.z);
  streetCar.rotation.y = run.heading;
  streetCar.rotation.z = -wheel * Math.min(0.07, Math.abs(run.speed) * 0.0018);
}

function inAir(delta) {
  const push = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0)
    - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
  const turn = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0)
    - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
  const rise = (held.has('Space') ? 1 : 0)
    - (held.has('KeyC') || held.has('ControlLeft') ? 1 : 0);
  run.heading += turn * 1.35 * delta;
  run.speed = clamp(run.speed + push * 26 * delta - run.speed * 0.65 * delta, -18, 72);
  run.lift = clamp(run.lift + rise * 22 * delta - run.lift * 1.4 * delta, -24, 26);
  run.altitude = clamp(run.altitude + run.lift * delta, 9, 240);
  run.x = clamp(run.x + Math.sin(run.heading) * run.speed * delta, -560, 500);
  run.z = clamp(run.z + Math.cos(run.heading) * run.speed * delta, -500, 500);
  run.rotor += delta * (26 + Math.abs(run.speed) * 0.15);
  run.nose += (-push * 0.13 - run.nose) * Math.min(1, delta * 4);
  run.bank += (turn * 0.18 - run.bank) * Math.min(1, delta * 4);
  helicopter.craft.position.set(run.x, run.altitude, run.z);
  helicopter.craft.rotation.set(run.nose, run.heading, run.bank, 'YXZ');
  helicopter.mainRotor.rotation.y = run.rotor;
  helicopter.tailRotor.rotation.x = run.rotor * 2.4;

  const facing = new THREE.Vector3(Math.sin(run.heading), 0, Math.cos(run.heading));
  beamTarget.position.set(run.x, Math.max(1, run.altitude - 45), run.z)
    .addScaledVector(facing, 34);
  beamLight.position.set(run.x, run.altitude + 1.5, run.z);
  const aim = beamTarget.position.clone().sub(beamLight.position).normalize();
  beamCone.position.copy(beamLight.position);
  beamCone.quaternion.setFromUnitVectors(DOWN, aim);
}

function stroll(delta) {
  for (const person of walkers) {
    if (!person.mesh.visible) continue;
    person.heading += Math.sin(run.clock * 0.7 + person.x) * 0.4 * delta;
    const next = stepAround(person.x, person.z,
      person.x + Math.sin(person.heading) * person.pace * delta,
      person.z + Math.cos(person.heading) * person.pace * delta, 1);
    if (next.hit) person.heading += Math.PI * 0.6;
    person.x = next.x;
    person.z = next.z;
    person.mesh.position.set(person.x, 0, person.z);
    person.mesh.rotation.y = person.heading;
  }
}

function awardMission() {
  if (run.complete || run.mission >= MISSIONS.length) return;
  const job = missionNow();
  run.cash += job.pay;
  toast(`MISSI SELESAI  +${money(job.pay)}`, 4);
  if (job.id === 'm4') run.searchlight = false;
  if (job.id === 'm5' || job.id === 'm6') raiseAlert(2);
  run.mission += 1;
  if (run.mission >= MISSIONS.length) {
    run.complete = true;
    panel.missionTitle.textContent = 'PASANG SURUT';
    panel.missionTask.textContent = 'Kota Aruna selamat — seluruh kru masih utuh';
    panel.missionPay.textContent = '$0';
    panel.missionTag.textContent = 'CERITA SELESAI';
    speak('Ara', 'Pasang surut. Air balik, kita juga. Terima kasih, kru.', 12);
  } else {
    refreshMissionCard();
    speak(crewMember(job.lead).name, job.closer, 6);
  }
}

function attemptMission() {
  const job = missionNow();
  if (!job || run.complete) return;
  const reach = run.mode === 'air' ? 48 : run.mode === 'car' ? 24 : 17;
  if (flatDistance(run, job.point) > reach) {
    toast('DEKATI TITIK MISSI DULU', 2);
    return;
  }
  if (job.id === 'm4' && run.mode !== 'air') {
    toast('MISSI INI BUTUH HELIKOPTER — TEKAN H', 3);
    return;
  }
  awardMission();
}

function setMode(mode) {
  run.mode = mode;
  streetCar.visible = mode === 'car';
  helicopter.craft.visible = mode === 'air';
  hero.visible = mode === 'foot';
  if (mode !== 'air') {
    run.searchlight = false;
    run.altitude = 0;
  }
}

function mount(kind) {
  if (kind === 'air' && flatDistance(run, STREET_GRID.helipad) > 68 && run.mission < 3) {
    toast('HELIKOPTER HANYA DI HELIPAD TELUK ARUNA', 2.5);
    return;
  }
  setMode(kind);
  if (kind === 'air') {
    if (run.altitude < 8) run.altitude = 24;
    toast('HELI AKTIF — SPACE/C NAIK/TURUN, L SOROTAN', 4);
  } else {
    streetCar.position.set(run.x, 0, run.z);
    streetCar.rotation.y = run.heading;
    toast('MOBIL AKTIF — W/S GAS/REM, A/D BELOK', 3);
  }
}

function dismount() {
  if (run.mode === 'foot') return;
  if (run.mode === 'air' && run.altitude > 12) {
    toast('TURUNKAN HELIKOPTER DULU', 2);
    return;
  }
  setMode('foot');
  run.x += 6;
  run.speed = 0;
  toast('KAMU TURUN', 1.6);
}

function chooseWeapon(index) {
  run.weapon = index;
  toast(`SENJATA: ${WEAPONS[index].label}`, 1.6);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  held.add(event.code);
  if (!run.active) return;
  if (event.code.startsWith('Digit')) {
    const slot = Number(event.code.slice(5)) - 1;
    if (slot >= 0 && slot < WEAPONS.length) chooseWeapon(slot);
  }
  if (event.code === 'KeyR') {
    run.station = (run.station + 1) % RADIO_CHANNELS.length;
    refreshRadio();
  }
  if (event.code === 'KeyM') {
    run.tuned = !run.tuned;
    refreshRadio();
  }
  if (event.code === 'KeyE') attemptMission();
  if (event.code === 'KeyF') {
    if (run.mode === 'foot') mount('car');
    else dismount();
  }
  if (event.code === 'KeyH') {
    if (run.mode === 'air') dismount();
    else mount('air');
  }
  if (event.code === 'KeyL' && run.mode === 'air') {
    run.searchlight = !run.searchlight;
    toast(run.searchlight ? 'SOROTAN AKTIF' : 'SOROTAN DIMATIKAN', 1.5);
  }
  if (event.code === 'ControlLeft' && run.mode !== 'air') shoot();
  if (event.code === 'KeyP') run.paused = !run.paused;
});
window.addEventListener('keyup', (event) => held.delete(event.code));
screen.addEventListener('mousedown', (event) => {
  if (event.button === 0) shoot();
});
panel.begin.addEventListener('click', () => {
  run.active = true;
  run.tuned = true;
  panel.intro.classList.add('hidden');
  igniteRadio();
  refreshMissionCard();
  refreshRadio();
  toast(`${MISSIONS[0].title} — ${MISSIONS[0].objective}`, 4);
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

function placeCamera(delta) {
  let wanted;
  let focus;
  if (run.vista) {
    const view = run.vista;
    const drift = Math.sin(run.clock * 0.14) * 16;
    wanted = new THREE.Vector3(view.eye[0] + drift, view.eye[1], view.eye[2] - drift * 0.4);
    focus = new THREE.Vector3(view.focus[0], view.focus[1], view.focus[2]);
  } else if (run.mode === 'air') {
    const facing = new THREE.Vector3(Math.sin(run.heading), 0, Math.cos(run.heading));
    wanted = new THREE.Vector3(run.x, run.altitude, run.z)
      .addScaledVector(facing, -46)
      .add(new THREE.Vector3(0, 20, 0));
    focus = new THREE.Vector3(run.x, run.altitude - 22, run.z)
      .addScaledVector(facing, 28);
  } else {
    const behind = run.mode === 'car' ? 21 : 15;
    const height = run.mode === 'car' ? 9 : 7.5;
    const facing = new THREE.Vector3(Math.sin(run.heading), 0, Math.cos(run.heading));
    wanted = new THREE.Vector3(run.x, run.altitude, run.z)
      .addScaledVector(facing, -behind)
      .add(new THREE.Vector3(0, height, 0));
    focus = new THREE.Vector3(run.x, run.altitude + 2, run.z)
      .addScaledVector(facing, 8);
  }
  const blend = run.clock <= FRAME_TIME * 2 || run.vista ? 0.045 : Math.min(1, delta * 5.5);
  run.eye.lerp(wanted, blend);
  run.focus.lerp(focus, blend);
  camera.position.copy(run.eye);
  camera.lookAt(run.focus);
}

function drawMinimap() {
  const pen = mapPen;
  const width = panel.map.width;
  const height = panel.map.height;
  const middle = width / 2;
  const zoom = 0.3;
  const px = (x) => middle + (x - run.x) * zoom;
  const py = (z) => middle + (z - run.z) * zoom;

  pen.clearRect(0, 0, width, height);
  pen.save();
  pen.beginPath();
  pen.arc(middle, middle, middle - 3, 0, TURN);
  pen.clip();
  pen.fillStyle = '#1c2134';
  pen.fillRect(0, 0, width, height);
  pen.fillStyle = '#174555';
  pen.fillRect(0, 0, px(STREET_GRID.shoreline), height);
  pen.fillRect(
    px(STREET_GRID.channel.west), py(STREET_GRID.channel.z - STREET_GRID.channel.half),
    (STREET_GRID.channel.east - STREET_GRID.channel.west) * zoom,
    STREET_GRID.channel.half * 2 * zoom,
  );

  for (const district of DISTRICTS) {
    pen.beginPath();
    pen.arc(px(district.center.x), py(district.center.z), district.radius * zoom, 0, TURN);
    pen.strokeStyle = district.color;
    pen.globalAlpha = 0.6;
    pen.lineWidth = 1.4;
    pen.stroke();
    pen.globalAlpha = 1;
    pen.font = 'bold 13px sans-serif';
    pen.textAlign = 'center';
    pen.strokeStyle = 'rgba(9,11,22,0.85)';
    pen.lineWidth = 3;
    pen.strokeText(district.name, px(district.center.x), py(district.center.z) - 13);
    pen.fillStyle = district.color;
    pen.fillText(district.name, px(district.center.x), py(district.center.z) - 13);
  }

  for (const road of city.roads) {
    pen.beginPath();
    pen.moveTo(px(road.ax), py(road.az));
    pen.lineTo(px(road.bx), py(road.bz));
    pen.strokeStyle = road.kind === 'ring' ? '#6a6d93' : '#4d546e';
    pen.lineWidth = road.kind === 'ring' ? 3 : 2;
    pen.stroke();
  }
  pen.fillStyle = '#ffd58a';
  pen.fillRect(px(STREET_GRID.helipad.x) - 4, py(STREET_GRID.helipad.z) - 4, 8, 8);

  if (!run.complete) {
    const job = missionNow();
    const mx = px(job.point.x);
    const my = py(job.point.z);
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
  for (const unit of pursuers) {
    pen.beginPath();
    pen.arc(px(unit.x), py(unit.z), 3, 0, TURN);
    pen.fill();
  }

  pen.save();
  pen.translate(middle, middle);
  pen.rotate(Math.PI - run.heading);
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
  pen.fillText('N', middle, 12);
}

function drawSpeedometer() {
  const pen = gaugePen;
  const width = panel.gauge.width;
  const height = panel.gauge.height;
  const cx = width / 2;
  const cy = height - 12;
  const radius = 76;
  const start = Math.PI;
  const sweep = Math.PI;
  const displayed = run.mode === 'air' ? Math.abs(run.speed) * 3.2 : Math.abs(run.speed) * 3.6;
  const amount = clamp(displayed / 240, 0, 1);

  pen.clearRect(0, 0, width, height);
  pen.lineCap = 'round';
  pen.beginPath();
  pen.arc(cx, cy, radius, start, start + sweep);
  pen.strokeStyle = 'rgba(255,224,180,0.18)';
  pen.lineWidth = 11;
  pen.stroke();
  pen.beginPath();
  pen.arc(cx, cy, radius, start, start + sweep * amount);
  pen.strokeStyle = run.alert > 2 ? '#ff7d92' : '#69e7f5';
  pen.lineWidth = 11;
  pen.stroke();
  pen.strokeStyle = 'rgba(255,230,196,0.6)';
  pen.lineWidth = 1.5;
  for (let notch = 0; notch <= 8; notch += 1) {
    const angle = start + (notch / 8) * sweep;
    pen.beginPath();
    pen.moveTo(cx + Math.cos(angle) * (radius - 12), cy + Math.sin(angle) * (radius - 12));
    pen.lineTo(cx + Math.cos(angle) * (radius + 11), cy + Math.sin(angle) * (radius + 11));
    pen.stroke();
  }
  const needle = start + sweep * amount;
  pen.strokeStyle = '#fff0cc';
  pen.lineWidth = 3;
  pen.beginPath();
  pen.moveTo(cx, cy);
  pen.lineTo(cx + Math.cos(needle) * (radius - 8), cy + Math.sin(needle) * (radius - 8));
  pen.stroke();
  pen.fillStyle = '#fff0cc';
  pen.beginPath();
  pen.arc(cx, cy, 4, 0, TURN);
  pen.fill();
  panel.speed.textContent = `${Math.round(displayed)}`;
}

function refreshHud() {
  const zone = DISTRICTS.find((entry) => entry.id === city.districtAt(run.x, run.z)) ?? DISTRICTS[0];
  panel.district.textContent = zone.name;
  panel.districtCaption.textContent = zone.caption;
  panel.wallet.textContent = money(run.cash);
  panel.alertWord.textContent = ALERT_TIERS[run.alert].label;
  panel.stars.forEach((star, index) => star.classList.toggle('lit', index < run.alert));
  panel.healthFill.style.width = `${run.health}%`;
  panel.armorFill.style.width = `${run.armor}%`;
  panel.slots.forEach((slot, index) => {
    slot.classList.toggle('selected', index === run.weapon);
    const counter = slot.querySelector('.slot-ammo');
    if (counter) counter.textContent = run.ammo[index] === Infinity ? '∞' : String(run.ammo[index]);
  });
  panel.vehicle.textContent = run.mode === 'air'
    ? `HELICOPTER ${run.searchlight ? '/ SOROTAN ON' : ''}`
    : run.mode === 'car' ? 'MOBIL / JALANAN KOTA' : 'JALAN KAKI';
  const job = missionNow();
  const nearby = !run.complete && flatDistance(run, job.point)
    < (run.mode === 'air' ? 48 : 24);
  panel.prompt.classList.toggle('visible', nearby);
  if (run.clock > run.toastUntil) panel.toast.classList.remove('visible');
  if (run.clock > run.talkUntil) panel.dialogue.classList.remove('visible');
}

function ringPoint(angle) {
  return {
    x: STREET_GRID.belt.cx + Math.cos(angle) * STREET_GRID.belt.rx,
    z: STREET_GRID.belt.cz + Math.sin(angle) * STREET_GRID.belt.rz,
  };
}

function stageShot(mode) {
  panel.intro.classList.add('hidden');
  run.active = true;
  if (mode === 'harbor') {
    run.x = 224;
    run.z = 96;
    run.heading = 0.5;
    run.vista = { eye: [470, 170, 400], focus: [155, 45, 25] };
    speak('Ara', crewMember('ara').line, 14);
  } else if (mode === 'pursuit') {
    setMode('car');
    const spot = ringPoint(-1.1);
    run.x = spot.x;
    run.z = spot.z;
    run.heading = 1.07;
    run.speed = 42;
    raiseAlert(3, true);
    for (let index = 0; index < 3; index += 1) {
      deployPursuer(spot.x + 28 + index * 22, spot.z - 38 - index * 24);
    }
    speak('Dimas', crewMember('dimas').line, 14);
  } else if (mode === 'beam') {
    run.mission = 3;
    setMode('air');
    run.x = -230;
    run.z = -90;
    run.altitude = 72;
    run.heading = 2.2;
    run.speed = 18;
    run.searchlight = true;
    inAir(0);
    refreshMissionCard();
    speak('Ara', MISSIONS[3].opener, 14);
  } else if (mode === 'tide') {
    setMode('foot');
    run.x = STREET_GRID.helipad.x + 2;
    run.z = STREET_GRID.helipad.z - 32;
    run.heading = 0;
    run.mission = MISSIONS.length - 1;
    run.alert = 2;
    refreshMissionCard();
    helicopter.craft.position.set(STREET_GRID.helipad.x + 16, 2.6, STREET_GRID.helipad.z + 8);
    helicopter.craft.rotation.set(0, 0.7, 0);
    helicopter.craft.visible = true;
    CREW.forEach((person, index) => {
      const angle = (index / CREW.length) * TURN;
      crewFigures.get(person.id).position.set(
        STREET_GRID.helipad.x + Math.cos(angle) * 34,
        0,
        STREET_GRID.helipad.z + Math.sin(angle) * 34,
      );
    });
    run.vista = {
      eye: [STREET_GRID.helipad.x + 92, 108, STREET_GRID.helipad.z + 118],
      focus: [STREET_GRID.helipad.x, 4, STREET_GRID.helipad.z],
    };
    speak('Sinta', MISSIONS[MISSIONS.length - 1].opener, 14);
  }
  refreshRadio();
  if (SHOT_CAPTIONS[mode]) document.title = `${SHOT_CAPTIONS[mode]} — KOTA ARUNA`;
}

refreshMissionCard();
refreshRadio();
if (photoMode) stageShot(photoMode);

let previous = performance.now() / 1000;
let leftover = 0;
let firstFrame = true;
function animateFrame(milliseconds) {
  const now = milliseconds / 1000;
  let elapsed = now - previous;
  previous = now;
  if (!Number.isFinite(elapsed) || elapsed <= 0) elapsed = FRAME_TIME;
  if (elapsed > 0.2) elapsed = 0.2;
  leftover += elapsed;
  while (leftover >= FRAME_TIME) {
    leftover -= FRAME_TIME;
    if (run.active && !run.paused) {
      run.clock += FRAME_TIME;
      city.tick(run.clock);
      run.shotTimer = Math.max(0, run.shotTimer - FRAME_TIME);
      if (run.mode === 'foot') onFoot(FRAME_TIME);
      else if (run.mode === 'car') inCar(FRAME_TIME);
      else inAir(FRAME_TIME);
      stroll(FRAME_TIME);
      updatePursuers(FRAME_TIME);
      updateSparks(FRAME_TIME);
      if (run.alert > 0 && run.clock - run.lastCrime > 16) {
        run.calm += FRAME_TIME;
        if (run.calm > 9) {
          run.alert -= 1;
          run.calm = 0;
        }
      }
      if (run.health < 100) run.health = Math.min(100, run.health + FRAME_TIME / 3);
    }
  }

  waypointRing.rotation.z += elapsed * 0.6;
  waypointRing.scale.setScalar(1 + Math.sin(run.clock * 3) * 0.06);
  const lampOn = run.searchlight && run.mode === 'air';
  beamLight.intensity = lampOn ? 9 : 0;
  beamCone.visible = lampOn;

  placeCamera(elapsed);
  refreshHud();
  drawMinimap();
  drawSpeedometer();
  renderer.render(city.scene, camera);
  if (firstFrame) {
    firstFrame = false;
    document.body.dataset.ready = '1';
  }
  window.requestAnimationFrame(animateFrame);
}
window.requestAnimationFrame(animateFrame);

window.__KOTA_ARUNA = { run, city, camera, renderer, crewFigures, stageShot };
