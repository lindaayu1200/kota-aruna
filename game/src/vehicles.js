// KOTA ARUNA — stealable cars: original models, arcade driving, building collisions and damage.
import { CITY, ROADS } from './config.js';
import { createRandom } from './random.js';

const MODELS = [
  { name: 'Senja GT', body: '#e8485f', trim: '#ffd08a', length: 4.7, width: 2.0, bodyH: 0.85, cabinH: 0.72, accel: 23, maxSpeed: 43, turn: 2.3, kind: 'sport' },
  { name: 'Aruna Van', body: '#49bfd0', trim: '#e6f6f7', length: 5.5, width: 2.2, bodyH: 1.55, cabinH: 0.95, accel: 15, maxSpeed: 29, turn: 1.5, kind: 'van' },
  { name: 'Bemo Taxi', body: '#ffc857', trim: '#2d2f3a', length: 4.4, width: 1.9, bodyH: 1.05, cabinH: 0.85, accel: 18, maxSpeed: 33, turn: 1.95, kind: 'taxi' },
  { name: 'Kencana Pickup', body: '#67c98a', trim: '#d9e7d5', length: 5.3, width: 2.1, bodyH: 1.0, cabinH: 0.8, accel: 17, maxSpeed: 34, turn: 1.75, kind: 'pickup' },
  { name: 'Badai Coupe', body: '#9b7bff', trim: '#ff5fa2', length: 4.4, width: 1.95, bodyH: 0.72, cabinH: 0.6, accel: 26, maxSpeed: 47, turn: 2.45, kind: 'coupe' },
];

/** Exposed so garages and saved games can rebuild an exact model by name. */
export const VEHICLE_MODELS = MODELS;

const WHEEL_R = 0.44;

function onLand(x, z) {
  if (x < CITY.beach.west + 2 || x > CITY.halfWidth - 4) return false;
  if (Math.abs(z) > CITY.halfDepth - 4) return false;
  const c = CITY.channel;
  if (x <= c.east && z >= c.centerZ - c.width / 2 && z <= c.centerZ + c.width / 2) {
    return ROADS.bridges.some((b) => Math.abs(x - b.x) <= ROADS.width / 2 + 3);
  }
  return true;
}

function makeCarMesh(THREE, spec) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: spec.body, roughness: 0.42, metalness: 0.35 });
  const trimMat = new THREE.MeshStandardMaterial({ color: spec.trim, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#213043', roughness: 0.18, metalness: 0.5 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#16161c', roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#b9b6c4', roughness: 0.5, metalness: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.width, spec.bodyH, spec.length), bodyMat);
  body.position.y = WHEEL_R + 0.28 + spec.bodyH / 2;
  group.add(body);

  const cabinLength = spec.kind === 'van' ? spec.length * 0.62 : spec.length * 0.46;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.86, spec.cabinH, cabinLength), bodyMat);
  cabin.position.set(0, WHEEL_R + 0.28 + spec.bodyH + spec.cabinH / 2, spec.kind === 'pickup' ? -spec.length * 0.08 : -spec.length * 0.04);
  group.add(cabin);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.88, spec.cabinH * 0.62, 0.08), glassMat);
  glass.position.set(0, cabin.position.y + 0.02, cabin.position.z + cabinLength / 2 + 0.02);
  group.add(glass);

  // Headlights and tail lamps: simple emissive boxes so the front/back read clearly at dusk.
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fff1c9' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff3d57' });
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), lampMat);
    lamp.position.set(side * (spec.width / 2 - 0.4), body.position.y + 0.05, spec.length / 2 + 0.05);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.12), tailMat);
    tail.position.set(side * (spec.width / 2 - 0.4), body.position.y + 0.05, -spec.length / 2 - 0.05);
    group.add(lamp, tail);
  }

  // Model-specific flourishes, all original combinations of simple shapes.
  if (spec.kind === 'taxi') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.04, 0.22, spec.length * 0.72), trimMat);
    stripe.position.set(0, body.position.y - spec.bodyH * 0.22, 0);
    group.add(stripe);
  } else if (spec.kind === 'sport' || spec.kind === 'coupe') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.9, 0.12, 0.4), trimMat);
    spoiler.position.set(0, body.position.y + spec.bodyH / 2 + 0.38, -spec.length / 2 + 0.35);
    group.add(spoiler);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, spec.length * 0.8), trimMat);
    stripe.position.set(0, body.position.y + spec.bodyH / 2 + 0.02, 0);
    group.add(stripe);
  } else if (spec.kind === 'van') {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.7, 0.12, cabinLength * 0.85), trimMat);
    rack.position.set(0, cabin.position.y + spec.cabinH / 2 + 0.1, cabin.position.z);
    group.add(rack);
  } else if (spec.kind === 'pickup') {
    const bedWall = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 0.5, 0.14), bodyMat);
    bedWall.position.set(0, body.position.y + spec.bodyH / 2 + 0.2, -spec.length / 2 + 0.1);
    group.add(bedWall);
  }

  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.3, 12);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * (spec.width / 2 - 0.02), WHEEL_R, end * (spec.length * 0.32));
      pivot.rotation.z = Math.PI / 2;
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R * 0.55, WHEEL_R * 0.55, 0.32, 8), rimMat);
      pivot.add(tire, rim);
      group.add(pivot);
      wheels.push(pivot.children[0]);
    }
  }

  return { group, wheels };
}

