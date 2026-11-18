// KOTA ARUNA — boot module.
//
// No build step: index.html maps 'three' to the vendored module and loads this file as an ES
// module. The city, player, vehicles, traffic, police, combat and UI are built once, then one
// animation loop runs. Simulation advances in fixed 1/60 s steps; drawing happens once per frame.
// Screens are title → play → pause (→ play/title). ?seed=N pins the generated layout.
// ?shot=cover|chase|beach|garage stages a deterministic scene, runs three seconds of that same
// simulation and raises window.__shotReady so a screenshot can be taken at a known moment.

import * as THREE from 'three';
import { CITY_NAME, STEP } from './config.js';
import { createCity } from './city.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createRandom } from './random.js';
import { createVehicles } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createDialog } from './dialog.js';
import { createMissions, MISSION_IDS } from './missions.js';
import { createProgress } from './progress.js';
import { createHud } from './hud.js';
import { createRadio } from './radio.js';
import { createAudio } from './audio.js';
import { createMenu } from './menu.js';
import { createShotScene, SHOT_FRAMES } from './shots.js';

const MAX_FRAME = 0.25;
const AUTOSAVE_SECONDS = 90;

/** Safe road-side respawn points: two hospitals and two police stations. */
const RESPAWN_POINTS = [
  { name: 'RS Pelabuhan', kind: 'hospital', x: -90, z: -180 },
  { name: 'Polsek Teluk Aruna', kind: 'police', x: -180, z: -270 },
  { name: 'RS Marina Senja', kind: 'hospital', x: -180, z: 180 },
  { name: 'Polsek Pasir Putih', kind: 'police', x: -270, z: 270 },
];
const PENALTY = { busted: 500, wasted: 1000 };

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const parsedSeed = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isFinite(parsedSeed)
  ? parsedSeed >>> 0
  : (shotName ? 20261118 : Math.floor(Math.random() * 4294967296));
const random = createRandom(seed);

const canvas = document.getElementById('game');
const hudRoot = document.getElementById('hud') || document.body;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 3000);
const city = createCity(THREE, random);
const input = createInput(canvas);

const spawn = city.spawnPoints[0];
const player = createPlayer(THREE, city.scene, city, spawn);
player.input = input;

const vehicles = createVehicles(THREE, city.scene, city, createRandom(seed ^ 0x5eed1));
const traffic = createTraffic(THREE, city.scene, city, vehicles, createRandom(seed ^ 0x71aff));

// Audio is silent until the title screen's MULAI button counts as a gesture.
const audio = createAudio();
const radio = createRadio();

// Career progression: REP, rank titles, money and stats are shared with the mission system.
const progress = createProgress({ money: 2500 });
let missions = null;
let pendingRespawn = null;
let notice = '';
let noticeUntil = 0;
let screen = 'title';

function showNotice(text, duration = 4200) {
  notice = text;
  noticeUntil = performance.now() + duration;
}
function clearNotice() {
  notice = '';
  noticeUntil = 0;
}

// Missions and the progress store raise their own banners; this keeps one notice line in the HUD.
progress.on((kind, detail) => {
  if (kind === 'rank') showNotice(`RANK BARU  ·  ${detail}`, 5000);
});

function onMissionEvent(type, data) {
  if (type === 'complete') {
    showNotice(`JOB SELESAI  ·  ${data.title}  +$${data.reward.money}  +${data.reward.rep} REP`, 5400);
  } else if (type === 'fail') {
    showNotice(`JOB GAGAL  ·  ${data.title}  ·  ${data.reason}`, 5400);
  } else if (type === 'offer') {
    showNotice(`JOB BARU  ·  ${data.title}  ·  temui ${data.giver} di penanda emas`, 4600);
  } else if (type === 'story-complete') {
    showNotice('KOTA ARUNA  ·  KISAH KRU SELESAI  ·  TERIMA KASIH', 9000);
  } else if (type === 'loaded') {
    showNotice(data.title ? `MISI DIPULIHKAN  ·  ${data.title}` : 'PERMAINAN DIMUAT', 3400);
  }
}

