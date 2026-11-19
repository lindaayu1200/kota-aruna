import * as THREE from 'three';
import {
  CREW,
  DISTRICTS,
  GRID,
  GUNS,
  HEAT,
  JOBS,
  SHOT_CAPTIONS,
  STATIONS,
  START_CASH,
  STEP,
} from './config.js';
import { createWorld } from './city.js';
import { makeRng } from './random.js';

const TAU = Math.PI * 2;
const search = new URLSearchParams(window.location.search);
const givenSeed = Number.parseInt(search.get('seed') ?? '1337', 10);
const seed = Number.isFinite(givenSeed) ? givenSeed : 1337;
const photoMode = search.get('shot') ?? '';
const propRng = makeRng(seed + 811);

const byId = (id) => document.getElementById(id);
const view = byId('view');
const ui = {
  intro: byId('intro'),
  launch: byId('launch'),
  jobTag: byId('job-tag'),
  jobNumber: byId('job-number'),
  jobTitle: byId('job-headline'),
  jobStory: byId('job-story'),
  jobGoal: byId('job-task'),
  jobPay: byId('job-pay'),
  zone: byId('zone-name'),
  zoneNote: byId('zone-note'),
  cash: byId('cash'),
  heatName: byId('heat-label'),
  stars: Array.from(document.querySelectorAll('.heat-star')),
  life: byId('life-fill'),
  vest: byId('vest-fill'),
  slots: Array.from(document.querySelectorAll('.gun-slot')),
  station: byId('station-name'),
  dial: byId('station-dial'),
  mood: byId('station-mood'),
  stationState: byId('station-state'),
  craft: byId('vehicle-readout'),
  speedText: byId('speed-readout'),
  map: byId('map-canvas'),
  dialCanvas: byId('dial-canvas'),
  hint: byId('hint'),
  notice: byId('bulletin'),
  talkBox: byId('talk'),
  talkName: byId('talk-name'),
  talkText: byId('talk-text'),
};
const mapBrush = ui.map.getContext('2d');
const dialBrush = ui.dialCanvas.getContext('2d');

const renderer = new THREE.WebGLRenderer({
  canvas: view,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
const lens = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.4, 4600);
const world = createWorld(THREE, seed);

const session = {
  travel: 'foot',
  x: 238,
  z: 86,
  alt: 0,
  yaw: -0.5,
  speed: 0,
  rise: 0,
  bank: 0,
  pitch: 0,
  rotor: 0,
  money: START_CASH,
  heat: 0,
  cool: 0,
  crimeAt: -999,
  life: 100,
  vest: 50,
  gun: 1,
  ammo: GUNS.map((gun) => gun.stock),
  shotClock: 0,
  station: 0,
  stationOn: false,
  job: 0,
  finished: false,
  beam: false,
  clock: 0,
  playing: Boolean(photoMode),
  frozen: false,
  noticeUntil: 0,
  talkUntil: 0,
  eye: new THREE.Vector3(260, 24, 130),
  gaze: new THREE.Vector3(210, 4, 70),
  vista: null,
};

function plateTexture(label, tint) {
  const board = document.createElement('canvas');
  board.width = 320;
  board.height = 80;
  const brush = board.getContext('2d');
  brush.fillStyle = 'rgba(16,12,28,0.72)';
  brush.fillRect(0, 0, 320, 80);
  brush.strokeStyle = tint;
  brush.lineWidth = 4;
  brush.strokeRect(3, 3, 314, 74);
  brush.fillStyle = '#fff2d8';
  brush.font = 'bold 38px sans-serif';
  brush.textAlign = 'center';
  brush.textBaseline = 'middle';
  brush.fillText(label, 160, 42);
  const texture = new THREE.CanvasTexture(board);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildHuman(tint, badgeText) {
  const actor = new THREE.Group();
  const shirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.78, 1.9, 8),
    new THREE.MeshStandardMaterial({ color: tint, roughness: 0.75 }),
  );
  shirt.position.y = 1.6;
  actor.add(shirt);
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#e8b98e', roughness: 0.9 }),
  );
  skull.position.y = 3;
  actor.add(skull);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.35, 0.4),
      new THREE.MeshStandardMaterial({ color: '#202235', roughness: 0.9 }),
    );
    leg.position.set(side * 0.33, 0.68, 0);
    actor.add(leg);
  }
  if (badgeText) {
    const plate = new THREE.Sprite(new THREE.SpriteMaterial({
      map: plateTexture(badgeText.toUpperCase(), tint),
      transparent: true,
      depthTest: false,
      toneMapped: false,
    }));
    plate.position.y = 4.6;
    plate.scale.set(17, 4.4, 1);
    actor.add(plate);
  }
  return actor;
}

