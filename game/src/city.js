import { BOUNDS, CONTRACTS, DEPARTURES, GRID, INK, STREETS, ZONES } from './config.js';
import { makeRng } from './random.js';

const FULL = Math.PI * 2;

function canvasTexture(THREE, width, height, painter) {
  const sheet = document.createElement('canvas');
  sheet.width = width;
  sheet.height = height;
  painter(sheet.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(sheet);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function towerWindows(THREE, rng) {
  return canvasTexture(THREE, 128, 256, (brush, w, h) => {
    const sky = brush.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#33456b');
    sky.addColorStop(0.55, '#1b2a48');
    sky.addColorStop(1, '#0d1628');
    brush.fillStyle = sky;
    brush.fillRect(0, 0, w, h);
    const litColors = ['#ffe0a5', '#fff3d4', '#a9ecff', '#ffb4d2'];
    for (let row = 0; row < 24; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const on = rng.chance(0.5);
        brush.fillStyle = on ? rng.pick(litColors) : '#101a2c';
        brush.fillRect(col * 16 + 3, row * 10 + 2, 10, 6);
      }
    }
    brush.fillStyle = 'rgba(3,7,18,0.45)';
    for (let col = 1; col < 8; col += 1) brush.fillRect(col * 16 - 1, 0, 1.5, h);
  });
}

function cottageWindows(THREE, rng) {
  return canvasTexture(THREE, 96, 96, (brush, w, h) => {
    brush.fillStyle = '#f5e2cb';
    brush.fillRect(0, 0, w, h);
    brush.fillStyle = '#b28e86';
    brush.fillRect(0, h - 10, w, 10);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        brush.fillStyle = rng.chance(0.45)
          ? rng.pick(['#ffe5ac', '#d0f2f1', '#fff7de'])
          : '#9c817e';
        brush.fillRect(12 + col * 28, 13 + row * 23, 16, 14);
      }
    }
  });
}

function districtSign(THREE, heading, footnote, tint) {
  return canvasTexture(THREE, 512, 160, (brush, w, h) => {
    brush.fillStyle = 'rgba(11,9,22,0.94)';
    brush.fillRect(0, 0, w, h);
    brush.strokeStyle = tint;
    brush.lineWidth = 8;
    brush.strokeRect(8, 8, w - 16, h - 16);
    brush.textAlign = 'center';
    brush.fillStyle = tint;
    brush.font = 'bold 48px sans-serif';
    brush.fillText(heading, w / 2, 74);
    brush.fillStyle = '#ffe6ca';
    brush.font = '22px sans-serif';
    brush.fillText(footnote, w / 2, 116);
  });
}

function landingMark(THREE) {
  return canvasTexture(THREE, 256, 256, (brush, w, h) => {
    brush.fillStyle = '#2b3342';
    brush.fillRect(0, 0, w, h);
    brush.strokeStyle = '#ffd08a';
    brush.lineWidth = 11;
    brush.beginPath();
    brush.arc(128, 128, 95, 0, FULL);
    brush.stroke();
    brush.fillStyle = '#ffe5b2';
    brush.font = 'bold 150px sans-serif';
    brush.textAlign = 'center';
    brush.textBaseline = 'middle';
    brush.fillText('H', 128, 138);
  });
}

