// KOTA ARUNA — police response: wanted stars, named pursuit units, foot officers, patrol cars and
// the searchlight helicopter. This module owns the wanted level; other systems report crimes with
// reportCrime(type, amount) and listen for 'busted', 'wasted', 'crime' and 'wanted' events.
import { CITY, ROADS } from './config.js';
import { createRandom } from './random.js';

const FOOT_CALLSIGNS = [
  'Unit Pasir-2', 'Sersan Maya', 'Unit Angin-5', 'Briptu Dani',
  'Unit Karang-9', 'Aipda Sari', 'Unit Senja-4', 'Kaur Rendi',
  'Unit Bintang-6', 'Brigadir Nusa',
];
const CAR_CALLSIGNS = [
  'Patroli Laut-7', 'Unit Biru-3', 'Mobil Aruna-6', 'Patroli Delta-2',
  'Unit Badai-4', 'Mobil Pelabuhan-8',
];
const HELI_CALLSIGNS = ['Heli Langit-1', 'Heli Cakrawala-2'];

const DECAY_AFTER = 20;      // seconds hidden with no new crime before stars start falling
const DECAY_EVERY = 6;       // seconds per lost star after that
const SIGHT_RANGE = 96;      // metres: closer than this and the player is considered "seen"
const ARREST_RANGE = 2.6;
const UP = { x: 0, y: 1, z: 0 };

const CRIME_WEIGHTS = {
  'hit-ped': 2,
  'shoot-ped': 2,
  carjacking: 1,
  'shoot-cop': 2,
  'shoot-police-car': 1,
  'shoot-car': 1,
  ram: 1,
  'hit-officer': 2,
};

function onLand(x, z) {
  if (x < CITY.beach.west + 2 || x > CITY.halfWidth - 4) return false;
  if (Math.abs(z) > CITY.halfDepth - 4) return false;
  const c = CITY.channel;
  if (x <= c.east && z >= c.centerZ - c.width / 2 && z <= c.centerZ + c.width / 2) {
    return ROADS.bridges.some((b) => Math.abs(x - b.x) <= ROADS.width / 2 + 3);
  }
  return true;
}

function wrapAngle(angle) {
  return ((angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function makeOfficerMesh(THREE) {
  const group = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: '#263b5e', roughness: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: '#151d2e', roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: '#d9a385', roughness: 0.85 });
  const gold = new THREE.MeshBasicMaterial({ color: '#ffd479' });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.1, 0.48), navy);
  torso.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), skin);
  head.position.y = 2.12;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), dark);
  cap.position.y = 2.4;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.2), dark);
  brim.position.set(0, 2.32, 0.3);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.04), gold);
  badge.position.set(0.22, 1.5, 0.26);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.28), dark);
  legL.position.set(-0.19, 0.42, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.28), dark);
  legR.position.set(0.19, 0.42, 0);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.24), navy);
  armL.position.set(-0.5, 1.34, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.24), navy);
  armR.position.set(0.5, 1.34, 0);
  group.add(torso, head, cap, brim, badge, legL, legR, armL, armR);
  return { group, legL, legR };
}

function makePoliceCarMesh(THREE) {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#e8edf3', roughness: 0.45, metalness: 0.2 });
  const navy = new THREE.MeshStandardMaterial({ color: '#213753', roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1b2b40', roughness: 0.2, metalness: 0.4 });
  const tire = new THREE.MeshStandardMaterial({ color: '#14151b', roughness: 1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 4.6), white);
  body.position.y = 0.82;
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.32, 4.55), navy);
  skirt.position.y = 0.6;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.8, 2.4), white);
  cabin.position.set(0, 1.62, -0.2);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), glass);
  windshield.position.set(0, 1.66, 1.02);
  group.add(body, skirt, cabin, windshield);

  const red = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.34), new THREE.MeshBasicMaterial({ color: '#ff3652' }));
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.34), new THREE.MeshBasicMaterial({ color: '#3b7bff' }));
  red.position.set(-0.42, 2.16, -0.2);
  blue.position.set(0.42, 2.16, -0.2);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.4), navy);
  bar.position.set(0, 2.02, -0.2);
  group.add(red, blue, bar);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheels = [];
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const wheel = new THREE.Mesh(wheelGeo, tire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.97, 0.42, end * 1.45);
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  return { group, wheels, red, blue };
}

