// KOTA ARUNA — DOM/canvas heads-up display.
//
// Everything the player needs while driving, shooting or following the story is drawn here: a
// circular player-centred minimap, a large speedometer, animated money, wanted stars, weapon
// slots, health, rank, the current objective and the station name. The module owns no game state;
// main.js assembles one plain `state` object each rendered frame and passes it to update().
//
// The dialog module appends its own box to the same #hud overlay. setDialogActive() lifts the
// bottom HUD panels out of its way and hides the crosshair, which is the whole "dialog hook".

import { CITY, CITY_NAME, DISTRICTS, PALETTE, ROADS } from './config.js';

const TAU = Math.PI * 2;
const MAP_SIZE = 196;
const MAP_RADIUS = MAP_SIZE / 2 - 7;
const MAP_RANGE = 250; // metres from the player to the edge of the dial
const SPEED_W = 300;
const SPEED_H = 190;
const SPEED_MAX = 180;

const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_MONO = 'ui-monospace, Menlo, Consolas, monospace';

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}
function moneyText(value) {
  return Math.round(finite(value)).toLocaleString('en-US');
}
/** Writes into a caller-owned scratch point so the per-frame blip loop allocates nothing. */
function pointOf(entry, out) {
  if (!entry) return false;
  const pos = entry.pos || entry.position || entry;
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return false;
  out.x = pos.x;
  out.z = pos.z;
  return true;
}

