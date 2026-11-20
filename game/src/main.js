// Boot, simulation and presentation for KOTA ARUNA. The world is advanced by
// real frame deltas; everything visual comes from the seeded city and the local
// three.js copy, so a file server is the only requirement.

import * as THREE from 'three';
import {
  CAR_SPAWNS, CREW, DEFAULT_SEED, DISTRICTS, MAP, MISSIONS, RADIO, RIDES,
  SHOT_VIEWS, WEAPONS,
} from './config.js';
import { clamp, stream, wrapAngle } from './random.js';
import {
  buildCity, canDrive, districtAt, makeCase, makeMarker, makePed, makeVehicle,
} from './city.js';

const el = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const seedArg = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isFinite(seedArg) ? seedArg : DEFAULT_SEED;
const shotName = params.get('shot') && SHOT_VIEWS[params.get('shot')] ? params.get('shot') : null;
const worldRng = stream(seed);
const rng = stream(seed ^ 0x51ed270b);

const renderer = new THREE.WebGLRenderer({ canvas: el('scene'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(shotName ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.5, 4000);
const city = buildCity(scene, worldRng);
const statusLine = el('status');

const state = {
  mode: 'title',
  staged: false,
  time: 0,
  cash: 800,
  respect: 0,
  health: 100,
  stars: 0,
  lastCrime: -999,
  escape: 0,
  wantedSeen: 0,
  weapon: 0,
  ammo: WEAPONS.map((w) => (Number.isFinite(w.ammo) ? w.ammo : 0)),
  reserve: WEAPONS.map((w) => (Number.isFinite(w.reserve) ? w.reserve : 0)),
  fireAt: 0,
  station: 0,
  muted: false,
  missionIndex: -1,
  step: 0,
  cases: [],
  rivals: [],
  timer: 0,
  done: new Set(),
  revealShown: false,
  stagedFrames: 0,
  toastUntil: 0,
};

const player = {
  x: 152, z: -256, yaw: 0, speed: 0,
  mesh: makePed('#e2b47c'),
};
scene.add(player.mesh);

const vehicles = [];
const bullets = [];
const effects = [];
const peds = [];
const police = [];
let policeHeli = null;
let marker = null;

function addVehicle(kind, x, z, yaw, colour, policeCar = false) {
  const spec = RIDES[kind];
  const mesh = makeVehicle(kind, colour ?? spec.color, policeCar);
  mesh.rotation.order = 'YXZ';
  mesh.position.set(x, MAP.landY + (kind === 'heli' ? 4 : 0), z);
  scene.add(mesh);
  const ride = {
    kind, spec, mesh, x, z, yaw, speed: 0, altitude: 0, y: MAP.landY,
    health: kind === 'heli' ? 220 : 120,
    police: policeCar, ai: false, aiHeli: false, rival: false,
    cooldown: 0, life: 0, light: false, colour: colour ?? spec.color,
  };
  vehicles.push(ride);
  return ride;
}

CAR_SPAWNS.forEach(([x, z, yaw, kind], index) => {
  const colour = kind === 'heli' ? RIDES.heli.color : index % 3 === 0 ? RIDES.sports.color : RIDES[kind].color;
  addVehicle(kind, x, z, yaw, colour, false);
});

for (let i = 0; i < 46; i += 1) {
  const side = i % 2 ? 1 : -1;
  const x = side * (MAP.channel + 20 + rng() * (MAP.half - MAP.channel - 60));
  const z = -460 + rng() * 920;
  if (!canDrive(x, z)) continue;
  const mesh = makePed(i % 4 === 0 ? '#8fb8c2' : '#d8b08a');
  mesh.position.set(x, MAP.landY, z);
  scene.add(mesh);
  peds.push({ mesh, x, z, tx: x, tz: z, speed: 1 + rng() * 1.4, phase: rng() * 9 });
}

function makeBeam(colour) {
  const spot = new THREE.SpotLight(colour, 7, 320, 0.38, 0.6, 1.1);
  spot.target = new THREE.Object3D();
  scene.add(spot, spot.target);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(19, 84, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.visible = false;
  scene.add(cone);
  return { spot, cone };
}

const searchlight = makeBeam(0xffdfa6);
const airLight = makeBeam(0xa9d9ff);
const aimVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);

function aimBeam(beam, source, target, on) {
  beam.spot.visible = on;
  beam.cone.visible = on;
  if (!on) return;
  beam.spot.position.set(source.x, source.y - 1.2, source.z);
  beam.spot.target.position.set(target.x, target.y, target.z);
  aimVector.set(target.x - source.x, target.y - source.y, target.z - source.z).normalize();
  beam.cone.position.copy(beam.spot.position).addScaledVector(aimVector, 42);
  beam.cone.quaternion.setFromUnitVectors(upVector, aimVector.clone().negate());
}

function toast(message, seconds = 3.4) {
  el('toast').textContent = message;
  el('toast').classList.add('show');
  state.toastUntil = state.time + seconds;
}

function announce(message) {
  statusLine.textContent = message;
}

function actor() {
  return state.vehicle ?? player;
}

function actorX() {
  return actor().x;
}

function actorZ() {
  return actor().z;
}

function distanceTo(x, z) {
  return Math.hypot(actorX() - x, actorZ() - z);
}

function addWanted(amount) {
  state.stars = clamp(state.stars + amount, 0, 5);
  state.lastCrime = state.time;
  state.escape = 0;
  if (state.stars >= 3) ensureAirUnit();
  announce(`${state.stars} wanted stars`);
}

function clearWanted() {
  state.stars = 0;
  state.escape = 0;
  if (policeHeli) removeVehicle(policeHeli);
  for (const car of [...police]) removeVehicle(car);
}

function removeVehicle(ride) {
  scene.remove(ride.mesh);
  const index = vehicles.indexOf(ride);
  if (index !== -1) vehicles.splice(index, 1);
  for (const list of [police, state.rivals]) {
    const found = list.indexOf(ride);
    if (found !== -1) list.splice(found, 1);
  }
  if (ride === state.vehicle) state.vehicle = null;
  if (ride === policeHeli) {
    policeHeli = null;
    airLight.spot.visible = false;
    airLight.cone.visible = false;
  }
}

function spawnPolice() {
  const angle = rng() * Math.PI * 2;
  const radius = 78 + rng() * 46;
  let x = actorX() + Math.cos(angle) * radius;
  let z = actorZ() + Math.sin(angle) * radius;
  if (!canDrive(x, z)) {
    x = actorX() + 90;
    z = actorZ();
  }
  x = clamp(x, -MAP.half + 30, MAP.half - 30);
  z = clamp(z, -MAP.half + 30, MAP.half - 30);
  const car = addVehicle('police', x, z, Math.atan2(actorX() - x, actorZ() - z), '#f1f4f7', true);
  car.ai = true;
  car.life = 70;
  police.push(car);
}

function ensureAirUnit() {
  if (policeHeli || state.staged) return;
  const x = clamp(actorX() + 120, -460, 460);
  const z = clamp(actorZ() - 100, -460, 460);
  const chopper = addVehicle('heli', x, z, 0, '#29495f');
  chopper.aiHeli = true;
  chopper.y = MAP.landY + 48;
  chopper.altitude = 44;
  policeHeli = chopper;
  toast('Air unit on approach — keep moving');
}

function burst(position, colour) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  mesh.position.copy(position);
  scene.add(mesh);
  effects.push({ mesh, age: 0, life: 0.45 });
}

function damageVehicle(ride, amount, byPlayer) {
  ride.health -= amount;
  if (ride.health > 0) return;
  burst(ride.mesh.position, byPlayer ? 0xffa552 : 0xff6b5a);
  if (byPlayer && ride.rival) {
    state.cash += 300;
    state.respect += 3;
    toast('Rival down · +$300');
  }
  if (byPlayer && ride.police) addWanted(1);
  removeVehicle(ride);
}

function fireBullet(owner, x, y, z, yaw, speed, damage, spread = 0.02) {
  const angle = yaw + (rng() - 0.5) * spread;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(owner === 'player' ? 0.38 : 0.3, 6, 5),
    new THREE.MeshBasicMaterial({ color: owner === 'player' ? 0xffdc8a : 0xff6d6d }),
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
  bullets.push({
    mesh, owner, damage,
    vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed, vy: 0,
    life: 1.6,
  });
}

function shoot() {
  const weapon = WEAPONS[state.weapon];
  if (state.time < state.fireAt) return;
  if (state.ammo[state.weapon] <= 0) {
    toast('Press X to reload');
    return;
  }
  state.fireAt = state.time + weapon.rate;
  const at = actor();
  const yaw = state.vehicle ? state.vehicle.yaw : player.yaw;
  const x = at.x + Math.sin(yaw) * 1.8;
  const z = at.z + Math.cos(yaw) * 1.8;
  const y = (state.vehicle ? state.vehicle.y : MAP.landY) + 1.7;
  if (state.weapon === 0) {
    state.ammo[0] = 1;
    for (const target of [...vehicles]) {
      if (Math.hypot(target.x - x, target.z - z) < 5.5 && (target.police || target.rival)) damageVehicle(target, weapon.damage, true);
    }
    return;
  }
  state.ammo[state.weapon] -= 1;
  fireBullet('player', x, y, z, yaw, 185, weapon.damage, state.weapon === 2 ? 0.12 : 0.04);
  if (state.stars === 0) addWanted(1);
  burst(new THREE.Vector3(x, y, z), 0xffd58a);
}

function reload() {
  const weapon = WEAPONS[state.weapon];
  if (state.weapon === 0 || state.reserve[state.weapon] <= 0) return;
  const missing = weapon.ammo - state.ammo[state.weapon];
  const taken = Math.min(missing, state.reserve[state.weapon]);
  state.ammo[state.weapon] += taken;
  state.reserve[state.weapon] -= taken;
  toast(`${weapon.name} reloaded`);
}

function interact() {
  if (state.vehicle) {
    const ride = state.vehicle;
    if (ride.kind === 'heli' && (Math.abs(ride.speed) > 4 || ride.altitude > 5)) {
      toast('Land before leaving the chopper');
      return;
    }
    if (ride.kind !== 'heli' && Math.abs(ride.speed) > 4) {
      toast('Slow down first');
      return;
    }
    player.x = ride.x + Math.cos(ride.yaw) * 3.5;
    player.z = ride.z - Math.sin(ride.yaw) * 3.5;
    player.mesh.visible = true;
    state.vehicle = null;
    return;
  }
  for (const shop of MAP.workshops) {
    if (distanceTo(shop.x, shop.z) < 26 && state.cash >= 150) {
      state.cash -= 150;
      state.health = 100;
      toast('Workshop: repaired and patched up · −$150');
      return;
    }
  }
  if (distanceTo(MAP.police.x, MAP.police.z) < 30 && state.stars > 0) {
    const fine = state.stars * 500;
    if (state.cash >= fine) {
      state.cash -= fine;
      clearWanted();
      toast(`Fine paid · −$${fine}`);
    } else {
      toast(`The desk wants $${fine}`);
    }
    return;
  }
  let nearest = null;
  let best = 8;
  for (const ride of vehicles) {
    const gap = distanceTo(ride.x, ride.z);
    if (gap < best && (ride.kind !== 'heli' || ride.altitude < 6)) {
      nearest = ride;
      best = gap;
    }
  }
  if (!nearest) {
    toast('Nothing close enough to use');
    return;
  }
  state.vehicle = nearest;
  player.mesh.visible = false;
  player.x = nearest.x;
  player.z = nearest.z;
  if (nearest.police) {
    addWanted(2);
    toast('Stolen patrol cruiser · two stars');
  } else {
    toast(`Driving the ${nearest.spec.name}`);
  }
  const step = currentStep();
  if (step && step.kind === 'steal' && distanceTo(step.x, step.z) < step.radius && !nearest.police && nearest.kind !== 'heli') {
    nearest.rival = true;
    addWanted(1);
    advanceStep();
  }
}

function currentMission() {
  return state.missionIndex >= 0 ? MISSIONS[state.missionIndex] : null;
}

function currentStep() {
  const mission = currentMission();
  return mission ? mission.steps[state.step] : null;
}

function newMarker(x, z, colour) {
  if (marker) scene.remove(marker);
  marker = makeMarker(colour);
  marker.position.set(x, MAP.landY, z);
  scene.add(marker);
}

function spawnMissionProps(mission) {
  for (const caseMesh of state.cases) scene.remove(caseMesh);
  for (const ride of state.rivals) removeVehicle(ride);
  state.cases = [];
  state.rivals = [];
  for (const [x, z] of mission.cases ?? []) {
    const crate = makeCase();
    crate.position.set(x, MAP.landY, z);
    scene.add(crate);
    state.cases.push({ mesh: crate, x, z });
  }
  for (const [x, z] of mission.rivals ?? []) {
    const ride = addVehicle('sedan', x, z, rng() * 6.28, '#7e3f52');
    ride.rival = true;
    ride.health = 70;
    state.rivals.push(ride);
  }
}

function startMission(index) {
  const mission = MISSIONS[index];
  if (!mission) return;
  state.missionIndex = index;
  state.step = 0;
  state.timer = mission.seconds ?? 0;
  spawnMissionProps(mission);
  const step = mission.steps[0];
  newMarker(step.x, step.z, mission.reveal ? '#b9a4ff' : '#ffd166');
  el('missionTitle').textContent = `${String(index + 1).padStart(2, '0')} · ${mission.title.toUpperCase()}`;
  toast(`${mission.giver}: ${mission.brief}`, 6);
  announce(`Contract ${index + 1}: ${mission.title}`);
  state.mode = 'play';
  hideOverlays();
  if (mission.heat) addWanted(mission.heat);
}

function advanceStep() {
  const mission = currentMission();
  if (!mission) return;
  state.step += 1;
  if (state.step >= mission.steps.length) {
    finishMission();
    return;
  }
  const step = mission.steps[state.step];
  newMarker(step.x, step.z, mission.reveal ? '#b9a4ff' : '#ffd166');
  toast(step.text);
}

function finishMission() {
  const mission = currentMission();
  state.cash += mission.pay;
  state.respect += mission.respect;
  state.done.add(mission.id);
  if (marker) {
    scene.remove(marker);
    marker = null;
  }
  el('missionTitle').textContent = 'CONTRACT COMPLETE';
  el('objective').textContent = `${mission.title} · +$${mission.pay} · +${mission.respect} respect`;
  toast(`Contract complete · +$${mission.pay}`, 5);
  announce(`Contract complete. ${state.cash} dollars.`);
  if (mission.reveal && !state.revealShown) showReveal();
  state.missionIndex = -1;
  state.step = 0;
}

function failMission(reason) {
  el('failureTitle').textContent = reason;
  el('failureText').textContent = 'Bimo says the offer is still on the table. Take a breath and run it again, or pick another job from the ledger.';
  el('failure').classList.remove('hidden');
  state.mode = 'fail';
  announce(reason);
}

function updateMission(dt) {
  const mission = currentMission();
  const step = currentStep();
  if (!mission || !step) return;
  if (mission.seconds) {
    state.timer -= dt;
    if (state.timer <= 0) {
      failMission('TIME IS UP');
      return;
    }
  }
  const gap = distanceTo(step.x, step.z);
  switch (step.kind) {
    case 'goto':
      if (gap < step.radius) {
        toast(step.kind === 'goto' && mission.id === 'fare' ? 'Fare delivered safely' : 'Waypoint reached');
        advanceStep();
      }
      break;
    case 'steal':
      break;
    case 'drive':
    case 'timer':
      if (state.vehicle && state.vehicle.kind !== 'heli' && gap < step.radius) advanceStep();
      break;
    case 'collect':
      for (let i = state.cases.length - 1; i >= 0; i -= 1) {
        const crate = state.cases[i];
        if (distanceTo(crate.x, crate.z) < 6) {
          scene.remove(crate.mesh);
          state.cases.splice(i, 1);
          state.cash += 150;
          toast('Relay case recovered · +$150');
          if (state.cases.length === 0) advanceStep();
        }
      }
      break;
    case 'eliminate':
      if (state.rivals.length === 0) advanceStep();
      break;
    case 'heli':
      if (state.vehicle?.kind === 'heli' && state.vehicle.light && gap < step.radius) advanceStep();
      break;
    case 'fly':
      if (state.vehicle?.kind === 'heli' && gap < step.radius) advanceStep();
      break;
    case 'reveal':
      if (state.vehicle?.kind === 'heli' && gap < step.radius) advanceStep();
      break;
    default:
      break;
  }
  if (marker) {
    marker.userData.diamond.rotation.y += dt * 1.6;
    marker.userData.diamond.position.y = 11 + Math.sin(state.time * 2.2) * 1.4;
  }
}

function updatePlayer(dt) {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, upVector).normalize();
  const dx = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
  const dz = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0);
  const move = new THREE.Vector3()
    .addScaledVector(forward, dz)
    .addScaledVector(right, dx);
  if (move.lengthSq() > 0) {
    move.normalize();
    const speed = keys.has('shift') ? 10.5 : 6.2;
    const nx = player.x + move.x * speed * dt;
    const nz = player.z + move.z * speed * dt;
    if (canDrive(nx, nz)) {
      player.x = nx;
      player.z = nz;
    }
    player.yaw = Math.atan2(move.x, move.z);
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  player.mesh.position.set(player.x, MAP.landY, player.z);
  player.mesh.rotation.y = player.yaw;
  const swing = Math.sin(state.time * 11) * 0.55 * (player.speed > 0 ? 1 : 0);
  if (player.mesh.userData.legs) {
    player.mesh.userData.legs[0].rotation.x = swing;
    player.mesh.userData.legs[1].rotation.x = -swing;
  }
}

function driveGround(ride, dt, controlled) {
  const spec = ride.spec;
  let throttle = 0;
  let steer = 0;
  if (controlled) {
    throttle = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0);
    steer = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
    if (keys.has('shift')) throttle *= 1.45;
    if (keys.has(' ')) ride.speed *= Math.exp(-dt * 3.2);
  } else if (ride.ai || ride.rival) {
    const desired = Math.atan2(actorX() - ride.x, actorZ() - ride.z);
    const difference = wrapAngle(desired - ride.yaw);
    steer = clamp(difference * 1.8, -1, 1);
    throttle = ride.rival ? 0.25 : 1;
  }
  if (throttle) ride.speed += throttle * spec.accel * dt;
  else ride.speed *= Math.exp(-dt * 1.5);
  ride.speed = clamp(ride.speed, -spec.max * 0.35, spec.max);
  ride.yaw += steer * spec.turn * dt * clamp(Math.abs(ride.speed) / 7, 0, 1) * (ride.speed < 0 ? -1 : 1);
  const nx = ride.x + Math.sin(ride.yaw) * ride.speed * dt;
  const nz = ride.z + Math.cos(ride.yaw) * ride.speed * dt;
  if (canDrive(nx, nz)) {
    ride.x = nx;
    ride.z = nz;
  } else {
    ride.speed *= -0.25;
  }
  ride.y = MAP.landY;
  ride.mesh.position.set(ride.x, ride.y, ride.z);
  ride.mesh.rotation.set(0, ride.yaw, 0);
}

