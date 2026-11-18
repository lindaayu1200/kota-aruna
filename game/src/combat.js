// KOTA ARUNA — four weapon slots, camera-crosshair shooting, tracers, muzzle flash and right-mouse
// aim. Combat reports hits to traffic (peds/cars) and police (officers/patrol cars); wanted stars
// are raised by those systems so every crime has a single owner.
import { createRandom } from './random.js';

const CENTER = { x: 0, y: 0 };
const WEAPONS = [
  {
    slot: 1, id: 'fists', name: 'Fists', damage: 15, fireRate: 2.4, spread: 0,
    range: 3.4, ammo: Infinity, maxAmmo: Infinity, pellets: 1, automatic: false, reloadTime: 0,
  },
  {
    slot: 2, id: 'pistol', name: 'Surya-9', damage: 27, fireRate: 5.5, spread: 0.018,
    range: 130, ammo: 42, maxAmmo: 42, pellets: 1, automatic: false, reloadTime: 1.1,
  },
  {
    slot: 3, id: 'smg', name: 'Badai', damage: 14, fireRate: 12, spread: 0.055,
    range: 95, ammo: 180, maxAmmo: 180, pellets: 1, automatic: true, reloadTime: 1.6,
  },
  {
    slot: 4, id: 'shotgun', name: 'Halilintar', damage: 12, fireRate: 1.15, spread: 0.13,
    range: 60, ammo: 32, maxAmmo: 32, pellets: 8, automatic: false, reloadTime: 2.0,
  },
];