function buildCar(paint, siren = false) {
  const auto = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.05, 5.1),
    new THREE.MeshStandardMaterial({ color: paint, roughness: 0.38, metalness: 0.45 }),
  );
  shell.position.y = 1.1;
  auto.add(shell);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.85, 2.4),
    new THREE.MeshStandardMaterial({
      color: siren ? '#172238' : '#8ad9ef', roughness: 0.25, metalness: 0.35,
    }),
  );
  cabin.position.set(0, 1.95, -0.25);
  auto.add(cabin);
  const wheelShape = new THREE.CylinderGeometry(0.58, 0.58, 0.38, 14);
  wheelShape.rotateZ(Math.PI / 2);
  const rubber = new THREE.MeshStandardMaterial({ color: '#12131b', roughness: 0.95 });
  for (const side of [-1, 1]) {
    for (const depth of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(wheelShape, rubber);
      wheel.position.set(side * 1.28, 0.62, depth);
      auto.add(wheel);
    }
  }
  const frontLamp = new THREE.MeshBasicMaterial({ color: '#ffe7b8', toneMapped: false });
  const tailLamp = new THREE.MeshBasicMaterial({ color: '#ff4b5d', toneMapped: false });
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.14), frontLamp);
    head.position.set(side * 0.78, 1.2, 2.58);
    auto.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.14), tailLamp);
    tail.position.set(side * 0.78, 1.2, -2.58);
    auto.add(tail);
  }
  if (siren) {
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.22, 0.45),
      new THREE.MeshBasicMaterial({ color: '#5cc8ff', toneMapped: false }),
    );
    blue.position.set(-0.35, 2.55, -0.2);
    auto.add(blue);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.22, 0.45),
      new THREE.MeshBasicMaterial({ color: '#ff4d6d', toneMapped: false }),
    );
    red.position.set(0.35, 2.55, 0.3);
    auto.add(red);
  }
  return auto;
}

function buildChopper() {
  const craft = new THREE.Group();
  const pale = new THREE.MeshStandardMaterial({ color: '#e8e3dc', roughness: 0.5, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1d2230', roughness: 0.5, metalness: 0.3 });
  const hull = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 14), pale);
  hull.scale.set(1.05, 0.85, 2);
  hull.position.y = 2.1;
  craft.add(hull);
  const windshield = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, 16, 12),
    new THREE.MeshStandardMaterial({
      color: '#8ad9ef', roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.86,
    }),
  );
  windshield.scale.set(1, 0.8, 1.05);
  windshield.position.set(0, 2.25, 2.05);
  craft.add(windshield);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 6.5), pale);
  tail.position.set(0, 2.35, -5.1);
  craft.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 1.5), pale);
  fin.position.set(0, 3.3, -8);
  craft.add(fin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 12), dark);
  mast.position.y = 4.1;
  craft.add(mast);
  const topRotor = new THREE.Group();
  topRotor.position.y = 4.45;
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * TAU;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: '#2b2d39', roughness: 0.7, metalness: 0.4 }),
    );
    blade.rotation.y = angle;
    blade.position.set(Math.sin(angle) * 6, 0, Math.cos(angle) * 6);
    topRotor.add(blade);
  }
  craft.add(topRotor);
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
    new THREE.MeshBasicMaterial({ color: '#ff63a8', toneMapped: false }),
  );
  stripe.position.set(0, 1.35, 0.5);
  craft.add(stripe);
  return { body: craft, topRotor, tailRotor };
}

const walker = buildHuman('#ffd68f', null);
world.scene.add(walker);

const roadster = buildCar('#ff6f91');
roadster.position.set(246, 0, 98);
roadster.rotation.y = -0.5;
world.scene.add(roadster);

const chopper = buildChopper();
chopper.body.visible = false;
world.scene.add(chopper.body);