function nearestRespawn(pos) {
  let best = RESPAWN_POINTS[0];
  let bestDistance = Infinity;
  for (const point of RESPAWN_POINTS) {
    const dx = point.x - pos.x;
    const dz = point.z - pos.z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best;
}

/** Events from police/combat: an arrest or death sends Ara to the closest hospital or station. */
function handleEvent(type, data) {
  if (type === 'shot' || type === 'swing') {
    audio.gunshot({ weapon: data && data.weapon });
    return;
  }
  if (type === 'police-shot') {
    audio.gunshot({ distant: true });
    return;
  }
  if (type === 'vehicle-hit' || type === 'player-hit' || type === 'ram') {
    audio.impact();
  }
  if (type !== 'busted' && type !== 'wasted') return;
  if (pendingRespawn) return;
  const point = nearestRespawn(player.pos);
  pendingRespawn = { kind: type, point };
  const penalty = PENALTY[type];
  progress.addMoney(-penalty);
  showNotice(`${type.toUpperCase()}  -$${penalty}  ·  ${point.name.toUpperCase()}`);
  if (missions) missions.onGameEvent(type, data);
}

const police = createPolice(THREE, city.scene, city, player, traffic, handleEvent);
const combat = createCombat(THREE, player, traffic, police, handleEvent);
police.setRotorAudioHook((state) => audio.setHeli(state));

// Dialog and story run on top of the world; the dialog box lives inside the HUD overlay.
const dialog = createDialog({ container: hudRoot });
missions = createMissions({
  THREE, scene: city.scene, player, vehicles, traffic, police, dialog, progress,
  onEvent: onMissionEvent,
});

// Menus own the save slots and the two garage pads; the HUD receives one snapshot each frame.
const menu = createMenu({
  THREE, scene: city.scene, container: document.body,
  player, vehicles, progress, missions, police, dialog, radio,
  getSeed: () => seed,
  onNotice: showNotice,
  // The MULAI click is the gesture that permits WebAudio to make any sound.
  onStart: () => {
    audio.unlock();
    radio.unlock();
    setScreen('play');
  },
  onResume: () => {
    audio.unlock();
    radio.unlock();
    setScreen('play');
  },
  onPause: () => setScreen('pause'),
  onQuit: () => setScreen('title'),
});
const hud = createHud({ container: hudRoot });

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/** The single place that switches between title, play and pause. */
function setScreen(next) {
  screen = next === 'title' || next === 'pause' ? next : 'play';
  menu.setScreen(screen);
  const playing = screen === 'play';
  radio.setMuted(!playing);
  audio.setMuted(!playing);
  if (playing) {
    previous = performance.now();
    // Drop edges held from the menu so clicking MULAI does not fire a weapon or jump.
    input.consumeJump();
    input.consumeEnter();
    input.consumeWeapon();
    input.consumeReload();
    input.consumeLook();
    input.consumeZoom();
  } else {
    menu.saveGame('auto', true);
    audio.setEngine(false, 0);
    audio.setSiren(false);
  }
}
menu.setScreen('title');

function respawn() {
  const { point } = pendingRespawn;
  pendingRespawn = null;
  if (player.inVehicle && player.vehicle) {
    player.vehicle.occupied = false;
    player.vehicle.speed = 0;
    player.inVehicle = false;
  }
  player.health = 100;
  player.setFromSpawn(point);
  police.onRespawn();
}

let elapsed = 0;
let accumulator = 0;
let previous = performance.now();
let autosaveTimer = 0;

function step(dt) {
  elapsed += dt;
  city.update(elapsed);

  // Story first: the typewriter and mission markers keep animating during a conversation, but the
  // simulation pauses so a briefing cannot end with Ara being arrested mid-sentence.
  dialog.update(dt);
  missions.update(dt);
  if (dialog.isActive()) {
    // Drop any gameplay edge presses accumulated while reading, so they do not fire on close.
    input.consumeJump();
    input.consumeEnter();
    input.consumeWeapon();
    input.consumeReload();
    input.consumeLook();
    input.consumeZoom();
    return;
  }

  if (pendingRespawn) respawn();

  // R is reload on foot but the radio dial in a car (OFF → 87.6 → 91.2 → 104.7 → OFF).
  if (player.inVehicle && player.vehicle && input.consumeReload()) radio.pressR();

  const wasOnFoot = !player.inVehicle;
  vehicles.update(dt, player);
  if (wasOnFoot && player.inVehicle && player.vehicle) {
    // A car with a local standing next to it was stolen from its owner.
    let ownerNear = false;
    for (const ped of traffic.peds) {
      if (ped.state === 'down') continue;
      const dx = ped.pos.x - player.vehicle.pos.x;
      const dz = ped.pos.z - player.vehicle.pos.z;
      if (dx * dx + dz * dz < 121) { ownerNear = true; break; }
    }
    if (ownerNear) police.reportCrime('carjacking', 1);
  }
  if (player.health <= 0 && !pendingRespawn) handleEvent('wasted', { cause: 'damage' });

  player.update(dt, input, camera);
  combat.update(dt, input, camera);
  const gained = traffic.update(dt, player.pos, police.getWanted());
  if (gained > 0) police.reportCrime('hit-ped', gained);
  police.update(dt);

  autosaveTimer += dt;
  if (autosaveTimer >= AUTOSAVE_SECONDS) {
    autosaveTimer = 0;
    menu.saveGame('auto', true);
  }
}

// ---- HUD snapshot: one object, reused arrays, no per-frame allocations in the hot path ----------
const hudState = { player: {} };
const policeBlips = [];
const vehicleBlips = [];
const weaponViews = [];
for (let i = 0; i < 4; i += 1) weaponViews.push({ slot: 0, name: '', ammo: 0, maxAmmo: 0 });

function buildHudState(dt) {
  const car = player.inVehicle && player.vehicle ? player.vehicle : null;
  const weapon = combat.getState();
  const district = city.districtOf(player.pos.x, player.pos.z);
  const mission = missions && typeof missions.current === 'function' ? missions.current() : null;
  const weapons = combat.getWeapons();

  policeBlips.length = 0;
  for (const officer of police.officers) {
    if (officer.dead) continue;
    let blip = policeBlips[policeBlips.length];
    if (!blip) {
      blip = { x: 0, z: 0, type: '' };
      policeBlips.push(blip);
    }
    blip.x = officer.pos.x;
    blip.z = officer.pos.z;
    blip.type = 'foot';
  }
  for (const unit of police.cars) {
    let blip = policeBlips[policeBlips.length];
    if (!blip) {
      blip = { x: 0, z: 0, type: '' };
      policeBlips.push(blip);
    }
    blip.x = unit.pos.x;
    blip.z = unit.pos.z;
    blip.type = 'car';
  }
  const heli = police.helicopter;
  if (heli && heli.active) {
    let blip = policeBlips[policeBlips.length];
    if (!blip) {
      blip = { x: 0, z: 0, type: '' };
      policeBlips.push(blip);
    }
    blip.x = heli.group.position.x;
    blip.z = heli.group.position.z;
    blip.type = 'heli';
  }

  vehicleBlips.length = 0;
  const cars = vehicles.cars;
  for (let i = 0; i < cars.length && i < 60; i += 1) vehicleBlips.push(cars[i]);
  for (let i = 0; i < weaponViews.length; i += 1) {
    const item = weapons[i];
    const view = weaponViews[i];
    if (!item) {
      view.slot = i + 1;
      view.name = '—';
      view.ammo = 0;
      view.maxAmmo = 0;
      continue;
    }
    view.slot = item.slot;
    view.name = item.name;
    view.ammo = item.ammo;
    view.maxAmmo = item.maxAmmo;
  }

  hudState.dt = dt;
  hudState.seed = seed;
  hudState.cityName = CITY_NAME;
  hudState.district = district;
  hudState.districtTag = district ? `LOKASI  ·  ${district.name}` : `${CITY_NAME}  ·  SEED ${seed}`;
  const playerView = hudState.player;
  playerView.x = player.pos.x;
  playerView.z = player.pos.z;
  playerView.heading = car ? car.heading : 0;
  playerView.health = player.health;
  playerView.inVehicle = !!car;
  hudState.car = car;
  hudState.money = progress.getMoney();
  hudState.rep = progress.getRep();
  hudState.rank = progress.getRank();
  hudState.rankInfo = progress.getRankInfo();
  hudState.wanted = police.getWanted();
  hudState.weapons = weaponViews;
  hudState.currentSlot = weapon.slot;
  hudState.reloading = weapon.reloading;
  hudState.aiming = weapon.aiming;
  hudState.objective = missions ? missions.objectiveText() : '';
  hudState.missionTarget = mission ? mission.target : null;
  hudState.policeBlips = policeBlips;
  hudState.vehicleBlips = vehicleBlips;
  hudState.buildings = city.getCollisionBoxes();
  hudState.policeUnits = police.getUnits();
  hudState.garages = menu.garages;
  hudState.garageHint = menu.getGarageHint(player.pos, car);
  hudState.radio = radio.getState();
  hudState.notice = performance.now() < noticeUntil ? notice : '';
  hudState.dialogActive = dialog.isActive();
  hudState.showCrosshair = screen === 'play';
  return hudState;
}

/** Audio, menus, HUD and the one draw call: shared by normal play and staged shots. */
function present(dt) {
  const car = player.inVehicle && player.vehicle ? player.vehicle : null;
  const live = screen === 'play' && !dialog.isActive();
  radio.setInVehicle(screen === 'play' && !!car);
  audio.setEngine(live && !!car, car ? car.speedKmh / 170 : 0);
  audio.setSiren(screen === 'play' && police.getWanted() > 0);
  audio.update(dt);
  menu.update(dt, radio.name);
  hud.update(buildHudState(dt || STEP));
  renderer.render(city.scene, camera);
}

function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min(Math.max(0, (now - previous) / 1000), MAX_FRAME);
  previous = now;

  if (screen === 'play') {
    accumulator += frameDt;
    let guard = 0;
    while (accumulator >= STEP && guard < 8) {
      step(STEP);
      accumulator -= STEP;
      guard += 1;
    }
  } else {
    accumulator = 0;
  }
  present(frameDt);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) previous = performance.now();
});

