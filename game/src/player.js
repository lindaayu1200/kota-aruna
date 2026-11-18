// KOTA ARUNA — Ara, the lead character: on-foot movement, jumping, and the third-person camera.
//
// Yaw describes where the camera sits around its target: the camera offset is
// (sin(yaw), 0, cos(yaw)) * distance, so the view (and "forward" when walking) points the other way.
import { CITY, ROADS } from './config.js';

const GRAVITY = 38;
const WALK_SPEED = 11;
const RUN_SPEED = 18;
const JUMP_V = 8.2;
const PLAYER_RADIUS = 1.1;

/** Never let Ara walk out over the sea or into the tidal channel (bridges are fine). */
function walkable(x, z) {
  if (x < CITY.beach.west + 2 || x > CITY.halfWidth - 4) return false;
  if (Math.abs(z) > CITY.halfDepth - 4) return false;
  const c = CITY.channel;
  if (x <= c.east && z >= c.centerZ - c.width / 2 && z <= c.centerZ + c.width / 2) {
    return ROADS.bridges.some((b) => Math.abs(x - b.x) <= ROADS.width / 2 + 3);
  }
  return true;
}

export function createPlayer(THREE, scene, city, spawn) {
  const group = new THREE.Group();
  group.name = 'ara-player';

  const jacket = new THREE.MeshStandardMaterial({ color: '#ff6a3d', roughness: 0.68 });
  const jacketTrim = new THREE.MeshStandardMaterial({ color: '#ffc857', roughness: 0.6 });
  const pants = new THREE.MeshStandardMaterial({ color: '#2d2f3a', roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: '#e9b79b', roughness: 0.8 });
  const boots = new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: '#241a24', roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.8), jacket);
  torso.position.y = 2.2;
  const sash = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.28, 0.86), jacketTrim);
  sash.position.y = 2.5;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.92), skin);
  head.position.y = 3.6;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.26, 1.0), hair);
  cap.position.y = 4.05;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.6), pants);
  legL.position.set(-0.35, 0.85, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.6), pants);
  legR.position.set(0.35, 0.85, 0);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.78), boots);
  bootL.position.set(-0.35, 0.17, 0.06);
  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.78), boots);
  bootR.position.set(0.35, 0.17, 0.06);
  group.add(torso, sash, head, cap, legL, legR, bootL, bootR);
  scene.add(group);

  const start = spawn || (city && city.spawnPoints && city.spawnPoints[0]) || { x: -180, z: -180 };
  const pos = new THREE.Vector3(start.x, 0, start.z);
  const verticalVelocity = { y: 0 };
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  let health = 100;
  let inVehicle = false;
  let vehicleRef = null;
  let yaw = 0;
  let pitch = 0.6;
  let distance = 9;
  let lookCooldown = 0;
  let stepPhase = 0;

  function setFromSpawn(s) {
    pos.set(s.x, 0, s.z);
    verticalVelocity.y = 0;
  }

  function resolveBoxes(x, z) {
    const boxes = city.getCollisionBoxes ? city.getCollisionBoxes() : [];
    const r = PLAYER_RADIUS;
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < boxes.length; i += 1) {
        const b = boxes[i];
        if (x + r <= b.minX || x - r >= b.maxX || z + r <= b.minZ || z - r >= b.maxZ) continue;
        const overlaps = [
          [b.maxX + r - x, () => { x = b.maxX + r; }],
          [x - (b.minX - r), () => { x = b.minX - r; }],
          [b.maxZ + r - z, () => { z = b.maxZ + r; }],
          [z - (b.minZ - r), () => { z = b.minZ - r; }],
        ];
        overlaps.sort((a, c) => a[0] - c[0])[0][1]();
      }
    }
    return [x, z];
  }

  function placeCamera(camera, smoothing) {
    const height = inVehicle ? 3.4 : 2.7;
    const reach = inVehicle ? distance + 5 : distance;
    target.set(pos.x, pos.y + height, pos.z);
    desired.set(
      target.x + Math.sin(yaw) * reach * Math.cos(pitch),
      target.y + reach * Math.sin(pitch),
      target.z + Math.cos(yaw) * reach * Math.cos(pitch),
    );
    if (smoothing >= 1) camera.position.copy(desired);
    else camera.position.lerp(desired, smoothing);
    camera.lookAt(target);
  }

  function updateCamera(dt, camera) {
    placeCamera(camera, 1 - Math.pow(0.0001, dt));
  }

  /** Jump the camera straight to the staged view, without a smoothing ramp. */
  function snapCamera(camera) {
    placeCamera(camera, 1);
  }

  function update(dt, input, camera) {
    const look = input.consumeLook ? input.consumeLook() : { x: 0, y: 0 };
    if (look.x || look.y) {
      yaw -= look.x * 0.004;
      pitch = Math.max(-0.1, Math.min(1.3, pitch - look.y * 0.003));
      lookCooldown = 1.4;
    }
    if (lookCooldown > 0) lookCooldown -= dt;
    distance += input.consumeZoom ? input.consumeZoom() : 0;
    distance = Math.max(4, Math.min(28, distance));

    if (inVehicle) {
      // The vehicle drives player.pos; Ara rides along, hidden inside the cabin.
      group.visible = false;
      const car = vehicleRef;
      if (car && lookCooldown <= 0) {
        const behind = car.heading + Math.PI;
        let delta = ((behind - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        yaw += delta * Math.min(1, dt * 1.6);
      }
      pos.y = 0;
      updateCamera(dt, camera);
      return;
    }

    group.visible = true;
    const moveF = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const moveR = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const magnitude = Math.hypot(moveF, moveR);
    let moving = false;
    if (magnitude > 0.001) {
      const dirF = moveF / magnitude;
      const dirR = moveR / magnitude;
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      const wx = dirR * cosY - dirF * sinY;
      const wz = -dirR * sinY - dirF * cosY;
      const stride = (input.run ? RUN_SPEED : WALK_SPEED) * dt;
      let nx = pos.x + wx * stride;
      let nz = pos.z + wz * stride;
      if (walkable(nx, nz)) {
        const resolved = resolveBoxes(nx, nz);
        nx = resolved[0];
        nz = resolved[1];
        if (walkable(nx, nz)) {
          pos.x = nx;
          pos.z = nz;
          moving = true;
        }
      }
      group.rotation.y = Math.atan2(wx, wz);
    }

    if (input.consumeJump && input.consumeJump() && pos.y <= 0.01) verticalVelocity.y = JUMP_V;
    verticalVelocity.y -= GRAVITY * dt;
    pos.y += verticalVelocity.y * dt;
    if (pos.y <= 0) {
      pos.y = 0;
      verticalVelocity.y = 0;
    }

    stepPhase += dt * (input.run ? 15 : 9) * (moving ? 1 : 0);
    legL.rotation.x = Math.sin(stepPhase) * 0.5;
    legR.rotation.x = -Math.sin(stepPhase) * 0.5;
    bootL.rotation.x = legL.rotation.x * 0.4;
    bootR.rotation.x = legR.rotation.x * 0.4;
    group.position.set(pos.x, pos.y, pos.z);
    updateCamera(dt, camera);
  }

  group.position.copy(pos);
  return {
    group,
    pos,
    get health() { return health; },
    set health(value) { health = value; },
    get inVehicle() { return inVehicle; },
    set inVehicle(value) {
      inVehicle = !!value;
      if (!inVehicle) vehicleRef = null;
    },
    get vehicle() { return vehicleRef; },
    set vehicle(car) {
      vehicleRef = car;
      inVehicle = !!car;
    },
    setFromSpawn,
    /** Set the third-person camera rig directly (used by the staged screenshot scenes). */
    setView(view = {}) {
      if (Number.isFinite(view.yaw)) yaw = view.yaw;
      if (Number.isFinite(view.pitch)) pitch = Math.max(-0.1, Math.min(1.3, view.pitch));
      if (Number.isFinite(view.distance)) distance = Math.max(4, Math.min(28, view.distance));
      lookCooldown = view.holdYaw ? 100000 : 0;
    },
    getView: () => ({ yaw, pitch, distance }),
    snapCamera,
    update,
  };
}