const beamAim = new THREE.Object3D();
world.scene.add(beamAim);
const beamLamp = new THREE.SpotLight('#fff1c9', 0, 260, Math.PI / 8, 0.42, 1.1);
beamLamp.target = beamAim;
world.scene.add(beamLamp);
const coneShape = new THREE.ConeGeometry(20, 90, 20, 1, true);
coneShape.translate(0, -45, 0);
const beamCone = new THREE.Mesh(
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
beamCone.visible = false;
world.scene.add(beamCone);

const crewActors = new Map();
CREW.forEach((member) => {
  const assignment = JOBS.find((job) => job.lead === member.key) ?? JOBS[0];
  const actor = buildHuman(member.tint, member.name);
  actor.position.set(assignment.point.x + 9, 0, assignment.point.z + 7);
  actor.rotation.y = CREW.indexOf(member);
  world.scene.add(actor);
  crewActors.set(member.key, actor);
});

const crowd = [];
for (let index = 0; index < 18; index += 1) {
  const stranger = buildHuman(propRng.pick(['#d7a4c8', '#8bd0d6', '#e3c78b', '#b6a4dc']), null);
  const x = propRng.range(-200, 380);
  const z = propRng.range(-360, 360);
  stranger.position.set(x, 0, z);
  world.scene.add(stranger);
  crowd.push({ mesh: stranger, x, z, yaw: propRng.range(0, TAU), pace: propRng.range(0.8, 2.1) });
}

const officers = [];
const flashes = [];

const waypoint = new THREE.Group();
const waypointRing = new THREE.Mesh(
  new THREE.TorusGeometry(9.5, 0.7, 10, 48),
  new THREE.MeshBasicMaterial({ color: '#5ceeff', toneMapped: false }),
);
waypointRing.rotation.x = -Math.PI / 2;
waypointRing.position.y = 0.8;
waypoint.add(waypointRing);
const waypointBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 5.5, 105, 14, 1, true),
  new THREE.MeshBasicMaterial({
    color: '#5ceeff',
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
);
waypointBeam.position.y = 52;
waypoint.add(waypointBeam);
world.scene.add(waypoint);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const flatGap = (x, z, point) => Math.hypot(x - point.x, z - point.z);
const currentJob = () => JOBS[Math.min(session.job, JOBS.length - 1)];
const findCrew = (key) => CREW.find((member) => member.key === key) ?? CREW[0];

function bulletin(text, seconds = 3) {
  ui.notice.textContent = text;
  ui.notice.classList.add('show');
  session.noticeUntil = session.clock + seconds;
}

function speak(who, words, seconds = 6) {
  ui.talkName.textContent = who.toUpperCase();
  ui.talkText.textContent = words;
  ui.talkBox.classList.add('show');
  session.talkUntil = session.clock + seconds;
}

function syncJob() {
  const job = currentJob();
  ui.jobTag.textContent = session.finished ? 'CERITA SELESAI' : 'CERITA KOTA';
  ui.jobNumber.textContent = session.finished ? '07 / 07' : `${String(job.number).padStart(2, '0')} / 07`;
  ui.jobTitle.textContent = job.title;
  ui.jobStory.textContent = job.brief;
  ui.jobGoal.textContent = job.goal;
  ui.jobPay.textContent = `$${job.pay.toLocaleString('en-US')}`;
  waypoint.position.set(job.point.x, 0, job.point.z);
  waypoint.visible = !session.finished;
  if (session.job === JOBS.length - 1 && !session.finished) {
    speak('Sinta', job.intro, 9);
  }
}

function raiseHeat(amount, quiet = false) {
  session.heat = clamp(session.heat + amount, 0, HEAT.length - 1);
  session.cool = 0;
  session.crimeAt = session.clock;
  if (!quiet && amount > 0) {
    bulletin(`POLISI MENGEJAR — ${HEAT[session.heat].label}`, 2.5);
  }
}

function blocked(x, z, radius = 2) {
  if (world.overSea(x, z) && !world.onRoad(x, z)) return true;
  return world.blocks.some((block) => Math.abs(x - block.x) < block.halfX + radius
    && Math.abs(z - block.z) < block.halfZ + radius);
}

function slide(fromX, fromZ, toX, toZ, radius) {
  if (!blocked(toX, toZ, radius)) return { x: toX, z: toZ, bump: false };
  if (!blocked(toX, fromZ, radius)) return { x: toX, z: fromZ, bump: true };
  if (!blocked(fromX, toZ, radius)) return { x: fromX, z: toZ, bump: true };
  return { x: fromX, z: fromZ, bump: true };
}

function radioTone(context, output, hz, length, volume, wave, when) {
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
function startRadio() {
  if (radioDeck) return;
  const Engine = window.AudioContext || window.webkitAudioContext;
  if (!Engine) return;
  try {
    const context = new Engine();
    const volume = context.createGain();
    volume.gain.value = 0.09;
    volume.connect(context.destination);
    radioDeck = { context, volume, beat: 0 };
    window.setInterval(strumRadio, 150);
  } catch {
    radioDeck = null;
  }
}

function strumRadio() {
  if (!radioDeck || !session.stationOn || session.frozen) return;
  const context = radioDeck.context;
  if (context.state === 'suspended') return;
  const station = STATIONS[session.station];
  const beat = 60 / station.pulse;
  const when = context.currentTime + 0.03;
  const step = radioDeck.beat % 16;
  const scale = [0, 3, 5, 7, 10, 12, 15];
  if (step % 4 === 0) radioTone(context, radioDeck.volume, 58, beat * 0.55, 0.65, 'sine', when);
  if (step % 8 === 4) radioTone(context, radioDeck.volume, 145, beat * 0.35, 0.22, 'triangle', when);
  if (step % 2 === 0) radioTone(context, radioDeck.volume, 3400, beat * 0.08, 0.06, 'square', when);
  const bass = station.hertz / 2 * Math.pow(2, scale[step % scale.length] / 12);
  radioTone(context, radioDeck.volume, bass, beat * 0.8, 0.2, 'sawtooth', when);
  if (step === 2 || step === 6 || step === 11) {
    const lead = station.hertz * Math.pow(2, scale[(step + session.station) % scale.length] / 12);
    radioTone(context, radioDeck.volume, lead, beat * 1.1, 0.12, 'triangle', when);
  }
  radioDeck.beat += 1;
}

function syncStation() {
  const station = STATIONS[session.station];
  ui.station.textContent = station.label;
  ui.dial.textContent = `${station.dial} FM`;
  ui.mood.textContent = station.mood;
  ui.stationState.textContent = session.stationOn ? '● ON AIR' : '○ OFF';
}

function tracer(from, to, color = '#ffe2a4') {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false }),
  );
  world.scene.add(line);
  flashes.push({ mesh: line, remaining: 0.14, total: 0.14, kind: 'line' });
}

function firefly(place, color = '#ffb060', size = 3) {
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(size, 10, 8),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  orb.position.copy(place);
  world.scene.add(orb);
  flashes.push({ mesh: orb, remaining: 0.35, total: 0.35, kind: 'orb' });
}

