// Geometry for the two districts. Everything is built from primitives and a
// seeded stream, so the same seed always produces the same skyline.

import * as THREE from 'three';
import { CAR_SPAWNS, MAP, MISSIONS, PALETTE } from './config.js';
import { between, chance, choose, whole } from './random.js';

const RESERVED = [
  ...CAR_SPAWNS.map(([x, z]) => [x, z, 22]),
  ...MAP.workshops.map((p) => [p.x, p.z, 34]),
  ...MAP.helipads.map((p) => [p.x, p.z, 24]),
  ...MISSIONS.flatMap((m) => (m.cases ?? []).map(([x, z]) => [x, z, 16])),
  [132, -300, 34], [-180, -306, 30], [-430, -356, 30], [0, -170, 24], [0, 178, 24],
];

function nearReserved(x, z, padding = 0) {
  return RESERVED.some(([rx, rz, radius]) => Math.hypot(x - rx, z - rz) < radius + padding);
}

function box(parent, width, height, depth, color, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshLambertMaterial({ color, ...options }),
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function windowTexture(rng, east) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = east ? '#24323f' : '#48504f';
  ctx.fillRect(0, 0, 64, 128);
  const lit = east ? ['#ffd08a', '#74d9e0', '#ff9f6e'] : ['#ffd9a3', '#a8dad0'];
  for (let row = 1; row < 15; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const isLit = chance(rng, east ? 0.45 : 0.2);
      ctx.fillStyle = isLit ? choose(rng, lit) : east ? '#15222c' : '#2f3838';
      ctx.fillRect(4 + col * 10, row * 8 + 1, 6, 4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function buildSky(scene) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      low: { value: new THREE.Color(PALETTE.skyLow) },
      sun: { value: new THREE.Color(PALETTE.sun) },
    },
    vertexShader: `varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `varying vec3 vDir;
      uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sun;
      void main() {
        float h = clamp(vDir.y * 1.5 + 0.1, -1.0, 1.0);
        vec3 colour = h > 0.0 ? mix(mid, top, pow(h, 0.7)) : mix(low, mid, clamp(-h * 2.0, 0.0, 1.0));
        vec3 sunDir = normalize(vec3(-0.75, 0.11, -0.66));
        float halo = pow(max(dot(vDir, sunDir), 0.0), 42.0);
        float disc = smoothstep(0.9975, 0.9992, dot(vDir, sunDir));
        colour += sun * (halo * 0.55 + disc * 0.95);
        gl_FragColor = vec4(colour, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1700, 32, 20), material);
  scene.add(dome);
  return dome;
}

function buildGround(scene, rng) {
  const ground = new THREE.Group();
  const width = MAP.half - MAP.channel;
  for (const sign of [-1, 1]) {
    const x = sign * (MAP.channel + width / 2);
    box(ground, width, 2.8, MAP.half * 2, PALETTE.land, x, MAP.landY - 1.4, 0);
    box(ground, 24, 0.16, MAP.half * 2, PALETTE.sand, sign * (MAP.channel + 10), MAP.landY + 0.05, 0);
  }

  const waterGeo = new THREE.PlaneGeometry(1200, 1200, 56, 56);
  waterGeo.rotateX(-Math.PI / 2);
  const base = Float32Array.from(waterGeo.attributes.position.array);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({
    color: PALETTE.water,
    shininess: 95,
    specular: 0xffcfa1,
    transparent: true,
    opacity: 0.96,
    flatShading: true,
  }));
  water.position.y = MAP.waterY;
  scene.add(water);

  for (const z of MAP.bridges) {
    box(ground, MAP.channel * 2 + 40, 1.1, MAP.bridgeWidth, '#444850', 0, MAP.landY - 0.15, z);
    for (const side of [-1, 1]) {
      box(ground, MAP.channel * 2 + 40, 1.2, 0.8, '#9a9a9c', 0, MAP.landY + 0.9, z + side * MAP.bridgeWidth / 2);
    }
    for (let x = -40; x <= 40; x += 20) {
      for (const side of [-1, 1]) {
        box(ground, 0.7, 5, 0.7, '#6d7278', x, MAP.landY + 3, z + side * (MAP.bridgeWidth / 2 - 1));
        box(ground, 1.8, 0.7, 1.8, '#ffd9a0', x, MAP.landY + 5.4, z + side * (MAP.bridgeWidth / 2 - 1), { emissive: '#ffb45f', emissiveIntensity: 0.8 });
      }
    }
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(238, 6.5, 6, 100),
    new THREE.MeshLambertMaterial({ color: PALETTE.road }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.scale.set(1, 0.78, 1);
  ring.position.set(278, MAP.landY + 0.07, 20);
  ground.add(ring);

  for (const side of [-1, 1]) {
    for (let x = -MAP.half + 40; x < MAP.half - 20; x += MAP.block) {
      if (side * x < MAP.channel + 18) continue;
      box(ground, 12, 0.08, MAP.half * 2 - 40, PALETTE.road, x, MAP.landY + 0.05, 0);
    }
    for (let z = -MAP.half + 44; z < MAP.half - 20; z += MAP.block) {
      const length = MAP.half - MAP.channel - 20;
      box(ground, length, 0.08, 12, PALETTE.road, side * (MAP.channel + length / 2 + 10), MAP.landY + 0.05, z);
    }
  }

  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const radius = between(rng, 900, 1250);
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(between(rng, 100, 220), between(rng, 110, 260), 5),
      new THREE.MeshLambertMaterial({ color: i % 2 ? '#4b4059' : '#3f475a', flatShading: true }),
    );
    hill.position.set(Math.sin(angle) * radius, 20, Math.cos(angle) * radius);
    scene.add(hill);
  }

  scene.add(ground);
  return { water, base };
}