function palmCanopy(THREE) {
  const triangles = [];
  const armCount = 7;
  const addTriangle = (a, b, c) => triangles.push(...a, ...b, ...c);
  for (let arm = 0; arm < armCount; arm += 1) {
    const angle = (arm / armCount) * FULL;
    const alongX = Math.cos(angle);
    const alongZ = Math.sin(angle);
    const sideX = -alongZ;
    const sideZ = alongX;
    addTriangle(
      [0, 0.3, 0],
      [alongX * 1.4 + sideX * 0.9, 0, alongZ * 1.4 + sideZ * 0.9],
      [alongX * 5.3, -1.1, alongZ * 5.3],
    );
    addTriangle(
      [0, 0.3, 0],
      [alongX * 5.3, -1.1, alongZ * 5.3],
      [alongX * 1.4 - sideX * 0.9, 0, alongZ * 1.4 - sideZ * 0.9],
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(triangles, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function distanceToSegment(x, z, lane) {
  const dx = lane.bx - lane.ax;
  const dz = lane.bz - lane.az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0
    ? Math.max(0, Math.min(1, ((x - lane.ax) * dx + (z - lane.az) * dz) / lengthSq))
    : 0;
  return Math.hypot(x - lane.ax - t * dx, z - lane.az - t * dz);
}

function flooded(x, z) {
  if (x < GRID.coast - 2) return true;
  const canal = GRID.waterway;
  return x >= canal.west && x <= canal.east && Math.abs(z - canal.z) < canal.half;
}

export function assembleCity(THREE, seed = 1337) {
  const towersRng = makeRng(seed * 29 + 11);
  const homesRng = makeRng(seed * 31 + 23);
  const palmsRng = makeRng(seed * 37 + 41);
  const skinRng = makeRng(seed * 43 + 59);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK.horizon);
  scene.fog = new THREE.Fog(INK.mist, 540, 1900);
  const world = new THREE.Group();
  world.name = 'kota-aruna-world';
  scene.add(world);

  const lanes = [];
  const solids = [];
  const pavement = [];
  const paint = [];
  const neon = [];
  const bridge = [];
  const bridgeRail = [];
  const canalWall = [];
  const towers = [];
  const crowns = [];
  const homes = [];
  const roofs = [];
  const trunks = [];
  const leaves = [];
  const planks = [];
  const posts = [];
  const lampPosts = [];
  const lampBulbs = [];
  const girder = [];

  GRID.columns.forEach((x, index) => {
    lanes.push({
      name: STREETS.columns[index % STREETS.columns.length],
      kind: 'avenue',
      ax: x,
      az: GRID.rows[0],
      bx: x,
      bz: GRID.rows[GRID.rows.length - 1],
      width: GRID.laneWidth,
    });
  });
  GRID.rows.forEach((z, index) => {
    lanes.push({
      name: STREETS.rows[index % STREETS.rows.length],
      kind: 'street',
      ax: GRID.columns[0],
      az: z,
      bx: GRID.columns[GRID.columns.length - 1],
      bz: z,
      width: GRID.laneWidth,
    });
  });

  const ring = GRID.ring;
  for (let slice = 0; slice < ring.slices; slice += 1) {
    const from = (slice / ring.slices) * FULL;
    const to = ((slice + 1) / ring.slices) * FULL;
    lanes.push({
      name: STREETS.circle,
      kind: 'orbital',
      ax: ring.x + Math.cos(from) * ring.rx,
      az: ring.z + Math.sin(from) * ring.rz,
      bx: ring.x + Math.cos(to) * ring.rx,
      bz: ring.z + Math.sin(to) * ring.rz,
      width: ring.width,
    });
  }
  lanes.push({
    name: STREETS.jetty,
    kind: 'boardwalk',
    ax: GRID.jetty.shore + 20,
    az: GRID.jetty.z,
    bx: GRID.jetty.end,
    bz: GRID.jetty.z,
    width: GRID.jetty.width,
  });

  function roadClearance(x, z) {
    let clearance = Infinity;
    for (const lane of lanes) {
      clearance = Math.min(clearance, distanceToSegment(x, z, lane) - lane.width / 2);
    }
    return clearance;
  }

  const landmarks = [...DEPARTURES, ...CONTRACTS.map((job) => job.at)];
  function reservedGround(x, z, reach) {
    return landmarks.some((spot) => Math.hypot(x - spot.x, z - spot.z) < 30 + reach)
      || Math.hypot(x - GRID.pad.x, z - GRID.pad.z) < GRID.pad.radius + 18 + reach;
  }

  const terrain = new THREE.Mesh(
    new THREE.PlaneGeometry(830, 1030),
    new THREE.MeshStandardMaterial({ color: INK.land, roughness: 1 }),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(90, 0, 0);
  world.add(terrain);

  const sandyStrip = new THREE.Mesh(
    new THREE.BoxGeometry(GRID.sand, 0.24, 1030),
    new THREE.MeshStandardMaterial({ color: INK.beach, roughness: 1 }),
  );
  sandyStrip.position.set(GRID.coast - GRID.sand / 2 + 12, 0.1, 0);
  world.add(sandyStrip);

  const sandyInlet = new THREE.Mesh(
    new THREE.BoxGeometry(165, 0.2, 415),
    new THREE.MeshStandardMaterial({ color: INK.beach, roughness: 1 }),
  );
  sandyInlet.position.set(-262, 0.09, -190);
  world.add(sandyInlet);

  const clock = { value: 0 };
  const waterSkin = new THREE.ShaderMaterial({
    uniforms: {
      uTime: clock,
      uDeep: { value: new THREE.Color(INK.deep) },
      uCoast: { value: new THREE.Color(INK.shallow) },
      uGlint: { value: new THREE.Color(INK.sunlight) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 here = modelMatrix * vec4(position, 1.0);
        vWorld = here.xyz;
        gl_Position = projectionMatrix * viewMatrix * here;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uCoast;
      uniform vec3 uGlint;
      varying vec3 vWorld;
      void main() {
        float swell = sin(vWorld.x * 0.038 - uTime * 0.85) * cos(vWorld.z * 0.057 + uTime * 0.55);
        float ripple = sin(vWorld.x * 0.21 + vWorld.z * 0.16 + uTime * 0.7 + swell * 2.4);
        float mixup = clamp(0.44 + 0.18 * swell + 0.08 * ripple, 0.0, 1.0);
        vec3 base = mix(uDeep, uCoast, mixup);
        float sparkle = pow(max(ripple, 0.0), 28.0) * 0.55;
        base += uGlint * sparkle;
        gl_FragColor = vec4(pow(base, vec3(0.4545)), 1.0);
      }
    `,
  });

  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1650, 1300), waterSkin);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-1070, BOUNDS.seaHeight, 0);
  world.add(ocean);

  const canal = GRID.waterway;
  const waterway = new THREE.Mesh(
    new THREE.PlaneGeometry(canal.east - canal.west, canal.half * 2),
    waterSkin,
  );
  waterway.rotation.x = -Math.PI / 2;
  waterway.position.set((canal.west + canal.east) / 2, BOUNDS.seaHeight + 0.01, canal.z);
  world.add(waterway);

  const wallMidX = (canal.west + canal.east) / 2;
  canalWall.push({ x: wallMidX, y: 0.18, z: canal.z + canal.half + 3, sx: canal.east - canal.west, sy: 0.45, sz: 5.5, color: INK.stone });
  canalWall.push({ x: wallMidX, y: 0.18, z: canal.z - canal.half - 3, sx: canal.east - canal.west, sy: 0.45, sz: 5.5, color: INK.stone });
  canalWall.push({ x: canal.east + 3, y: 0.18, z: canal.z, sx: 5.5, sy: 0.45, sz: canal.half * 2 + 10, color: INK.stone });

  for (const lane of lanes) {
    const dx = lane.bx - lane.ax;
    const dz = lane.bz - lane.az;
    const span = Math.hypot(dx, dz);
    if (span < 0.01) continue;
    const yaw = -Math.atan2(dz, dx);
    const midX = (lane.ax + lane.bx) / 2;
    const midZ = (lane.az + lane.bz) / 2;
    pavement.push({
      x: midX, y: lane.kind === 'boardwalk' ? 0.5 : 0.07, z: midZ,
      ry: yaw, sx: span, sy: 0.12, sz: lane.width,
      color: lane.kind === 'orbital' ? INK.ring : INK.street,
    });

    if (lane.kind !== 'boardwalk') {
      for (let along = 9; along < span - 5; along += 15) {
        const factor = along / span;
        paint.push({
          x: lane.ax + dx * factor, y: 0.145, z: lane.az + dz * factor,
          ry: yaw, sx: 6.4, sy: 0.03, sz: 0.5, color: INK.markings,
        });
      }
    }

    if (lane.kind === 'orbital') {
      const inwardX = ring.x - midX;
      const inwardZ = ring.z - midZ;
      const norm = Math.hypot(inwardX, inwardZ) || 1;
      const offset = ring.width / 2 - 1.6;
      neon.push({
        x: midX + (inwardX / norm) * offset, y: 0.16,
        z: midZ + (inwardZ / norm) * offset,
        ry: yaw, sx: span, sy: 0.07, sz: 0.6,
        color: (Math.floor(midX + midZ) % 2 === 0) ? INK.aqua : INK.rose,
      });
    }

    if (lane.kind === 'avenue' || lane.kind === 'street') {
      const fraction = (canal.z - lane.az) / dz;
      if (fraction > 0 && fraction < 1) {
        const bridgeX = lane.ax + dx * fraction;
        const deckLength = Math.min(span, (canal.half * 2 * span) / Math.abs(dz) + 10);
        bridge.push({
          x: bridgeX, y: 0.02, z: canal.z,
          ry: yaw, sx: deckLength, sy: 0.12, sz: lane.width + 5, color: INK.stone,
        });
        const sideX = -dz / span;
        const sideZ = dx / span;
        for (const side of [-1, 1]) {
          bridgeRail.push({
            x: bridgeX + side * sideX * (lane.width / 2 + 1.3),
            y: 0.8,
            z: canal.z + side * sideZ * (lane.width / 2 + 1.3),
            ry: yaw, sx: deckLength, sy: 1.3, sz: 0.6, color: '#ded1b6',
          });
        }
      }
    }
  }

  const harbor = ZONES[0];
  for (let attempt = 0; towers.length < 112 && attempt < 7000; attempt += 1) {
    const width = towersRng.range(13, 29);
    const depth = towersRng.range(13, 29);
    const x = towersRng.range(-15, 458);
    const z = towersRng.range(-455, 455);
    if (Math.hypot(x - harbor.x, z - harbor.z) > harbor.radius) continue;
    if (reservedGround(x, z, Math.max(width, depth) * 0.6)) continue;
    if (roadClearance(x, z) < Math.max(width, depth) * 0.6 + 7) continue;
    if (x > canal.west - 20 && x < canal.east + 32
      && Math.abs(z - canal.z) < canal.half + Math.max(width, depth) * 0.7) continue;
    const overlaps = towers.some((other) => Math.hypot(x - other.x, z - other.z)
      < (Math.max(width, depth) + Math.max(other.sx, other.sz)) * 0.57);
    if (overlaps) continue;
    const centrality = 1 - Math.min(1, Math.hypot(x - harbor.x, z - harbor.z) / harbor.radius);
    const height = 25 + centrality * towersRng.range(50, 136) + towersRng.range(0, 26);
    towers.push({
      x, y: 0, z,
      ry: towersRng.chance(0.72) ? towersRng.pick([0, Math.PI / 2]) : towersRng.range(-0.2, 0.2),
      sx: width, sy: height, sz: depth, color: towersRng.pick(INK.offices),
    });
    if (height > 90) {
      crowns.push({
        x, y: height + 0.9, z, ry: 0,
        sx: width + 1.6, sy: 1.5, sz: depth + 1.6,
        color: towersRng.pick([INK.aqua, INK.rose, INK.lantern]),
      });
    }
    solids.push({ x, z, halfX: width / 2 + 1.5, halfZ: depth / 2 + 1.5 });
  }

  const village = ZONES[1];
  for (let attempt = 0; homes.length < 84 && attempt < 7000; attempt += 1) {
    const width = homesRng.range(14, 30);
    const depth = homesRng.range(13, 28);
    const x = homesRng.range(-296, -12);
    const z = homesRng.range(-445, 445);
    if (Math.hypot(x - village.x, z - village.z) > village.radius * 1.12) continue;
    if (reservedGround(x, z, Math.max(width, depth) * 0.58)) continue;
    if (roadClearance(x, z) < Math.max(width, depth) * 0.58 + 5) continue;
    if (x > canal.west - 15 && x < canal.east + 20
      && Math.abs(z - canal.z) < canal.half + Math.max(width, depth) * 0.65) continue;
    const overlaps = homes.some((other) => Math.hypot(x - other.x, z - other.z)
      < (Math.max(width, depth) + Math.max(other.sx, other.sz)) * 0.56);
    if (overlaps) continue;
    const height = homesRng.range(4.5, 12);
    homes.push({
      x, y: 0, z,
      ry: homesRng.chance(0.7) ? 0 : homesRng.range(-0.2, 0.2),
      sx: width, sy: height, sz: depth, color: homesRng.pick(INK.homes),
    });
    roofs.push({
      x, y: height + 0.42, z, ry: 0,
      sx: width + 1.6, sy: 0.85, sz: depth + 1.6, color: '#f0e3d2',
    });
    solids.push({ x, z, halfX: width / 2 + 1.2, halfZ: depth / 2 + 1.2 });
  }

  for (let attempt = 0; trunks.length < 96 && attempt < 8000; attempt += 1) {
    const x = palmsRng.range(-308, -4);
    const z = palmsRng.range(-448, 448);
    if (Math.hypot(x - village.x, z - village.z) > village.radius * 1.18) continue;
    if (roadClearance(x, z) < 5) continue;
    if (x > canal.west - 14 && x < canal.east + 14
      && Math.abs(z - canal.z) < canal.half + 7) continue;
    if (homes.some((house) => Math.abs(x - house.x) < house.sx / 2 + 3
      && Math.abs(z - house.z) < house.sz / 2 + 3)) continue;
    if (trunks.some((tree) => Math.hypot(x - tree.x, z - tree.z) < 6)) continue;
    const height = palmsRng.range(6, 11);
    const scale = palmsRng.range(0.85, 1.35);
    trunks.push({
      x, y: 0.12, z, ry: palmsRng.range(0, FULL),
      sx: 1, sy: height, sz: 1, color: '#71503a',
    });
    leaves.push({
      x, y: height + 0.12, z, ry: palmsRng.range(0, FULL),
      sx: scale, sy: scale, sz: scale, color: palmsRng.pick(INK.fronds),
    });
  }

  const jetty = GRID.jetty;
  for (let x = jetty.shore; x >= jetty.end; x -= 2.4) {
    planks.push({
      x, y: 0.62, z: jetty.z, ry: 0,
      sx: 2.25, sy: 0.3, sz: jetty.width,
      color: Math.floor(x) % 3 === 0 ? '#80563c' : INK.wood,
    });
  }
  for (let x = jetty.shore - 4; x >= jetty.end; x -= 17) {
    for (const side of [-1, 1]) {
      posts.push({
        x, y: -0.9, z: jetty.z + side * (jetty.width / 2 - 0.7),
        ry: 0, sx: 0.9, sy: 3.2, sz: 0.9, color: '#4a3426',
      });
    }
  }
  for (const x of [-318, -365, -412]) {
    lampPosts.push({ x, y: 2.2, z: jetty.z + jetty.width / 2 - 0.8, ry: 0, sx: 0.26, sy: 3.4, sz: 0.26, color: '#302b36' });
    lampBulbs.push({ x, y: 4.1, z: jetty.z + jetty.width / 2 - 0.8, ry: 0, sx: 1, sy: 1, sz: 1, color: INK.lantern });
  }

  const beacon = new THREE.Group();
  beacon.name = 'marina-senja-beacon';
  beacon.position.set(GRID.lamp.x, 0, GRID.lamp.z);
  const rock = new THREE.MeshStandardMaterial({ color: '#4c424c', roughness: 1 });
  const chalk = new THREE.MeshStandardMaterial({ color: '#f3e9db', roughness: 0.76 });
  const rust = new THREE.MeshStandardMaterial({ color: '#b94f4c', roughness: 0.8 });
  const iron = new THREE.MeshStandardMaterial({ color: '#2d2934', roughness: 0.6, metalness: 0.25 });
  const island = new THREE.Mesh(new THREE.CylinderGeometry(15, 19, 5, 20), rock);
  island.position.y = 2;
  beacon.add(island);
  for (let band = 0; band < 4; band += 1) {
    const low = 4.5 + band * 7.75;
    const high = low + 7.75;
    const taper = 6.2 - band * 0.52;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(taper - 0.52, taper, high - low, 18),
      band % 2 === 0 ? chalk : rust,
    );
    stripe.position.y = (low + high) / 2;
    beacon.add(stripe);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.4, 16), iron);
  gallery.position.y = 36;
  beacon.add(gallery);
  const lampGlass = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 18, 12),
    new THREE.MeshBasicMaterial({ color: INK.sunlight, toneMapped: false }),
  );
  lampGlass.position.y = 36.8;
  beacon.add(lampGlass);
  const lampHalo = new THREE.Mesh(
    new THREE.SphereGeometry(5.8, 16, 12),
    new THREE.MeshBasicMaterial({
      color: INK.lantern, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  lampHalo.position.y = 36.8;
  beacon.add(lampHalo);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 4.5, 3.4, 16), iron);
  cap.position.y = 39.9;
  beacon.add(cap);
  const sweepGeometry = new THREE.BoxGeometry(1.3, 1.3, 54);
  sweepGeometry.translate(0, 0, 27);
  const sweep = new THREE.Mesh(
    sweepGeometry,
    new THREE.MeshBasicMaterial({
      color: INK.sunlight, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  sweep.position.y = 36.8;
  beacon.add(sweep);
  const beaconLight = new THREE.PointLight(INK.lantern, 1.6, 250, 2);
  beaconLight.position.y = 36.8;
  beacon.add(beaconLight);
  world.add(beacon);
  solids.push({ x: GRID.lamp.x, z: GRID.lamp.z, halfX: 11, halfZ: 11 });

  for (const crane of [
    { x: 405, z: -120, tilt: 0.2 },
    { x: 425, z: 120, tilt: -0.4 },
    { x: 355, z: 330, tilt: 0.7 },
  ]) {
    girder.push({ x: crane.x, y: 24, z: crane.z, ry: crane.tilt, sx: 46, sy: 2.3, sz: 2.3, color: '#dca463' });
    girder.push({ x: crane.x - 16, y: 12, z: crane.z, ry: 0, sx: 2.3, sy: 24, sz: 2.3, color: '#70655c' });
    girder.push({ x: crane.x - 16, y: 23, z: crane.z, ry: 0, sx: 0.8, sy: 22, sz: 0.8, color: '#90806d' });
    solids.push({ x: crane.x - 16, z: crane.z, halfX: 3, halfZ: 3 });
  }

  const pad = GRID.pad;
  const dais = new THREE.Mesh(
    new THREE.CylinderGeometry(pad.radius, pad.radius + 2, 2.2, 32),
    new THREE.MeshStandardMaterial({ color: '#3b3f52', roughness: 0.85 }),
  );
  dais.position.set(pad.x, 1.1, pad.z);
  world.add(dais);
  const padMark = new THREE.Mesh(
    new THREE.PlaneGeometry(pad.radius * 1.75, pad.radius * 1.75),
    new THREE.MeshBasicMaterial({ map: landingMark(THREE) }),
  );
  padMark.rotation.x = -Math.PI / 2;
  padMark.position.set(pad.x, 2.24, pad.z);
  world.add(padMark);
  for (let bulb = 0; bulb < 12; bulb += 1) {
    const angle = (bulb / 12) * FULL;
    lampBulbs.push({
      x: pad.x + Math.cos(angle) * (pad.radius - 1), y: 2.55,
      z: pad.z + Math.sin(angle) * (pad.radius - 1),
      ry: 0, sx: 0.6, sy: 0.6, sz: 0.6,
      color: bulb % 2 === 0 ? INK.lantern : INK.aqua,
    });
  }

  for (const sign of [
    { x: 150, z: -338, heading: ZONES[0].label, note: ZONES[0].note, tint: INK.aqua },
    { x: -180, z: -338, heading: ZONES[1].label, note: ZONES[1].note, tint: INK.rose },
  ]) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(62, 19),
      new THREE.MeshBasicMaterial({ map: districtSign(THREE, sign.heading, sign.note, sign.tint) }),
    );
    board.position.set(sign.x, 20, sign.z);
    board.rotation.y = 0.1;
    world.add(board);
    for (const offset of [-24, 24]) {
      girder.push({ x: sign.x + offset, y: 10, z: sign.z, ry: 0, sx: 1.7, sy: 20, sz: 1.7, color: '#4d4859' });
    }
  }

  const sunward = new THREE.Vector3(-0.84, 0.17, -0.32).normalize();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 18),
    new THREE.ShaderMaterial({
      uniforms: {
        uUpper: { value: new THREE.Color(INK.zenith) },
        uLower: { value: new THREE.Color(INK.horizon) },
        uGlow: { value: new THREE.Color(INK.sunlight) },
        uSun: { value: sunward },
      },
      vertexShader: `
        varying vec3 vRay;
        void main() {
          vRay = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uUpper;
        uniform vec3 uLower;
        uniform vec3 uGlow;
        uniform vec3 uSun;
        varying vec3 vRay;
        void main() {
          vec3 ray = normalize(vRay);
          float lift = smoothstep(-0.1, 0.62, ray.y);
          vec3 shade = mix(uLower, uUpper, lift);
          float facing = max(dot(ray, uSun), 0.0);
          shade += uGlow * pow(facing, 8.0) * 0.25;
          shade += uGlow * pow(facing, 160.0) * 1.3;
          gl_FragColor = vec4(pow(shade, vec3(0.4545)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  dome.frustumCulled = false;
  scene.add(dome);

  const sunPosition = sunward.clone().multiplyScalar(1550);
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(56, 24, 16),
    new THREE.MeshBasicMaterial({ color: INK.sunlight, toneMapped: false, fog: false }),
  );
  sunDisc.position.copy(sunPosition);
  sunDisc.frustumCulled = false;
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(126, 20, 14),
    new THREE.MeshBasicMaterial({
      color: INK.lantern, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
    }),
  );
  sunGlow.position.copy(sunPosition);
  sunGlow.frustumCulled = false;
  scene.add(sunGlow);

  const sunLight = new THREE.DirectionalLight(INK.sunlight, 2.4);
  sunLight.position.copy(sunward.clone().multiplyScalar(650));
  sunLight.target.position.set(70, 0, 0);
  scene.add(sunLight, sunLight.target);
  scene.add(new THREE.HemisphereLight(INK.zenith, INK.land, 1.3));
  scene.add(new THREE.AmbientLight(INK.horizon, 0.2));

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const standingCube = new THREE.BoxGeometry(1, 1, 1);
  standingCube.translate(0, 0.5, 0);
  const trunkShape = new THREE.CylinderGeometry(0.3, 0.52, 1, 5);
  trunkShape.translate(0, 0.5, 0);

  function batch(geometry, material, entries, label) {
    if (!entries.length) return null;
    const instanced = new THREE.InstancedMesh(geometry, material, entries.length);
    instanced.name = label;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    const angles = new THREE.Euler();
    const scale = new THREE.Vector3();
    const tint = new THREE.Color();
    entries.forEach((entry, index) => {
      position.set(entry.x ?? 0, entry.y ?? 0, entry.z ?? 0);
      angles.set(entry.rx ?? 0, entry.ry ?? 0, entry.rz ?? 0);
      turn.setFromEuler(angles);
      scale.set(entry.sx ?? 1, entry.sy ?? 1, entry.sz ?? 1);
      matrix.compose(position, turn, scale);
      instanced.setMatrixAt(index, matrix);
      if (entry.color !== undefined) instanced.setColorAt(index, tint.set(entry.color));
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    world.add(instanced);
    return instanced;
  }

  const matte = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0.04 });
  const luminous = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  batch(cube, matte, pavement, 'road-surface');
  batch(cube, luminous, paint, 'road-markings');
  batch(cube, luminous, neon, 'ring-neon');
  batch(cube, matte, canalWall, 'canal-edges');
  batch(cube, matte, bridge, 'canal-bridges');
  batch(cube, matte, bridgeRail, 'bridge-rails');

  const officeSkin = towerWindows(THREE, skinRng);
  batch(standingCube, new THREE.MeshStandardMaterial({
    map: officeSkin, emissive: new THREE.Color('#ffd6a5'),
    emissiveMap: officeSkin, emissiveIntensity: 0.8, roughness: 0.6, metalness: 0.14,
  }), towers, 'harbor-towers');
  batch(cube, luminous, crowns, 'tower-crowns');

  const homeSkin = cottageWindows(THREE, skinRng);
  batch(standingCube, new THREE.MeshStandardMaterial({
    map: homeSkin, emissive: new THREE.Color('#5a4041'),
    emissiveMap: homeSkin, emissiveIntensity: 0.16, roughness: 0.9,
  }), homes, 'coastal-houses');
  batch(cube, matte, roofs, 'house-roofs');

  batch(trunkShape, matte, trunks, 'palm-trunks');
  batch(palmCanopy(THREE), new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.88, side: THREE.DoubleSide,
  }), leaves, 'palm-crowns');

  batch(cube, matte, planks, 'jetty-planks');
  batch(cube, matte, posts, 'jetty-piles');
  batch(cube, matte, lampPosts, 'lamp-posts');
  batch(new THREE.SphereGeometry(0.5, 10, 8), luminous, lampBulbs, 'lamp-bulbs');
  batch(cube, matte, girder, 'harbor-cranes');

  function districtAt(x, z) {
    let best = ZONES[0].key;
    let nearest = Infinity;
    for (const zone of ZONES) {
      const reach = Math.hypot(x - zone.x, z - zone.z);
      if (reach <= zone.radius) return zone.key;
      if (reach < nearest) {
        nearest = reach;
        best = zone.key;
      }
    }
    return best;
  }

  function tick(seconds) {
    clock.value = seconds;
    sweep.rotation.y = seconds * 0.58;
    beaconLight.intensity = 1.4 + Math.sin(seconds * 2.1) * 0.25;
    lampHalo.scale.setScalar(1 + Math.sin(seconds * 2.1) * 0.07);
  }

  return {
    scene,
    world,
    lanes,
    solids,
    towers,
    homes,
    palms: trunks,
    pad: { ...pad },
    jetty: { ...jetty },
    light: { ...GRID.lamp },
    range: BOUNDS.worldRange,
    districtAt,
    onRoad(x, z) {
      return roadClearance(x, z) <= 0;
    },
    inWater: flooded,
    tick,
  };
}

export default assembleCity;