function driveHeli(ride, dt, controlled) {
  const spec = RIDES.heli;
  if (controlled) {
    ride.yaw += ((keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0)) * spec.turn * dt;
    ride.speed += ((keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0)) * spec.accel * dt;
    ride.altitude += ((keys.has(' ') ? 1 : 0) - (keys.has('control') ? 1 : 0)) * 14 * dt;
  } else if (ride.aiHeli) {
    const desired = Math.atan2(actorX() - ride.x, actorZ() - ride.z);
    ride.yaw += wrapAngle(desired - ride.yaw) * dt * 0.9;
    ride.altitude += (52 - ride.altitude) * dt * 0.5;
    ride.speed += (16 - ride.speed) * dt * 0.6;
  } else {
    ride.speed *= Math.exp(-dt * 0.9);
  }
  ride.altitude = clamp(ride.altitude, 0, 180);
  ride.speed = clamp(ride.speed, -12, spec.max);
  ride.speed *= Math.exp(-dt * (controlled ? 0.75 : 0.25));
  const nx = ride.x + Math.sin(ride.yaw) * ride.speed * dt;
  const nz = ride.z + Math.cos(ride.yaw) * ride.speed * dt;
  ride.x = clamp(nx, -MAP.half - 80, MAP.half + 80);
  ride.z = clamp(nz, -MAP.half - 80, MAP.half + 80);
  ride.y = MAP.landY + 4 + ride.altitude;
  ride.mesh.position.set(ride.x, ride.y, ride.z);
  ride.mesh.rotation.set(controlled ? -clamp(ride.speed / 130, -0.2, 0.2) : 0, ride.yaw, 0);
  if (ride.mesh.userData.rotor) ride.mesh.userData.rotor.rotation.y += dt * 34;
  if (ride.mesh.userData.tailRotor) ride.mesh.userData.tailRotor.rotation.x += dt * 46;
}