window.__kotaAruna = {
  THREE, city, player, vehicles, traffic, police, combat, input, camera, seed,
  dialog, missions, progress, hud, radio, audio, menu,
  respawnPoints: RESPAWN_POINTS,
  get screen() { return screen; },
  get wantedLevel() { return police.getWanted(); },
  get money() { return progress.getMoney(); },
  get rep() { return progress.getRep(); },
  get rank() { return progress.getRank(); },
  setScreen,
  showNotice,
  clearNotice,
  startJob: (id) => missions.startJob(id),
  saveGame: (slot) => menu.saveGame(slot),
  loadGame: (slot) => menu.loadGame(slot),
};

hud.update(buildHudState(STEP));

if (shotName) {
  // Staged screenshots advance the *same* simulation with a fixed step, independent of how fast
  // the host machine paints, so every shot resolves to the same frame for a given seed.
  window.__shotReady = false;
  const shot = createShotScene(shotName, {
    THREE, city, player, vehicles, traffic, police, missions, menu, radio, dialog, progress,
    camera, setScreen, clearNotice,
  });
  shot.setup();
  let frames = 0;
  function shotFrame() {
    shot.beforeStep();
    step(STEP);
    shot.afterStep();
    frames += 1;
    present(STEP);
    if (frames < SHOT_FRAMES) {
      requestAnimationFrame(shotFrame);
    } else {
      shot.finish();
      present(STEP);
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(shotFrame);
} else {
  requestAnimationFrame(frame);
}