function buildBuildings(scene, rng) {
  const eastTex = windowTexture(rng, true);
  const westTex = windowTexture(rng, false);
  const groups = [
    { side: 1, mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: eastTex }), 260), texture: eastTex },
    { side: -1, mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: westTex }), 260), texture: westTex },
  ];
  const dummy = new THREE.Object3D();
  const centres = [];
  for (const group of groups) {
    let count = 0;
    for (let ix = 0; ix < 5; ix += 1) {
      for (let iz = 0; iz < 10; iz += 1) {
        if (count >= group.mesh.count) break;
        const baseX = group.side * (MAP.channel + 58 + ix * MAP.block);
        const baseZ = -440 + iz * MAP.block;
        for (let n = 0; n < 2; n += 1) {
          if (count >= group.mesh.count) break;
          const x = baseX + between(rng, -24, 24);
          const z = baseZ + between(rng, -24, 24);
          if (Math.abs(x) > MAP.half - 40 || nearReserved(x, z, 10)) continue;
          const downtown = group.side > 0 && Math.hypot(x - 150, z + 250) < 260;
          const height = downtown ? between(rng, 26, 86) : between(rng, 10, 42);
          const w = between(rng, 22, 42);
          const d = between(rng, 22, 42);
          dummy.position.set(x, MAP.landY + height / 2, z);
          dummy.scale.set(w, height, d);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          group.mesh.setMatrixAt(count, dummy.matrix);
          group.mesh.setColorAt(count, new THREE.Color(chance(rng, 0.5) ? choose(rng, ['#d5d0c7', '#b8c9cd', '#d9c1a3']) : choose(rng, ['#97b6bb', '#c9b4a2'])));
          centres.push([x, z, Math.max(w, d) / 2]);
          count += 1;
        }
      }
    }
    group.mesh.count = count;
    group.mesh.instanceMatrix.needsUpdate = true;
    if (group.mesh.instanceColor) group.mesh.instanceColor.needsUpdate = true;
    scene.add(group.mesh);
  }
  return centres;
}

function buildHarbour(scene, rng) {
  const group = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const x = 92 + (i % 2) * 26;
    const z = -372 + i * 44;
    box(group, 6, 46, 6, '#d9b56b', x, MAP.landY + 23, z);
    box(group, 64, 3, 5, '#e07b4f', x + 25, MAP.landY + 45, z);
    box(group, 1, 26, 1, '#d6d6cf', x + 48, MAP.landY + 32, z);
    box(group, 12, 3, 7, '#889097', x + 48, MAP.landY + 19, z);
  }
  const colours = ['#d26345', '#3f8d9b', '#e0b24d', '#6d8cc0', '#b9585e'];
  const containers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(14, 6, 7),
    new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    96,
  );
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const x = 112 + column * 17;
      const z = -398 + row * 15;
      const stack = whole(rng, 1, 3);
      for (let level = 0; level < stack && index < containers.count; level += 1) {
        dummy.position.set(x, MAP.landY + 3 + level * 6.1, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        containers.setMatrixAt(index, dummy.matrix);
        containers.setColorAt(index, new THREE.Color(choose(rng, colours)));
        index += 1;
      }
    }
  }
  containers.count = index;
  containers.instanceMatrix.needsUpdate = true;
  if (containers.instanceColor) containers.instanceColor.needsUpdate = true;
  group.add(containers);
  scene.add(group);
}