function updateVehicles(dt) {
  for (const ride of [...vehicles]) {
    const controlled = ride === state.vehicle;
    if (ride.kind === 'heli') driveHeli(ride, dt, controlled);
    else driveGround(ride, dt, controlled);
    if (ride.life > 0) {
      ride.life -= dt;
      if (ride.life <= 0 && ride.ai) removeVehicle(ride);
    }
    if (controlled) {
      player.x = ride.x;
      player.z = ride.z;
    }
  }
}

function updateLaw(dt) {
  if (state.stars > 0) {
    let nearest = 999;
    for (const car of police) nearest = Math.min(nearest, Math.hypot(car.x - actorX(), car.z - actorZ()));
    if (state.time - state.lastCrime > 14 && nearest > 75) state.escape += dt;
    else state.escape = 0;
    if (state.escape > 8) {
      state.stars -= 1;
      state.escape = 0;
      state.lastCrime = state.time;
      toast('You lost them · one star cooler');
    }
    const wanted = Math.min(5, 1 + state.stars);
    if (police.length < wanted && state.time - state.wantedSeen > 2.5) {
      spawnPolice();
      state.wantedSeen = state.time;
    }
    if (state.stars >= 3 && !policeHeli) ensureAirUnit();
  }
  for (const car of police) {
    if (car.cooldown > 0) car.cooldown -= dt;
    const gap = Math.hypot(car.x - actorX(), car.z - actorZ());
    if (gap < 62 && gap > 8 && car.cooldown <= 0) {
      const aim = Math.atan2(actorX() - car.x, actorZ() - car.z);
      fireBullet('cop', car.x, car.y + 2.2, car.z, aim, 72, 5, 0.16);
      car.cooldown = 1.1 + rng() * 0.8;
    }
    if (gap < 4 && Math.abs(car.speed) > 6 && state.health > 0) {
      state.health -= 7 * dt;
    }
  }
  if (policeHeli && policeHeli.cooldown <= 0) {
    const gap = Math.hypot(policeHeli.x - actorX(), policeHeli.z - actorZ());
    if (gap < 110) {
      const aim = Math.atan2(actorX() - policeHeli.x, actorZ() - policeHeli.z);
      fireBullet('cop', policeHeli.x, policeHeli.y - 2, policeHeli.z, aim, 80, 6, 0.1);
      policeHeli.cooldown = 0.8;
    }
  }
  if (policeHeli) policeHeli.cooldown -= dt;
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x = bullet.mesh.position.x + bullet.vx * dt;
    bullet.z = bullet.mesh.position.z + bullet.vz * dt;
    bullet.mesh.position.set(bullet.x, bullet.mesh.position.y, bullet.z);
    bullet.life -= dt;
    let hit = false;
    if (bullet.owner === 'player') {
      for (const target of [...vehicles]) {
        if (!target.police && !target.rival) continue;
        if (Math.hypot(target.x - bullet.x, target.z - bullet.z) < (target.kind === 'heli' ? 5 : 2.8)) {
          damageVehicle(target, bullet.damage, true);
          burst(bullet.mesh.position, 0xffc07a);
          hit = true;
          break;
        }
      }
    } else if (Math.hypot(actorX() - bullet.x, actorZ() - bullet.z) < 2.1) {
      state.health -= bullet.damage;
      burst(bullet.mesh.position, 0xff6d6d);
      hit = true;
      if (state.health <= 0) {
        state.health = 100;
        if (state.vehicle) removeVehicle(state.vehicle);
        player.x = 152;
        player.z = -256;
        clearWanted();
        toast('Bimo pulled you out of the wreck · $400 for the tow', 5);
        state.cash -= 400;
      }
    }
    if (hit || bullet.life <= 0) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
    }
  }
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    effect.age += dt;
    effect.mesh.scale.setScalar(1 + effect.age * 11);
    effect.mesh.material.opacity = Math.max(0, 0.9 - effect.age / effect.life);
    if (effect.age >= effect.life) {
      scene.remove(effect.mesh);
      effects.splice(i, 1);
    }
  }
}

