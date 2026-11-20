import {
  DISTRICTS,
  LIMITS,
  PALETTE,
  STREET_GRID,
  STREET_NAMES,
} from './config.js';
import { createGenerator } from './random.js';

const FULL_TURN = Math.PI * 2;

function pointToSegment(x, z, road) {
  const dx = road.bx - road.ax;
  const dz = road.bz - road.az;
  const squared = dx * dx + dz * dz;
  const t = squared > 0
    ? Math.max(0, Math.min(1, ((x - road.ax) * dx + (z - road.az) * dz) / squared))
    : 0;
  return Math.hypot(x - road.ax - dx * t, z - road.az - dz * t);
}

function paintedCanvas(THREE, width, height, paint) {
  const sheet = document.createElement('canvas');
  sheet.width = width;
  sheet.height = height;
  paint(sheet.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(sheet);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function towerSkin(THREE, rng) {
  return paintedCanvas(THREE, 128, 256, (brush, width, height) => {
    const wash = brush.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, '#2c3c5f');
    wash.addColorStop(1, '#0c1528');
    brush.fillStyle = wash;
    brush.fillRect(0, 0, width, height);
    const cols = 7;
    const rows = 22;
    const cellW = width / cols;
    const cellH = height / rows;
    const lit = ['#ffe2a8', '#fff0d0', '#a7eaff', '#ffadd0'];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        brush.fillStyle = rng.odds(0.52) ? rng.choose(lit) : '#10192b';
        brush.fillRect(col * cellW + 2, row * cellH + 2, cellW - 4, cellH - 4);
      }
    }
    brush.fillStyle = 'rgba(6,10,22,0.42)';
    for (let col = 1; col < cols; col += 1) {
      brush.fillRect(col * cellW - 1, 0, 1.2, height);
    }
  });
}

function cottageSkin(THREE, rng) {
  return paintedCanvas(THREE, 96, 96, (brush, width, height) => {
    brush.fillStyle = '#f6e2cb';
    brush.fillRect(0, 0, width, height);
    brush.fillStyle = '#ad8c86';
    brush.fillRect(0, height - 12, width, 12);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        brush.fillStyle = rng.odds(0.48) ? rng.choose(['#ffe4ae', '#caeff0', '#fff5db']) : '#9e837e';
        brush.fillRect(12 + col * 29, 14 + row * 23, 17, 15);
      }
    }
  });
}

function signSkin(THREE, headline, subline, accent) {
  return paintedCanvas(THREE, 512, 160, (brush, width, height) => {
    brush.fillStyle = 'rgba(13,10,24,0.94)';
    brush.fillRect(0, 0, width, height);
    brush.strokeStyle = accent;
    brush.lineWidth = 8;
    brush.strokeRect(8, 8, width - 16, height - 16);
    brush.textAlign = 'center';
    brush.fillStyle = accent;
    brush.font = 'bold 50px sans-serif';
    brush.fillText(headline, width / 2, 76);
    brush.fillStyle = '#ffe7c8';
    brush.font = '23px sans-serif';
    brush.fillText(subline, width / 2, 118);
  });
}

function helipadSkin(THREE) {
  return paintedCanvas(THREE, 256, 256, (brush, width, height) => {
    brush.fillStyle = '#293241';
    brush.fillRect(0, 0, width, height);
    brush.strokeStyle = '#ffd08a';
    brush.lineWidth = 11;
    brush.beginPath();
    brush.arc(128, 128, 94, 0, FULL_TURN);
    brush.stroke();
    brush.fillStyle = '#ffe5b2';
    brush.font = 'bold 150px sans-serif';
    brush.textAlign = 'center';
    brush.textBaseline = 'middle';
    brush.fillText('H', 128, 136);
  });
}

