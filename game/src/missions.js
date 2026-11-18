// KOTA ARUNA — the seven-job harbour story.
//
// Ara's courier crew starts with one crate and ends by taking Pak Gerhan's smuggling ring off the
// air. Every job has a briefing conversation, world markers, ordered stages (go-to, steal, chase,
// escape, deliver, defend, race checkpoints), rewards and failure conditions. Job one is offered
// automatically; each later job unlocks as a gold marker at its giver. The last job ends with a
// choice about the crew's mentor, Pak Idrus — the twist behind the whole arc.
//
// All characters, places and events are original to KOTA ARUNA.

import { createProgress } from './progress.js';

export const MISSION_IDS = [
  'kiriman-pertama',
  'jalan-lingkar',
  'malam-neon',
  'kejaran-senja',
  'kapal-kuala',
  'alih-kendali',
  'pasang-surut',
];

const MARKER_COLORS = {
  goto: 0x66e8ff,
  steal: 0xffc857,
  chase: 0x9b7bff,
  escape: 0xb0a8ff,
  deliver: 0x67c98a,
  defend: 0xff6a3d,
  race: 0xff5fa2,
  offer: 0xffd166,
};

const JOBS = [
  {
    id: 'kiriman-pertama',
    title: 'Kiriman Pertama',
    giver: 'DIMAS',
    offer: { x: -180, z: -180, radius: 26 },
    reward: { money: 900, rep: 40 },
    briefing: [
      { speaker: 'DIMAS', text: 'Ara, dengar. Gerhan menguasai dermaga dan semua kunci gudangnya. Kita cuma punya satu bemo dan nama yang belum dikenal siapa-siapa.' },
      { speaker: 'ARA', text: 'Jadi aku mulai dari kiriman kecil. Ke mana?' },
      { speaker: 'DIMAS', text: 'Ambil peti obat dari ujung dermaga Pasir Putih, bawa ke warung kita di Jalan Nelayan. Jangan tanya isinya — yang penting sampai utuh.' },
      { speaker: 'SINTA', text: 'Aku pantau frekuensinya. Kalau ada yang menyebut nama kita, aku kasih kabar.' },
    ],
    debrief: [
      { speaker: 'DIMAS', text: 'Peti utuh. Kau bukan cuma kurir sekarang, Ara.' },
      { speaker: 'ARA', text: 'Satu kiriman. Masih banyak yang tersisa.' },
      { speaker: 'SINTA', text: 'Ada gerakan di kanal. Gerhan mulai curiga pada kita.' },
    ],
    failLines: [
      { speaker: 'DIMAS', text: 'Kirimannya gagal. Kita bisa ulang, tapi jangan sampai dia tahu siapa yang mengirim.' },
      { speaker: 'ARA', text: 'Aku yang salah. Kali ini aku hafal jalannya.' },
    ],
    stages: [
      { type: 'goto', at: [-320, -72], radius: 15, text: 'Ambil peti obat di ujung dermaga Pasir Putih' },
      { type: 'goto', at: [-180, -180], radius: 18, text: 'Serahkan peti ke warung kru di Jalan Nelayan' },
    ],
  },
  {
    id: 'jalan-lingkar',
    title: 'Jalan Lingkar',
    giver: 'BIMO',
    offer: { x: -90, z: -270, radius: 26 },
    reward: { money: 1400, rep: 70 },
    briefing: [
      { speaker: 'BIMO', text: 'Kita butuh mobil yang bisa dipercaya. Ada Kencana Pickup hijau di dekat Jembatan Pasar Ikan.' },
      { speaker: 'ARA', text: 'Ambil, lalu aku uji?' },
      { speaker: 'BIMO', text: 'Empat tikungan di Jalan Lingkar, satu garasi di ujung. Kalau kau sampai, mobilnya ours.' },
      { speaker: 'DIMAS', text: 'Jangan banting setir terlalu keras. Itu masih satu-satunya mobil kita.' },
    ],
    debrief: [
      { speaker: 'BIMO', text: 'Bagus. Pickup itu sekarang milik kru.' },
      { speaker: 'DIMAS', text: 'Aku pasang radio pendek di atapnya. Sinta, kau bisa mendengar?' },
      { speaker: 'SINTA', text: 'Jelas. Dan aku menangkap sesuatu di kanal pelabuhan.' },
    ],
    failLines: [
      { speaker: 'BIMO', text: 'Mobilnya tak sampai garasi. Jangan biarkan Gerhan melihat kita gagal dua kali.' },
      { speaker: 'ARA', text: 'Aku bawa pulang, lalu kita coba lagi.' },
    ],
    stages: [
      { type: 'steal', at: [-180, 40], searchRadius: 95, text: 'Ambil Kencana Pickup hijau dekat Jembatan Pasar Ikan' },
      {
        type: 'race', radius: 23, timeLimit: 105,
        checkpoints: [[307, 66], [125, 362], [-228, 205], [-12, -366]],
        text: 'Uji mobil di empat tikungan Jalan Lingkar Aruna',
      },
      { type: 'deliver', at: [-90, -270], radius: 20, text: 'Parkir pickup di garasi kru di Jalan Matahari' },
    ],
  },
  {
    id: 'malam-neon',
    title: 'Malam Neon',
    giver: 'SINTA',
    offer: { x: -270, z: 180, radius: 26 },
    reward: { money: 1900, rep: 100 },
    briefing: [
      { speaker: 'SINTA', text: 'Buku besar Gerhan bergerak malam ini. Van biru di Jalan Pelabuhan Baru, di bawah menara neon.' },
      { speaker: 'ARA', text: 'Kenapa kau tidak ambil sendiri?' },
      { speaker: 'SINTA', text: 'Aku di layar, kau di jalan. Ambil van-nya, tembus blokir, lalu hilang. Mereka sudah dihangatkan.' },
      { speaker: 'BIMO', text: 'Kalau mereka menangkapmu, buku itu hangus. Aku tutup belakang.' },
    ],
    debrief: [
      { speaker: 'SINTA', text: 'Aku sudah salin semua halamannya. Gerhan mencatat setiap kontainer — dan siapa yang membayar.' },
      { speaker: 'ARA', text: 'Ada nama yang berulang.' },
      { speaker: 'SINTA', text: 'Namanya Idrus. Aku belum siap mengatakannya keras-keras.' },
    ],
    failLines: [
      { speaker: 'SINTA', text: 'Buku itu hilang bersama van-nya. Kita masih punya jejak digitalnya.' },
      { speaker: 'ARA', text: 'Aku pulang dulu. Mereka terlalu cepat malam ini.' },
    ],
    stages: [
      { type: 'steal', at: [270, -90], searchRadius: 105, text: 'Ambil van biru di bawah menara neon Jalan Pelabuhan Baru' },
      { type: 'chase', at: [90, 90], radius: 25, heat: 2, timeLimit: 90, text: 'Tembus blokir polisi menuju Jalan Bakau' },
      { type: 'escape', escapeTime: 5, timeLimit: 65, text: 'Hilangkan pengejar sebelum mereka membaca platnya' },
      { type: 'deliver', at: [-270, 180], radius: 20, text: 'Bawa buku itu ke tempat persembunyian Sinta di Marina Senja' },
    ],
  },
  {
    id: 'kejaran-senja',
    title: 'Kejaran Senja',
    giver: 'DIMAS',
    offer: { x: -180, z: -180, radius: 26 },
    reward: { money: 2400, rep: 130 },
    briefing: [
      { speaker: 'DIMAS', text: 'Orang-orang Gerhan mulai menguntit kita. Kita buat mereka datang semua ke Jembatan Senja.' },
      { speaker: 'BIMO', text: 'Aku jaga jembatan. Kau tahan posisi, Ara. Sinta memotong sinyal mereka.' },
      { speaker: 'ARA', text: 'Berapa lama aku harus bertahan?' },
      { speaker: 'SINTA', text: 'Sampai matahari tenggelam. Di jam kota ini, delapan belas detik.' },
    ],
    debrief: [
      { speaker: 'BIMO', text: 'Mereka lari. Gerhan mulai kehilangan pegangan di kota ini.' },
      { speaker: 'DIMAS', text: 'Ada yang aneh. Penembak tadi know persis ke mana kita pergi.' },
      { speaker: 'ARA', text: 'Siapa yang memberi tahu mereka?' },
    ],
    failLines: [
      { speaker: 'DIMAS', text: 'Jembatan itu bukan tempat mati. Kita masih bisa menarik mereka lagi.' },
      { speaker: 'BIMO', text: 'Aku masih di sini. Aku belum selesai.' },
    ],
    stages: [
      { type: 'goto', at: [90, 6], radius: 20, text: 'Tarik pengejar ke Jembatan Senja' },
      { type: 'defend', at: [90, 6], radius: 25, duration: 18, heat: 3, timeLimit: 46, text: 'Tahan jembatan sampai Sinta memotong sinyal mereka' },
      { type: 'escape', escapeTime: 5, timeLimit: 55, text: 'Lebih dulu hilang dari sisa pengejar' },
    ],
  },
  {
    id: 'kapal-kuala',
    title: 'Kapal Kuala',
    giver: 'SINTA',
    offer: { x: -270, z: 180, radius: 26 },
    reward: { money: 3000, rep: 170 },
    briefing: [
      { speaker: 'SINTA', text: 'Kapal Kuala bersandar di dermaga. Manifestnya ada di hut ujung. Gerhan sendiri yang menjaga.' },
      { speaker: 'ARA', text: 'Kalau aku berhasil mengambilnya?' },
      { speaker: 'SINTA', text: 'Kita tahu ke mana kontainer itu pergi. Tapi kau harus keluar pelabuhan dengan bersih.' },
      { speaker: 'DIMAS', text: 'Aku siapkan mobil di Jalan Bakau. Jangan berhenti di tengah jembatan.' },
    ],
    debrief: [
      { speaker: 'SINTA', text: 'Manifest ini bukan cuma angka. Ada kapal yang tidak pernah bersandar di mana pun.' },
      { speaker: 'ARA', text: 'Jadi ke mana mereka membawanya?' },
      { speaker: 'SINTA', text: 'Ke laut, lalu kembali dengan nama baru. Dan Idrus menandatangani semuanya.' },
    ],
    failLines: [
      { speaker: 'SINTA', text: 'Manifestnya masih di tangan Gerhan. Kita kehilangan jejak kapalnya.' },
      { speaker: 'ARA', text: 'Aku keluar dari pelabuhan. Kita susun ulang.' },
    ],
    stages: [
      { type: 'goto', at: [-285, -72], radius: 17, text: 'Masuk lewat gerbang dermaga Kuala' },
      { type: 'goto', at: [-330, -72], radius: 13, text: 'Ambil manifest dari hut ujung dermaga' },
      { type: 'escape', heat: 3, escapeTime: 5, timeLimit: 72, text: 'Keluar dari pelabuhan sambil melepaskan pengejar' },
      { type: 'deliver', at: [-180, 180], radius: 20, text: 'Serahkan manifest ke persembunyian Marina Senja' },
    ],
  },
  {
    id: 'alih-kendali',
    title: 'Alih Kendali',
    giver: 'BIMO',
    offer: { x: -90, z: -270, radius: 26 },
    reward: { money: 3800, rep: 220 },
    briefing: [
      { speaker: 'BIMO', text: 'Sekarang kita ambil kendali. Van lapis baja Gerhan parkir di halaman kantornya di Jalan Matahari.' },
      { speaker: 'SINTA', text: 'Aku sudah tanam sinyal di radio mercusuar. Bawa van itu ke sana, aku siarkan buktinya.' },
      { speaker: 'ARA', text: 'Dan kalau mereka datang?' },
      { speaker: 'BIMO', text: 'Kita tunggu mereka. Kali ini kita yang punya dinding.' },
    ],
    debrief: [
      { speaker: 'SINTA', text: 'Siaran hidup. Seluruh teluk mendengar nama Gerhan sekarang.' },
      { speaker: 'DIMAS', text: 'Dan mereka mendengar nama Idrus juga. Dia meneleponku sepuluh menit lalu.' },
      { speaker: 'ARA', text: 'Dia tahu kita akan melakukan ini.' },
    ],
    failLines: [
      { speaker: 'BIMO', text: 'Radio itu masih milik Gerhan. Kita belum selesai, Ara.' },
      { speaker: 'SINTA', text: 'Aku masih punya rekaman cadangan. Jangan menyerah.' },
    ],
    stages: [
      { type: 'steal', at: [0, -90], searchRadius: 110, text: 'Ambil van lapis baja di halaman kantor Gerhan, Jalan Matahari' },
      {
        type: 'race', radius: 23, timeLimit: 115,
        checkpoints: [[0, -270], [180, -180], [270, 90], [-90, 270]],
        text: 'Bawa van melewati empat pos pengawal Gerhan',
      },
      { type: 'defend', at: [-340, 250], radius: 27, duration: 20, heat: 4, timeLimit: 52, text: 'Jaga pancaran radio di mercusuar sampai Sinta selesai' },
      { type: 'deliver', at: [-270, 270], radius: 22, text: 'Parkir van di titik aman Marina Senja' },
    ],
  },
  {
    id: 'pasang-surut',
    title: 'Pasang Surut',
    giver: 'PAK GERHAN',
    offer: { x: -320, z: -72, radius: 20 },
    reward: { money: 4800, rep: 280 },
    briefing: [
      { speaker: 'PAK GERHAN', text: 'Ara. Kau kira kau melawan aku? Pasang surut pun punya jadwal. Pak Idrus memberi tahu aku sebelum kau sempat memetakan dermaga ini.' },
      { speaker: 'ARA', text: 'Pak Idrus... orang yang mengajarku menyetir?' },
      { speaker: 'PAK GERHAN', text: 'Dia mengajar semua orang. Termasuk cara menjual mereka. Datang ke dermaga saat air surut. Sendiri.' },
      { speaker: 'SINTA', text: 'Jangan percaya kata-katanya. Tapi aku menemukan panggilan keluar dari radio kita malam itu. Dari nomor Pak Idrus.' },
    ],
    debrief: [
      { speaker: 'ARA', text: 'Air sudah surut. Kita tidak bisa kembali seperti sebelum ini.' },
    ],
    outro: [
      { speaker: 'PAK IDRUS', text: 'Ara... aku cuma mau kru ini selamat. Gerhan punya kapal, senjata, dan pengadilan di kantongnya.' },
      { speaker: 'ARA', text: 'Kau menjual kami. Sejak kiriman pertama?' },
      { speaker: 'PAK IDRUS', text: 'Aku menyelamatkan kalian dengan cara yang baru kau mengerti sekarang. Maafkan aku, Nak.' },
      { speaker: 'SINTA', text: 'Rekaman itu masih di tanganku. Kau yang pilih, Ara.' },
    ],
    finalChoice: {
      speaker: 'ARA',
      text: 'Pasang surut sudah berubah. Apa yang harus kulakukan dengan nama Pak Idrus?',
      choices: [
        {
          label: 'Siarkan yang sebenarnya', value: 'truth',
          reward: { money: 5000, rep: 300 },
          outro: [
            { speaker: 'SINTA', text: 'Rekaman masuk ke semua frekuensi. Nama Idrus ikut terbawa.' },
            { speaker: 'ARA', text: 'Kru kita kehilangan seorang mentor. Teluk ini mendapatkan kebenaran. Gerhan kehilangan pelabuhannya.' },
            { speaker: 'DIMAS', text: 'Akan aku perbaiki radio itu. Dan kita mulai dari nol lagi.' },
          ],
        },
        {
          label: 'Lindungi nama Pak Idrus', value: 'loyalty',
          reward: { money: 4200, rep: 260 },
          outro: [
            { speaker: 'ARA', text: 'Potong bagian itu. Biar dia tetap jadi orang yang mengajarku menyetir.' },
            { speaker: 'SINTA', text: 'Gerhan jatuh, bukunya di tangan kita. Tapi rahasia ini tetap di teluk.' },
            { speaker: 'PAK IDRUS', text: 'Terima kasih, Ara. Suatu hari nanti aku akan menceritakan semuanya padamu.' },
          ],
        },
      ],
    },
    failLines: [
      { speaker: 'PAK GERHAN', text: 'Kau datang sendirian, tapi tetap kalah. Air surut tidak menunggu siapa pun.' },
      { speaker: 'ARA', text: 'Belum selesai. Aku masih punya kru.' },
    ],
    stages: [
      { type: 'goto', at: [-285, -72], radius: 17, text: 'Temui Pak Gerhan di dermaga saat air surut' },
      { type: 'chase', at: [90, 6], radius: 25, heat: 4, timeLimit: 100, text: 'Bawa kabar pengkhianatan itu ke Jembatan Senja' },
      { type: 'defend', at: [90, 6], radius: 27, duration: 16, heat: 5, timeLimit: 50, text: 'Tahan jembatan sampai siaran terakhir Sinta hidup' },
    ],
  },
];

