// Shared rules and content for KOTA ARUNA.
// Everything the simulation, the HUD and the story need lives here so the
// city builder and the game loop never disagree about names or numbers.

export const TITLE = 'KOTA ARUNA';
export const SUBTITLE = 'SEASIDE CRIME STORIES';
export const FIXED_STEP = 1 / 60;

export const WORLD = {
  minX: -640,
  maxX: 540,
  minZ: -540,
  maxZ: 540,
  seaLevel: 0.06,
  boundary: 500,
};

export const DISTRICTS = [
  {
    id: 'teluk-aruna',
    name: 'TELUK ARUNA',
    tag: 'HARBOR DOWNTOWN',
    center: { x: 165, z: 45 },
    radius: 310,
    color: '#ff9a6a',
  },
  {
    id: 'marina-senja',
    name: 'MARINA SENJA',
    tag: 'SUNSET BEACH',
    center: { x: -205, z: -145 },
    radius: 285,
    color: '#67e5f5',
  },
];

export const PALETTE = {
  zenith: '#211744',
  horizon: '#f58b70',
  sunlight: '#ffd79a',
  haze: '#e6a18c',
  deepSea: '#0e3045',
  shallowSea: '#3d999a',
  sand: '#f0c991',
  soil: '#3b3248',
  asphalt: '#191b28',
  ringAsphalt: '#252838',
  paint: '#ffdfa8',
  timber: '#704a35',
  stone: '#8b7b7f',
  glass: '#8ad9ef',
  lamp: '#ffbe6a',
  neonPink: '#ff63a8',
  neonBlue: '#5ceeff',
  houseColors: ['#f3b6a2', '#f7d7a6', '#a9dcd1', '#e6a6c6', '#c5b8e9', '#9fcaeb'],
  towerColors: ['#7187ae', '#9187b8', '#638c9d', '#8578a3', '#7996b4'],
  leafColors: ['#2f6b4e', '#3d8c60', '#255d47', '#519d68'],
};

export const LAYOUT = {
  shoreX: -318,
  beachWidth: 62,
  gridX: [-220, -100, 20, 145, 275, 390],
  gridZ: [-320, -175, -30, 120, 265, 400],
  streetWidth: 17,
  ring: { x: 70, z: 15, rx: 385, rz: 420, width: 26, pieces: 80 },
  channel: { z: 205, halfWidth: 30, fromX: -330, toX: 190 },
  pier: { z: -185, fromX: -300, toX: -455, width: 11 },
  lighthouse: { x: -452, z: -185 },
  helipad: { x: 300, z: -250, radius: 26 },
  towery: { fromX: -20, toX: 450, fromZ: -450, toZ: 450 },
  beachy: { fromX: -300, toX: -10, fromZ: -445, toZ: 445 },
};

export const STREETS = {
  vertical: [
    'Jalan Teluk Aruna',
    'Jalan Ombak Biru',
    'Jalan Bintang Utara',
    'Jalan Dermaga Tua',
    'Jalan Cakrawala',
    'Jalan Pelabuhan Baru',
  ],
  horizontal: [
    'Jalan Marina Senja',
    'Jalan Pantai Kencana',
    'Jalan Senja Raya',
    'Jalan Tanjung Harapan',
    'Jalan Pasir Emas',
    'Jalan Langit Timur',
  ],
  ring: 'Jalan Lingkar Aruna',
  pier: 'Dermaga Karang Senja',
};

export const CREW = [
  { id: 'ara', name: 'Ara', role: 'Harbor fixer', color: '#ffd07d', line: 'Kalau air naik, semua jejak ikut hilang.' },
  { id: 'dimas', name: 'Dimas', role: 'Wheel man', color: '#78e0ff', line: 'Aku bisa bawa mobil itu lewat gang sempit.' },
  { id: 'sinta', name: 'Sinta', role: 'Tide analyst', color: '#ff8bc0', line: 'Angka-angka pasang tidak pernah berbohong.' },
  { id: 'bimo', name: 'Bimo', role: 'Pier muscle', color: '#a5f0a0', line: 'Di dermaga, aku yang paling tahu mana yang kosong.' },
];

