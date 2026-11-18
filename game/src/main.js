import * as THREE from 'three';
import { CITY_NAME, STEP } from './config.js';
import { createCity } from './city.js';

const params = new URLSearchParams(window.location.search);
const requestedSeed = Number.parseInt(params.get('seed') ?? '1337', 10);
const seed = Number.isFinite(requestedSeed) ? requestedSeed : 1337;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor('#211637', 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.5,
  4200,
);

const city = createCity(THREE, seed);
const orbitTarget = new THREE.Vector3(180, 48, 40);
const orbit = {
  radius: 520,
  height: 255,
  angle: 0.62,
  speed: 0.032,
};

function placeCamera(time) {
  orbit.angle = 0.62 + time * orbit.speed;
  camera.position.set(
    orbitTarget.x + Math.cos(orbit.angle) * orbit.radius,
    orbit.height + Math.sin(time * 0.11) * 16,
    orbitTarget.z + Math.sin(orbit.angle) * orbit.radius,
  );
  camera.lookAt(orbitTarget.x, 62, orbitTarget.z);
}

placeCamera(0);

const districtLabel = document.getElementById('hud-district');
const seedLabel = document.getElementById('hud-seed');
if (seedLabel) seedLabel.textContent = `SEED ${seed}`;
if (districtLabel) districtLabel.textContent = 'TELUK ARUNA';
document.title = `${CITY_NAME} — Sunset Harbor`;

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
});

let previous = performance.now() / 1000;
let accumulator = 0;
let simTime = 0;

function frame(nowMs) {
  const now = nowMs / 1000;
  let delta = now - previous;
  previous = now;
  if (delta > 0.25) delta = 0.25;

  accumulator += delta;
  while (accumulator >= STEP) {
    simTime += STEP;
    city.update(simTime);
    accumulator -= STEP;
  }

  placeCamera(simTime);
  renderer.render(city.scene, camera);
  window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);

// Handy for scene inspection during development; nothing in the game reads it.
window.__KOTA_ARUNA = { city, camera, renderer, seed };
