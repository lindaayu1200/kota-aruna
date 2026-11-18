// KOTA ARUNA — deterministic staged scenes for ?shot=cover|chase|beach|garage.
//
// Each shot starts from a fresh seeded world, places Ara and the camera, sets up exactly the UI the
// frame needs, then lets main.js advance the real simulation in fixed 1/60 s steps for three
// seconds. Nothing here fakes a rendered frame: the shot ends with ordinary game state and a real
// HUD, so a screenshot is an honest view of the game. The controller only steers a few things a
// player would otherwise steer (the car's wheel and the helicopter's orbit angle).

import { ROADS } from './config.js';
import { MISSION_IDS } from './missions.js';

/** Three seconds at the simulation's fixed step. */
export const SHOT_FRAMES = 180;

const STEPS = SHOT_FRAMES;
const HALF_PI = Math.PI / 2;

function wrap(angle) {
  return ((angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

/** A tiny stand-in for the keyboard during shots: flags the autopilot can drive directly. */
function createShotInput() {
  const look = { x: 0, y: 0 };
  return {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
    handbrake: false,
    fire: false,
    aim: false,
    consumeJump: () => false,
    consumeEnter: () => false,
    consumeWeapon: () => 0,
    consumeReload: () => false,
    consumeLook: () => look,
    consumeZoom: () => 0,
  };
}

function tallestTower(city) {
  let best = null;
  for (const box of city.getCollisionBoxes()) {
    if (box.district !== 'teluk-aruna') continue;
    if (!best || box.height > best.height) best = box;
  }
  return best;
}

function palmNear(city, x, z) {
  let best = null;
  let bestDistance = Infinity;
  for (const palm of city.getPalms()) {
    if (palm.z < 70 || palm.z > 340 || palm.x < -345 || palm.x > -282) continue;
    const dx = palm.x - x;
    const dz = palm.z - z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = palm;
    }
  }
  return best;
}

/** Point on the ring road at ellipse parameter t, plus the direction of travel. */
function ringPoint(t) {
  const ring = ROADS.ring;
  const x = ring.center[0] + Math.cos(t) * ring.radiusX;
  const z = ring.center[1] + Math.sin(t) * ring.radiusZ;
  const heading = Math.atan2(-Math.sin(t) * ring.radiusX, Math.cos(t) * ring.radiusZ);
  return { x, z, heading };
}

/**
 * @param {string} rawName - the ?shot= value
 * @param {object} deps - the live game systems from main.js
 */
export function createShotScene(rawName, deps) {
  const name = ['cover', 'chase', 'beach', 'garage'].includes(rawName) ? rawName : 'cover';
  const {
    city, player, vehicles, police, missions, menu, radio, dialog, progress, camera, setScreen, clearNotice,
  } = deps;
  const shotInput = createShotInput();
  let car = null;
  let ringT = 0;
  let garageReveal = null;
  let revealLabel = null;

  function baseSetup() {
    dialog.clear();
    // Completing the story offline stops the two-second auto-briefing from opening a dialog over
    // a staged shot; load() also sets bootDone, so the offer marker logic stays quiet.
    missions.load({ completed: MISSION_IDS.slice(), activeId: null, stageIndex: 0, unlock: null });
    clearNotice();
    player.input = shotInput;
    player.health = 100;
    if (player.inVehicle && player.vehicle) {
      player.vehicle.occupied = false;
      player.inVehicle = false;
    }
    if (player.group) player.group.visible = true;
    setScreen('play');
    clearNotice();
  }

  function setupCover() {
    baseSetup();
    progress.setMoney(7850);
    progress.setRep(185);
    police.setWanted(3);

    // Stand Ara on Jalan Nelayan in TELUK ARUNA. The sun disc sits to the west-southwest, so
    // place the third-person camera east-north-east of her: we look over her shoulder into the
    // sunset with the neon downtown towers flanking the street on both sides.
    const px = -90;
    const pz = -150;
    const yaw = 1.2;
    player.setFromSpawn({ x: px, z: pz });
    // The conversation pauses the simulation before player.update() runs, so mirror the spawn
    // into the visible group now instead of leaving Ara at the city's old starting point.
    if (player.group) {
      player.group.visible = true;
      player.group.position.copy(player.pos);
      player.group.rotation.y = yaw + Math.PI; // face the sunset, away from the camera
    }
    player.setView({ yaw, pitch: 0.2, distance: 10.5 });
    // Camera behind and slightly above Ara, aimed at her upper body.
    player.snapCamera(camera);

    // Leave the conversation on an Ara line with Dimas' reply just above it in the script.
    dialog.play([
      {
        speaker: 'DIMAS',
        text: 'Ara, Gerhan menguasai dermaga dan semua kunci gudangnya. Kita mulai dari kiriman kecil malam ini.',
      },
      {
        speaker: 'ARA',
        text: 'Aku tahu jalannya. Kalau peti ini sampai utuh, kru kita akhirnya punya nama di teluk ini.',
      },
    ]);
    dialog.advance();
    dialog.advance();
    dialog.advance();
  }

  function setupChase() {
    baseSetup();
    police.setHeliFormation({ altitude: 20, radius: 42 });
    police.setWanted(3);

    ringT = 2.4;
    const spot = ringPoint(ringT);
    car = vehicles.spawnModel('Badai Coupe', spot.x, spot.z, spot.heading, true);
    car.speed = 38;
    car.occupied = true;
    player.vehicle = car;
    player.pos.copy(car.pos);
    player.setView({ yaw: spot.heading + Math.PI, pitch: 0.08, distance: 12 });
  }

  function beforeChaseStep() {
    if (!car) return;
    shotInput.forward = true;
    shotInput.back = false;
    shotInput.handbrake = false;
    // Aim a little way around the ellipse: that is all the steering a ring road needs.
    const ring = ROADS.ring;
    const nx = (car.pos.x - ring.center[0]) / ring.radiusX;
    const nz = (car.pos.z - ring.center[1]) / ring.radiusZ;
    const here = Math.atan2(nz, nx);
    const ahead = ringPoint(here + 0.19);
    const desired = Math.atan2(ahead.x - car.pos.x, ahead.z - car.pos.z);
    const delta = wrap(desired - car.heading);
    shotInput.right = delta > 0.04;
    shotInput.left = delta < -0.04;
  }

  function afterChaseStep() {
    const heli = police.helicopter;
    if (heli && heli.active && car) {
      // Keep the searchlight in front of the windscreen instead of drifting out of frame.
      heli.angle = HALF_PI - car.heading;
    }
  }

  function setupBeach() {
    baseSetup();
    // Frame Ara on the sand looking west: palms sit in midground and the shoreline/water are
    // clearly visible behind them, while the mission marker glows ahead up the beach.
    const anchor = palmNear(city, -318, 215);
    const ax = anchor ? anchor.x : -320;
    const az = anchor ? anchor.z : 215;
    const px = ax + 18;
    const pz = az - 6;
    player.setFromSpawn({ x: px, z: pz });
    if (player.group) {
      player.group.visible = true;
      player.group.rotation.y = -1.2; // face toward the sea and palms
    }
    // Camera east of Ara looking west, pulled back and left so no trunk dominates the foreground.
    player.setView({ yaw: HALF_PI + 0.28, pitch: 0.18, distance: 15 });
    // A gold offer marker a little way up the beach: glowing, but outside its pickup radius.
    missions.load({
      completed: MISSION_IDS.slice(),
      activeId: null,
      stageIndex: 0,
      unlock: { jobId: 'malam-neon', x: ax - 10, z: az - 58, radius: 26 },
    });
    clearNotice();
  }

  function setupGarage() {
    baseSetup();
    progress.setMoney(6420);
    const garageDef = menu.getGarages().find((item) => item.district === 'MARINA SENJA')
      || menu.getGarages()[0];
    const gx = garageDef.x;
    const gz = garageDef.z;

    // Put a stored car on the pad so the 3D garage reads clearly in the shot.
    car = vehicles.spawnModel('Kencana Pickup', gx + 1.5, gz + 1.5, 0.18, true);
    car.speed = 0;
    car.occupied = false;
    // Mark the pad as holding a stored car (for the green ring / hint state) while keeping the
    // car mesh visible on the pad for this reveal shot.
    const internal = (menu.garages || []).find((item) => item.id === garageDef.id);
    garageReveal = internal || null;
    if (garageReveal) {
      garageReveal.stored = vehicles.describeCar(car);
      if (garageReveal.ringMat) garageReveal.ringMat.color.setHex(0x8ce6a0);
    }

    // Ara stands on foot beside the pad so the garage, car and hint are all in frame.
    player.inVehicle = false;
    player.setFromSpawn({ x: gx + 10, z: gz + 10 });
    if (player.group) {
      player.group.visible = true;
      player.group.rotation.y = -2.2;
    }
    player.setView({ yaw: -0.6, pitch: 0.4, distance: 17 });

    radio.setStation(0);
    radio.setInVehicle(false);
    setScreen('play');

    // Keep a small pause-like panel with the radio station label while the 3D scene stays visible.
    if (menu && menu.root) menu.root.classList.add('ka-shot-garage');
    if (typeof document !== 'undefined') {
      revealLabel = document.createElement('div');
      revealLabel.style.cssText = 'position:fixed;right:22px;top:18px;z-index:30;'
        + 'padding:14px 18px;border-radius:12px;'
        + 'background:linear-gradient(180deg,rgba(48,28,70,.92),rgba(18,11,32,.94));'
        + 'border:1px solid rgba(255,205,150,.4);color:#ffe6c6;'
        + 'font:800 13px/1.4 ui-monospace,monospace;letter-spacing:.14em;'
        + 'box-shadow:0 10px 28px rgba(4,2,12,.55);pointer-events:none';
      revealLabel.innerHTML = '<div style="font-size:10px;letter-spacing:.22em;color:#ffc857;margin-bottom:6px">DIJEDA</div>'
        + `<div style="color:#55e6ff">♪  RADIO  ·  ${radio.getState().name}</div>`;
      document.body.appendChild(revealLabel);
    }

    dialog.clear();
    clearNotice();
  }

  const setups = { cover: setupCover, chase: setupChase, beach: setupBeach, garage: setupGarage };
  const before = { chase: beforeChaseStep };
  const after = { chase: afterChaseStep };

  return {
    name,
    steps: STEPS,
    setup() { setups[name](); },
    beforeStep() { if (before[name]) before[name](); },
    afterStep() { if (after[name]) after[name](); },
    finish() {
      if (name !== 'cover') dialog.clear();
      if (revealLabel && revealLabel.parentNode) revealLabel.parentNode.removeChild(revealLabel);
      revealLabel = null;
      if (menu && menu.root) menu.root.classList.remove('ka-shot-garage');
      if (garageReveal) {
        // Restore pad to a normal empty state after the staged capture.
        garageReveal.stored = null;
        if (garageReveal.ringMat) {
          const base = garageReveal.color != null ? garageReveal.color : 0xffc857;
          garageReveal.ringMat.color.setHex(base);
        }
        garageReveal = null;
      }
    },
  };
}
