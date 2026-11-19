import {
  BOUNDS,
  COLORS,
  DISTRICTS,
  GRID,
  SPAWNS,
  STREET_NAMES,
} from './config.js';
import { makeRng } from './random.js';

const TAU = Math.PI * 2;

function segmentGap(px, pz, segment) {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const size = dx * dx + dz * dz;
  const fraction = size > 0
    ? Math.max(0, Math.min(1, ((px - segment.ax) * dx + (pz - segment.az) * dz) / size))
    : 0;
  return Math.hypot(px - (segment.ax + dx * fraction), pz - (segment.az + dz * fraction));
}

function textureCanvas(THREE, width, height, painter) {
  const sheet = document.createElement('canvas');
  sheet.width = width;
  sheet.height = height;
  painter(sheet.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(sheet);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function windowSkin(THREE, rng, isTower) {
  return textureCanvas(THREE, 128, 256, (brush, width, height) => {
    const wash = brush.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, isTower ? '#263554' : '#f8e4cb');
    wash.addColorStop(1, isTower ? '#0b1527' : '#d4b6a6');
    brush.fillStyle = wash;
    brush.fillRect(0, 0, width, height);

    const columns = isTower ? 8 : 4;
    const rows = isTower ? 24 : 6;
    const inset = 7;
    const cellW = (width - inset * 2) / columns;
    const cellH = (height - inset * 2) / rows;
    const litColors = isTower
      ? ['#ffd79a', '#ffeac6', '#9ce8ff', '#ff9ec3']
      : ['#ffd7a1', '#fff0cf', '#bde9dc'];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        brush.fillStyle = rng.chance(isTower ? 0.5 : 0.32)
          ? rng.pick(litColors)
          : (isTower ? '#101a2d' : '#b39387');
        brush.fillRect(inset + col * cellW + 1, inset + row * cellH + 1, Math.max(2, cellW - 3), Math.max(2, cellH - 3));
      }
    }
    brush.fillStyle = isTower ? 'rgba(5,9,20,0.48)' : 'rgba(90,62,60,0.22)';
    for (let col = 1; col < columns; col += 1) {
      brush.fillRect(inset + col * cellW - 1, 0, 1.4, height);
    }
  });
}

function signSkin(THREE, headline, footnote, tint) {
  return textureCanvas(THREE, 512, 160, (brush, width, height) => {
    brush.fillStyle = 'rgba(14,11,26,0.94)';
    brush.fillRect(0, 0, width, height);
    brush.strokeStyle = tint;
    brush.lineWidth = 7;
    brush.strokeRect(9, 9, width - 18, height - 18);
    brush.textAlign = 'center';
    brush.fillStyle = tint;
    brush.font = 'bold 52px sans-serif';
    brush.fillText(headline, width / 2, 78);
    brush.fillStyle = '#ffe4c2';
    brush.font = '24px sans-serif';
    brush.fillText(footnote, width / 2, 120);
  });
}

function landingSkin(THREE) {
  return textureCanvas(THREE, 256, 256, (brush, width, height) => {
    brush.fillStyle = '#243041';
    brush.fillRect(0, 0, width, height);
    brush.strokeStyle = '#ffcf83';
    brush.lineWidth = 10;
    brush.beginPath();
    brush.arc(width / 2, height / 2, 92, 0, TAU);
    brush.stroke();
    brush.fillStyle = '#ffdfa6';
    brush.font = 'bold 148px sans-serif';
    brush.textAlign = 'center';
    brush.textBaseline = 'middle';
    brush.fillText('H', width / 2, height / 2 + 8);
  });
}

