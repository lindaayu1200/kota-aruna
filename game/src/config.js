export const NAME = 'KOTA ARUNA';
export const CLAIM = 'SEASIDE CRIME STORIES';
export const STEP = 1 / 60;

export const BOUNDS = {
  west: -660,
  east: 540,
  north: -540,
  south: 540,
  waterline: 0.08,
  patrolLimit: 500,
};

export const DISTRICTS = [
  {
    key: 'teluk-aruna',
    label: 'TELUK ARUNA',
    subtitle: 'HARBOR DOWNTOWN',
    center: { x: 165, z: 45 },
    reach: 310,
    tint: '#ff9a6a',
  },
  {
    key: 'marina-senja',
    label: 'MARINA SENJA',
    subtitle: 'SUNSET BEACH',
    center: { x: -205, z: -145 },
    reach: 285,
    tint: '#67e5f5',
  },
];

export const COLORS = {
  zenith: '#211744',
  dusk: '#f58b70',
  sunbeam: '#ffd79a',
  mist: '#e6a18c',
  deep: '#0e3045',
  shallow: '#3d999a',
  sand: '#f0c991',
  ground: '#3b3248',
  tarmac: '#191b28',
  beltTarmac: '#252838',
  paint: '#ffdfa8',
  wood: '#704a35',
  concrete: '#8b7b7f',
  glazing: '#8ad9ef',
  lamp: '#ffbe6a',
  neonRose: '#ff63a8',
  neonIce: '#5ceeff',
  cottages: ['#f3b6a2', '#f7d7a6', '#a9dcd1', '#e6a6c6', '#c5b8e9', '#9fcaeb'],
  offices: ['#7187ae', '#9187b8', '#638c9d', '#8578a3', '#7996b4'],
  fronds: ['#2f6b4e', '#3d8c60', '#255d47', '#519d68'],
};

export const GRID = {
  avenues: [-220, -100, 20, 145, 275, 390],
  lanes: [-320, -175, -30, 120, 265, 400],
  streetWidth: 17,
  shore: -318,
  sandDepth: 62,
  belt: { x: 70, z: 15, rx: 385, rz: 420, width: 26, sections: 80 },
  canal: { z: 205, half: 30, west: -330, east: 190 },
  jetty: { z: -185, shoreEnd: -300, seaEnd: -455, width: 11 },
  lighthouse: { x: -452, z: -185 },
  landing: { x: 300, z: -250, radius: 26 },
  officeZone: { west: -20, east: 450, north: -450, south: 450 },
  cottageZone: { west: -300, east: -10, north: -445, south: 445 },
};

export const STREET_NAMES = {
  northSouth: [
    'Jalan Teluk Aruna',
    'Jalan Ombak Biru',
    'Jalan Bintang Utara',
    'Jalan Dermaga Tua',
    'Jalan Cakrawala',
    'Jalan Pelabuhan Baru',
  ],
  eastWest: [
    'Jalan Marina Senja',
    'Jalan Pantai Kencana',
    'Jalan Senja Raya',
    'Jalan Tanjung Harapan',
    'Jalan Pasir Emas',
    'Jalan Langit Timur',
  ],
  ring: 'Jalan Lingkar Aruna',
  jetty: 'Dermaga Karang Senja',
};

export const CREW = [
  {
    key: 'ara',
    name: 'Ara',
    role: 'Harbor fixer',
    tint: '#ffd07d',
    quote: 'Kalau air naik, jejak ikut hilang. Itu bukan cerita, itu kerja.',
  },
  {
    key: 'dimas',
    name: 'Dimas',
    role: 'Wheel man',
    tint: '#78e0ff',
    quote: 'Gang sempit bukan masalah. Rem yang lambat baru masalah.',
  },
  {
    key: 'sinta',
    name: 'Sinta',
    role: 'Tide analyst',
    tint: '#ff8bc0',
    quote: 'Angka pasang tidak pernah berbohong. Orang yang menyalin dia yang berbohong.',
  },
  {
    key: 'bimo',
    name: 'Bimo',
    role: 'Pier muscle',
    tint: '#a5f0a0',
    quote: 'Di dermaga aku tahu mana papan yang berderit dan mana kepala yang bakal pecah.',
  },
];