function buildMarina(scene, rng) {
  const group = new THREE.Group();
  box(group, 92, 1.2, 14, '#96704c', -128, MAP.landY + 1, -318);
  for (let z = -348; z <= -290; z += 12) {
    for (const x of [-158, -100]) box(group, 1.3, 7, 1.3, '#6b533d', x, MAP.waterY + 2, z);
  }
  for (let i = 0; i < 3; i += 1) {
    const boat = box(group, 6, 2.4, 15, choose(rng, ['#e8e4d9', '#e2755d', '#74b6b2']), -190 - i * 22, MAP.waterY + 1.2, -330 + i * 16);
    boat.rotation.y = between(rng, -0.3, 0.3);
    box(group, 3, 5, 4, '#e8d6ae', boat.position.x, MAP.waterY + 4, boat.position.z);
  }

  const lighthouse = new THREE.Group();
  for (let i = 0; i < 6; i += 1) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5 - i * 0.45, 7 - i * 0.45, 8, 12),
      new THREE.MeshLambertMaterial({ color: i % 2 ? '#e8dfd2' : '#cf6053' }),
    );
    band.position.y = 4 + i * 8;
    lighthouse.add(band);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: '#ffe1a3' }),
  );
  lamp.position.y = 53;
  lighthouse.add(lamp);
  const sweep = new THREE.Mesh(
    new THREE.ConeGeometry(13, 90, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ffdda1', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  sweep.position.set(0, 52, -45);
  sweep.rotation.x = Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.add(sweep);
  pivot.position.y = 0;
  lighthouse.add(pivot);
  lighthouse.position.set(-430, MAP.landY, -356);
  scene.add(lighthouse);
  scene.add(group);
  return pivot;
}

function buildPalms(scene, rng) {
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.55, 0.85, 10, 6),
    new THREE.MeshLambertMaterial({ color: '#8b6a4b' }),
    120,
  );
  const leaves = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.4, 11, 5),
    new THREE.MeshLambertMaterial({ color: '#4f8f70', side: THREE.DoubleSide, flatShading: true }),
    720,
  );
  const dummy = new THREE.Object3D();
  let leafIndex = 0;
  let palmIndex = 0;
  for (let i = 0; i < 120; i += 1) {
    const x = between(rng, -490, -66);
    const z = between(rng, -470, 470);
    if (Math.abs(x + 50) < 18 && Math.abs(z + 318) < 50) continue;
    if (nearReserved(x, z, 6)) continue;
    dummy.position.set(x, MAP.landY + 5, z);
    dummy.rotation.set(between(rng, -0.08, 0.08), 0, between(rng, -0.08, 0.08));
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunk.setMatrixAt(palmIndex, dummy.matrix);
    for (let f = 0; f < 6 && leafIndex < leaves.count; f += 1) {
      const angle = (f / 6) * Math.PI * 2 + i;
      dummy.position.set(x + Math.cos(angle) * 3.6, MAP.landY + 10.4, z + Math.sin(angle) * 3.6);
      dummy.rotation.set(Math.cos(angle) * 0.9, angle, Math.sin(angle) * 0.9);
      dummy.scale.set(1, 1, 0.45);
      dummy.updateMatrix();
      leaves.setMatrixAt(leafIndex, dummy.matrix);
      leaves.setColorAt(leafIndex, new THREE.Color(chance(rng, 0.5) ? '#4f8f70' : '#5fa07a'));
      leafIndex += 1;
    }
    palmIndex += 1;
  }
  trunk.count = palmIndex;
  leaves.count = leafIndex;
  trunk.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunk, leaves);
}

