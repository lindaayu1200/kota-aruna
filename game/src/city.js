import {
  CITY_LAYOUT,
  CITY_SIZE,
  DISTRICTS,
  PALETTE,
  STREET_NAMES,
} from './config.js';
import { createRandom } from './random.js';

const TAU = Math.PI * 2;

function nearestPointOnSegment(px, pz, segment) {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const lengthSq = dx * dx + dz * dz;
  let t = 0;
  if (lengthSq > 0) {
    t = ((px - segment.ax) * dx + (pz - segment.az) * dz) / lengthSq;
    t = Math.max(0, Math.min(1, t));
  }
  const x = segment.ax + dx * t;
  const z = segment.az + dz * t;
  return { x, z, t, distance: Math.hypot(px - x, pz - z) };
}

function makeCanvasTexture(THREE, width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeTowerTexture(THREE, rng) {
  return makeCanvasTexture(THREE, 128, 256, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1b2740');
    gradient.addColorStop(1, '#0a101c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#243049';
    ctx.fillRect(0, 3, width, 2);
    ctx.fillRect(0, height - 5, width, 2);

    const columns = 7;
    const rows = 21;
    const padX = 7;
    const padY = 8;
    const cellW = (width - padX * 2) / columns;
    const cellH = (height - padY * 2) / rows;
    const litColors = ['#ffd49a', '#ffe8c8', '#9fe7ff', '#ff9fc0'];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const lit = rng.chance(0.54);
        if (!lit) {
          ctx.fillStyle = rng.chance(0.3) ? '#111a2a' : '#0c1422';
        } else {
          ctx.fillStyle = rng.pick(litColors);
        }
        ctx.fillRect(
          padX + col * cellW + 1,
          padY + row * cellH + 1,
          Math.max(2, cellW - 2.4),
          Math.max(2, cellH - 2.2),
        );
      }
    }

    for (let col = 1; col < columns; col += 1) {
      ctx.fillStyle = 'rgba(8, 12, 22, 0.55)';
      ctx.fillRect(padX + col * cellW - 0.8, 0, 1.4, height);
    }
  });
}

function makeBeachTexture(THREE, rng) {
  return makeCanvasTexture(THREE, 128, 128, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#fff5ea');
    gradient.addColorStop(1, '#e9ddd2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const columns = 5;
    const rows = 6;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        ctx.fillStyle = rng.chance(0.62) ? '#4e4654' : '#c08f7a';
        ctx.fillRect(13 + col * 22, 12 + row * 18, 12, 8);
      }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let row = 0; row <= rows; row += 1) {
      ctx.fillRect(0, 9 + row * 18, width, 1.6);
    }
  });
}