function palmLeaves(THREE) {
  const points = [];
  const arms = 7;
  const triangle = (a, b, c) => points.push(...a, ...b, ...c);
  for (let arm = 0; arm < arms; arm += 1) {
    const angle = (arm / arms) * FULL_TURN;
    const alongX = Math.cos(angle);
    const alongZ = Math.sin(angle);
    const acrossX = -alongZ;
    const acrossZ = alongX;
    const root = [0, 0.25, 0];
    const left = [alongX * 1.3 + acrossX * 0.85, 0.05, alongZ * 1.3 + acrossZ * 0.85];
    const right = [alongX * 1.3 - acrossX * 0.85, 0.05, alongZ * 1.3 - acrossZ * 0.85];
    const tip = [alongX * 5.1, -0.85, alongZ * 5.1];
    triangle(root, left, tip);
    triangle(root, tip, right);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildCity(THREE, seed = 1337) {
  const towerRandom = createGenerator(seed * 29 + 7);
  const houseRandom = createGenerator(seed * 31 + 13);
  const treeRandom = createGenerator(seed * 37 + 19);
  const skinRandom = createGenerator(seed * 43 + 31);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.lowSky);
  scene.fog = new THREE.Fog(PALETTE.haze, 520, 1850);
  const props = new THREE.Group();
  props.name = 'kota-aruna-scenery';
  scene.add(props);

  const roads = [];
  const obstacles = [];
  const asphalt = [];
  const roadLines = [];
  const neonStrips = [];
  const bridgeDecks = [];
  const bridgeRails = [];
  const riverWalls = [];
  const towers = [];
  const towerCaps = [];
  const houses = [];
  const houseRoofs = [];
  const palmTrunks = [];
  const palmCrowns = [];
  const pierBoards = [];
  const pierPosts = [];
  const lampPoles = [];
  const lampGlobes = [];
  const craneBeams = [];

  STREET_GRID.northSouth.forEach((x, i) => {
    roads.push({
      name: STREET_NAMES.vertical[i % STREET_NAMES.vertical.length],
      kind: 'street',
      ax: x, az: STREET_GRID.eastWest[0],
      bx: x, bz: STREET_GRID.eastWest[STREET_GRID.eastWest.length - 1],
      width: STREET_GRID.width,
    });
  });
  STREET_GRID.eastWest.forEach((z, i) => {
    roads.push({
      name: STREET_NAMES.horizontal[i % STREET_NAMES.horizontal.length],
      kind: 'street',
      ax: STREET_GRID.northSouth[0], az: z,
      bx: STREET_GRID.northSouth[STREET_GRID.northSouth.length - 1], bz: z,
      width: STREET_GRID.width,
    });
  });

  const belt = STREET_GRID.belt;
  for (let piece = 0; piece < belt.pieces; piece += 1) {
    const start = (piece / belt.pieces) * FULL_TURN;
    const end = ((piece + 1) / belt.pieces) * FULL_TURN;
    roads.push({
      name: STREET_NAMES.orbital,
      kind: 'ring',
      ax: belt.cx + Math.cos(start) * belt.rx,
      az: belt.cz + Math.sin(start) * belt.rz,
      bx: belt.cx + Math.cos(end) * belt.rx,
      bz: belt.cz + Math.sin(end) * belt.rz,
      width: belt.width,
    });
  }
  roads.push({
    name: STREET_NAMES.boardwalk,
    kind: 'pier',
    ax: STREET_GRID.pier.shore + 20, az: STREET_GRID.pier.z,
    bx: STREET_GRID.pier.tip, bz: STREET_GRID.pier.z,
    width: STREET_GRID.pier.width,
  });

  function roadClearance(x, z) {
    let closest = Infinity;
    for (const road of roads) {
      closest = Math.min(closest, pointToSegment(x, z, road) - road.width / 2);
    }
    return closest;
  }

  function inWater(x, z) {
    const channel = STREET_GRID.channel;
    if (x < STREET_GRID.shoreline - 2) return true;
    return x >= channel.west && x <= channel.east && Math.abs(z - channel.z) < channel.half;
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(820, 1020),
    new THREE.MeshStandardMaterial({ color: PALETTE.soil, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(90, 0, 0);
  props.add(ground);

  const beach = new THREE.Mesh(
    new THREE.BoxGeometry(STREET_GRID.sandWidth, 0.22, 1020),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  beach.position.set(STREET_GRID.shoreline - STREET_GRID.sandWidth / 2 + 12, 0.08, 0);
  props.add(beach);

  const inlet = new THREE.Mesh(
    new THREE.BoxGeometry(165, 0.18, 410),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  inlet.position.set(-262, 0.07, -190);
  props.add(inlet);

  const clockUniform = { value: 0 };
  const waterSkin = new THREE.ShaderMaterial({
    uniforms: {
      uClock: clockUniform,
      uDeep: { value: new THREE.Color(PALETTE.oceanDark) },
      uShallow: { value: new THREE.Color(PALETTE.oceanLight) },
      uSpark: { value: new THREE.Color(PALETTE.sun) },
    },
    vertexShader: `
      varying vec3 vPoint;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPoint = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uClock;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSpark;
      varying vec3 vPoint;
      void main() {
        float swell = sin(vPoint.x * 0.043 - uClock * 0.9) * cos(vPoint.z * 0.061 + uClock * 0.6);
        float ripple = sin(vPoint.x * 0.24 + vPoint.z * 0.17 + swell * 3.1 + uClock * 0.5);
        vec3 hue = mix(uDeep, uShallow, 0.38 + 0.2 * swell + 0.09 * ripple);
        hue += uSpark * pow(max(ripple, 0.0), 26.0) * 0.6;
        gl_FragColor = vec4(pow(hue, vec3(1.0 / 2.2)), 1.0);
      }
    `,
  });

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1300), waterSkin);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-1060, LIMITS.seaLevel, 0);
  props.add(sea);

  const channel = STREET_GRID.channel;
  const waterway = new THREE.Mesh(
    new THREE.PlaneGeometry(channel.east - channel.west, channel.half * 2),
    waterSkin,
  );
  waterway.rotation.x = -Math.PI / 2;
  waterway.position.set((channel.west + channel.east) / 2, LIMITS.seaLevel + 0.008, channel.z);
  props.add(waterway);

  const middleChannel = (channel.west + channel.east) / 2;
  riverWalls.push({ x: middleChannel, y: 0.16, z: channel.z + channel.half + 3, sx: channel.east - channel.west, sy: 0.46, sz: 5.5, color: PALETTE.concrete });
  riverWalls.push({ x: middleChannel, y: 0.16, z: channel.z - channel.half - 3, sx: channel.east - channel.west, sy: 0.46, sz: 5.5, color: PALETTE.concrete });
  riverWalls.push({ x: channel.east + 3, y: 0.16, z: channel.z, sx: 5.5, sy: 0.46, sz: channel.half * 2 + 10, color: PALETTE.concrete });

  for (const road of roads) {
    const dx = road.bx - road.ax;
    const dz = road.bz - road.az;
    const span = Math.hypot(dx, dz);
    if (span < 0.01) continue;
    const angle = -Math.atan2(dz, dx);
    const midX = (road.ax + road.bx) / 2;
    const midZ = (road.az + road.bz) / 2;
    asphalt.push({
      x: midX, y: 0.075, z: midZ, ry: angle,
      sx: span, sy: 0.12, sz: road.width,
      color: road.kind === 'ring' ? PALETTE.ringAsphalt : PALETTE.asphalt,
    });

    const gapSize = road.kind === 'ring' ? 17 : 14;
    for (let travelled = 9; travelled < span - 4; travelled += gapSize) {
      const at = travelled / span;
      roadLines.push({
        x: road.ax + dx * at, y: 0.146, z: road.az + dz * at, ry: angle,
        sx: Math.min(6.5, gapSize * 0.42), sy: 0.03, sz: 0.5, color: PALETTE.roadPaint,
      });
    }

    if (road.kind === 'ring') {
      const towardX = belt.cx - midX;
      const towardZ = belt.cz - midZ;
      const norm = Math.hypot(towardX, towardZ) || 1;
      const inset = road.width / 2 - 1.5;
      neonStrips.push({
        x: midX + (towardX / norm) * inset, y: 0.17,
        z: midZ + (towardZ / norm) * inset, ry: angle,
        sx: span, sy: 0.08, sz: 0.6,
        color: (pieceTint(midX, midZ) ? PALETTE.coolCyan : PALETTE.hotPink),
      });
    }

    if (Math.abs(dz) > 0.001) {
      const fraction = (channel.z - road.az) / dz;
      if (fraction > 0 && fraction < 1 && road.kind !== 'pier') {
        const bridgeX = road.ax + dx * fraction;
        const deckLength = Math.min(span, (channel.half * 2 * span) / Math.abs(dz) + 9);
        bridgeDecks.push({
          x: bridgeX, y: 0.02, z: channel.z, ry: angle,
          sx: deckLength, sy: 0.1, sz: road.width + 5, color: PALETTE.concrete,
        });
        const sideX = -dz / span;
        const sideZ = dx / span;
        for (const side of [-1, 1]) {
          bridgeRails.push({
            x: bridgeX + sideX * (road.width / 2 + 1.2) * side,
            y: 0.78,
            z: channel.z + sideZ * (road.width / 2 + 1.2) * side,
            ry: angle, sx: deckLength, sy: 1.3, sz: 0.6, color: '#ded1b6',
          });
        }
      }
    }
  }

  function pieceTint(x, z) {
    return Math.floor(x + z) % 2 === 0;
  }

  const downtown = DISTRICTS[0];
  for (let tries = 0; towers.length < 112 && tries < 7000; tries += 1) {
    const width = towerRandom.between(13, 29);
    const depth = towerRandom.between(13, 29);
    const x = towerRandom.between(-15, 458);
    const z = towerRandom.between(-455, 455);
    if (Math.hypot(x - downtown.center.x, z - downtown.center.z) > downtown.radius) continue;
    if (roadClearance(x, z) < Math.max(width, depth) * 0.6 + 7) continue;
    if (x < channel.east + 32 && x > channel.west - 20
      && Math.abs(z - channel.z) < channel.half + Math.max(width, depth) * 0.7) continue;
    const crowded = towers.some((tower) => Math.hypot(x - tower.x, z - tower.z)
      < (Math.max(width, depth) + Math.max(tower.sx, tower.sz)) * 0.57);
    if (crowded) continue;

    const core = 1 - Math.min(1, Math.hypot(x - downtown.center.x, z - downtown.center.z) / downtown.radius);
    const height = 25 + core * towerRandom.between(50, 136) + towerRandom.between(0, 26);
    towers.push({
      x, y: 0, z,
      ry: towerRandom.odds(0.72) ? towerRandom.choose([0, Math.PI / 2]) : towerRandom.between(-0.2, 0.2),
      sx: width, sy: height, sz: depth, color: towerRandom.choose(PALETTE.officePaints),
    });
    if (height > 90) {
      towerCaps.push({
        x, y: height + 0.9, z, ry: 0,
        sx: width + 1.6, sy: 1.5, sz: depth + 1.6,
        color: towerRandom.choose([PALETTE.coolCyan, PALETTE.hotPink, PALETTE.lantern]),
      });
    }
    obstacles.push({ x, z, halfX: width / 2 + 1.5, halfZ: depth / 2 + 1.5 });
  }

  const beachTown = DISTRICTS[1];
  for (let tries = 0; houses.length < 84 && tries < 7000; tries += 1) {
    const width = houseRandom.between(14, 30);
    const depth = houseRandom.between(13, 28);
    const x = houseRandom.between(-296, -12);
    const z = houseRandom.between(-445, 445);
    if (Math.hypot(x - beachTown.center.x, z - beachTown.center.z) > beachTown.radius * 1.12) continue;
    if (roadClearance(x, z) < Math.max(width, depth) * 0.58 + 5) continue;
    if (x < channel.east + 20 && x > channel.west - 15
      && Math.abs(z - channel.z) < channel.half + Math.max(width, depth) * 0.65) continue;
    const crowded = houses.some((house) => Math.hypot(x - house.x, z - house.z)
      < (Math.max(width, depth) + Math.max(house.sx, house.sz)) * 0.56);
    if (crowded) continue;

    const height = houseRandom.between(4.5, 12);
    houses.push({
      x, y: 0, z,
      ry: houseRandom.odds(0.7) ? 0 : houseRandom.between(-0.2, 0.2),
      sx: width, sy: height, sz: depth, color: houseRandom.choose(PALETTE.cottagePaints),
    });
    houseRoofs.push({
      x, y: height + 0.42, z, ry: 0,
      sx: width + 1.6, sy: 0.85, sz: depth + 1.6, color: '#f0e3d2',
    });
    obstacles.push({ x, z, halfX: width / 2 + 1.2, halfZ: depth / 2 + 1.2 });
  }

  for (let tries = 0; palmTrunks.length < 96 && tries < 8000; tries += 1) {
    const x = treeRandom.between(-308, -4);
    const z = treeRandom.between(-448, 448);
    if (Math.hypot(x - beachTown.center.x, z - beachTown.center.z) > beachTown.radius * 1.18) continue;
    if (roadClearance(x, z) < 5) continue;
    if (x < channel.east + 14 && x > channel.west - 14 && Math.abs(z - channel.z) < channel.half + 7) continue;
    const nearHouse = houses.some((house) => Math.abs(x - house.x) < house.sx / 2 + 3
      && Math.abs(z - house.z) < house.sz / 2 + 3);
    const nearPalm = palmTrunks.some((trunk) => Math.hypot(x - trunk.x, z - trunk.z) < 6);
    if (nearHouse || nearPalm) continue;

    const height = treeRandom.between(6, 11);
    const crownSize = treeRandom.between(0.85, 1.35);
    palmTrunks.push({
      x, y: 0.12, z, ry: treeRandom.between(0, FULL_TURN),
      sx: 1, sy: height, sz: 1, color: '#71503a',
    });
    palmCrowns.push({
      x, y: height + 0.12, z, ry: treeRandom.between(0, FULL_TURN),
      sx: crownSize, sy: crownSize, sz: crownSize,
      color: treeRandom.choose(PALETTE.leafPaints),
    });
  }

  const pier = STREET_GRID.pier;
  for (let x = pier.shore; x >= pier.tip; x -= 2.4) {
    pierBoards.push({
      x, y: 0.62, z: pier.z, ry: 0,
      sx: 2.25, sy: 0.3, sz: pier.width,
      color: Math.floor(x) % 3 === 0 ? '#80563c' : PALETTE.pierWood,
    });
  }
  for (let x = pier.shore - 4; x >= pier.tip; x -= 17) {
    for (const side of [-1, 1]) {
      pierPosts.push({
        x, y: -0.9, z: pier.z + side * (pier.width / 2 - 0.7), ry: 0,
        sx: 0.9, sy: 3.2, sz: 0.9, color: '#4a3426',
      });
    }
  }
  for (const x of [-318, -365, -412]) {
    lampPoles.push({ x, y: 2.2, z: pier.z + pier.width / 2 - 0.8, ry: 0, sx: 0.26, sy: 3.4, sz: 0.26, color: '#302b36' });
    lampGlobes.push({ x, y: 4.1, z: pier.z + pier.width / 2 - 0.8, ry: 0, sx: 1, sy: 1, sz: 1, color: PALETTE.lantern });
  }

  const beacon = new THREE.Group();
  beacon.name = 'marina-senja-beacon';
  beacon.position.set(STREET_GRID.beacon.x, 0, STREET_GRID.beacon.z);
  const rock = new THREE.MeshStandardMaterial({ color: '#4d434c', roughness: 1 });
  const chalk = new THREE.MeshStandardMaterial({ color: '#f4e9db', roughness: 0.75 });
  const rust = new THREE.MeshStandardMaterial({ color: '#ba504c', roughness: 0.8 });
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
  const lanternLight = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 18, 12),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, toneMapped: false }),
  );
  lanternLight.position.y = 36.8;
  beacon.add(lanternLight);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(5.8, 16, 12),
    new THREE.MeshBasicMaterial({
      color: PALETTE.lantern, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  glow.position.y = 36.8;
  beacon.add(glow);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 4.5, 3.4, 16), iron);
  lid.position.y = 39.9;
  beacon.add(lid);
  const sweepShape = new THREE.BoxGeometry(1.3, 1.3, 54);
  sweepShape.translate(0, 0, 27);
  const sweep = new THREE.Mesh(
    sweepShape,
    new THREE.MeshBasicMaterial({
      color: PALETTE.sun, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  sweep.position.y = 36.8;
  beacon.add(sweep);
  const beaconLamp = new THREE.PointLight(PALETTE.lantern, 1.6, 250, 2);
  beaconLamp.position.y = 36.8;
  beacon.add(beaconLamp);
  props.add(beacon);
  obstacles.push({ x: STREET_GRID.beacon.x, z: STREET_GRID.beacon.z, halfX: 11, halfZ: 11 });

  for (const crane of [
    { x: 405, z: -120, tilt: 0.2 },
    { x: 425, z: 120, tilt: -0.4 },
    { x: 355, z: 330, tilt: 0.7 },
  ]) {
    craneBeams.push({ x: crane.x, y: 24, z: crane.z, ry: crane.tilt, sx: 46, sy: 2.3, sz: 2.3, color: '#dca463' });
    craneBeams.push({ x: crane.x - 16, y: 12, z: crane.z, ry: 0, sx: 2.3, sy: 24, sz: 2.3, color: '#70655c' });
    craneBeams.push({ x: crane.x - 16, y: 23, z: crane.z, ry: 0, sx: 0.8, sy: 22, sz: 0.8, color: '#90806d' });
    obstacles.push({ x: crane.x - 16, z: crane.z, halfX: 3, halfZ: 3 });
  }

  const pad = STREET_GRID.helipad;
  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(pad.radius, pad.radius + 2, 2.2, 32),
    new THREE.MeshStandardMaterial({ color: '#3b3f52', roughness: 0.85 }),
  );
  podium.position.set(pad.x, 1.1, pad.z);
  props.add(podium);
  const padMark = new THREE.Mesh(
    new THREE.PlaneGeometry(pad.radius * 1.75, pad.radius * 1.75),
    new THREE.MeshBasicMaterial({ map: helipadSkin(THREE) }),
  );
  padMark.rotation.x = -Math.PI / 2;
  padMark.position.set(pad.x, 2.24, pad.z);
  props.add(padMark);
  for (let bulb = 0; bulb < 12; bulb += 1) {
    const angle = (bulb / 12) * FULL_TURN;
    lampGlobes.push({
      x: pad.x + Math.cos(angle) * (pad.radius - 1), y: 2.55,
      z: pad.z + Math.sin(angle) * (pad.radius - 1), ry: 0,
      sx: 0.6, sy: 0.6, sz: 0.6,
      color: bulb % 2 === 0 ? PALETTE.lantern : PALETTE.coolCyan,
    });
  }

  for (const sign of [
    { x: 150, z: -338, headline: DISTRICTS[0].name, sub: DISTRICTS[0].caption, tint: PALETTE.coolCyan },
    { x: -180, z: -338, headline: DISTRICTS[1].name, sub: DISTRICTS[1].caption, tint: PALETTE.hotPink },
  ]) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(62, 19),
      new THREE.MeshBasicMaterial({ map: signSkin(THREE, sign.headline, sign.sub, sign.tint) }),
    );
    board.position.set(sign.x, 20, sign.z);
    board.rotation.y = 0.1;
    props.add(board);
    for (const offset of [-24, 24]) {
      craneBeams.push({ x: sign.x + offset, y: 10, z: sign.z, ry: 0, sx: 1.7, sy: 20, sz: 1.7, color: '#4d4859' });
    }
  }

  const sunDirection = new THREE.Vector3(-0.84, 0.18, -0.32).normalize();
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 18),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(PALETTE.highSky) },
        uBottom: { value: new THREE.Color(PALETTE.lowSky) },
        uSunColor: { value: new THREE.Color(PALETTE.sun) },
        uSunDirection: { value: sunDirection },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform vec3 uSunColor;
        uniform vec3 uSunDirection;
        varying vec3 vDirection;
        void main() {
          vec3 ray = normalize(vDirection);
          float altitude = smoothstep(-0.08, 0.58, ray.y);
          vec3 color = mix(uBottom, uTop, altitude);
          float facing = max(dot(ray, uSunDirection), 0.0);
          color += uSunColor * pow(facing, 9.0) * 0.22;
          color += uSunColor * pow(facing, 150.0) * 1.2;
          gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  const sunPosition = sunDirection.clone().multiplyScalar(1550);
  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(56, 24, 16),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, toneMapped: false, fog: false }),
  );
  sunBall.position.copy(sunPosition);
  sunBall.frustumCulled = false;
  scene.add(sunBall);
  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(126, 20, 14),
    new THREE.MeshBasicMaterial({
      color: PALETTE.lantern, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
    }),
  );
  sunHalo.position.copy(sunPosition);
  sunHalo.frustumCulled = false;
  scene.add(sunHalo);

  const sunlight = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sunlight.position.copy(sunDirection.clone().multiplyScalar(650));
  sunlight.target.position.set(70, 0, 0);
  scene.add(sunlight, sunlight.target);
  scene.add(new THREE.HemisphereLight(PALETTE.highSky, PALETTE.soil, 1.3));
  scene.add(new THREE.AmbientLight(PALETTE.lowSky, 0.2));

  const box = new THREE.BoxGeometry(1, 1, 1);
  const raised = new THREE.BoxGeometry(1, 1, 1);
  raised.translate(0, 0.5, 0);
  const trunkShape = new THREE.CylinderGeometry(0.3, 0.52, 1, 5);
  trunkShape.translate(0, 0.5, 0);

  function stamp(geometry, material, entries, name) {
    if (entries.length === 0) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    mesh.name = name;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const angles = new THREE.Euler();
    const scale = new THREE.Vector3();
    const tint = new THREE.Color();
    entries.forEach((entry, index) => {
      position.set(entry.x ?? 0, entry.y ?? 0, entry.z ?? 0);
      angles.set(entry.rx ?? 0, entry.ry ?? 0, entry.rz ?? 0);
      rotation.setFromEuler(angles);
      scale.set(entry.sx ?? 1, entry.sy ?? 1, entry.sz ?? 1);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      if (entry.color !== undefined) mesh.setColorAt(index, tint.set(entry.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    props.add(mesh);
    return mesh;
  }

  const matte = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0.04 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  stamp(box, matte, asphalt, 'street-surface');
  stamp(box, glowMaterial, roadLines, 'street-paint');
  stamp(box, glowMaterial, neonStrips, 'orbital-neon');
  stamp(box, matte, riverWalls, 'canal-retaining-walls');
  stamp(box, matte, bridgeDecks, 'canal-bridges');
  stamp(box, matte, bridgeRails, 'bridge-rails');

  const officeTexture = towerSkin(THREE, skinRandom);
  stamp(raised, new THREE.MeshStandardMaterial({
    map: officeTexture, emissive: new THREE.Color('#ffd6a5'),
    emissiveMap: officeTexture, emissiveIntensity: 0.8,
    roughness: 0.6, metalness: 0.14,
  }), towers, 'harbor-skyline');
  stamp(box, glowMaterial, towerCaps, 'skyline-crowns');

  const cottageTexture = cottageSkin(THREE, skinRandom);
  stamp(raised, new THREE.MeshStandardMaterial({
    map: cottageTexture, emissive: new THREE.Color('#5a4041'),
    emissiveMap: cottageTexture, emissiveIntensity: 0.16, roughness: 0.9,
  }), houses, 'beach-cottages');
  stamp(box, matte, houseRoofs, 'cottage-roofs');

  stamp(trunkShape, matte, palmTrunks, 'palm-trunks');
  stamp(palmLeaves(THREE), new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.88, side: THREE.DoubleSide,
  }), palmCrowns, 'palm-canopies');

  stamp(box, matte, pierBoards, 'pier-decking');
  stamp(box, matte, pierPosts, 'pier-support');
  stamp(box, matte, lampPoles, 'lamp-standards');
  stamp(new THREE.SphereGeometry(0.5, 10, 8), glowMaterial, lampGlobes, 'lamp-bulbs');
  stamp(box, matte, craneBeams, 'harbor-cranes');

  function districtAt(x, z) {
    let best = DISTRICTS[0].id;
    let bestDistance = Infinity;
    for (const district of DISTRICTS) {
      const distance = Math.hypot(x - district.center.x, z - district.center.z);
      if (distance <= district.radius) return district.id;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = district.id;
      }
    }
    return best;
  }

  function tick(seconds) {
    clockUniform.value = seconds;
    sweep.rotation.y = seconds * 0.58;
    beaconLamp.intensity = 1.4 + Math.sin(seconds * 2.1) * 0.25;
    glow.scale.setScalar(1 + Math.sin(seconds * 2.1) * 0.07);
  }

  return {
    scene,
    props,
    roads,
    obstacles,
    towers,
    houses,
    palms: palmTrunks,
    pad: { ...pad },
    pier: { ...pier },
    beacon: { ...STREET_GRID.beacon },
    limit: LIMITS.chaseRadius,
    districtAt,
    isRoad(x, z) {
      return roadClearance(x, z) <= 0;
    },
    isWater: inWater,
    tick,
  };
}

export default buildCity;