function makeHelicopterMesh(THREE) {
  const group = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: '#263c5d', roughness: 0.55, metalness: 0.3 });
  const navyDark = new THREE.MeshStandardMaterial({ color: '#18273d', roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: '#9bd8e8', roughness: 0.12, metalness: 0.55 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), navy);
  body.scale.set(2.0, 1.55, 4.4);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), glass);
  nose.scale.set(1.65, 1.15, 1.85);
  nose.position.set(0, 0.1, 3.1);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 7.6), navy);
  boom.position.set(0, 0.35, -6.6);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 1.4), navyDark);
  fin.position.set(0, 1.5, -10.1);
  group.add(body, nose, boom, fin);

  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 6.4), navyDark);
    skid.position.set(side * 1.45, -2.3, 0);
    group.add(skid);
    for (const end of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), navyDark);
      strut.position.set(side * 1.2, -1.6, end * 1.8);
      group.add(strut);
    }
  }

  const mainRotor = new THREE.Group();
  mainRotor.position.y = 2.1;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 10), navyDark);
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(15, 0.1, 0.46), navyDark);
  const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 15), navyDark);
  mainRotor.add(hub, bladeA, bladeB);
  group.add(mainRotor);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.5, 1.2, -10.0);
  const tailA = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.0, 0.22), navyDark);
  const tailB = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 3.0), navyDark);
  tailRotor.add(tailA, tailB);
  group.add(tailRotor);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(1, 1, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#fff0bf', transparent: true, opacity: 0.07,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    }),
  );
  cone.visible = false;
  const light = new THREE.SpotLight('#fff0c4', 130, 190, 0.17, 0.45, 1.25);
  const target = new THREE.Object3D();
  return { group, mainRotor, tailRotor, cone, light, target };
}