function makeFrondGeometry(THREE) {
  const positions = [];
  const fronds = 8;

  for (let i = 0; i < fronds; i += 1) {
    const angle = (i / fronds) * TAU;
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    const sideX = -directionZ;
    const sideZ = directionX;
    const base = 0.24;
    const width = 0.5;
    const tipX = directionX * 3.5;
    const tipZ = directionZ * 3.5;
    const tipY = -0.55;

    positions.push(
      directionX * base + sideX * width,
      0.12,
      directionZ * base + sideZ * width,
      directionX * base - sideX * width,
      0.12,
      directionZ * base - sideZ * width,
      tipX,
      tipY,
      tipZ,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function createCity(THREE, seed = 1337) {
  const towerRng = createRandom((seed * 31 + 7) >>> 0);
  const blockRng = createRandom((seed * 37 + 11) >>> 0);
  const palmRng = createRandom((seed * 41 + 13) >>> 0);
  const textureRng = createRandom((seed * 53 + 17) >>> 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.Fog(PALETTE.fog, 420, 1550);

  const group = new THREE.Group();
  group.name = 'kota-aruna';
  scene.add(group);

  const roads = [];
  const collisionBoxes = [];
  const palms = [];
  const towerItems = [];
  const towerCrownItems = [];
  const blockItems = [];
  const palmTrunkItems = [];
  const palmCrownItems = [];
  const dashItems = [];
  const neonItems = [];
  const bankItems = [];
  const bridgeDeckItems = [];
  const bridgeRailItems = [];
  const plankItems = [];
  const postItems = [];
  const pierPoleItems = [];
  const pierGlobeItems = [];

  const channel = CITY_LAYOUT.channel;
  const waterTime = { value: 0 };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const baseBox = new THREE.BoxGeometry(1, 1, 1);
  baseBox.translate(0, 0.5, 0);

  // ---------------------------------------------------------------- roads
  const grid = CITY_LAYOUT.roadGrid;
  for (let i = 0; i < grid.xs.length; i += 1) {
    const x = grid.xs[i];
    roads.push({
      name: STREET_NAMES.northSouth[i % STREET_NAMES.northSouth.length],
      kind: 'street',
      ax: x,
      az: grid.zs[0],
      bx: x,
      bz: grid.zs[grid.zs.length - 1],
      width: grid.width,
    });
  }
  for (let i = 0; i < grid.zs.length; i += 1) {
    const z = grid.zs[i];
    roads.push({
      name: STREET_NAMES.eastWest[i % STREET_NAMES.eastWest.length],
      kind: 'street',
      ax: grid.xs[0],
      az: z,
      bx: grid.xs[grid.xs.length - 1],
      bz: z,
      width: grid.width,
    });
  }

  const ring = CITY_LAYOUT.ringRoad;
  for (let i = 0; i < ring.segments; i += 1) {
    const a0 = (i / ring.segments) * TAU;
    const a1 = ((i + 1) / ring.segments) * TAU;
    roads.push({
      name: STREET_NAMES.ring,
      kind: 'ring',
      ax: ring.center.x + Math.cos(a0) * ring.radiusX,
      az: ring.center.z + Math.sin(a0) * ring.radiusZ,
      bx: ring.center.x + Math.cos(a1) * ring.radiusX,
      bz: ring.center.z + Math.sin(a1) * ring.radiusZ,
      width: ring.width,
    });
  }

  function roadEdgeDistance(x, z) {
    let best = Infinity;
    for (const segment of roads) {
      const edge = nearestPointOnSegment(x, z, segment).distance
        - segment.width * 0.5;
      if (edge < best) best = edge;
    }
    return best;
  }

  function isRoad(x, z) {
    return roadEdgeDistance(x, z) <= 0;
  }

  // ------------------------------------------------------- ground and sea
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(780, 940),
    new THREE.MeshStandardMaterial({
      color: PALETTE.ground,
      roughness: 1,
      metalness: 0,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(70, 0, 0);
  ground.name = 'ground';
  group.add(ground);

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: waterTime,
      uDeep: { value: new THREE.Color(PALETTE.waterDeep) },
      uShallow: { value: new THREE.Color(PALETTE.waterShallow) },
      uSun: { value: new THREE.Color(PALETTE.sun) },
      uFog: { value: new THREE.Color(PALETTE.fog) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSun;
      uniform vec3 uFog;
      varying vec3 vWorld;

      void main() {
        float swell = sin(vWorld.x * 0.055 + uTime * 0.8)
          * sin(vWorld.z * 0.075 - uTime * 0.55);
        float streak = 0.5 + 0.5 * sin(
          vWorld.x * 0.32 + vWorld.z * 0.21 + swell * 2.4 + uTime * 0.4
        );
        vec3 color = mix(uDeep, uShallow, 0.36 + 0.2 * swell + 0.08 * streak);
        float glint = pow(max(streak, 0.0), 18.0);
        color += uSun * glint * 0.5;
        float haze = smoothstep(650.0, 1650.0, distance(vWorld.xz, vec2(-400.0, 0.0)));
        color = mix(color, uFog, haze * 0.72);
        gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
      }
    `,
  });

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1100), waterMaterial);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-940, CITY_LAYOUT.waterLevel, 0);
  sea.name = 'sea';
  group.add(sea);

  const channelWater = new THREE.Mesh(
    new THREE.PlaneGeometry(500, channel.halfWidth * 2),
    waterMaterial,
  );
  channelWater.rotation.x = -Math.PI / 2;
  channelWater.position.set(
    (channel.startX + channel.endX) * 0.5,
    CITY_LAYOUT.waterLevel + 0.004,
    channel.z,
  );
  channelWater.name = 'harbor-channel';
  group.add(channelWater);

  const beach = new THREE.Mesh(
    new THREE.BoxGeometry(CITY_LAYOUT.beachWidth, 0.14, 940),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  beach.position.set(-316, 0.07, 0);
  beach.name = 'west-beach';
  group.add(beach);

  const marinaSand = new THREE.Mesh(
    new THREE.BoxGeometry(102, 0.12, 350),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  marinaSand.position.set(-274, 0.075, -170);
  marinaSand.name = 'marina-beach';
  group.add(marinaSand);

  bankItems.push(
    {
      x: (channel.startX + channel.endX) * 0.5,
      y: 0.11,
      z: channel.z - channel.halfWidth - 2,
      sx: channel.endX - channel.startX,
      sy: 0.4,
      sz: 4,
      color: PALETTE.stone,
    },
    {
      x: (channel.startX + channel.endX) * 0.5,
      y: 0.11,
      z: channel.z + channel.halfWidth + 2,
      sx: channel.endX - channel.startX,
      sy: 0.4,
      sz: 4,
      color: PALETTE.stone,
    },
    {
      x: channel.endX + 2,
      y: 0.11,
      z: channel.z,
      sx: 4,
      sy: 0.4,
      sz: channel.halfWidth * 2 + 8,
      color: PALETTE.stone,
    },
  );

  // -------------------------------------------------------- road surfaces
  for (let roadIndex = 0; roadIndex < roads.length; roadIndex += 1) {
    const road = roads[roadIndex];
    const dx = road.bx - road.ax;
    const dz = road.bz - road.az;
    const length = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx);
    const midX = (road.ax + road.bx) * 0.5;
    const midZ = (road.az + road.bz) * 0.5;

    const roadColor = road.kind === 'ring' ? '#232533' : PALETTE.road;
    const surfaceY = road.kind === 'ring'
      ? 0.062
      : (Math.abs(dx) < 0.001 ? 0.058 : 0.06);
    const roadMeshItems = {
      x: midX,
      y: surfaceY,
      z: midZ,
      ry: yaw,
      sx: length,
      sy: 0.12,
      sz: road.width,
      color: roadColor,
    };
    dashItems.push(roadMeshItems);

    const directionX = dx / length;
    const directionZ = dz / length;
    for (let distance = 7; distance < length - 3; distance += 14) {
      dashItems.push({
        x: road.ax + directionX * distance,
        y: 0.145,
        z: road.az + directionZ * distance,
        ry: yaw,
        sx: 5.8,
        sy: 0.035,
        sz: 0.42,
        color: PALETTE.lane,
      });
    }

    if (road.kind === 'ring') {
      const toCenterX = ring.center.x - midX;
      const toCenterZ = ring.center.z - midZ;
      const toCenterLength = Math.hypot(toCenterX, toCenterZ) || 1;
      const offset = road.width * 0.5 + 0.5;
      neonItems.push({
        x: midX + (toCenterX / toCenterLength) * offset,
        y: 0.17,
        z: midZ + (toCenterZ / toCenterLength) * offset,
        ry: yaw,
        sx: length,
        sy: 0.08,
        sz: 0.65,
        color: Math.floor(midX + midZ) % 2 === 0
          ? PALETTE.neon.cyan
          : PALETTE.neon.pink,
      });
    }

    if (Math.abs(dz) > 0.001) {
      const t = (channel.z - road.az) / dz;
      if (t > 0 && t < 1) {
        const crossX = road.ax + dx * t;
        const railLength = Math.min(
          length,
          (channel.halfWidth * 2 * length) / Math.abs(dz) + 6,
        );
        const perpendicularX = -directionZ;
        const perpendicularZ = directionX;
        const offset = road.width * 0.5 + 0.9;

        bridgeDeckItems.push({
          x: crossX,
          y: 0.02,
          z: channel.z,
          ry: yaw,
          sx: railLength,
          sy: 0.08,
          sz: road.width + 3,
          color: PALETTE.stone,
        });

        for (const side of [-1, 1]) {
          bridgeRailItems.push({
            x: crossX + perpendicularX * offset * side,
            y: 0.68,
            z: channel.z + perpendicularZ * offset * side,
            ry: yaw,
            sx: railLength,
            sy: 1.15,
            sz: 0.5,
            color: '#d8c8ad',
          });
        }
      }
    }
  }

  // ---------------------------------------------------------- downtown
  const downtown = DISTRICTS[0];
  let towerAttempts = 0;
  while (towerItems.length < 95 && towerAttempts < 4200) {
    towerAttempts += 1;
    const width = towerRng.range(12, 27);
    const depth = towerRng.range(12, 27);
    const x = towerRng.range(-15, 430);
    const z = towerRng.range(-430, 430);
    const districtDistance = Math.hypot(
      x - downtown.center.x,
      z - downtown.center.z,
    );

    if (districtDistance > downtown.radius) continue;
    if (roadEdgeDistance(x, z) < Math.max(width, depth) * 0.62 + 5) continue;
    if (
      x < channel.endX + 26
      && x > channel.startX - 20
      && Math.abs(z - channel.z) < channel.halfWidth + Math.max(width, depth) * 0.6 + 6
    ) {
      continue;
    }

    let overlaps = false;
    for (const other of towerItems) {
      const reach = (Math.max(width, depth) + Math.max(other.sx, other.sz)) * 0.55;
      if (Math.hypot(x - other.x, z - other.z) < reach) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const centerFactor = 1 - districtDistance / downtown.radius;
    const height = 24
      + centerFactor * towerRng.range(45, 120)
      + towerRng.range(0, 28);
    const yaw = towerRng.chance(0.72)
      ? towerRng.pick([0, Math.PI / 2])
      : towerRng.range(-0.25, 0.25);

    towerItems.push({
      x,
      y: 0,
      z,
      ry: yaw,
      sx: width,
      sy: height,
      sz: depth,
      color: towerRng.pick(PALETTE.towerTints),
    });

    if (height > 82) {
      towerCrownItems.push({
        x,
        y: height + 0.8,
        z,
        ry: yaw,
        sx: width + 1.6,
        sy: 1.5,
        sz: depth + 1.6,
        color: towerRng.pick([
          PALETTE.neon.cyan,
          PALETTE.neon.pink,
          PALETTE.neon.amber,
        ]),
      });
    }

    collisionBoxes.push({
      x,
      z,
      halfX: width * 0.5 + 1.4,
      halfZ: depth * 0.5 + 1.4,
      kind: 'tower',
      district: downtown.id,
    });
  }

  // ------------------------------------------------------ beach district
  const beachDistrict = DISTRICTS[1];
  let blockAttempts = 0;
  while (blockItems.length < 72 && blockAttempts < 4200) {
    blockAttempts += 1;
    const width = blockRng.range(14, 31);
    const depth = blockRng.range(13, 27);
    const x = blockRng.range(-290, -8);
    const z = blockRng.range(-425, 425);
    const districtDistance = Math.hypot(
      x - beachDistrict.center.x,
      z - beachDistrict.center.z,
    );

    if (districtDistance > beachDistrict.radius * 1.12) continue;
    if (roadEdgeDistance(x, z) < Math.max(width, depth) * 0.58 + 4) continue;
    if (
      x < channel.endX + 16
      && x > channel.startX - 16
      && Math.abs(z - channel.z) < channel.halfWidth + Math.max(width, depth) * 0.6 + 5
    ) {
      continue;
    }

    let overlaps = false;
    for (const other of blockItems) {
      const reach = (Math.max(width, depth) + Math.max(other.sx, other.sz)) * 0.54;
      if (Math.hypot(x - other.x, z - other.z) < reach) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    const centerFactor = 1 - Math.min(1, districtDistance / beachDistrict.radius);
    const height = 4 + blockRng.range(0, 9) + centerFactor * 6;
    const yaw = blockRng.chance(0.68)
      ? 0
      : blockRng.range(-0.22, 0.22);

    blockItems.push({
      x,
      y: 0,
      z,
      ry: yaw,
      sx: width,
      sy: height,
      sz: depth,
      color: blockRng.pick(PALETTE.pastels),
    });

    collisionBoxes.push({
      x,
      z,
      halfX: width * 0.5 + 1.2,
      halfZ: depth * 0.5 + 1.2,
      kind: 'beach-house',
      district: beachDistrict.id,
    });
  }

  // --------------------------------------------------------------- palms
  let palmAttempts = 0;
  while (palms.length < 80 && palmAttempts < 5200) {
    palmAttempts += 1;
    const x = palmRng.range(-296, -6);
    const z = palmRng.range(-435, 435);
    const districtDistance = Math.hypot(
      x - beachDistrict.center.x,
      z - beachDistrict.center.z,
    );

    if (districtDistance > beachDistrict.radius * 1.16) continue;
    if (roadEdgeDistance(x, z) < 4.5) continue;
    if (
      x < channel.endX + 12
      && x > channel.startX - 12
      && Math.abs(z - channel.z) < channel.halfWidth + 6
    ) {
      continue;
    }

    let blocked = false;
    for (const block of blockItems) {
      if (
        Math.abs(x - block.x) < block.sx * 0.5 + 2.5
        && Math.abs(z - block.z) < block.sz * 0.5 + 2.5
      ) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    for (const palm of palms) {
      if (Math.hypot(x - palm.x, z - palm.z) < 5.5) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    const height = palmRng.range(5.5, 10.5);
    const crownScale = palmRng.range(0.8, 1.3);
    const yaw = palmRng.range(0, TAU);

    palms.push({ x, z, height, radius: 0.55 });
    palmTrunkItems.push({
      x,
      y: 0.12,
      z,
      ry: yaw,
      sx: 1,
      sy: height,
      sz: 1,
      color: '#6b4b36',
    });
    palmCrownItems.push({
      x,
      y: 0.12 + height,
      z,
      ry: yaw,
      sx: crownScale,
      sy: crownScale,
      sz: crownScale,
      color: palmRng.pick(PALETTE.greens),
    });
  }

  // ---------------------------------------------------------------- pier
  const pier = CITY_LAYOUT.pier;
  for (let x = pier.startX; x >= pier.endX; x -= 2.2) {
    plankItems.push({
      x,
      y: 0.62,
      z: pier.z,
      sx: 2.05,
      sy: 0.28,
      sz: pier.width,
      color: PALETTE.wood,
    });
  }
  for (let x = pier.startX - 5; x >= pier.endX; x -= 18) {
    for (const side of [-1, 1]) {
      postItems.push({
        x,
        y: -0.8,
        z: pier.z + side * (pier.width * 0.5 - 0.6),
        sx: 0.85,
        sy: 3,
        sz: 0.85,
        color: '#4a3325',
      });
    }
  }
  for (const x of [-315, -360, -405]) {
    pierPoleItems.push({
      x,
      y: 2.2,
      z: pier.z + pier.width * 0.5 - 0.6,
      sx: 0.24,
      sy: 3.4,
      sz: 0.24,
      color: '#2b2b33',
    });
    pierGlobeItems.push({
      x,
      y: 4.15,
      z: pier.z + pier.width * 0.5 - 0.6,
      sx: 1,
      sy: 1,
      sz: 1,
      color: PALETTE.neon.amber,
    });
  }

  // ----------------------------------------------------------- lighthouse
  const lighthouse = new THREE.Group();
  lighthouse.name = 'lighthouse';
  lighthouse.position.set(
    CITY_LAYOUT.lighthouse.x,
    0,
    CITY_LAYOUT.lighthouse.z,
  );

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: '#4b4249',
    roughness: 1,
  });
  const whiteMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.lighthouse,
    roughness: 0.72,
  });
  const redMaterial = new THREE.MeshStandardMaterial({
    color: '#b94a45',
    roughness: 0.8,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: '#2b2732',
    roughness: 0.65,
    metalness: 0.2,
  });

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 18, 5, 20),
    rockMaterial,
  );
  platform.position.y = 2;
  lighthouse.add(platform);

  const towerSections = 4;
  const towerHeight = 30;
  for (let i = 0; i < towerSections; i += 1) {
    const bottomY = 4.5 + (i / towerSections) * towerHeight;
    const topY = 4.5 + ((i + 1) / towerSections) * towerHeight;
    const bottomRadius = 6 - (i / towerSections) * 2;
    const topRadius = 6 - ((i + 1) / towerSections) * 2;
    const section = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius, bottomRadius, topY - bottomY, 18),
      i % 2 === 0 ? whiteMaterial : redMaterial,
    );
    section.position.y = (bottomY + topY) * 0.5;
    lighthouse.add(section);
  }

  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.5, 1.2, 16),
    darkMaterial,
  );
  lampRoom.position.y = 35.1;
  lighthouse.add(lampRoom);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.65, 18, 12),
    new THREE.MeshBasicMaterial({
      color: PALETTE.sun,
      toneMapped: false,
    }),
  );
  lamp.position.y = 35.5;
  lighthouse.add(lamp);

  const lampGlow = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 16, 12),
    new THREE.MeshBasicMaterial({
      color: PALETTE.neon.amber,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  lampGlow.position.y = 35.5;
  lighthouse.add(lampGlow);

  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 4.2, 3.2, 16),
    darkMaterial,
  );
  roof.position.y = 38.6;
  lighthouse.add(roof);

  const beamGeometry = new THREE.BoxGeometry(1.1, 1.1, 48);
  beamGeometry.translate(0, 0, 24);
  const beam = new THREE.Mesh(
    beamGeometry,
    new THREE.MeshBasicMaterial({
      color: PALETTE.sun,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  beam.position.y = 35.5;
  lighthouse.add(beam);

  const lampLight = new THREE.PointLight(PALETTE.neon.amber, 1.6, 230, 2);
  lampLight.position.y = 35.5;
  lighthouse.add(lampLight);

  group.add(lighthouse);
  collisionBoxes.push({
    x: CITY_LAYOUT.lighthouse.x,
    z: CITY_LAYOUT.lighthouse.z,
    halfX: 11,
    halfZ: 11,
    kind: 'lighthouse',
    district: 'marina-senja',
  });

  // ------------------------------------------------------------ sky/sun
  const sunDirection = new THREE.Vector3(-0.82, 0.16, -0.3).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1750, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(PALETTE.skyTop) },
        uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
        uSun: { value: new THREE.Color(PALETTE.sun) },
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
        uniform vec3 uHorizon;
        uniform vec3 uSun;
        uniform vec3 uSunDirection;
        varying vec3 vDirection;

        void main() {
          vec3 direction = normalize(vDirection);
          float height = smoothstep(-0.08, 0.55, direction.y);
          vec3 color = mix(uHorizon, uTop, height);
          float alignment = max(dot(direction, uSunDirection), 0.0);
          color += uSun * pow(alignment, 7.0) * 0.22;
          color += uSun * pow(alignment, 110.0) * 1.1;
          gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  sky.name = 'sunset-sky';
  sky.frustumCulled = false;
  scene.add(sky);

  const sunPosition = sunDirection.clone().multiplyScalar(1500);
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(52, 24, 16),
    new THREE.MeshBasicMaterial({
      color: PALETTE.sun,
      toneMapped: false,
      fog: false,
    }),
  );
  sunDisc.position.copy(sunPosition);
  sunDisc.frustumCulled = false;
  scene.add(sunDisc);

  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(115, 20, 14),
    new THREE.MeshBasicMaterial({
      color: PALETTE.neon.amber,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
  );
  sunHalo.position.copy(sunPosition);
  sunHalo.frustumCulled = false;
  scene.add(sunHalo);

  const sunsetLight = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sunsetLight.position.copy(sunDirection.clone().multiplyScalar(620));
  sunsetLight.target.position.set(60, 0, 0);
  scene.add(sunsetLight);
  scene.add(sunsetLight.target);

  const skyLight = new THREE.HemisphereLight(
    PALETTE.skyTop,
    PALETTE.ground,
    1.15,
  );
  scene.add(skyLight);

  const fillLight = new THREE.AmbientLight(PALETTE.skyHorizon, 0.18);
  scene.add(fillLight);

  // ------------------------------------------------------- instanced mesh
  const towerTexture = makeTowerTexture(THREE, textureRng);
  const beachTexture = makeBeachTexture(THREE, textureRng);

  const towerMaterial = new THREE.MeshStandardMaterial({
    map: towerTexture,
    emissive: new THREE.Color('#ffd6a8'),
    emissiveMap: towerTexture,
    emissiveIntensity: 0.72,
    roughness: 0.58,
    metalness: 0.16,
  });

  const blockMaterial = new THREE.MeshStandardMaterial({
    map: beachTexture,
    emissive: new THREE.Color('#5b3f45'),
    emissiveMap: beachTexture,
    emissiveIntensity: 0.12,
    roughness: 0.86,
    metalness: 0,
  });

  function addInstanced(geometry, material, items, name) {
    if (items.length === 0) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    mesh.name = name;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();
    const color = new THREE.Color();

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      position.set(item.x || 0, item.y || 0, item.z || 0);
      euler.set(item.rx || 0, item.ry || 0, item.rz || 0);
      quaternion.setFromEuler(euler);
      scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
      if (item.color !== undefined) {
        color.set(item.color);
        mesh.setColorAt(i, color);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
    return mesh;
  }

  addInstanced(
    unitBox,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.94,
      metalness: 0.04,
    }),
    dashItems.filter((item) => item.sz > 2),
    'road-surfaces',
  );

  addInstanced(
    unitBox,
    new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    dashItems.filter((item) => item.sz <= 2),
    'lane-markings',
  );

  addInstanced(
    unitBox,
    new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    neonItems,
    'ring-neon',
  );

  addInstanced(
    unitBox,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.96,
    }),
    bankItems,
    'channel-banks',
  );

  addInstanced(
    unitBox,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.9,
    }),
    bridgeDeckItems,
    'bridge-decks',
  );

  addInstanced(
    unitBox,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.7,
      metalness: 0.12,
    }),
    bridgeRailItems,
    'bridge-rails',
  );

  addInstanced(baseBox, towerMaterial, towerItems, 'towers');
  addInstanced(
    unitBox,
    new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    towerCrownItems,
    'tower-crowns',
  );
  addInstanced(baseBox, blockMaterial, blockItems, 'beach-houses');

  const trunkGeometry = new THREE.CylinderGeometry(0.28, 0.5, 1, 5);
  trunkGeometry.translate(0, 0.5, 0);
  addInstanced(
    trunkGeometry,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.94,
    }),
    palmTrunkItems,
    'palm-trunks',
  );

  addInstanced(
    makeFrondGeometry(THREE),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      side: THREE.DoubleSide,
    }),
    palmCrownItems,
    'palm-crowns',
  );

  addInstanced(
    unitBox,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.92,
    }),
    plankItems,
    'pier-planks',
  );

  addInstanced(
    unitBox,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 1,
    }),
    postItems,
    'pier-posts',
  );

  addInstanced(
    unitBox,
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.75,
      metalness: 0.3,
    }),
    pierPoleItems,
    'pier-lamp-poles',
  );

  addInstanced(
    new THREE.SphereGeometry(0.42, 10, 8),
    new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    pierGlobeItems,
    'pier-lamps',
  );

  // ---------------------------------------------------------- public API
  function districtOf(x, z) {
    let nearest = DISTRICTS[0];
    let nearestDistance = Infinity;

    for (const district of DISTRICTS) {
      const distance = Math.hypot(
        x - district.center.x,
        z - district.center.z,
      );
      if (distance <= district.radius) return district.id;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = district;
      }
    }

    return nearest.id;
  }

  const spawnPoints = [
    { id: 'teluk-dock', name: 'Teluk Harbor', x: 210, z: 70, heading: -0.4 },
    { id: 'marina-sunset', name: 'Marina Sunset', x: -210, z: -140, heading: 0.8 },
    { id: 'ring-north', name: 'Ring Road North', x: 60, z: -390, heading: 0 },
    { id: 'channel-bridge', name: 'Aruna Channel Bridge', x: 40, z: 200, heading: Math.PI / 2 },
    { id: 'old-pier', name: 'Old Pier', x: -340, z: -170, heading: -Math.PI / 2 },
  ];

  function update(time) {
    waterTime.value = time;
    beam.rotation.y = time * 0.62;
    lampLight.intensity = 1.35 + Math.sin(time * 2.3) * 0.28;
    lampGlow.scale.setScalar(1 + Math.sin(time * 2.3) * 0.05);
  }

  return {
    scene,
    group,
    roads,
    districtOf,
    spawnPoints,
    isRoad,
    getCollisionBoxes() {
      return collisionBoxes;
    },
    getPalms() {
      return palms;
    },
    update,
    size: CITY_SIZE,
  };
}