function updatePeds(dt) {
  for (const ped of peds) {
    const gap = Math.hypot(ped.tx - ped.x, ped.tz - ped.z);
    if (gap < 2) {
      ped.tx = clamp(ped.x + (rng() - 0.5) * 90, -MAP.half + 30, MAP.half - 30);
      ped.tz = clamp(ped.z + (rng() - 0.5) * 90, -MAP.half + 30, MAP.half - 30);
      if (!canDrive(ped.tx, ped.tz)) {
        ped.tx = ped.x;
        ped.tz = ped.z;
      }
    }
    const angle = Math.atan2(ped.tx - ped.x, ped.tz - ped.z);
    ped.x += Math.sin(angle) * ped.speed * dt;
    ped.z += Math.cos(angle) * ped.speed * dt;
    ped.mesh.position.set(ped.x, MAP.landY, ped.z);
    ped.mesh.rotation.y = angle;
    const step = Math.sin(state.time * 6 + ped.phase) * 0.4;
    if (ped.mesh.userData.legs) {
      ped.mesh.userData.legs[0].rotation.x = step;
      ped.mesh.userData.legs[1].rotation.x = -step;
    }
  }
}

let audio = null;
let beatCountdown = 0;
let beatIndex = 0;

function startAudio() {
  if (audio) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  try {
    const context = new AudioCtor();
    const master = context.createGain();
    master.gain.value = 0.075;
    master.connect(context.destination);
    audio = { context, master };
  } catch {
    audio = null;
  }
}