export function createPolice(THREE, scene, city, player, traffic, onEvent) {
  const random = createRandom(0xA71CE);
  const emit = (type, data) => {
    if (typeof onEvent === 'function') onEvent(type, data || {});
  };

  const officers = [];
  const cars = [];
  const boxes = city.getCollisionBoxes ? city.getCollisionBoxes() : [];
  const dir = new THREE.Vector3();
  const up = new THREE.Vector3(UP.x, UP.y, UP.z);

  let wanted = 0;
  let time = 0;
  let lastCrime = -100;
  let decayTimer = 0;
  let down = false;
  let nextId = 1;
  let heli = null;
  let rotorHook = null;
  let hookTimer = 0;
  let heliAltitude = 46;
  let heliRadius = 44;
  const unitPool = [];
  const unitsOut = [];
  const targetPool = [];
  const targetsOut = [];

  function distanceTo(x, z) {
    return Math.hypot(x - player.pos.x, z - player.pos.z);
  }

  function insideBuilding(x, z, radius = 0.8) {
    for (let i = 0; i < boxes.length; i += 1) {
      const b = boxes[i];
      if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) return true;
    }
    return false;
  }

  /** Pick a dry, building-free point in a ring around the player (never right on top of them). */
  function ringSpot(minRadius, maxRadius) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const angle = random.range(-Math.PI, Math.PI);
      const radius = random.range(minRadius, maxRadius);
      const x = player.pos.x + Math.cos(angle) * radius;
      const z = player.pos.z + Math.sin(angle) * radius;
      if (onLand(x, z) && !insideBuilding(x, z, 2)) return { x, z };
    }
    return { x: player.pos.x + minRadius, z: player.pos.z };
  }

  /** Patrol cars arrive along a real road, a little way off screen. */
  function roadSpot() {
    const roads = city.roads.filter((r) => r.axis === 'x' || r.axis === 'z');
    for (let attempt = 0; attempt < 40 && roads.length; attempt += 1) {
      const road = random.pick(roads);
      const lane = random.chance(0.5) ? ROADS.laneWidth / 2 : -ROADS.laneWidth / 2;
      const along = clamp(
        (road.axis === 'z' ? player.pos.z : player.pos.x) + random.range(-170, 170),
        road.from + 20, road.to - 20,
      );
      const x = road.axis === 'z' ? road.at + lane : along;
      const z = road.axis === 'z' ? along : road.at + lane;
      if (onLand(x, z) && city.isRoad(x, z)) {
        return { x, z, heading: road.axis === 'z' ? (lane > 0 ? Math.PI : 0) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2) };
      }
    }
    const spot = ringSpot(90, 150);
    return { ...spot, heading: random.range(-Math.PI, Math.PI) };
  }

  // ---- Wanted level -------------------------------------------------------------------------
  function setWanted(value, reason = 'change') {
    const next = clamp(Math.round(value), 0, 5);
    if (next === wanted) return;
    const previous = wanted;
    wanted = next;
    emit('wanted', { stars: wanted, previous, reason });
  }

  function reportCrime(type, amount) {
    const gain = Number.isFinite(amount) ? amount : (CRIME_WEIGHTS[type] ?? 1);
    if (!(gain > 0)) return;
    setWanted(wanted + gain, type);
    lastCrime = time;
    decayTimer = 0;
    emit('crime', { type, amount: gain, stars: wanted });
  }

  function clearWanted() {
    lastCrime = -100;
    decayTimer = 0;
    setWanted(0, 'cleared');
  }

  /** Respawn hook used by main.js: stop the pursuit and forget the current arrest state. */
  function onRespawn() {
    down = false;
    clearWanted();
    for (const officer of officers) officer.tactic = 'mengejar';
    if (heli) setHeliActive(false);
  }

  function nearestPursuer() {
    let nearest = Infinity;
    for (const officer of officers) {
      if (!officer.dead) nearest = Math.min(nearest, distanceTo(officer.pos.x, officer.pos.z));
    }
    for (const car of cars) nearest = Math.min(nearest, distanceTo(car.pos.x, car.pos.z));
    if (heli && heli.active) nearest = Math.min(nearest, distanceTo(heli.group.position.x, heli.group.position.z) - 40);
    return nearest;
  }

  function updateWanted(dt) {
    if (wanted <= 0) return;
    if (time - lastCrime > DECAY_AFTER && nearestPursuer() > SIGHT_RANGE) {
      decayTimer += dt;
      if (decayTimer >= DECAY_EVERY) {
        decayTimer = 0;
        setWanted(wanted - 1, 'lost');
      }
    } else {
      decayTimer = 0;
    }
  }

  // ---- Units ---------------------------------------------------------------------------------
  function spawnOfficer() {
    const spot = ringSpot(58, 105);
    const built = makeOfficerMesh(THREE);
    built.group.position.set(spot.x, 0, spot.z);
    scene.add(built.group);
    officers.push({
      kind: 'officer',
      id: nextId++,
      name: FOOT_CALLSIGNS[(nextId + officers.length) % FOOT_CALLSIGNS.length],
      group: built.group,
      pos: built.group.position,
      center: new THREE.Vector3(spot.x, 1.2, spot.z),
      legL: built.legL,
      legR: built.legR,
      heading: random.range(-Math.PI, Math.PI),
      speed: random.range(5.4, 7.2),
      health: 100,
      dead: false,
      respawnAt: 0,
      phase: random.range(0, Math.PI * 2),
      fireCooldown: random.range(0.6, 1.6),
      tactic: 'mengejar',
    });
    emit('unit-spawn', { name: officers[officers.length - 1].name, type: 'foot' });
  }

  function spawnCar() {
    const spot = roadSpot();
    const built = makePoliceCarMesh(THREE);
    built.group.position.set(spot.x, 0, spot.z);
    built.group.rotation.y = spot.heading;
    scene.add(built.group);
    cars.push({
      kind: 'police-car',
      id: nextId++,
      name: CAR_CALLSIGNS[(nextId + cars.length) % CAR_CALLSIGNS.length],
      group: built.group,
      pos: built.group.position,
      center: new THREE.Vector3(spot.x, 1.2, spot.z),
      wheels: built.wheels,
      red: built.red,
      blue: built.blue,
      heading: spot.heading,
      speed: 6,
      maxSpeed: random.range(31, 39),
      accel: 18,
      turnRate: 1.95,
      radius: 2.7,
      health: 140,
      disabled: false,
      ramCooldown: 0,
      interceptSide: random.chance(0.5) ? 1 : -1,
      tactic: 'mengejar',
    });
    emit('unit-spawn', { name: cars[cars.length - 1].name, type: 'car' });
  }

  function setHeliActive(active) {
    if (!heli) return;
    if (heli.active === active) return;
    heli.active = active;
    heli.group.visible = active;
    heli.light.visible = active;
    heli.target.visible = active;
    heli.cone.visible = active;
    if (active) {
      heli.angle = random.range(-Math.PI, Math.PI);
      const spot = heli.group.position;
      spot.set(
        player.pos.x + Math.cos(heli.angle) * heliRadius,
        heliAltitude,
        player.pos.z + Math.sin(heli.angle) * heliRadius,
      );
      emit('heli', { active: true, unit: heli.name });
    } else {
      emit('heli', { active: false, unit: heli.name });
    }
    hookTimer = 0;
  }

  function spawnHeli() {
    if (heli) {
      setHeliActive(true);
      return;
    }
    const built = makeHelicopterMesh(THREE);
    scene.add(built.group, built.light, built.target, built.cone);
    heli = {
      kind: 'heli',
      id: nextId++,
      name: HELI_CALLSIGNS[0],
      group: built.group,
      center: new THREE.Vector3(),
      mainRotor: built.mainRotor,
      tailRotor: built.tailRotor,
      cone: built.cone,
      light: built.light,
      target: built.target,
      active: false,
      angle: 0,
      phase: 0,
      sweep: 0,
      tactic: 'menguntit',
    };
    setHeliActive(true);
    emit('unit-spawn', { name: heli.name, type: 'heli' });
  }

  function retireUnits() {
    for (const officer of officers) scene.remove(officer.group);
    officers.length = 0;
    for (const car of cars) scene.remove(car.group);
    cars.length = 0;
    setHeliActive(false);
  }

  function syncUnits() {
    if (wanted <= 0) {
      if (officers.length || cars.length) retireUnits();
      return;
    }
    const wantFoot = Math.min(2 + wanted, 8);
    const wantCars = Math.min(wanted - 1, 4);
    const aliveFoot = officers.reduce((count, o) => count + (o.dead ? 0 : 1), 0);
    for (let i = aliveFoot; i < wantFoot; i += 1) spawnOfficer();
    for (let i = cars.length; i < wantCars; i += 1) spawnCar();
    if (wanted >= 3) spawnHeli();
    else setHeliActive(false);

    // If the player runs far away, bring distant units back into the pursuit ring.
    for (const officer of officers) {
      if (!officer.dead && distanceTo(officer.pos.x, officer.pos.z) > 380) {
        const spot = ringSpot(75, 115);
        officer.pos.set(spot.x, 0, spot.z);
      }
    }
    for (const car of cars) {
      if (distanceTo(car.pos.x, car.pos.z) > 380) {
        const spot = roadSpot();
        car.pos.set(spot.x, 0, spot.z);
        car.heading = spot.heading;
        car.speed = 8;
      }
    }
  }

  // ---- Officer behaviour ---------------------------------------------------------------------
  function hurtPlayer(damage, cause, unit) {
    if (down || damage <= 0) return;
    if (player.inVehicle && player.vehicle) {
      if (typeof traffic.damageCar === 'function') traffic.damageCar(player.vehicle, damage * 0.6);
      else player.vehicle.health = Math.max(0, player.vehicle.health - damage * 0.6);
      emit('vehicle-hit', { damage, unit, cause });
      if (player.vehicle.health <= 0) {
        down = true;
        emit('wasted', { cause, unit, stars: wanted });
      }
      return;
    }
    player.health = Math.max(0, player.health - damage);
    emit('player-hit', { damage, unit, cause });
    if (player.health <= 0) {
      down = true;
      emit('wasted', { cause, unit, stars: wanted });
    }
  }

  function officerShoot(officer, distance) {
    emit('police-shot', {
      from: { x: officer.pos.x, y: 1.6, z: officer.pos.z },
      to: { x: player.pos.x, y: player.pos.y + 1.5, z: player.pos.z },
      unit: officer.name,
    });
    if (typeof traffic.onGunshot === 'function') traffic.onGunshot(player.pos.x, player.pos.z, 32);
    const chance = clamp(0.78 - distance / 140, 0.16, 0.7);
    if (random.chance(chance)) hurtPlayer(5 + wanted * 2, 'gunshot', officer.name);
  }

  function moveOfficer(officer, dx, dz, distance, step) {
    const nx = officer.pos.x + (dx / distance) * step;
    const nz = officer.pos.z + (dz / distance) * step;
    if (onLand(nx, nz) && !insideBuilding(nx, nz)) {
      officer.pos.x = nx;
      officer.pos.z = nz;
      return;
    }
    // Sidestep obstacles instead of getting stuck against a wall.
    const sx = officer.pos.x - (dz / distance) * step;
    const sz = officer.pos.z + (dx / distance) * step;
    if (onLand(sx, sz) && !insideBuilding(sx, sz)) {
      officer.pos.x = sx;
      officer.pos.z = sz;
    }
  }

  function updateOfficers(dt) {
    for (const officer of officers) {
      if (officer.dead) {
        if (time >= officer.respawnAt && wanted > 0) {
          const spot = ringSpot(70, 110);
          officer.pos.set(spot.x, 0, spot.z);
          officer.health = 100;
          officer.dead = false;
          officer.group.visible = true;
          officer.tactic = 'mengejar';
        }
        continue;
      }
      const dx = player.pos.x - officer.pos.x;
      const dz = player.pos.z - officer.pos.z;
      const distance = Math.max(0.001, Math.hypot(dx, dz));
      const desired = Math.atan2(dx, dz);
      officer.heading += wrapAngle(desired - officer.heading) * Math.min(1, dt * 5);
      const step = Math.min(distance, officer.speed * dt);
      if (!player.inVehicle && distance < 26) moveOfficer(officer, dx, dz, distance, step);
      else moveOfficer(officer, dx, dz, distance, step * 0.85);
      officer.group.rotation.y = officer.heading;
      officer.phase += dt * 13;
      officer.legL.rotation.x = Math.sin(officer.phase) * 0.55;
      officer.legR.rotation.x = -Math.sin(officer.phase) * 0.55;
      officer.group.position.y = Math.abs(Math.sin(officer.phase)) * 0.06;
      officer.center.set(officer.pos.x, officer.pos.y + 1.2, officer.pos.z);

      officer.fireCooldown -= dt;
      const shooting = wanted >= 3 && distance < 76;
      if (shooting && officer.fireCooldown <= 0) {
        officerShoot(officer, distance);
        officer.fireCooldown = Math.max(0.45, random.range(0.85, 1.5) - wanted * 0.09);
      }
      officer.tactic = shooting && officer.fireCooldown > 0.5 ? 'menembak'
        : distance < 9 ? 'mengepung' : 'mengejar';

      if (!down && !player.inVehicle && player.pos.y < 1.2 && distance < ARREST_RANGE) {
        down = true;
        emit('busted', { unit: officer.name, stars: wanted, x: officer.pos.x, z: officer.pos.z });
      }
    }
  }

  // ---- Patrol-car behaviour ------------------------------------------------------------------
  function resolveCarWorld(car) {
    const r = car.radius;
    for (let i = 0; i < boxes.length; i += 1) {
      const b = boxes[i];
      const cx = Math.max(b.minX, Math.min(b.maxX, car.pos.x));
      const cz = Math.max(b.minZ, Math.min(b.maxZ, car.pos.z));
      let dx = car.pos.x - cx;
      let dz = car.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 0.0001) { dx = 1; dz = 0; }
      const d = Math.sqrt(d2);
      car.pos.x += (dx / d) * (r - d);
      car.pos.z += (dz / d) * (r - d);
      car.speed *= 0.55;
    }
  }

  function updateCars(dt) {
    for (const car of cars) {
      car.ramCooldown -= dt;
      const redOn = Math.floor(time * 7) % 2 === 0;
      car.red.material.color.setHex(redOn ? 0xff3652 : 0x4a1420);
      car.blue.material.color.setHex(redOn ? 0x2b4b9e : 0x5b9bff);

      if (car.disabled) {
        car.speed *= Math.pow(0.02, dt);
        car.center.set(car.pos.x, 1.2, car.pos.z);
        continue;
      }

      const dx = player.pos.x - car.pos.x;
      const dz = player.pos.z - car.pos.z;
      const distance = Math.max(0.001, Math.hypot(dx, dz));
      const vehicle = player.inVehicle ? player.vehicle : null;
      const lead = vehicle ? Math.min(1.4, distance / 45) : 0;
      let aimX = player.pos.x + (vehicle ? Math.sin(vehicle.heading) * vehicle.speed * lead : 0);
      let aimZ = player.pos.z + (vehicle ? Math.cos(vehicle.heading) * vehicle.speed * lead : 0);
      if (wanted >= 4) {
        aimX += (-dz / distance) * car.interceptSide * 11;
        aimZ += (dx / distance) * car.interceptSide * 11;
        car.tactic = 'memotong jalan';
      } else {
        car.tactic = 'mengejar';
      }

      const desired = Math.atan2(aimX - car.pos.x, aimZ - car.pos.z);
      const delta = wrapAngle(desired - car.heading);
      car.heading += clamp(delta, -car.turnRate * dt, car.turnRate * dt);
      const targetSpeed = car.maxSpeed * (Math.abs(delta) > 1.3 ? 0.32 : 1) * (distance < 10 && !vehicle ? 0.55 : 1);
      car.speed += clamp(targetSpeed - car.speed, -28 * dt, car.accel * dt);

      const previousX = car.pos.x;
      const previousZ = car.pos.z;
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      resolveCarWorld(car);
      if (!onLand(car.pos.x, car.pos.z)) {
        car.pos.x = previousX;
        car.pos.z = previousZ;
        car.speed *= -0.18;
        car.heading += 1.1 * dt;
      }
      car.group.rotation.y = car.heading;
      const spin = (car.speed / 0.42) * dt;
      for (const wheel of car.wheels) wheel.rotation.y += spin;
      car.center.set(car.pos.x, 1.2, car.pos.z);

      if (vehicle && distance < 5.2 && car.speed > 7 && car.ramCooldown <= 0) {
        const damage = 12 + wanted * 3;
        if (typeof traffic.damageCar === 'function') traffic.damageCar(vehicle, damage);
        else vehicle.health = Math.max(0, vehicle.health - damage);
        car.ramCooldown = 1.3;
        car.speed *= 0.7;
        reportCrime('ram', 1);
        emit('ram', { unit: car.name, damage });
        if (vehicle.health <= 0 && !down) {
          down = true;
          emit('wasted', { cause: 'ram', unit: car.name, stars: wanted });
        }
      } else if (!player.inVehicle && distance < 2.7 && Math.abs(car.speed) > 4 && !down) {
        down = true;
        emit('wasted', { cause: 'run-over', unit: car.name, stars: wanted });
      }
    }
  }

  // ---- Helicopter -----------------------------------------------------------------------------
  function updateHeli(dt) {
    if (!heli || !heli.active) return;
    heli.phase += dt;
    heli.angle += dt * 0.42;
    const radius = heliRadius + Math.sin(heli.phase * 0.3) * 6;
    const x = player.pos.x + Math.cos(heli.angle) * radius;
    const z = player.pos.z + Math.sin(heli.angle) * radius;
    const y = heliAltitude + Math.sin(heli.phase * 0.7) * 1.5;
    const dx = x - heli.group.position.x;
    const dz = z - heli.group.position.z;
    heli.group.position.set(x, y, z);
    if (Math.hypot(dx, dz) > 0.01) heli.group.rotation.y = Math.atan2(dx, dz);
    heli.group.rotation.z = -Math.sin(heli.angle) * 0.12;
    heli.mainRotor.rotation.y += dt * 27;
    heli.tailRotor.rotation.x += dt * 44;

    heli.sweep = heli.phase * 0.9;
    const tx = player.pos.x + Math.cos(heli.sweep) * 9;
    const tz = player.pos.z + Math.sin(heli.sweep) * 9;
    heli.light.position.set(x, y - 1.2, z);
    heli.target.position.set(tx, 1, tz);
    heli.target.updateMatrixWorld();
    dir.set(x - tx, y - 2.2, z - tz);
    const length = Math.max(1, dir.length());
    dir.multiplyScalar(1 / length);
    heli.cone.position.set((x + tx) / 2, (y - 1.2 + 1) / 2, (z + tz) / 2);
    heli.cone.quaternion.setFromUnitVectors(up, dir);
    heli.cone.scale.set(length * 0.17, length, length * 0.17);
    heli.center.set(x, y, z);
    heli.tactic = 'menguntit';

    hookTimer -= dt;
    if (hookTimer <= 0) {
      hookTimer = 0.25;
      if (rotorHook) rotorHook(getHelicopterState());
    }
  }

  // ---- External interface --------------------------------------------------------------------
  /** Combat uses these as raycast/sphere targets. The array and entries are reused each call. */
  function getHitTargets() {
    targetsOut.length = 0;
    let index = 0;
    const add = (kind, ref, center, radius) => {
      let target = targetPool[index];
      if (!target) {
        target = { kind: '', ref: null, center: new THREE.Vector3(), radius: 0 };
        targetPool.push(target);
      }
      target.kind = kind;
      target.ref = ref;
      target.center = center;
      target.radius = radius;
      targetsOut.push(target);
      index += 1;
    };
    for (const officer of officers) {
      if (!officer.dead) add('cop', officer, officer.center, 0.9);
    }
    for (const car of cars) {
      if (!car.disabled) add('police-car', car, car.center, 2.6);
    }
    return targetsOut;
  }

  /** Called by combat when the player shoots an officer or a patrol car. */
  function hitUnit(unit, damage, source = 'player') {
    if (!unit || unit.dead || unit.disabled || !(damage > 0)) return false;
    if (unit.kind === 'officer') reportCrime('shoot-cop', 2);
    else if (unit.kind === 'police-car') reportCrime('shoot-police-car', 1);
    unit.health = Math.max(0, unit.health - damage);
    emit('unit-hit', { unit: unit.name, damage, source, health: unit.health });
    if (unit.health > 0) return true;
    if (unit.kind === 'officer') {
      unit.dead = true;
      unit.group.visible = false;
      unit.respawnAt = time + 9;
      emit('cop-down', { unit: unit.name, source });
    } else {
      unit.disabled = true;
      unit.speed = 0;
      emit('police-car-down', { unit: unit.name, source });
    }
    return true;
  }

  /** HUD snapshot. The returned array and its entries are reused on every call. */
  function getUnits() {
    unitsOut.length = 0;
    let index = 0;
    const add = (unit, kind) => {
      let view = unitPool[index];
      if (!view) {
        view = {};
        unitPool.push(view);
      }
      view.id = unit.id;
      view.callsign = unit.name;
      view.name = unit.name;
      view.kind = kind;
      view.type = kind;
      view.distance = Math.round(distanceTo(unit.pos.x, unit.pos.z));
      view.tactic = unit.tactic;
      view.health = Math.round(unit.health);
      view.stars = wanted;
      unitsOut.push(view);
      index += 1;
    };
    for (const officer of officers) {
      if (!officer.dead) add(officer, 'foot');
    }
    for (const car of cars) {
      if (!car.disabled) add(car, 'car');
    }
    if (heli && heli.active) {
      let view = unitPool[index];
      if (!view) {
        view = {};
        unitPool.push(view);
      }
      view.id = heli.id;
      view.callsign = heli.name;
      view.name = heli.name;
      view.kind = 'heli';
      view.type = 'heli';
      view.distance = Math.round(distanceTo(heli.group.position.x, heli.group.position.z));
      view.tactic = heli.tactic;
      view.health = 100;
      view.stars = wanted;
      unitsOut.push(view);
    }
    return unitsOut;
  }

  function getHelicopterState() {
    const active = !!(heli && heli.active);
    const rpm = active ? Math.round((27 * 60) / (Math.PI * 2)) : 0;
    return {
      active,
      callsign: heli ? heli.name : null,
      position: heli ? { x: heli.group.position.x, y: heli.group.position.y, z: heli.group.position.z } : null,
      rotorRpm: rpm,
      rotorPhase: heli ? heli.mainRotor.rotation.y : 0,
      tailRotorPhase: heli ? heli.tailRotor.rotation.x : 0,
      searchlight: {
        on: active,
        sweep: heli ? heli.sweep : 0,
        target: heli ? { x: heli.target.position.x, y: heli.target.position.y, z: heli.target.position.z } : null,
        intensity: active ? heli.light.intensity : 0,
      },
      // Audio hook: no samples ship yet, but a sound system can subscribe now.
      audio: {
        id: 'police-heli-rotor',
        playing: active,
        volume: active ? 0.65 : 0,
        rpm,
        hook: rotorHook ? 'connected' : 'none',
      },
    };
  }

  function setRotorAudioHook(fn) {
    rotorHook = typeof fn === 'function' ? fn : null;
    if (rotorHook) rotorHook(getHelicopterState());
  }

  /** Staging hook for the chase screenshot: a lower, tighter searchlight pass. */
  function setHeliFormation(next = {}) {
    if (Number.isFinite(next.altitude)) heliAltitude = clamp(next.altitude, 10, 80);
    if (Number.isFinite(next.radius)) heliRadius = clamp(next.radius, 20, 90);
    if (heli && heli.active) {
      heli.group.position.y = heliAltitude;
      heli.light.position.y = heliAltitude - 1.2;
    }
  }

  function update(dt) {
    time += Math.max(0, dt);
    syncUnits();
    updateWanted(dt);
    updateOfficers(dt);
    updateCars(dt);
    updateHeli(dt);
  }

  return {
    update,
    getUnits,
    getWanted: () => wanted,
    getStars: () => wanted,
    setWanted,
    raiseWanted: reportCrime,
    reportCrime,
    clearWanted,
    onRespawn,
    getHitTargets,
    hitUnit,
    getHelicopterState,
    setRotorAudioHook,
    setHeliFormation,
    get officers() { return officers; },
    get cars() { return cars; },
    get helicopter() { return heli; },
    dispose: retireUnits,
  };
}