function fire() {
  if (!session.playing || session.shotClock > 0) return;
  const gun = GUNS[session.gun];
  if (session.ammo[session.gun] <= 0) {
    bulletin('AMMO HABIS — GANTI SENJATA 1-4', 2);
    return;
  }
  session.shotClock = gun.delay;
  if (session.ammo[session.gun] !== Infinity) session.ammo[session.gun] -= 1;

  const muzzle = new THREE.Vector3(
    session.x + Math.sin(session.yaw) * 2,
    session.travel === 'air' ? session.alt + 1.8 : 2.2,
    session.z + Math.cos(session.yaw) * 2,
  );
  const heading = new THREE.Vector3(Math.sin(session.yaw), 0, Math.cos(session.yaw));
  const reach = gun.key === 'fists' ? 5 : 95;
  const end = muzzle.clone().addScaledVector(heading, reach);
  let target = null;
  let nearest = Infinity;
  const candidates = [
    ...crowd.filter((person) => person.mesh.visible).map((person) => person.mesh),
    ...officers.map((unit) => unit.mesh),
  ];
  for (const body of candidates) {
    const offset = body.position.clone().sub(muzzle);
    const along = offset.dot(heading);
    if (along < 0 || along > reach) continue;
    const sideways = offset.addScaledVector(heading, -along).length();
    const isCop = officers.some((unit) => unit.mesh === body);
    if (sideways < (isCop ? 4 : 2.4) && along < nearest) {
      target = body;
      nearest = along;
    }
  }
  if (target) {
    end.copy(target.position);
    end.y += 1.4;
    firefly(end.clone(), '#ff7b7b', 1.6);
    const cop = officers.find((unit) => unit.mesh === target);
    if (cop) {
      cop.health -= gun.harm;
      if (cop.health <= 0) {
        world.scene.remove(cop.mesh);
        officers.splice(officers.indexOf(cop), 1);
        session.money += 220;
        bulletin('+$220 — MOBIL POLISI DINONAKTIFKAN', 2);
      }
    } else {
      const civilian = crowd.find((person) => person.mesh === target);
      if (civilian) {
        civilian.mesh.visible = false;
        raiseHeat(2);
      }
    }
  }
  tracer(muzzle, end, gun.key === 'launcher' ? '#ff8ef0' : '#ffe2a4');
  firefly(muzzle, '#fff0bd', 1.1);
  raiseHeat(1);
}

function deployOfficer(x, z) {
  const car = buildCar('#e8edf5', true);
  const px = x ?? clamp(session.x + propRng.range(-175, 175), -290, 450);
  const pz = z ?? clamp(session.z + propRng.range(-175, 175), -430, 430);
  car.position.set(px, 0, pz);
  world.scene.add(car);
  officers.push({ mesh: car, x: px, z: pz, yaw: propRng.range(0, TAU), speed: 0, health: 100 });
}

function updateOfficers(delta) {
  if (officers.length < session.heat * 2 && session.clock - session.crimeAt > 2
    && Math.floor(session.clock * 2) % 2 === 0) {
    deployOfficer();
  }
  for (const unit of officers) {
    const dx = session.x - unit.x;
    const dz = session.z - unit.z;
    const wanted = Math.atan2(dx, dz);
    let turn = wanted - unit.yaw;
    while (turn > Math.PI) turn -= TAU;
    while (turn < -Math.PI) turn += TAU;
    unit.yaw += clamp(turn, -1.9 * delta, 1.9 * delta);
    unit.speed = Math.min(34, unit.speed + 17 * delta);
    const next = slide(unit.x, unit.z,
      unit.x + Math.sin(unit.yaw) * unit.speed * delta,
      unit.z + Math.cos(unit.yaw) * unit.speed * delta, 2.2);
    unit.x = next.x;
    unit.z = next.z;
    unit.mesh.position.set(unit.x, 0, unit.z);
    unit.mesh.rotation.y = unit.yaw;
    if (Math.hypot(dx, dz) < 6 && session.travel !== 'air') {
      session.life = Math.max(0, session.life - 9 * delta);
      raiseHeat(1, true);
    }
  }
}

function updateFlashes(delta) {
  for (let index = flashes.length - 1; index >= 0; index -= 1) {
    const spark = flashes[index];
    spark.remaining -= delta;
    const age = 1 - spark.remaining / spark.total;
    if (spark.kind === 'orb') {
      spark.mesh.scale.setScalar(1 + age * 2.4);
      spark.mesh.material.opacity = Math.max(0, 1 - age) * 0.8;
    } else {
      spark.mesh.material.opacity = Math.max(0, 1 - age);
    }
    if (spark.remaining <= 0) {
      world.scene.remove(spark.mesh);
      spark.mesh.geometry.dispose();
      spark.mesh.material.dispose();
      flashes.splice(index, 1);
    }
  }
}

function walkStep(delta) {
  const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const scale = Math.hypot(forward, strafe) || 1;
  const pace = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 13 : 7.5;
  const moving = forward !== 0 || strafe !== 0;
  if (moving) {
    const vx = (Math.sin(session.yaw) * forward + Math.cos(session.yaw) * strafe) / scale;
    const vz = (Math.cos(session.yaw) * forward - Math.sin(session.yaw) * strafe) / scale;
    session.yaw = Math.atan2(vx, vz);
    const moved = slide(session.x, session.z, session.x + vx * pace * delta, session.z + vz * pace * delta, 1.4);
    session.x = moved.x;
    session.z = moved.z;
  }
  session.speed = moving ? pace : 0;
  walker.position.set(session.x, 0, session.z);
  walker.rotation.y = session.yaw;
}