function frondShape(THREE) {
  const points = [];
  const count = 7;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU;
    const forwardX = Math.cos(angle);
    const forwardZ = Math.sin(angle);
    const acrossX = -forwardZ;
    const acrossZ = forwardX;
    points.push(
      forwardX * 0.2 + acrossX * 0.62, 0.08, forwardZ * 0.2 + acrossZ * 0.62,
      forwardX * 0.2 - acrossX * 0.62, 0.08, forwardZ * 0.2 - acrossZ * 0.62,
      forwardX * 4.2, -0.72, forwardZ * 4.2,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createWorld(THREE, seed = 1337) {
  const skylineRng = makeRng(seed * 31 + 17);
  const cottageRng = makeRng(seed * 37 + 23);
  const groveRng = makeRng(seed * 41 + 29);
  const skinRng = makeRng(seed * 59 + 71);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.dusk);
  scene.fog = new THREE.Fog(COLORS.mist, 480, 1750);

  const scenery = new THREE.Group();
  scenery.name = 'kota-aruna-scenery';
  scene.add(scenery);

  const lanes = [];
  const surfaces = [];
  const dashes = [];
  const edgeGlow = [];
  const blocks = [];
  const towers = [];
  const crowns = [];
  const cottages = [];
  const roofs = [];
  const trunks = [];
  const leaves = [];
  const planks = [];
  const piles = [];
  const stakes = [];
  const bulbs = [];
  const cranes = [];
  const banks = [];
  const spans = [];
  const rails = [];

  GRID.avenues.forEach((x, index) => {
    lanes.push({
      name: STREET_NAMES.northSouth[index % STREET_NAMES.northSouth.length],
      kind: 'street',
      ax: x,
      az: GRID.lanes[0],
      bx: x,
      bz: GRID.lanes[GRID.lanes.length - 1],
      width: GRID.streetWidth,
    });
  });
  GRID.lanes.forEach((z, index) => {
    lanes.push({
      name: STREET_NAMES.eastWest[index % STREET_NAMES.eastWest.length],
      kind: 'street',
      ax: GRID.avenues[0],
      az: z,
      bx: GRID.avenues[GRID.avenues.length - 1],
      bz: z,
      width: GRID.streetWidth,
    });
  });

  const belt = GRID.belt;
  for (let piece = 0; piece < belt.sections; piece += 1) {
    const a = (piece / belt.sections) * TAU;
    const b = ((piece + 1) / belt.sections) * TAU;
    lanes.push({
      name: STREET_NAMES.ring,
      kind: 'belt',
      ax: belt.x + Math.cos(a) * belt.rx,
      az: belt.z + Math.sin(a) * belt.rz,
      bx: belt.x + Math.cos(b) * belt.rx,
      bz: belt.z + Math.sin(b) * belt.rz,
      width: belt.width,
    });
  }
  lanes.push({
    name: STREET_NAMES.jetty,
    kind: 'jetty',
    ax: GRID.jetty.shoreEnd + 20,
    az: GRID.jetty.z,
    bx: GRID.jetty.seaEnd,
    bz: GRID.jetty.z,
    width: GRID.jetty.width,
  });

  function streetGap(x, z) {
    let nearest = Infinity;
    for (const lane of lanes) {
      const gap = segmentGap(x, z, lane) - lane.width / 2;
      if (gap < nearest) nearest = gap;
    }
    return nearest;
  }

  function inSea(x, z) {
    const channel = GRID.canal;
    if (x < GRID.shore - 2) return true;
    return x >= channel.west && x <= channel.east
      && Math.abs(z - channel.z) < channel.half;
  }

  const soil = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 1000),
    new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 }),
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(90, 0, 0);
  scenery.add(soil);

  const beach = new THREE.Mesh(
    new THREE.BoxGeometry(GRID.sandDepth, 0.2, 1000),
    new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 1 }),
  );
  beach.position.set(GRID.shore - GRID.sandDepth / 2 + 12, 0.1, 0);
  scenery.add(beach);

  const cove = new THREE.Mesh(
    new THREE.BoxGeometry(155, 0.18, 380),
    new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 1 }),
  );
  cove.position.set(-262, 0.09, -195);
  scenery.add(cove);

  const tideClock = { value: 0 };
  const seaSkin = new THREE.ShaderMaterial({
    uniforms: {
      uClock: tideClock,
      uDark: { value: new THREE.Color(COLORS.deep) },
      uLight: { value: new THREE.Color(COLORS.shallow) },
      uSun: { value: new THREE.Color(COLORS.sunbeam) },
      uHaze: { value: new THREE.Color(COLORS.mist) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 spot = modelMatrix * vec4(position, 1.0);
        vWorld = spot.xyz;
        gl_Position = projectionMatrix * viewMatrix * spot;
      }
    `,
    fragmentShader: `
      uniform float uClock;
      uniform vec3 uDark;
      uniform vec3 uLight;
      uniform vec3 uSun;
      uniform vec3 uHaze;
      varying vec3 vWorld;
      void main() {
        float swell = sin(vWorld.x * 0.051 + uClock * 0.7) * sin(vWorld.z * 0.074 - uClock * 0.5);
        float chop = 0.5 + 0.5 * sin(vWorld.x * 0.29 + vWorld.z * 0.22 + swell * 2.6 + uClock * 0.43);
        vec3 water = mix(uDark, uLight, 0.35 + 0.22 * swell + 0.08 * chop);
        water += uSun * pow(max(chop, 0.0), 22.0) * 0.5;
        float far = smoothstep(760.0, 1850.0, distance(vWorld.xz, vec2(-430.0, 0.0)));
        water = mix(water, uHaze, far * 0.68);
        gl_FragColor = vec4(pow(water, vec3(1.0 / 2.2)), 1.0);
      }
    `,
  });

  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1200), seaSkin);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-1030, BOUNDS.waterline, 0);
  scenery.add(ocean);

  const channel = GRID.canal;
  const canal = new THREE.Mesh(
    new THREE.PlaneGeometry(channel.east - channel.west, channel.half * 2),
    seaSkin,
  );
  canal.rotation.x = -Math.PI / 2;
  canal.position.set((channel.west + channel.east) / 2, BOUNDS.waterline + 0.006, channel.z);
  scenery.add(canal);

  banks.push({
    x: (channel.west + channel.east) / 2, y: 0.14, z: channel.z + channel.half + 3,
    sx: channel.east - channel.west, sy: 0.45, sz: 5, color: COLORS.concrete,
  });
  banks.push({
    x: (channel.west + channel.east) / 2, y: 0.14, z: channel.z - channel.half - 3,
    sx: channel.east - channel.west, sy: 0.45, sz: 5, color: COLORS.concrete,
  });
  banks.push({
    x: channel.east + 3, y: 0.14, z: channel.z,
    sx: 5, sy: 0.45, sz: channel.half * 2 + 10, color: COLORS.concrete,
  });

  for (const lane of lanes) {
    const dx = lane.bx - lane.ax;
    const dz = lane.bz - lane.az;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) continue;
    const yaw = Math.atan2(-dz, dx);
    const midX = (lane.ax + lane.bx) / 2;
    const midZ = (lane.az + lane.bz) / 2;
    surfaces.push({
      x: midX, y: 0.075, z: midZ, ry: yaw,
      sx: length, sy: 0.12, sz: lane.width,
      color: lane.kind === 'belt' ? COLORS.beltTarmac : COLORS.tarmac,
    });

    const spacing = lane.kind === 'belt' ? 16 : 14;
    for (let travelled = 9; travelled < length - 4; travelled += spacing) {
      const t = travelled / length;
      dashes.push({
        x: lane.ax + dx * t, y: 0.15, z: lane.az + dz * t, ry: yaw,
        sx: Math.min(6.5, spacing * 0.42), sy: 0.03, sz: 0.45, color: COLORS.paint,
      });
    }

    if (lane.kind === 'belt') {
      const inwardX = belt.x - midX;
      const inwardZ = belt.z - midZ;
      const reach = Math.hypot(inwardX, inwardZ) || 1;
      const offset = lane.width / 2 - 1.4;
      edgeGlow.push({
        x: midX + (inwardX / reach) * offset, y: 0.17,
        z: midZ + (inwardZ / reach) * offset, ry: yaw,
        sx: length, sy: 0.09, sz: 0.55,
        color: Math.floor(midX + midZ) % 2 === 0 ? COLORS.neonIce : COLORS.neonRose,
      });
    }

    if (Math.abs(dz) > 0.001) {
      const crossing = (channel.z - lane.az) / dz;
      if (crossing > 0 && crossing < 1) {
        const bridgeX = lane.ax + dx * crossing;
        const deck = Math.min(length, (channel.half * 2 * length) / Math.abs(dz) + 8);
        spans.push({ x: bridgeX, y: 0.03, z: channel.z, ry: yaw, sx: deck, sy: 0.09, sz: lane.width + 4, color: COLORS.concrete });
        const sideX = -dz / length;
        const sideZ = dx / length;
        for (const side of [-1, 1]) {
          rails.push({
            x: bridgeX + sideX * (lane.width / 2 + 1) * side, y: 0.75,
            z: channel.z + sideZ * (lane.width / 2 + 1) * side, ry: yaw,
            sx: deck, sy: 1.2, sz: 0.55, color: '#ded0b4',
          });
        }
      }
    }
  }

  const downtown = DISTRICTS[0];
  let towerAttempts = 0;
  while (towers.length < 108 && towerAttempts < 6000) {
    towerAttempts += 1;
    const width = skylineRng.range(13, 28);
    const depth = skylineRng.range(13, 28);
    const x = skylineRng.range(-15, 460);
    const z = skylineRng.range(-455, 455);
    if (Math.hypot(x - downtown.center.x, z - downtown.center.z) > downtown.reach) continue;
    if (streetGap(x, z) < Math.max(width, depth) * 0.6 + 6) continue;
    if (x < channel.east + 30 && x > channel.west - 20
      && Math.abs(z - channel.z) < channel.half + Math.max(width, depth) * 0.7) continue;
    const jammed = towers.some((tower) => Math.hypot(x - tower.x, z - tower.z)
      < (Math.max(width, depth) + Math.max(tower.sx, tower.sz)) * 0.58);
    if (jammed) continue;

    const core = 1 - Math.min(1, Math.hypot(x - downtown.center.x, z - downtown.center.z) / downtown.reach);
    const height = 26 + core * skylineRng.range(48, 132) + skylineRng.range(0, 30);
    towers.push({
      x, y: 0, z,
      ry: skylineRng.chance(0.75) ? skylineRng.pick([0, Math.PI / 2]) : skylineRng.range(-0.2, 0.2),
      sx: width, sy: height, sz: depth, color: skylineRng.pick(COLORS.offices),
    });
    if (height > 88) {
      crowns.push({
        x, y: height + 0.8, z, ry: 0,
        sx: width + 1.4, sy: 1.4, sz: depth + 1.4,
        color: skylineRng.pick([COLORS.neonIce, COLORS.neonRose, COLORS.lamp]),
      });
    }
    blocks.push({ x, z, halfX: width / 2 + 1.5, halfZ: depth / 2 + 1.5, kind: 'tower' });
  }

  const beachTown = DISTRICTS[1];
  let cottageAttempts = 0;
  while (cottages.length < 82 && cottageAttempts < 6000) {
    cottageAttempts += 1;
    const width = cottageRng.range(14, 30);
    const depth = cottageRng.range(13, 27);
    const x = cottageRng.range(-296, -12);
    const z = cottageRng.range(-445, 445);
    if (Math.hypot(x - beachTown.center.x, z - beachTown.center.z) > beachTown.reach * 1.12) continue;
    if (streetGap(x, z) < Math.max(width, depth) * 0.58 + 5) continue;
    if (x < channel.east + 20 && x > channel.west - 15
      && Math.abs(z - channel.z) < channel.half + Math.max(width, depth) * 0.65) continue;
    const jammed = cottages.some((house) => Math.hypot(x - house.x, z - house.z)
      < (Math.max(width, depth) + Math.max(house.sx, house.sz)) * 0.56);
    if (jammed) continue;

    const height = 4.5 + cottageRng.range(0, 8);
    cottages.push({
      x, y: 0, z,
      ry: cottageRng.chance(0.7) ? 0 : cottageRng.range(-0.2, 0.2),
      sx: width, sy: height, sz: depth, color: cottageRng.pick(COLORS.cottages),
    });
    roofs.push({
      x, y: height + 0.4, z, ry: 0,
      sx: width + 1.5, sy: 0.8, sz: depth + 1.5, color: '#efe2d0',
    });
    blocks.push({ x, z, halfX: width / 2 + 1.2, halfZ: depth / 2 + 1.2, kind: 'house' });
  }

  const palms = [];
  let palmAttempts = 0;
  while (palms.length < 92 && palmAttempts < 7000) {
    palmAttempts += 1;
    const x = groveRng.range(-308, -4);
    const z = groveRng.range(-448, 448);
    if (Math.hypot(x - beachTown.center.x, z - beachTown.center.z) > beachTown.reach * 1.18) continue;
    if (streetGap(x, z) < 5) continue;
    if (x < channel.east + 14 && x > channel.west - 14 && Math.abs(z - channel.z) < channel.half + 7) continue;
    const nearHouse = cottages.some((house) => Math.abs(x - house.x) < house.sx / 2 + 3
      && Math.abs(z - house.z) < house.sz / 2 + 3);
    const nearPalm = palms.some((palm) => Math.hypot(x - palm.x, z - palm.z) < 6);
    if (nearHouse || nearPalm) continue;

    const height = groveRng.range(6, 11);
    const spread = groveRng.range(0.85, 1.3);
    palms.push({ x, z, height, radius: 0.7 });
    trunks.push({ x, y: 0.12, z, ry: groveRng.range(0, TAU), sx: 1, sy: height, sz: 1, color: '#6d4c36' });
    leaves.push({
      x, y: height + 0.12, z, ry: groveRng.range(0, TAU),
      sx: spread, sy: spread, sz: spread, color: groveRng.pick(COLORS.fronds),
    });
  }

  const jetty = GRID.jetty;
  for (let x = jetty.shoreEnd; x >= jetty.seaEnd; x -= 2.4) {
    planks.push({
      x, y: 0.62, z: jetty.z, ry: 0,
      sx: 2.25, sy: 0.3, sz: jetty.width,
      color: Math.floor(x) % 3 === 0 ? '#77513a' : COLORS.wood,
    });
  }
  for (let x = jetty.shoreEnd - 4; x >= jetty.seaEnd; x -= 17) {
    for (const side of [-1, 1]) {
      piles.push({
        x, y: -0.9, z: jetty.z + side * (jetty.width / 2 - 0.7), ry: 0,
        sx: 0.9, sy: 3.2, sz: 0.9, color: '#483224',
      });
    }
  }
  for (const x of [-318, -365, -412]) {
    stakes.push({
      x, y: 2.2, z: jetty.z + jetty.width / 2 - 0.8, ry: 0,
      sx: 0.25, sy: 3.4, sz: 0.25, color: '#2d2a34',
    });
    bulbs.push({
      x, y: 4.1, z: jetty.z + jetty.width / 2 - 0.8, ry: 0,
      sx: 1, sy: 1, sz: 1, color: COLORS.lamp,
    });
  }

  const lighthouse = new THREE.Group();
  lighthouse.name = 'senja-lighthouse';
  lighthouse.position.set(GRID.lighthouse.x, 0, GRID.lighthouse.z);
  const rock = new THREE.MeshStandardMaterial({ color: '#4a414a', roughness: 1 });
  const chalk = new THREE.MeshStandardMaterial({ color: '#f2e7d9', roughness: 0.75 });
  const rust = new THREE.MeshStandardMaterial({ color: '#b64e49', roughness: 0.8 });
  const iron = new THREE.MeshStandardMaterial({ color: '#2b2732', roughness: 0.6, metalness: 0.2 });
  const island = new THREE.Mesh(new THREE.CylinderGeometry(15, 19, 5, 20), rock);
  island.position.y = 2;
  lighthouse.add(island);
  for (let bandIndex = 0; bandIndex < 4; bandIndex += 1) {
    const low = 4.5 + (bandIndex / 4) * 31;
    const high = 4.5 + ((bandIndex + 1) / 4) * 31;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2 - ((bandIndex + 1) / 4) * 2.1, 6.2 - (bandIndex / 4) * 2.1, high - low, 18),
      bandIndex % 2 === 0 ? chalk : rust,
    );
    stripe.position.y = (low + high) / 2;
    lighthouse.add(stripe);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.3, 16), iron);
  gallery.position.y = 36;
  lighthouse.add(gallery);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 18, 12),
    new THREE.MeshBasicMaterial({ color: COLORS.sunbeam, toneMapped: false }),
  );
  lantern.position.y = 36.6;
  lighthouse.add(lantern);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 16, 12),
    new THREE.MeshBasicMaterial({
      color: COLORS.lamp, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  halo.position.y = 36.6;
  lighthouse.add(halo);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 4.4, 3.4, 16), iron);
  lid.position.y = 39.6;
  lighthouse.add(lid);
  const sweepShape = new THREE.BoxGeometry(1.2, 1.2, 52);
  sweepShape.translate(0, 0, 26);
  const sweep = new THREE.Mesh(
    sweepShape,
    new THREE.MeshBasicMaterial({
      color: COLORS.sunbeam, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  sweep.position.y = 36.6;
  lighthouse.add(sweep);
  const lighthouseGlow = new THREE.PointLight(COLORS.lamp, 1.6, 240, 2);
  lighthouseGlow.position.y = 36.6;
  lighthouse.add(lighthouseGlow);
  scenery.add(lighthouse);
  blocks.push({ x: GRID.lighthouse.x, z: GRID.lighthouse.z, halfX: 11, halfZ: 11, kind: 'lighthouse' });

  for (const spot of [
    { x: 405, z: -120, ry: 0.2 },
    { x: 425, z: 120, ry: -0.4 },
    { x: 355, z: 330, ry: 0.7 },
  ]) {
    cranes.push({ ...spot, y: 24, sx: 46, sy: 2.2, sz: 2.2, color: '#d9a15e' });
    cranes.push({ x: spot.x - 16, y: 12, z: spot.z, sx: 2.2, sy: 24, sz: 2.2, color: '#6d625a' });
    cranes.push({ x: spot.x - 16, y: 23, z: spot.z, sx: 0.7, sy: 22, sz: 0.7, color: '#8c7c68' });
    blocks.push({ x: spot.x - 16, z: spot.z, halfX: 3, halfZ: 3, kind: 'crane' });
  }

  const landing = GRID.landing;
  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(landing.radius, landing.radius + 2, 2.2, 32),
    new THREE.MeshStandardMaterial({ color: '#3a3d50', roughness: 0.85 }),
  );
  podium.position.set(landing.x, 1.1, landing.z);
  scenery.add(podium);
  const roundel = new THREE.Mesh(
    new THREE.PlaneGeometry(landing.radius * 1.75, landing.radius * 1.75),
    new THREE.MeshBasicMaterial({ map: landingSkin(THREE) }),
  );
  roundel.rotation.x = -Math.PI / 2;
  roundel.position.set(landing.x, 2.24, landing.z);
  scenery.add(roundel);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU;
    bulbs.push({
      x: landing.x + Math.cos(angle) * (landing.radius - 1), y: 2.5,
      z: landing.z + Math.sin(angle) * (landing.radius - 1), ry: 0,
      sx: 0.55, sy: 0.55, sz: 0.55,
      color: index % 2 === 0 ? COLORS.lamp : COLORS.neonIce,
    });
  }

  for (const sign of [
    { x: 150, z: -338, title: 'TELUK ARUNA', note: 'HARBOR DOWNTOWN', tint: COLORS.neonIce },
    { x: -180, z: -338, title: 'MARINA SENJA', note: 'SUNSET BEACH', tint: COLORS.neonRose },
  ]) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(62, 19),
      new THREE.MeshBasicMaterial({ map: signSkin(THREE, sign.title, sign.note, sign.tint) }),
    );
    board.position.set(sign.x, 20, sign.z);
    board.rotation.y = 0.1;
    scenery.add(board);
    for (const offset of [-24, 24]) {
      cranes.push({
        x: sign.x + offset, y: 10, z: sign.z, ry: 0,
        sx: 1.6, sy: 20, sz: 1.6, color: '#4b4657',
      });
    }
  }

  const sunward = new THREE.Vector3(-0.84, 0.18, -0.32).normalize();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 18),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(COLORS.zenith) },
        uLow: { value: new THREE.Color(COLORS.dusk) },
        uSun: { value: new THREE.Color(COLORS.sunbeam) },
        uRay: { value: sunward },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uLow;
        uniform vec3 uSun;
        uniform vec3 uRay;
        varying vec3 vDir;
        void main() {
          vec3 ray = normalize(vDir);
          float climb = smoothstep(-0.09, 0.58, ray.y);
          vec3 sky = mix(uLow, uTop, climb);
          float glow = max(dot(ray, uRay), 0.0);
          sky += uSun * pow(glow, 8.0) * 0.24;
          sky += uSun * pow(glow, 140.0) * 1.15;
          gl_FragColor = vec4(pow(sky, vec3(1.0 / 2.2)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  dome.frustumCulled = false;
  scene.add(dome);

  const sunSpot = sunward.clone().multiplyScalar(1550);
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(56, 24, 16),
    new THREE.MeshBasicMaterial({ color: COLORS.sunbeam, toneMapped: false, fog: false }),
  );
  sunDisc.position.copy(sunSpot);
  sunDisc.frustumCulled = false;
  scene.add(sunDisc);
  const sunAura = new THREE.Mesh(
    new THREE.SphereGeometry(125, 20, 14),
    new THREE.MeshBasicMaterial({
      color: COLORS.lamp, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
    }),
  );
  sunAura.position.copy(sunSpot);
  sunAura.frustumCulled = false;
  scene.add(sunAura);

  const sunset = new THREE.DirectionalLight(COLORS.sunbeam, 2.35);
  sunset.position.copy(sunward.clone().multiplyScalar(650));
  sunset.target.position.set(70, 0, 0);
  scene.add(sunset);
  scene.add(sunset.target);
  scene.add(new THREE.HemisphereLight(COLORS.zenith, COLORS.ground, 1.25));
  scene.add(new THREE.AmbientLight(COLORS.dusk, 0.2));

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const raisedBox = new THREE.BoxGeometry(1, 1, 1);
  raisedBox.translate(0, 0.5, 0);
  const trunkShape = new THREE.CylinderGeometry(0.3, 0.52, 1, 5);
  trunkShape.translate(0, 0.5, 0);

  function stamp(geometry, material, items, name) {
    if (items.length === 0) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    mesh.name = name;
    const matrix = new THREE.Matrix4();
    const place = new THREE.Vector3();
    const spin = new THREE.Quaternion();
    const tilt = new THREE.Euler();
    const size = new THREE.Vector3();
    const tint = new THREE.Color();
    items.forEach((item, index) => {
      place.set(item.x || 0, item.y || 0, item.z || 0);
      tilt.set(item.rx || 0, item.ry || 0, item.rz || 0);
      spin.setFromEuler(tilt);
      size.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
      matrix.compose(place, spin, size);
      mesh.setMatrixAt(index, matrix);
      if (item.color !== undefined) mesh.setColorAt(index, tint.set(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scenery.add(mesh);
    return mesh;
  }

  const masonry = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0.04 });
  const shining = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  stamp(unitBox, masonry, surfaces, 'asphalt');
  stamp(unitBox, shining, dashes, 'road-marks');
  stamp(unitBox, shining, edgeGlow, 'belt-neon');
  stamp(unitBox, masonry, banks, 'canal-walls');
  stamp(unitBox, masonry, spans, 'bridge-decks');
  stamp(unitBox, masonry, rails, 'bridge-guards');

  const officeSkin = windowSkin(THREE, skinRng, true);
  stamp(raisedBox, new THREE.MeshStandardMaterial({
    map: officeSkin, emissive: new THREE.Color('#ffd5a4'),
    emissiveMap: officeSkin, emissiveIntensity: 0.75,
    roughness: 0.6, metalness: 0.15,
  }), towers, 'harbor-towers');
  stamp(unitBox, shining, crowns, 'tower-crowns');

  const cottageSkin = windowSkin(THREE, skinRng, false);
  stamp(raisedBox, new THREE.MeshStandardMaterial({
    map: cottageSkin, emissive: new THREE.Color('#553b40'),
    emissiveMap: cottageSkin, emissiveIntensity: 0.15, roughness: 0.88,
  }), cottages, 'beach-cottages');
  stamp(unitBox, masonry, roofs, 'cottage-roofs');

  stamp(trunkShape, masonry, trunks, 'palm-trunks');
  stamp(frondShape(THREE), new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide,
  }), leaves, 'palm-fronds');

  stamp(unitBox, masonry, planks, 'jetty-planks');
  stamp(unitBox, masonry, piles, 'jetty-posts');
  stamp(unitBox, masonry, stakes, 'lamp-posts');
  stamp(new THREE.SphereGeometry(0.45, 10, 8), shining, bulbs, 'lamp-bulbs');
  stamp(unitBox, masonry, cranes, 'harbor-cranes');

  function zoneAt(x, z) {
    let closest = DISTRICTS[0];
    let smallest = Infinity;
    for (const zone of DISTRICTS) {
      const gap = Math.hypot(x - zone.center.x, z - zone.center.z);
      if (gap <= zone.reach) return zone.key;
      if (gap < smallest) {
        smallest = gap;
        closest = zone;
      }
    }
    return closest.key;
  }

  function animate(seconds) {
    tideClock.value = seconds;
    sweep.rotation.y = seconds * 0.58;
    lighthouseGlow.intensity = 1.4 + Math.sin(seconds * 2.1) * 0.24;
    halo.scale.setScalar(1 + Math.sin(seconds * 2.1) * 0.06);
  }

  return {
    scene,
    scenery,
    lanes,
    palms,
    blocks,
    posts: SPAWNS.map((post) => ({ ...post })),
    zoneAt,
    onRoad(x, z) {
      return streetGap(x, z) <= 0;
    },
    overSea: inSea,
    animate,
    limit: BOUNDS.patrolLimit,
  };
}