export const MISSIONS = [
  {
    id: 'm1',
    number: '01',
    title: 'SAPA TELUK',
    district: 'teluk-aruna',
    crew: 'ara',
    marker: { x: 205, z: 72 },
    payout: 900,
    brief: 'Ara menunggu di pelabuhan. Temui dia dan ambil kunci mobil.',
    objective: 'Pergi ke titik Ara di Teluk Aruna',
    dialogue: 'Ara: Selamat datang di kota yang never tidur. Mobilnya di depan gudang.',
    rewardLine: 'Ara: Satu langkah. Jangan tanya siapa yang bayar.',
  },
  {
    id: 'm2',
    number: '02',
    title: 'LAMPU SENJA',
    district: 'marina-senja',
    crew: 'dimas',
    marker: { x: -238, z: -228 },
    payout: 1250,
    brief: 'Dimas menyimpan paket di pantai. Jemput dan bawa ke mobil.',
    objective: 'Temukan paket Dimas di Marina Senja',
    dialogue: 'Dimas: Aku taruh di bawah payung ke-empat. Jangan booting.',
    rewardLine: 'Dimas: Mudah. Sekarang bagian yang sulit.',
  },
  {
    id: 'm3',
    number: '03',
    title: 'KEPINGAN PASIR',
    district: 'marina-senja',
    crew: 'sinta',
    marker: { x: -96, z: -300 },
    payout: 1600,
    brief: 'Sinta perlu data dari mobil kurir di jalan lingkar. Ikuti dia.',
    objective: 'Capai titik pengintai Sinta di ring road selatan',
    dialogue: 'Sinta: Kurir itu membawa lebih dari sekadar pasir. Dekati dia pelan-pelan.',
    rewardLine: 'Sinta: Datanya sudah masuk. Ada yang aneh dengan jam surutnya.',
  },
  {
    id: 'm4',
    number: '04',
    title: 'ANGIN TIMUR',
    district: 'teluk-aruna',
    crew: 'ara',
    marker: { x: 300, z: -250 },
    payout: 2100,
    brief: 'Helikopter di helipad. Terbang ke mercusuar dan menyalakan sorotan.',
    objective: 'Naik helikopter di helipad Teluk Aruna',
    dialogue: 'Ara: Lampu sorotnya kuat. Kalau ada yang nanya, kau sedang cari kapal hilang.',
    rewardLine: 'Ara: Bimo sudah menunggu di dermaga.',
  },
  {
    id: 'm5',
    number: '05',
    title: 'DERMAGA GELAP',
    district: 'marina-senja',
    crew: 'bimo',
    marker: { x: -420, z: -185 },
    payout: 2600,
    brief: 'Bimo terkepung di dermaga tua. Beri mereka alasan untuk pergi.',
    objective: 'Tolong Bimo di ujung Dermaga Karang Senja',
    dialogue: 'Bimo: Ada tiga mobil di belakangku. Aku masih punya satu tangan kosong.',
    rewardLine: 'Bimo: Beres. Tapi aku lihat siapa yang kirim mereka.',
  },
  {
    id: 'm6',
    number: '06',
    title: 'GELOMBANG BALIK',
    district: 'teluk-aruna',
    crew: 'dimas',
    marker: { x: 40, z: 205 },
    payout: 3200,
    brief: 'Konvoi lewat jembatan kanal. Kejar dan halangi sebelum sampai kota.',
    objective: 'Sergap konvoi di jembatan kanal Aruna',
    dialogue: 'Dimas: Mereka bawa peti dari kapal. Kita potong di jembatan.',
    rewardLine: 'Dimas: Petinya kosong, Dimas. Mereka cuma mau kita keliatan di sini.',
  },
  {
    id: 'm7',
    number: '07',
    title: 'PASANG SURUT',
    district: 'teluk-aruna',
    crew: 'sinta',
    marker: { x: 300, z: -250 },
    payout: 6000,
    brief: 'Sinta mengaku. Mereka memakai data pasang untuk mengatur permainan. Balik arah.',
    objective: 'Kumpulkan kru di helipad untuk keluar kota',
    dialogue: 'Sinta: Aku yang kirim jam surut mereka. Aku kira ini cuma soal uang. Pasang surut, Ara. Air balik, kita juga.',
    rewardLine: 'Ara: Kota ini masih punya kita. Sampai besok pagi.',
  },
];

export const WEAPONS = [
  { id: 'fists', name: 'TANGAN KOSONG', short: 'FIST', capacity: Infinity, damage: 12, rate: 0.35 },
  { id: 'pistol', name: 'PISTOL ARUNA', short: 'PST', capacity: 48, damage: 28, rate: 0.18 },
  { id: 'smg', name: 'SMG SENJA', short: 'SMG', capacity: 180, damage: 17, rate: 0.075 },
  { id: 'launcher', name: 'PELURU PASANG', short: 'RKT', capacity: 8, damage: 90, rate: 0.9 },
];

export const RADIO = [
  { id: 'aruna', name: 'ARUNA FM', freq: '98.4', tag: 'harbor soul', bpm: 96, root: 220 },
  { id: 'senja', name: 'SENJA PULSE', freq: '104.7', tag: 'beach drive', bpm: 122, root: 261.6 },
  { id: 'pasang', name: 'PASANG RADIO', freq: '88.1', tag: 'late night truth', bpm: 84, root: 196 },
];

export const WANTED = [
  { stars: 0, name: 'BERSIH', fine: 0 },
  { stars: 1, name: 'DIPERHATIKAN', fine: 200 },
  { stars: 2, name: 'DIBURU', fine: 450 },
  { stars: 3, name: 'BERBAHAYA', fine: 900 },
  { stars: 4, name: 'TERCARI', fine: 1600 },
  { stars: 5, name: 'LEGENDARIS', fine: 3000 },
];

export const SPAWNS = [
  { x: 238, z: 86, heading: -0.5, label: 'GUDANG TELUK' },
  { x: -225, z: -215, heading: 0.9, label: 'PANTAI SENJA' },
  { x: 70, z: -390, heading: 0, label: 'RING ROAD' },
  { x: 42, z: 205, heading: Math.PI / 2, label: 'JEMBATAN KANAL' },
  { x: -380, z: -185, heading: -Math.PI / 2, label: 'DERMAGA LAMA' },
];

export const START_MONEY = 2500;
export const SHOT_LABELS = {
  cover: 'Sunset over Teluk Aruna',
  chase: 'Ring road pursuit',
  marina: 'Searchlight over Marina Senja',
  finale: 'Pasang Surut at the helipad',
};