function playTone(frequency, length, wave) {
  if (!audio || state.muted) return;
  const { context, master } = audio;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0.0001, context.currentTime);
  envelope.gain.exponentialRampToValueAtTime(0.5, context.currentTime + 0.015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + length);
  oscillator.connect(envelope);
  envelope.connect(master);
  oscillator.start();
  oscillator.stop(context.currentTime + length + 0.02);
}

const SCALE = [0, 3, 5, 7, 10, 12, 15];

function updateRadio(dt) {
  const station = RADIO[state.station];
  beatCountdown -= dt;
  if (beatCountdown <= 0 && !state.muted) {
    beatCountdown = 60 / station.bpm / 2;
    const note = station.root + SCALE[beatIndex % SCALE.length] + (beatIndex % 8 === 7 ? -12 : 0);
    playTone(440 * Math.pow(2, (note - 69) / 12), 0.19, station.wave);
    if (beatIndex % 4 === 0) playTone(440 * Math.pow(2, (station.root - 81) / 12), 0.32, 'triangle');
    beatIndex += 1;
  }
  if (state.mode !== 'play') return;
  const bars = el('eq').children;
  for (let i = 0; i < bars.length; i += 1) {
    const wobble = Math.sin(state.time * (5 + i * 0.7) + i * 1.6) * 0.5 + 0.5;
    bars[i].style.height = `${18 + wobble * 72}%`;
    bars[i].style.background = state.muted ? '#5c6570' : station.color;
  }
}

function updateCamera(dt) {
  if (state.staged) return;
  const at = actor();
  const height = at.kind === 'heli' ? 6 : 2.2;
  const target = new THREE.Vector3(at.x, (at.y ?? MAP.landY) + height, at.z);
  const horizontal = Math.cos(cameraPitch) * cameraDistance;
  const desired = new THREE.Vector3(
    target.x - Math.sin(cameraYaw) * horizontal,
    target.y + Math.sin(cameraPitch) * cameraDistance,
    target.z - Math.cos(cameraYaw) * horizontal,
  );
  const blend = 1 - Math.exp(-dt * 6);
  camera.position.lerp(desired, blend);
  cameraTarget.lerp(target, blend);
  camera.lookAt(cameraTarget);
}

const cameraTarget = new THREE.Vector3(player.x, MAP.landY + 2, player.z);
let cameraYaw = 0.5;
let cameraPitch = 0.38;
let cameraDistance = 25;

function updateVisuals(dt) {
  city.update(state.time, camera.position);
  for (const ride of vehicles) {
    if (ride.kind !== 'heli' || ride === state.vehicle || ride.aiHeli) continue;
    if (ride.mesh.userData.rotor) ride.mesh.userData.rotor.rotation.y += dt * 24;
  }
  for (const ride of police) {
    const sirens = ride.mesh.userData.siren;
    if (sirens) {
      const flash = Math.floor(state.time * 7) % 2 === 0;
      sirens[0].material.emissiveIntensity = flash ? 1.5 : 0.1;
      sirens[1].material.emissiveIntensity = flash ? 0.1 : 1.5;
    }
  }
  const chopper = state.vehicle?.kind === 'heli' ? state.vehicle : null;
  const on = Boolean(chopper?.light);
  aimBeam(searchlight,
    chopper ?? { x: 0, y: 0, z: 0 },
    chopper ? { x: chopper.x + Math.sin(chopper.yaw) * 34, y: MAP.landY, z: chopper.z + Math.cos(chopper.yaw) * 34 } : { x: 0, y: 0, z: 0 },
    on);
  if (policeHeli) {
    aimBeam(airLight,
      policeHeli,
      { x: actorX(), y: MAP.landY, z: actorZ() },
      state.stars >= 3);
  }
  if (state.toastUntil && state.time > state.toastUntil) {
    el('toast').classList.remove('show');
    state.toastUntil = 0;
  }
  updateCamera(dt);
}

