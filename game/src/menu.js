// KOTA ARUNA — screens, saves and garages.
//
// Owns the sunset title screen (whose MULAI button is also the audio unlock gesture), the Esc pause
// menu, three localStorage save slots plus an autosave, and the two district garages. A car driven
// onto a pad and parked with E is removed from the world and kept as a descriptor in the save file;
// pressing E again at the same pad builds it back and puts Ara in the driver's seat.

import { CITY_NAME } from './config.js';

export const SAVE_VERSION = 1;
const SAVE_PREFIX = 'kota-aruna:save:';
const SLOTS = [
  { id: '1', label: 'SLOT 1' },
  { id: '2', label: 'SLOT 2' },
  { id: '3', label: 'SLOT 3' },
  { id: 'auto', label: 'AUTOSAVE' },
];
const GARAGE_DEFS = [
  { id: 'garasi-teluk', name: 'GARASI TELUK ARUNA', district: 'TELUK ARUNA', x: -90, z: -270, color: 0x55e6ff },
  { id: 'garasi-senja', name: 'GARASI MARINA SENJA', district: 'MARINA SENJA', x: -270, z: 270, color: 0xffc857 },
];
const GARAGE_RADIUS = 15;

const CONTROLS_HTML = `
  <div class="ka-control-list">
    <span><b>WASD</b> jalan / kemudi</span><span><b>SHIFT</b> lari</span>
    <span><b>SPACE</b> lompat / rem tangan</span><span><b>F</b> masuk / keluar mobil</span>
    <span><b>E</b> dialog · simpan / ambil mobil di garasi</span><span><b>R</b> radio (di mobil)</span>
    <span><b>[ ]</b> ganti stasiun radio</span><span><b>1–4</b> pilih senjata</span>
    <span><b>R</b> isi ulang (di luar mobil)</span><span><b>LMB</b> tembak · <b>RMB</b> bidik</span>
    <span><b>DRAG</b> lihat sekitar · <b>RODA</b> zoom</span><span><b>ESC</b> jeda</span>
  </div>`;