/** Canvas is sized in CSS pixels but drawn at device resolution. */
function prepareCanvas(canvas, width, height) {
  const ratio = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

/**
 * @param {{container?:HTMLElement, state?:object}} options
 */
export function createHud(options = {}) {
  // createHud(state) and createHud({ state }) are both supported; update(state) is what matters.
  const initial = options.state
    || (options.player || options.money !== undefined || options.wanted !== undefined ? options : {});
  const container = options.container
    || (typeof document !== 'undefined' ? (document.getElementById('hud') || document.body) : null);

  if (!container || typeof document === 'undefined') {
    return { update() {}, setDialogActive() {}, dispose() {}, root: null };
  }

  const root = document.createElement('div');
  root.className = 'kota-hud';
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none;--dialog-shift:0px;'
    + `font-family:${FONT_UI}`;
  container.appendChild(root);

  function panel(css) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;pointer-events:none;${css}`;
    root.appendChild(el);
    return el;
  }

  // ---- Top-left: minimap ----------------------------------------------------------------------
  const mapPanel = panel(`top:14px;left:16px;width:${MAP_SIZE}px;height:${MAP_SIZE}px;
    filter:drop-shadow(0 6px 18px rgba(5,4,16,.8))`);
  const mapCanvas = document.createElement('canvas');
  mapCanvas.setAttribute('aria-label', 'Minimap');
  mapPanel.appendChild(mapCanvas);
  const mapCtx = prepareCanvas(mapCanvas, MAP_SIZE, MAP_SIZE);

  const districtTag = panel(`top:${MAP_SIZE + 20}px;left:16px;font:600 10px/1.4 ${FONT_MONO};
    letter-spacing:.14em;color:#ffd9a8;text-shadow:0 2px 8px #160f22;opacity:.92`);

  // ---- Top-right: money, stars, police units ---------------------------------------------------
  const moneyPanel = panel(`top:16px;right:20px;text-align:right;min-width:190px;
    text-shadow:0 2px 14px rgba(8,4,18,.85)`);
  const moneyLabel = document.createElement('div');
  moneyLabel.style.cssText = `font:600 10px/1 ${FONT_MONO};letter-spacing:.22em;color:#c9b0d8`;
  moneyLabel.textContent = 'DOMPET';
  const moneyValue = document.createElement('div');
  moneyValue.style.cssText = 'font:800 30px/1.2 system-ui,sans-serif;color:#ffe08a;'
    + 'letter-spacing:.02em;transition:color .15s,transform .15s;transform-origin:right center';
  moneyValue.textContent = '$ 0';
  const moneyDelta = document.createElement('div');
  moneyDelta.style.cssText = `font:700 13px/1.4 ${FONT_MONO};height:18px;opacity:0;color:#9ff0b0`;
  const stars = document.createElement('div');
  stars.style.cssText = 'font:19px/1.3 system-ui,sans-serif;letter-spacing:.11em;color:#ffca6b;'
    + 'text-shadow:0 0 14px rgba(255,120,60,.5)';
  moneyPanel.append(moneyLabel, moneyValue, moneyDelta, stars);

  const unitsPanel = panel(`top:118px;right:20px;font:10px/1.5 ${FONT_MONO};letter-spacing:.04em;
    color:#a8d8ff;text-align:right;white-space:pre;text-shadow:0 2px 10px #160f22`);

  // ---- Left column: objective, rank, health ----------------------------------------------------
  const objectivePanel = panel(`top:232px;left:18px;max-width:min(560px,52vw);
    font:600 13px/1.5 ${FONT_UI};letter-spacing:.045em;color:#a8f0ff;
    text-shadow:0 2px 10px #160f22;white-space:normal`);
  const rankPanel = panel(`left:18px;bottom:calc(126px + var(--dialog-shift));
    font:600 11px/1.5 ${FONT_MONO};letter-spacing:.08em;color:#ffcf94;
    text-shadow:0 2px 10px #160f22`);
  const healthPanel = panel(`left:18px;bottom:calc(88px + var(--dialog-shift));width:260px`);
  const healthLabel = document.createElement('div');
  healthLabel.style.cssText = `font:700 10px/1.4 ${FONT_MONO};letter-spacing:.2em;color:#ffd9a8`;
  healthLabel.textContent = 'KESEHATAN';
  const healthTrack = document.createElement('div');
  healthTrack.style.cssText = 'position:relative;height:11px;margin-top:4px;border-radius:6px;'
    + 'background:rgba(20,12,32,.78);border:1px solid rgba(255,205,150,.32);overflow:hidden';
  const healthFill = document.createElement('div');
  healthFill.style.cssText = 'position:absolute;inset:0 auto 0 0;width:100%;border-radius:5px;'
    + 'background:linear-gradient(90deg,#ff6a7a,#ffc857,#8ce6a0);box-shadow:0 0 14px rgba(255,150,90,.4)';
  healthTrack.appendChild(healthFill);
  healthPanel.append(healthLabel, healthTrack);

  // ---- Bottom-centre: weapon slots, radio, garage hint, notice, crosshair ----------------------
  const weaponPanel = panel(`left:50%;transform:translateX(-50%);bottom:calc(14px + var(--dialog-shift));
    display:flex;gap:6px`);
  const slotEls = [];
  for (let i = 1; i <= 4; i += 1) {
    const slot = document.createElement('div');
    slot.style.cssText = 'min-width:96px;padding:6px 9px;border-radius:8px;'
      + 'background:linear-gradient(180deg,rgba(47,29,68,.9),rgba(19,13,32,.92));'
      + 'border:1px solid rgba(255,205,150,.25);text-align:left;transition:border-color .12s,background .12s';
    const key = document.createElement('div');
    key.style.cssText = `font:700 9px/1.2 ${FONT_MONO};letter-spacing:.16em;color:#ffc857`;
    key.textContent = String(i).padStart(2, '0');
    const name = document.createElement('div');
    name.style.cssText = `font:700 11px/1.35 ${FONT_UI};letter-spacing:.05em;color:#ffe6c6`;
    name.textContent = '—';
    const ammo = document.createElement('div');
    ammo.style.cssText = `font:10px/1.3 ${FONT_MONO};color:#a9bfd8`;
    ammo.textContent = '∞';
    slot.append(key, name, ammo);
    weaponPanel.appendChild(slot);
    slotEls.push({ slot, key, name, ammo });
  }

  const radioPanel = panel(`left:50%;transform:translateX(-50%);bottom:calc(90px + var(--dialog-shift));
    font:700 12px/1.4 ${FONT_MONO};letter-spacing:.12em;color:#55e6ff;
    padding:5px 14px;border-radius:20px;background:rgba(13,20,38,.66);
    border:1px solid rgba(85,230,255,.36);text-shadow:0 0 12px rgba(85,230,255,.45);display:none`);

  const garagePanel = panel(`left:50%;transform:translateX(-50%);bottom:calc(132px + var(--dialog-shift));
    font:800 14px/1.4 ${FONT_MONO};letter-spacing:.12em;color:#1a1224;
    padding:8px 18px;border-radius:9px;background:linear-gradient(90deg,#ffd166,#ff9f68);
    box-shadow:0 8px 28px rgba(8,4,18,.6);display:none;white-space:nowrap`);

  const noticePanel = panel(`left:50%;top:22%;transform:translateX(-50%);
    font:800 21px/1.4 ${FONT_UI};letter-spacing:.13em;color:#fff0c8;text-align:center;
    text-shadow:0 3px 18px #160f22;white-space:nowrap`);

  const crosshair = panel(`left:50%;top:50%;transform:translate(-50%,-50%);
    font:18px/1 monospace;color:#ffe0b8;text-shadow:0 1px 6px #160f22;opacity:.8`);
  crosshair.textContent = '+';

  // ---- Bottom-right: speedometer ---------------------------------------------------------------
  const speedPanel = panel(`right:18px;bottom:calc(12px + var(--dialog-shift));
    width:${SPEED_W}px;height:${SPEED_H}px;display:none;
    filter:drop-shadow(0 8px 20px rgba(6,3,14,.8))`);
  const speedCanvas = document.createElement('canvas');
  speedCanvas.setAttribute('aria-label', 'Speedometer');
  speedPanel.appendChild(speedCanvas);
  const speedCtx = prepareCanvas(speedCanvas, SPEED_W, SPEED_H);

  let displayMoney = finite(initial.money, 0);
  let lastMoney = finite(initial.money, 0);
  let displaySpeed = 0;
  let flashUntil = 0;
  let deltaUntil = 0;
  let dialogActive = false;
  let lastStars = -1;
  let lastUnits = '';
  let lastObjective = null;
  let lastRank = '';
  let lastHealth = -1;
  const blipPoint = { x: 0, z: 0 };
  let mapPx = 0;
  let mapPz = 0;
  let mapScale = 1;
  const mapCx = MAP_SIZE / 2;
  const mapCy = MAP_SIZE / 2;
  function X(x) { return mapCx + (x - mapPx) * mapScale; }
  function Z(z) { return mapCy + (z - mapPz) * mapScale; }

  function setDialogActive(active) {
    dialogActive = !!active;
    root.style.setProperty('--dialog-shift', dialogActive ? '-176px' : '0px');
    // The conversation box lives at the bottom; the minimap sits top-left and never overlaps it,
    // so keep the map at full contrast while a line is being read.
    mapPanel.style.opacity = '';
    districtTag.style.opacity = '';
  }

  // ---- Minimap ---------------------------------------------------------------------------------
  function drawMinimap(s) {
    const ctx = mapCtx;
    if (!ctx) return;
    const px = finite(s.player && s.player.x);
    const pz = finite(s.player && s.player.z);
    mapPx = px;
    mapPz = pz;
    mapScale = MAP_RADIUS / MAP_RANGE;
    const cx = mapCx;
    const cy = mapCy;

    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, MAP_RADIUS, 0, TAU);
    ctx.clip();

    // Dark dial base, then sea / beach / inland tints so the geography reads at a glance.
    ctx.fillStyle = '#1b2030';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, 0, Math.max(0, X(CITY.beach.west)), MAP_SIZE);
    ctx.fillStyle = '#9a7f66';
    const beachFrom = Math.max(0, X(CITY.beach.west));
    const beachTo = Math.max(beachFrom, Math.min(MAP_SIZE, X(CITY.beach.inland)));
    ctx.fillRect(beachFrom, 0, beachTo - beachFrom, MAP_SIZE);
    ctx.fillStyle = '#3b4357';
    ctx.fillRect(Math.max(0, X(CITY.beach.inland)), 0, MAP_SIZE, MAP_SIZE);

    // Soft district glows give the two neighbourhoods distinct tints under the street grid.
    for (const district of DISTRICTS) {
      const dx = X(district.center[0]);
      const dz = Z(district.center[1]);
      const radius = Math.max(1, district.radius * mapScale);
      const tint = district.id === 'teluk-aruna' ? '158,112,226' : '240,176,150';
      const glow = ctx.createRadialGradient(dx, dz, radius * 0.12, dx, dz, radius);
      glow.addColorStop(0, `rgba(${tint},.26)`);
      glow.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(dx, dz, radius, 0, TAU);
      ctx.fill();
    }

    const channel = CITY.channel;
    const low = channel.centerZ - channel.width / 2;
    const high = channel.centerZ + channel.width / 2;
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(X(channel.west), Z(low), (channel.east - channel.west) * mapScale, channel.width * mapScale);

    // Buildings hinted as little blocks, brightest in the downtown district.
    const buildings = Array.isArray(s.buildings) ? s.buildings : [];
    let drawn = 0;
    for (let i = 0; i < buildings.length && drawn < 220; i += 1) {
      const b = buildings[i];
      if (!b || !Number.isFinite(b.minX)) continue;
      if (Math.abs((b.minX + b.maxX) / 2 - px) > MAP_RANGE || Math.abs((b.minZ + b.maxZ) / 2 - pz) > MAP_RANGE) continue;
      ctx.fillStyle = b.district === 'teluk-aruna' ? 'rgba(154,126,190,.52)' : 'rgba(230,185,164,.42)';
      ctx.fillRect(X(b.minX), Z(b.minZ), Math.max(1.5, (b.maxX - b.minX) * mapScale), Math.max(1.5, (b.maxZ - b.minZ) * mapScale));
      drawn += 1;
    }

    // Street grid. Segments crossing the tidal channel stop unless there is a bridge.
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,246,224,.9)';
    ctx.lineWidth = 2.4;
    for (const x of ROADS.verticalX) {
      if (x < CITY.beach.inland) continue;
      const bridged = ROADS.bridges.some((b) => Math.abs(b.x - x) < 1);
      ctx.beginPath();
      if (bridged) {
        ctx.moveTo(X(x), Z(-CITY.halfDepth));
        ctx.lineTo(X(x), Z(CITY.halfDepth));
      } else {
        ctx.moveTo(X(x), Z(-CITY.halfDepth));
        ctx.lineTo(X(x), Z(low - 2));
        ctx.moveTo(X(x), Z(high + 2));
        ctx.lineTo(X(x), Z(CITY.halfDepth));
      }
      ctx.stroke();
    }
    for (const z of ROADS.horizontalZ) {
      if (z >= low && z <= high) continue;
      ctx.beginPath();
      ctx.moveTo(X(CITY.beach.inland), Z(z));
      ctx.lineTo(X(CITY.halfWidth), Z(z));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,214,158,.5)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(X(ROADS.ring.center[0]), Z(ROADS.ring.center[1]),
      ROADS.ring.radiusX * mapScale, ROADS.ring.radiusZ * mapScale, 0, 0, TAU);
    ctx.stroke();

    // Bridges get a bright deck so the cross-district routes read at a glance.
    ctx.strokeStyle = 'rgba(255,232,186,.95)';
    ctx.lineWidth = 4;
    for (const bridge of ROADS.bridges) {
      ctx.beginPath();
      ctx.moveTo(X(bridge.x), Z(low - 6));
      ctx.lineTo(X(bridge.x), Z(high + 6));
      ctx.stroke();
    }

    // Both district labels always appear, clamped to the dial if their centre is off-map.
    // A dark outline keeps them legible over roads, water and the player arrow.
    ctx.font = `800 9px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const district of DISTRICTS) {
      let lx = X(district.center[0]);
      let ly = Z(district.center[1]);
      const dx = lx - cx;
      const dy = ly - cy;
      const d = Math.hypot(dx, dy);
      const limit = MAP_RADIUS - 16;
      if (d > limit) {
        lx = cx + (dx / d) * limit;
        ly = cy + (dy / d) * limit;
      }
      // Nudge labels that sit almost under the player arrow so both stay readable.
      if (d < 22) ly -= 18;
      const alpha = d > MAP_RADIUS ? 0.72 : 1;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = `rgba(8,6,16,${alpha})`;
      ctx.strokeText(district.name, lx, ly);
      ctx.fillStyle = `rgba(255,226,182,${alpha})`;
      ctx.fillText(district.name, lx, ly);
    }

    // Garage pads.
    for (const garage of (Array.isArray(s.garages) ? s.garages : [])) {
      const gx = X(garage.x);
      const gz = Z(garage.z);
      ctx.fillStyle = garage.stored ? '#8ce6a0' : '#ffd166';
      ctx.fillRect(gx - 3.5, gz - 3.5, 7, 7);
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx - 3.5, gz - 3.5, 7, 7);
    }

    // Civilian / mission vehicles.
    for (const entry of (Array.isArray(s.vehicleBlips) ? s.vehicleBlips : [])) {
      if (!pointOf(entry, blipPoint)) continue;
      if (entry.occupied && entry !== (s.car || null)) continue;
      const isMission = !!(entry.missionTarget || entry.missionCargo);
      ctx.save();
      ctx.translate(X(blipPoint.x), Z(blipPoint.z));
      if (isMission) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
      } else {
        ctx.fillStyle = '#bfe9ff';
        ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
      }
      ctx.restore();
    }

    // Police blips: officers red, cars blue, helicopter violet.
    for (const entry of (Array.isArray(s.policeBlips) ? s.policeBlips : [])) {
      if (!pointOf(entry, blipPoint)) continue;
      const bx = X(blipPoint.x);
      const by = Z(blipPoint.z);
      ctx.beginPath();
      if (entry.type === 'heli') {
        ctx.moveTo(bx, by - 5);
        ctx.lineTo(bx + 4.5, by + 4);
        ctx.lineTo(bx - 4.5, by + 4);
        ctx.closePath();
        ctx.fillStyle = '#c07bff';
      } else {
        ctx.arc(bx, by, entry.type === 'car' ? 4 : 3, 0, TAU);
        ctx.fillStyle = entry.type === 'car' ? '#5b9bff' : '#ff5f6d';
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Mission waypoint: a pulsing diamond.
    const target = s.missionTarget;
    if (target && Number.isFinite(target.x) && Number.isFinite(target.z)) {
      const mx = X(target.x);
      const my = Z(target.z);
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.006);
      ctx.strokeStyle = `rgba(102,232,255,${0.35 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, 6 + pulse * 7, 0, TAU);
      ctx.stroke();
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#66e8ff';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }

    // Player arrow (world heading 0 points along +Z, which is down on this map).
    const heading = finite(s.player && s.player.heading, finite(s.car && s.car.heading));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI - heading);
    ctx.beginPath();
    ctx.moveTo(0, -8.5);
    ctx.lineTo(5.6, 6.5);
    ctx.lineTo(0, 3.3);
    ctx.lineTo(-5.6, 6.5);
    ctx.closePath();
    ctx.fillStyle = '#fff0c8';
    ctx.strokeStyle = '#ff7a5c';
    ctx.lineWidth = 1.4;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Dial frame and compass tick.
    ctx.beginPath();
    ctx.arc(cx, cy, MAP_RADIUS, 0, TAU);
    ctx.strokeStyle = 'rgba(255,214,164,.82)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, MAP_RADIUS + 4, 0, TAU);
    ctx.strokeStyle = 'rgba(20,12,30,.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffcf8b';
    ctx.font = `800 10px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - MAP_RADIUS + 6);
  }

  // ---- Speedometer ----------------------------------------------------------------------------
  function drawSpeedometer(car) {
    const ctx = speedCtx;
    if (!ctx) return;
    const cx = SPEED_W / 2;
    const cy = 101;
    const radius = 80;
    const start = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    const ratio = clamp(displaySpeed / SPEED_MAX, 0, 1);

    ctx.clearRect(0, 0, SPEED_W, SPEED_H);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + sweep);
    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.lineWidth = 13;
    ctx.stroke();

    const gradient = ctx.createLinearGradient(30, 150, SPEED_W - 30, 20);
    gradient.addColorStop(0, '#55e6ff');
    gradient.addColorStop(0.55, '#ffc857');
    gradient.addColorStop(1, '#ff5fa2');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + sweep * Math.max(0.002, ratio));
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 13;
    ctx.shadowColor = '#ff8f70';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,225,190,.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 9; i += 1) {
      const angle = start + (i / 9) * sweep;
      const inner = radius - (i % 3 === 0 ? 22 : 17);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * (radius - 10), cy + Math.sin(angle) * (radius - 10));
      ctx.stroke();
    }

    const needle = start + sweep * ratio;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(needle) * 8, cy - Math.sin(needle) * 8);
    ctx.lineTo(cx + Math.cos(needle) * (radius - 24), cy + Math.sin(needle) * (radius - 24));
    ctx.strokeStyle = '#fff5df';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, TAU);
    ctx.fillStyle = '#ff9f68';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff2d8';
    ctx.font = `800 54px ${FONT_UI}`;
    ctx.fillText(String(Math.round(displaySpeed)), cx, cy + 30);
    ctx.font = `700 11px ${FONT_MONO}`;
    ctx.fillStyle = '#ffc857';
    ctx.fillText('KM/H', cx, cy + 49);
    const name = car && car.name ? String(car.name).toUpperCase() : CITY_NAME;
    ctx.font = `700 13px ${FONT_MONO}`;
    ctx.fillStyle = '#bfe9ff';
    ctx.fillText(name, cx, SPEED_H - 12);
  }

  // ---- Main update -----------------------------------------------------------------------------
  function update(s = {}) {
    const dt = clamp(finite(s.dt, 1 / 60), 0, 0.25);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const car = s.car && (s.car.speedKmh !== undefined || s.car.name) ? s.car : null;
    const money = finite(s.money, 0);

    if (money !== lastMoney) {
      moneyDelta.textContent = `${money > lastMoney ? '+' : ''}${moneyText(money - lastMoney)}`;
      moneyDelta.style.color = money > lastMoney ? '#9ff0b0' : '#ff8f8f';
      flashUntil = now + 420;
      deltaUntil = now + 1500;
      lastMoney = money;
    }
    displayMoney += (money - displayMoney) * Math.min(1, dt * 7);
    if (Math.abs(displayMoney - money) < 0.5) displayMoney = money;
    moneyValue.textContent = `$ ${moneyText(displayMoney)}`;
    moneyValue.style.color = now < flashUntil ? '#ffffff' : '#ffe08a';
    moneyValue.style.transform = now < flashUntil ? 'scale(1.12)' : 'scale(1)';
    moneyDelta.style.opacity = now < deltaUntil ? String(clamp((deltaUntil - now) / 500, 0, 1)) : '0';

    const starsCount = clamp(Math.round(finite(s.wanted)), 0, 5);
    if (starsCount !== lastStars) {
      stars.textContent = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);
      stars.style.color = starsCount >= 4 ? '#ff6a7a' : '#ffca6b';
      lastStars = starsCount;
    }

    if (s.districtTag !== undefined) districtTag.textContent = s.districtTag;
    else if (s.district) districtTag.textContent = `LOKASI  ·  ${s.district.name || s.district}`;
    else districtTag.textContent = `${CITY_NAME}  ·  SEED ${finite(s.seed)}`;

    const objective = typeof s.objective === 'string' ? s.objective : '';
    if (objective !== lastObjective) {
      objectivePanel.textContent = objective ? `▸  ${objective}` : '';
      lastObjective = objective;
    }

    const rank = s.rankInfo
      ? `RANK  ·  ${s.rankInfo.title || s.rank || 'Kenal'}   REP ${finite(s.rep)}`
        + (s.rankInfo.next ? ` / ${s.rankInfo.nextMin} → ${s.rankInfo.next.toUpperCase()}` : '  ·  TERTINGGI')
      : `RANK  ·  ${s.rank || 'Kenal'}   REP ${finite(s.rep)}`;
    if (rank !== lastRank) {
      rankPanel.textContent = rank;
      lastRank = rank;
    }

    const health = clamp(finite(s.player && s.player.health, 100), 0, 100);
    if (Math.abs(health - lastHealth) > 0.05) {
      healthFill.style.width = `${health}%`;
      healthFill.style.background = health < 30
        ? 'linear-gradient(90deg,#ff4d5e,#ff8a6a)'
        : health < 65
          ? 'linear-gradient(90deg,#ff8a4d,#ffd166)'
          : 'linear-gradient(90deg,#ff6a7a,#ffc857,#8ce6a0)';
      lastHealth = health;
    }

    const weapons = Array.isArray(s.weapons) ? s.weapons : [];
    for (let i = 0; i < slotEls.length; i += 1) {
      const view = slotEls[i];
      const weapon = weapons[i] || null;
      const active = weapon && (weapon.slot === finite(s.currentSlot) || i === finite(s.currentSlot) - 1);
      view.name.textContent = weapon ? weapon.name : '—';
      view.ammo.textContent = weapon
        ? (weapon.ammo === Infinity ? '∞' : `${weapon.ammo} / ${weapon.maxAmmo}`)
        : '—';
      view.slot.style.borderColor = active ? 'rgba(255,209,102,.95)' : 'rgba(255,205,150,.22)';
      view.slot.style.background = active
        ? 'linear-gradient(180deg,rgba(122,64,92,.95),rgba(44,24,58,.96))'
        : 'linear-gradient(180deg,rgba(47,29,68,.82),rgba(19,13,32,.88))';
      view.key.style.color = active ? '#fff0c8' : '#ffc857';
    }

    if (s.policeUnits !== undefined) {
      const units = Array.isArray(s.policeUnits) ? s.policeUnits : [];
      const text = units.length
        ? `UNIT POLISI · ${units.length}\n${units.map((u) => `${u.callsign}  ${String(u.distance).padStart(3)}m  ${u.tactic}`).join('\n')}`
        : 'UNIT POLISI · AMAN';
      if (text !== lastUnits) {
        unitsPanel.textContent = text;
        lastUnits = text;
      }
    }

    if (s.notice !== undefined) noticePanel.textContent = s.notice || '';

    setDialogActive(!!s.dialogActive);
    crosshair.style.display = dialogActive || s.showCrosshair === false ? 'none' : '';
    crosshair.style.color = s.aiming ? '#ff8f6b' : '#ffe0b8';

    if (s.radio && s.radio.inVehicle) {
      radioPanel.style.display = '';
      radioPanel.textContent = s.radio.label || `${s.radio.on ? '♪' : '×'} ${s.radio.name || 'RADIO'}`;
      radioPanel.style.color = s.radio.on ? '#55e6ff' : '#a99bb8';
      radioPanel.style.borderColor = s.radio.on ? 'rgba(85,230,255,.5)' : 'rgba(180,170,190,.25)';
    } else {
      radioPanel.style.display = 'none';
    }

    if (s.garageHint) {
      garagePanel.style.display = '';
      garagePanel.textContent = s.garageHint;
    } else {
      garagePanel.style.display = 'none';
    }

    if (car) {
      const targetSpeed = clamp(finite(car.speedKmh), 0, SPEED_MAX);
      displaySpeed += (targetSpeed - displaySpeed) * Math.min(1, dt * 8);
      if (Math.abs(displaySpeed - targetSpeed) < 0.2) displaySpeed = targetSpeed;
      speedPanel.style.display = '';
      drawSpeedometer(car);
    } else {
      displaySpeed += (0 - displaySpeed) * Math.min(1, dt * 10);
      speedPanel.style.display = 'none';
    }

    drawMinimap(s);
  }

  return {
    update,
    setDialogActive,
    root,
    dispose() {
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}
