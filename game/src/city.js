// World construction for KOTA ARUNA.
// The builder owns the scene, the skyline, the roads and every static prop.
// It returns a small API used by the driving, HUD and minimap code.

import {
  DISTRICTS,
  LAYOUT,
  PALETTE,
  SPAWNS,
  STREETS,
  WORLD,
} from './config.js';
import { makeRandom } from './random.js';

const TAU = Math.PI * 2;

function segmentDistance(x, z, segment) {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const lengthSquared = dx * dx + dz * dz;
  let t = lengthSquared > 0
    ? ((x - segment.ax) * dx + (z - segment.az) * dz) / lengthSquared
    : 0;
  t = Math.max(0, Math.min(1, t));
  const nearestX = segment.ax + dx * t;
  const nearestZ = segment.az + dz * t;
  return Math.hypot(x - nearestX, z - nearestZ);
}

function paintedTexture(THREE, width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function facadeTexture(THREE, rng, tall) {
  return paintedTexture(THREE, 128, 256, (ctx, width, height) => {
    const wash = ctx.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, tall ? '#20304e' : '#f7e6cf');
    wash.addColorStop(1, tall ? '#0a1424' : '#d8bfae');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    const columns = tall ? 7 : 4;
    const rows = tall ? 22 : 6;
    const padX = 8;
    const padY = 9;
    const cellWidth = (width - padX * 2) / columns;
    const cellHeight = (height - padY * 2) / rows;
    const lit = tall
      ? ['#ffd79a', '#ffeac6', '#9ce8ff', '#ff9ec3']
      : ['#ffd7a1', '#fff0cf', '#bde9dc'];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const glowing = tall ? rng.odds(0.52) : rng.odds(0.34);
        ctx.fillStyle = glowing
          ? rng.choose(lit)
          : (tall ? '#101b2e' : '#b79a8f');
        ctx.fillRect(
          padX + column * cellWidth + 1,
          padY + row * cellHeight + 1,
          Math.max(2, cellWidth - 2.5),
          Math.max(2, cellHeight - 2.5),
        );
      }
    }
    ctx.fillStyle = tall ? 'rgba(6,10,20,0.55)' : 'rgba(90,62,60,0.3)';
    for (let column = 1; column < columns; column += 1) {
      ctx.fillRect(padX + column * cellWidth - 1, 0, 1.6, height);
    }
  });
}

function signTexture(THREE, title, subtitle, color) {
  return paintedTexture(THREE, 512, 160, (ctx, width, height) => {
    ctx.fillStyle = 'rgba(15,12,28,0.92)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    ctx.fillStyle = color;
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 78);
    ctx.fillStyle = '#ffe4c2';
    ctx.font = '24px sans-serif';
    ctx.fillText(subtitle, width / 2, 122);
  });
}

function padTexture(THREE) {
  return paintedTexture(THREE, 256, 256, (ctx, width, height) => {
    ctx.fillStyle = '#243041';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ffcf83';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 94, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#ffdfa6';
    ctx.font = 'bold 150px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', width / 2, height / 2 + 6);
  });
}

