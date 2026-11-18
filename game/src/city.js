// KOTA ARUNA — the city builder. Everything is generated from the seed at boot: streets, the
// tidal channel and its bridges, the skyline of TELUK ARUNA, the low beachfront of MARINA SENJA,
// palms, pier and lighthouse. Repeated shapes share one geometry and one draw call via
// InstancedMesh, and all road paint is merged into a single buffer, so the whole city stays cheap
// to render even though it looks busy.

import { CITY, DISTRICTS, PALETTE, ROADS, SPAWN_ZONES } from './config.js';
import { createRandom } from './random.js';

const HALF_PI = Math.PI / 2;

function seedFromQuery() {
  try {
    const value = Number.parseInt(new URLSearchParams(globalThis.location.search).get('seed') ?? '', 10);
    return Number.isFinite(value) ? value : 20261118;
  } catch {
    return 20261118;
  }
}

/** Gradient sky dome, painted into vertex colours instead of a shader. */
function makeSky(THREE) {
  const geometry = new THREE.SphereGeometry(1050, 24, 16);
  const top = new THREE.Color(PALETTE.skyTop);
  const bottom = new THREE.Color(PALETTE.skyBottom);
  const mixed = new THREE.Color();
  const colors = [];
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const height = position.getY(i) / 1050;
    const t = Math.min(1, Math.max(0, (height + 0.22) / 0.72));
    mixed.copy(bottom).lerp(top, t);
    colors.push(mixed.r, mixed.g, mixed.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(geometry, material);
  dome.name = 'sunset-sky';
  return dome;
}

/** A canvas-drawn window grid, reused as both the colour map and the emissive map of the towers. */
function makeWindows(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#262238';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lit = ['#ffd591', '#8ce9ff', '#ff9fc4', '#fff3c4'];
  const rng = createRandom(4711);
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const on = rng.chance(0.58);
      ctx.fillStyle = on ? rng.pick(lit) : '#151324';
      ctx.fillRect(col * 16 + 4, row * 16 + 4, 9, 10);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Add one flat road quad (a -> b) to a merged-array accumulator. */
function addQuad(out, ax, az, bx, bz, halfWidth, y) {
  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return;
  const px = (-dz / length) * halfWidth;
  const pz = (dx / length) * halfWidth;
  const base = out.positions.length / 3;
  out.positions.push(
    ax + px, y, az + pz,
    ax - px, y, az - pz,
    bx + px, y, bz + pz,
    bx - px, y, bz - pz,
  );
  for (let i = 0; i < 4; i += 1) out.normals.push(0, 1, 0);
  out.uvs.push(0, 0, 1, 0, 0, length / 10, 1, length / 10);
  out.indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}

function meshFromQuads(THREE, quads, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(quads.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(quads.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(quads.uvs, 2));
  geometry.setIndex(quads.indices);
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

export function createCity(THREE, random = createRandom(seedFromQuery())) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyTop);
  scene.fog = new THREE.Fog(PALETTE.fog, 420, 1400);
  const group = new THREE.Group();
  group.name = 'kota-aruna';
  scene.add(group);

  const channel = CITY.channel;
  const channelLow = channel.centerZ - channel.width / 2;
  const channelHigh = channel.centerZ + channel.width / 2;

  function inChannel(x, z) {
    return x >= channel.west && x <= channel.east && z >= channelLow && z <= channelHigh;
  }

  function onBridge(x, z) {
    for (const bridge of ROADS.bridges) {
      if (Math.abs(x - bridge.x) <= ROADS.width / 2 + 3 && Math.abs(z - channel.centerZ) <= channel.width / 2 + 28) return true;
    }
    return false;
  }

  function wet(x, z) {
    return x < CITY.beach.inland || (inChannel(x, z) && !onBridge(x, z));
  }

  function isRoad(x, z) {
    const half = ROADS.width / 2;
    for (const streetX of ROADS.verticalX) {
      if (Math.abs(x - streetX) > half || z < -CITY.halfDepth || z > CITY.halfDepth) continue;
      if (x < CITY.beach.inland) return false;
      return inChannel(x, z) ? onBridge(x, z) : true;
    }
    for (const streetZ of ROADS.horizontalZ) {
      if (Math.abs(z - streetZ) > half || x < CITY.beach.inland || x > CITY.halfWidth) continue;
      return inChannel(x, z) ? onBridge(x, z) : true;
    }
    const ring = ROADS.ring;
    const nx = (x - ring.center[0]) / ring.radiusX;
    const nz = (z - ring.center[1]) / ring.radiusZ;
    const band = ring.width / 2 / Math.min(ring.radiusX, ring.radiusZ);
    if (Math.abs(Math.hypot(nx, nz) - 1) <= band && x >= CITY.beach.inland) {
      return inChannel(x, z) ? onBridge(x, z) : true;
    }
    return false;
  }

  function districtOf(x, z) {
    let best = null;
    let bestDistance = Infinity;
    for (const district of DISTRICTS) {
      const dx = x - district.center[0];
      const dz = z - district.center[1];
      const distance = Math.hypot(dx, dz) / district.radius;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = district;
      }
    }
    return bestDistance <= 1.15 ? best : null;
  }

  // ---- Water, sand, solid ground -------------------------------------------------------------
  const waterColor = new THREE.Color(PALETTE.water);
  const glintColor = new THREE.Color(PALETTE.waterGlint);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: waterColor.clone(),
    roughness: 0.32,
    metalness: 0.35,
  });

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), waterMaterial);
  sea.rotation.x = -HALF_PI;
  sea.position.y = CITY.waterLevel;
  sea.name = 'aruna-sea';
  group.add(sea);

  const landWidth = CITY.halfWidth - CITY.beach.inland;
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(landWidth, CITY.depth),
    new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 1 }),
  );
  land.rotation.x = -HALF_PI;
  land.position.set((CITY.halfWidth + CITY.beach.inland) / 2, 0, 0);
  group.add(land);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.beach.inland - CITY.beach.west, CITY.depth),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  sand.rotation.x = -HALF_PI;
  sand.position.set((CITY.beach.west + CITY.beach.inland) / 2, 0.02, 0);
  group.add(sand);

  // The harbour channel is a sheet of the same water, just raised above the land plane.
  const inlet = new THREE.Mesh(
    new THREE.PlaneGeometry(channel.east - channel.west, channel.width + 6),
    waterMaterial,
  );
  inlet.rotation.x = -HALF_PI;
  inlet.position.set((channel.west + channel.east) / 2, 0.07, channel.centerZ);
  group.add(inlet);

  // ---- Road grid, ring road and lane paint (two merged meshes) --------------------------------
  const asphalt = { positions: [], normals: [], uvs: [], indices: [] };
  const paint = { positions: [], normals: [], uvs: [], indices: [] };
  const roads = [];

  for (let index = 0; index < ROADS.verticalX.length; index += 1) {
    const x = ROADS.verticalX[index];
    const name = ROADS.names.vertical[index] ?? `Jalan ${index + 1}`;
    roads.push({ name, axis: 'z', at: x, from: -CITY.halfDepth, to: CITY.halfDepth });
    const bridged = ROADS.bridges.some((bridge) => Math.abs(bridge.x - x) < 1);
    if (bridged) {
      addQuad(asphalt, x, -CITY.halfDepth, x, CITY.halfDepth, ROADS.width / 2, 0.04);
    } else {
      addQuad(asphalt, x, -CITY.halfDepth, x, channelLow - 2, ROADS.width / 2, 0.04);
      addQuad(asphalt, x, channelHigh + 2, x, CITY.halfDepth, ROADS.width / 2, 0.04);
    }
    for (let z = -CITY.halfDepth + 12; z < CITY.halfDepth; z += 26) {
      if (inChannel(x, z) && !bridged) continue;
      if (z + 8 > channelLow && z < channelHigh && !bridged) continue;
      addQuad(paint, x, z, x, z + 10, 0.34, 0.06);
    }
  }

  for (let index = 0; index < ROADS.horizontalZ.length; index += 1) {
    const z = ROADS.horizontalZ[index];
    const name = ROADS.names.horizontal[index] ?? `Jalan ${index + 1}`;
    roads.push({ name, axis: 'x', at: z, from: CITY.beach.inland, to: CITY.halfWidth });
    if (inChannel(0, z)) continue;
    addQuad(asphalt, CITY.beach.inland, z, CITY.halfWidth, z, ROADS.width / 2, 0.04);
    for (let x = CITY.beach.inland + 18; x < CITY.halfWidth; x += 26) {
      addQuad(paint, x, z, x + 10, z, 0.34, 0.06);
    }
  }

  const ring = ROADS.ring;
  roads.push({ name: ROADS.names.ring, axis: 'ring', ...ring });
  const ringSteps = 144;
  for (let step = 0; step < ringSteps; step += 1) {
    const t0 = (step / ringSteps) * Math.PI * 2;
    const t1 = ((step + 1) / ringSteps) * Math.PI * 2;
    const x0 = ring.center[0] + Math.cos(t0) * ring.radiusX;
    const z0 = ring.center[1] + Math.sin(t0) * ring.radiusZ;
    const x1 = ring.center[0] + Math.cos(t1) * ring.radiusX;
    const z1 = ring.center[1] + Math.sin(t1) * ring.radiusZ;
    if (Math.min(x0, x1) < CITY.beach.inland) continue;
    if (inChannel((x0 + x1) / 2, (z0 + z1) / 2) && !onBridge((x0 + x1) / 2, (z0 + z1) / 2)) continue;
    addQuad(asphalt, x0, z0, x1, z1, ring.width / 2, 0.045);
    if (step % 3 === 0) addQuad(paint, x0, z0, x1, z1, 0.3, 0.065);
  }

  group.add(meshFromQuads(THREE, asphalt, new THREE.MeshStandardMaterial({
    color: PALETTE.road,
    roughness: 0.95,
    side: THREE.DoubleSide,
  })));
  group.add(meshFromQuads(THREE, paint, new THREE.MeshBasicMaterial({
    color: PALETTE.roadLine,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  })));

  // ---- Bridges, pier and lighthouse ----------------------------------------------------------
  const concrete = new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.85 });
  const railPositions = [];
  for (const bridge of ROADS.bridges) {
    const span = channel.width + 52;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(ROADS.width + 8, 1.8, span), concrete);
    deck.position.set(bridge.x, 1.1, channel.centerZ);
    group.add(deck);
    roads.push({ name: bridge.name, axis: 'bridge', at: bridge.x });
    for (const side of [-1, 1]) railPositions.push([bridge.x + side * (ROADS.width / 2 + 3), channel.centerZ, span]);
  }
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 1.3, 1), concrete, railPositions.length);
  const dummy = new THREE.Object3D();
  railPositions.forEach(([x, z, span], index) => {
    dummy.position.set(x, 2.7, z);
    dummy.scale.set(1, 1, span);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    rails.setMatrixAt(index, dummy.matrix);
  });
  rails.instanceMatrix.needsUpdate = true;
  group.add(rails);

  const pierZ = -72;
  const pier = new THREE.Mesh(new THREE.BoxGeometry(158, 1.4, 16), concrete);
  pier.position.set(-352, 1.4, pierZ);
  group.add(pier);
  const postMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.8, 0.8, 9, 6),
    new THREE.MeshStandardMaterial({ color: '#5d4a45', roughness: 1 }),
    16,
  );
  for (let index = 0; index < 16; index += 1) {
    const x = -285 - (index % 8) * 19;
    const z = pierZ + (index < 8 ? -6 : 6);
    dummy.position.set(x, -2.2, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    postMesh.setMatrixAt(index, dummy.matrix);
  }
  postMesh.instanceMatrix.needsUpdate = true;
  group.add(postMesh);

  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(18, 10, 14),
    new THREE.MeshStandardMaterial({ color: PALETTE.beachBlock, roughness: 0.9 }),
  );
  hut.position.set(-424, 7.2, pierZ);
  group.add(hut);

  const rock = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 22, 6, 9),
    new THREE.MeshStandardMaterial({ color: '#565260', roughness: 1 }),
  );
  rock.position.set(-402, -1.5, 250);
  group.add(rock);
  const towerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 8.5, 46, 12),
    new THREE.MeshStandardMaterial({ color: '#efe2cf', roughness: 0.8 }),
  );
  towerBody.position.set(-402, 24, 250);
  group.add(towerBody);
  const towerBand = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.2, 5, 12),
    new THREE.MeshStandardMaterial({ color: '#d1545e', roughness: 0.8 }),
  );
  towerBand.position.set(-402, 39, 250);
  group.add(towerBand);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 12, 8),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  lamp.position.set(-402, 49, 250);
  group.add(lamp);
  const beacon = new THREE.PointLight(PALETTE.sun, 30, 320, 2);
  beacon.position.copy(lamp.position);
  group.add(beacon);

  // ---- Buildings: one instanced mesh per kind ------------------------------------------------
  const collisionBoxes = [];
  const dummyForBuildings = new THREE.Object3D();

  function scatter(district, step, chance, tall) {
    const spots = [];
    const [cx, cz] = district.center;
    const reach = district.radius - 18;
    for (let gx = -reach; gx <= reach; gx += step) {
      for (let gz = -reach; gz <= reach; gz += step) {
        if (!random.chance(chance)) continue;
        const x = cx + gx + random.range(-step * 0.16, step * 0.16);
        const z = cz + gz + random.range(-step * 0.16, step * 0.16);
        if (x < CITY.beach.inland + 8 || x > CITY.halfWidth - 12) continue;
        if (Math.abs(z) > CITY.halfDepth - 12 || wet(x, z) || isRoad(x, z)) continue;
        const width = tall ? random.range(13, 21) : random.range(17, 27);
        const depth = tall ? random.range(13, 21) : random.range(17, 27);
        const margin = Math.max(width, depth) / 2 + 2;
        if (isRoad(x + margin, z) || isRoad(x - margin, z) || isRoad(x, z + margin) || isRoad(x, z - margin)) continue;
        const centrality = 1 - Math.min(1, Math.hypot(gx, gz) / reach);
        const height = tall
          ? 28 + centrality * 95 + random.range(0, 48)
          : 8 + random.range(0, 13) + centrality * 5;
        spots.push({ x, z, width, depth, height });
      }
    }
    return spots;
  }

  const downtown = DISTRICTS[0];
  const seaside = DISTRICTS[1];
  const towers = scatter(downtown, 24, 0.9, true);
  const blocks = scatter(seaside, 30, 0.86, false);

  if (towers.length) {
    const windows = makeWindows(THREE);
    const towerMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        map: windows,
        emissiveMap: windows,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.85,
        color: PALETTE.tower,
        roughness: 0.4,
        metalness: 0.25,
      }),
      towers.length,
    );
    towerMesh.name = 'teluk-aruna-towers';
    const accent = new THREE.Color();
    towers.forEach((spot, index) => {
      dummyForBuildings.position.set(spot.x, spot.height / 2, spot.z);
      dummyForBuildings.rotation.set(0, 0, 0);
      dummyForBuildings.scale.set(spot.width, spot.height, spot.depth);
      dummyForBuildings.updateMatrix();
      towerMesh.setMatrixAt(index, dummyForBuildings.matrix);
      accent.set(PALETTE.neon[index % PALETTE.neon.length]).lerp(new THREE.Color('#ffffff'), 0.55);
      towerMesh.setColorAt(index, accent);
      collisionBoxes.push({
        minX: spot.x - spot.width / 2, maxX: spot.x + spot.width / 2,
        minZ: spot.z - spot.depth / 2, maxZ: spot.z + spot.depth / 2,
        height: spot.height, district: downtown.id,
      });
    });
    towerMesh.instanceMatrix.needsUpdate = true;
    if (towerMesh.instanceColor) towerMesh.instanceColor.needsUpdate = true;
    group.add(towerMesh);
  }

  if (blocks.length) {
    const blockMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }),
      blocks.length,
    );
    blockMesh.name = 'marina-senja-blocks';
    const pastel = new THREE.Color();
    const pastels = [PALETTE.beachBlock, '#f3d5ae', '#c9d6d0', '#e8b8b6', '#b9c8d8'];
    blocks.forEach((spot, index) => {
      dummyForBuildings.position.set(spot.x, spot.height / 2, spot.z);
      dummyForBuildings.rotation.set(0, 0, 0);
      dummyForBuildings.scale.set(spot.width, spot.height, spot.depth);
      dummyForBuildings.updateMatrix();
      blockMesh.setMatrixAt(index, dummyForBuildings.matrix);
      pastel.set(pastels[index % pastels.length]);
      blockMesh.setColorAt(index, pastel);
      collisionBoxes.push({
        minX: spot.x - spot.width / 2, maxX: spot.x + spot.width / 2,
        minZ: spot.z - spot.depth / 2, maxZ: spot.z + spot.depth / 2,
        height: spot.height, district: seaside.id,
      });
    });
    blockMesh.instanceMatrix.needsUpdate = true;
    if (blockMesh.instanceColor) blockMesh.instanceColor.needsUpdate = true;
    group.add(blockMesh);
  }

  // ---- Palms: two instanced meshes for trunks and fronds -------------------------------------
  const palms = [];
  for (let index = 0; index < 44; index += 1) {
    palms.push({
      x: random.range(CITY.beach.west + 8, CITY.beach.inland - 4),
      z: random.range(-CITY.halfDepth + 20, CITY.halfDepth - 20),
      height: random.range(8, 13),
      lean: random.range(-0.12, 0.12),
    });
  }
  for (const spot of blocks) {
    if (random.chance(0.35)) {
      palms.push({ x: spot.x + spot.width / 2 + 7, z: spot.z, height: random.range(7, 11), lean: random.range(-0.1, 0.1) });
    }
  }
  if (palms.length) {
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.6, 1.1, 1, 6),
      new THREE.MeshStandardMaterial({ color: PALETTE.palmTrunk, roughness: 1 }),
      palms.length,
    );
    const fronds = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 7),
      new THREE.MeshStandardMaterial({ color: PALETTE.palmLeaf, roughness: 0.9, side: THREE.DoubleSide }),
      palms.length * 2,
    );
    palms.forEach((palm, index) => {
      dummyForBuildings.position.set(palm.x, palm.height / 2 + 0.1, palm.z);
      dummyForBuildings.rotation.set(palm.lean, 0, palm.lean * 0.5);
      dummyForBuildings.scale.set(1, palm.height, 1);
      dummyForBuildings.updateMatrix();
      trunks.setMatrixAt(index, dummyForBuildings.matrix);
      for (let crown = 0; crown < 2; crown += 1) {
        dummyForBuildings.position.set(palm.x, palm.height + 0.8 + crown * 1.4, palm.z);
        dummyForBuildings.rotation.set(crown ? 0.5 : -0.4, index * 0.7 + crown, palm.lean);
        dummyForBuildings.scale.set(5.6 - crown * 1.2, 3.4, 5.6 - crown * 1.2);
        dummyForBuildings.updateMatrix();
        fronds.setMatrixAt(index * 2 + crown, dummyForBuildings.matrix);
      }
    });
    trunks.instanceMatrix.needsUpdate = true;
    fronds.instanceMatrix.needsUpdate = true;
    group.add(trunks, fronds);
  }

  // ---- Lights -------------------------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(PALETTE.skyBottom, PALETTE.sand, 1.35));
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.1);
  sun.position.set(-520, 190, -280);
  scene.add(sun);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(40, 16, 12),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  sunDisc.position.set(-810, 105, -420);
  group.add(sunDisc);
  group.add(makeSky(THREE));

  const spawnPoints = SPAWN_ZONES.map((zone) => ({
    x: zone.x,
    z: zone.z,
    district: zone.district,
  }));

  /** Called by the render loop with elapsed seconds: a gentle, shader-free tide shimmer. */
  function update(time) {
    const shimmer = 0.1 + 0.045 * Math.sin(time * 0.65) + 0.02 * Math.sin(time * 1.7);
    waterMaterial.color.copy(waterColor).lerp(glintColor, shimmer);
    beacon.intensity = 22 + 10 * Math.sin(time * 1.4);
  }

  return {
    scene,
    group,
    roads,
    districtOf,
    spawnPoints,
    isRoad,
    getCollisionBoxes: () => collisionBoxes,
    getPalms: () => palms,
    update,
  };
}