function driveStep(delta) {
  const gas = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const wheel = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const dirt = !world.onRoad(session.x, session.z);
  const ceiling = dirt ? 24 : 54;
  if (gas > 0) session.speed += (dirt ? 15 : 27) * delta;
  else if (gas < 0) session.speed -= 38 * delta;
  else session.speed *= 1 - 1.1 * delta;
  if (keys.has('Space')) session.speed *= 1 - 2.5 * delta;
  session.speed = clamp(session.speed, -12, ceiling);
  const grip = keys.has('Space') ? 2.2 : 1;
  session.yaw += wheel * grip * (0.55 + Math.min(1.3, Math.abs(session.speed) / 22)) * delta
    * (session.speed < -0.5 ? -1 : 1);
  const moved = slide(session.x, session.z,
    session.x + Math.sin(session.yaw) * session.speed * delta,
    session.z + Math.cos(session.yaw) * session.speed * delta, 2.4);
  if (moved.bump && Math.abs(session.speed) > 14) {
    session.speed *= -0.24;
    raiseHeat(1, true);
    bulletin('TABRAKAN — BADAN MOBIL RUSAK', 1.6);
    session.life = Math.max(0, session.life - 3);
  }
  session.x = moved.x;
  session.z = moved.z;
  roadster.position.set(session.x, 0, session.z);
  roadster.rotation.y = session.yaw;
  roadster.rotation.z = -wheel * Math.min(0.07, Math.abs(session.speed) * 0.0018);
}

function flyStep(delta) {
  const push = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const turn = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const lift = (keys.has('Space') ? 1 : 0)
    - (keys.has('KeyC') || keys.has('ControlLeft') ? 1 : 0);
  session.yaw += turn * 1.35 * delta;
  session.speed = clamp(session.speed + push * 26 * delta - session.speed * 0.65 * delta, -18, 72);
  session.rise = clamp(session.rise + lift * 22 * delta - session.rise * 1.4 * delta, -24, 26);
  session.alt = clamp(session.alt + session.rise * delta, 9, 240);
  session.x = clamp(session.x + Math.sin(session.yaw) * session.speed * delta, -560, 500);
  session.z = clamp(session.z + Math.cos(session.yaw) * session.speed * delta, -500, 500);
  session.rotor += delta * (26 + Math.abs(session.speed) * 0.15);
  session.pitch += (-push * 0.13 - session.pitch) * Math.min(1, delta * 4);
  session.bank += (turn * 0.18 - session.bank) * Math.min(1, delta * 4);
  chopper.body.position.set(session.x, session.alt, session.z);
  chopper.body.rotation.set(session.pitch, session.yaw, session.bank, 'YXZ');
  chopper.topRotor.rotation.y = session.rotor;
  chopper.tailRotor.rotation.x = session.rotor * 2.4;

  const facing = new THREE.Vector3(Math.sin(session.yaw), 0, Math.cos(session.yaw));
  const aimAt = new THREE.Vector3(session.x, Math.max(1, session.alt - 45), session.z)
    .addScaledVector(facing, 34);
  beamAim.position.copy(aimAt);
  beamAim.updateMatrixWorld();
  beamLamp.position.set(session.x, session.alt + 1.5, session.z);
  const vector = aimAt.clone().sub(beamLamp.position).normalize();
  beamCone.position.copy(beamLamp.position);
  beamCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), vector);
}

function strollStep(delta) {
  for (const person of crowd) {
    if (!person.mesh.visible) continue;
    person.yaw += Math.sin(session.clock * 0.7 + person.x) * 0.4 * delta;
    const moved = slide(person.x, person.z,
      person.x + Math.sin(person.yaw) * person.pace * delta,
      person.z + Math.cos(person.yaw) * person.pace * delta, 1);
    if (moved.bump) person.yaw += Math.PI * 0.6;
    person.x = moved.x;
    person.z = moved.z;
    person.mesh.position.set(person.x, 0, person.z);
    person.mesh.rotation.y = person.yaw;
  }
}

function finishJob() {
  if (session.finished || session.job >= JOBS.length) return;
  const job = currentJob();
  session.money += job.pay;
  bulletin(`MISSI SELESAI  +$${job.pay.toLocaleString('en-US')}`, 4);
  if (job.key === 'job-4') session.beam = false;
  if (job.key === 'job-5' || job.key === 'job-6') raiseHeat(2);
  session.job += 1;
  if (session.job >= JOBS.length) {
    session.finished = true;
    ui.jobTag.textContent = 'CERITA SELESAI';
    ui.jobNumber.textContent = '07 / 07';
    ui.jobTitle.textContent = 'PASANG SURUT';
    ui.jobGoal.textContent = 'Kota Aruna selamat — seluruh kru masih utuh';
    ui.jobPay.textContent = '$0';
    speak('Ara', 'Pasang surut. Air balik, kita juga. Terima kasih, kru.', 12);
  } else {
    syncJob();
    speak(findCrew(job.lead).name, job.outro, 6);
  }
}

function tryJob() {
  const job = currentJob();
  if (!job || session.finished) return;
  const range = session.travel === 'air' ? 48 : session.travel === 'car' ? 24 : 17;
  if (flatGap(session.x, session.z, job.point) > range) {
    bulletin('DEKATI TITIK MISSI DULU', 2);
    return;
  }
  if (job.key === 'job-4' && session.travel !== 'air') {
    bulletin('MISSI INI BUTUH HELIKOPTER — TEKAN H', 3);
    return;
  }
  finishJob();
}