const minimap = el('minimap');
const mapCtx = minimap.getContext('2d');
const mapScale = 206 / (MAP.half * 2 + 40);
const toPx = (value) => (value + MAP.half + 20) * mapScale;

function drawMinimap() {
  const ctx = mapCtx;
  ctx.clearRect(0, 0, 206, 206);
  ctx.fillStyle = '#163a47';
  ctx.fillRect(0, 0, 206, 206);
  ctx.fillStyle = '#48515a';
  ctx.fillRect(toPx(-MAP.half), toPx(-MAP.half), toPx(-MAP.channel) - toPx(-MAP.half), toPx(MAP.half) - toPx(-MAP.half));
  ctx.fillRect(toPx(MAP.channel), toPx(-MAP.half), toPx(MAP.half) - toPx(MAP.channel), toPx(MAP.half) - toPx(-MAP.half));
  ctx.strokeStyle = 'rgba(220,230,230,.3)';
  ctx.lineWidth = 1;
  for (let v = -MAP.half + 46; v < MAP.half; v += MAP.block) {
    ctx.beginPath();
    ctx.moveTo(toPx(v), toPx(-MAP.half));
    ctx.lineTo(toPx(v), toPx(MAP.half));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toPx(-MAP.half), toPx(v));
    ctx.lineTo(toPx(MAP.half), toPx(v));
    ctx.stroke();
  }
  ctx.strokeStyle = '#e3d2a9';
  ctx.lineWidth = 3;
  for (const bridge of MAP.bridges) {
    ctx.beginPath();
    ctx.moveTo(toPx(-MAP.channel - 8), toPx(bridge));
    ctx.lineTo(toPx(MAP.channel + 8), toPx(bridge));
    ctx.stroke();
  }
  ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,205,140,.95)';
  ctx.fillText(DISTRICTS.east.name, toPx(265), toPx(-380));
  ctx.fillStyle = 'rgba(120,235,220,.95)';
  ctx.fillText(DISTRICTS.west.name, toPx(-260), toPx(-380));
  ctx.fillStyle = 'rgba(180,220,240,.8)';
  ctx.font = '8px "Trebuchet MS", sans-serif';
  ctx.fillText(DISTRICTS.water.name, toPx(0), toPx(30));

  for (const car of police) {
    ctx.fillStyle = '#8fc8ff';
    ctx.fillRect(toPx(car.x) - 2, toPx(car.z) - 2, 4, 4);
  }
  const step = currentStep();
  if (step) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(toPx(step.x), toPx(step.z) - 6);
    ctx.lineTo(toPx(step.x) + 5, toPx(step.z));
    ctx.lineTo(toPx(step.x), toPx(step.z) + 6);
    ctx.lineTo(toPx(step.x) - 5, toPx(step.z));
    ctx.closePath();
    ctx.fill();
  }
  const at = actor();
  ctx.save();
  ctx.translate(toPx(at.x), toPx(at.z));
  ctx.rotate(at.yaw ?? player.yaw);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function updateHud() {
  el('cash').firstChild.nodeValue = `$${state.cash.toLocaleString('en-US')}`;
  el('healthFill').style.width = `${clamp(state.health, 0, 100)}%`;
  el('healthNum').textContent = String(Math.max(0, Math.round(state.health)));
  el('respectFill').style.width = `${clamp(state.respect, 0, 100)}%`;
  el('respectNum').textContent = String(state.respect);
  el('districtName').textContent = DISTRICTS[districtAt(actorX(), actorZ())].name;
  const stars = el('stars').children;
  for (let i = 0; i < stars.length; i += 1) stars[i].classList.toggle('on', i < state.stars);
  const mission = currentMission();
  const step = currentStep();
  if (step) {
    el('objective').textContent = step.text;
    el('missionTimer').textContent = mission.seconds ? `${Math.ceil(state.timer)}s LEFT` : '';
    el('waypoint').classList.toggle('hidden', distanceTo(step.x, step.z) < 24);
  } else {
    el('waypoint').classList.add('hidden');
    el('missionTimer').textContent = '';
    if (!mission) el('objective').textContent = 'Press J to open the contract ledger';
  }
  const ride = state.vehicle;
  const kmh = Math.round(Math.abs(ride?.speed ?? player.speed) * 3.6);
  el('speed').textContent = String(kmh);
  el('vehicleName').textContent = ride ? ride.spec.name.toUpperCase() : 'ON FOOT';
  el('gearFill').style.width = `${clamp(kmh / (ride ? ride.spec.max * 3.6 : 40) * 100, 0, 100)}%`;
  for (let i = 0; i < slotNodes.length; i += 1) {
    const weapon = WEAPONS[i];
    const unlocked = !weapon.respect || state.respect >= weapon.respect;
    slotNodes[i].classList.toggle('active', i === state.weapon);
    slotNodes[i].classList.toggle('locked', !unlocked);
    slotNodes[i].querySelector('b').textContent = i === 0 ? 'MELEE' : `${state.ammo[i]}/${state.reserve[i]}`;
  }
  const station = RADIO[state.station];
  el('radioName').textContent = station.name;
  el('radioName').style.color = station.color;
  el('radioFreq').textContent = station.freq;
  el('radioTag').textContent = station.tag;
  el('muted').classList.toggle('hidden', !state.muted);
  el('crosshair').classList.toggle('hidden', Boolean(ride));
  drawMinimap();
}

const slotNodes = [];

function buildSlots() {
  const container = el('slots');
  WEAPONS.forEach((weapon, index) => {
    const node = document.createElement('div');
    node.className = 'slot panel';
    node.innerHTML = `<span>${index + 1}</span>${weapon.name.toUpperCase()}<b>--</b>`;
    container.appendChild(node);
    slotNodes.push(node);
  });
  const equaliser = el('eq');
  for (let i = 0; i < 14; i += 1) equaliser.appendChild(document.createElement('i'));
}

function hideOverlays() {
  for (const id of ['titleScreen', 'pauseScreen', 'ledger', 'reveal', 'failure']) el(id).classList.add('hidden');
}

function showTitle() {
  state.mode = 'title';
  hideOverlays();
  el('titleScreen').classList.remove('hidden');
  el('hud').classList.add('hidden');
  refreshSaveButtons();
}

