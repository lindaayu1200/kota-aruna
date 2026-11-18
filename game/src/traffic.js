// KOTA ARUNA — ambient traffic: AI cars following the road graph, sidewalk pedestrians who flee
// from trouble, and the wanted-level events that come from knocking someone down.
import { CITY, ROADS } from './config.js';
import { createRandom } from './random.js';

const LANE = 3.2;
const AI_COUNT = 12;
const PED_COUNT = 30;
const DESPAWN_DISTANCE = 430;

function edgeNodes(city) {
  const verticals = city.roads.filter((r) => r.axis === 'z');
  const horizontals = city.roads.filter((r) => r.axis === 'x');
  const nodes = [];
  for (const v of verticals) {
    for (const h of horizontals) {
      if (v.at < CITY.beach.inland || h.at < CITY.beach.inland) continue;
      if (!city.isRoad(v.at, h.at)) continue;
      nodes.push({ x: v.at, z: h.at, links: [] });
    }
  }

  function passable(a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const steps = Math.max(2, Math.ceil(length / 8));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      if (!city.isRoad(a.x + dx * t, a.z + dz * t)) return false;
    }
    return true;
  }

  function link(a, b) {
    if (!passable(a, b)) return;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    a.links.push({ to: b, dx: dx / length, dz: dz / length });
    b.links.push({ to: a, dx: -dx / length, dz: -dz / length });
  }

  for (const coordinate of ['x', 'z']) {
    const groups = new Map();
    for (const node of nodes) {
      const key = node[coordinate];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(node);
    }
    for (const list of groups.values()) {
      const field = coordinate === 'x' ? 'z' : 'x';
      list.sort((a, b) => a[field] - b[field]);
      for (let i = 0; i < list.length - 1; i += 1) link(list[i], list[i + 1]);
    }
  }
  return nodes.filter((n) => n.links.length > 0);
}

const TRAFFIC_COLORS = ['#d95f6a', '#67b3c9', '#e8b95a', '#8f7fc4', '#79b98b', '#d98c5f'];

function makeTrafficCar(THREE, color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#203044', roughness: 0.25 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#181820', roughness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 4.3), bodyMat);
  body.position.y = 0.78;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.75, 2.2), bodyMat);
  cabin.position.set(0, 1.55, -0.15);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.45, 0.08), glassMat);
  glass.position.set(0, 1.57, 0.99);
  group.add(body, cabin, glass);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.93, 0.42, end * 1.4);
      group.add(wheel);
    }
  }
  return group;
}

function makePed(THREE, color) {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: '#d8a585', roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: '#323040', roughness: 0.95 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.32), cloth);
  torso.position.y = 1.45;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.36), skin);
  head.position.y = 2.08;
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.75, 0.22), pants);
  left.position.set(-0.14, 0.55, 0);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.75, 0.22), pants);
  right.position.set(0.14, 0.55, 0);
  group.add(torso, head, left, right);
  return { group, torso, left, right };
}