function board(kind) {
  if (kind === 'air') {
    const atPad = flatGap(session.x, session.z, GRID.landing) < 68;
    if (!atPad && session.job < 3) {
      bulletin('HELIKOPTER HANYA DI HELIPAD TELUK ARUNA', 2.5);
      return;
    }
    session.travel = 'air';
    if (session.alt < 8) session.alt = 24;
    bulletin('HELI AKTIF — SPACE/C NAIK/TURUN, L SOROTAN', 4);
  } else {
    session.travel = 'car';
    session.alt = 0;
    roadster.position.set(session.x, 0, session.z);
    roadster.rotation.y = session.yaw;
    bulletin('MOBIL AKTIF — W/S GAS/REM, A/D BELOK', 3);
  }
  chopper.body.visible = session.travel === 'air';
  roadster.visible = session.travel === 'car';
  walker.visible = session.travel === 'foot';
}

function disembark() {
  if (session.travel === 'foot') return;
  if (session.travel === 'air' && session.alt > 12) {
    bulletin('TURUNKAN HELIKOPTER DULU', 2);
    return;
  }
  session.travel = 'foot';
  session.alt = 0;
  session.speed = 0;
  session.beam = false;
  session.x += 6;
  chopper.body.visible = false;
  roadster.visible = false;
  walker.visible = true;
  bulletin('KAMU TURUN', 1.6);
}

function selectGun(index) {
  session.gun = index;
  bulletin(`SENJATA: ${GUNS[index].label}`, 1.6);
}

const keys = new Set();
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (!session.playing) return;
  if (event.code.startsWith('Digit')) {
    const slot = Number(event.code.slice(5)) - 1;
    if (slot >= 0 && slot < GUNS.length) selectGun(slot);
  }
  if (event.code === 'KeyR') {
    session.station = (session.station + 1) % STATIONS.length;
    syncStation();
  }
  if (event.code === 'KeyM') {
    session.stationOn = !session.stationOn;
    syncStation();
  }
  if (event.code === 'KeyE') tryJob();
  if (event.code === 'KeyF') {
    if (session.travel === 'foot') board('car');
    else disembark();
  }
  if (event.code === 'KeyH') {
    if (session.travel === 'air') disembark();
    else board('air');
  }
  if (event.code === 'KeyL' && session.travel === 'air') {
    session.beam = !session.beam;
    bulletin(session.beam ? 'SOROTAN AKTIF' : 'SOROTAN DIMATIKAN', 1.5);
  }
  if (event.code === 'ControlLeft' && session.travel !== 'air') fire();
  if (event.code === 'KeyP') session.frozen = !session.frozen;
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
view.addEventListener('mousedown', (event) => {
  if (event.button === 0) fire();
});

ui.launch.addEventListener('click', () => {
  session.playing = true;
  session.stationOn = true;
  ui.intro.classList.add('hidden');
  startRadio();
  syncJob();
  syncStation();
  bulletin('SAPA TELUK — TEMUI ARA DI PELABUHAN', 4);
});