function buildProps(scene, rng) {
  const group = new THREE.Group();
  for (const pad of MAP.helipads) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(17, 17, 0.4, 32),
      new THREE.MeshLambertMaterial({ color: '#3d424b' }),
    );
    disc.position.set(pad.x, MAP.landY + 0.25, pad.z);
    group.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(15, 0.5, 6, 40),
      new THREE.MeshBasicMaterial({ color: '#ffcc7d' }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pad.x, MAP.landY + 0.5, pad.z);
    group.add(ring);
    box(group, 1.6, 0.2, 10, '#e8e6dd', pad.x - 3, MAP.landY + 0.55, pad.z);
    box(group, 1.6, 0.2, 10, '#e8e6dd', pad.x + 3, MAP.landY + 0.55, pad.z);
    box(group, 7, 0.2, 1.6, '#e8e6dd', pad.x, MAP.landY + 0.55, pad.z);
  }

  for (const shop of MAP.workshops) {
    box(group, 34, 13, 28, '#6c7d82', shop.x, MAP.landY + 6.5, shop.z);
    box(group, 36, 2, 30, '#d9794a', shop.x, MAP.landY + 13, shop.z);
    box(group, 22, 5, 0.6, '#ffca76', shop.x, MAP.landY + 8, shop.z + 14.3, { emissive: '#e08a3c', emissiveIntensity: 0.8 });
  }

  const pole = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.35, 0.4, 9, 5),
    new THREE.MeshLambertMaterial({ color: '#777c84' }),
    160,
  );
  const bulb = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.2, 0.8, 1.4),
    new THREE.MeshBasicMaterial({ color: '#ffd6a0' }),
    160,
  );
  const dummy = new THREE.Object3D();
  let used = 0;
  for (let i = 0; i < 160; i += 1) {
    const side = i % 2 ? 1 : -1;
    const x = side * (MAP.channel + 28 + (i % 5) * MAP.block);
    const z = -460 + Math.floor(i / 5) * MAP.block * 0.65;
    if (Math.abs(x) > MAP.half - 24 || Math.abs(z) > MAP.half - 24) continue;
    dummy.position.set(x, MAP.landY + 4.5, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pole.setMatrixAt(used, dummy.matrix);
    dummy.position.y = MAP.landY + 9.2;
    dummy.updateMatrix();
    bulb.setMatrixAt(used, dummy.matrix);
    used += 1;
  }
  pole.count = used;
  bulb.count = used;
  pole.instanceMatrix.needsUpdate = true;
  bulb.instanceMatrix.needsUpdate = true;
  group.add(pole, bulb);

  for (let i = 0; i < 26; i += 1) {
    const side = chance(rng, 0.5) ? 1 : -1;
    const x = side * between(rng, 70, 470);
    const z = between(rng, -460, 460);
    if (nearReserved(x, z)) continue;
    const hue = choose(rng, ['#ff9e6b', '#6ce0d0', '#ffd166', '#c29cff']);
    const sign = box(group, between(rng, 8, 20), between(rng, 3, 7), 0.8, hue, x, between(rng, 12, 24), z, { emissive: hue, emissiveIntensity: 0.6 });
    sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  scene.add(group);
}

export function districtAt(x, z) {
  if (Math.abs(x) < MAP.channel) return 'water';
  return x > 0 ? 'east' : 'west';
}

export function onRoad(x, z) {
  const grid = (value) => Math.abs(((value + 46) % MAP.block + MAP.block) % MAP.block - MAP.block / 2) < 9;
  if (Math.abs(x) < MAP.channel) return MAP.bridges.some((b) => Math.abs(z - b) < MAP.bridgeWidth / 2);
  return grid(x) || grid(z);
}

export function canDrive(x, z) {
  if (Math.abs(x) > MAP.half - 18 || Math.abs(z) > MAP.half - 18) return false;
  if (Math.abs(x) >= MAP.channel - 2) return true;
  return MAP.bridges.some((b) => Math.abs(z - b) < MAP.bridgeWidth / 2 - 2);
}

export function makeVehicle(kind, colour, police = false) {
  const group = new THREE.Group();
  const paint = police ? '#f1f4f7' : colour;
  const isHeli = kind === 'heli';
  if (isHeli) {
    box(group, 3.4, 2.8, 8.6, paint, 0, 0.7, 0);
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 12, 10),
      new THREE.MeshPhongMaterial({ color: '#2d5d72', shininess: 90, transparent: true, opacity: 0.85 }),
    );
    cockpit.scale.set(1, 0.8, 1.35);
    cockpit.position.set(0, 1.1, 3.1);
    group.add(cockpit);
    const tail = box(group, 0.9, 1, 6, paint, 0, 1.3, -6.6);
    tail.rotation.x = -0.12;
    const rotor = box(group, 22, 0.24, 0.9, '#353b42', 0, 3.1, 0.3);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.7, 8), new THREE.MeshLambertMaterial({ color: '#2d3238' }));
    hub.position.set(0, 3.1, 0.3);
    group.add(hub, rotor);
    const tailRotor = box(group, 0.2, 4.4, 0.2, '#353b42', 0.7, 2.3, -9.3);
    box(group, 3.3, 0.4, 0.8, '#ffcf8d', 0, -0.5, 4.1, { emissive: '#ffb15f', emissiveIntensity: 0.9 });
    group.userData.rotor = rotor;
    group.userData.tailRotor = tailRotor;
  } else {
    const length = kind === 'van' ? 5.4 : 4.4;
    box(group, 2.6, 1.1, length, paint, 0, 1.15, 0);
    box(group, 2.35, 1.25, length * 0.48, police ? '#26313c' : '#25485a', 0, 2.1, -0.2);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.62, 0.45, 12),
          new THREE.MeshLambertMaterial({ color: '#22262b' }),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(sx * 1.32, 0.65, sz * length * 0.32);
        group.add(wheel);
      }
    }
    for (const sx of [-1, 1]) {
      box(group, 0.7, 0.35, 0.15, '#ffe6b0', sx * 0.85, 1.3, length / 2 + 0.05, { emissive: '#ffd08a', emissiveIntensity: 0.9 });
      box(group, 0.7, 0.3, 0.15, '#e3514a', sx * 0.85, 1.3, -length / 2 - 0.05, { emissive: '#e3514a', emissiveIntensity: 0.7 });
    }
    if (police) {
      box(group, 2.7, 0.5, 4.4, '#23303b', 0, 1.85, -0.2);
      const bar = box(group, 2.2, 0.35, 0.6, '#5b6b78', 0, 2.9, 0.2);
      bar.userData.siren = true;
      group.userData.siren = [box(group, 0.9, 0.35, 0.55, '#ff4f52', -0.55, 2.98, 0.2, { emissive: '#ff4f52', emissiveIntensity: 1 }), box(group, 0.9, 0.35, 0.55, '#4f8dff', 0.55, 2.98, 0.2, { emissive: '#4f8dff', emissiveIntensity: 0.1 })];
    }
  }
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(isHeli ? 5 : 2.8, 20),
    new THREE.MeshBasicMaterial({ color: '#10141a', transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.08;
  group.add(shadow);
  return group;
}

export function makePed(colour = '#e8c9a0') {
  const group = new THREE.Group();
  box(group, 1.05, 1.5, 0.7, colour, 0, 1.6, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshLambertMaterial({ color: '#d9a77c' }));
  head.position.y = 2.65;
  group.add(head);
  box(group, 0.32, 1.2, 0.35, '#353b46', -0.28, 0.6, 0);
  box(group, 0.32, 1.2, 0.35, '#353b46', 0.28, 0.6, 0);
  group.userData.legs = [group.children[group.children.length - 2], group.children[group.children.length - 1]];
  return group;
}

export function makeCase() {
  const group = new THREE.Group();
  box(group, 2.6, 1.8, 1.8, '#d5a94d', 0, 1, 0, { emissive: '#7a541b', emissiveIntensity: 0.5 });
  box(group, 2.8, 0.22, 2, '#ffe1a0', 0, 1.9, 0, { emissive: '#ffc766', emissiveIntensity: 0.9 });
  return group;
}

export function makeMarker(colour = '#ffd166') {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.55, 6, 32),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.5;
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 4.5, 52, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 26;
  group.add(beam);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.3),
    new THREE.MeshBasicMaterial({ color: colour }),
  );
  diamond.position.y = 11;
  group.add(diamond);
  group.userData.diamond = diamond;
  return group;
}