export function createVehicles(THREE, scene, city, random = createRandom(0xA71A)) {
  const cars = [];

  function placeCar(spec, x, z, heading, owned = false) {
    const built = makeCarMesh(THREE, spec);
    built.group.position.set(x, 0, z);
    built.group.rotation.y = heading;
    scene.add(built.group);
    const car = {
      name: spec.name,
      modelName: spec.name,
      owned: !!owned,
      group: built.group,
      pos: built.group.position,
      heading,
      speed: 0,
      health: 100,
      maxSpeed: spec.maxSpeed,
      accel: spec.accel,
      turnRate: spec.turn,
      radius: Math.max(spec.length, spec.width) * 0.42,
      wheels: built.wheels,
      occupied: false,
      damageCooldown: 0,
      disabled: false,
      get speedKmh() { return Math.round(Math.abs(this.speed) * 3.6); },
    };
    cars.push(car);
    return car;
  }

  /** Rebuild a car from a save file / garage slip. Unknown names fall back to the first model. */
  function spawnModel(modelName, x, z, heading = 0, owned = false) {
    const spec = VEHICLE_MODELS.find((item) => item.name === modelName) || VEHICLE_MODELS[0];
    return placeCar(spec, x, z, heading, owned);
  }

  function describeCar(car) {
    if (!car) return null;
    return {
      model: car.modelName,
      x: finite(car.pos.x),
      z: finite(car.pos.z),
      heading: finite(car.heading),
      health: finite(car.health, 100),
      owned: !!car.owned,
    };
  }

  function removeCar(car) {
    if (!car) return;
    const index = cars.indexOf(car);
    if (index >= 0) cars.splice(index, 1);
    if (car.group && car.group.parent) car.group.parent.remove(car.group);
    car.occupied = false;
  }

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  // Park one at each spawn point, and the rest along real roads.
  city.spawnPoints.forEach((point, index) => {
    const spec = MODELS[index % MODELS.length];
    const x = point.x + (index % 2 ? 4 : -4);
    const z = point.z + (index < 2 ? 5 : -5);
    placeCar(spec, onLand(x, z) ? x : point.x, onLand(x, z) ? z : point.z, random.range(-Math.PI, Math.PI));
  });

  const roadChoices = city.roads.filter((r) => r.axis === 'x' || r.axis === 'z');
  let placed = city.spawnPoints.length;
  let attempts = 0;
  while (placed < 24 && attempts < 900 && roadChoices.length) {
    attempts += 1;
    const road = random.pick(roadChoices);
    const along = random.range(road.from + 20, road.to - 20);
    const lane = random.chance(0.5) ? ROADS.laneWidth / 2 : -ROADS.laneWidth / 2;
    const x = road.axis === 'z' ? road.at + lane : along;
    const z = road.axis === 'z' ? along : road.at + lane;
    if (!onLand(x, z) || !city.isRoad(x - lane, z - lane)) continue;
    // Lane is a sideways offset; the car still points along the road it is parked on.
    const heading = road.axis === 'z' ? (lane > 0 ? Math.PI : 0) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2);
    placeCar(random.pick(MODELS), x, z, heading);
    placed += 1;
  }

  function nearest(pos, radius) {
    let best = null;
    let bestDist = radius * radius;
    for (let i = 0; i < cars.length; i += 1) {
      const car = cars[i];
      const dx = car.pos.x - pos.x;
      const dz = car.pos.z - pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDist) {
        bestDist = d2;
        best = car;
      }
    }
    return best;
  }

  function damageCar(car, amount) {
    if (car.damageCooldown > 0) return;
    car.damageCooldown = 0.4;
    car.health = Math.max(0, car.health - amount);
    if (car.health <= 0) car.disabled = true;
  }

  function collideWorld(car) {
    const boxes = city.getCollisionBoxes ? city.getCollisionBoxes() : [];
    let hit = false;
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
      hit = true;
    }
    if (hit && Math.abs(car.speed) > 3) {
      damageCar(car, Math.min(32, (Math.abs(car.speed) - 3) * 1.6));
      car.speed *= -0.18;
    } else if (hit) {
      car.speed *= 0.6;
    }
  }

  function drive(car, input, dt) {
    if (car.damageCooldown > 0) car.damageCooldown -= dt;
    if (car.disabled) {
      car.speed *= Math.pow(0.02, dt);
    } else {
      const throttle = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      if (throttle > 0) car.speed += car.accel * dt;
      else if (throttle < 0) car.speed -= car.accel * 1.25 * dt;
      else car.speed *= Math.pow(0.16, dt);

      if (input.handbrake) car.speed *= Math.pow(0.015, dt);
      car.speed = Math.max(-car.maxSpeed * 0.35, Math.min(car.maxSpeed, car.speed));

      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (steer !== 0) {
        const grip = Math.min(1, Math.abs(car.speed) / 6);
        const direction = car.speed < 0 ? -1 : 1;
        car.heading += steer * car.turnRate * grip * direction * (input.handbrake ? 1.45 : 1) * dt;
      }
    }

    const previousX = car.pos.x;
    const previousZ = car.pos.z;
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    collideWorld(car);
    if (!onLand(car.pos.x, car.pos.z)) {
      car.pos.x = previousX;
      car.pos.z = previousZ;
      car.speed *= -0.2;
    }
  }

  function update(dt, player) {
    const input = player && player.input;

    if (input && input.consumeEnter && input.consumeEnter()) {
      if (player.inVehicle && player.vehicle) {
        const car = player.vehicle;
        const side = car.heading + Math.PI / 2;
        const exitX = car.pos.x + Math.sin(side) * 3.2;
        const exitZ = car.pos.z + Math.cos(side) * 3.2;
        const safe = onLand(exitX, exitZ);
        player.pos.x = safe ? exitX : car.pos.x;
        player.pos.z = safe ? exitZ : car.pos.z + 3.2;
        player.pos.y = 0;
        car.occupied = false;
        car.speed *= 0.3;
        player.inVehicle = false;
      } else if (!player.inVehicle) {
        const car = nearest(player.pos, 6.5);
        if (car) {
          car.occupied = true;
          player.vehicle = car;
          player.pos.copy(car.pos);
        }
      }
    }

    for (let i = 0; i < cars.length; i += 1) {
      const car = cars[i];
      if (car.occupied && input) drive(car, input, dt);
      else if (car.damageCooldown > 0) car.damageCooldown -= dt;
      car.group.rotation.y = car.heading;
      const spin = (car.speed / WHEEL_R) * dt;
      for (let w = 0; w < car.wheels.length; w += 1) car.wheels[w].rotation.y += spin;
    }

    if (player && player.inVehicle && player.vehicle) {
      player.pos.x = player.vehicle.pos.x;
      player.pos.z = player.vehicle.pos.z;
    }
  }

  return {
    cars, update, nearest, damageCar,
    MODELS: VEHICLE_MODELS,
    spawnModel,
    describeCar,
    removeCar,
    claimCar(car) { if (car) car.owned = true; },
    releaseCar(car) { if (car) car.owned = false; },
    getOwned: () => cars.filter((car) => car.owned),
    clearOwned() {
      for (let i = cars.length - 1; i >= 0; i -= 1) {
        if (cars[i].owned) removeCar(cars[i]);
      }
    },
  };
}