const MENU_CSS = `
  .ka-menu { position:fixed;inset:0;z-index:20;color:#ffe6c6;
    font-family:system-ui,-apple-system,"Segoe UI",sans-serif;user-select:none; }
  .ka-menu[hidden] { display:none!important; }
  .ka-screen { position:absolute;inset:0;display:none;align-items:center;justify-content:center;
    overflow:hidden; }
  .ka-title { background:
    radial-gradient(circle at 72% 32%,rgba(255,208,138,.85) 0 6%,rgba(255,140,92,.42) 8% 20%,transparent 43%),
    linear-gradient(180deg,#231739 0%,#5b2f5b 42%,#c9605e 74%,#f08a52 100%); }
  .ka-title::after { content:"";position:absolute;left:0;right:0;bottom:0;height:34%;
    background:linear-gradient(180deg,transparent,rgba(17,10,30,.96));
    pointer-events:none; }
  .ka-title-inner { position:relative;z-index:2;text-align:center;padding:24px;
    max-width:min(1040px,94vw); }
  .ka-kicker { font:700 11px/1.4 ui-monospace,monospace;letter-spacing:.46em;
    color:#ffd9a8;opacity:.86;margin-bottom:10px; }
  .ka-title h1 { margin:0;font-size:clamp(62px,12vw,148px);line-height:.82;
    font-weight:900;letter-spacing:.02em;color:#fff0d0;
    text-shadow:0 8px 0 rgba(120,40,70,.55),0 20px 60px rgba(10,4,24,.85),0 0 90px rgba(255,170,110,.4); }
  .ka-title h1 span { color:#ffc857; }
  .ka-sub { margin:22px 0 26px;font-size:clamp(13px,1.8vw,17px);letter-spacing:.18em;
    color:#ffe0bd;text-shadow:0 2px 14px #231739; }
  .ka-primary { cursor:pointer;border:0;border-radius:10px;padding:15px 58px;
    font:900 19px/1 ui-monospace,monospace;letter-spacing:.3em;color:#2a1227;
    background:linear-gradient(180deg,#ffe6a4,#ffab68);
    box-shadow:0 10px 34px rgba(20,6,26,.6),0 0 0 2px rgba(255,240,200,.5) inset;
    transition:transform .12s,filter .12s; }
  .ka-primary:hover { transform:translateY(-2px) scale(1.03);filter:brightness(1.1); }
  .ka-primary:active { transform:translateY(1px); }
  .ka-foot { margin-top:18px;font:10px/1.5 ui-monospace,monospace;letter-spacing:.1em;opacity:.72; }
  .ka-controls { margin:30px auto 0;max-width:790px;padding:16px 22px;border-radius:12px;
    background:rgba(18,11,32,.58);border:1px solid rgba(255,205,150,.22); }
  .ka-control-list { display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));
    gap:6px 22px;text-align:left;font:11px/1.6 ui-monospace,monospace;color:#e9d3c0; }
  .ka-control-list b { color:#ffc857; }
  .ka-pause { background:rgba(12,7,24,.76);backdrop-filter:blur(7px); }
  .ka-panel { width:min(520px,92vw);max-height:92vh;overflow:auto;padding:26px 30px 30px;
    border-radius:16px;background:linear-gradient(180deg,rgba(48,28,70,.98),rgba(18,11,32,.99));
    border:1px solid rgba(255,205,150,.4);
    box-shadow:0 24px 90px rgba(4,2,12,.8),0 0 0 1px rgba(255,110,90,.12) inset; }
  .ka-panel h2 { margin:0 0 4px;font:900 30px/1 ui-monospace,monospace;letter-spacing:.24em;color:#ffc857; }
  .ka-panel h3 { margin:18px 0 10px;font:800 13px/1 ui-monospace,monospace;letter-spacing:.18em;color:#55e6ff; }
  .ka-hint { margin:0 0 20px;font:11px/1.5 ui-monospace,monospace;color:#c3a9d2; }
  .ka-buttons { display:grid;gap:8px; }
  .ka-btn { cursor:pointer;text-align:left;padding:11px 16px;border-radius:8px;
    border:1px solid rgba(255,205,150,.32);background:rgba(255,255,255,.045);color:#ffe6c6;
    font:700 12px/1.3 ui-monospace,monospace;letter-spacing:.14em;transition:background .12s,transform .12s; }
  .ka-btn:hover { background:rgba(255,160,100,.22);transform:translateX(3px); }
  .ka-btn.ka-danger { color:#ff9fa4;border-color:rgba(255,110,120,.4); }
  .ka-subpanel { margin-top:16px;padding-top:4px;border-top:1px solid rgba(255,205,150,.2); }
  .ka-subpanel[hidden] { display:none!important; }
  .ka-slots { display:grid;gap:7px; }
  .ka-slot { display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;
    background:rgba(10,6,22,.5);border:1px solid rgba(255,205,150,.18); }
  .ka-slot-info { flex:1;min-width:0; }
  .ka-slot-info b { display:block;font:800 11px/1.4 ui-monospace,monospace;letter-spacing:.1em;color:#ffc857; }
  .ka-slot-info span { display:block;font:10px/1.4 ui-monospace,monospace;color:#bdaecd;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .ka-slot .ka-btn { padding:7px 11px; }
  .ka-saved { margin-top:12px;font:11px/1.5 ui-monospace,monospace;color:#9ff0b0;min-height:16px; }
`;

function injectStyles(doc) {
  if (!doc || doc.getElementById('kota-menu-styles')) return;
  const style = doc.createElement('style');
  style.id = 'kota-menu-styles';
  style.textContent = MENU_CSS;
  if (doc.head) doc.head.appendChild(style);
}