function frondGeometry(THREE) {
  const vertices = [];
  const leaves = 7;
  for (let index = 0; index < leaves; index += 1) {
    const angle = (index / leaves) * TAU;
    const forwardX = Math.cos(angle);
    const forwardZ = Math.sin(angle);
    const sideX = -forwardZ;
    const sideZ = forwardX;
    vertices.push(
      forwardX * 0.2 + sideX * 0.62, 0.08, forwardZ * 0.2 + sideZ * 0.62,
      forwardX * 0.2 - sideX * 0.62, 0.08, forwardZ * 0.2 - sideZ * 0.62,
      forwardX * 4.1, -0.72, forwardZ * 4.1,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildCity(THREE, seed = 1337) {
  const skylineRng = makeRandom(seed * 31 + 17);
  const houseRng = makeRandom(seed * 37 + 23);
  const palmRng = makeRandom(seed * 41 + 29);
  const surfaceRng = makeRandom(seed * 59 + 71);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.horizon);
  scene.fog = new THREE.Fog(PALETTE.haze, 480, 1750);

  const root = new THREE.Group();
  root.name = 'kota-aruna-world';
  scene.add(root);

  const roads = [];
  const solid = [];
  const laneMarks = [];
  const neonStrips = [];
  const bridgePlates = [];
  const bridgeRails = [];
  const bankBlocks = [];
  const towerBlocks = [];
  const towerCrowns = [];
  const houseBlocks = [];
  const houseRoofs = [];
  const palmStems = [];
  const palmTops = [];
  const pierBoards = [];
  const pierPiles = [];
  const pierLamps = [];
  const beaconPosts = [];
  const beaconBulbs = [];
  const craneBeams = [];

  // ---------------------------------------------------------- street graph
  LAYOUT.gridX.forEach((x, index) => {
    roads.push({
      name: STREETS.vertical[index % STREETS.vertical.length],
      type: 'street',
      ax: x,
      az: LAYOUT.gridZ[0],
      bx: x,
      bz: LAYOUT.gridZ[LAYOUT.gridZ.length - 1],
      width: LAYOUT.streetWidth,
    });
  });
  LAYOUT.gridZ.forEach((z, index) => {
    roads.push({
      name: STREETS.horizontal[index % STREETS.horizontal.length],
      type: 'street',
      ax: LAYOUT.gridX[0],
      az: z,
      bx: LAYOUT.gridX[LAYOUT.gridX.length - 1],
      bz: z,
      width: LAYOUT.streetWidth,
    });
  });
  const ring = LAYOUT.ring;
  for (let index = 0; index < ring.pieces; index += 1) {
    const first = (index / ring.pieces) * TAU;
    const second = ((index + 1) / ring.pieces) * TAU;
    roads.push({
      name: STREETS.ring,
      type: 'ring',
      ax: ring.x + Math.cos(first) * ring.rx,
      az: ring.z + Math.sin(first) * ring.rz,
      bx: ring.x + Math.cos(second) * ring.rx,
      bz: ring.z + Math.sin(second) * ring.rz,
      width: ring.width,
    });
  }
  const pierRoad = {
    name: STREETS.pier,
    type: 'pier',
    ax: LAYOUT.pier.fromX + 20,
    az: LAYOUT.pier.z,
    bx: LAYOUT.pier.toX,
    bz: LAYOUT.pier.z,
    width: LAYOUT.pier.width,
  };
  roads.push(pierRoad);

  function roadClearance(x, z) {
    let best = Infinity;
    for (const road of roads) {
      const distance = segmentDistance(x, z, road) - road.width / 2;
      if (distance < best) best = distance;
    }
    return best;
  }

  function onWater(x, z) {
    const channel = LAYOUT.channel;
    if (x < LAYOUT.shoreX - 2) return true;
    return x >= channel.fromX && x <= channel.toX
      && Math.abs(z - channel.z) < channel.halfWidth;
  }

  // ------------------------------------------------------------ ground/sea
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 1000),
    new THREE.MeshStandardMaterial({ color: PALETTE.soil, roughness: 1 }),
  );
  land.rotation.x = -Math.PI / 2;
  land.position.set(90, 0, 0);
  land.name = 'city-ground';
  root.add(land);

  const beach = new THREE.Mesh(
    new THREE.BoxGeometry(LAYOUT.beachWidth, 0.2, 1000),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  beach.position.set(LAYOUT.shoreX - LAYOUT.beachWidth / 2 + 12, 0.1, 0);
  beach.name = 'senja-beach';
  root.add(beach);

  const cove = new THREE.Mesh(
    new THREE.BoxGeometry(155, 0.18, 380),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  cove.position.set(-262, 0.09, -195);
  root.add(cove);

  const tide = { value: 0 };
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: tide,
      uDeep: { value: new THREE.Color(PALETTE.deepSea) },
      uShallow: { value: new THREE.Color(PALETTE.shallowSea) },
      uSun: { value: new THREE.Color(PALETTE.sunlight) },
      uFog: { value: new THREE.Color(PALETTE.haze) },
    },
    vertexShader: `
      varying vec3 vSpot;
      void main() {
        vec4 worldSpot = modelMatrix * vec4(position, 1.0);
        vSpot = worldSpot.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldSpot;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSun;
      uniform vec3 uFog;
      varying vec3 vSpot;
      void main() {
        float swell = sin(vSpot.x * 0.052 + uTime * 0.72)
                    * sin(vSpot.z * 0.077 - uTime * 0.51);
        float ripple = 0.5 + 0.5 * sin(vSpot.x * 0.31 + vSpot.z * 0.23 + swell * 2.7 + uTime * 0.46);
        vec3 color = mix(uDeep, uShallow, 0.34 + 0.22 * swell + 0.09 * ripple);
        float sparkle = pow(max(ripple, 0.0), 20.0);
        color += uSun * sparkle * 0.55;
        float distanceHaze = smoothstep(700.0, 1800.0, distance(vSpot.xz, vec2(-430.0, 0.0)));
        color = mix(color, uFog, distanceHaze * 0.7);
        gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
      }
    `,
  });

  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1200), waterMaterial);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-1030, WORLD.seaLevel, 0);
  ocean.name = 'aruna-sea';
  root.add(ocean);

  const channel = LAYOUT.channel;
  const channelWater = new THREE.Mesh(
    new THREE.PlaneGeometry(channel.toX - channel.fromX, channel.halfWidth * 2),
    waterMaterial,
  );
  channelWater.rotation.x = -Math.PI / 2;
  channelWater.position.set(
    (channel.fromX + channel.toX) / 2,
    WORLD.seaLevel + 0.006,
    channel.z,
  );
  channelWater.name = 'aruna-channel';
  root.add(channelWater);

  for (const side of [-1, 1]) {
    bankBlocks.push({
      x: (channel.fromX + channel.toX) / 2,
      y: 0.14,
      z: channel.z + side * (channel.halfWidth + 3),
      sx: channel.toX - channel.fromX,
      sy: 0.45,
      sz: 5,
      color: PALETTE.stone,
    });
  }
  bankBlocks.push({
    x: channel.toX + 3,
    y: 0.14,
    z: channel.z,
    sx: 5,
    sy: 0.45,
    sz: channel.halfWidth * 2 + 10,
    color: PALETTE.stone,
  });

  // ------------------------------------------------------------ road paint
  for (const road of roads) {
    const dx = road.bx - road.ax;
    const dz = road.bz - road.az;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) continue;
    const yaw = Math.atan2(-dz, dx);
    const middleX = (road.ax + road.bx) / 2;
    const middleZ = (road.az + road.bz) / 2;

    laneMarks.push({
      x: middleX,
      y: 0.075,
      z: middleZ,
      ry: yaw,
      sx: length,
      sy: 0.12,
      sz: road.width,
      color: road.type === 'ring' ? PALETTE.ringAsphalt : PALETTE.asphalt,
    });

    const step = road.type === 'ring' ? 16 : 14;
    for (let traveled = 9; traveled < length - 4; traveled += step) {
      const fraction = traveled / length;
      laneMarks.push({
        x: road.ax + dx * fraction,
        y: 0.15,
        z: road.az + dz * fraction,
        ry: yaw,
        sx: Math.min(6.5, step * 0.42),
        sy: 0.03,
        sz: 0.45,
        color: PALETTE.paint,
      });
    }

    if (road.type === 'ring') {
      const toCenterX = ring.x - middleX;
      const toCenterZ = ring.z - middleZ;
      const span = Math.hypot(toCenterX, toCenterZ) || 1;
      const offset = road.width / 2 - 1.4;
      neonStrips.push({
        x: middleX + (toCenterX / span) * offset,
        y: 0.17,
        z: middleZ + (toCenterZ / span) * offset,
        ry: yaw,
        sx: length,
        sy: 0.09,
        sz: 0.55,
        color: Math.floor(middleX + middleZ) % 2 === 0 ? PALETTE.neonBlue : PALETTE.neonPink,
      });
    }

    if (Math.abs(dz) > 0.001) {
      const cross = (channel.z - road.az) / dz;
      if (cross > 0 && cross < 1) {
        const crossingX = road.ax + dx * cross;
        const deckLength = Math.min(length, (channel.halfWidth * 2 * length) / Math.abs(dz) + 8);
        bridgePlates.push({
          x: crossingX,
          y: 0.03,
          z: channel.z,
          ry: yaw,
          sx: deckLength,
          sy: 0.09,
          sz: road.width + 4,
          color: PALETTE.stone,
        });
        const sideX = -dz / length;
        const sideZ = dx / length;
        for (const side of [-1, 1]) {
          bridgeRails.push({
            x: crossingX + sideX * (road.width / 2 + 1) * side,
            y: 0.75,
            z: channel.z + sideZ * (road.width / 2 + 1) * side,
            ry: yaw,
            sx: deckLength,
            sy: 1.2,
            sz: 0.55,
            color: '#ded0b4',
          });
        }
      }
    }
  }

  // ---------------------------------------------------------- harbor towers
  const downtown = DISTRICTS[0];
  let towerTries = 0;
  while (towerBlocks.length < 108 && towerTries < 6000) {
    towerTries += 1;
    const width = skylineRng.between(13, 28);
    const depth = skylineRng.between(13, 28);
    const x = skylineRng.between(-15, 460);
    const z = skylineRng.between(-455, 455);
    if (Math.hypot(x - downtown.center.x, z - downtown.center.z) > downtown.radius) continue;
    if (roadClearance(x, z) < Math.max(width, depth) * 0.6 + 6) continue;
    if (x < channel.toX + 30 && x > channel.fromX - 20
      && Math.abs(z - channel.z) < channel.halfWidth + Math.max(width, depth) * 0.7) continue;

    let crowded = false;
    for (const block of towerBlocks) {
      const reach = (Math.max(width, depth) + Math.max(block.sx, block.sz)) * 0.58;
      if (Math.hypot(x - block.x, z - block.z) < reach) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;

    const closeness = 1 - Math.min(1, Math.hypot(x - downtown.center.x, z - downtown.center.z) / downtown.radius);
    const height = 26 + closeness * skylineRng.between(48, 132) + skylineRng.between(0, 30);
    towerBlocks.push({
      x, y: 0, z,
      ry: skylineRng.odds(0.75) ? skylineRng.choose([0, Math.PI / 2]) : skylineRng.between(-0.2, 0.2),
      sx: width, sy: height, sz: depth,
      color: skylineRng.choose(PALETTE.towerColors),
    });
    if (height > 88) {
      towerCrowns.push({
        x, y: height + 0.8, z,
        ry: 0,
        sx: width + 1.4, sy: 1.4, sz: depth + 1.4,
        color: skylineRng.choose([PALETTE.neonBlue, PALETTE.neonPink, PALETTE.lamp]),
      });
    }
    solid.push({ x, z, halfX: width / 2 + 1.5, halfZ: depth / 2 + 1.5, type: 'tower' });
  }

  // ----------------------------------------------------------- beach houses
  const beachDistrict = DISTRICTS[1];
  let houseTries = 0;
  while (houseBlocks.length < 82 && houseTries < 6000) {
    houseTries += 1;
    const width = houseRng.between(14, 30);
    const depth = houseRng.between(13, 27);
    const x = houseRng.between(-296, -12);
    const z = houseRng.between(-445, 445);
    if (Math.hypot(x - beachDistrict.center.x, z - beachDistrict.center.z) > beachDistrict.radius * 1.12) continue;
    if (roadClearance(x, z) < Math.max(width, depth) * 0.58 + 5) continue;
    if (x < channel.toX + 20 && x > channel.fromX - 15
      && Math.abs(z - channel.z) < channel.halfWidth + Math.max(width, depth) * 0.65) continue;

    let crowded = false;
    for (const block of houseBlocks) {
      const reach = (Math.max(width, depth) + Math.max(block.sx, block.sz)) * 0.56;
      if (Math.hypot(x - block.x, z - block.z) < reach) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;

    const height = 4.5 + houseRng.between(0, 8);
    houseBlocks.push({
      x, y: 0, z,
      ry: houseRng.odds(0.7) ? 0 : houseRng.between(-0.2, 0.2),
      sx: width, sy: height, sz: depth,
      color: houseRng.choose(PALETTE.houseColors),
    });
    houseRoofs.push({
      x, y: height + 0.4, z,
      ry: 0,
      sx: width + 1.5, sy: 0.8, sz: depth + 1.5,
      color: '#efe2d0',
    });
    solid.push({ x, z, halfX: width / 2 + 1.2, halfZ: depth / 2 + 1.2, type: 'house' });
  }

  // ---------------------------------------------------------------- palms
  const palms = [];
  let palmTries = 0;
  while (palms.length < 92 && palmTries < 7000) {
    palmTries += 1;
    const x = palmRng.between(-308, -4);
    const z = palmRng.between(-448, 448);
    if (Math.hypot(x - beachDistrict.center.x, z - beachDistrict.center.z) > beachDistrict.radius * 1.18) continue;
    if (roadClearance(x, z) < 5) continue;
    if (x < channel.toX + 14 && x > channel.fromX - 14 && Math.abs(z - channel.z) < channel.halfWidth + 7) continue;

    let blocked = false;
    for (const house of houseBlocks) {
      if (Math.abs(x - house.x) < house.sx / 2 + 3 && Math.abs(z - house.z) < house.sz / 2 + 3) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    for (const palm of palms) {
      if (Math.hypot(x - palm.x, z - palm.z) < 6) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    const height = palmRng.between(6, 11);
    const crown = palmRng.between(0.85, 1.3);
    palms.push({ x, z, height, radius: 0.7 });
    palmStems.push({
      x, y: 0.12, z,
      ry: palmRng.between(0, TAU),
      sx: 1, sy: height, sz: 1,
      color: '#6d4c36',
    });
    palmTops.push({
      x, y: height + 0.12, z,
      ry: palmRng.between(0, TAU),
      sx: crown, sy: crown, sz: crown,
      color: palmRng.choose(PALETTE.leafColors),
    });
  }

  // ------------------------------------------------------------------- pier
  const pier = LAYOUT.pier;
  for (let x = pier.fromX; x >= pier.toX; x -= 2.4) {
    pierBoards.push({
      x, y: 0.62, z: pier.z,
      ry: 0,
      sx: 2.25, sy: 0.3, sz: pier.width,
      color: x % 3 < 1 ? '#77513a' : PALETTE.timber,
    });
  }
  for (let x = pier.fromX - 4; x >= pier.toX; x -= 17) {
    for (const side of [-1, 1]) {
      pierPiles.push({
        x, y: -0.9, z: pier.z + side * (pier.width / 2 - 0.7),
        ry: 0,
        sx: 0.9, sy: 3.2, sz: 0.9,
        color: '#483224',
      });
    }
  }
  for (const x of [-318, -365, -412]) {
    beaconPosts.push({
      x, y: 2.2, z: pier.z + pier.width / 2 - 0.8,
      ry: 0,
      sx: 0.25, sy: 3.4, sz: 0.25,
      color: '#2d2a34',
    });
    beaconBulbs.push({
      x, y: 4.1, z: pier.z + pier.width / 2 - 0.8,
      ry: 0,
      sx: 1, sy: 1, sz: 1,
      color: PALETTE.lamp,
    });
  }

  // ------------------------------------------------------------- lighthouse
  const lighthouse = new THREE.Group();
  lighthouse.name = 'senja-lighthouse';
  lighthouse.position.set(LAYOUT.lighthouse.x, 0, LAYOUT.lighthouse.z);
  const rock = new THREE.MeshStandardMaterial({ color: '#4a414a', roughness: 1 });
  const chalk = new THREE.MeshStandardMaterial({ color: '#f2e7d9', roughness: 0.75 });
  const rust = new THREE.MeshStandardMaterial({ color: '#b64e49', roughness: 0.8 });
  const iron = new THREE.MeshStandardMaterial({ color: '#2b2732', roughness: 0.6, metalness: 0.2 });

  const island = new THREE.Mesh(new THREE.CylinderGeometry(15, 19, 5, 20), rock);
  island.position.y = 2;
  lighthouse.add(island);
  for (let level = 0; level < 4; level += 1) {
    const baseY = 4.5 + (level / 4) * 31;
    const topY = 4.5 + ((level + 1) / 4) * 31;
    const baseRadius = 6.2 - (level / 4) * 2.1;
    const topRadius = 6.2 - ((level + 1) / 4) * 2.1;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius, baseRadius, topY - baseY, 18),
      level % 2 === 0 ? chalk : rust,
    );
    band.position.y = (baseY + topY) / 2;
    lighthouse.add(band);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.3, 16), iron);
  gallery.position.y = 36;
  lighthouse.add(gallery);
  const lampGlass = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 18, 12),
    new THREE.MeshBasicMaterial({ color: PALETTE.sunlight, toneMapped: false }),
  );
  lampGlass.position.y = 36.6;
  lighthouse.add(lampGlass);
  const lampHalo = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 16, 12),
    new THREE.MeshBasicMaterial({
      color: PALETTE.lamp,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  lampHalo.position.y = 36.6;
  lighthouse.add(lampHalo);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 4.4, 3.4, 16), iron);
  cap.position.y = 39.6;
  lighthouse.add(cap);

  const sweepGeometry = new THREE.BoxGeometry(1.2, 1.2, 52);
  sweepGeometry.translate(0, 0, 26);
  const sweep = new THREE.Mesh(
    sweepGeometry,
    new THREE.MeshBasicMaterial({
      color: PALETTE.sunlight,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sweep.position.y = 36.6;
  lighthouse.add(sweep);
  const lampGlow = new THREE.PointLight(PALETTE.lamp, 1.6, 240, 2);
  lampGlow.position.y = 36.6;
  lighthouse.add(lampGlow);
  root.add(lighthouse);
  solid.push({ x: LAYOUT.lighthouse.x, z: LAYOUT.lighthouse.z, halfX: 11, halfZ: 11, type: 'lighthouse' });

  // -------------------------------------------------------- harbor details
  for (const spot of [
    { x: 405, z: -120, ry: 0.2 },
    { x: 425, z: 120, ry: -0.4 },
    { x: 355, z: 330, ry: 0.7 },
  ]) {
    craneBeams.push({ ...spot, y: 24, sx: 46, sy: 2.2, sz: 2.2, color: '#d9a15e' });
    craneBeams.push({ x: spot.x - 16, y: 12, z: spot.z, sx: 2.2, sy: 24, sz: 2.2, color: '#6d625a' });
    craneBeams.push({ x: spot.x - 16, y: 23, z: spot.z, sx: 0.7, sy: 22, sz: 0.7, color: '#8c7c68' });
    solid.push({ x: spot.x - 16, z: spot.z, halfX: 3, halfZ: 3, type: 'crane' });
  }

  // --------------------------------------------------------------- helipad
  const pad = LAYOUT.helipad;
  const padBase = new THREE.Mesh(
    new THREE.CylinderGeometry(pad.radius, pad.radius + 2, 2.2, 32),
    new THREE.MeshStandardMaterial({ color: '#3a3d50', roughness: 0.85 }),
  );
  padBase.position.set(pad.x, 1.1, pad.z);
  root.add(padBase);
  const padPaint = new THREE.Mesh(
    new THREE.PlaneGeometry(pad.radius * 1.75, pad.radius * 1.75),
    new THREE.MeshBasicMaterial({ map: padTexture(THREE), transparent: false }),
  );
  padPaint.rotation.x = -Math.PI / 2;
  padPaint.position.set(pad.x, 2.24, pad.z);
  root.add(padPaint);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU;
    beaconBulbs.push({
      x: pad.x + Math.cos(angle) * (pad.radius - 1),
      y: 2.5,
      z: pad.z + Math.sin(angle) * (pad.radius - 1),
      ry: 0,
      sx: 0.55, sy: 0.55, sz: 0.55,
      color: index % 2 === 0 ? PALETTE.lamp : PALETTE.neonBlue,
    });
  }

  // ---------------------------------------------------------- district signs
  const signs = [
    { x: 150, z: -338, title: 'TELUK ARUNA', sub: 'HARBOR DOWNTOWN', color: PALETTE.neonBlue },
    { x: -180, z: -338, title: 'MARINA SENJA', sub: 'SUNSET BEACH', color: PALETTE.neonPink },
  ];
  for (const sign of signs) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(62, 19),
      new THREE.MeshBasicMaterial({ map: signTexture(THREE, sign.title, sign.sub, sign.color) }),
    );
    board.position.set(sign.x, 20, sign.z);
    board.rotation.y = 0.1;
    root.add(board);
    for (const offset of [-24, 24]) {
      craneBeams.push({
        x: sign.x + offset, y: 10, z: sign.z,
        ry: 0,
        sx: 1.6, sy: 20, sz: 1.6,
        color: '#4b4657',
      });
    }
  }

  // ---------------------------------------------------------------- sky/sun
  const sunDirection = new THREE.Vector3(-0.84, 0.18, -0.32).normalize();
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 18),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(PALETTE.zenith) },
        uLow: { value: new THREE.Color(PALETTE.horizon) },
        uSunColor: { value: new THREE.Color(PALETTE.sunlight) },
        uSunDirection: { value: sunDirection },
      },
      vertexShader: `
        varying vec3 vRay;
        void main() {
          vRay = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uLow;
        uniform vec3 uSunColor;
        uniform vec3 uSunDirection;
        varying vec3 vRay;
        void main() {
          vec3 ray = normalize(vRay);
          float height = smoothstep(-0.09, 0.58, ray.y);
          vec3 color = mix(uLow, uTop, height);
          float alignment = max(dot(ray, uSunDirection), 0.0);
          color += uSunColor * pow(alignment, 8.0) * 0.24;
          color += uSunColor * pow(alignment, 140.0) * 1.15;
          gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  skyDome.frustumCulled = false;
  skyDome.name = 'aruna-sky';
  scene.add(skyDome);

  const sunDistance = sunDirection.clone().multiplyScalar(1550);
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(56, 24, 16),
    new THREE.MeshBasicMaterial({ color: PALETTE.sunlight, toneMapped: false, fog: false }),
  );
  sunDisc.position.copy(sunDistance);
  sunDisc.frustumCulled = false;
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(125, 20, 14),
    new THREE.MeshBasicMaterial({
      color: PALETTE.lamp,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
  );
  sunGlow.position.copy(sunDistance);
  sunGlow.frustumCulled = false;
  scene.add(sunGlow);

  const sunset = new THREE.DirectionalLight(PALETTE.sunlight, 2.35);
  sunset.position.copy(sunDirection.clone().multiplyScalar(650));
  sunset.target.position.set(70, 0, 0);
  scene.add(sunset);
  scene.add(sunset.target);
  scene.add(new THREE.HemisphereLight(PALETTE.zenith, PALETTE.soil, 1.25));
  scene.add(new THREE.AmbientLight(PALETTE.horizon, 0.2));

  // --------------------------------------------------------- instanced draw
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const raisedBox = new THREE.BoxGeometry(1, 1, 1);
  raisedBox.translate(0, 0.5, 0);
  const stemShape = new THREE.CylinderGeometry(0.3, 0.52, 1, 5);
  stemShape.translate(0, 0.5, 0);

  function placeBatch(geometry, material, entries, label) {
    if (entries.length === 0) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    mesh.name = label;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    const tint = new THREE.Color();
    entries.forEach((entry, index) => {
      position.set(entry.x || 0, entry.y || 0, entry.z || 0);
      euler.set(entry.rx || 0, entry.ry || 0, entry.rz || 0);
      rotation.setFromEuler(euler);
      scale.set(entry.sx ?? 1, entry.sy ?? 1, entry.sz ?? 1);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      if (entry.color !== undefined) mesh.setColorAt(index, tint.set(entry.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
    return mesh;
  }

  const concrete = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0.04 });
  const glowing = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  placeBatch(unitBox, concrete, laneMarks.filter((piece) => piece.sz > 2), 'road-surfaces');
  placeBatch(unitBox, glowing, laneMarks.filter((piece) => piece.sz <= 2), 'lane-paint');
  placeBatch(unitBox, glowing, neonStrips, 'ring-neon');
  placeBatch(unitBox, concrete, bankBlocks, 'channel-banks');
  placeBatch(unitBox, concrete, bridgePlates, 'bridge-decks');
  placeBatch(unitBox, concrete, bridgeRails, 'bridge-rails');

  const towerSkin = facadeTexture(THREE, surfaceRng, true);
  placeBatch(raisedBox, new THREE.MeshStandardMaterial({
    map: towerSkin,
    emissive: new THREE.Color('#ffd5a4'),
    emissiveMap: towerSkin,
    emissiveIntensity: 0.75,
    roughness: 0.6,
    metalness: 0.15,
  }), towerBlocks, 'downtown-towers');
  placeBatch(unitBox, glowing, towerCrowns, 'tower-crowns');

  const houseSkin = facadeTexture(THREE, surfaceRng, false);
  placeBatch(raisedBox, new THREE.MeshStandardMaterial({
    map: houseSkin,
    emissive: new THREE.Color('#553b40'),
    emissiveMap: houseSkin,
    emissiveIntensity: 0.15,
    roughness: 0.88,
  }), houseBlocks, 'beach-houses');
  placeBatch(unitBox, concrete, houseRoofs, 'house-roofs');

  placeBatch(stemShape, concrete, palmStems, 'palm-trunks');
  placeBatch(frondGeometry(THREE), new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.85,
    side: THREE.DoubleSide,
  }), palmTops, 'palm-crowns');

  placeBatch(unitBox, concrete, pierBoards, 'pier-planks');
  placeBatch(unitBox, concrete, pierPiles, 'pier-posts');
  placeBatch(unitBox, concrete, beaconPosts, 'lamp-posts');
  placeBatch(new THREE.SphereGeometry(0.45, 10, 8), glowing, beaconBulbs, 'lamp-bulbs');
  placeBatch(unitBox, concrete, craneBeams, 'harbor-cranes');

  // ------------------------------------------------------------ public API
  function districtAt(x, z) {
    for (const district of DISTRICTS) {
      if (Math.hypot(x - district.center.x, z - district.center.z) <= district.radius) {
        return district.id;
      }
    }
    let closest = DISTRICTS[0];
    let distance = Infinity;
    for (const district of DISTRICTS) {
      const gap = Math.hypot(x - district.center.x, z - district.center.z);
      if (gap < distance) {
        distance = gap;
        closest = district;
      }
    }
    return closest.id;
  }

  function isRoad(x, z) {
    return roadClearance(x, z) <= 0;
  }

  function update(seconds) {
    tide.value = seconds;
    sweep.rotation.y = seconds * 0.58;
    lampGlow.intensity = 1.4 + Math.sin(seconds * 2.1) * 0.24;
    lampHalo.scale.setScalar(1 + Math.sin(seconds * 2.1) * 0.06);
  }

  return {
    scene,
    root,
    roads,
    palms,
    solid,
    spawnPoints: SPAWNS.map((spawn) => ({ ...spawn })),
    districtAt,
    isRoad,
    overWater: onWater,
    update,
    get districtInfo() {
      return DISTRICTS;
    },
    get size() {
      return WORLD.boundary;
    },
  };
}