function flashTexture(THREE) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,248,214,1)');
  gradient.addColorStop(0.32, 'rgba(255,198,104,0.75)');
  gradient.addColorStop(1, 'rgba(255,128,48,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCombat(THREE, player, traffic, police, onEvent) {
  const emit = (type, data) => {
    if (typeof onEvent === 'function') onEvent(type, data || {});
  };
  const random = createRandom(0xC0ABA7);
  const weapons = WEAPONS.map((spec) => ({ ...spec }));
  const scene = player && player.group ? player.group.parent : null;
  const raycaster = new THREE.Raycaster();
  const sphere = new THREE.Sphere();
  const hitPoint = new THREE.Vector3();
  const basisRight = new THREE.Vector3();
  const basisUp = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  const endpoint = new THREE.Vector3();
  const meleeCenter = new THREE.Vector3();
  const tracerPool = [];
  const shotDir = new THREE.Vector3();
  const nearestPoint = new THREE.Vector3();
  const targetPool = [];
  const targetsOut = [];

  let current = weapons[0];
  let cooldown = 0;
  let reloadTimer = 0;
  let fireLatch = false;
  let aiming = false;
  let baseFov = null;
  let flashTimer = 0;
  const stateOut = {
    slot: 0, name: '', ammo: 0, aiming: false, reloading: false, reloadProgress: 0,
  };
  const tracers = [];
  const effects = scene ? new THREE.Group() : null;
  if (effects) {
    effects.name = 'combat-effects';
    scene.add(effects);
  }

  const texture = flashTexture(THREE);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color: '#ffe6a4',
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  }));
  flash.scale.set(2.2, 2.2, 1);
  flash.visible = false;
  const flashLight = new THREE.PointLight('#ffcb7a', 0, 14, 2);
  if (effects) effects.add(flash, flashLight);

  /** Target descriptors are pooled: firing never allocates fresh Vector3s or objects. */
  function collectTargets() {
    targetsOut.length = 0;
    let index = 0;
    const add = (kind, ref, x, y, z, radius) => {
      let target = targetPool[index];
      if (!target) {
        target = { kind: '', ref: null, center: new THREE.Vector3(), radius: 0 };
        targetPool.push(target);
      }
      target.kind = kind;
      target.ref = ref;
      target.center.set(x, y, z);
      target.radius = radius;
      targetsOut.push(target);
      index += 1;
    };
    if (police && typeof police.getHitTargets === 'function') {
      for (const target of police.getHitTargets()) {
        add(target.kind, target.ref, target.center.x, target.center.y, target.center.z, target.radius);
      }
    }
    if (traffic) {
      for (const ped of (traffic.peds || [])) {
        if (ped.state === 'down') continue;
        add('ped', ped, ped.pos.x, ped.pos.y + 1.35, ped.pos.z, 0.8);
      }
      for (const car of (typeof traffic.getCars === 'function' ? traffic.getCars() : [])) {
        add('car', car, car.pos.x, car.pos.y + 1.1, car.pos.z, (car.radius || 2.3) * 0.85);
      }
      for (const car of (traffic.aiCars || [])) {
        add('traffic-car', car, car.pos.x, car.pos.y + 1.1, car.pos.z, car.radius || 2.3);
      }
    }
    return targetsOut;
  }

  function applyDamage(target, damage, point) {
    if (!target) return;
    switch (target.kind) {
      case 'cop':
      case 'police-car':
        if (police && typeof police.hitUnit === 'function') police.hitUnit(target.ref, damage, 'player');
        emit('hit', { kind: target.kind, unit: target.ref && target.ref.name, damage });
        break;
      case 'ped':
        if (traffic && typeof traffic.knockDown === 'function') {
          traffic.knockDown(target.ref, true);
        } else if (police && typeof police.reportCrime === 'function') {
          police.reportCrime('shoot-ped', 2);
        }
        emit('hit', { kind: 'ped', damage });
        break;
      case 'car':
      case 'traffic-car':
        if (traffic && typeof traffic.damageCar === 'function') traffic.damageCar(target.ref, damage);
        else if (target.ref) target.ref.health = Math.max(0, (target.ref.health || 100) - damage);
        if (police && typeof police.reportCrime === 'function') police.reportCrime('shoot-car', 1);
        emit('hit', { kind: target.kind, damage });
        break;
      default:
        break;
    }
    if (target.kind !== 'cop' && target.kind !== 'police-car' && traffic && typeof traffic.onGunshot === 'function') {
      traffic.onGunshot(point.x, point.z, 24);
    }
  }

  function addTracer(from, to, color) {
    if (!effects) return;
    let tracer = tracerPool.pop();
    if (!tracer) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
        transparent: true, opacity: 0.95, depthWrite: false, fog: false,
      }));
      effects.add(line);
      tracer = { line, life: 0, maxLife: 0.11 };
    }
    const positions = tracer.line.geometry.getAttribute('position');
    positions.array[0] = from.x;
    positions.array[1] = from.y;
    positions.array[2] = from.z;
    positions.array[3] = to.x;
    positions.array[4] = to.y;
    positions.array[5] = to.z;
    positions.needsUpdate = true;
    tracer.line.material.color.set(color);
    tracer.line.material.opacity = 0.95;
    tracer.line.visible = true;
    tracer.life = tracer.maxLife;
    tracers.push(tracer);
    if (tracers.length > 48) {
      const old = tracers.shift();
      old.line.visible = false;
      tracerPool.push(old);
    }
  }

  function showFlash() {
    flashTimer = 0.065;
    flash.visible = true;
    flash.position.copy(muzzle);
    flashLight.position.copy(muzzle);
    flashLight.intensity = 12;
  }

  function computeMuzzle(camera) {
    camera.getWorldDirection(forward);
    const flat = Math.hypot(forward.x, forward.z);
    if (flat > 0.001) {
      forward.x /= flat;
      forward.z /= flat;
    }
    forward.y = 0;
    muzzle.set(
      player.pos.x + forward.x * 1.4,
      player.pos.y + (player.inVehicle ? 3.1 : 2.1),
      player.pos.z + forward.z * 1.4,
    );
  }

  function melee(camera, targets) {
    let best = null;
    let bestDistance = Infinity;
    for (const target of targets) {
      const dx = target.center.x - muzzle.x;
      const dz = target.center.z - muzzle.z;
      const distance = Math.hypot(dx, dz);
      if (distance > current.range + target.radius || distance > bestDistance) continue;
      if ((dx * forward.x + dz * forward.z) / (distance || 1) < 0.15) continue;
      bestDistance = distance;
      best = target;
    }
    if (best) applyDamage(best, current.damage, best.center);
    addTracer(muzzle, best ? best.center : endpoint.copy(muzzle).addScaledVector(forward, current.range), '#ffd79a');
    emit('swing', { weapon: current.name, hit: !!best });
  }

  function shoot(camera, targets) {
    computeMuzzle(camera);
    camera.updateMatrixWorld();
    basisRight.setFromMatrixColumn(camera.matrixWorld, 0);
    basisUp.setFromMatrixColumn(camera.matrixWorld, 1);
    raycaster.setFromCamera(CENTER, camera);
    const origin = raycaster.ray.origin;
    const spread = current.spread * (aiming ? 0.42 : 1);
    const color = current.id === 'smg' ? '#9be8ff' : current.id === 'shotgun' ? '#ffb47a' : '#ffe3a3';
    const pellets = current.pellets;

    for (let pellet = 0; pellet < pellets; pellet += 1) {
      const direction = shotDir.copy(raycaster.ray.direction);
      if (spread > 0) {
        direction.addScaledVector(basisRight, random.range(-spread, spread));
        direction.addScaledVector(basisUp, random.range(-spread, spread));
        direction.normalize();
      }
      raycaster.set(origin, direction);
      raycaster.far = current.range;
      let nearest = null;
      let nearestDistance = Infinity;
      for (const target of targets) {
        sphere.center.copy(target.center);
        sphere.radius = target.radius;
        const point = raycaster.ray.intersectSphere(sphere, hitPoint);
        if (!point) continue;
        const distance = origin.distanceTo(point);
        if (distance >= nearestDistance || distance > current.range) continue;
        nearestDistance = distance;
        nearest = target;
        nearestPoint.copy(point);
      }
      const end = nearest ? nearestPoint : endpoint.copy(origin).addScaledVector(direction, current.range);
      addTracer(muzzle, end, color);
      if (nearest) applyDamage(nearest, current.damage, nearestPoint);
    }
    showFlash();
    emit('shot', { weapon: current.name, slot: current.slot, ammo: current.ammo });
  }

  function startReload() {
    if (current.reloadTime <= 0 || current.ammo >= current.maxAmmo || reloadTimer > 0) return;
    reloadTimer = current.reloadTime;
    emit('reload', { weapon: current.name, duration: reloadTimer });
  }

  function select(slot) {
    const next = weapons.find((weapon) => weapon.slot === slot);
    if (!next || next === current) return;
    current = next;
    reloadTimer = 0;
    cooldown = Math.max(cooldown, 0.18);
    fireLatch = true;
    emit('weapon', { slot: current.slot, name: current.name });
  }

  function update(dt, input, camera) {
    if (!camera) return;
    if (baseFov === null) baseFov = camera.fov;
    const slot = input && typeof input.consumeWeapon === 'function' ? input.consumeWeapon() : 0;
    if (slot >= 1 && slot <= 4) select(slot);
    if (input && typeof input.consumeReload === 'function' && input.consumeReload()) startReload();

    aiming = !!(input && input.aim);
    const targetFov = baseFov * (aiming ? 0.78 : 1);
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 9);
      camera.updateProjectionMatrix();
    }

    cooldown -= dt;
    if (reloadTimer > 0) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        reloadTimer = 0;
        current.ammo = current.maxAmmo;
        emit('reloaded', { weapon: current.name });
      }
    }
    if (flashTimer > 0) {
      flashTimer -= dt;
      flashLight.intensity = Math.max(0, flashLight.intensity - dt * 180);
      if (flashTimer <= 0) {
        flash.visible = false;
        flashLight.intensity = 0;
      }
    }
    for (let i = tracers.length - 1; i >= 0; i -= 1) {
      const tracer = tracers[i];
      tracer.life -= dt;
      if (tracer.life <= 0) {
        tracer.line.visible = false;
        tracerPool.push(tracer);
        tracers.splice(i, 1);
      } else {
        tracer.line.material.opacity = 0.95 * (tracer.life / tracer.maxLife);
      }
    }

    const wantsFire = !!(input && input.fire);
    if (!wantsFire) fireLatch = false;
    if (!wantsFire || cooldown > 0 || reloadTimer > 0) return;
    if (!current.automatic && fireLatch) return;
    if (current.ammo <= 0) {
      startReload();
      return;
    }

    cooldown = 1 / current.fireRate;
    if (!current.automatic) fireLatch = true;
    if (current.ammo !== Infinity) current.ammo -= 1;

    if (current.id === 'fists') {
      computeMuzzle(camera);
      melee(camera, collectTargets());
    } else {
      shoot(camera, collectTargets());
    }
  }

  return {
    update,
    getWeapons: () => weapons,
    getCurrent: () => current,
    getState: () => {
      stateOut.slot = current.slot;
      stateOut.name = current.name;
      stateOut.ammo = current.ammo;
      stateOut.aiming = aiming;
      stateOut.reloading = reloadTimer > 0;
      stateOut.reloadProgress = current.reloadTime > 0 ? 1 - reloadTimer / current.reloadTime : 0;
      return stateOut;
    },
    select,
    reload: startReload,
    dispose: () => {
      if (!effects) return;
      for (const tracer of tracers.concat(tracerPool)) {
        effects.remove(tracer.line);
        tracer.line.geometry.dispose();
        tracer.line.material.dispose();
      }
      tracers.length = 0;
      tracerPool.length = 0;
      scene.remove(effects);
    },
  };
}