export function buildCity(scene, rng) {
  scene.fog = new THREE.FogExp2(0xcf8a72, 0.00125);
  scene.add(new THREE.HemisphereLight(0xffd7a8, 0x1d4b58, 1.85));
  const sun = new THREE.DirectionalLight(0xffd1a1, 1.55);
  sun.position.set(-320, 210, -400);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x63c8d8, 0.45);
  fill.position.set(280, 160, 260);
  scene.add(fill);

  const dome = buildSky(scene);
  const { water, base } = buildGround(scene, rng);
  const buildings = buildBuildings(scene, rng);
  buildHarbour(scene, rng);
  const lighthouseBeam = buildMarina(scene, rng);
  buildPalms(scene, rng);
  buildProps(scene, rng);

  let frame = 0;
  return {
    buildings,
    update(time, cameraPosition) {
      dome.position.copy(cameraPosition);
      frame += 1;
      const attr = water.geometry.attributes.position;
      for (let i = 0; i < attr.count; i += 1) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        attr.array[i * 3 + 1] = Math.sin(x * 0.028 + time * 1.3) * 0.55 + Math.cos(z * 0.035 - time * 0.9) * 0.42;
      }
      attr.needsUpdate = true;
      if (frame % 5 === 0) water.geometry.computeVertexNormals();
      lighthouseBeam.rotation.y = time * 0.45;
    },
    districtAt,
    onRoad,
    canDrive,
  };
}