export function createTraffic(THREE, scene, city, vehicles, random = createRandom(0x71AFF1C)) {
  const nodes = edgeNodes(city);
  const aiCars = [];
  const peds = [];
  let wantedGain = 0;
  let spawnTimer = 0;

  function nodeNear(x, z, min, max) {
    let best = null;
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const node = random.pick(nodes);
      if (!node) return null;
      const d = Math.hypot(node.x - x, node.z - z);
      if (d >= min && d <= max) return node;
      if (d > bestScore) { bestScore = d; best = node; }
    }
    return best;
  }

  function spawnAiCar(playerPos) {
    if (!nodes.length) return;
    const node = nodeNear(playerPos.x, playerPos.z, 90, 260);
    if (!node) return;
    const link = random.pick(node.links);
    if (!link) return;
    const group = makeTrafficCar(THREE, random.pick(TRAFFIC_COLORS));
    scene.add(group);
    const car = {
      group,
      pos: group.position,
      heading: Math.atan2(link.dx, link.dz),
      speed: random.range(7, 12),
      cruise: random.range(9, 17),
      from: node,
      to: link.to,
      travel: 0,
      length: Math.hypot(link.to.x - node.x, link.to.z - node.z),
      dx: link.dx,
      dz: link.dz,
      radius: 2.4,
      lane: random.chance(0.5) ? LANE : -LANE,
    };
    aiCars.push(car);
  }

  function refreshLink(car, link) {
    car.from = link.from;
    car.to = link.to;
    car.dx = link.dx;
    car.dz = link.dz;
    car.length = Math.max(1, Math.hypot(link.to.x - link.from.x, link.to.z - link.from.z));
    car.travel = Math.min(car.travel, car.length);
    car.heading = Math.atan2(link.dx, link.dz);
  }

  function chooseNext(car) {
    const links = car.to.links;
    if (!links.length) return;
    let options = links.filter((l) => l.to !== car.from);
    if (!options.length) options = links;
    // Prefer going straight most of the time; otherwise take a random turn.
    let straight = options.find((l) => l.dx * car.dx + l.dz * car.dz > 0.85);
    if (straight && !random.chance(0.38)) options = [straight];
    const link = random.pick(options);
    refreshLink(car, { from: car.to, to: link.to, dx: link.dx, dz: link.dz });
  }

  function blocked(car, playerPos) {
    const aheadX = car.dx;
    const aheadZ = car.dz;
    const otherCars = vehicles && vehicles.cars ? vehicles.cars : [];
    for (let i = 0; i < otherCars.length; i += 1) {
      const other = otherCars[i];
      if (!other.occupied || other === car) continue;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      if (dx * aheadX + dz * aheadZ > 0 && dx * dx + dz * dz < 196) return true;
    }
    for (let i = 0; i < aiCars.length; i += 1) {
      const other = aiCars[i];
      if (other === car) continue;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      const dot = dx * aheadX + dz * aheadZ;
      if (dot > 0 && dot < 14 && Math.abs(dx * aheadZ - dz * aheadX) < 3) return true;
    }
    if (playerPos && Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z) < 4) return true;
    for (let i = 0; i < peds.length; i += 1) {
      const ped = peds[i];
      if (ped.state === 'down') continue;
      const dx = ped.pos.x - car.pos.x;
      const dz = ped.pos.z - car.pos.z;
      const dot = dx * aheadX + dz * aheadZ;
      if (dot > 0 && dot < 6 && Math.abs(dx * aheadZ - dz * aheadX) < 2) return true;
    }
    return false;
  }

  function updateAi(dt, playerPos) {
    for (let i = aiCars.length - 1; i >= 0; i -= 1) {
      const car = aiCars[i];
      if (playerPos && Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z) > DESPAWN_DISTANCE) {
        scene.remove(car.group);
        aiCars.splice(i, 1);
        continue;
      }
      const target = blocked(car, playerPos) ? 0 : car.cruise;
      const delta = target - car.speed;
      car.speed += Math.max(-24 * dt, Math.min(12 * dt, delta));

      car.travel += Math.max(0, car.speed) * dt;
      let guard = 0;
      while (car.travel >= car.length && guard < 4) {
        car.travel -= car.length;
        chooseNext(car);
        guard += 1;
      }

      const t = Math.min(1, car.travel / car.length);
      const sideX = -car.dz * car.lane;
      const sideZ = car.dx * car.lane;
      car.pos.set(
        car.from.x + (car.to.x - car.from.x) * t + sideX,
        0,
        car.from.z + (car.to.z - car.from.z) * t + sideZ,
      );
      car.group.rotation.y = car.heading;
    }
  }

  // ---- Pedestrians -----------------------------------------------------------------------------
  const PED_COLORS = ['#f2a6a0', '#8fd0c9', '#f0c987', '#b9a7e0', '#e6d6c0', '#9fc6e8'];

  function sidewalkSpot(near) {
    const roads = city.roads.filter((r) => r.axis === 'x' || r.axis === 'z');
    const boxes = city.getCollisionBoxes ? city.getCollisionBoxes() : [];
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const road = random.pick(roads);
      let x;
      let z;
      if (road.axis === 'z') {
        x = road.at + (random.chance(0.5) ? 1 : -1) * (ROADS.width / 2 + random.range(3, 9));
        z = near ? near.z + random.range(-35, 35) : random.range(road.from + 20, road.to - 20);
      } else {
        x = near ? near.x + random.range(-35, 35) : random.range(road.from + 20, road.to - 20);
        z = road.at + (random.chance(0.5) ? 1 : -1) * (ROADS.width / 2 + random.range(3, 9));
      }
      if (x < CITY.beach.west + 6 || x > CITY.halfWidth - 6 || Math.abs(z) > CITY.halfDepth - 6) continue;
      if (city.isRoad(x, z)) continue;
      const c = CITY.channel;
      if (x <= c.east && z >= c.centerZ - c.width / 2 && z <= c.centerZ + c.width / 2) continue;
      let blockedByBuilding = false;
      for (let b = 0; b < boxes.length; b += 1) {
        if (x > boxes[b].minX - 1 && x < boxes[b].maxX + 1 && z > boxes[b].minZ - 1 && z < boxes[b].maxZ + 1) {
          blockedByBuilding = true;
          break;
        }
      }
      if (!blockedByBuilding) return { x, z };
    }
    return null;
  }

  function newTarget(ped, near) {
    const spot = sidewalkSpot(near || ped.pos);
    if (spot) ped.target.set(spot.x, 0, spot.z);
    else ped.target.set(ped.pos.x + random.range(-8, 8), 0, ped.pos.z + random.range(-8, 8));
  }

  for (let i = 0; i < PED_COUNT; i += 1) {
    const spot = sidewalkSpot(null);
    if (!spot) continue;
    const built = makePed(THREE, random.pick(PED_COLORS));
    built.group.position.set(spot.x, 0, spot.z);
    scene.add(built.group);
    const ped = {
      group: built.group,
      pos: built.group.position,
      target: new THREE.Vector3(spot.x, 0, spot.z),
      heading: random.range(-Math.PI, Math.PI),
      state: 'wander',
      timer: 0,
      downTime: 0,
      phase: random.range(0, Math.PI * 2),
      fleeFrom: new THREE.Vector3(),
    };
    newTarget(ped);
    peds.push(ped);
  }

  function flee(ped, fromX, fromZ, duration) {
    if (ped.state === 'down') return;
    ped.state = 'flee';
    ped.timer = duration;
    ped.fleeFrom.set(fromX, 0, fromZ);
  }

  function knockDown(ped, byPlayer) {
    if (ped.state === 'down') return;
    ped.state = 'down';
    ped.downTime = 9;
    ped.group.rotation.set(-Math.PI / 2, 0, 0);
    if (byPlayer) wantedGain += 2;
  }

  function updatePeds(dt, playerPos) {
    for (let i = 0; i < peds.length; i += 1) {
      const ped = peds[i];
      if (ped.state === 'down') {
        ped.downTime -= dt;
        if (ped.downTime <= 0) {
          ped.state = 'wander';
          ped.group.rotation.set(0, ped.heading, 0);
          newTarget(ped);
        }
        continue;
      }

      if (playerPos) {
        const dx = ped.pos.x - playerPos.x;
        const dz = ped.pos.z - playerPos.z;
        if (dx * dx + dz * dz < 12.25) flee(ped, playerPos.x, playerPos.z, 2.6);
      }

      if (ped.state === 'flee') {
        ped.timer -= dt;
        if (ped.timer <= 0) {
          ped.state = 'wander';
          newTarget(ped);
        } else {
          const dx = ped.pos.x - ped.fleeFrom.x;
          const dz = ped.pos.z - ped.fleeFrom.z;
          const d = Math.max(0.01, Math.hypot(dx, dz));
          ped.target.set(ped.pos.x + (dx / d) * 12, 0, ped.pos.z + (dz / d) * 12);
        }
      }

      const tx = ped.target.x - ped.pos.x;
      const tz = ped.target.z - ped.pos.z;
      const dist = Math.hypot(tx, tz);
      if (ped.state === 'wander' && dist < 1.2) newTarget(ped);
      if (dist > 0.01) {
        const speed = ped.state === 'flee' ? 6.2 : 1.5;
        const step = Math.min(dist, speed * dt);
        const nx = ped.pos.x + (tx / dist) * step;
        const nz = ped.pos.z + (tz / dist) * step;
        if (nx > CITY.beach.west + 4 && nx < CITY.halfWidth - 6 && Math.abs(nz) < CITY.halfDepth - 6) {
          ped.pos.x = nx;
          ped.pos.z = nz;
        }
        ped.heading = Math.atan2(tx, tz);
        ped.group.rotation.y = ped.heading;
        ped.phase += dt * (ped.state === 'flee' ? 16 : 8);
        ped.group.position.y = Math.abs(Math.sin(ped.phase)) * 0.08;
      }
    }
  }

  function checkCarPedHits() {
    if (!vehicles || !vehicles.cars) return;
    const cars = vehicles.cars;
    for (let p = 0; p < peds.length; p += 1) {
      const ped = peds[p];
      if (ped.state === 'down') continue;
      for (let c = 0; c < cars.length; c += 1) {
        const car = cars[c];
        if (Math.abs(car.speed) < 3) continue;
        const dx = ped.pos.x - car.pos.x;
        const dz = ped.pos.z - car.pos.z;
        const reach = car.radius + 0.8;
        if (dx * dx + dz * dz < reach * reach) {
          knockDown(ped, !!car.occupied);
          if (!car.occupied) wantedGain += 1;
          car.speed *= 0.55;
          break;
        }
      }
    }
  }

  function onGunshot(x, z, radius = 55) {
    for (let i = 0; i < peds.length; i += 1) {
      const ped = peds[i];
      const dx = ped.pos.x - x;
      const dz = ped.pos.z - z;
      if (dx * dx + dz * dz < radius * radius) flee(ped, x, z, 4.5);
    }
  }

  function update(dt, playerPos, wantedLevel) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 0.7;
      for (let i = aiCars.length - 1; i >= 0; i -= 1) {
        const car = aiCars[i];
        if (!playerPos || Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z) > DESPAWN_DISTANCE) {
          scene.remove(car.group);
          aiCars.splice(i, 1);
        }
      }
      let guard = 0;
      while (aiCars.length < AI_COUNT && guard < AI_COUNT && nodes.length) {
        spawnAiCar(playerPos || { x: 0, z: 0 });
        guard += 1;
      }
    }
    // A higher wanted level makes drivers a little more aggressive.
    const pressure = 1 + Math.min(4, wantedLevel || 0) * 0.06;
    updateAi(dt * pressure, playerPos);
    updatePeds(dt, playerPos);
    checkCarPedHits();
    const gained = wantedGain;
    wantedGain = 0;
    return gained;
  }

  return {
    peds,
    aiCars,
    update,
    onGunshot,
    knockDown,
    damageCar: (car, amount) => {
      if (vehicles && typeof vehicles.damageCar === 'function') vehicles.damageCar(car, amount);
    },
    getCars: () => (vehicles && vehicles.cars) || [],
    get wantedGain() { return wantedGain; },
  };
}