function startNewGame() {
  startAudio();
  state.cash = 800;
  state.respect = 0;
  state.health = 100;
  state.stars = 0;
  state.done = new Set();
  state.revealShown = false;
  player.x = 152;
  player.z = -256;
  if (state.vehicle) removeVehicle(state.vehicle);
  clearWanted();
  hideOverlays();
  el('hud').classList.remove('hidden');
  cameraYaw = 0.5;
  cameraPitch = 0.38;
  cameraDistance = 25;
  cameraTarget.set(player.x, MAP.landY + 2, player.z);
  startMission(0);
  announce('KOTA ARUNA. The harbour fare is waiting.');
}

function openLedger() {
  if (state.mode === 'ledger') {
    closeLedger();
    return;
  }
  if (state.mode !== 'play') return;
  state.mode = 'ledger';
  const list = el('ledgerList');
  list.innerHTML = '';
  MISSIONS.forEach((mission, index) => {
    const unlocked = index === 0 || state.done.has(MISSIONS[index - 1].id);
    const node = document.createElement('div');
    node.className = `mission${state.done.has(mission.id) ? ' done' : ''}${index === state.missionIndex ? ' current' : ''}`;
    node.innerHTML = `<b>${String(index + 1).padStart(2, '0')} · ${mission.title}</b>${mission.giver} · ${unlocked ? `$${mission.pay}` : 'locked'}<br><i>${mission.steps[0].text}</i>`;
    if (unlocked) {
      node.style.cursor = 'pointer';
      node.addEventListener('click', () => {
        startMission(index);
        toast(`${CREW.find((c) => c.name === mission.giver)?.line ?? 'Off you go.'}`, 5);
      });
    }
    list.appendChild(node);
  });
  const twist = el('twist');
  twist.classList.toggle('hidden', !state.revealShown);
  twist.textContent = state.revealShown
    ? 'Pasang Surut — the gates opened at high water, the relays were a decoy, and the book is now yours.'
    : '';
  el('ledger').classList.remove('hidden');
}

function closeLedger() {
  el('ledger').classList.add('hidden');
  state.mode = 'play';
}

function showReveal() {
  state.revealShown = true;
  el('revealText').textContent = 'Ara was never taking orders from the port. The channel gates were opened at high water so crates could pass the police unchecked; the smashed relays were noise to keep Sinta looking the wrong way. Dimas drove the boats, Bimo held the keys, and every earlier favour was an audition. Pasang Surut — the tide was the alibi. Now the book is yours.';
  el('reveal').classList.remove('hidden');
  state.mode = 'reveal';
  announce('Pasang Surut. The book is yours.');
}

function saveGame(slot) {
  try {
    const at = actor();
    window.localStorage.setItem(`kota-aruna.save.${slot}`, JSON.stringify({
      cash: state.cash, respect: state.respect, done: [...state.done],
      x: at.x, z: at.z, station: state.station, reveal: state.revealShown,
    }));
    toast(`Saved to slot ${slot + 1}`);
    refreshSaveButtons();
  } catch {
    toast('Storage is unavailable');
  }
}

function loadGame(slot) {
  try {
    const raw = window.localStorage.getItem(`kota-aruna.save.${slot}`);
    if (!raw) {
      toast('That slot is empty');
      return;
    }
    const data = JSON.parse(raw);
    startAudio();
    state.cash = data.cash ?? 800;
    state.respect = data.respect ?? 0;
    state.done = new Set(data.done ?? []);
    state.revealShown = Boolean(data.reveal);
    state.station = data.station ?? 0;
    state.stars = 0;
    player.x = data.x ?? 152;
    player.z = data.z ?? -256;
    if (state.vehicle) removeVehicle(state.vehicle);
    clearWanted();
    hideOverlays();
    el('hud').classList.remove('hidden');
    state.mode = 'play';
    toast(`Loaded slot ${slot + 1}`);
  } catch {
    toast('That save is unreadable');
  }
}

function refreshSaveButtons() {
  const holder = el('loadSlots');
  holder.innerHTML = '';
  for (let slot = 0; slot < 3; slot += 1) {
    const button = document.createElement('button');
    let label = `SLOT ${slot + 1} — EMPTY`;
    try {
      const raw = window.localStorage.getItem(`kota-aruna.save.${slot}`);
      if (raw) {
        const data = JSON.parse(raw);
        label = `SLOT ${slot + 1} — $${data.cash ?? 0}`;
      }
    } catch {
      label = `SLOT ${slot + 1} — EMPTY`;
    }
    button.textContent = label;
    button.addEventListener('click', () => loadGame(slot));
    holder.appendChild(button);
  }
}

function pauseGame() {
  if (state.mode !== 'play') return;
  state.mode = 'pause';
  el('pauseInfo').textContent = `${DISTRICTS[districtAt(actorX(), actorZ())].name} · $${state.cash} · ${state.stars} stars`;
  el('pauseScreen').classList.remove('hidden');
}

function resumeGame() {
  el('pauseScreen').classList.add('hidden');
  state.mode = 'play';
}

const keys = new Set();

function handleKey(rawKey) {
  const key = rawKey.toLowerCase();
  if (key === 'enter' && state.mode === 'title') {
    startNewGame();
    return;
  }
  if (key === 'escape') {
    if (state.mode === 'play') pauseGame();
    else if (state.mode === 'pause') resumeGame();
    else if (state.mode === 'ledger') closeLedger();
    return;
  }
  if (key === 'j') {
    openLedger();
    return;
  }
  if (state.mode !== 'play' || state.staged) return;
  if (key === 'e') interact();
  else if (key === 'f') saveGame(0);
  else if (key === 'x') reload();
  else if (key === 'r' || key === 't') {
    state.station = (state.station + (key === 'r' ? 1 : RADIO.length - 1)) % RADIO.length;
    startAudio();
    toast(`${RADIO[state.station].name} · ${RADIO[state.station].freq}`, 2);
  } else if (key === 'm') {
    state.muted = !state.muted;
    if (audio) audio.master.gain.value = state.muted ? 0 : 0.075;
  } else if (key === 'l' && state.vehicle?.kind === 'heli') {
    state.vehicle.light = !state.vehicle.light;
    toast(`Searchlight ${state.vehicle.light ? 'on' : 'off'}`);
  } else if (['1', '2', '3', '4'].includes(key)) {
    const index = Number(key) - 1;
    const weapon = WEAPONS[index];
    if (weapon.respect && state.respect < weapon.respect) {
      toast(`${weapon.name} needs ${weapon.respect} respect`);
    } else {
      state.weapon = index;
    }
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  keys.add(key);
  if (!event.repeat) handleKey(key);
  if (key === ' ') startAudio();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
el('scene').addEventListener('pointerdown', (event) => {
  dragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
});
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', (event) => {
  if (!dragging || state.staged) return;
  cameraYaw -= (event.clientX - lastPointerX) * 0.006;
  cameraPitch = clamp(cameraPitch + (event.clientY - lastPointerY) * 0.004, 0.1, 1.2);
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
});
window.addEventListener('wheel', (event) => {
  cameraDistance = clamp(cameraDistance + Math.sign(event.deltaY) * 2, 10, 52);
}, { passive: true });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