function jobById(id) {
  return JOBS.find((job) => job.id === id) || null;
}

function inRadius(x, z, at, radius) {
  if (!Array.isArray(at)) return false;
  const dx = x - at[0];
  const dz = z - at[1];
  return dx * dx + dz * dz <= radius * radius;
}

/**
 * @param {object} deps - THREE, scene, player, vehicles, police, dialog, progress and onEvent.
 */
export function createMissions(deps = {}) {
  const THREE = deps.THREE || null;
  const scene = deps.scene || null;
  const player = deps.player;
  const vehicles = deps.vehicles;
  const police = deps.police || null;
  const progress = deps.progress || createProgress();
  const dialog = deps.dialog || {
    isActive: () => false,
    play(lines, done) { if (typeof done === 'function') done(); },
  };

  const listeners = new Set();
  const emit = (type, data) => {
    const payload = data || {};
    for (const fn of listeners) {
      try { fn(type, payload); } catch { /* ignore listener failures */ }
    }
    if (typeof deps.onEvent === 'function') deps.onEvent(type, payload);
  };

  let activeId = null;
  let stageIndex = 0;
  let stageTime = 0;
  let stageData = {};
  let cargoCar = null;
  let unlock = null;
  let bootTimer = 0;
  let bootDone = false;
  let elapsed = 0;
  const completed = new Set();
  const markers = [];
  const currentView = { reward: {} };

  // ---- World markers: glowing cylinders that track the current objective ---------------------
  function makeMarker() {
    if (!THREE || !scene || typeof THREE.CylinderGeometry !== 'function') return null;
    const group = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x66e8ff, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const baseMat = new THREE.MeshBasicMaterial({
      color: 0x66e8ff, transparent: true, opacity: 0.48,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x66e8ff, transparent: true, opacity: 0.75, depthWrite: false, fog: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 19, 14, 1, true), beamMat);
    beam.position.y = 9.6;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.42, 24, 1, true), baseMat);
    base.position.y = 0.35;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.4, 10), coreMat);
    core.position.y = 2.1;
    group.add(beam, base, core);
    group.visible = false;
    scene.add(group);
    let active = true;
    return {
      group,
      set(x, z, hex, isActive) {
        group.visible = true;
        group.position.set(x, 0, z);
        beamMat.color.setHex(hex);
        baseMat.color.setHex(hex);
        coreMat.color.setHex(hex);
        active = !!isActive;
        group.scale.setScalar(active ? 1 : 0.62);
      },
      update(t) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3.2 + group.position.x * 0.01);
        beamMat.opacity = (active ? 0.12 : 0.05) + pulse * (active ? 0.11 : 0.04);
        baseMat.opacity = (active ? 0.32 : 0.14) + pulse * 0.22;
        coreMat.opacity = (active ? 0.5 : 0.22) + pulse * 0.3;
        core.position.y = 2.1 + pulse * 0.5;
        group.rotation.y = t * 0.55;
      },
    };
  }

  function markerAt(i) {
    while (markers.length <= i) {
      const marker = makeMarker();
      if (!marker) return null;
      markers.push(marker);
    }
    return markers[i];
  }

  function targetsForStage(stage) {
    if (!stage) return [];
    switch (stage.type) {
      case 'steal':
        return stageData.car ? [{
          x: stageData.car.pos.x, z: stageData.car.pos.z,
          color: MARKER_COLORS.steal, active: true,
        }] : [];
      case 'race':
        return (stageData.checkpoints || []).map((cp, i) => ({
          x: cp.x, z: cp.z, color: MARKER_COLORS.race, active: i === stageData.cp,
        }));
      case 'goto':
      case 'chase':
      case 'deliver':
      case 'defend':
        return stage.at ? [{ x: stage.at[0], z: stage.at[1], color: MARKER_COLORS[stage.type], active: true }] : [];
      default:
        return [];
    }
  }

  function updateMarkers() {
    let used = 0;
    if (activeId && !dialog.isActive()) {
      const job = jobById(activeId);
      const targets = targetsForStage(job && job.stages[stageIndex]);
      for (const target of targets) {
        const marker = markerAt(used);
        if (!marker) break;
        marker.set(target.x, target.z, target.color, target.active);
        marker.update(elapsed);
        used += 1;
      }
    }
    if (unlock) {
      const marker = markerAt(used);
      if (marker) {
        marker.set(unlock.x, unlock.z, MARKER_COLORS.offer, true);
        marker.update(elapsed);
        used += 1;
      }
    }
    for (let i = used; i < markers.length; i += 1) markers[i].group.visible = false;
  }

  // ---- Story flow ----------------------------------------------------------------------------
  function setUnlock(id) {
    const index = MISSION_IDS.indexOf(id);
    const next = index >= 0 ? jobById(MISSION_IDS[index + 1]) : null;
    if (!next) {
      unlock = null;
      emit('story-complete', { id: 'pasang-surut', title: 'Pasang Surut' });
      return;
    }
    unlock = { jobId: next.id, x: next.offer.x, z: next.offer.z, radius: next.offer.radius };
    emit('offer', {
      id: next.id, title: next.title, giver: next.giver,
      x: next.offer.x, z: next.offer.z,
    });
  }

  function clearCargo() {
    if (cargoCar) {
      cargoCar.missionCargo = false;
      cargoCar.missionTarget = false;
      cargoCar = null;
    }
  }

  function raiseHeat(stars) {
    if (!police || !stars) return;
    const current = typeof police.getWanted === 'function' ? police.getWanted() : 0;
    if (current < stars && typeof police.setWanted === 'function') {
      police.setWanted(stars, 'story');
    }
  }

  function clearHeat() {
    if (police && typeof police.clearWanted === 'function') police.clearWanted();
  }

  function enterStage() {
    const job = jobById(activeId);
    if (!job) return;
    const stage = job.stages[stageIndex];
    stageTime = 0;
    stageData = {};

    switch (stage.type) {
      case 'steal': {
        let best = null;
        let bestDistance = Infinity;
        const cars = (vehicles && vehicles.cars) || [];
        for (const car of cars) {
          const dx = car.pos.x - stage.at[0];
          const dz = car.pos.z - stage.at[1];
          const d2 = dx * dx + dz * dz;
          if (d2 < bestDistance) { bestDistance = d2; best = car; }
        }
        stageData.car = best;
        if (best) best.missionTarget = true;
        break;
      }
      case 'race':
        stageData.checkpoints = (stage.checkpoints || []).map(([x, z]) => ({
          x, z, radius: stage.radius || 20,
        }));
        stageData.cp = 0;
        break;
      case 'defend':
        stageData.held = 0;
        raiseHeat(stage.heat);
        break;
      case 'chase':
        raiseHeat(stage.heat || 1);
        break;
      case 'escape':
        stageData.clearFor = 0;
        raiseHeat(stage.heat);
        break;
      default:
        break;
    }
    emit('stage', {
      id: activeId, index: stageIndex, count: job.stages.length,
      type: stage.type, text: stage.text, objective: objectiveText(),
    });
  }

  function startJob(id) {
    if (activeId || dialog.isActive()) return false;
    const job = jobById(id);
    if (!job) return false;
    const index = MISSION_IDS.indexOf(id);
    if (index > 0 && !completed.has(MISSION_IDS[index - 1])) return false;
    if (unlock && unlock.jobId === id) unlock = null;

    activeId = id;
    stageIndex = 0;
    stageTime = 0;
    stageData = {};
    clearCargo();
    enterStage();
    emit('start', { id, title: job.title, giver: job.giver, reward: { ...job.reward } });
    dialog.play(job.briefing, () => emit('briefing-end', { id }));
    return true;
  }

  function completeWithReward(job, reward, lines, choice) {
    const actual = reward || job.reward;
    progress.addMoney(actual.money || 0);
    progress.addRep(actual.rep || 0);
    progress.bumpStat('missionsCompleted');
    if (job.stages.some((stage) => stage.type === 'deliver')) progress.bumpStat('carsDelivered');
    completed.add(job.id);
    emit('complete', {
      id: job.id, title: job.title, choice: choice || 'default',
      reward: { money: actual.money || 0, rep: actual.rep || 0 },
      rank: progress.getRank(), money: progress.getMoney(), rep: progress.getRep(),
    });
    dialog.play(lines, () => setUnlock(job.id));
  }

  function finishJob(success, reason) {
    const job = jobById(activeId);
    if (!job) return;
    activeId = null;
    stageIndex = 0;
    stageData = {};
    clearCargo();
    clearHeat();

    if (success) {
      if (job.finalChoice) {
        const choiceLine = {
          type: 'choice',
          speaker: job.finalChoice.speaker,
          text: job.finalChoice.text,
          choices: job.finalChoice.choices.map((option) => ({
            label: option.label,
            value: option.value,
            action: () => completeWithReward(job, option.reward, option.outro, option.value),
          })),
        };
        dialog.play([...job.outro, choiceLine], () => {});
      } else {
        completeWithReward(job, job.reward, job.debrief, 'default');
      }
      return;
    }

    progress.addMoney(-250);
    progress.addRep(-15);
    progress.bumpStat('missionsFailed');
    emit('fail', { id: job.id, title: job.title, reason: reason || 'Misi gagal', money: progress.getMoney() });
    const lines = [
      { speaker: job.giver, text: reason || 'Kita gagal kali ini.' },
      ...(job.failLines || []),
    ];
    dialog.play(lines, () => setUnlock(job.id));
  }

  function failJob(reason) {
    if (activeId) finishJob(false, reason);
  }

  /** Forward an arrest/death from police or combat; active jobs fail on either. */
  function onGameEvent(type) {
    if (type === 'busted') failJob('Kau ditahan polisi. Kru kehilangan pengemudi untuk sementara.');
    else if (type === 'wasted') failJob('Kau tumbang di jalan. Kru harus mengulang dari awal.');
  }

  function completeStage() {
    const job = jobById(activeId);
    if (!job) return;
    if (stageData.car) stageData.car.missionTarget = false;
    stageIndex += 1;
    if (stageIndex < job.stages.length) enterStage();
    else finishJob(true);
  }

  function objectiveText() {
    if (!activeId) {
      return unlock ? `JOB BARU: ${jobById(unlock.jobId)?.title || ''} — temui ${jobById(unlock.jobId)?.giver || 'kru'} di penanda emas` : '';
    }
    const job = jobById(activeId);
    const stage = job && job.stages[stageIndex];
    if (!stage) return job ? job.title : '';
    let detail = stage.text || '';
    if (stage.type === 'race' && stageData.checkpoints) {
      detail += `  ·  POS ${Math.min(stageData.cp + 1, stageData.checkpoints.length)}/${stageData.checkpoints.length}`;
    } else if (stage.type === 'defend') {
      detail += `  ·  ${Math.floor(stageData.held || 0)}/${stage.duration}s`;
    } else if (stage.type === 'escape') {
      detail += `  ·  ★ ${police && police.getWanted ? police.getWanted() : 0}`;
    } else if (stage.type === 'deliver' && cargoCar) {
      detail += `  ·  ${cargoCar.name}`;
    }
    const time = stage.timeLimit ? `  ·  ${Math.max(0, Math.ceil(stage.timeLimit - stageTime))}s` : '';
    return `${job.title}  ·  ${detail}${time}`;
  }

  /** One reused snapshot for the HUD; its nested target is kept across calls too. */
  function current() {
    if (!activeId) return null;
    const job = jobById(activeId);
    const stage = job && job.stages[stageIndex];
    currentView.id = activeId;
    currentView.title = job.title;
    currentView.giver = job.giver;
    currentView.stage = stageIndex;
    currentView.stageCount = job.stages.length;
    currentView.stageType = stage ? stage.type : null;
    currentView.objective = objectiveText();
    currentView.hint = stage ? stage.text : '';
    currentView.reward.money = job.reward.money;
    currentView.reward.rep = job.reward.rep;
    if (stage && stage.at) {
      if (!currentView.target) currentView.target = { x: 0, z: 0, radius: 0 };
      currentView.target.x = stage.at[0];
      currentView.target.z = stage.at[1];
      currentView.target.radius = stage.radius;
    } else {
      currentView.target = null;
    }
    currentView.timeLeft = stage && stage.timeLimit ? Math.max(0, stage.timeLimit - stageTime) : null;
    return currentView;
  }

  // ---- Per-stage checks -----------------------------------------------------------------------
  function updateStage(dt) {
    const job = jobById(activeId);
    if (!job) return;
    const stage = job.stages[stageIndex];
    if (!stage) { finishJob(true); return; }
    stageTime += dt;
    const px = player && player.pos ? player.pos.x : 0;
    const pz = player && player.pos ? player.pos.z : 0;

    switch (stage.type) {
      case 'goto': {
        if (inRadius(px, pz, stage.at, stage.radius)) completeStage();
        break;
      }
      case 'steal': {
        const car = stageData.car;
        if (!car || car.health <= 0 || car.disabled) {
          failJob('Mobil target rusak atau hilang. Dimas akan mencari pengganti.');
          break;
        }
        if (player && player.vehicle === car) {
          cargoCar = car;
          car.missionTarget = false;
          car.missionCargo = true;
          completeStage();
        }
        break;
      }
      case 'chase': {
        if (inRadius(px, pz, stage.at, stage.radius)) {
          clearHeat();
          completeStage();
        } else if (stage.timeLimit && stageTime > stage.timeLimit) {
          failJob('Pengejar menghilang di kejauhan. Jejaknya putus.');
        }
        break;
      }
      case 'escape': {
        const units = police && typeof police.getUnits === 'function' ? police.getUnits() : [];
        let nearest = Infinity;
        for (const unit of units) {
          if (Number.isFinite(unit.distance)) nearest = Math.min(nearest, unit.distance);
        }
        if (!units.length || nearest > 92) stageData.clearFor += dt;
        else stageData.clearFor = 0;
        const stars = police && typeof police.getWanted === 'function' ? police.getWanted() : 0;
        if (stars === 0 || stageData.clearFor >= (stage.escapeTime || 5)) {
          clearHeat();
          completeStage();
        } else if (stage.timeLimit && stageTime > stage.timeLimit) {
          failJob('Mereka menangkap jejak kita. Pengejaran berakhir di sini.');
        }
        break;
      }
      case 'deliver': {
        // Some jobs carry cargo on foot (a manifest in a pocket); others need the tagged car.
        const car = cargoCar;
        if (car && (car.health <= 0 || car.disabled)) {
          failJob('Kendaraan pengangkut tidak bisa melanjutkan perjalanan.');
          break;
        }
        const playerAt = inRadius(px, pz, stage.at, stage.radius);
        const carAt = !!car && inRadius(car.pos.x, car.pos.z, stage.at, stage.radius + 8);
        const drivingIn = !!(car && player && player.inVehicle && player.vehicle === car);
        if ((drivingIn && playerAt && Math.abs(car.speed) < 6) || (playerAt && (!car || carAt))) {
          completeStage();
        } else if (stage.timeLimit && stageTime > stage.timeLimit) {
          failJob('Waktu pengiriman habis. Tempatnya sudah diawasi.');
        }
        break;
      }
      case 'defend': {
        if (!player || player.health <= 0) {
          failJob('Kau tidak bisa menahan posisi sendirian.');
          break;
        }
        if (inRadius(px, pz, stage.at, stage.radius)) stageData.held += dt;
        else stageData.held = Math.max(0, (stageData.held || 0) - dt * 0.6);
        if (stageData.held >= stage.duration) {
          clearHeat();
          completeStage();
        } else if (player.health < 22) {
          failJob('Terlalu banyak luka. Kru menarikmu dari posisi.');
        } else if (stage.timeLimit && stageTime > stage.timeLimit) {
          failJob('Pertahanan jebol. Mereka menerobos garis kita.');
        }
        break;
      }
      case 'race': {
        const car = cargoCar || (player && player.vehicle);
        const driving = !!(car && player && player.inVehicle && player.vehicle === car);
        if (driving) {
          if (car.health <= 0 || car.disabled) {
            failJob('Mobil tidak sanggup menempuh rute ini.');
            break;
          }
          const cp = (stageData.checkpoints || [])[stageData.cp];
          if (cp && inRadius(car.pos.x, car.pos.z, [cp.x, cp.z], cp.radius)) {
            stageData.cp += 1;
            progress.bumpStat('checkpointsCleared');
            if (stageData.cp >= stageData.checkpoints.length) {
              completeStage();
              break;
            }
          }
        }
        if (stage.timeLimit && stageTime > stage.timeLimit) {
          failJob('Waktu rute habis. Gerhan mengubah pengawalnya.');
        }
        break;
      }
      default:
        completeStage();
        break;
    }
  }

  function update(dt) {
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    elapsed += step;

    if (dialog.isActive()) {
      updateMarkers();
      return;
    }

    if (!activeId) {
      if (!bootDone) {
        bootTimer += step;
        if (bootTimer >= 2.4) {
          bootDone = true;
          startJob(MISSION_IDS[0]);
        }
      }
      if (unlock && player && player.pos) {
        const dx = player.pos.x - unlock.x;
        const dz = player.pos.z - unlock.z;
        if (dx * dx + dz * dz <= unlock.radius * unlock.radius) {
          const id = unlock.jobId;
          unlock = null;
          startJob(id);
        }
      }
      if (player && player.health <= 0 && bootDone) failJob('Kau tumbang di jalan. Kru harus mengulang dari awal.');
      updateMarkers();
      return;
    }

    updateStage(step);
    updateMarkers();
  }

  return {
    update,
    startJob,
    current,
    onGameEvent,
    objectiveText,
    getRep: () => progress.getRep(),
    addRep: (n) => progress.addRep(n),
    getSaveData: () => ({
      completed: [...completed],
      activeId, stageIndex, unlock,
      progress: progress.toJSON(),
    }),
    /**
     * Restore a saved story. A job in progress resumes at the beginning of its saved stage —
     * timers and checkpoints restart, but completed jobs and offers come back exactly as saved.
     */
    load(data = {}) {
      if (dialog && typeof dialog.clear === 'function') dialog.clear();
      completed.clear();
      for (const id of (Array.isArray(data.completed) ? data.completed : [])) {
        if (jobById(id)) completed.add(id);
      }
      activeId = jobById(data.activeId) ? data.activeId : null;
      stageIndex = Number.isFinite(data.stageIndex) ? Math.max(0, Math.floor(data.stageIndex)) : 0;
      const savedUnlock = data.unlock;
      unlock = savedUnlock && jobById(savedUnlock.jobId) ? {
        jobId: savedUnlock.jobId,
        x: Number.isFinite(savedUnlock.x) ? savedUnlock.x : 0,
        z: Number.isFinite(savedUnlock.z) ? savedUnlock.z : 0,
        radius: Number.isFinite(savedUnlock.radius) ? savedUnlock.radius : 26,
      } : null;
      bootDone = true;
      bootTimer = 0;
      stageTime = 0;
      stageData = {};
      elapsed = 0;
      clearCargo();
      if (activeId) {
        const job = jobById(activeId);
        stageIndex = Math.min(stageIndex, job.stages.length - 1);
        enterStage();
      }
      emit('loaded', { id: activeId, title: activeId ? jobById(activeId).title : null });
    },
    getJobs: () => JOBS.map((job, i) => ({
      id: job.id,
      title: job.title,
      giver: job.giver,
      completed: completed.has(job.id),
      unlocked: i === 0 || completed.has(MISSION_IDS[i - 1]),
      reward: { ...job.reward },
    })),
    getMarkers: () => markers,
    getState: () => ({
      activeId, stageIndex, stageTime, stageData, unlock,
      bootDone, completed: [...completed], cargoCar: cargoCar ? cargoCar.name : null,
    }),
    on(fn) {
      if (typeof fn === 'function') listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      for (const marker of markers) {
        if (marker && marker.group && marker.group.parent) marker.group.parent.remove(marker.group);
      }
      markers.length = 0;
      listeners.clear();
    },
  };
}