export const JOBS = [
  {
    key: 'job-1',
    number: 1,
    title: 'SAPA TELUK',
    district: 'teluk-aruna',
    lead: 'ara',
    point: { x: 210, z: 78 },
    pay: 900,
    brief: 'Ara menunggu di gudang pelabuhan dengan kunci mobil.',
    goal: 'Temui Ara di Teluk Aruna',
    intro: 'Ara: Kau tepat waktu. Kuncinya di kap mesin, jangan tanya pemiliknya.',
    outro: 'Ara: Satu selesai. Masih enam lagi sebelum air berubah.',
  },
  {
    key: 'job-2',
    number: 2,
    title: 'PAKET SENJA',
    district: 'marina-senja',
    lead: 'dimas',
    point: { x: -232, z: -224 },
    pay: 1250,
    brief: 'Dimas menaruh paket di bawah payung pantai. Ambil sebelum orang lain.',
    goal: 'Jemput paket Dimas di Marina Senja',
    intro: 'Dimas: Payung keempat dari kiri. Kalau ada yang sudah menunggu di situ, kau terlambat.',
    outro: 'Dimas: Mudah. Sekarang bagian yang bikin tangan kotor.',
  },
  {
    key: 'job-3',
    number: 3,
    title: 'KEPINGAN PASIR',
    district: 'marina-senja',
    lead: 'sinta',
    point: { x: -90, z: -304 },
    pay: 1600,
    brief: 'Sinta mau data dari kurir ring road selatan. Dekati tanpa ribut.',
    goal: 'Capai titik pengintai Sinta di lingkar selatan',
    intro: 'Sinta: Kurir itu bawa lebih dari pasir. Ikuti dia pelan, jangan sampai dia ngerasa.',
    outro: 'Sinta: Datanya masuk. Tapi jam surutnya aneh, ada yang atur dari luar.',
  },
  {
    key: 'job-4',
    number: 4,
    title: 'ANGIN TIMUR',
    district: 'teluk-aruna',
    lead: 'ara',
    point: { x: 300, z: -250 },
    pay: 2100,
    brief: 'Helikopter sudah siap di helipad. Soroti mercusuar sebelum kapal lewat.',
    goal: 'Naik helikopter di helipad Teluk Aruna',
    intro: 'Ara: Kalau ada yang nanya, kau sedang cari kapal hilang. Nyalakan sorotannya.',
    outro: 'Ara: Cahayanya sampai ke dermaga. Bimo sudah nunggu di sana.',
  },
  {
    key: 'job-5',
    number: 5,
    title: 'DERMAGA GELAP',
    district: 'marina-senja',
    lead: 'bimo',
    point: { x: -420, z: -185 },
    pay: 2600,
    brief: 'Bimo dikepung di ujung dermaga. Beri ruang untuk pergi.',
    goal: 'Bantu Bimo di Dermaga Karang Senja',
    intro: 'Bimo: Tiga mobil di belakangku. Aku masih punya satu tangan kosong.',
    outro: 'Bimo: Beres. Tapi aku kenal siapa yang kirim mereka.',
  },
  {
    key: 'job-6',
    number: 6,
    title: 'GELOMBANG BALIK',
    district: 'teluk-aruna',
    lead: 'dimas',
    point: { x: 40, z: 205 },
    pay: 3200,
    brief: 'Konvoi lewat jembatan kanal. Potong sebelum petinya masuk kota.',
    goal: 'Sergap konvoi di jembatan kanal Aruna',
    intro: 'Dimas: Mereka bawa peti dari kapal. Kita potong di jembatan, cepat.',
    outro: 'Dimas: Petinya kosong. Kita cuma dipakai biar kelihatan di sini.',
  },
  {
    key: 'job-7',
    number: 7,
    title: 'PASANG SURUT',
    district: 'teluk-aruna',
    lead: 'sinta',
    point: { x: 300, z: -250 },
    pay: 6000,
    brief: 'Sinta mengaku soal tabel pasang. Kumpulkan kru dan balik arah.',
    goal: 'Kumpulkan seluruh kru di helipad untuk keluar kota',
    intro: 'Sinta: Aku yang kirim jam surut mereka. Aku kira cuma soal uang. Air balik, kita juga balik.',
    outro: 'Ara: Kota ini masih punya kita. Sampai besok pagi, kru.',
  },
];

export const GUNS = [
  { key: 'fists', label: 'TANGAN KOSONG', code: 'FIST', stock: Infinity, harm: 12, delay: 0.35 },
  { key: 'pistol', label: 'PISTOL ARUNA', code: 'PST', stock: 48, harm: 28, delay: 0.18 },
  { key: 'smg', label: 'SMG SENJA', code: 'SMG', stock: 180, harm: 17, delay: 0.075 },
  { key: 'launcher', label: 'PELURU PASANG', code: 'RKT', stock: 8, harm: 90, delay: 0.9 },
];

export const STATIONS = [
  { key: 'aruna', label: 'ARUNA FM', dial: '98.4', mood: 'harbor soul', pulse: 96, hertz: 220 },
  { key: 'senja', label: 'SENJA PULSE', dial: '104.7', mood: 'beach drive', pulse: 122, hertz: 261.6 },
  { key: 'pasang', label: 'PASANG RADIO', dial: '88.1', mood: 'late night truth', pulse: 84, hertz: 196 },
];

export const HEAT = [
  { label: 'BERSIH', bail: 0 },
  { label: 'DIPERHATIKAN', bail: 200 },
  { label: 'DIBURU', bail: 450 },
  { label: 'BERBAHAYA', bail: 900 },
  { label: 'TERCARI', bail: 1600 },
  { label: 'LEGENDARIS', bail: 3000 },
];

export const START_CASH = 2500;

export const SPAWNS = [
  { x: 238, z: 86, yaw: -0.5, caption: 'GUDANG TELUK' },
  { x: -225, z: -215, yaw: 0.9, caption: 'PANTAI SENJA' },
  { x: 70, z: -390, yaw: 0, caption: 'LINGKARAN' },
  { x: 42, z: 205, yaw: Math.PI / 2, caption: 'JEMBATAN KANAL' },
  { x: -380, z: -185, yaw: -Math.PI / 2, caption: 'DERMAGA LAMA' },
];

export const SHOT_CAPTIONS = {
  harbor: 'Sunset over Teluk Aruna',
  pursuit: 'Ring road pursuit',
  beam: 'Searchlight over Marina Senja',
  tide: 'Pasang Surut at the helipad',
};