el('startBtn').addEventListener('click', startNewGame);
el('continueBtn').addEventListener('click', () => loadGame(0));
el('resumeBtn').addEventListener('click', resumeGame);
el('saveBtn').addEventListener('click', () => saveGame(0));
el('closeLedger').addEventListener('click', closeLedger);
el('closeReveal').addEventListener('click', () => {
  el('reveal').classList.add('hidden');
  state.mode = 'play';
});
el('retryBtn').addEventListener('click', () => {
  el('failure').classList.add('hidden');
  startMission(Math.max(0, state.missionIndex));
});

function stageShot(name) {
  const view = SHOT_VIEWS[name];
  state.staged = true;
  state.mode = 'play';
  state.time = 12.5;
  state.cash = 18450;
  state.respect = 62;
  state.health = 100;
  state.stars = view.stars;
  state.station = name === 'finale' ? 3 : 0;
  hideOverlays();
  el('hud').classList.remove('hidden');

  if (view.vehicle) {
    const ride = vehicles.find((v) => v.kind === view.vehicle);
    if (ride) {
      state.vehicle = ride;
      ride.x = view.x;
      ride.z = view.z;
      ride.yaw = view.heading;
      ride.speed = name === 'chase' ? 22 : name === 'cover' ? 16 : 6;
      ride.altitude = ride.kind === 'heli' ? 26 : 0;
      ride.y = MAP.landY + 4 + ride.altitude;
      ride.mesh.position.set(view.x, ride.y, view.z);
      ride.mesh.rotation.set(0, view.heading, 0);
      ride.light = Boolean(view.light);
      player.x = view.x;
      player.z = view.z;
      player.mesh.visible = false;
    }
  } else {
    player.x = view.x;
    player.z = view.z;
    player.yaw = view.heading;
    player.mesh.position.set(view.x, MAP.landY, view.z);
    player.mesh.rotation.y = view.heading;
    player.mesh.visible = true;
  }

  cameraYaw = view.heading;
  cameraPitch = view.pitch;
  cameraDistance = view.distance;
  const at = actor();
  const target = new THREE.Vector3(at.x, at.y + (at.kind === 'heli' ? 6 : 2.2), at.z);
  cameraTarget.copy(target);
  const horizontal = Math.cos(cameraPitch) * cameraDistance;
  camera.position.set(
    target.x - Math.sin(cameraYaw) * horizontal,
    target.y + Math.sin(cameraPitch) * cameraDistance,
    target.z - Math.cos(cameraYaw) * horizontal,
  );
  camera.lookAt(target);

  if (name === 'chase') {
    for (let i = 0; i < 5; i += 1) {
      const angle = -0.9 + i * 0.42;
      const car = addVehicle('police', view.x + Math.sin(angle) * (26 + i * 7), view.z + Math.cos(angle) * (24 + i * 6), angle + Math.PI, '#f1f4f7', true);
      car.ai = true;
      car.speed = 12;
      car.mesh.position.set(car.x, MAP.landY, car.z);
      car.mesh.rotation.y = car.yaw;
      police.push(car);
    }
  }
  if (name === 'crew') {
    const mission = MISSIONS[2];
    state.missionIndex = 2;
    state.step = 0;
    el('missionTitle').textContent = '03 · DEAD AIR';
    spawnMissionProps(mission);
    openLedger();
    state.mode = 'play';
  } else if (name === 'finale') {
    state.missionIndex = 6;
    state.step = 0;
    state.revealShown = true;
    el('missionTitle').textContent = '07 · PASANG SURUT';
  } else {
    state.missionIndex = name === 'chase' ? 3 : 0;
    state.step = 0;
    el('missionTitle').textContent = name === 'chase' ? '04 · RED TIDE RUN' : '01 · HARBOUR FARE';
  }
  el('objective').textContent = currentStep()?.text ?? 'Keep the book close';
  updateHud();
  announce(`KOTA ARUNA staged: ${name}`);
}

let previousTime = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - previousTime) / 1000, 0, 0.05);
  previousTime = now;
  if (!state.staged) {
    if (state.mode === 'play') {
      state.time += dt;
      if (keys.has('arrowleft')) cameraYaw += dt * 1.5;
      if (keys.has('arrowright')) cameraYaw -= dt * 1.5;
      if (keys.has('arrowup')) cameraPitch = clamp(cameraPitch - dt * 0.8, 0.1, 1.2);
      if (keys.has('arrowdown')) cameraPitch = clamp(cameraPitch + dt * 0.8, 0.1, 1.2);
      if (!state.vehicle) updatePlayer(dt);
      updateVehicles(dt);
      updateLaw(dt);
      updateMission(dt);
      updatePeds(dt);
      if (keys.has(' ')) shoot();
    }
  }
  if (state.staged) state.time += dt * 0.25;
  if (state.mode === 'play') updateRadio(dt);
  updateVisuals(dt);
  updateHud();
  renderer.render(scene, camera);
  if (state.staged) {
    state.stagedFrames += 1;
    if (state.stagedFrames === 6) window.__shotReady = true;
  }
}

buildSlots();
if (shotName) stageShot(shotName);
else showTitle();
requestAnimationFrame(frame);