function number(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function store() {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * @param {object} deps — THREE, scene, player, vehicles, progress, missions, police, dialog,
 *                        onStart/onResume/onPause/onQuit/onNotice callbacks and getSeed().
 */
export function createMenu(deps = {}) {
  const doc = typeof document !== 'undefined' ? document : null;
  const THREE = deps.THREE || null;
  const scene = deps.scene || null;
  const player = deps.player;
  const vehicles = deps.vehicles;
  const progress = deps.progress;
  const missions = deps.missions;
  const police = deps.police;
  const dialog = deps.dialog;
  const radio = deps.radio || null;
  const notice = (text) => { if (typeof deps.onNotice === 'function') deps.onNotice(text); };

  const garages = GARAGE_DEFS.map((def) => ({ ...def, stored: null, group: null, ringMat: null }));
  let screen = 'title';
  let openPanel = null;
  let visualTime = 0;

  // ---- Garage pads in the world -----------------------------------------------------------------
  function labelSprite(text, colorHex) {
    if (!THREE || !doc) return null;
    const canvas = doc.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = 'rgba(14,9,28,.82)';
    ctx.fillRect(4, 8, 504, 80);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 8, 504, 80);
    ctx.fillStyle = colorHex;
    ctx.font = '800 38px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 50);
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthWrite: false, fog: false,
    }));
    sprite.scale.set(54, 10, 1);
    return sprite;
  }

  function buildGarage(garage) {
    if (!THREE || !scene) return;
    const group = new THREE.Group();
    group.name = garage.id;
    const color = garage.color;
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(GARAGE_RADIUS - 1, GARAGE_RADIUS - 1, 0.16, 32),
      new THREE.MeshBasicMaterial({ color: 0x171328, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    pad.position.y = 0.11;
    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(GARAGE_RADIUS - 1.4, 0.42, 8, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.32;
    const beamMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 3.4, 12, 12, 1, true), beamMat);
    beam.position.y = 6;
    group.add(pad, ring, beam);

    const postMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), postMat);
        post.position.set(sx * 11.5, 1.3, sz * 11.5);
        group.add(post);
      }
    }
    const label = labelSprite(garage.name, `#${color.toString(16).padStart(6, '0')}`);
    if (label) {
      label.position.y = 13;
      group.add(label);
    }
    group.position.set(garage.x, 0, garage.z);
    scene.add(group);
    garage.group = group;
    garage.ringMat = ringMat;
  }
  for (const garage of garages) buildGarage(garage);

  function refreshGarageVisuals() {
    for (const garage of garages) {
      if (!garage.ringMat) continue;
      garage.ringMat.color.setHex(garage.stored ? 0x8ce6a0 : garage.color);
    }
  }

  // ---- Menus ------------------------------------------------------------------------------------
  let root = null;
  let titleEl = null;
  let pauseEl = null;
  let slotList = null;
  let saveStatus = null;
  let saveMode = 'save';
  let radioStatus = '';
  let radioEl = null;

  if (doc && doc.body) {
    injectStyles(doc);
    root = doc.createElement('div');
    root.className = 'ka-menu';
    root.setAttribute('role', 'dialog');
    root.innerHTML = `
      <section class="ka-screen ka-title">
        <div class="ka-title-inner">
          <div class="ka-kicker">OPEN WORLD · ${CITY_NAME}</div>
          <h1>KOTA<br><span>ARUNA</span></h1>
          <p class="ka-sub">DUA DISTRIK. SATU KRU. SENJA TAK PERNAH MENUNGGU.</p>
          <button class="ka-primary" type="button" data-action="start">MULAI</button>
          <div class="ka-foot">Klik MULAI untuk menghidupkan audio · autosave aktif saat bermain</div>
          <div class="ka-controls">${CONTROLS_HTML}</div>
        </div>
      </section>
      <section class="ka-screen ka-pause">
        <div class="ka-panel">
          <h2>DIJEDA</h2>
          <p class="ka-hint">${CITY_NAME} · ESC untuk kembali ke jalan</p>
          <div class="ka-radio" data-radio-status>RADIO  ·  --</div>
          <div class="ka-buttons">
            <button class="ka-btn" type="button" data-action="resume">▸  LANJUTKAN</button>
            <button class="ka-btn" type="button" data-action="save">▸  SIMPAN GAME</button>
            <button class="ka-btn" type="button" data-action="load">▸  MUAT GAME</button>
            <button class="ka-btn" type="button" data-action="controls">▸  KONTROL</button>
            <button class="ka-btn ka-danger" type="button" data-action="quit">▸  KELUAR KE MENU</button>
          </div>
          <div class="ka-subpanel" data-panel="saves" hidden>
            <h3 data-saves-title>SIMPAN PERMAINAN</h3>
            <div class="ka-slots" data-slots></div>
            <div class="ka-saved" data-save-status></div>
            <button class="ka-btn" type="button" data-action="back">← KEMBALI</button>
          </div>
          <div class="ka-subpanel" data-panel="controls" hidden>
            <h3>KONTROL</h3>
            ${CONTROLS_HTML}
            <button class="ka-btn" type="button" data-action="back" style="margin-top:14px">← KEMBALI</button>
          </div>
        </div>
      </section>`;
    doc.body.appendChild(root);
    titleEl = root.querySelector('.ka-title');
    pauseEl = root.querySelector('.ka-pause');
    slotList = root.querySelector('[data-slots]');
    saveStatus = root.querySelector('[data-save-status]');
    radioEl = root.querySelector('[data-radio-status]');

    root.addEventListener('click', (event) => {
      const button = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('[data-action]') : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.getAttribute('data-action');
      if (action === 'start') start();
      else if (action === 'resume') resume();
      else if (action === 'save') openSaves('save');
      else if (action === 'load') openSaves('load');
      else if (action === 'controls') openControls();
      else if (action === 'quit') quit();
      else if (action === 'back') closePanels();
      else if (action === 'slot') {
        const slot = button.getAttribute('data-slot');
        if (saveMode === 'save') saveGame(slot);
        else loadGame(slot);
      }
    });
  }

  function closePanels() {
    openPanel = null;
    if (!root) return;
    for (const panel of root.querySelectorAll('.ka-subpanel')) panel.hidden = true;
  }

  function openControls() {
    if (!root) return;
    closePanels();
    openPanel = 'controls';
    const panel = root.querySelector('[data-panel="controls"]');
    if (panel) panel.hidden = false;
  }

  function openSaves(mode) {
    if (!root) return;
    closePanels();
    saveMode = mode;
    openPanel = 'saves';
    const title = root.querySelector('[data-saves-title]');
    if (title) title.textContent = mode === 'save' ? 'SIMPAN PERMAINAN' : 'MUAT PERMAINAN';
    const panel = root.querySelector('[data-panel="saves"]');
    if (panel) panel.hidden = false;
    renderSlots();
  }

  function slotInfo(slot) {
    const fs = store();
    if (!fs) return null;
    try {
      const raw = fs.getItem(SAVE_PREFIX + slot.id);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      const date = Number.isFinite(data.savedAt) ? new Date(data.savedAt).toLocaleString('id-ID') : '—';
      return { data, text: `$${number(data.money).toLocaleString('en-US')} · ${number(data.rep)} REP · seed ${number(data.seed)} · ${date}` };
    } catch {
      return null;
    }
  }

  function renderSlots() {
    if (!slotList) return;
    slotList.replaceChildren();
    for (const slot of SLOTS) {
      const info = slotInfo(slot);
      const row = doc.createElement('div');
      row.className = 'ka-slot';
      const text = doc.createElement('div');
      text.className = 'ka-slot-info';
      const title = doc.createElement('b');
      title.textContent = slot.label;
      const detail = doc.createElement('span');
      detail.textContent = info ? info.text : 'KOSONG';
      text.append(title, detail);
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'ka-btn';
      button.setAttribute('data-action', 'slot');
      button.setAttribute('data-slot', slot.id);
      button.textContent = saveMode === 'save' ? 'SIMPAN' : 'MUAT';
      if (saveMode === 'load' && !info) button.disabled = true;
      row.append(text, button);
      slotList.appendChild(row);
    }
  }

  function setScreen(next) {
    screen = next === 'title' || next === 'pause' ? next : 'play';
    if (root) {
      root.hidden = screen === 'play';
      root.style.pointerEvents = screen === 'play' ? 'none' : 'auto';
    }
    if (titleEl) titleEl.style.display = screen === 'title' ? 'flex' : 'none';
    if (pauseEl) pauseEl.style.display = screen === 'pause' ? 'flex' : 'none';
    if (screen !== 'pause') closePanels();
  }

  function start() {
    setScreen('play');
    if (typeof deps.onStart === 'function') deps.onStart();
  }
  function pause() {
    if (screen !== 'play') return;
    setScreen('pause');
    if (typeof deps.onPause === 'function') deps.onPause();
  }
  function resume() {
    if (screen !== 'pause') return;
    setScreen('play');
    if (typeof deps.onResume === 'function') deps.onResume();
  }
  function quit() {
    setScreen('title');
    if (typeof deps.onQuit === 'function') deps.onQuit();
  }
  function getScreen() {
    return screen;
  }

  // ---- Save / load ------------------------------------------------------------------------------
  function buildSave() {
    const p = player || {};
    const car = p.inVehicle && p.vehicle ? p.vehicle : null;
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      seed: typeof deps.getSeed === 'function' ? deps.getSeed() : null,
      money: progress ? progress.getMoney() : 0,
      rep: progress ? progress.getRep() : 0,
      stats: progress ? progress.getStats() : {},
      missions: missions && typeof missions.getSaveData === 'function' ? missions.getSaveData() : null,
      position: { x: number(p.pos && p.pos.x), y: number(p.pos && p.pos.y), z: number(p.pos && p.pos.z) },
      vehicle: car && vehicles ? vehicles.describeCar(car) : null,
      ownedCars: vehicles ? vehicles.getOwned()
        .filter((entry) => entry !== car)
        .map((entry) => vehicles.describeCar(entry)) : [],
      garages: garages.map((garage) => ({ id: garage.id, stored: garage.stored })),
      wanted: police && typeof police.getWanted === 'function' ? police.getWanted() : 0,
    };
  }

  function applySave(data) {
    if (!data || typeof data !== 'object') return false;
    if (progress) {
      if (Number.isFinite(data.money)) progress.setMoney(data.money);
      if (Number.isFinite(data.rep)) progress.setRep(data.rep);
      const stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
      for (const key of Object.keys(stats)) progress.setStat(key, stats[key]);
    }
    // Clear the old pursuit first: a saved story stage may immediately raise its own heat.
    if (police && typeof police.onRespawn === 'function') police.onRespawn();
    if (missions && typeof missions.load === 'function') missions.load(data.missions || {});
    if (vehicles) vehicles.clearOwned();
    for (const garage of garages) garage.stored = null;
    for (const saved of (Array.isArray(data.garages) ? data.garages : [])) {
      const garage = garages.find((item) => item.id === saved.id);
      if (garage) garage.stored = saved.stored || null;
    }
    for (const descriptor of (Array.isArray(data.ownedCars) ? data.ownedCars : [])) {
      if (!descriptor) continue;
      const car = vehicles.spawnModel(descriptor.model, number(descriptor.x), number(descriptor.z), number(descriptor.heading), true);
      car.health = number(descriptor.health, 100);
    }
    if (player) {
      if (player.inVehicle && player.vehicle) {
        player.vehicle.occupied = false;
        player.inVehicle = false;
      }
      const descriptor = data.vehicle;
      if (descriptor && vehicles) {
        const car = vehicles.spawnModel(descriptor.model, number(descriptor.x), number(descriptor.z), number(descriptor.heading), true);
        car.health = number(descriptor.health, 100);
        player.vehicle = car;
        player.pos.copy(car.pos);
      } else if (data.position) {
        player.setFromSpawn({ x: number(data.position.x), z: number(data.position.z) });
      }
    }
    refreshGarageVisuals();
    return true;
  }

  function saveGame(slot = '1', quiet = false) {
    const fs = store();
    if (!fs) {
      if (!quiet) notice('PENYIMPANAN TIDAK TERSEDIA');
      return false;
    }
    try {
      fs.setItem(SAVE_PREFIX + slot, JSON.stringify(buildSave()));
      if (!quiet) notice(`PERMAINAN DISIMPAN  ·  ${slot === 'auto' ? 'AUTOSAVE' : `SLOT ${slot}`}`);
      if (openPanel === 'saves') {
        renderSlots();
        if (saveStatus) saveStatus.textContent = `Tersimpan · ${new Date().toLocaleTimeString('id-ID')}`;
      }
      return true;
    } catch (error) {
      if (!quiet) notice('GAGAL MENYIMPAN  ·  PENYIMPANAN PENUH');
      return false;
    }
  }

  function loadGame(slot = '1') {
    const fs = store();
    if (!fs) {
      notice('PENYIMPANAN TIDAK TERSEDIA');
      return false;
    }
    try {
      const raw = fs.getItem(SAVE_PREFIX + slot);
      if (!raw) {
        notice('SLOT KOSONG');
        return false;
      }
      const data = JSON.parse(raw);
      if (!applySave(data)) return false;
      notice(`PERMAINAN DIMUAT  ·  ${slot === 'auto' ? 'AUTOSAVE' : `SLOT ${slot}`}`);
      if (screen === 'pause') resume();
      return true;
    } catch (error) {
      notice('SAVE RUSAK  ·  TIDAK DAPAT DIMUAT');
      return false;
    }
  }

  function listSaves() {
    return SLOTS.map((slot) => ({ ...slot, info: slotInfo(slot) }));
  }

  // ---- Garage interaction -----------------------------------------------------------------------
  function nearestGarage(pos, radius = GARAGE_RADIUS) {
    if (!pos) return null;
    let best = null;
    let bestDistance = radius * radius;
    for (const garage of garages) {
      const dx = garage.x - pos.x;
      const dz = garage.z - pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDistance) {
        bestDistance = d2;
        best = garage;
      }
    }
    return best;
  }

  function dialogActive() {
    return !!(dialog && typeof dialog.isActive === 'function' && dialog.isActive());
  }

  function getGarageHint(pos, car) {
    if (dialogActive() || !player) return '';
    const garage = nearestGarage(car ? car.pos : pos);
    if (!garage) return '';
    if (car && player.inVehicle) {
      if (Math.abs(car.speed) > 8) return 'GARASI  ·  PELAN-PELAN';
      if (car.missionTarget || car.missionCargo) return 'MOBIL MISI TIDAK BISA DISIMPAN';
      return garage.stored
        ? `E  AMBIL ${garage.stored.model.toUpperCase()}  ·  ${garage.district}`
        : `E  SIMPAN ${String(car.name).toUpperCase()}  ·  ${garage.district}`;
    }
    // On foot: the first E after parking takes the stored car straight back out.
    return garage.stored
      ? `E  AMBIL ${garage.stored.model.toUpperCase()}  ·  ${garage.district}`
      : `GARASI ${garage.district}  ·  KOSONG`;
  }

  function retrieve(garage, currentCar) {
    if (currentCar) {
      currentCar.occupied = false;
      currentCar.speed = 0;
      player.inVehicle = false;
    }
    const descriptor = garage.stored;
    const fresh = vehicles.spawnModel(descriptor.model, garage.x + 7, garage.z + 7, 0, true);
    fresh.health = number(descriptor.health, 100);
    garage.stored = null;
    player.vehicle = fresh;
    player.pos.copy(fresh.pos);
    refreshGarageVisuals();
    notice(`${fresh.name.toUpperCase()} KELUAR DARI ${garage.district}`);
  }

  function tryGarage() {
    if (!player || !vehicles) return;
    const car = player.inVehicle ? player.vehicle : null;
    const garage = nearestGarage(car ? car.pos : player.pos);
    if (!garage) return;

    if (!car || !player.inVehicle) {
      if (!garage.stored) {
        notice('GARASI KOSONG');
        return;
      }
      retrieve(garage, null);
      saveGame('auto', true);
      return;
    }

    if (Math.abs(car.speed) > 8) {
      notice('PELAN-PELAN SAAT MASUK GARASI');
      return;
    }
    if (car.missionTarget || car.missionCargo) {
      notice('MOBIL MISI TIDAK BISA DISIMPAN');
      return;
    }

    if (garage.stored) {
      retrieve(garage, car);
    } else {
      const descriptor = vehicles.describeCar(car);
      if (!descriptor) return;
      descriptor.owned = true;
      vehicles.claimCar(car);
      garage.stored = descriptor;
      vehicles.removeCar(car);
      player.inVehicle = false;
      player.pos.set(garage.x + 8, 0, garage.z + 8);
      refreshGarageVisuals();
      notice(`${descriptor.model.toUpperCase()} DISIMPAN DI ${garage.district}`);
    }
    saveGame('auto', true);
  }

  function onKeyDown(event) {
    if (event.code === 'Escape') {
      if (dialogActive()) return; // dialog.js owns Escape while a conversation is open
      event.preventDefault();
      if (screen === 'play') pause();
      else if (screen === 'pause') {
        if (openPanel) closePanels();
        else resume();
      }
      return;
    }
    if (event.code === 'KeyE' && screen === 'play' && !dialogActive() && !event.repeat) {
      tryGarage();
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('keydown', onKeyDown);

  function update(dt = 0, radioName = '') {
    visualTime += Math.max(0, dt);
    const label = radioName ? `♪  RADIO  ·  ${radioName}` : (radio ? `♪  RADIO  ·  ${radio.name}` : 'RADIO  ·  --');
    if (label !== radioStatus) {
      radioStatus = label;
      if (radioEl) radioEl.textContent = label;
    }
    for (const garage of garages) {
      if (!garage.ringMat) continue;
      const pulse = 0.62 + 0.2 * Math.sin(visualTime * 2.4 + garage.x);
      garage.ringMat.opacity = garage.stored ? 0.95 : pulse;
    }
  }

  function getGarages() {
    return garages.map((garage) => ({
      id: garage.id, name: garage.name, district: garage.district,
      x: garage.x, z: garage.z, stored: garage.stored,
    }));
  }

  setScreen('title');

  return {
    root, setScreen, getScreen, pause, resume, quit,
    saveGame, loadGame, listSaves, getSaveData: buildSave, applySave,
    getGarageHint, getGarages, tryGarage, update,
    get garages() { return garages; },
    dispose() {
      if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown);
      for (const garage of garages) {
        if (garage.group && garage.group.parent) garage.group.parent.remove(garage.group);
      }
      if (root && root.parentNode) root.parentNode.removeChild(root);
    },
  };
}