window.addEventListener('resize', () => {
  lens.aspect = window.innerWidth / window.innerHeight;
  lens.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

function placeCamera(delta, time) {
  let wanted;
  let focus;
  if (session.vista) {
    const shot = session.vista;
    const drift = Math.sin(time * 0.14) * 16;
    wanted = new THREE.Vector3(shot.eye[0] + drift, shot.eye[1], shot.eye[2] - drift * 0.4);
    focus = new THREE.Vector3(shot.gaze[0], shot.gaze[1], shot.gaze[2]);
  } else if (session.travel === 'air') {
    const facing = new THREE.Vector3(Math.sin(session.yaw), 0, Math.cos(session.yaw));
    wanted = new THREE.Vector3(session.x, session.alt, session.z)
      .addScaledVector(facing, -46)
      .add(new THREE.Vector3(0, 20, 0));
    focus = new THREE.Vector3(session.x, session.alt - 22, session.z)
      .addScaledVector(facing, 28);
  } else {
    const distance = session.travel === 'car' ? 21 : 15;
    const height = session.travel === 'car' ? 9 : 7.5;
    const facing = new THREE.Vector3(Math.sin(session.yaw), 0, Math.cos(session.yaw));
    wanted = new THREE.Vector3(session.x, session.alt, session.z)
      .addScaledVector(facing, -distance)
      .add(new THREE.Vector3(0, height, 0));
    focus = new THREE.Vector3(session.x, session.alt + 2, session.z)
      .addScaledVector(facing, 8);
  }
  const snap = session.clock <= STEP * 2;
  const blend = snap ? 1 : (session.vista ? 0.045 : Math.min(1, delta * 5.5));
  session.eye.lerp(wanted, blend);
  session.gaze.lerp(focus, blend);
  lens.position.copy(session.eye);
  lens.lookAt(session.gaze);
}

function paintMap() {
  const brush = mapBrush;
  const width = ui.map.width;
  const height = ui.map.height;
  const middleX = width / 2;
  const middleY = height / 2;
  const zoom = 0.3;
  const px = (x) => middleX + (x - session.x) * zoom;
  const py = (z) => middleY + (z - session.z) * zoom;

  brush.clearRect(0, 0, width, height);
  brush.save();
  brush.beginPath();
  brush.arc(middleX, middleY, middleX - 3, 0, TAU);
  brush.clip();
  brush.fillStyle = '#1b2033';
  brush.fillRect(0, 0, width, height);
  brush.fillStyle = '#174456';
  brush.fillRect(0, 0, px(GRID.shore), height);
  brush.fillRect(
    px(GRID.canal.west), py(GRID.canal.z - GRID.canal.half),
    (GRID.canal.east - GRID.canal.west) * zoom, GRID.canal.half * 2 * zoom,
  );

  for (const zone of DISTRICTS) {
    brush.beginPath();
    brush.arc(px(zone.center.x), py(zone.center.z), zone.reach * zoom, 0, TAU);
    brush.strokeStyle = zone.tint;
    brush.globalAlpha = 0.6;
    brush.lineWidth = 1.4;
    brush.stroke();
    brush.globalAlpha = 1;
    brush.font = 'bold 13px sans-serif';
    brush.textAlign = 'center';
    brush.strokeStyle = 'rgba(9,11,22,0.85)';
    brush.lineWidth = 3;
    brush.strokeText(zone.label, px(zone.center.x), py(zone.center.z) - 13);
    brush.fillStyle = zone.tint;
    brush.fillText(zone.label, px(zone.center.x), py(zone.center.z) - 13);
  }

  for (const lane of world.lanes) {
    brush.beginPath();
    brush.moveTo(px(lane.ax), py(lane.az));
    brush.lineTo(px(lane.bx), py(lane.bz));
    brush.strokeStyle = lane.kind === 'belt' ? '#6a6d93' : '#4c526d';
    brush.lineWidth = lane.kind === 'belt' ? 3 : 2;
    brush.stroke();
  }
  brush.fillStyle = '#ffd58a';
  brush.fillRect(px(GRID.landing.x) - 4, py(GRID.landing.z) - 4, 8, 8);

  if (!session.finished) {
    const job = currentJob();
    const mx = px(job.point.x);
    const my = py(job.point.z);
    brush.beginPath();
    brush.moveTo(mx, my - 8);
    brush.lineTo(mx + 8, my);
    brush.lineTo(mx, my + 8);
    brush.lineTo(mx - 8, my);
    brush.closePath();
    brush.fillStyle = 'rgba(101,240,255,0.35)';
    brush.fill();
    brush.strokeStyle = '#65f0ff';
    brush.lineWidth = 2;
    brush.stroke();
  }

  brush.fillStyle = '#ff4d6d';
  for (const unit of officers) {
    brush.beginPath();
    brush.arc(px(unit.x), py(unit.z), 3, 0, TAU);
    brush.fill();
  }

  brush.save();
  brush.translate(middleX, middleY);
  brush.rotate(Math.PI - session.yaw);
  brush.fillStyle = '#fff0c8';
  brush.strokeStyle = '#ff9c62';
  brush.lineWidth = 1.5;
  brush.beginPath();
  brush.moveTo(0, -10);
  brush.lineTo(7, 8);
  brush.lineTo(0, 4);
  brush.lineTo(-7, 8);
  brush.closePath();
  brush.fill();
  brush.stroke();
  brush.restore();
  brush.restore();
  brush.fillStyle = '#ffd9a5';
  brush.font = 'bold 9px sans-serif';
  brush.textAlign = 'center';
  brush.fillText('N', middleX, 12);
}

function paintSpeedo() {
  const brush = dialBrush;
  const width = ui.dialCanvas.width;
  const height = ui.dialCanvas.height;
  const middleX = width / 2;
  const middleY = height - 12;
  const radius = 76;
  const beginning = Math.PI;
  const sweep = Math.PI;
  const shown = session.travel === 'air' ? Math.abs(session.speed) * 3.2 : Math.abs(session.speed) * 3.6;
  const amount = clamp(shown / 240, 0, 1);

  brush.clearRect(0, 0, width, height);
  brush.lineCap = 'round';
  brush.beginPath();
  brush.arc(middleX, middleY, radius, beginning, beginning + sweep);
  brush.strokeStyle = 'rgba(255,224,180,0.18)';
  brush.lineWidth = 11;
  brush.stroke();
  brush.beginPath();
  brush.arc(middleX, middleY, radius, beginning, beginning + sweep * amount);
  brush.strokeStyle = session.heat > 2 ? '#ff7d92' : '#69e7f5';
  brush.lineWidth = 11;
  brush.stroke();
  brush.strokeStyle = 'rgba(255,230,196,0.6)';
  brush.lineWidth = 1.5;
  for (let index = 0; index <= 8; index += 1) {
    const angle = beginning + (index / 8) * sweep;
    brush.beginPath();
    brush.moveTo(middleX + Math.cos(angle) * (radius - 12), middleY + Math.sin(angle) * (radius - 12));
    brush.lineTo(middleX + Math.cos(angle) * (radius + 11), middleY + Math.sin(angle) * (radius + 11));
    brush.stroke();
  }
  const needle = beginning + sweep * amount;
  brush.strokeStyle = '#fff0cc';
  brush.lineWidth = 3;
  brush.beginPath();
  brush.moveTo(middleX, middleY);
  brush.lineTo(middleX + Math.cos(needle) * (radius - 8), middleY + Math.sin(needle) * (radius - 8));
  brush.stroke();
  brush.fillStyle = '#fff0cc';
  brush.beginPath();
  brush.arc(middleX, middleY, 4, 0, TAU);
  brush.fill();
  ui.speedText.textContent = `${Math.round(shown)}`;
}

function syncHud() {
  const zone = DISTRICTS.find((entry) => entry.key === world.zoneAt(session.x, session.z)) ?? DISTRICTS[0];
  ui.zone.textContent = zone.label;
  ui.zoneNote.textContent = zone.subtitle;
  ui.cash.textContent = `$${session.money.toLocaleString('en-US')}`;
  ui.heatName.textContent = HEAT[session.heat].label;
  ui.stars.forEach((star, index) => star.classList.toggle('lit', index < session.heat));
  ui.life.style.width = `${session.life}%`;
  ui.vest.style.width = `${session.vest}%`;
  ui.slots.forEach((slot, index) => {
    slot.classList.toggle('active', index === session.gun);
    const counter = slot.querySelector('.gun-count');
    if (counter) counter.textContent = session.ammo[index] === Infinity ? '∞' : String(session.ammo[index]);
  });
  ui.craft.textContent = session.travel === 'air'
    ? `HELICOPTER ${session.beam ? '/ SOROTAN ON' : ''}`
    : session.travel === 'car' ? 'MOBIL / JALANAN KOTA' : 'JALAN KAKI';
  const job = currentJob();
  const close = !session.finished && flatGap(session.x, session.z, job.point)
    < (session.travel === 'air' ? 48 : 24);
  ui.hint.classList.toggle('show', close);
  if (session.clock > session.noticeUntil) ui.notice.classList.remove('show');
  if (session.clock > session.talkUntil) ui.talkBox.classList.remove('show');
}

function beltPoint(angle) {
  return {
    x: GRID.belt.x + Math.cos(angle) * GRID.belt.rx,
    z: GRID.belt.z + Math.sin(angle) * GRID.belt.rz,
  };
}

function stageCapture(mode) {
  ui.intro.classList.add('hidden');
  session.playing = true;
  if (mode === 'harbor') {
    session.x = 224;
    session.z = 96;
    session.yaw = 0.5;
    session.vista = { eye: [470, 170, 400], gaze: [155, 45, 25] };
    speak('Ara', CREW[0].quote, 14);
  } else if (mode === 'pursuit') {
    board('car');
    const spot = beltPoint(-1.1);
    session.x = spot.x;
    session.z = spot.z;
    session.yaw = 1.07;
    session.speed = 42;
    raiseHeat(3, true);
    for (let index = 0; index < 3; index += 1) {
      deployOfficer(spot.x + 28 + index * 22, spot.z - 38 - index * 24);
    }
    speak('Dimas', CREW[1].quote, 14);
  } else if (mode === 'beam') {
    session.job = 3;
    board('air');
    session.x = -230;
    session.z = -90;
    session.alt = 72;
    session.yaw = 2.2;
    session.speed = 18;
    session.beam = true;
    flyStep(0);
    syncJob();
    speak('Ara', JOBS[3].intro, 14);
  } else if (mode === 'tide') {
    session.x = GRID.landing.x + 2;
    session.z = GRID.landing.z - 32;
    session.yaw = 0;
    session.job = JOBS.length - 1;
    session.heat = 2;
    chopper.body.position.set(GRID.landing.x + 16, 2.6, GRID.landing.z + 8);
    chopper.body.rotation.set(0, 0.7, 0);
    chopper.body.visible = true;
    syncJob();
    CREW.forEach((member, index) => {
      const angle = (index / CREW.length) * TAU;
      crewActors.get(member.key).position.set(
        GRID.landing.x + Math.cos(angle) * 34,
        0,
        GRID.landing.z + Math.sin(angle) * 34,
      );
    });
    session.vista = {
      eye: [GRID.landing.x + 92, 108, GRID.landing.z + 118],
      gaze: [GRID.landing.x, 4, GRID.landing.z],
    };
  }
  syncStation();
  if (SHOT_CAPTIONS[mode]) {
    ui.intro.setAttribute('data-shot', SHOT_CAPTIONS[mode]);
  }
}

syncJob();
syncStation();
if (photoMode) stageCapture(photoMode);

let previous = performance.now() / 1000;
let remainder = 0;
function frame(nowMilliseconds) {
  const now = nowMilliseconds / 1000;
  let elapsed = now - previous;
  previous = now;
  if (!Number.isFinite(elapsed) || elapsed <= 0) elapsed = STEP;
  if (elapsed > 0.2) elapsed = 0.2;
  remainder += elapsed;
  while (remainder >= STEP) {
    remainder -= STEP;
    if (session.playing && !session.frozen) {
      session.clock += STEP;
      world.animate(session.clock);
      session.shotClock = Math.max(0, session.shotClock - STEP);
      if (session.travel === 'foot') walkStep(STEP);
      else if (session.travel === 'car') driveStep(STEP);
      else flyStep(STEP);
      strollStep(STEP);
      updateOfficers(STEP);
      updateFlashes(STEP);
      if (session.heat > 0 && session.clock - session.crimeAt > 16) {
        session.cool += STEP;
        if (session.cool > 9) {
          session.heat -= 1;
          session.cool = 0;
        }
      }
      if (session.life < 100) session.life = Math.min(100, session.life + STEP / 3);
    }
  }

  waypointRing.rotation.z += elapsed * 0.6;
  waypointRing.scale.setScalar(1 + Math.sin(session.clock * 3) * 0.06);
  const lampOn = session.beam && session.travel === 'air';
  beamLamp.intensity = lampOn ? 9 : 0;
  beamCone.visible = lampOn;

  placeCamera(elapsed, session.clock);
  syncHud();
  paintMap();
  paintSpeedo();
  renderer.render(world.scene, lens);
  window.requestAnimationFrame(frame);
}
window.requestAnimationFrame(frame);

window.__KOTA = {
  session,
  world,
  lens,
  renderer,
  crewActors,
  stageCapture,
};
